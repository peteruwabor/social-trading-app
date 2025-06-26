import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';

export interface OnboardingStep {
  step: number;
  title: string;
  description: string;
  completed: boolean;
  data?: any;
}

export interface OnboardingProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: number;
  progressPercentage: number;
  steps: OnboardingStep[];
  user: any;
}

export interface UpdateProfileDto {
  tradingExperience?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  riskTolerance?: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  investmentGoals?: string[];
  preferredMarkets?: string[];
  investmentRange?: 'UNDER_1K' | 'ONE_TO_10K' | 'TEN_TO_50K' | 'FIFTY_TO_100K' | 'OVER_100K';
  bio?: string;
  firstName?: string;
  lastName?: string;
}

@Injectable()
export class OnboardingService {
  constructor(private prisma: PrismaService) {}

  private readonly ONBOARDING_STEPS = [
    {
      step: 1,
      title: 'Welcome to GIOAT',
      description: 'Learn about our platform and set your goals',
      key: 'welcome'
    },
    {
      step: 2,
      title: 'Complete Your Profile',
      description: 'Tell us about yourself and your trading experience',
      key: 'profile'
    },
    {
      step: 3,
      title: 'Set Trading Preferences',
      description: 'Configure your risk tolerance and market preferences',
      key: 'preferences'
    },
    {
      step: 4,
      title: 'Connect Your Broker',
      description: 'Link your trading account for seamless copy trading',
      key: 'broker'
    },
    {
      step: 5,
      title: 'Discover Traders',
      description: 'Find and follow top-performing traders',
      key: 'discover'
    },
    {
      step: 6,
      title: 'Setup Complete',
      description: 'You\'re ready to start your trading journey!',
      key: 'complete'
    }
  ];

  async getOnboardingProgress(userId: string): Promise<OnboardingProgress> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        brokerConnections: true,
        following: true,
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const steps = this.ONBOARDING_STEPS.map(stepDef => {
      const step: OnboardingStep = {
        step: stepDef.step,
        title: stepDef.title,
        description: stepDef.description,
        completed: this.isStepCompleted(stepDef.key, user),
        data: this.getStepData(stepDef.key, user)
      };
      return step;
    });

    const completedSteps = steps.filter(step => step.completed).length;
    const currentStep = user.onboardingCompleted ? 6 : Math.min(completedSteps + 1, 6);

