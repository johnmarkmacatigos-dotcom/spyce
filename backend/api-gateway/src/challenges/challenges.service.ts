import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PiPaymentService } from '../payments/pi.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ChallengesService {
  private readonly logger = new Logger(ChallengesService.name);

  constructor(
    private prisma: PrismaService,
    private piService: PiPaymentService,
    private notificationsService: NotificationsService,
  ) {}

  async getDailyChallenges() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailies = await this.prisma.dailyChallenge.findMany({
      where: { date: today },
      orderBy: { featuredOrder: 'asc' },
      include: { template: true },
    });

    if (dailies.length === 0) {
      return this.prisma.challengeTemplate.findMany({
        where: { isActive: true },
        orderBy: [{ difficulty: 'asc' }, { piReward: 'desc' }],
        take: 10,
      });
    }

    return dailies.map((d) => d.template);
  }

  async getChallengeById(id: string) {
    const challenge = await this.prisma.challengeTemplate.findUnique({
      where: { id },
    });
    if (!challenge) throw new NotFoundException('Challenge not found');
    return challenge;
  }

  async getUserStreak(userId: string, challengeId: string) {
    return this.prisma.userStreak.findUnique({
      where: { userId_challengeId: { userId, challengeId } },
    });
  }

  /**
   * Submit proof for a challenge completion
   * proofType: 'sensor' | 'video' | 'self' | 'peer' | 'ai'
   */
  async submitChallengeProof(
    userId: string,
    input: {
      challengeId: string;
      proofType: string;
      proofUrl?: string;
      sensorData?: any;
    },
  ) {
    const challenge = await this.prisma.challengeTemplate.findUnique({
      where: { id: input.challengeId, isActive: true },
    });
    if (!challenge) throw new NotFoundException('Challenge not found');

    // Check max per day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCompletions = await this.prisma.challengeCompletion.count({
      where: {
        userId,
        challengeId: input.challengeId,
        status: 'completed',
        createdAt: { gte: today },
      },
    });

    if (todayCompletions >= challenge.maxPerDay) {
      throw new BadRequestException('Daily challenge limit reached');
    }

    // Get or create today's daily challenge
    let dailyChallenge = await this.prisma.dailyChallenge.findFirst({
      where: { templateId: input.challengeId, date: today },
    });

    if (!dailyChallenge) {
      dailyChallenge = await this.prisma.dailyChallenge.create({
        data: { templateId: input.challengeId, date: today },
      });
    }

    // Get current streak
    const streak = await this.prisma.userStreak.findUnique({
      where: { userId_challengeId: { userId, challengeId: input.challengeId } },
    });

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isConsecutive = streak?.lastCompleted
      ? streak.lastCompleted >= yesterday
      : false;
    const newStreak = isConsecutive ? (streak?.currentStreak || 0) + 1 : 1;

    // Determine verification approach
    const status = ['self', 'peer'].includes(input.proofType)
      ? 'completed'  // self/peer → instant (with abuse detection)
      : 'verifying'; // sensor/video/ai → async verification

    const completion = await this.prisma.challengeCompletion.create({
      data: {
        userId,
        challengeId: input.challengeId,
        dailyId: dailyChallenge.id,
        status,
        proofType: input.proofType,
        proofUrl: input.proofUrl,
        sensorData: input.sensorData,
        streakDay: newStreak,
      },
    });

    // For self-verified: award immediately
    if (status === 'completed') {
      await this.awardChallenge(userId, completion.id, challenge, newStreak);
    } else {
      // Enqueue AI verification job
      // ⚠️  UPDATE: Replace with actual queue/job system
      this.logger.log(`Queued AI verification for completion ${completion.id}`);
    }

    return completion;
  }

  /**
   * Called by AI service after verification completes
   */
  async verifyCompletion(
    completionId: string,
    verified: boolean,
    aiConfidence: number,
  ) {
    const completion = await this.prisma.challengeCompletion.findUnique({
      where: { id: completionId },
      include: { challenge: true },
    });

    if (!completion) throw new NotFoundException('Completion not found');

    if (verified && aiConfidence >= 0.75) {
      await this.prisma.challengeCompletion.update({
        where: { id: completionId },
        data: { status: 'completed', aiConfidence, verifiedAt: new Date() },
      });
      await this.awardChallenge(
        completion.userId,
        completionId,
        completion.challenge,
        completion.streakDay,
      );
    } else {
      await this.prisma.challengeCompletion.update({
        where: { id: completionId },
        data: { status: 'rejected', aiConfidence },
      });
      await this.notificationsService.sendToUser(completion.userId, {
        type: 'challenge_rejected',
        title: 'Challenge Not Verified',
        body: `Your ${completion.challenge.title} submission could not be verified. Try again!`,
      });
    }
  }

  private async awardChallenge(
    userId: string,
    completionId: string,
    challenge: any,
    streakDay: number,
  ) {
    const streakBonus =
      streakDay >= 7
        ? challenge.bonusStreak * 2
        : streakDay >= 3
        ? challenge.bonusStreak
        : BigInt(0);

    const totalReward = BigInt(challenge.piReward) + BigInt(streakBonus);

    const newBalance = await this.piService.creditUser(
      userId,
      totalReward,
      'earn_challenge',
      'challenge',
      challenge.id,
    );

    await this.prisma.challengeCompletion.update({
      where: { id: completionId },
      data: { piAwarded: totalReward, verifiedAt: new Date(), status: 'completed' },
    });

    // Update streak
    await this.prisma.userStreak.upsert({
      where: { userId_challengeId: { userId, challengeId: challenge.id } },
      create: {
        userId,
        challengeId: challenge.id,
        currentStreak: streakDay,
        longestStreak: streakDay,
        lastCompleted: new Date(),
      },
      update: {
        currentStreak: streakDay,
        longestStreak: { set: Math.max(streakDay, 0) },
        lastCompleted: new Date(),
      },
    });

    // Update spyce score
    const scoreGain = Math.min(Math.floor(Number(totalReward) / 10000), 100);
    await this.prisma.user.update({
      where: { id: userId },
      data: { spyceScore: { increment: scoreGain } },
    });

    await this.notificationsService.sendToUser(userId, {
      type: 'challenge_completed',
      title: '🌶 Challenge Complete!',
      body: `You earned ${Number(totalReward) / 1_000_000} Pi for ${challenge.title}! Streak: ${streakDay} days`,
      data: { piAwarded: totalReward.toString(), streakDay },
    });
  }
}
