import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../../lib/prisma.service';
import { EmailService } from '../../lib/email.service';
import { AuthGuard } from '../../lib/auth.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'your-super-secret-key',
        signOptions: { 
          expiresIn: '24h',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, EmailService, AuthGuard],
  exports: [AuthService, JwtModule, AuthGuard],
})
export class AuthModule {} 