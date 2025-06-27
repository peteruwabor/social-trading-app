import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { PrismaService } from '../../lib/prisma.service';
import { EventBus } from '../../lib/event-bus';

@Module({
  imports: [AuthModule],
  controllers: [WebhookController],
  providers: [WebhookService, PrismaService, EventBus],
  exports: [WebhookService],
})
export class WebhookModule {} 