import { Module } from '@nestjs/common';
import { AdminActionService } from './admin-action.service';
import { AdminActionController } from './admin-action.controller';
import { PrismaService } from '../../lib/prisma.service';
import { AuditLogModule } from '../../lib/audit-log.module';

@Module({
  imports: [AuditLogModule],
  providers: [AdminActionService, PrismaService],
  controllers: [AdminActionController],
})
export class AdminActionModule {} 