import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export const PI_EARN_RATES: Record<string, number> = {
  reaction_like: 500,
  reaction_comment: 1_000,
  reaction_share: 2_000,
  reaction_save: 800,
  watch_15min: 5_000,
  referral_30day: 100_000,
};

const WEEKLY_CREATOR_POOL_MICRO_PI = 10_000_000_000; // 10,000 Pi weekly

@Injectable()
export class EarningsEngine {
  private readonly logger = new Logger(EarningsEngine.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private notifications: NotificationsService,
  ) {}

  async awardReaction(videoId: string, creatorId: string, type: string) {
    const dateKey = new Date().toISOString().split('T')[0];
    const capKey = `earn:reaction:${creatorId}:${dateKey}`;

    const count = await this.redis.incr(capKey);
    if (count === 1) await this.redis.expire(capKey, 86400);
    if (count > 100) return; // daily cap

    const amount = BigInt(PI_EARN_RATES[`reaction_${type}`] ?? 0);
    if (!amount) return;

    await this.creditUser(creatorId, amount, 'earn_reaction', 'video', videoId);
    await this.notifications.sendPiEarned(creatorId, Number(amount), 'reaction');
  }

  async awardChallenge(userId: string, piReward: bigint, challengeId: string, streakBonus: bigint) {
    const total = piReward + streakBonus;
    await this.creditUser(userId, total, 'earn_challenge', 'challenge', challengeId);
    await this.notifications.sendPiEarned(userId, Number(total), 'challenge');
    return total;
  }

  async awardReferral(referrerId: string, referralId: string) {
    const amount = BigInt(PI_EARN_RATES.referral_30day);
    await this.creditUser(referrerId, amount, 'earn_referral', 'user', referralId);
    await this.notifications.sendPiEarned(referrerId, Number(amount), 'referral');
  }

  async recordWatchSession(userId: string, videoId: string, durationSecs: number) {
    if (durationSecs < 900) return; // must watch at least 15 min total
    const dateKey = new Date().toISOString().split('T')[0];
    const capKey = `earn:watch:${userId}:${dateKey}`;
    const count = await this.redis.incr(capKey);
    if (count === 1) await this.redis.expire(capKey, 86400);
    if (count > 20) return; // max 20 sessions per day

    const amount = BigInt(PI_EARN_RATES.watch_15min);
    await this.creditUser(userId, amount, 'earn_watch', 'video', videoId);
    await this.notifications.sendPiEarned(userId, Number(amount), 'watch');
  }

  // Runs every Monday 00:00 UTC
  @Cron('0 0 * * 1')
  async distributeCreatorFund() {
    this.logger.log('Running weekly creator fund distribution');
    const creators = await this.prisma.video.groupBy({
      by: ['userId'],
      where: {
        status: 'published',
        publishedAt: { gte: new Date(Date.now() - 7 * 86400_000) },
      },
      _sum: { engagementScore: true },
      orderBy: { _sum: { engagementScore: 'desc' } },
      take: 1000,
    });

    const totalScore = creators.reduce((s, c) => s + (c._sum.engagementScore ?? 0), 0);
    if (totalScore === 0) return;

    for (const creator of creators) {
      const share = Math.floor(
        ((creator._sum.engagementScore ?? 0) / totalScore) * WEEKLY_CREATOR_POOL_MICRO_PI,
      );
      if (share > 0) {
        await this.creditUser(creator.userId, BigInt(share), 'earn_creator_fund', null, null);
      }
    }

    this.logger.log(`Creator fund distributed to ${creators.length} creators`);
  }

  // Runs daily: check referrals that hit 30 days
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processQualifiedReferrals() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);
    const pending = await this.prisma.referral.findMany({
      where: {
        status: 'pending',
        createdAt: { lte: thirtyDaysAgo },
      },
      include: { referred: true },
    });

    for (const ref of pending) {
      // Check referred user is still active
      if (ref.referred.lastActiveAt && ref.referred.lastActiveAt > thirtyDaysAgo) {
        await this.awardReferral(ref.referrerId, ref.referredId);
        await this.prisma.referral.update({
          where: { id: ref.id },
          data: { status: 'qualified', qualifiedAt: new Date(), piAwarded: BigInt(PI_EARN_RATES.referral_30day) },
        });
      }
    }
  }

  // Runs daily: unlock matured vaults and pay interest
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async processVaultUnlocks() {
    const now = new Date();
    const matured = await this.prisma.piVault.findMany({
      where: { status: 'active', lockedUntil: { lte: now } },
    });

    for (const vault of matured) {
      const daysLocked = Math.floor(
        (now.getTime() - vault.createdAt.getTime()) / 86400_000,
      );
      const interest = Math.floor(
        Number(vault.amount) * (vault.apyBps / 10_000) * (daysLocked / 365),
      );

      const total = vault.amount + BigInt(interest);
      await this.creditUser(vault.userId, total, 'earn_vault_interest', 'vault', vault.id);
      await this.prisma.piVault.update({
        where: { id: vault.id },
        data: { status: 'unlocked' },
      });
    }
  }

  async getEarningsSummary(userId: string, period: 'day' | 'week' | 'month' | 'all') {
    const since = {
      day: new Date(Date.now() - 86400_000),
      week: new Date(Date.now() - 7 * 86400_000),
      month: new Date(Date.now() - 30 * 86400_000),
      all: new Date(0),
    }[period];

    const txs = await this.prisma.piTransaction.findMany({
      where: {
        userId,
        direction: 'credit',
        createdAt: { gte: since },
      },
    });

    const byType = txs.reduce<Record<string, number>>((acc, tx) => {
      acc[tx.type] = (acc[tx.type] ?? 0) + Number(tx.amountMicroPi);
      return acc;
    }, {});

    const totalMicroPi = txs.reduce((sum, tx) => sum + Number(tx.amountMicroPi), 0);

    return {
      totalPi: totalMicroPi / 1_000_000,
      totalMicroPi,
      breakdown: Object.entries(byType).map(([type, amount]) => ({
        type,
        amountMicroPi: amount,
        amountPi: amount / 1_000_000,
      })),
      period,
    };
  }

  private async creditUser(
    userId: string,
    amount: bigint,
    type: string,
    refType: string | null,
    refId: string | null,
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { piBalance: { increment: amount } },
    });

    await this.prisma.piTransaction.create({
      data: {
        userId,
        type,
        amountMicroPi: amount,
        direction: 'credit',
        balanceAfter: user.piBalance,
        refType,
        refId,
        status: 'completed',
      },
    });

    // Update spyce score
    const scoreGain = Math.floor(Number(amount) / 10_000);
    if (scoreGain > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { spyceScore: { increment: scoreGain } },
      });
    }

    return user.piBalance;
  }
}
