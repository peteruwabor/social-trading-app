import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { EventBus } from '../../lib/event-bus';
import { PrismaService } from '../../lib/prisma.service';

@Module({
  providers: [RealtimeGateway, EventBus, PrismaService],
  exports: [RealtimeGateway],
})
export class RealtimeModule {} 