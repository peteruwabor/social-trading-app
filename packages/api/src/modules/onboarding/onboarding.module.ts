import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { PrismaService } from '../../lib/prisma.service';

@Module({
  controllers: [OnboardingController],
  providers: [OnboardingService, PrismaService],
  exports: [OnboardingService],
})
export class OnboardingModule {} 