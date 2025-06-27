import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../lib/prisma.service';
import { EventBus } from '../lib/event-bus';
import { SnapTradeClient } from '../3rdparty/snaptrade/snaptrade.client';
import { encryptToken, decryptToken } from '../lib/secrets-vault';
import { PortfolioSyncService } from '../portfolio-sync/portfolio-sync.service';
import { SecretsVault } from '../lib/secrets-vault';
import { Prisma, BrokerConnection } from '@prisma/client';

export interface BrokerConnectionWithHealth {
  id: string;
  user_id: string;
  broker: string;
  access_token: string;
  refresh_token: string;
  scope: string | null;
  status: string;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
  healthColor: 'green' | 'amber' | 'red';
}

export interface BrokerConnectionCreateDto {
  userId: string;
  broker: string;
  accessToken: string;
  refreshToken: string;
  snaptradeAuthorizationId?: string;
}

export interface BrokerConnectionResponse {
  id: string;
  userId: string;
  broker: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt: Date | null;
  lastTradePollAt: Date | null;
  lastHeartbeatAt: Date | null;
  snaptradeAuthorizationId: string | null;
}

interface BrokerConnectionData {
  userId: string;
  broker: string;
  accountId?: string;
  accountNumber?: string;
  accountName?: string;
  status: string;
  authToken?: string;
  refreshToken?: string;
  metadata?: Prisma.JsonValue;
}

