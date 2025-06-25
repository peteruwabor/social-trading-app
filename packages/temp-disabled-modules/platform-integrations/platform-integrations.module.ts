import { Module } from '@nestjs/common';
import { PlatformIntegrationsController } from './platform-integrations.controller';
import { PlatformIntegrationsService } from './platform-integrations.service';
import { PrismaService } from '../../lib/prisma.service';
import { EventBus } from '../../lib/event-bus';

@Module({
  controllers: [PlatformIntegrationsController],
  providers: [PlatformIntegrationsService, PrismaService, EventBus],
  exports: [PlatformIntegrationsService],
})
export class PlatformIntegrationsModule {} 