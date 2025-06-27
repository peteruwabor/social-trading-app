import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { PrismaService } from '../../lib/prisma.service';

@Module({
  imports: [AuthModule],
  controllers: [SocialController],
  providers: [SocialService, PrismaService],
  exports: [SocialService],
})
export class SocialModule {} 