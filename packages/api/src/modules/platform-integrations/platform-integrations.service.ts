import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';
import { EventBus } from '../../lib/event-bus';
import { Prisma } from '@prisma/client';
import axios from 'axios';

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  permissions: string[];
  isActive: boolean;
  lastUsed?: Date | null;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Webhook {
  id: string;
  userId: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret: string;
  retryCount: number;
  lastTriggered?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ThirdPartyIntegration {
  id: string;
  userId: string;
  provider: string;
  type: string;
  config: Prisma.JsonValue;
  isActive: boolean;
  lastSync?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiUsage {
  userId: string;
  endpoint: string;
  method: string;
  timestamp: Date;
  responseTime: number;
  statusCode: number;
  userAgent?: string;
  ipAddress?: string;
}

export interface RateLimit {
  userId: string;
  endpoint: string;
  requests: number;
  windowStart: Date;
  windowEnd: Date;
}

@Injectable()
export class PlatformIntegrationsService {
  private readonly logger = new Logger(PlatformIntegrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
  ) {}

  // API Key Management
  async createApiKey(userId: string, data: {
    name: string;
    permissions: string[];
    expiresAt?: Date;
  }): Promise<ApiKey> {
    const key = this.generateApiKey();
    
    const apiKey = await this.prisma.apiKey.create({
      data: {
        userId,
        name: data.name,
        key: this.hashApiKey(key),
        permissions: data.permissions,
        expiresAt: data.expiresAt,
        isActive: true,
      },
    });

    // Return the unhashed key for the user to save
    return {
      ...apiKey,
      key: key, // Return the original key, not the hash
    };
  }

  async getApiKeys(userId: string): Promise<ApiKey[]> {
    const apiKeys = await this.prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return apiKeys.map(key => ({
      ...key,
      key: '***' + key.key.slice(-4), // Mask the key
    }));
  }

  async updateApiKey(userId: string, keyId: string, data: {
    name?: string;
    permissions?: string[];
    isActive?: boolean;
    expiresAt?: Date;
  }): Promise<ApiKey> {
    const apiKey = await this.prisma.apiKey.update({
      where: { id: keyId, userId },
      data,
    });

    return {
      ...apiKey,
      key: '***' + apiKey.key.slice(-4),
    };
  }

  async deleteApiKey(userId: string, keyId: string): Promise<void> {
    await this.prisma.apiKey.delete({
      where: { id: keyId, userId },
    });
  }

  async validateApiKey(key: string): Promise<{ userId: string; permissions: string[] } | null> {
    const hashedKey = this.hashApiKey(key);
    
    const apiKey = await this.prisma.apiKey.findFirst({
      where: {
        key: hashedKey,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (!apiKey) {
      return null;
    }

    // Update last used
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsed: new Date() },
    });

    return {
      userId: apiKey.userId,
      permissions: apiKey.permissions,
    };
  }

  // Webhook Management
  async createWebhook(userId: string, data: {
    name: string;
    url: string;
    events: string[];
  }): Promise<Webhook> {
    const secret = this.generateWebhookSecret();
    
    const webhook = await this.prisma.webhook.create({
      data: {
        userId,
        name: data.name,
        url: data.url,
        events: data.events,
        secret,
        isActive: true,
        retryCount: 0,
      },
    });

    return {
      ...webhook,
      secret: secret, // Return the original secret
    };
  }

  async getWebhooks(userId: string): Promise<Webhook[]> {
    const webhooks = await this.prisma.webhook.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return webhooks.map(webhook => ({
      ...webhook,
      secret: '***' + webhook.secret.slice(-4), // Mask the secret
    }));
  }

  async updateWebhook(userId: string, webhookId: string, data: {
    name?: string;
    url?: string;
    events?: string[];
    isActive?: boolean;
  }): Promise<Webhook> {
    const webhook = await this.prisma.webhook.update({
      where: { id: webhookId, userId },
      data,
    });

    return {
      ...webhook,
      secret: '***' + webhook.secret.slice(-4),
    };
  }

  async deleteWebhook(userId: string, webhookId: string): Promise<void> {
    await this.prisma.webhook.delete({
      where: { id: webhookId, userId },
    });
  }

  async triggerWebhook(webhookId: string, event: string, payload: any): Promise<boolean> {
    try {
      const webhook = await this.prisma.webhook.findUnique({
        where: { id: webhookId },
      });

      if (!webhook || !webhook.isActive) {
        return false;
      }

      // Generate signature
      const signature = this.generateWebhookSignature(payload, webhook.secret);

      // Send webhook
      await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
        },
        timeout: 5000,
      });

      // Update last triggered
      await this.prisma.webhook.update({
        where: { id: webhookId },
        data: { lastTriggered: new Date() },
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Webhook delivery failed: ${errorMessage}`);
      await this.handleWebhookFailure(webhookId);
      return false;
    }
  }

  // Third-party Integration Management
  async createIntegration(userId: string, data: {
    provider: string;
    type: string;
    config: Prisma.InputJsonValue;
  }): Promise<ThirdPartyIntegration> {
    return this.prisma.thirdPartyIntegration.create({
      data: {
        userId,
        provider: data.provider,
        type: data.type,
        config: data.config,
        isActive: true,
      },
    });
  }

  async getIntegrations(userId: string): Promise<ThirdPartyIntegration[]> {
    return this.prisma.thirdPartyIntegration.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateIntegration(userId: string, integrationId: string, data: {
    config?: Prisma.InputJsonValue;
    isActive?: boolean;
  }): Promise<ThirdPartyIntegration> {
    return this.prisma.thirdPartyIntegration.update({
      where: { id: integrationId, userId },
      data,
    });
  }

  async deleteIntegration(userId: string, integrationId: string): Promise<void> {
    await this.prisma.thirdPartyIntegration.delete({
      where: { id: integrationId, userId },
    });
  }

  async syncIntegration(integrationId: string): Promise<boolean> {
    try {
      const integration = await this.prisma.thirdPartyIntegration.findUnique({
        where: { id: integrationId },
      });

      if (!integration || !integration.isActive) {
        return false;
      }

      // Sync based on provider
      switch (integration.provider.toLowerCase()) {
        case 'slack':
          await this.syncSlackIntegration(integration);
          break;
        case 'discord':
          await this.syncDiscordIntegration(integration);
          break;
        case 'telegram':
          await this.syncTelegramIntegration(integration);
          break;
        case 'google_analytics':
          await this.syncGoogleAnalyticsIntegration(integration);
          break;
        default:
          throw new Error(`Unsupported integration provider: ${integration.provider}`);
      }

      // Update last sync time
      await this.prisma.thirdPartyIntegration.update({
        where: { id: integrationId },
        data: { lastSync: new Date() },
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Integration sync failed: ${errorMessage}`);
      return false;
    }
  }

  // API Usage Tracking
  async trackApiUsage(usage: ApiUsage): Promise<void> {
    await this.prisma.apiUsage.create({
      data: {
        userId: usage.userId,
        endpoint: usage.endpoint,
        method: usage.method,
        timestamp: usage.timestamp,
        responseTime: usage.responseTime,
        statusCode: usage.statusCode,
        userAgent: usage.userAgent,
        ipAddress: usage.ipAddress,
      },
    });
  }

  // API Usage Analytics
  async getApiUsageStats(userId: string, period: 'day' | 'week' | 'month'): Promise<{
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    topEndpoints: Array<{ endpoint: string; count: number }>;
  }> {
    const startDate = this.getStartDate(period);

    const usage = await this.prisma.apiUsage.findMany({
      where: {
        userId,
        timestamp: { gte: startDate },
      },
    });

    const totalRequests = usage.length;
    const errorRequests = usage.filter(u => u.statusCode >= 400).length;
    const totalResponseTime = usage.reduce((sum, u) => sum + u.responseTime, 0);

    // Calculate top endpoints
    const endpointCounts = usage.reduce((acc, u) => {
      acc[u.endpoint] = (acc[u.endpoint] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topEndpoints = Object.entries(endpointCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([endpoint, count]) => ({ endpoint, count }));

    return {
      totalRequests,
      averageResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
      errorRate: totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0,
      topEndpoints,
    };
  }

  // Rate Limiting
  async checkRateLimit(userId: string, endpoint: string, limit: number, windowMs: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
  }> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);
    const windowEnd = new Date(now.getTime() + windowMs);

    // Get or create rate limit record
    let rateLimit = await this.prisma.rateLimit.findFirst({
      where: {
        userId,
        endpoint,
        windowEnd: { gt: now },
      },
    });

    if (!rateLimit) {
      // Create new window
      rateLimit = await this.prisma.rateLimit.create({
        data: {
          userId,
          endpoint,
          requests: 0,
          windowStart: now,
          windowEnd,
        },
      });
    }

    // Check if limit exceeded
    if (rateLimit.requests >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: rateLimit.windowEnd,
      };
    }

    // Increment request count
    await this.prisma.rateLimit.update({
      where: { id: rateLimit.id },
      data: { requests: { increment: 1 } },
    });

    return {
      allowed: true,
      remaining: limit - (rateLimit.requests + 1),
      resetTime: rateLimit.windowEnd,
    };
  }

  // API Documentation Generation
  async generateApiDocumentation(): Promise<{
    endpoints: Array<{
      path: string;
      method: string;
      description: string;
      parameters: any[];
      responses: any[];
    }>;
    schemas: Record<string, any>;
  }> {
    // This would be implemented to generate OpenAPI/Swagger documentation
    // For now, return a placeholder
    return {
      endpoints: [],
      schemas: {},
    };
  }

  // Private helper methods
  private generateApiKey(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }

  private hashApiKey(key: string): string {
    return require('crypto').createHash('sha256').update(key).digest('hex');
  }

  private generateWebhookSecret(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }

  private generateWebhookSignature(payload: any, secret: string): string {
    const hmac = require('crypto').createHmac('sha256', secret);
    return hmac.update(JSON.stringify(payload)).digest('hex');
  }

  private async handleWebhookFailure(webhookId: string): Promise<void> {
    await this.prisma.webhook.update({
      where: { id: webhookId },
      data: { retryCount: { increment: 1 } },
    });
  }

  private getStartDate(period: 'day' | 'week' | 'month'): Date {
    const now = new Date();
    switch (period) {
      case 'day':
        return new Date(now.setDate(now.getDate() - 1));
      case 'week':
        return new Date(now.setDate(now.getDate() - 7));
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1));
    }
  }

  // Integration sync methods (to be implemented)
  private async syncSlackIntegration(integration: ThirdPartyIntegration): Promise<void> {
    const config = integration.config as { webhookUrl: string; channelId: string };
    if (!config.webhookUrl) {
      throw new Error('Slack webhook URL is required');
    }

    try {
      // Test the webhook by sending a ping message
      await axios.post(config.webhookUrl, {
        text: '🔄 Integration sync test successful',
        channel: config.channelId,
      });
    } catch (error) {
      throw new Error(`Failed to sync Slack integration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async syncDiscordIntegration(integration: ThirdPartyIntegration): Promise<void> {
    const config = integration.config as { webhookUrl: string };
    if (!config.webhookUrl) {
      throw new Error('Discord webhook URL is required');
    }

    try {
      // Test the webhook by sending a ping message
      await axios.post(config.webhookUrl, {
        content: '🔄 Integration sync test successful',
      });
    } catch (error) {
      throw new Error(`Failed to sync Discord integration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async syncTelegramIntegration(integration: ThirdPartyIntegration): Promise<void> {
    const config = integration.config as { botToken: string; chatId: string };
    if (!config.botToken || !config.chatId) {
      throw new Error('Telegram bot token and chat ID are required');
    }

    try {
      // Test the bot by sending a ping message
      await axios.post(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
        chat_id: config.chatId,
        text: '🔄 Integration sync test successful',
      });
    } catch (error) {
      throw new Error(`Failed to sync Telegram integration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async syncGoogleAnalyticsIntegration(integration: ThirdPartyIntegration): Promise<void> {
    const config = integration.config as { measurementId: string; apiSecret: string };
    if (!config.measurementId || !config.apiSecret) {
      throw new Error('Google Analytics measurement ID and API secret are required');
    }

    try {
      // Test GA4 Measurement Protocol
      const endpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${config.measurementId}&api_secret=${config.apiSecret}`;
      
      // Send a test event
      await axios.post(endpoint, {
        client_id: 'test_client_id',
        events: [{
          name: 'integration_sync_test',
          params: {
            test_param: 'success'
          }
        }]
      });
    } catch (error) {
      throw new Error(`Failed to sync Google Analytics integration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 