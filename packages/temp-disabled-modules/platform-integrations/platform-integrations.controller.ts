import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '../../lib/auth.guard';
import { PlatformIntegrationsService } from './platform-integrations.service';

export class CreateApiKeyDto {
  name!: string;
  permissions!: string[];
  expiresAt?: Date;
}

export class UpdateApiKeyDto {
  name?: string;
  permissions?: string[];
  isActive?: boolean;
  expiresAt?: Date;
}

export class CreateWebhookDto {
  name!: string;
  url!: string;
  events!: string[];
}

export class UpdateWebhookDto {
  name?: string;
  url?: string;
  events?: string[];
  isActive?: boolean;
}

export class CreateIntegrationDto {
  provider!: string;
  type!: 'ANALYTICS' | 'NOTIFICATION' | 'TRADING' | 'SOCIAL' | 'PAYMENT';
  config!: Record<string, any>;
}

export class UpdateIntegrationDto {
  config?: Record<string, any>;
  isActive?: boolean;
}

export class ApiUsageQueryDto {
  period!: 'day' | 'week' | 'month';
}

@Controller('platform-integrations')
@UseGuards(AuthGuard)
export class PlatformIntegrationsController {
  constructor(
    private readonly platformIntegrationsService: PlatformIntegrationsService,
  ) {}

  // API Key Management
  @Post('api-keys')
  async createApiKey(
    @Req() req: any,
    @Body() createApiKeyDto: CreateApiKeyDto,
  ) {
    const apiKey = await this.platformIntegrationsService.createApiKey(
      req.user.id,
      createApiKeyDto,
    );

    return {
      success: true,
      data: apiKey,
      message: 'API key created successfully. Please save the key securely as it will not be shown again.',
    };
  }

  @Get('api-keys')
  async getApiKeys(@Req() req: any) {
    const apiKeys = await this.platformIntegrationsService.getApiKeys(req.user.id);

    return {
      success: true,
      data: apiKeys,
    };
  }

  @Put('api-keys/:id')
  async updateApiKey(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateApiKeyDto: UpdateApiKeyDto,
  ) {
    const apiKey = await this.platformIntegrationsService.updateApiKey(
      req.user.id,
      id,
      updateApiKeyDto,
    );

    return {
      success: true,
      data: apiKey,
      message: 'API key updated successfully',
    };
  }

  @Delete('api-keys/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteApiKey(@Req() req: any, @Param('id') id: string) {
    await this.platformIntegrationsService.deleteApiKey(req.user.id, id);

    return {
      success: true,
      message: 'API key deleted successfully',
    };
  }

  // Webhook Management
  @Post('webhooks')
  async createWebhook(
    @Req() req: any,
    @Body() createWebhookDto: CreateWebhookDto,
  ) {
    const webhook = await this.platformIntegrationsService.createWebhook(
      req.user.id,
      createWebhookDto,
    );

    return {
      success: true,
      data: webhook,
      message: 'Webhook created successfully. Please save the secret securely as it will not be shown again.',
    };
  }

  @Get('webhooks')
  async getWebhooks(@Req() req: any) {
    const webhooks = await this.platformIntegrationsService.getWebhooks(req.user.id);

    return {
      success: true,
      data: webhooks,
    };
  }

  @Put('webhooks/:id')
  async updateWebhook(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateWebhookDto: UpdateWebhookDto,
  ) {
    const webhook = await this.platformIntegrationsService.updateWebhook(
      req.user.id,
      id,
      updateWebhookDto,
    );

    return {
      success: true,
      data: webhook,
      message: 'Webhook updated successfully',
    };
  }

  @Delete('webhooks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWebhook(@Req() req: any, @Param('id') id: string) {
    await this.platformIntegrationsService.deleteWebhook(req.user.id, id);

    return {
      success: true,
      message: 'Webhook deleted successfully',
    };
  }

  @Post('webhooks/:id/test')
  async testWebhook(
    @Req() req: any,
    @Param('id') id: string,
    @Body() payload: any,
  ) {
    const success = await this.platformIntegrationsService.triggerWebhook(
      id,
      'test',
      payload,
    );

    return {
      success,
      message: success ? 'Webhook test successful' : 'Webhook test failed',
    };
  }

  // Third-Party Integrations
  @Post('integrations')
  async createIntegration(
    @Req() req: any,
    @Body() createIntegrationDto: CreateIntegrationDto,
  ) {
    const integration = await this.platformIntegrationsService.createIntegration(
      req.user.id,
      createIntegrationDto,
    );

    return {
      success: true,
      data: integration,
      message: 'Integration created successfully',
    };
  }

  @Get('integrations')
  async getIntegrations(@Req() req: any) {
    const integrations = await this.platformIntegrationsService.getIntegrations(req.user.id);

    return {
      success: true,
      data: integrations,
    };
  }

