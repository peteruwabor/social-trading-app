import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { PrismaService } from '../../lib/prisma.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-super-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [SocialController],
  providers: [SocialService, PrismaService],
  exports: [SocialService],
})
export class SocialModule {} 