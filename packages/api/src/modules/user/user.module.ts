import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaService } from '../../lib/prisma.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuditLogService } from '../../lib/audit-log.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-super-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    AuditLogModule,
  ],
  controllers: [UserController],
  providers: [UserService, PrismaService, AuditLogService],
  exports: [UserService],
})
export class UserModule {} 