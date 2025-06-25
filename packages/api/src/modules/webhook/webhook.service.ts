import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';
import { EventBus } from '../../lib/event-bus';
import { randomBytes } from 'crypto';
import axios from 'axios';

export interface WebhookCreateDto {
  url: string;
  eventTypes: string[];
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  errorMessage?: string;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
  ) {
    // Subscribe to events and deliver to webhooks
    this.setupEventSubscriptions();
  }

  /**
   * Register a new webhook for a user
   */
  async registerWebhook(userId: string, dto: WebhookCreateDto) {
    const secret = this.generateWebhookSecret();
    
    const webhook = await this.prisma.webhook.create({
      data: {
        userId,
        name: `Webhook ${new Date().toISOString()}`,
        url: dto.url,
        events: dto.eventTypes,
        secret,
      },
    });

    return {
      ...webhook,
      secret, // Return secret only on creation
    };
  }

  /**
   * List all webhooks for a user
   */
  async listWebhooks(userId: string) {
    const webhooks = await this.prisma.webhook.findMany({
      where: { userId },
      include: {
        deliveries: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return webhooks.map(webhook => ({
      ...webhook,
      secret: undefined, // Don't return secret in list
      deliveryCount: webhook.deliveries.length,
    }));
  }

  /**
   * Update webhook configuration
   */
  async updateWebhook(userId: string, webhookId: string, updates: Partial<WebhookCreateDto>) {
    const webhook = await this.prisma.webhook.findFirst({
      where: {
        id: webhookId,
        userId,
      },
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    // If eventTypes is present, cast to array
    const data: any = { ...updates };
    if (updates.eventTypes) {
      data.events = updates.eventTypes;
    }

    return this.prisma.webhook.update({
      where: { id: webhookId },
      data,
    });
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(userId: string, webhookId: string): Promise<void> {
    const webhook = await this.prisma.webhook.findFirst({
      where: {
        id: webhookId,
        userId,
      },
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    await this.prisma.webhook.delete({
      where: { id: webhookId },
    });
  }

  /**
   * Get webhook delivery logs
   */
  async getWebhookLogs(userId: string, webhookId?: string, limit: number = 50) {
    const where: any = {
      webhook: {
        userId,
      },
    };

    if (webhookId) {
      where.webhookId = webhookId;
    }

    const logs = await this.prisma.webhookDelivery.findMany({
      where,
      include: {
        webhook: {
          select: {
            url: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs;
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(userId: string) {
    const webhooks = await this.prisma.webhook.findMany({
      where: { userId },
      include: {
        deliveries: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    const totalWebhooks = webhooks.length;
    const activeWebhooks = webhooks.filter(w => w.isActive).length;
    const totalDeliveries = webhooks.reduce((sum, w) => sum + w.deliveries.length, 0);

    // Get recent delivery stats
    const recentDeliveries = await this.prisma.webhookDelivery.findMany({
      where: {
        webhook: {
          userId,
        },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    const successfulDeliveries = recentDeliveries.filter((d: any) => d.status === 'SUCCESS').length;
    const failedDeliveries = recentDeliveries.filter((d: any) => d.status === 'FAILED').length;

    return {
      totalWebhooks,
      activeWebhooks,
      totalDeliveries,
      recentDeliveries: recentDeliveries.length,
      successRate: recentDeliveries.length > 0 
        ? (successfulDeliveries / recentDeliveries.length) * 100 
        : 0,
      webhooks: webhooks.map(w => ({
        id: w.id,
        url: w.url,
        isActive: w.isActive,
        deliveryCount: w.deliveries.length,
        createdAt: w.createdAt,
      })),
    };
  }

  /**
   * Find webhooks that should receive a specific event
   */
  async findWebhooksForEvent(eventType: string, userId?: string) {
    const where: any = {
      events: {
        has: eventType,
      },
      isActive: true,
    };

    if (userId) {
      where.userId = userId;
    }

    return this.prisma.webhook.findMany({ where });
  }

  /**
   * Deliver an event to all relevant webhooks
   */
  async deliverEvent(eventType: string, payload: any, apiKeyId?: string) {
    const webhooks = await this.findWebhooksForEvent(eventType);
    const results: WebhookDeliveryResult[] = [];

    for (const webhook of webhooks) {
      try {
        const result = await this.deliverToWebhook(webhook, eventType, payload, apiKeyId);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to deliver event to webhook ${webhook.id}:`, error);
        results.push({
          success: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Deliver event to a specific webhook
   */
  private async deliverToWebhook(
    webhook: any,
    eventType: any,
    payload: any,
    apiKeyId?: string,
  ): Promise<WebhookDeliveryResult> {
    // Create delivery record
    const delivery = await this.prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        apiKeyId,
        eventType,
        payload,
        status: 'PENDING',
      },
    });

    try {
      // Prepare webhook payload
      const webhookPayload = {
        event: eventType,
        timestamp: new Date().toISOString(),
        data: payload,
      };

      // Generate signature
      const signature = this.generateSignature(webhookPayload, webhook.secret);

      // Send webhook
      const response = await axios.post(webhook.url, webhookPayload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': eventType,
          'User-Agent': 'Gioat-Webhook/1.0',
        },
        timeout: 10000, // 10 second timeout
      });

      // Update delivery record
      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'SUCCESS',
          responseCode: response.status,
          responseBody: JSON.stringify(response.data),
          deliveredAt: new Date(),
        },
      });

      // Update webhook last triggered
      await this.prisma.webhook.update({
        where: { id: webhook.id },
        data: { lastTriggered: new Date() },
      });

      return {
        success: true,
        statusCode: response.status,
        responseBody: JSON.stringify(response.data),
      };
    } catch (error: any) {
      this.logger.error(`Webhook delivery failed for ${webhook.url}:`, error);
      
      // Update delivery record
      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'FAILED',
          responseCode: error.response?.status,
          responseBody: error.response?.data ? JSON.stringify(error.response.data) : error.message,
        },
      });

      return {
        success: false,
        statusCode: error.response?.status,
        responseBody: error.response?.data ? JSON.stringify(error.response.data) : error.message,
        errorMessage: error.message,
      };
    }
  }

  /**
   * Setup event subscriptions
   */
  private setupEventSubscriptions() {
    // Subscribe to various events and deliver to webhooks
    this.eventBus.subscribe('trade.executed', async (payload: any) => {
      await this.deliverEvent('TRADE_EXECUTED', payload);
    });

    this.eventBus.subscribe('portfolio.updated', async (payload: any) => {
      await this.deliverEvent('PORTFOLIO_UPDATED', payload);
    });

    this.eventBus.subscribe('copy.order.placed', async (payload: any) => {
      await this.deliverEvent('COPY_ORDER_PLACED', payload);
    });

    this.eventBus.subscribe('follower.added', async (payload: any) => {
      await this.deliverEvent('FOLLOWER_ADDED', payload);
    });

    this.eventBus.subscribe('follower.removed', async (payload: any) => {
      await this.deliverEvent('FOLLOWER_REMOVED', payload);
    });

    this.eventBus.subscribe('alert.triggered', async (payload: any) => {
      await this.deliverEvent('ALERT_TRIGGERED', payload);
    });

    this.eventBus.subscribe('session.started', async (payload: any) => {
      await this.deliverEvent('SESSION_STARTED', payload);
    });

    this.eventBus.subscribe('session.ended', async (payload: any) => {
      await this.deliverEvent('SESSION_ENDED', payload);
    });

    this.eventBus.subscribe('tip.received', async (payload: any) => {
      await this.deliverEvent('TIP_RECEIVED', payload);
    });
  }

  /**
   * Generate a webhook secret
   */
  private generateWebhookSecret(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: any, secret: string): string {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }
} 