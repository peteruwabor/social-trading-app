import { Module } from '@nestjs/common';
import { CopyTradingController } from './copy-trading.controller';
import { CopyTradingService } from './copy-trading.service';
import { PrismaService } from '../../lib/prisma.service';
import { EventBus } from '../../lib/event-bus';

@Module({
  controllers: [CopyTradingController],
  providers: [CopyTradingService, PrismaService, EventBus],
  exports: [CopyTradingService],
})
export class CopyTradingModule {} 