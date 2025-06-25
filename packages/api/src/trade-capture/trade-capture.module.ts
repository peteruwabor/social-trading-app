import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TradeCaptureService } from './trade-capture.service';
import { TradeCaptureController } from './trade-capture.controller';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../lib/prisma.service';
import { EventBus } from '../lib/event-bus';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [TradeCaptureController],
  providers: [TradeCaptureService, Reflector, PrismaService, EventBus],
  exports: [TradeCaptureService, Reflector],
})
export class TradeCaptureModule {} 