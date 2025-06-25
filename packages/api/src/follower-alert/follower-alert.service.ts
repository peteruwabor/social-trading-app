import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBus } from '../lib/event-bus';
import { NotificationService } from '../lib/notification.service';
import { PrismaService } from '../lib/prisma.service';

export interface LeaderTradeFilledEvent {
  user_id: string;
  broker_connection_id: string;
  trade: {
    account_number: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    fill_price: number;
    filled_at: string;
  };
}

export interface Follower {
  id: string;
  user_id: string;
  leader_user_id: string;
  auto_copy: boolean;
  alert_only: boolean;
  created_at: Date;
}

@Injectable()
export class FollowerAlertService implements OnModuleInit {
  private readonly logger = new Logger(FollowerAlertService.name);

  constructor(
    private eventBus: EventBus,
    private notificationService: NotificationService,
    private prisma: PrismaService,
  ) {}

  onModuleInit() {
    // Subscribe to LeaderTradeFilled events
    this.eventBus.subscribe('LeaderTradeFilled', this.processLeaderTrade.bind(this));
  }

  private async processLeaderTrade(payload: any): Promise<void> {
    try {
      const event = payload as LeaderTradeFilledEvent;
      await this.handleLeaderTrade(event);
    } catch (error) {
      this.logger.error('Error processing LeaderTradeFilled event:', error);
    }
  }

  private async handleLeaderTrade(event: LeaderTradeFilledEvent): Promise<void> {
    const { user_id: leaderUserId, trade } = event;

    this.logger.debug(`Processing trade for leader: ${leaderUserId}`);

    // Get followers for this leader
    const followers = await this.getFollowers(leaderUserId);
    
    if (followers.length === 0) {
      this.logger.debug(`No followers found for leader: ${leaderUserId}`);
      return;
    }

    this.logger.debug(`Found ${followers.length} followers for leader: ${leaderUserId}`);

    // Get leader information for notifications
    const leader = await this.getLeaderInfo(leaderUserId);
    if (!leader) {
      this.logger.warn(`Leader not found: ${leaderUserId}`);
      return;
    }

    // Calculate trade percentage of NAV for context
    const pctOfNAV = await this.calculateTradePercentage(leaderUserId, trade);

    // Send notifications to each follower
    const notificationPromises = followers.map(follower => 
      this.sendNotificationToFollower(follower, trade, leader, pctOfNAV)
    );

    // Wait for all notifications to be sent
    const results = await Promise.allSettled(notificationPromises);
    
    // Log results
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    this.logger.log(`Trade alert notifications: ${successful} sent, ${failed} failed`);

    // Log analytics
    await this.logTradeAlertAnalytics(leaderUserId, followers.length, successful, failed);
  }

  private async getFollowers(leaderUserId: string): Promise<Follower[]> {
    try {
      const followers = await this.prisma.follower.findMany({
        where: {
          leaderId: leaderUserId,
          OR: [
            { autoCopy: true },
            { alertOnly: true },
          ],
        },
      });

      return followers.map(f => ({
        id: f.id,
        user_id: f.followerId,
        leader_user_id: f.leaderId,
        auto_copy: f.autoCopy,
        alert_only: f.alertOnly,
        created_at: f.createdAt,
      }));
    } catch (error) {
      this.logger.error(`Error fetching followers for leader ${leaderUserId}:`, error);
      return [];
    }
  }

  private async getLeaderInfo(leaderUserId: string): Promise<{ handle: string; email: string } | null> {
    try {
      const leader = await this.prisma.user.findUnique({
        where: { id: leaderUserId },
        select: { email: true },
      });

      return leader ? {
        handle: leader.email.split('@')[0], // Use email prefix as handle
        email: leader.email,
      } : null;
    } catch (error) {
      this.logger.error(`Error fetching leader info for ${leaderUserId}:`, error);
      return null;
    }
  }

  private async calculateTradePercentage(leaderUserId: string, trade: any): Promise<number> {
    try {
      // Get leader's total portfolio value
      const holdings = await this.prisma.holding.findMany({
        where: { userId: leaderUserId },
      });

      const totalNAV = holdings.reduce((sum, holding) => sum + Number(holding.marketValue), 0);
      
      if (totalNAV === 0) {
        return 0;
      }

      const tradeValue = trade.quantity * trade.fill_price;
      return (tradeValue / totalNAV) * 100;
    } catch (error) {
      this.logger.error(`Error calculating trade percentage for ${leaderUserId}:`, error);
      return 0;
    }
  }

  private async sendNotificationToFollower(
    follower: Follower, 
    trade: any, 
    leader: { handle: string; email: string },
    pctOfNAV: number
  ): Promise<void> {
    try {
      // Send trade alert notification
      await this.notificationService.sendTradeAlert(follower.user_id, {
        symbol: trade.symbol,
        side: trade.side,
        quantity: trade.quantity,
        fillPrice: trade.fill_price,
        leaderHandle: leader.handle,
        pctOfNAV,
      });

      this.logger.debug(`Sent trade alert to follower ${follower.user_id}: ${trade.symbol} ${trade.side} ${trade.quantity}`);
      
    } catch (error) {
      this.logger.error(`Error sending notification to follower ${follower.user_id}:`, error);
      throw error;
    }
  }

  private async logTradeAlertAnalytics(
    leaderUserId: string,
    totalFollowers: number,
    successfulNotifications: number,
    failedNotifications: number
  ): Promise<void> {
    try {
      // For now, just log the analytics instead of storing in audit log
      this.logger.log(`Trade alert analytics for ${leaderUserId}: ${totalFollowers} followers, ${successfulNotifications} successful, ${failedNotifications} failed`);
    } catch (error) {
      this.logger.error('Error logging trade alert analytics:', error);
    }
  }

  /**
   * Get notification statistics for a user
   */
  async getNotificationStats(userId: string): Promise<{
    totalNotifications: number;
    tradeAlerts: number;
    copyExecuted: number;
    lastNotificationAt: Date | null;
  }> {
    try {
      // For now, return mock stats since audit log is not working
      return {
        totalNotifications: 0,
        tradeAlerts: 0,
        copyExecuted: 0,
        lastNotificationAt: null,
      };
    } catch (error) {
      this.logger.error(`Error getting notification stats for user ${userId}:`, error);
      return {
        totalNotifications: 0,
        tradeAlerts: 0,
        copyExecuted: 0,
        lastNotificationAt: null,
      };
    }
  }
} 