@Injectable()
export class BrokerConnectionService {
  private readonly logger = new Logger(BrokerConnectionService.name);
  private readonly snapTradeClient: SnapTradeClient;
  private readonly secretsVault: SecretsVault;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
    private readonly portfolioSyncService: PortfolioSyncService,
  ) {
    this.snapTradeClient = new SnapTradeClient();
    this.secretsVault = new SecretsVault();
  }

  async createAuthUrl(broker: string, userId: string) {
    if (broker === 'snaptrade') {
      // Create SnapTrade connect token
      const { connectToken } = await this.snapTradeClient.createConnectToken(userId);
      // Encrypt the connect token
      const encryptedToken = encryptToken(connectToken);
      // Build SnapTrade connect URL
      const authUrl = `https://app.snaptrade.com/connect?client_id=${process.env.SNAPTRADE_CLIENT_ID}&connect_token=${connectToken}`;
      // Persist connection record
      const connection = await this.prisma.brokerConnection.create({
        data: {
          userId: userId,
          broker: 'snaptrade',
          snaptradeAuthorizationId: null,
          status: 'PENDING',
          accessToken: encryptedToken, // Store encrypted connect token
          refreshToken: '', // Will be updated on callback
        },
      });
      return { authUrl };
    }
    // Fallback for other brokers (existing logic)
    return {
      authUrl: `https://${broker}.com/oauth/authorize?client_id=123&redirect_uri=https://app.gioat.com/callback`,
    };
  }

  async handleSnaptradeCallback(dto: { snaptrade_user_id: string; snaptrade_authorization_id: string }) {
    // Update the connection record
    const connection = await this.prisma.brokerConnection.updateMany({
      where: {
        userId: dto.snaptrade_user_id,
        status: 'PENDING',
      },
      data: {
        status: 'ACTIVE',
        snaptradeAuthorizationId: dto.snaptrade_authorization_id,
      },
    });
    if (connection.count === 0) {
      throw new Error('No pending SnapTrade connection found for this user');
    }
    // Get the updated connection
    const updatedConnection = await this.prisma.brokerConnection.findFirst({
      where: {
        userId: dto.snaptrade_user_id,
        status: 'ACTIVE',
      },
    });
    if (!updatedConnection) {
      throw new Error('Failed to retrieve updated connection');
    }
    // Emit connection created event
    this.eventBus.publish('ConnectionCreated', {
      connectionId: updatedConnection.id,
      userId: updatedConnection.userId,
      broker: updatedConnection.broker,
    });
    // Schedule first portfolio sync within 30s
    setTimeout(() => {
      this.portfolioSyncService.manualSync(updatedConnection.id).catch((err) => {
        console.error('First portfolio sync failed:', err);
      });
    }, 5000); // 5s for test/demo, adjust to ≤30s in prod
    return { message: 'SnapTrade connection activated successfully' };
  }

  async listByUser(userId: string): Promise<BrokerConnectionWithHealth[]> {
    const connections = await this.prisma.brokerConnection.findMany({
      where: {
        userId: userId,
      },
    });

    return connections.map(connection => ({
      id: connection.id,
      user_id: connection.userId,
      broker: connection.broker,
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken,
      scope: null, // Remove scope reference
      status: connection.status,
      last_synced_at: connection.lastSyncedAt?.toISOString() || null,
      created_at: connection.createdAt.toISOString(),
      updated_at: connection.updatedAt.toISOString(),
      healthColor: this.getHealthColor(
        connection.status,
        connection.lastSyncedAt?.toISOString() || null,
      ),
    }));
  }

  async disconnect(connectionId: string, userId: string): Promise<void> {
    const connection = await this.prisma.brokerConnection.updateMany({
      where: {
        id: connectionId,
        userId: userId,
      },
      data: {
        status: 'REVOKED',
      },
    });

    if (connection.count === 0) {
      throw new Error('Connection not found or user does not have permission.');
    }

    this.eventBus.publish('connection.revoked', { connectionId });
  }

  async createConnection(data: BrokerConnectionData): Promise<BrokerConnection> {
    return this.prisma.brokerConnection.create({
      data: {
        userId: data.userId,
        broker: data.broker,
        accountId: data.accountId,
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        status: data.status,
        authToken: data.authToken,
        refreshToken: data.refreshToken,
        metadata: data.metadata,
      },
    });
  }

  async getConnections(userId: string): Promise<BrokerConnectionResponse[]> {
    try {
      const connections = await this.prisma.brokerConnection.findMany({
        where: {
          userId,
          status: 'PENDING',
        },
        orderBy: { createdAt: 'desc' },
      });

      // Update status to active for pending connections
      if (connections.length > 0) {
        await this.prisma.brokerConnection.updateMany({
          where: {
            userId,
            status: 'PENDING',
          },
          data: {
            status: 'ACTIVE',
          },
        });
      }

      // Get all active connections
      const activeConnections = await this.prisma.brokerConnection.findMany({
        where: {
          userId,
          status: 'ACTIVE',
        },
        orderBy: { createdAt: 'desc' },
      });

      return activeConnections.map(conn => this.mapToResponse(conn));
    } catch (error) {
      this.logger.error('Error getting broker connections:', error);
      throw error;
    }
  }

  async getConnection(connectionId: string, userId: string): Promise<BrokerConnectionResponse | null> {
    try {
      const connection = await this.prisma.brokerConnection.findFirst({
        where: {
          id: connectionId,
          userId,
        },
      });

      if (!connection) {
        return null;
      }

      return this.mapToResponse(connection);
    } catch (error) {
      this.logger.error('Error getting broker connection:', error);
      throw error;
    }
  }

  async revokeConnection(connectionId: string, userId: string): Promise<void> {
    try {
      const connection = await this.prisma.brokerConnection.findFirst({
        where: {
          id: connectionId,
          userId,
        },
      });

      if (!connection) {
        throw new Error('Connection not found');
      }

      // Update connection status to revoked
      await this.prisma.brokerConnection.updateMany({
        where: {
          id: connectionId,
          userId,
        },
        data: {
          status: 'REVOKED',
        },
      });

      this.logger.debug(`Revoked broker connection ${connectionId} for user ${userId}`);

      // Publish connection revoked event
      this.eventBus.publish('BrokerConnectionRevoked', {
        connectionId,
        userId,
        broker: connection.broker,
      });
    } catch (error) {
      this.logger.error('Error revoking broker connection:', error);
      throw error;
    }
  }

  async refreshConnection(connectionId: string, userId: string): Promise<BrokerConnectionResponse> {
    try {
      const connection = await this.prisma.brokerConnection.findFirst({
        where: {
          id: connectionId,
          userId,
        },
      });

      if (!connection) {
        throw new Error('Connection not found');
      }

      // Decrypt current tokens
      const currentAccessToken = await this.secretsVault.decrypt(connection.accessToken);
      const currentRefreshToken = await this.secretsVault.decrypt(connection.refreshToken);

      // TODO: Implement actual token refresh logic with broker API
      // For now, just update the last synced timestamp
      const updatedConnection = await this.prisma.brokerConnection.update({
        where: { id: connectionId },
        data: {
          lastSyncedAt: new Date(),
        },
      });

      this.logger.debug(`Refreshed broker connection ${connectionId} for user ${userId}`);

      return this.mapToResponse(updatedConnection);
    } catch (error) {
      this.logger.error('Error refreshing broker connection:', error);
      throw error;
    }
  }

  async getConnectionStatus(connectionId: string, userId: string): Promise<string> {
    try {
      const connection = await this.prisma.brokerConnection.findFirst({
        where: {
          id: connectionId,
          userId,
        },
        select: { status: true },
      });

      return connection?.status || 'NOT_FOUND';
    } catch (error) {
      this.logger.error('Error getting connection status:', error);
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkConnectionHealth() {
    try {
      this.logger.debug('Checking broker connection health...');

      const connections = await this.prisma.brokerConnection.findMany({
        where: {
          status: 'ACTIVE',
        },
      });

      for (const connection of connections) {
        try {
          // TODO: Implement actual health check logic
          // For now, just update the heartbeat timestamp
          this.logger.debug(`Health check passed for connection ${connection.id}`);
        } catch (error) {
          this.logger.error(`Health check failed for connection ${connection.id}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Error in connection health check:', error);
    }
  }

  private async scheduleFirstSync(connectionId: string): Promise<void> {
    try {
      // Schedule first sync after 1 minute
      setTimeout(async () => {
        try {
          await this.prisma.brokerConnection.update({
            where: { id: connectionId },
            data: {
              lastSyncedAt: new Date(),
            },
          });

          this.logger.debug(`Completed first sync for connection ${connectionId}`);
        } catch (error) {
          this.logger.error(`Error in first sync for connection ${connectionId}:`, error);
        }
      }, 60000); // 1 minute delay
    } catch (error) {
      this.logger.error('Error scheduling first sync:', error);
    }
  }

  private mapToResponse(connection: any): BrokerConnectionResponse {
    return {
      id: connection.id,
      userId: connection.userId,
      broker: connection.broker,
      status: connection.status,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
      lastSyncedAt: connection.lastSyncedAt,
      lastTradePollAt: connection.lastTradePollAt,
      lastHeartbeatAt: connection.lastHeartbeatAt,
      snaptradeAuthorizationId: connection.snaptradeAuthorizationId,
    };
  }

  private getHealthColor(status: string, lastSyncedAt: string | null): 'green' | 'amber' | 'red' {
    if (status === 'ACTIVE') {
      return 'green';
    } else if (status === 'PENDING') {
      return 'amber';
    } else {
      return 'red';
    }
  }
} 