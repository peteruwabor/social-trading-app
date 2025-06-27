import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { PrismaService } from '../../lib/prisma.service';

@Module({
  imports: [AuthModule],
  controllers: [OnboardingController],
  providers: [OnboardingService, PrismaService],
  exports: [OnboardingService],
})
export class OnboardingModule {} 