import { Module } from '@nestjs/common';
import { DelayedCopyController } from './delayed-copy.controller';
import { DelayedCopyService } from '../copy-engine/delayed-copy.service';
import { CopyEngineService } from '../copy-engine/copy-engine.service';
import { PrismaService } from '../../lib/prisma.service';
import { EventBus } from '../../lib/event-bus';

@Module({
  controllers: [DelayedCopyController],
  providers: [DelayedCopyService, CopyEngineService, PrismaService, EventBus],
  exports: [DelayedCopyService],
})
export class DelayedCopyModule {} 