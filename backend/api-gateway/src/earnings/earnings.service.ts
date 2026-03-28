import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PiPaymentService, PI_EARN_RATES } from '../payments/pi.service';
import { RedisService } from '../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';

const WEEKLY_CREATOR_POOL_MICRO_PI = BigInt(10_000_000_000); // 10,000 Pi weekly

@Injectable()
export class EarningsService {
  private readonly logger = new Logger(EarningsService.name);

  constructor(
    private prisma: PrismaService,
    private piService: PiPaymentService,
    private redis: RedisService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Award Pi to a creator when someone reacts to their video
   */
  async awardReaction(videoId: string, creatorId: string, reactionType: string) {
    const rate = PI_EARN_RATES[`reaction_${reactionType}` as keyof typeof PI_EARN_RATES] ?? 0;
    if (!rate) return;

    await this.piService.creditUser(
      creatorId,
      BigInt(rate),
      'earn_reaction',
      'video',
      videoId,
    );
  }

  /**
   * Award watch-to-earn Pi for 15-minute verified watch sessions
   */
  async awardWatchSession(userId: string, videoId: string) {
    // Prevent rapid farming: once per video per day
    const key = `watch:${userId}:${videoId}:${this.today()}`;
    const already = await this.redis.get(key);
    if (already) return;

    await this.redis.set(key, '1', 86400);
    await this.piService.creditUser(
      userId,
      BigInt(PI_EARN_RATES.watch_15min),
      'earn_watch',
      'video',
      videoId,
    );
  }

  /**
   * Award referral Pi when a referred user hits 30 days active
   */
  async checkAndAwardReferral(userId: string) {
    const referral = await this.prisma.referral.findFirst({
      where: { referredId: userId, status: 'pending' },
    });
    if (!referral) return;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (user.createdAt <= thirtyDaysAgo) {
      await this.piService.creditUser(
        referral.referrerId,
        BigInt(PI_EARN_RATES.referral_30day),
        'earn_referral',
        'user',
        userId,
      );

      await this.prisma.referral.update({
        where: { id: referral.id },
        data: {
          status: 'qualified',
          piAwarded: BigInt(PI_EARN_RATES.referral_30day),
          qualifiedAt: new Date(),
        },
      });
    }
  }

  /**
   * Get earnings summary for dashboard
   */
  async getEarningsSummary(userId: string, period: 'day' | 'week' | 'month' | 'all') {
    const since = this.getPeriodStart(period);

    const transactions = await this.prisma.piTransaction.findMany({
      where: {
        userId,
        direction: 'credit',
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    const byType: Record<string, bigint> = {};
    let total = BigInt(0);
    for (const tx of transactions) {
      byType[tx.type] = (byType[tx.type] || BigInt(0)) + tx.amountMicroPi;
      total += tx.amountMicroPi;
    }

    return {
      totalMicroPi: total.toString(),
      totalPi: (Number(total) / 1_000_000).toFixed(6),
      breakdown: Object.entries(byType).map(([type, amount]) => ({
        type,
        amountMicroPi: amount.toString(),
        amountPi: (Number(amount) / 1_000_000).toFixed(6),
      })),
      transactions: transactions.slice(0, 20).map((t) => ({
        ...t,
        amountMicroPi: t.amountMicroPi.toString(),
        balanceAfter: t.balanceAfter.toString(),
      })),
    };
  }

  /**
   * Weekly creator fund distribution — runs every Monday at 00:00 UTC
   */
  @Cron('0 0 * * 1')
  async distributeCreatorFund() {
    this.logger.log('Starting weekly creator fund distribution');

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get top 1000 creators by engagement score in the past week
    const creators = await this.prisma.video.groupBy({
      by: ['userId'],
      where: { publishedAt: { gte: weekAgo }, status: 'published' },
      _sum: { engagementScore: true },
      orderBy: { _sum: { engagementScore: 'desc' } },
      take: 1000,
    });

    const totalScore = creators.reduce(
      (sum, c) => sum + (c._sum.engagementScore || 0),
      0,
    );

    if (totalScore === 0) return;

    for (const creator of creators) {
      const share = Math.floor(
        (Number(WEEKLY_CREATOR_POOL_MICRO_PI) *
          (c => (c._sum.engagementScore || 0) / totalScore)(creator)),
      );

      if (share < 1000) continue; // Skip dust amounts

      await this.piService.creditUser(
        creator.userId,
        BigInt(share),
        'earn_creator_fund',
        null,
        null,
      );
    }

    this.logger.log(`Creator fund distributed to ${creators.length} creators`);
  }

  /**
   * Unlock matured Pi vault entries — runs daily at 01:00 UTC
   */
  @Cron('0 1 * * *')
  async processVaultUnlocks() {
    const maturedVaults = await this.prisma.piVault.findMany({
      where: { status: 'active', lockedUntil: { lte: new Date() } },
    });

    for (const vault of maturedVaults) {
      // Calculate accrued interest
      const daysLocked = Math.floor(
        (Date.now() - vault.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      const interestMicroPi = Math.floor(
        (Number(vault.amount) * vault.apyBps * daysLocked) / (10_000 * 365),
      );

      const totalUnlock = vault.amount + BigInt(interestMicroPi);

      await this.piService.creditUser(
        vault.userId,
        totalUnlock,
        'earn_vault_interest',
        'vault',
        vault.id,
      );

      await this.prisma.piVault.update({
        where: { id: vault.id },
        data: { status: 'unlocked' },
      });

      await this.notificationsService.sendToUser(vault.userId, {
        type: 'vault_unlocked',
        title: '🔓 Pi Vault Unlocked!',
        body: `Your vault unlocked with ${(Number(totalUnlock) / 1_000_000).toFixed(4)} Pi (includes interest)`,
      });
    }
  }

  /**
   * Check referral eligibility — runs daily at 02:00 UTC
   */
  @Cron('0 2 * * *')
  async checkReferrals() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const pendingReferrals = await this.prisma.referral.findMany({
      where: { status: 'pending' },
      include: { referred: true },
    });

    for (const ref of pendingReferrals) {
      if (ref.referred.createdAt <= thirtyDaysAgo) {
        await this.checkAndAwardReferral(ref.referredId);
      }
    }
  }

  private getPeriodStart(period: string): Date | null {
    const now = new Date();
    switch (period) {
      case 'day':   return new Date(now.setHours(0, 0, 0, 0));
      case 'week':  return new Date(now.setDate(now.getDate() - 7));
      case 'month': return new Date(now.setMonth(now.getMonth() - 1));
      default:      return null;
    }
  }

  private today(): string {
    return new Date().toISOString().split('T')[0];
  }
}
