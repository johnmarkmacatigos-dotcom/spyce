import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  // userId → Set of socket IDs
  private userSockets = new Map<string, Set<string>>();

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        publicKey: process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n'),
        algorithms: ['RS256'],
      });

      client.data.userId = payload.sub;
      client.data.piUsername = payload.piUsername;

      // Track socket → user mapping
      if (!this.userSockets.has(payload.sub)) {
        this.userSockets.set(payload.sub, new Set());
      }
      this.userSockets.get(payload.sub)!.add(client.id);

      this.logger.log(`Client connected: ${payload.piUsername} (${client.id})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      this.userSockets.get(userId)?.delete(client.id);
      if (this.userSockets.get(userId)?.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId?: string; videoId?: string; liveStreamId?: string },
  ) {
    // Join video comment room
    if (data.videoId) {
      client.join(`video:${data.videoId}`);
    }
    // Join live stream room
    if (data.liveStreamId) {
      client.join(`live:${data.liveStreamId}`);
    }
    // Join personal user room for Pi earned events
    if (data.userId) {
      client.join(`user:${data.userId}`);
    }
  }

  @SubscribeMessage('live:chat')
  handleLiveChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { streamId: string; message: string },
  ) {
    if (!client.data.userId || !data.streamId || !data.message) return;

    // Sanitize message
    const sanitized = data.message.substring(0, 200).trim();

    this.server.to(`live:${data.streamId}`).emit('live:chat_message', {
      user: {
        id: client.data.userId,
        piUsername: client.data.piUsername,
      },
      message: sanitized,
      timestamp: new Date().toISOString(),
    });
  }

  // ────────────────────────────────────────────────────────────
  // Server → Client emitters (called from services)
  // ────────────────────────────────────────────────────────────

  emitPiEarned(userId: string, amount: bigint, type: string, totalBalance: bigint) {
    this.server.to(`user:${userId}`).emit('pi:earned', {
      amount: Number(amount) / 1_000_000,
      type,
      totalBalance: Number(totalBalance) / 1_000_000,
    });
  }

  emitChallengeVerified(userId: string, challengeId: string, piAwarded: bigint, newStreak: number) {
    this.server.to(`user:${userId}`).emit('challenge:verified', {
      challengeId,
      piAwarded: Number(piAwarded) / 1_000_000,
      newStreak,
    });
  }

  emitLiveGift(streamId: string, fromUser: any, amount: bigint, animation: string) {
    this.server.to(`live:${streamId}`).emit('live:gift', {
      fromUser,
      amount: Number(amount) / 1_000_000,
      animation,
    });
  }

  emitLiveViewerCount(streamId: string, count: number) {
    this.server.to(`live:${streamId}`).emit('live:viewer_count', { count });
  }

  emitOrderStatus(userId: string, orderId: string, status: string) {
    this.server.to(`user:${userId}`).emit('order:status', { orderId, status });
  }

  emitNewFollower(userId: string, follower: any) {
    this.server.to(`user:${userId}`).emit('follow:new', { follower });
  }

  emitLeaderboardUpdate(userId: string, rank: number, score: number) {
    this.server.to(`user:${userId}`).emit('leaderboard:update', { rank, score });
  }

  isUserOnline(userId: string): boolean {
    return (this.userSockets.get(userId)?.size || 0) > 0;
  }
}