    return {
      currentStep,
      totalSteps: this.ONBOARDING_STEPS.length,
      completedSteps,
      progressPercentage: Math.round((completedSteps / this.ONBOARDING_STEPS.length) * 100),
      steps,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        tradingExperience: user.tradingExperience,
        riskTolerance: user.riskTolerance,
        investmentGoals: user.investmentGoals,
        preferredMarkets: user.preferredMarkets,
        investmentRange: user.investmentRange,
        onboardingCompleted: user.onboardingCompleted,
        onboardingStep: user.onboardingStep
      }
    };
  }

  private isStepCompleted(stepKey: string, user: any): boolean {
    switch (stepKey) {
      case 'welcome':
        return user.onboardingStep >= 1;
      case 'profile':
        return !!(user.firstName && user.lastName && user.tradingExperience);
      case 'preferences':
        return !!(user.riskTolerance && user.investmentGoals?.length > 0);
      case 'broker':
        return user.brokerConnections?.length > 0;
      case 'discover':
        return user.following?.length > 0;
      case 'complete':
        return user.onboardingCompleted;
      default:
        return false;
    }
  }

  private getStepData(stepKey: string, user: any): any {
    switch (stepKey) {
      case 'profile':
        return {
          firstName: user.firstName,
          lastName: user.lastName,
          bio: user.bio,
          tradingExperience: user.tradingExperience
        };
      case 'preferences':
        return {
          riskTolerance: user.riskTolerance,
          investmentGoals: user.investmentGoals,
          preferredMarkets: user.preferredMarkets,
          investmentRange: user.investmentRange
        };
      case 'broker':
        return {
          connectedBrokers: user.brokerConnections?.length || 0,
          brokers: user.brokerConnections?.map((bc: any) => ({
            broker: bc.broker,
            status: bc.status
          })) || []
        };
      case 'discover':
        return {
          followingCount: user.following?.length || 0
        };
      default:
        return null;
    }
  }

  async updateProfile(userId: string, data: UpdateProfileDto): Promise<{ success: boolean; user: any }> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        onboardingStep: Math.max(await this.calculateCurrentStep(userId, data), 2)
      }
    });

    // Award achievement for completing profile
    if (user.firstName && user.lastName && user.tradingExperience) {
      await this.awardAchievement(userId, 'PROFILE_COMPLETE');
    }

    return { 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        bio: user.bio,
        tradingExperience: user.tradingExperience,
        riskTolerance: user.riskTolerance,
        investmentGoals: user.investmentGoals,
        preferredMarkets: user.preferredMarkets,
        investmentRange: user.investmentRange
      }
    };
  }

  async updateStep(userId: string, step: number): Promise<{ success: boolean; currentStep: number }> {
    if (step < 1 || step > this.ONBOARDING_STEPS.length) {
      throw new BadRequestException('Invalid step number');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { 
        onboardingStep: step,
        onboardingCompleted: step === this.ONBOARDING_STEPS.length
      }
    });

    // Award completion achievement
    if (user.onboardingCompleted) {
      await this.awardAchievement(userId, 'ONBOARDING_COMPLETE');
      await this.createNotification(userId, {
        type: 'ONBOARDING_COMPLETE',
        title: '🎉 Welcome to GIOAT!',
        message: 'Your onboarding is complete. Start exploring and following top traders!'
      });
    }

    return { success: true, currentStep: user.onboardingStep };
  }

  private async calculateCurrentStep(userId: string, newData: any): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        brokerConnections: true,
        following: true
      }
    });

    if (!user) return 1;

    // Merge new data with existing user data
    const mergedUser = { ...user, ...newData };

    // Calculate step based on completed requirements
    if (mergedUser.following?.length > 0) return 6;
    if (mergedUser.brokerConnections?.length > 0) return 5;
    if (mergedUser.riskTolerance && mergedUser.investmentGoals?.length > 0) return 4;
    if (mergedUser.firstName && mergedUser.lastName && mergedUser.tradingExperience) return 3;
    return 2;
  }

  async getRecommendedTraders(userId: string): Promise<any[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get traders based on user's risk tolerance and preferred markets
    const traders = await this.prisma.user.findMany({
      where: {
        isVerified: true,
        status: 'ACTIVE',
        // Filter by compatible risk tolerance
        ...(user.riskTolerance && {
          riskTolerance: user.riskTolerance
        })
      },
      include: {
        followers: true,
        _count: {
          select: {
            followers: true,
            trades: true
          }
        }
      },
      orderBy: [
        { totalReturn: 'desc' },
        { winRate: 'desc' }
      ],
      take: 10
    });

    return traders.map(trader => ({
      id: trader.id,
      name: trader.name || `${trader.firstName} ${trader.lastName}`,
      bio: trader.bio,
      avatarUrl: trader.avatarUrl,
      tradingExperience: trader.tradingExperience,
      riskTolerance: trader.riskTolerance,
      totalReturn: trader.totalReturn,
      winRate: trader.winRate,
      followerCount: trader._count.followers,
      tradeCount: trader._count.trades,
      preferredMarkets: trader.preferredMarkets,
      isFollowed: false // TODO: Check if current user follows this trader
    }));
  }

  async skipOnboarding(userId: string): Promise<{ success: boolean; message: string }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        onboardingCompleted: true,
        onboardingStep: this.ONBOARDING_STEPS.length
      }
    });

    await this.createNotification(userId, {
      type: 'ONBOARDING_SKIPPED',
      title: 'Welcome to GIOAT!',
      message: 'You can always complete your profile later in settings.'
    });

    return {
      success: true,
      message: 'Onboarding skipped successfully'
    };
  }

  private async awardAchievement(userId: string, achievementKey: string): Promise<void> {
    try {
      // Check if achievement exists
      const achievement = await this.prisma.achievement.findUnique({
        where: { name: achievementKey }
      });

      if (!achievement) return;

      // Check if user already has this achievement
      const existing = await this.prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: {
            userId,
            achievementId: achievement.id
          }
        }
      });

      if (existing) return;

      // Award the achievement
      await this.prisma.userAchievement.create({
        data: {
          userId,
          achievementId: achievement.id
        }
      });

      // Create notification
      await this.createNotification(userId, {
        type: 'ACHIEVEMENT_UNLOCKED',
        title: '🏆 Achievement Unlocked!',
        message: `You've earned the "${achievement.name}" achievement!`
      });
    } catch (error) {
      console.error('Error awarding achievement:', error);
    }
  }

  private async createNotification(userId: string, notification: any): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          userId,
          ...notification
        }
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }
} 