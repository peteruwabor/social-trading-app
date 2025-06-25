import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PortfolioSyncService } from './portfolio-sync.service';
import { EventBus } from '../lib/event-bus';
import { PrismaService } from '../lib/prisma.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [PortfolioSyncService, EventBus, PrismaService],
  exports: [PortfolioSyncService, EventBus],
})
export class PortfolioSyncModule {} 