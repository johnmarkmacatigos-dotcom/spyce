import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'alltime';
export type LeaderboardCategory = 'earnings' | 'challenges' | 'engagement' | 'referrals';

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async getLeaderboard(
    period: LeaderboardPeriod,
    category: LeaderboardCategory,
    limit = 50,
  ) {
    const cacheKey = `leaderboard:${period}:${category}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const since = this.getPeriodStart(period);

    let data: any[] = [];

    if (category === 'earnings') {
      data = await this.getEarningsLeaderboard(since, limit);
    } else if (category === 'challenges') {
      data = await this.getChallengesLeaderboard(since, limit);
    } else if (category === 'engagement') {
      data = await this.getEngagementLeaderboard(since, limit);
    } else if (category === 'referrals') {
      data = await this.getReferralsLeaderboard(since, limit);
    }

    const ranked = data.map((entry, index) => ({ ...entry, rank: index + 1 }));
    await this.redis.set(cacheKey, JSON.stringify(ranked), 300); // 5 min cache
    return ranked;
  }

  private async getEarningsLeaderboard(since: Date | null, limit: number) {
    const result = await this.prisma.piTransaction.groupBy({
      by: ['userId'],
      where: {
        direction: 'credit',
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      _sum: { amountMicroPi: true },
      orderBy: { _sum: { amountMicroPi: 'desc' } },
      take: limit,
    });

    return Promise.all(
      result.map(async (r) => {
        const user = await this.prisma.user.findUnique({
          where: { id: r.userId },
          select: { id: true, piUsername: true, displayName: true, avatarUrl: true, isVerified: true, spyceScore: true },
        });
        return {
          user,
          score: r._sum.amountMicroPi?.toString() ?? '0',
          displayScore: `π${(Number(r._sum.amountMicroPi ?? 0) / 1_000_000).toFixed(4)}`,
        };
      }),
    );
  }

  private async getChallengesLeaderboard(since: Date | null, limit: number) {
    const result = await this.prisma.challengeCompletion.groupBy({
      by: ['userId'],
      where: {
        status: 'completed',
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    return Promise.all(
      result.map(async (r) => {
        const user = await this.prisma.user.findUnique({
          where: { id: r.userId },
          select: { id: true, piUsername: true, displayName: true, avatarUrl: true, isVerified: true, spyceScore: true },
        });
        return { user, score: String(r._count.id), displayScore: `${r._count.id} completions` };
      }),
    );
  }

  private async getEngagementLeaderboard(since: Date | null, limit: number) {
    const videos = await this.prisma.video.groupBy({
      by: ['userId'],
      where: {
        status: 'published',
        ...(since ? { publishedAt: { gte: since } } : {}),
      },
      _sum: { engagementScore: true, viewCount: true, likeCount: true },
      orderBy: { _sum: { engagementScore: 'desc' } },
      take: limit,
    });

    return Promise.all(
      videos.map(async (v) => {
        const user = await this.prisma.user.findUnique({
          where: { id: v.userId },
          select: { id: true, piUsername: true, displayName: true, avatarUrl: true, isVerified: true, spyceScore: true },
        });
        return {
          user,
          score: String(Math.round(v._sum.engagementScore ?? 0)),
          displayScore: `${Math.round(v._sum.engagementScore ?? 0)} pts`,
        };
      }),
    );
  }

  private async getReferralsLeaderboard(since: Date | null, limit: number) {
    const result = await this.prisma.referral.groupBy({
      by: ['referrerId'],
      where: {
        status: 'qualified',
        ...(since ? { qualifiedAt: { gte: since } } : {}),
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    return Promise.all(
      result.map(async (r) => {
        const user = await this.prisma.user.findUnique({
          where: { id: r.referrerId },
          select: { id: true, piUsername: true, displayName: true, avatarUrl: true, isVerified: true, spyceScore: true },
        });
        return { user, score: String(r._count.id), displayScore: `${r._count.id} referrals` };
      }),
    );
  }

  /** Snapshot leaderboards daily at midnight for historical records */
  @Cron('0 0 * * *')
  async snapshotLeaderboards() {
    this.logger.log('Snapshotting leaderboards...');
    const categories: LeaderboardCategory[] = ['earnings', 'challenges', 'engagement', 'referrals'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const category of categories) {
      const data = await this.getLeaderboard('daily', category, 100);
      for (const entry of data) {
        if (!entry.user) continue;
        await this.prisma.leaderboardSnapshot.create({
          data: {
            userId: entry.user.id,
            period: 'daily',
            periodStart: today,
            category,
            score: BigInt(entry.score),
            rank: entry.rank,
          },
        });
      }
    }
  }

  private getPeriodStart(period: LeaderboardPeriod): Date | null {
    const now = new Date();
    switch (period) {
      case 'daily':   return new Date(now.setHours(0, 0, 0, 0));
      case 'weekly':  return new Date(now.setDate(now.getDate() - 7));
      case 'monthly': return new Date(now.setMonth(now.getMonth() - 1));
      case 'alltime': return null;
    }
  }
}
