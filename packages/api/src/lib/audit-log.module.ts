import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuditLogService } from './audit-log.service';
import { PrismaService } from './prisma.service';
import { AuthModule } from '../modules/auth/auth.module';

@Module({
  imports: [
    AuthModule,
  ],
  providers: [AuditLogService, PrismaService],
  exports: [AuditLogService, PrismaService],
})
export class AuditLogModule {} 