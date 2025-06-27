import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from '../../lib/audit-log.service';
import { PrismaService } from '../../lib/prisma.service';

@Module({
  imports: [AuthModule],
  controllers: [AuditLogController],
  providers: [AuditLogService, PrismaService],
  exports: [AuditLogService],
})
export class AuditLogModule {} 