import { Module } from '@nestjs/common';
import { AdvancedCopyTradingService } from './advanced-copy-trading.service';
import { AdvancedCopyTradingController } from './advanced-copy-trading.controller';
import { PrismaService } from '../../lib/prisma.service';
import { EventBus } from '../../lib/event-bus';

@Module({
  controllers: [AdvancedCopyTradingController],
  providers: [AdvancedCopyTradingService, PrismaService, EventBus],
  exports: [AdvancedCopyTradingService],
})
export class AdvancedCopyTradingModule {} 