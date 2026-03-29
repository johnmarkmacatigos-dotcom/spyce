import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

// ⚠️  UPDATE: Set FCM_SERVER_KEY in .env — from Firebase Console → Project Settings → Cloud Messaging
// ⚠️  UPDATE: Set APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY in .env for iOS

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async sendToUser(
    userId: string,
    payload: { type: string; title?: string; body?: string; data?: any },
  ) {
    // Save in-app notification
    await this.prisma.notification.create({
      data: {
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: payload.data,
      },
    });

    // Send push notification
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true },
    });

    if (!user?.settings?.pushEnabled) return;

    // ⚠️  UPDATE: Retrieve the user's FCM token from your device token store
    // For now this is a placeholder — implement device token storage
    // await this.sendFcmNotification(fcmToken, payload);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async getUserNotifications(userId: string, cursor?: string, limit = 20) {
    return this.prisma.notification.findMany({
      where: { userId },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  private async sendFcmNotification(fcmToken: string, payload: any) {
  // ⚠️  UPDATE: FCM notifications - implement after app is running
  // Firebase V1 API requires google-auth-library
  // For now, notifications are saved to database only (in-app notifications work)
  this.logger.log(`FCM notification queued for token: ${fcmToken?.slice(0,10)}...`);
}
}
