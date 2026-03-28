import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../storage/s3.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name);

  constructor(
    private prisma: PrismaService,
    private s3: S3Service,
    @InjectQueue('video-transcode') private transcodeQueue: Queue,
  ) {}

  /**
   * Generate presigned S3 URL for direct video upload from client
   * Returns uploadUrl (PUT) and videoId
   */
  async createUploadUrl(userId: string, filename: string, contentType: string) {
    const videoId = uuidv4();
    const rawKey = `raw/${userId}/${videoId}/${filename}`;

    // Create pending video record
    await this.prisma.video.create({
      data: {
        id: videoId,
        userId,
        rawKey,
        status: 'processing',
      },
    });

    // Generate presigned upload URL (30 min expiry)
    const uploadUrl = await this.s3.getPresignedUploadUrl(rawKey, contentType, 1800);

    return { videoId, uploadUrl, rawKey };
  }

  /**
   * Called after client finishes upload - triggers transcoding
   */
  async publishVideo(
    videoId: string,
    userId: string,
    input: {
      title?: string;
      description?: string;
      visibility?: string;
      hashtags?: string[];
      soundId?: string;
      isChallenge?: boolean;
      challengeId?: string;
      locationLat?: number;
      locationLon?: number;
    },
  ) {
    const video = await this.prisma.video.findFirst({
      where: { id: videoId, userId },
    });

    if (!video) throw new NotFoundException('Video not found');
    if (video.status !== 'processing') {
      throw new ForbiddenException('Video already published or in invalid state');
    }

    // Update metadata
    await this.prisma.video.update({
      where: { id: videoId },
      data: {
        title: input.title,
        description: input.description,
        visibility: input.visibility || 'public',
        isChallenge: input.isChallenge || false,
        challengeId: input.challengeId,
        locationLat: input.locationLat,
        locationLon: input.locationLon,
        soundId: input.soundId,
      },
    });

    // Handle hashtags
    if (input.hashtags?.length) {
      await this.syncHashtags(videoId, input.hashtags);
    }

    // Enqueue transcoding job
    await this.transcodeQueue.add(
      'transcode',
      {
        videoId,
        userId,
        rawKey: video.rawKey,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    return this.prisma.video.findUnique({ where: { id: videoId } });
  }

  async getVideoById(videoId: string, requesterId?: string) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId, status: 'published' },
      include: {
        user: {
          select: {
            id: true, piUsername: true, displayName: true, avatarUrl: true,
            isVerified: true, spyceScore: true,
          },
        },
        hashtags: { include: { tag: true } },
        sound: true,
      },
    });

    if (!video) throw new NotFoundException('Video not found');

    // Check like status for requester
    let hasLiked = false;
    if (requesterId) {
      const reaction = await this.prisma.videoReaction.findFirst({
        where: { videoId, userId: requesterId, type: 'like' },
      });
      hasLiked = !!reaction;
    }

    // Increment view count asynchronously
    await this.prisma.video.update({
      where: { id: videoId },
      data: { viewCount: { increment: 1 } },
    });

    return {
      ...video,
      hlsUrl: video.hlsKey
        // ⚠️  UPDATE: Replace with your CloudFront domain
        ? `https://YOUR_CLOUDFRONT_DOMAIN.cloudfront.net/${video.hlsKey}`
        : null,
      thumbnailUrl: video.thumbnailKey
        ? `https://YOUR_CLOUDFRONT_DOMAIN.cloudfront.net/${video.thumbnailKey}`
        : null,
      hasLiked,
      hashtags: video.hashtags.map((h) => h.tag.tag),
    };
  }

  async deleteVideo(videoId: string, userId: string) {
    const video = await this.prisma.video.findFirst({
      where: { id: videoId, userId },
    });

    if (!video) throw new NotFoundException('Video not found or not yours');

    await this.prisma.video.update({
      where: { id: videoId },
      data: { status: 'deleted' },
    });

    return true;
  }

  async reactToVideo(videoId: string, userId: string, type: string, earningsService: any) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId, status: 'published' },
    });

    if (!video) throw new NotFoundException('Video not found');

    // Upsert reaction
    const existing = await this.prisma.videoReaction.findFirst({
      where: { videoId, userId, type },
    });

    if (existing) {
      // Toggle off
      await this.prisma.videoReaction.delete({ where: { id: existing.id } });
      await this.prisma.video.update({
        where: { id: videoId },
        data: { likeCount: { decrement: 1 } },
      });
      return { reacted: false, likeCount: Number(video.likeCount) - 1 };
    }

    await this.prisma.videoReaction.create({
      data: { videoId, userId, type },
    });

    await this.prisma.video.update({
      where: { id: videoId },
      data: { likeCount: { increment: 1 } },
    });

    // Award Pi to creator (via earnings engine)
    if (video.userId !== userId) {
      await earningsService.awardReaction(videoId, video.userId, type);
    }

    return { reacted: true, likeCount: Number(video.likeCount) + 1 };
  }

  async addComment(videoId: string, userId: string, body: string, parentId?: string) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');

    const comment = await this.prisma.comment.create({
      data: { videoId, userId, body, parentId },
      include: {
        user: {
          select: { id: true, piUsername: true, displayName: true, avatarUrl: true },
        },
      },
    });

    await this.prisma.video.update({
      where: { id: videoId },
      data: { commentCount: { increment: 1 } },
    });

    return comment;
  }

  async getComments(videoId: string, cursor?: string, limit = 20) {
    const comments = await this.prisma.comment.findMany({
      where: { videoId, parentId: null },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, piUsername: true, displayName: true, avatarUrl: true },
        },
        replies: {
          take: 3,
          include: {
            user: {
              select: { id: true, piUsername: true, displayName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    return comments;
  }

  private async syncHashtags(videoId: string, tags: string[]) {
    for (const tagText of tags) {
      const normalized = tagText.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!normalized) continue;

      const tag = await this.prisma.hashtag.upsert({
        where: { tag: normalized },
        create: { tag: normalized, useCount: 1 },
        update: { useCount: { increment: 1 } },
      });

      await this.prisma.videoHashtag.upsert({
        where: { videoId_tagId: { videoId, tagId: tag.id } },
        create: { videoId, tagId: tag.id },
        update: {},
      });
    }
  }
}