  @Put('integrations/:id')
  async updateIntegration(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateIntegrationDto: UpdateIntegrationDto,
  ) {
    const integration = await this.platformIntegrationsService.updateIntegration(
      req.user.id,
      id,
      updateIntegrationDto,
    );

    return {
      success: true,
      data: integration,
      message: 'Integration updated successfully',
    };
  }

  @Delete('integrations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteIntegration(@Req() req: any, @Param('id') id: string) {
    await this.platformIntegrationsService.deleteIntegration(req.user.id, id);

    return {
      success: true,
      message: 'Integration deleted successfully',
    };
  }

  @Post('integrations/:id/sync')
  async syncIntegration(@Req() req: any, @Param('id') id: string) {
    const success = await this.platformIntegrationsService.syncIntegration(id);

    return {
      success,
      message: success ? 'Integration synced successfully' : 'Integration sync failed',
    };
  }

  // API Usage Analytics
  @Get('api-usage')
  async getApiUsage(
    @Req() req: any,
    @Query() query: ApiUsageQueryDto,
  ) {
    const stats = await this.platformIntegrationsService.getApiUsageStats(
      req.user.id,
      query.period,
    );

    return {
      success: true,
      data: stats,
    };
  }

  // Developer Tools
  @Get('documentation')
  async getApiDocumentation() {
    const documentation = await this.platformIntegrationsService.generateApiDocumentation();

    return {
      success: true,
      data: documentation,
    };
  }

  @Get('rate-limits')
  async getRateLimits(@Req() req: any) {
    // This would return current rate limit status for the user
    return {
      success: true,
      data: {
        limits: {
          'api-requests': { limit: 1000, window: '1h' },
          'webhook-deliveries': { limit: 100, window: '1h' },
          'integration-syncs': { limit: 50, window: '1h' },
        },
        current: {
          'api-requests': { used: 150, remaining: 850, resetTime: new Date(Date.now() + 3600000) },
          'webhook-deliveries': { used: 5, remaining: 95, resetTime: new Date(Date.now() + 3600000) },
          'integration-syncs': { used: 2, remaining: 48, resetTime: new Date(Date.now() + 3600000) },
        },
      },
    };
  }

  // Integration Providers
  @Get('providers')
  async getAvailableProviders() {
    return {
      success: true,
      data: {
        notification: [
          { id: 'slack', name: 'Slack', description: 'Send notifications to Slack channels' },
          { id: 'discord', name: 'Discord', description: 'Send notifications to Discord servers' },
          { id: 'telegram', name: 'Telegram', description: 'Send notifications via Telegram bot' },
          { id: 'email', name: 'Email', description: 'Send notifications via email' },
        ],
        analytics: [
          { id: 'google_analytics', name: 'Google Analytics', description: 'Track user behavior and events' },
          { id: 'mixpanel', name: 'Mixpanel', description: 'Advanced analytics and user tracking' },
          { id: 'amplitude', name: 'Amplitude', description: 'Product analytics and user insights' },
        ],
        trading: [
          { id: 'alpaca', name: 'Alpaca', description: 'Commission-free trading API' },
          { id: 'interactive_brokers', name: 'Interactive Brokers', description: 'Professional trading platform' },
          { id: 'td_ameritrade', name: 'TD Ameritrade', description: 'Retail trading platform' },
        ],
        social: [
          { id: 'twitter', name: 'Twitter', description: 'Share trading insights on Twitter' },
          { id: 'linkedin', name: 'LinkedIn', description: 'Share professional updates on LinkedIn' },
        ],
        payment: [
          { id: 'stripe', name: 'Stripe', description: 'Process payments and subscriptions' },
          { id: 'paypal', name: 'PayPal', description: 'Accept payments via PayPal' },
        ],
      },
    };
  }

  // Webhook Events
  @Get('webhook-events')
  async getWebhookEvents() {
    return {
      success: true,
      data: [
        {
          name: 'trade.executed',
          description: 'Triggered when a trade is executed',
          payload: {
            tradeId: 'string',
            symbol: 'string',
            side: 'BUY|SELL',
            quantity: 'number',
            price: 'number',
            timestamp: 'string',
          },
        },
        {
          name: 'portfolio.updated',
          description: 'Triggered when portfolio holdings change',
          payload: {
            userId: 'string',
            accountId: 'string',
            totalValue: 'number',
            change: 'number',
            timestamp: 'string',
          },
        },
        {
          name: 'live_session.started',
          description: 'Triggered when a live trading session starts',
          payload: {
            sessionId: 'string',
            userId: 'string',
            title: 'string',
            startedAt: 'string',
          },
        },
        {
          name: 'tip.received',
          description: 'Triggered when a user receives a tip',
          payload: {
            tipId: 'string',
            fromUserId: 'string',
            toUserId: 'string',
            amount: 'number',
            message: 'string',
            timestamp: 'string',
          },
        },
        {
          name: 'follower.added',
          description: 'Triggered when a user gains a new follower',
          payload: {
            followerId: 'string',
            followedUserId: 'string',
            timestamp: 'string',
          },
        },
      ],
    };
  }
} 