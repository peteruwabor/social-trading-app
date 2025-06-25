import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../lib/prisma.service';
import { EventBus } from '../../lib/event-bus';
import { SnapTradeClient } from '../../3rdparty/snaptrade/snaptrade.client';
import { withinMaxPositionPct } from '../../lib/guardrails.util';
import { AdvancedCopyTradingService } from './advanced-copy-trading.service';

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

export interface CopyExecutedEvent {
  copyOrderId: string;
  followerId: string;
  leaderTradeId: string;
  symbol: string;
  side: string;
  quantity: number;
  status: 'placed' | 'failed';
  error?: string;
}

@Injectable()
export class CopyEngineService implements OnModuleInit {
  private readonly logger = new Logger(CopyEngineService.name);
  private readonly snapTradeClient: SnapTradeClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
    private readonly advancedCopyTradingService: AdvancedCopyTradingService,
  ) {
    this.snapTradeClient = new SnapTradeClient();
  }

  onModuleInit() {
    // Subscribe to LeaderTradeFilled events from the custom EventBus
    this.eventBus.subscribe('LeaderTradeFilled', this.handleEventBusLeaderTrade.bind(this));
  }

  private async handleEventBusLeaderTrade(payload: any): Promise<void> {
    try {
      const event = payload as LeaderTradeFilledEvent;
      await this.handleLeaderTradeFilled(event);
    } catch (error) {
      this.logger.error('Error handling EventBus LeaderTradeFilled event:', error);
    }
  }

  @OnEvent('LeaderTradeFilled')
  async handleLeaderTradeFilled(event: LeaderTradeFilledEvent) {
    try {
      this.logger.log(`Processing leader trade: ${event.trade.symbol} ${event.trade.side} ${event.trade.quantity}`);

      // Get the leader's trade record to extract additional data
      const leaderTrade = await this.prisma.trade.findFirst({
        where: {
          userId: event.user_id,
          brokerConnectionId: event.broker_connection_id,
          symbol: event.trade.symbol,
          side: event.trade.side,
          quantity: event.trade.quantity,
          filledAt: new Date(event.trade.filled_at),
        },
        include: {
          brokerConnection: true,
        },
      });

      if (!leaderTrade) {
        this.logger.warn(`Leader trade not found for event: ${JSON.stringify(event)}`);
        return;
      }

      // Calculate leader's NAV
      const leaderHoldings = await this.prisma.holding.findMany({
        where: { userId: event.user_id },
      });
      const leaderNAV = leaderHoldings.reduce((sum, holding) => sum + Number(holding.marketValue), 0);

      // Calculate percentage of NAV for this trade
      const tradeValue = event.trade.quantity * event.trade.fill_price;
      const pctOfNAV = leaderNAV > 0 ? tradeValue / leaderNAV : 0;

      this.logger.debug(`Leader NAV: ${leaderNAV}, Trade Value: ${tradeValue}, Pct of NAV: ${pctOfNAV}`);

      // Get followers with auto-copy enabled
      const followers = await this.prisma.follower.findMany({
        where: {
          leaderId: event.user_id,
          autoCopy: true,
          autoCopyPaused: false, // Check if auto-copy is paused
        },
      });

      this.logger.log(`Found ${followers.length} followers with auto-copy enabled`);

      // Process each follower
      for (const follower of followers) {
        await this.processFollowerCopy(
          follower,
          leaderTrade,
          event,
          pctOfNAV,
        );
      }
    } catch (error) {
      this.logger.error('Error processing leader trade:', error);
    }
  }

  private async processFollowerCopy(
    follower: any,
    leaderTrade: any,
    event: LeaderTradeFilledEvent,
    pctOfNAV: number,
  ) {
    try {
      // Calculate follower's NAV
      const followerHoldings = await this.prisma.holding.findMany({
        where: { userId: follower.followerId },
      });
      const followerNAV = followerHoldings.reduce((sum, holding) => sum + Number(holding.marketValue), 0);

      // Calculate trade value for advanced position sizing
      const tradeValue = event.trade.quantity * event.trade.fill_price;

      // Use advanced position sizing algorithms
      const positionSize = await this.calculateAdvancedPositionSize(
        follower.followerId,
        event.user_id,
        event.trade.symbol,
        tradeValue,
        pctOfNAV,
      );

      // Calculate follower quantity using advanced position sizing
      const followerQty = this.roundToLot((positionSize * followerNAV) / event.trade.fill_price);

      this.logger.debug(`Follower ${follower.followerId} NAV: ${followerNAV}, Advanced Position Size: ${positionSize}, Qty: ${followerQty}`);

      if (followerQty < 1) {
        this.logger.debug(`Skipping follower ${follower.followerId} - quantity too small: ${followerQty}`);
        return;
      }

      // Validate risk limits using advanced risk management
      const riskValidation = await this.advancedCopyTradingService.validateRiskLimits(
        follower.followerId,
        event.trade.symbol,
        positionSize,
      );

      if (!riskValidation.allowed) {
        this.logger.debug(`Skipping follower ${follower.followerId} - risk limits exceeded: ${riskValidation.reason}`);
        
        // If we have an adjusted size, try with that
        if (riskValidation.adjustedSize && riskValidation.adjustedSize > 0) {
          const adjustedQty = this.roundToLot((riskValidation.adjustedSize * followerNAV) / event.trade.fill_price);
          if (adjustedQty >= 1) {
            this.logger.debug(`Using adjusted position size: ${riskValidation.adjustedSize}, Qty: ${adjustedQty}`);
            await this.executeCopyOrderWithQuantity(follower, leaderTrade, event, adjustedQty);
          }
        }
        return;
      }

      // Check traditional guardrails as backup
      const isWithinLimits = await withinMaxPositionPct(
        follower.followerId,
        event.trade.symbol,
        positionSize
      );

      if (!isWithinLimits) {
        this.logger.debug(`Skipping follower ${follower.followerId} - traditional guardrails exceeded for ${event.trade.symbol}`);
        return;
      }

      // Execute the copy trade
      await this.executeCopyOrderWithQuantity(follower, leaderTrade, event, followerQty);
    } catch (error) {
      this.logger.error(`Error processing follower copy for ${follower.followerId}:`, error);
    }
  }

  private async calculateAdvancedPositionSize(
    followerId: string,
    leaderId: string,
    symbol: string,
    tradeValue: number,
    defaultPctOfNAV: number,
  ): Promise<number> {
    try {
      // Get follower's copy trading history to determine strategy
      const copyOrders = await this.prisma.copyOrder.findMany({
        where: { followerId: followerId },
        include: { leaderTrade: true },
      });

      // Determine which strategy to use based on experience and performance
      if (copyOrders.length >= 100) {
        // Experienced user - use Kelly Criterion
        return await this.advancedCopyTradingService.calculateKellyPositionSize(
          followerId,
          leaderId,
          symbol,
          tradeValue,
        );
      } else if (copyOrders.length >= 50) {
        // Intermediate user - use Risk Parity
        return await this.advancedCopyTradingService.calculateRiskParityPositionSize(
          followerId,
          symbol,
          tradeValue,
        );
      } else if (copyOrders.length >= 10) {
        // Beginner with some experience - use Momentum-based
        return await this.advancedCopyTradingService.calculateMomentumPositionSize(
          followerId,
          symbol,
          tradeValue,
        );
      } else {
        // New user - use conservative percentage with some adjustment
        return Math.min(defaultPctOfNAV * 0.8, 0.05); // Conservative approach
      }
    } catch (error) {
      this.logger.error('Error calculating advanced position size:', error);
      return defaultPctOfNAV; // Fallback to original calculation
    }
  }

  private async executeCopyOrderWithQuantity(
    follower: any,
    leaderTrade: any,
    event: LeaderTradeFilledEvent,
    quantity: number,
  ) {
    try {
      // Get follower's broker connection
      const followerConnection = await this.prisma.brokerConnection.findFirst({
        where: {
          userId: follower.followerId,
          status: 'ACTIVE',
        },
      });

      if (!followerConnection) {
        this.logger.warn(`No active broker connection found for follower ${follower.followerId}`);
        return;
      }

      // Create CopyOrder record
      const copyOrder = await this.prisma.copyOrder.create({
        data: {
          leaderTradeId: leaderTrade.id,
          followerId: follower.followerId,
          symbol: event.trade.symbol,
          side: event.trade.side,
          quantity: quantity,
          status: 'QUEUED',
        },
      });

      this.logger.log(`Created CopyOrder ${copyOrder.id} for follower ${follower.followerId} with quantity ${quantity}`);

      // Execute the copy trade
      await this.executeCopyOrder(copyOrder, followerConnection, event);
    } catch (error) {
      this.logger.error(`Error executing copy order for ${follower.followerId}:`, error);
    }
  }

  private async executeCopyOrder(copyOrder: any, followerConnection: any, event: LeaderTradeFilledEvent) {
    try {
      // Place order via SnapTrade
      const orderResult = await this.snapTradeClient.placeOrder({
        authorizationId: followerConnection.snaptradeAuthorizationId!,
        accountNumber: event.trade.account_number,
        symbol: copyOrder.symbol,
        side: copyOrder.side as 'BUY' | 'SELL',
        quantity: Number(copyOrder.quantity),
      });

      // Update CopyOrder status
      await this.prisma.copyOrder.update({
        where: { id: copyOrder.id },
        data: {
          status: 'PLACED',
          filledAt: new Date(),
        },
      });

      // Publish CopyExecuted event
      const copyExecutedEvent: CopyExecutedEvent = {
        copyOrderId: copyOrder.id,
        followerId: copyOrder.followerId,
        leaderTradeId: copyOrder.leaderTradeId,
        symbol: copyOrder.symbol,
        side: copyOrder.side,
        quantity: Number(copyOrder.quantity),
        status: 'placed',
      };

      this.eventBus.publish('CopyExecuted', copyExecutedEvent);

      this.logger.log(`Copy order executed successfully: ${copyOrder.id} -> ${orderResult.orderId}`);
    } catch (error) {
      // Update CopyOrder status to failed
      await this.prisma.copyOrder.update({
        where: { id: copyOrder.id },
        data: { 
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      // Publish CopyExecuted event with failure
      const copyExecutedEvent: CopyExecutedEvent = {
        copyOrderId: copyOrder.id,
        followerId: copyOrder.followerId,
        leaderTradeId: copyOrder.leaderTradeId,
        symbol: copyOrder.symbol,
        side: copyOrder.side,
        quantity: Number(copyOrder.quantity),
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      this.eventBus.publish('CopyExecuted', copyExecutedEvent);

      this.logger.error(`Copy order failed: ${copyOrder.id}`, error);
    }
  }

  /**
   * Utility function to round quantity to lot size
   * Currently just floors the quantity, but can be extended for specific lot sizes
   */
  roundToLot(quantity: number): number {
    return Math.floor(quantity);
  }
} 