import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '../../lib/auth.guard';
import { OnboardingService, UpdateProfileDto } from './onboarding.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('onboarding')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('progress')
  @ApiOperation({ summary: 'Get user onboarding progress' })
  @ApiResponse({ status: 200, description: 'Onboarding progress retrieved successfully' })
  async getProgress(@Request() req: any) {
    return this.onboardingService.getOnboardingProgress(req.user.sub);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile during onboarding' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(@Request() req: any, @Body() updateProfileDto: UpdateProfileDto) {
    return this.onboardingService.updateProfile(req.user.sub, updateProfileDto);
  }

  @Put('step/:stepNumber')
  @ApiOperation({ summary: 'Update current onboarding step' })
  @ApiResponse({ status: 200, description: 'Onboarding step updated successfully' })
  async updateStep(@Request() req: any, @Param('stepNumber') stepNumber: string) {
    const step = parseInt(stepNumber, 10);
    return this.onboardingService.updateStep(req.user.sub, step);
  }

  @Get('recommended-traders')
  @ApiOperation({ summary: 'Get recommended traders for user' })
  @ApiResponse({ status: 200, description: 'Recommended traders retrieved successfully' })
  async getRecommendedTraders(@Request() req: any) {
    return this.onboardingService.getRecommendedTraders(req.user.sub);
  }

  @Post('skip')
  @ApiOperation({ summary: 'Skip onboarding process' })
  @ApiResponse({ status: 200, description: 'Onboarding skipped successfully' })
  async skipOnboarding(@Request() req: any) {
    return this.onboardingService.skipOnboarding(req.user.sub);
  }
} 