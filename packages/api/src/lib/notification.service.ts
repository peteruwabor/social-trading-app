import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

const EXPO_ACCESS_TOKEN = process.env.EXPO_ACCESS_TOKEN;
const NODE_ENV = process.env.NODE_ENV;

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: 'default' | 'normal' | 'high';
  sound?: 'default' | null;
  badge?: number;
}

export interface NotificationDelivery {
  success: boolean;
  error?: string;
  deviceToken: string;
  messageId?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private expo: any;

  constructor(private prisma: PrismaService) {
    if (EXPO_ACCESS_TOKEN && NODE_ENV !== 'test') {
      // Dynamically require expo-server-sdk to avoid import in test
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Expo } = require('expo-server-sdk');
      this.expo = new Expo({ accessToken: EXPO_ACCESS_TOKEN });
    }
  }

  /**
   * Send push notification to multiple device tokens
   */
  async sendPush(
    deviceTokens: string[],
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<NotificationDelivery[]> {
    if (NODE_ENV === 'test' || !EXPO_ACCESS_TOKEN) {
      this.logger.log(`[MOCK PUSH] ${title}: ${body} to ${deviceTokens.join(', ')} | data: ${JSON.stringify(data)}`);
      return deviceTokens.map(token => ({
        success: true,
        deviceToken: token,
        messageId: `mock-${Date.now()}`,
      }));
    }

    if (!this.expo) {
      throw new Error('Expo SDK not initialized');
    }

    const messages = deviceTokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data,
      priority: 'high',
      badge: 1,
    }));

    try {
      const chunks = this.expo.chunkPushNotifications(messages);
      const results: NotificationDelivery[] = [];

      for (const chunk of chunks) {
        const chunkResults = await this.expo.sendPushNotificationsAsync(chunk);
        
        // Map results to our format
        chunkResults.forEach((result: any, index: number) => {
          const originalIndex = chunks.indexOf(chunk) * chunk.length + index;
          const deviceToken = deviceTokens[originalIndex];
          
          results.push({
            success: result.status === 'ok',
            error: result.status === 'error' ? result.message : undefined,
            deviceToken,
            messageId: result.id,
          });
        });
      }

      // Log delivery results
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      
      this.logger.log(`Push notification delivery: ${successCount} success, ${failureCount} failed`);
      
      // Handle failed deliveries
      const failedTokens = results.filter(r => !r.success).map(r => r.deviceToken);
      if (failedTokens.length > 0) {
        await this.handleFailedDeliveries(failedTokens);
      }

      return results;
    } catch (err) {
      this.logger.error('Failed to send push notification', err);
      throw err;
    }
  }

  /**
   * Send trade alert notification to followers
   */
  async sendTradeAlert(
    userId: string,
    tradeData: {
      symbol: string;
      side: 'BUY' | 'SELL';
      quantity: number;
      fillPrice: number;
      leaderHandle: string;
      pctOfNAV?: number;
    }
  ): Promise<void> {
    try {
      // Get user's notification preferences (simplified for now)
      const preferences = await this.getNotificationPreferences(userId);
      
      if (!preferences.tradeAlert) {
        this.logger.debug(`Trade alerts disabled for user ${userId}`);
        return;
      }

      // Get user's device tokens
      const deviceTokens = await this.getDeviceTokens(userId);
      
      if (deviceTokens.length === 0) {
        this.logger.debug(`No device tokens found for user ${userId}`);
        return;
      }

      const title = `${tradeData.leaderHandle} traded ${tradeData.symbol}`;
      const body = `${tradeData.side} ${tradeData.quantity} @ $${tradeData.fillPrice.toFixed(2)}`;
      
      const data = {
        type: 'TRADE_ALERT',
        symbol: tradeData.symbol,
        leader: tradeData.leaderHandle,
        side: tradeData.side,
        quantity: tradeData.quantity,
        fillPrice: tradeData.fillPrice,
        pctOfNAV: tradeData.pctOfNAV,
        timestamp: new Date().toISOString(),
      };

      await this.sendPush(deviceTokens, title, body, data);
      
      // Log notification sent
      await this.logNotificationSent(userId, 'TRADE_ALERT', title, body);
      
    } catch (error) {
      this.logger.error(`Error sending trade alert to user ${userId}:`, error);
    }
  }

  /**
   * Send copy execution notification
   */
  async sendCopyExecutedAlert(
    userId: string,
    copyData: {
      symbol: string;
      side: 'BUY' | 'SELL';
      quantity: number;
      fillPrice: number;
      leaderHandle: string;
    }
  ): Promise<void> {
    try {
      const preferences = await this.getNotificationPreferences(userId);
      
      if (!preferences.copyExecuted) {
        this.logger.debug(`Copy executed alerts disabled for user ${userId}`);
        return;
      }

      const deviceTokens = await this.getDeviceTokens(userId);
      
      if (deviceTokens.length === 0) {
        this.logger.debug(`No device tokens found for user ${userId}`);
        return;
      }

      const title = `Copy trade executed: ${copyData.symbol}`;
      const body = `${copyData.side} ${copyData.quantity} @ $${copyData.fillPrice.toFixed(2)}`;
      
      const data = {
        type: 'COPY_EXECUTED',
        symbol: copyData.symbol,
        leader: copyData.leaderHandle,
        side: copyData.side,
        quantity: copyData.quantity,
        fillPrice: copyData.fillPrice,
        timestamp: new Date().toISOString(),
      };

      await this.sendPush(deviceTokens, title, body, data);
      
      await this.logNotificationSent(userId, 'COPY_EXECUTED', title, body);
      
    } catch (error) {
      this.logger.error(`Error sending copy executed alert to user ${userId}:`, error);
    }
  }

  /**
   * Get user's notification preferences
   */
  private async getNotificationPreferences(userId: string): Promise<{
    tradeAlert: boolean;
    copyExecuted: boolean;
    liveSession: boolean;
    system: boolean;
    promotional: boolean;
  }> {
    // For now, return default preferences since notificationPreference table is not working
    return {
      tradeAlert: true,
      copyExecuted: true,
      liveSession: true,
      system: true,
      promotional: false,
    };
  }

  /**
   * Get user's device tokens
   */
  private async getDeviceTokens(userId: string): Promise<string[]> {
    try {
      const tokens = await this.prisma.deviceToken.findMany({
        where: { userId },
        select: { token: true },
      });

      return tokens.map(t => t.token);
    } catch (error) {
      this.logger.error(`Error getting device tokens for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Handle failed notification deliveries
   */
  private async handleFailedDeliveries(failedTokens: string[]): Promise<void> {
    try {
      // Remove invalid device tokens
      await this.prisma.deviceToken.deleteMany({
        where: {
          token: { in: failedTokens },
        },
      });

      this.logger.warn(`Removed ${failedTokens.length} invalid device tokens`);
    } catch (error) {
      this.logger.error('Error handling failed deliveries:', error);
    }
  }

  /**
   * Log notification sent for analytics
   */
  private async logNotificationSent(
    userId: string,
    type: string,
    title: string,
    body: string
  ): Promise<void> {
    try {
      // For now, just log instead of storing in audit log
      this.logger.log(`Notification sent to ${userId}: ${type} - ${title}: ${body}`);
    } catch (error) {
      this.logger.error('Error logging notification:', error);
    }
  }
} 