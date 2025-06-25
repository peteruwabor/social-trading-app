import { Module } from '@nestjs/common';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { AuditLogService } from '../../lib/audit-log.service';
import { PrismaService } from '../../lib/prisma.service';

@Module({
  controllers: [ComplianceController],
  providers: [ComplianceService, AuditLogService, PrismaService],
})
export class ComplianceModule {} 