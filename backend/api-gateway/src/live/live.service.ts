import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PiPaymentService } from '../payments/pi.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { v4 as uuidv4 } from 'uuid';

// ⚠️  UPDATE: Integrate with a live streaming provider
// Recommended: AWS IVS (Interactive Video Service) or Mux Live
// AWS IVS: https://aws.amazon.com/ivs/
// Mux: https://mux.com
// After setup, set IVS_CHANNEL_ARN_PREFIX or MUX_TOKEN_ID/MUX_TOKEN_SECRET in .env

@Injectable()
export class LiveService {
  private readonly logger = new Logger(LiveService.name);

  constructor(
    private prisma: PrismaService,
    private piService: PiPaymentService,
    private notifGateway: NotificationsGateway,
  ) {}

  async startStream(userId: string, title: string) {
    // Check if user already has active stream
    const existing = await this.prisma.liveStream.findFirst({
      where: { userId, status: 'active' },
    });
    if (existing) return existing;

    // ⚠️  UPDATE: Create stream channel via AWS IVS or Mux
    // const channel = await createIVSChannel(userId);
    const streamKey = uuidv4(); // Placeholder — replace with real stream key from IVS/Mux
    const playbackUrl = `https://YOUR_IVS_PLAYBACK_URL.${process.env.AWS_REGION}.ivs.amazonaws.com/${streamKey}/channel.m3u8`;

    const stream = await this.prisma.liveStream.create({
      data: {
        userId,
        title,
        status: 'active',
        streamKey,
        playbackUrl,
      },
    });

    // Notify followers
    const followers = await this.prisma.userFollow.findMany({
      where: { followingId: userId },
      select: { followerId: true },
    });
    for (const f of followers) {
      await this.prisma.notification.create({
        data: {
          userId: f.followerId,
          type: 'live_started',
          title: '🔴 Live Now!',
          body: `Someone you follow just went live`,
          data: { streamId: stream.id, userId },
        },
      });
    }

    return stream;
  }

  async endStream(streamId: string, userId: string) {
    const stream = await this.prisma.liveStream.findFirst({
      where: { id: streamId, userId, status: 'active' },
    });
    if (!stream) throw new NotFoundException('Stream not found');

    await this.prisma.liveStream.update({
      where: { id: streamId },
      data: { status: 'ended', endedAt: new Date() },
    });

    return { success: true };
  }

  async sendGift(streamId: string, senderId: string, amountMicroPi: bigint, animation: string) {
    const stream = await this.prisma.liveStream.findUnique({
      where: { id: streamId, status: 'active' },
      include: { user: true },
    });
    if (!stream) throw new NotFoundException('Stream not found or not active');

    // Deduct from sender balance
    const sender = await this.prisma.user.findUnique({ where: { id: senderId } });
    if (!sender || sender.piBalance < amountMicroPi) {
      throw new ForbiddenException('Insufficient Pi balance');
    }

    const creatorShare = BigInt(Math.floor(Number(amountMicroPi) * 0.9)); // 90% to creator
    const platformShare = amountMicroPi - creatorShare;

    await this.prisma.$transaction(async (tx) => {
      // Deduct from sender
      await tx.user.update({
        where: { id: senderId },
        data: { piBalance: { decrement: amountMicroPi } },
      });

      // Credit creator
      await tx.user.update({
        where: { id: stream.userId },
        data: { piBalance: { increment: creatorShare } },
      });

      // Record gift
      await tx.liveGift.create({
        data: { streamId, senderId, amountMicroPi, animation },
      });

      // Update stream total
      await tx.liveStream.update({
        where: { id: streamId },
        data: { totalPiGifted: { increment: amountMicroPi } },
      });
    });

    // Broadcast gift animation to all viewers
    this.notifGateway.emitLiveGift(streamId, {
      fromUser: { id: senderId, piUsername: sender.piUsername },
      amount: Number(amountMicroPi) / 1_000_000,
      animation,
    });

    return { success: true };
  }

  async sendChatMessage(streamId: string, userId: string, message: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, piUsername: true, displayName: true, avatarUrl: true },
    });

    const chatMsg = {
      user,
      message: message.slice(0, 200), // Limit length
      timestamp: new Date().toISOString(),
    };

    this.notifGateway.emitLiveChatMessage(streamId, chatMsg);
    return chatMsg;
  }

  async getActiveStreams(limit = 20) {
    return this.prisma.liveStream.findMany({
      where: { status: 'active' },
      orderBy: { viewerCount: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, piUsername: true, displayName: true, avatarUrl: true } },
      },
    });
  }
}
