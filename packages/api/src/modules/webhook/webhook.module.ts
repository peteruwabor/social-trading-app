import { Module } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { PrismaService } from '../../lib/prisma.service';
import { EventBus } from '../../lib/event-bus';

@Module({
  controllers: [WebhookController],
  providers: [WebhookService, PrismaService, EventBus],
  exports: [WebhookService],
})
export class WebhookModule {} 