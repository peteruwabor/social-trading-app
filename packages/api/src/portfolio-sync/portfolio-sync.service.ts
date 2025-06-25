import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../lib/prisma.service';
import { EventBus } from '../lib/event-bus';
import { SnapTradeClient } from '../3rdparty/snaptrade/snaptrade.client';

@Injectable()
export class PortfolioSyncService {
  private readonly logger = new Logger(PortfolioSyncService.name);
  private readonly snapTradeClient: SnapTradeClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus
  ) {
    this.snapTradeClient = new SnapTradeClient();
  }

  @Cron('0 */10 * * * *') // Every 10 minutes instead of every minute
  async syncPortfolios() {
    try {
      this.logger.log('Starting portfolio sync cron job');
      
      // Query broker_connections that need syncing
      const connections = await this.prisma.brokerConnection.findMany({
        where: {
          status: 'ACTIVE',
        },
      });

      // Filter connections that need syncing (null last_synced_at or older than 10 min)
      const now = new Date();
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

      const connectionsToSync = connections.filter(connection => {
        if (!connection.lastSyncedAt) {
          return true; // Never synced
        }
        
        const lastSync = new Date(connection.lastSyncedAt);
        return lastSync < tenMinutesAgo;
      });

      this.logger.log(`Found ${connectionsToSync.length} connections needing sync out of ${connections.length} total`);

      // Process each connection
      for (const connection of connectionsToSync) {
        try {
          this.logger.log(`Syncing portfolio for connection ${connection.id} (${connection.broker})`);
          
          // Handle SnapTrade connections
          if (connection.broker === 'snaptrade' && connection.snaptradeAuthorizationId) {
            await this.syncSnapTradeHoldings(connection);
            this.logger.log(`SnapTrade holdings sync completed for connection ${connection.id}`);
          }
          
          // Update last_synced_at to now
          await this.prisma.brokerConnection.update({
            where: { id: connection.id },
            data: { lastSyncedAt: now },
          });

          // Publish SyncQueued event
          this.eventBus.publish('SyncQueued', {
            connectionId: connection.id,
            userId: connection.userId,
            broker: connection.broker,
            timestamp: now.toISOString(),
          });
        } catch (error) {
          this.logger.error(`Failed to sync connection ${connection.id}:`, error);
          // Continue with other connections even if one fails
        }
      }

      if (connectionsToSync.length > 0) {
        this.logger.log(`Completed sync for ${connectionsToSync.length} connections`);
      }
    } catch (error) {
      this.logger.error('Error in portfolio sync cron job:', error);
    }
  }

  private async syncSnapTradeHoldings(connection: any): Promise<void> {
    try {
      const holdings = await this.snapTradeClient.getHoldings(connection.snaptradeAuthorizationId);
      
      if (!holdings || !Array.isArray(holdings)) {
        throw new Error('Invalid holdings response from SnapTrade');
      }
      
      for (const accountHoldings of holdings) {
        if (!accountHoldings.holdings || !Array.isArray(accountHoldings.holdings)) {
          this.logger.warn(`Invalid account holdings for account ${accountHoldings.accountNumber}`);
          continue;
        }
        
        for (const holding of accountHoldings.holdings) {
          // Calculate unrealized P&L if we have cost basis (mock for now)
          const costBasis = holding.marketValue; // Mock cost basis - use market value for now
          const unrealizedPnL = holding.marketValue - costBasis;
          
          // Upsert holding into database
          await this.prisma.holding.upsert({
            where: {
              // Match on user_id + symbol + account_number
              userId_symbol_accountNumber: {
                userId: connection.userId,
                symbol: holding.symbol,
                accountNumber: holding.accountNumber,
              },
            },
            update: {
              quantity: holding.quantity,
              marketValue: holding.marketValue,
              currency: holding.currency,
              updatedAt: new Date(),
            },
            create: {
              userId: connection.userId,
              brokerConnectionId: connection.id,
              accountNumber: holding.accountNumber,
              symbol: holding.symbol,
              quantity: holding.quantity,
              marketValue: holding.marketValue,
              currency: holding.currency,
            },
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error syncing SnapTrade holdings for connection ${connection.id}:`, error);
      throw error;
    }
  }

  // Method for testing purposes
  async getConnectionsNeedingSync(): Promise<any[]> {
    const connections = await this.prisma.brokerConnection.findMany({
      where: {
        status: 'ACTIVE',
      },
    });

    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    return connections.filter(connection => {
      if (!connection.lastSyncedAt) {
        return true;
      }
      
      const lastSync = new Date(connection.lastSyncedAt);
      return lastSync < tenMinutesAgo;
    });
  }

  // Method for testing purposes - manually trigger sync
  async manualSync(connectionId: string): Promise<void> {
    const connection = await this.prisma.brokerConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }
    
    if (connection.broker === 'snaptrade' && connection.snaptradeAuthorizationId) {
      await this.syncSnapTradeHoldings(connection);
    }

    // Update last_synced_at
    await this.prisma.brokerConnection.update({
      where: { id: connectionId },
      data: { lastSyncedAt: new Date() },
    });
  }

  // Get multi-account portfolio summary
  async getMultiAccountPortfolio(userId: string): Promise<any> {
    const holdings = await this.prisma.holding.findMany({
      where: { userId },
      include: {
        brokerConnection: true,
      },
    });

    // Group by account
    const accounts = new Map<string, any>();
    let totalNav = 0;

    for (const holding of holdings) {
      const accountKey = `${holding.brokerConnection.broker}-${holding.accountNumber}`;
      const marketValue = Number(holding.marketValue);
      totalNav += marketValue;

      if (!accounts.has(accountKey)) {
        accounts.set(accountKey, {
          broker: holding.brokerConnection.broker,
          accountNumber: holding.accountNumber,
          nav: 0,
          positions: [],
        });
      }

      const account = accounts.get(accountKey);
      account.nav += marketValue;
      account.positions.push({
        symbol: holding.symbol,
        quantity: Number(holding.quantity),
        marketValue,
        currency: holding.currency,
        allocationPct: 0, // Will be calculated below
      });
    }

    // Calculate allocation percentages for each account
    for (const account of accounts.values()) {
      for (const position of account.positions) {
        position.allocationPct = account.nav > 0 ? (position.marketValue / account.nav) * 100 : 0;
      }
    }

    return {
      totalNav,
      accounts: Array.from(accounts.values()),
    };
  }
} 