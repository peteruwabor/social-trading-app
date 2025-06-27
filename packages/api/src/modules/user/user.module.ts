import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaService } from '../../lib/prisma.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuditLogService } from '../../lib/audit-log.service';

@Module({
  imports: [
    AuthModule,
    AuditLogModule,
  ],
  controllers: [UserController],
  providers: [UserService, PrismaService, AuditLogService],
  exports: [UserService],
})
export class UserModule {} 