import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';

export interface CreateNotificationDto {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
}

export interface NotificationResponse {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
}

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async createNotification(dto: CreateNotificationDto): Promise<NotificationResponse> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        data: dto.data || null
      }
    });

    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      read: notification.read,
      readAt: notification.readAt || undefined,
      createdAt: notification.createdAt
    };
  }

  async getUserNotifications(
    userId: string, 
    page: number = 1, 
    limit: number = 20, 
    unreadOnly: boolean = false
  ): Promise<{ notifications: NotificationResponse[]; total: number; unreadCount: number }> {
    const skip = (page - 1) * limit;
    
    const whereClause: any = { userId };
    if (unreadOnly) {
      whereClause.read = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.notification.count({ where: whereClause }),
      this.prisma.notification.count({
        where: { userId, read: false }
      })
    ]);

    return {
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data,
        read: n.read,
        readAt: n.readAt || undefined,
        createdAt: n.createdAt
      })),
      total,
      unreadCount
    };
  }

  async markAsRead(notificationId: string, userId: string): Promise<{ success: boolean }> {
    await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId: userId
      },
      data: {
        read: true,
        readAt: new Date()
      }
    });

    return { success: true };
  }

  async markAllAsRead(userId: string): Promise<{ success: boolean; updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId: userId,
        read: false
      },
      data: {
        read: true,
        readAt: new Date()
      }
    });

    return { success: true, updated: result.count };
  }

  async deleteNotification(notificationId: string, userId: string): Promise<{ success: boolean }> {
    await this.prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId: userId
      }
    });

    return { success: true };
  }

  // Predefined notification types for easy creation
  async notifyFollowerGained(userId: string, followerName: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'FOLLOWER_GAINED',
      title: '👥 New Follower!',
      message: `${followerName} started following you`,
      data: { followerName }
    });
  }

  async notifyTradeExecuted(userId: string, trade: any): Promise<void> {
    await this.createNotification({
      userId,
      type: 'TRADE_EXECUTED',
      title: '📈 Trade Executed',
      message: `${trade.side} ${trade.quantity} shares of ${trade.symbol}`,
      data: { trade }
    });
  }

  async notifyAchievementUnlocked(userId: string, achievement: any): Promise<void> {
    await this.createNotification({
      userId,
      type: 'ACHIEVEMENT_UNLOCKED',
      title: '🏆 Achievement Unlocked!',
      message: `You've earned: ${achievement.description}`,
      data: { achievement }
    });
  }

  async notifyCopyTradeExecuted(userId: string, originalTrader: string, trade: any): Promise<void> {
    await this.createNotification({
      userId,
      type: 'COPY_TRADE',
      title: '🔄 Copy Trade Executed',
      message: `Copied ${originalTrader}'s ${trade.side} of ${trade.symbol}`,
      data: { originalTrader, trade }
    });
  }

  async notifyPerformanceUpdate(userId: string, performance: any): Promise<void> {
    await this.createNotification({
      userId,
      type: 'PERFORMANCE_UPDATE',
      title: '📊 Performance Update',
      message: `Your portfolio return: ${performance.totalReturn > 0 ? '+' : ''}${performance.totalReturn}%`,
      data: { performance }
    });
  }
} 