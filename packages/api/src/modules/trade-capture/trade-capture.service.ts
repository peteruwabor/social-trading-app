import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../lib/prisma.service';
import { EventBus } from '../../lib/event-bus';
import { SnapTradeClient } from '../../3rdparty/snaptrade/snaptrade.client';
import { AuditLogService } from '../../lib/audit-log.service';

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

@Injectable()
export class TradeCaptureService implements OnModuleInit {
  private readonly logger = new Logger(TradeCaptureService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
    private readonly snapTradeClient: SnapTradeClient,
    private readonly auditLogService: AuditLogService,
  ) {}

  onModuleInit() {
    this.logger.log('TradeCaptureService initialized');
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async pollForTrades() {
    try {
      this.logger.debug('Polling for new trades...');

      // Get all active broker connections that need polling
      const connectionsToPoll = await this.prisma.brokerConnection.findMany({
        where: {
          status: 'ACTIVE',
          // Add any additional filters for connections that need polling
        },
      });

      this.logger.debug(`Found ${connectionsToPoll.length} connections to poll`);

      // Process each connection
      for (const connection of connectionsToPoll) {
        try {
          await this.processConnectionTrades(connection);
        } catch (error) {
          this.logger.error(`Error processing trades for connection ${connection.id}:`, error);
          // Continue with other connections even if one fails
        }
      }
    } catch (error) {
      this.logger.error('Error in trade polling cron job:', error);
    }
  }

  private async processConnectionTrades(connection: any) {
    try {
      const { id: connectionId, userId, snaptradeAuthorizationId: authId, lastTradePollAt: since } = connection;

      if (!authId) {
        this.logger.warn(`No SnapTrade authorization ID for connection ${connectionId}`);
        return;
      }

      // Get activities since last poll
      const activities = await this.snapTradeClient.getActivities(authId, since);

      if (!activities || !Array.isArray(activities)) {
        this.logger.warn(`Invalid activities response for connection ${connectionId}`);
        return;
      }

      // Filter for fill activities
      const fills = activities.filter((activity: any) => 
        activity.type === 'FILL' && 
        activity.data?.side && 
        activity.data?.quantity && 
        activity.data?.price
      );

      this.logger.debug(`Found ${fills.length} fills for connection ${connectionId}`);

      // Process each fill
      for (const fill of fills) {
        try {
          await this.processTradeFill(userId, connectionId, fill);
        } catch (error) {
          this.logger.error(`Error processing individual trade fill:`, error);
          // Continue with other fills even if one fails
        }
      }

      // Update last poll timestamp
      await this.prisma.brokerConnection.update({
        where: { id: connectionId },
        data: { lastTradePollAt: new Date() },
      });

    } catch (error) {
      this.logger.error(`Error processing trades for connection ${connection.id}:`, error);
      throw error;
    }
  }

  private async processTradeFill(userId: string, connectionId: string, fill: any) {
    try {
      const tradeData = {
        account_number: fill.account_number,
        symbol: fill.symbol,
        side: fill.side,
        quantity: fill.quantity,
        fill_price: fill.price,
        filled_at: fill.filled_at,
      };

      // Check if trade already exists to avoid duplicates
      const existingTrade = await this.prisma.trade.findFirst({
        where: {
          userId: userId,
          brokerConnectionId: connectionId,
          symbol: tradeData.symbol,
          side: tradeData.side,
          quantity: tradeData.quantity,
          filledAt: new Date(tradeData.filled_at),
        },
      });

      if (existingTrade) {
        this.logger.debug(`Trade already exists: ${tradeData.symbol} ${tradeData.side} ${tradeData.quantity} @ ${tradeData.fill_price}`);
        return;
      }

      // Create new trade record
      const trade = await this.prisma.trade.create({
        data: {
          userId: userId,
          brokerConnectionId: connectionId,
          accountNumber: tradeData.account_number,
          symbol: tradeData.symbol,
          side: tradeData.side,
          quantity: tradeData.quantity,
          fillPrice: tradeData.fill_price,
          filledAt: new Date(tradeData.filled_at),
        },
      });

      // Log the trade action
      await this.auditLogService.logAction({
        userId,
        action: 'TRADE_EXECUTED',
        resource: 'TRADE',
        resourceId: trade.id,
        details: {
          symbol: tradeData.symbol,
          side: tradeData.side,
          quantity: tradeData.quantity,
          fillPrice: tradeData.fill_price,
          accountNumber: tradeData.account_number,
        },
      });

      // Publish event for copy trading
      const event: LeaderTradeFilledEvent = {
        user_id: userId,
        broker_connection_id: connectionId,
        trade: tradeData,
      };

      this.eventBus.publish('LeaderTradeFilled', event);

      // Publish trade alert event
      this.eventBus.publish('TradeAlert', {
        userId,
        tradeId: trade.id,
        symbol: tradeData.symbol,
        side: tradeData.side,
        quantity: tradeData.quantity,
        fillPrice: tradeData.fill_price,
        accountNumber: tradeData.account_number,
        filledAt: tradeData.filled_at,
      });

      this.logger.log(`Processed trade: ${tradeData.symbol} ${tradeData.side} ${tradeData.quantity} @ ${tradeData.fill_price}`);

    } catch (error) {
      this.logger.error('Error processing trade fill:', error);
      throw error;
    }
  }
} 