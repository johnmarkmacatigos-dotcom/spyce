import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

/**
 * Search Service
 *
 * MVP: Uses PostgreSQL full-text search via ILIKE.
 *
 * ⚠️  UPDATE for Production: Migrate to Amazon OpenSearch (Elasticsearch).
 * Set OPENSEARCH_URL in .env and use @opensearch-project/opensearch client.
 * Index videos and products on publish/create. Use BM25 + vector search.
 *
 * OpenSearch setup:
 *   npm install @opensearch-project/opensearch
 *   const client = new Client({ node: process.env.OPENSEARCH_URL });
 *   await client.index({ index: 'videos', id: videoId, body: { title, hashtags, ... } });
 *   const result = await client.search({ index: 'videos', body: { query: { match: { title: q } } } });
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async search(query: string, type?: 'videos' | 'products' | 'users', limit = 20) {
    if (!query?.trim()) return { videos: [], products: [], users: [] };

    const q = query.trim().toLowerCase();
    const cacheKey = `search:${q}:${type || 'all'}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [videos, products, users] = await Promise.all([
      !type || type === 'videos' ? this.searchVideos(q, limit) : [],
      !type || type === 'products' ? this.searchProducts(q, limit) : [],
      !type || type === 'users' ? this.searchUsers(q, limit) : [],
    ]);

    const result = { videos, products, users };
    await this.redis.set(cacheKey, JSON.stringify(result), 60); // 1 min cache
    return result;
  }

  private async searchVideos(q: string, limit: number) {
    return this.prisma.video.findMany({
      where: {
        status: 'published',
        visibility: 'public',
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { hashtags: { some: { tag: { tag: { contains: q, mode: 'insensitive' } } } } },
        ],
      },
      take: limit,
      orderBy: { engagementScore: 'desc' },
      include: {
        user: {
          select: { id: true, piUsername: true, displayName: true, avatarUrl: true },
        },
        hashtags: { include: { tag: true } },
      },
    });
  }

  private async searchProducts(q: string, limit: number) {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { tags: { has: q } },
        ],
      },
      take: limit,
      orderBy: [{ avgRating: 'desc' }, { totalSales: 'desc' }],
      include: {
        seller: {
          select: { id: true, piUsername: true, displayName: true, avatarUrl: true },
        },
      },
    });
  }

  private async searchUsers(q: string, limit: number) {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        OR: [
          { piUsername: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { spyceScore: 'desc' },
      select: {
        id: true, piUsername: true, displayName: true,
        avatarUrl: true, spyceScore: true, isVerified: true,
        _count: { select: { followersList: true } },
      },
    });
  }

  async getSearchSuggestions(prefix: string): Promise<string[]> {
    if (!prefix || prefix.length < 2) return [];

    const [hashtags, users] = await Promise.all([
      this.prisma.hashtag.findMany({
        where: { tag: { startsWith: prefix.toLowerCase() } },
        orderBy: { useCount: 'desc' },
        take: 5,
        select: { tag: true },
      }),
      this.prisma.user.findMany({
        where: { piUsername: { startsWith: prefix.toLowerCase() } },
        take: 3,
        select: { piUsername: true },
      }),
    ]);

    return [
      ...hashtags.map((h) => `#${h.tag}`),
      ...users.map((u) => `@${u.piUsername}`),
    ];
  }
}
