import { Module } from '@nestjs/common';
import { TipService } from './tip.service';
import { TipController } from './tip.controller';
import { PrismaService } from '../../lib/prisma.service';
import { AuditLogModule } from '../../lib/audit-log.module';

@Module({
  imports: [AuditLogModule],
  providers: [TipService, PrismaService],
  controllers: [TipController],
})
export class TipModule {} 