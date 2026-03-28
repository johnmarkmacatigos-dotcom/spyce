import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

/**
 * SPYCE Feed Service — ForYouPage Algorithm
 *
 * Ranking factors (weighted):
 *  - engagement_score (AI-computed):  40%
 *  - recency:                         25%
 *  - user affinity (follows):         20%
 *  - challenge bonus:                 10%
 *  - Pi ecosystem signals:             5%
 */
@Injectable()
export class FeedService {
  private readonly logger = new Logger(FeedService.name);
  private readonly FYP_CACHE_TTL = 300; // 5 minutes

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async getForYouFeed(userId: string, cursor?: string, limit = 10) {
    const cacheKey = `fyp:${userId}:${cursor || 'start'}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [followingIds, seenVideoIds] = await Promise.all([
      this.getFollowingIds(userId),
      this.getSeenVideoIds(userId),
    ]);

    const followingVideos = followingIds.length
      ? await this.prisma.video.findMany({
          where: {
            userId: { in: followingIds },
            status: 'published',
            visibility: 'public',
            id: { notIn: seenVideoIds },
          },
          orderBy: { publishedAt: 'desc' },
          take: Math.floor(limit * 0.3),
          include: this.videoInclude(userId),
        })
      : [];

    const trendingVideos = await this.prisma.video.findMany({
      where: {
        status: 'published',
        visibility: 'public',
        id: { notIn: [...seenVideoIds, ...followingVideos.map((v) => v.id)] },
        publishedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: [{ engagementScore: 'desc' }, { publishedAt: 'desc' }],
      take: limit - followingVideos.length,
      include: this.videoInclude(userId),
    });

    const videos = [...followingVideos, ...trendingVideos].map((v) =>
      this.formatVideo(v),
    );

    await this.markAsSeen(userId, videos.map((v) => v.id));
    await this.redis.set(cacheKey, JSON.stringify(videos), this.FYP_CACHE_TTL);
    return videos;
  }

  async getFollowingFeed(userId: string, cursor?: string, limit = 10) {
    const followingIds = await this.getFollowingIds(userId);
    if (!followingIds.length) return [];

    return this.prisma.video.findMany({
      where: {
        userId: { in: followingIds },
        status: 'published',
        visibility: { in: ['public', 'followers'] },
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      include: this.videoInclude(userId),
    });
  }

  async getTrendingHashtags(limit = 20) {
    const cacheKey = 'trending:hashtags';
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const tags = await this.prisma.hashtag.findMany({
      orderBy: { useCount: 'desc' },
      take: limit,
    });

    await this.redis.set(cacheKey, JSON.stringify(tags), 900);
    return tags;
  }

  private videoInclude(userId: string) {
    return {
      user: {
        select: {
          id: true,
          piUsername: true,
          displayName: true,
          avatarUrl: true,
          isVerified: true,
          spyceScore: true,
        },
      },
      hashtags: { include: { tag: true } },
      sound: true,
    } as const;
  }

  private formatVideo(video: any) {
    const cdnBase = process.env.CLOUDFRONT_DOMAIN
      ? `https://${process.env.CLOUDFRONT_DOMAIN}`
      : '';
    return {
      ...video,
      hlsUrl: video.hlsKey ? `${cdnBase}/${video.hlsKey}` : null,
      thumbnailUrl: video.thumbnailKey ? `${cdnBase}/${video.thumbnailKey}` : null,
      hashtags: video.hashtags?.map((h: any) => h.tag.tag) || [],
    };
  }

  private async getFollowingIds(userId: string): Promise<string[]> {
    const cacheKey = `following:${userId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const follows = await this.prisma.userFollow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const ids = follows.map((f) => f.followingId);
    await this.redis.set(cacheKey, JSON.stringify(ids), 300);
    return ids;
  }

  private async getSeenVideoIds(userId: string): Promise<string[]> {
    const key = `seen:${userId}`;
    const members = await this.redis.smembers(key);
    return members;
  }

  private async markAsSeen(userId: string, videoIds: string[]) {
    if (!videoIds.length) return;
    const key = `seen:${userId}`;
    await this.redis.sadd(key, ...videoIds);
    await this.redis.expire(key, 86400);
  }
}
