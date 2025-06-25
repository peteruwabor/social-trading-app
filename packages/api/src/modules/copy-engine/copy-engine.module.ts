import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CopyEngineService } from './copy-engine.service';
import { AdvancedCopyTradingService } from './advanced-copy-trading.service';
import { PrismaModule } from '../../lib/prisma.service';
import { LibModule } from '../../lib/event-bus';
import { SnapTradeClient } from '../../3rdparty/snaptrade/snaptrade.client';

@Module({
  imports: [PrismaModule, LibModule, EventEmitterModule.forRoot()],
  providers: [CopyEngineService, AdvancedCopyTradingService, SnapTradeClient],
  exports: [CopyEngineService, AdvancedCopyTradingService],
})
export class CopyEngineModule {} 