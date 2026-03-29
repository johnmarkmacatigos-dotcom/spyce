import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EarningsEngine {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private notifications: NotificationsService,
  ) {}

  async awardReaction(videoId: string, creatorId: string, type: string) {
    const rates: Record<string, number> = {
      like: 500, comment: 1000, share: 2000, save: 800,
    };
    const amount = rates[type] ?? 0;
    if (!amount) return;

    const capKey = `earn:reaction:${creatorId}:${this.today()}`;
    const count = await this.redis.incr(capKey);
    await this.redis.expire(capKey, 86400);
    if (count > 100) return;

    await this.creditUser(creatorId, BigInt(amount), 'earn_reaction', 'video', videoId);

    await this.notifications.sendToUser(creatorId, {
      type: 'pi_earned',
      title: '🌶 Pi Earned!',
      body: `You earned Pi for a ${type} on your video`,
      data: { amount: amount.toString(), earnType: 'reaction' },
    });
  }

  async awardChallenge(userId: string, amount: bigint, challengeId: string) {
    await this.creditUser(userId, amount, 'earn_challenge', 'challenge', challengeId);

    await this.notifications.sendToUser(userId, {
      type: 'pi_earned',
      title: '🏆 Challenge Complete!',
      body: `You earned ${Number(amount) / 1_000_000} Pi`,
      data: { amount: amount.toString(), earnType: 'challenge' },
    });
  }

  async awardReferral(referrerId: string, referredId: string) {
    const amount = BigInt(100_000);
    await this.creditUser(referrerId, amount, 'earn_referral', 'user', referredId);

    await this.notifications.sendToUser(referrerId, {
      type: 'pi_earned',
      title: '👥 Referral Bonus!',
      body: `Your referral earned you ${Number(amount) / 1_000_000} Pi`,
      data: { amount: amount.toString(), earnType: 'referral' },
    });
  }

  async awardWatchSession(userId: string, videoId: string) {
    const amount = BigInt(5_000);
    const key = `watch:${userId}:${videoId}:${this.today()}`;
    const already = await this.redis.get(key);
    if (already) return;
    await this.redis.set(key, '1', 86400);

    await this.creditUser(userId, amount, 'earn_watch', 'video', videoId);

    await this.notifications.sendToUser(userId, {
      type: 'pi_earned',
      title: '👁️ Watch Bonus!',
      body: `You earned ${Number(amount) / 1_000_000} Pi for watching`,
      data: { amount: amount.toString(), earnType: 'watch' },
    });
  }

  private async creditUser(
    userId: string,
    amount: bigint,
    type: string,
    refType: string,
    refId: string,
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
  }

  private today(): string {
    return new Date().toISOString().split('T')[0];
  }
}