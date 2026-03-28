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
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    // ⚠️  UPDATE: Restrict to your app domain in production
    origin: '*',
    credentials: true,
  },
  namespace: '/ws',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets = new Map<string, string[]>(); // userId → socketIds

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers.authorization?.split(' ')[1];
      if (!token) { client.disconnect(); return; }

      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;

      const existing = this.userSockets.get(payload.sub) || [];
      this.userSockets.set(payload.sub, [...existing, client.id]);

      this.logger.log(`Client connected: ${client.id} (user ${payload.sub})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const sockets = (this.userSockets.get(userId) || []).filter((id) => id !== client.id);
      if (sockets.length) this.userSockets.set(userId, sockets);
      else this.userSockets.delete(userId);
    }
  }

  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; videoId?: string; liveStreamId?: string },
  ) {
    if (data.videoId) client.join(`video:${data.videoId}`);
    if (data.liveStreamId) client.join(`live:${data.liveStreamId}`);
  }

  // ─── Emit helpers used by other services ─────────────────────────────────

  emitToUser(userId: string, event: string, data: any) {
    const socketIds = this.userSockets.get(userId) || [];
    socketIds.forEach((id) => this.server.to(id).emit(event, data));
  }

  emitToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, data);
  }

  // Pi earned notification
  emitPiEarned(userId: string, amount: bigint, type: string, totalBalance: bigint) {
    this.emitToUser(userId, 'pi:earned', {
      amount: Number(amount) / 1_000_000,
      type,
      totalBalance: Number(totalBalance) / 1_000_000,
    });
  }

  // Live stream events
  emitLiveChatMessage(streamId: string, message: any) {
    this.emitToRoom(`live:${streamId}`, 'live:chat_message', message);
  }

  emitLiveViewerCount(streamId: string, count: number) {
    this.emitToRoom(`live:${streamId}`, 'live:viewer_count', { count });
  }

  emitLiveGift(streamId: string, gift: any) {
    this.emitToRoom(`live:${streamId}`, 'live:gift', gift);
  }

  // Challenge verified
  emitChallengeVerified(userId: string, challengeId: string, piAwarded: bigint, newStreak: number) {
    this.emitToUser(userId, 'challenge:verified', {
      challengeId,
      piAwarded: Number(piAwarded) / 1_000_000,
      newStreak,
    });
  }
}
