import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../lib/prisma.service';
import { EventBus } from '../../lib/event-bus';
import { CopyEngineService } from './copy-engine.service';

export interface DelayedCopyOrder {
  id: string;
  followerId: string;
  leaderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  originalTradeId: string;
  scheduledFor: Date;
  status: 'PENDING' | 'EXECUTED' | 'FAILED';
}

@Injectable()
export class DelayedCopyService implements OnModuleInit {
  private readonly logger = new Logger(DelayedCopyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
    private readonly copyEngineService: CopyEngineService,
  ) {}

  onModuleInit() {
    this.setupEventSubscriptions();
  }

  private setupEventSubscriptions() {
    // Subscribe to leader trade events for delayed copy processing
    this.eventBus.subscribe('LeaderTradeFilled', async (event: any) => {
      await this.processDelayedCopy(event);
    });
  }

  /**
   * Process delayed copy for a leader trade
   */
  private async processDelayedCopy(event: any) {
    try {
      const { user_id: leaderId, trade } = event;

      // Get followers with delayed copy enabled
      const delayedCopyFollowers = await this.prisma.follower.findMany({
        where: {
          leaderId: leaderId,
          delayedCopy: true, // New field to be added to schema
          autoCopyPaused: false,
        },
      });

      if (delayedCopyFollowers.length === 0) {
        return;
      }

      this.logger.log(`Processing delayed copy for ${delayedCopyFollowers.length} followers`);

      // Schedule delayed copy orders for end-of-day
      const endOfDay = this.getEndOfDay();
      
      for (const follower of delayedCopyFollowers) {
        await this.scheduleDelayedCopyOrder(follower, trade, endOfDay);
      }
    } catch (error) {
      this.logger.error('Error processing delayed copy:', error);
    }
  }

  /**
   * Schedule a delayed copy order
   */
  private async scheduleDelayedCopyOrder(follower: any, trade: any, scheduledFor: Date) {
    try {
      // Calculate follower quantity (similar to regular copy logic)
      const followerHoldings = await this.prisma.holding.findMany({
        where: { userId: follower.followerId },
      });
      const followerNAV = followerHoldings.reduce((sum, h) => sum + Number(h.marketValue), 0);
      
      // Use conservative position sizing for delayed copy
      const positionSize = Math.min(0.03, 0.05); // 3% max for delayed copy
      const quantity = Math.floor((positionSize * followerNAV) / trade.fill_price);

      if (quantity < 1) {
        this.logger.debug(`Skipping delayed copy for follower ${follower.followerId} - quantity too small: ${quantity}`);
        return;
      }

      // Create delayed copy order
      const delayedOrder = await this.prisma.delayedCopyOrder.create({
        data: {
          followerId: follower.followerId,
          leaderId: follower.leaderId,
          symbol: trade.symbol,
          side: trade.side,
          quantity: quantity,
          originalTradeId: trade.id,
          scheduledFor: scheduledFor,
          status: 'PENDING',
        },
      });

      this.logger.log(`Scheduled delayed copy order ${delayedOrder.id} for ${scheduledFor}`);
    } catch (error) {
      this.logger.error(`Error scheduling delayed copy order for follower ${follower.followerId}:`, error);
    }
  }

  /**
   * Execute delayed copy orders at end-of-day
   */
  @Cron(CronExpression.EVERY_DAY_AT_4PM) // 4 PM ET (market close)
  async executeDelayedCopyOrders() {
    try {
      this.logger.log('Starting delayed copy order execution');

      const pendingOrders = await this.prisma.delayedCopyOrder.findMany({
        where: {
          status: 'PENDING',
          scheduledFor: {
            lte: new Date(),
          },
        },
        include: {
          originalTrade: true,
        },
      });

      this.logger.log(`Found ${pendingOrders.length} pending delayed copy orders`);

      for (const order of pendingOrders) {
        try {
          await this.executeDelayedOrder(order);
        } catch (error) {
          this.logger.error(`Error executing delayed order ${order.id}:`, error);
          
          // Mark as failed
          await this.prisma.delayedCopyOrder.update({
            where: { id: order.id },
            data: { 
              status: 'FAILED',
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        }
      }
    } catch (error) {
      this.logger.error('Error in delayed copy execution:', error);
    }
  }

  /**
   * Execute a single delayed copy order
   */
  private async executeDelayedOrder(order: any) {
    try {
      // Get follower's broker connection
      const followerConnection = await this.prisma.brokerConnection.findFirst({
        where: {
          userId: order.followerId,
          status: 'ACTIVE',
        },
      });

      if (!followerConnection) {
        throw new Error('No active broker connection found');
      }

      // Execute the copy trade using existing copy engine logic
      await this.copyEngineService.executeCopyOrderWithQuantity(
        { followerId: order.followerId },
        order.originalTrade,
        {
          user_id: order.leaderId,
          broker_connection_id: order.originalTrade.brokerConnectionId,
          trade: {
            account_number: order.originalTrade.accountNumber,
            symbol: order.symbol,
            side: order.side,
            quantity: order.quantity,
            fill_price: order.originalTrade.fillPrice,
            filled_at: order.originalTrade.filledAt.toISOString(),
          },
        },
        order.quantity,
      );

      // Mark as executed
      await this.prisma.delayedCopyOrder.update({
        where: { id: order.id },
        data: { 
          status: 'EXECUTED',
          executedAt: new Date(),
        },
      });

      this.logger.log(`Executed delayed copy order ${order.id}`);
    } catch (error) {
      this.logger.error(`Error executing delayed order ${order.id}:`, error);
      throw error;
    }
  }

  /**
   * Get end-of-day timestamp (4 PM ET)
   */
  private getEndOfDay(): Date {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(16, 0, 0, 0); // 4 PM ET
    
    // If it's already past 4 PM, schedule for tomorrow
    if (now.getHours() >= 16) {
      endOfDay.setDate(endOfDay.getDate() + 1);
    }
    
    return endOfDay;
  }

  /**
   * Enable delayed copy for a follower
   */
  async enableDelayedCopy(followerId: string, leaderId: string): Promise<void> {
    await this.prisma.follower.update({
      where: {
        leaderId_followerId: {
          leaderId: leaderId,
          followerId: followerId,
        },
      },
      data: {
        delayedCopy: true,
        autoCopy: false, // Disable immediate copy when delayed copy is enabled
      },
    });
  }

  /**
   * Disable delayed copy for a follower
   */
  async disableDelayedCopy(followerId: string, leaderId: string): Promise<void> {
    await this.prisma.follower.update({
      where: {
        leaderId_followerId: {
          leaderId: leaderId,
          followerId: followerId,
        },
      },
      data: {
        delayedCopy: false,
      },
    });
  }

  /**
   * Get delayed copy orders for a follower
   */
  async getDelayedCopyOrders(followerId: string): Promise<DelayedCopyOrder[]> {
    return this.prisma.delayedCopyOrder.findMany({
      where: { followerId: followerId },
      orderBy: { scheduledFor: 'desc' },
    });
  }
} 