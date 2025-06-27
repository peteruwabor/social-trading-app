import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TipService } from './tip.service';
import { TipController } from './tip.controller';
import { PrismaService } from '../../lib/prisma.service';
import { AuditLogModule } from '../../lib/audit-log.module';

@Module({
  imports: [AuthModule, AuditLogModule],
  providers: [TipService, PrismaService],
  controllers: [TipController],
})
export class TipModule {} 