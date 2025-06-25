import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../lib/prisma.service';
import { SnapTradeClient } from '../3rdparty/snaptrade/snaptrade.client';
import { EventBus } from '../lib/event-bus';

export interface TradeFill {
  account_number: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  fill_price: number;
  filled_at: string;
}

export interface LeaderTradeFilledEvent {
  user_id: string;
  broker_connection_id: string;
  trade: TradeFill;
}

export interface TradeAnalytics {
  totalTrades: number;
  totalVolume: number;
  totalValue: number;
  buyCount: number;
  sellCount: number;
  averageTradeSize: number;
  mostTradedSymbol: string;
  recentActivity: any[];
}

@Injectable()
export class TradeCaptureService {
  private readonly logger = new Logger(TradeCaptureService.name);
  private readonly snaptradeClient: SnapTradeClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
  ) {
    this.snaptradeClient = new SnapTradeClient();
  }

  @Cron('*/15 * * * * *') // Every 15 seconds
  async captureTrades() {
    try {
      this.logger.debug('Starting trade capture cron job');
      
      // Get all active SnapTrade connections
      const connections = await this.prisma.brokerConnection.findMany({
        where: {
          broker: 'snaptrade',
          status: 'ACTIVE',
        },
      });

      this.logger.debug(`Polling ${connections.length} active SnapTrade connections`);

      for (const connection of connections) {
        try {
          await this.processConnectionTrades(connection);
        } catch (error) {
          this.logger.error(`Error processing trades for connection ${connection.id}:`, error);
          // Continue with other connections even if one fails
        }
      }
    } catch (error) {
      this.logger.error('Error in trade capture cron job:', error);
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
      const activities = await this.snaptradeClient.getActivities(authId, since);

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

      this.logger.debug(`Processed trade fill: ${tradeData.symbol} ${tradeData.side} ${tradeData.quantity} @ ${tradeData.fill_price}`);

    } catch (error) {
      this.logger.error('Error processing trade fill:', error);
      throw error;
    }
  }

  // Get trade history for a user
  async getTradeHistory(userId: string, days: number = 30): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trades = await this.prisma.trade.findMany({
      where: {
        userId,
        filledAt: {
          gte: startDate,
        },
      },
      orderBy: {
        filledAt: 'desc',
      },
      include: {
        brokerConnection: true,
      },
    });

    return trades.map(trade => ({
      id: trade.id,
      symbol: trade.symbol,
      side: trade.side,
      quantity: Number(trade.quantity),
      fillPrice: Number(trade.fillPrice),
      accountNumber: trade.accountNumber,
      filledAt: trade.filledAt,
      broker: trade.brokerConnection.broker,
    }));
  }

  // Get trade analytics for a user
  async getTradeAnalytics(userId: string, days: number = 30): Promise<TradeAnalytics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trades = await this.prisma.trade.findMany({
      where: {
        userId,
        filledAt: {
          gte: startDate,
        },
      },
      orderBy: {
        filledAt: 'desc',
      },
    });

    if (trades.length === 0) {
      return {
        totalTrades: 0,
        totalVolume: 0,
        totalValue: 0,
        buyCount: 0,
        sellCount: 0,
        averageTradeSize: 0,
        mostTradedSymbol: '',
        recentActivity: [],
      };
    }

    const totalTrades = trades.length;
    const totalVolume = trades.reduce((sum, trade) => sum + Number(trade.quantity), 0);
    const totalValue = trades.reduce((sum, trade) => sum + (Number(trade.quantity) * Number(trade.fillPrice)), 0);
    const buyCount = trades.filter(trade => trade.side === 'BUY').length;
    const sellCount = trades.filter(trade => trade.side === 'SELL').length;
    const averageTradeSize = totalVolume / totalTrades;

    // Find most traded symbol
    const symbolCounts = trades.reduce((acc, trade) => {
      acc[trade.symbol] = (acc[trade.symbol] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostTradedSymbol = Object.entries(symbolCounts)
      .sort(([,a], [,b]) => b - a)[0][0];

    // Get recent activity (last 10 trades)
    const recentActivity = trades.slice(0, 10).map(trade => ({
      symbol: trade.symbol,
      side: trade.side,
      quantity: Number(trade.quantity),
      fillPrice: Number(trade.fillPrice),
      filledAt: trade.filledAt,
    }));

    return {
      totalTrades,
      totalVolume,
      totalValue,
      buyCount,
      sellCount,
      averageTradeSize,
      mostTradedSymbol,
      recentActivity,
    };
  }

  // Get trades by symbol for a user
  async getTradesBySymbol(userId: string, symbol: string, days: number = 30): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trades = await this.prisma.trade.findMany({
      where: {
        userId,
        symbol,
        filledAt: {
          gte: startDate,
        },
      },
      orderBy: {
        filledAt: 'desc',
      },
    });

    return trades.map(trade => ({
      id: trade.id,
      side: trade.side,
      quantity: Number(trade.quantity),
      fillPrice: Number(trade.fillPrice),
      accountNumber: trade.accountNumber,
      filledAt: trade.filledAt,
    }));
  }

  // Manual trade capture for testing
  async manualCaptureTrades(connectionId: string): Promise<void> {
    const connection = await this.prisma.brokerConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    await this.processConnectionTrades(connection);
  }

  // Get trade statistics for copy trading
  async getTradeStatsForCopyTrading(userId: string, symbol: string, days: number = 7): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trades = await this.prisma.trade.findMany({
      where: {
        userId,
        symbol,
        filledAt: {
          gte: startDate,
        },
      },
      orderBy: {
        filledAt: 'desc',
      },
    });

    if (trades.length === 0) {
      return {
        totalTrades: 0,
        totalVolume: 0,
        averagePrice: 0,
        lastTrade: null,
      };
    }

    const totalTrades = trades.length;
    const totalVolume = trades.reduce((sum, trade) => sum + Number(trade.quantity), 0);
    const totalValue = trades.reduce((sum, trade) => sum + (Number(trade.quantity) * Number(trade.fillPrice)), 0);
    const averagePrice = totalValue / totalVolume;
    const lastTrade = trades[0];

    return {
      totalTrades,
      totalVolume,
      averagePrice,
      lastTrade: {
        side: lastTrade.side,
        quantity: Number(lastTrade.quantity),
        fillPrice: Number(lastTrade.fillPrice),
        filledAt: lastTrade.filledAt,
      },
    };
  }
} 