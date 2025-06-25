import { Module } from '@nestjs/common';
import { BrokerConnectionController } from './broker-connection.controller';
import { BrokerConnectionService } from './broker-connection.service';
import { EventBus } from '../lib/event-bus';
import { PrismaService } from '../lib/prisma.service';
import { PortfolioSyncModule } from '../portfolio-sync/portfolio-sync.module';

@Module({
  imports: [PortfolioSyncModule],
  controllers: [BrokerConnectionController],
  providers: [BrokerConnectionService, EventBus, PrismaService],
  exports: [BrokerConnectionService],
})
export class BrokerConnectionModule {} 