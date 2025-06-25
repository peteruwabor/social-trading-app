import { Controller, Get, Post, Put, Delete, Body, Request, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { WebhookService, WebhookCreateDto } from './webhook.service';
import { AuthGuard } from '../../lib/auth.guard';

@Controller('webhooks')
@ApiTags('Webhooks')
@UseGuards(AuthGuard)
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  @ApiOperation({
    summary: 'Register webhook',
    description: 'Registers a new webhook for the authenticated user',
  })
  @ApiResponse({
    status: 201,
    description: 'Webhook registered successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  async registerWebhook(
    @Request() req: any,
    @Body() dto: WebhookCreateDto,
  ) {
    if (!dto.url || !dto.eventTypes || !Array.isArray(dto.eventTypes) || dto.eventTypes.length === 0) {
      throw new BadRequestException('URL and at least one event type are required');
    }

    // Validate URL format
    try {
      new URL(dto.url);
    } catch {
      throw new BadRequestException('Invalid URL format');
    }

    return this.webhookService.registerWebhook(req.user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List webhooks',
    description: 'Lists all webhooks for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhooks retrieved successfully',
  })
  async listWebhooks(@Request() req: any) {
    return this.webhookService.listWebhooks(req.user.id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update webhook',
    description: 'Updates webhook configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Webhook not found or invalid data',
  })
  async updateWebhook(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updates: Partial<WebhookCreateDto>,
  ) {
    try {
      return await this.webhookService.updateWebhook(req.user.id, id, updates);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete webhook',
    description: 'Deletes a webhook',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Webhook not found',
  })
  async deleteWebhook(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    try {
      await this.webhookService.deleteWebhook(req.user.id, id);
      return { message: 'Webhook deleted successfully' };
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  @Get('logs')
  @ApiOperation({
    summary: 'Get webhook logs',
    description: 'Retrieves webhook delivery logs',
  })
  @ApiQuery({ name: 'webhookId', required: false, description: 'Filter by webhook ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of logs to return', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Webhook logs retrieved successfully',
  })
  async getWebhookLogs(
    @Request() req: any,
    @Query('webhookId') webhookId?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit) : 50;
    return this.webhookService.getWebhookLogs(req.user.id, webhookId, limitNum);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get webhook statistics',
    description: 'Retrieves webhook delivery statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook statistics retrieved successfully',
  })
  async getWebhookStats(@Request() req: any) {
    return this.webhookService.getWebhookStats(req.user.id);
  }

  @Get('events')
  @ApiOperation({
    summary: 'Get available event types',
    description: 'Lists all available webhook event types',
  })
  @ApiResponse({
    status: 200,
    description: 'Event types retrieved successfully',
  })
  async getEventTypes() {
    return {
      eventTypes: [
        'TRADE_FILLED',
        'COPY_ORDER_FILLED',
        'COPY_ORDER_CANCELLED',
        'TIP_RECEIVED',
        'FOLLOWER_JOINED',
        'LIVE_SESSION_STARTED',
        'LIVE_SESSION_COMMENT',
      ],
    };
  }
} 