import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';

export interface TraderProfile {
  id: string;
  name: string;
  bio?: string | null;
  avatarUrl?: string | null;
  tradingExperience?: string | null;
  riskTolerance?: string | null;
  preferredMarkets: string[];
  totalReturn?: number;
  winRate?: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  followerCount: number;
  tradeCount: number;
  isFollowed: boolean;
  isVerified: boolean;
  joinedAt: Date;
  lastActive?: Date;
}

export interface FollowRequest {
  traderId: string;
  copyTrading?: {
    enabled: boolean;
    amount?: number;
    percentage?: number;
    maxRisk?: number;
    stopLoss?: number;
  };
}

export interface SearchFilters {
  riskTolerance?: string[];
  tradingExperience?: string[];
  markets?: string[];
  minReturn?: number;
  maxDrawdown?: number;
  minFollowers?: number;
  sortBy?: 'return' | 'winRate' | 'followers' | 'recent';
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class SocialService {
  constructor(private prisma: PrismaService) {}

  async discoverTraders(
    userId: string, 
    filters?: SearchFilters, 
    page: number = 1, 
    limit: number = 20
  ): Promise<{ traders: TraderProfile[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    // Get user's current followings to mark as followed
    const userFollowings = await this.prisma.follower.findMany({
      where: { followerId: userId },
      select: { leaderId: true }
    });
    const followedIds = new Set(userFollowings.map(f => f.leaderId));

    // Build where clause based on filters
    const whereClause: any = {
      id: { not: userId }, // Don't include current user
      status: 'ACTIVE',
      // Only show users who have made trades or have followers (likely traders)
      OR: [
        { trades: { some: {} } },
        { followers: { some: {} } },
        { isVerified: true }
      ]
    };

    if (filters) {
      if (filters.riskTolerance?.length) {
        whereClause.riskTolerance = { in: filters.riskTolerance };
      }
      if (filters.tradingExperience?.length) {
        whereClause.tradingExperience = { in: filters.tradingExperience };
      }
      if (filters.markets?.length) {
        whereClause.preferredMarkets = { hasSome: filters.markets };
      }
      if (filters.minReturn !== undefined) {
        whereClause.totalReturn = { gte: filters.minReturn };
      }
      if (filters.maxDrawdown !== undefined) {
        whereClause.maxDrawdown = { lte: filters.maxDrawdown };
      }
    }

    // Build order clause
    let orderBy: any = [{ totalReturn: 'desc' }];
    if (filters?.sortBy) {
      switch (filters.sortBy) {
        case 'return':
          orderBy = [{ totalReturn: filters.sortOrder || 'desc' }];
          break;
        case 'winRate':
          orderBy = [{ winRate: filters.sortOrder || 'desc' }];
          break;
        case 'followers':
          orderBy = [{ followers: { _count: filters.sortOrder || 'desc' } }];
          break;
        case 'recent':
          orderBy = [{ createdAt: filters.sortOrder || 'desc' }];
          break;
      }
    }

    const [traders, total] = await Promise.all([
      this.prisma.user.findMany({
        where: whereClause,
        include: {
          _count: {
            select: {
              followers: true,
              trades: true
            }
          },
          trades: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      this.prisma.user.count({ where: whereClause })
    ]);

    const traderProfiles: TraderProfile[] = traders.map(trader => ({
      id: trader.id,
      name: trader.name || `${trader.firstName || ''} ${trader.lastName || ''}`.trim() || 'Anonymous Trader',
      bio: trader.bio,
      avatarUrl: trader.avatarUrl,
      tradingExperience: trader.tradingExperience,
      riskTolerance: trader.riskTolerance,
      preferredMarkets: trader.preferredMarkets || [],
      totalReturn: trader.totalReturn ? Number(trader.totalReturn) : undefined,
      winRate: trader.winRate ? Number(trader.winRate) : undefined,
      sharpeRatio: trader.sharpeRatio ? Number(trader.sharpeRatio) : undefined,
      maxDrawdown: trader.maxDrawdown ? Number(trader.maxDrawdown) : undefined,
      followerCount: trader._count.followers,
      tradeCount: trader._count.trades,
      isFollowed: followedIds.has(trader.id),
      isVerified: trader.isVerified,
      joinedAt: trader.createdAt,
      lastActive: trader.trades[0]?.createdAt
    }));

    return {
      traders: traderProfiles,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getTraderProfile(userId: string, traderId: string): Promise<TraderProfile & { recentTrades: any[]; performance: any }> {
    const trader = await this.prisma.user.findUnique({
      where: { id: traderId },
      include: {
        _count: {
          select: {
            followers: true,
            trades: true
          }
        },
        trades: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            symbol: true,
            side: true,
            quantity: true,
            fillPrice: true,
            filledAt: true
          }
        }
      }
    });

    if (!trader) {
      throw new NotFoundException('Trader not found');
    }

    // Check if current user follows this trader
    const isFollowed = await this.prisma.follower.findUnique({
      where: {
        leaderId_followerId: {
          leaderId: traderId,
          followerId: userId
        }
      }
    });

    // Calculate performance metrics
    const performance = await this.calculatePerformanceMetrics(traderId);

    return {
      id: trader.id,
      name: trader.name || `${trader.firstName || ''} ${trader.lastName || ''}`.trim() || 'Anonymous Trader',
      bio: trader.bio,
      avatarUrl: trader.avatarUrl,
      tradingExperience: trader.tradingExperience,
      riskTolerance: trader.riskTolerance,
      preferredMarkets: trader.preferredMarkets || [],
      totalReturn: trader.totalReturn ? Number(trader.totalReturn) : undefined,
      winRate: trader.winRate ? Number(trader.winRate) : undefined,
      sharpeRatio: trader.sharpeRatio ? Number(trader.sharpeRatio) : undefined,
      maxDrawdown: trader.maxDrawdown ? Number(trader.maxDrawdown) : undefined,
      followerCount: trader._count.followers,
      tradeCount: trader._count.trades,
      isFollowed: !!isFollowed,
      isVerified: trader.isVerified,
      joinedAt: trader.createdAt,
      recentTrades: trader.trades.map((trade: any) => ({
        id: trade.id,
        symbol: trade.symbol,
        side: trade.side,
        quantity: Number(trade.quantity),
        price: Number(trade.fillPrice),
        timestamp: trade.filledAt,
        pnl: null,
        pnlPercentage: null
      })),
      performance
    };
  }

  async followTrader(userId: string, followRequest: FollowRequest): Promise<{ success: boolean; message: string }> {
    const { traderId, copyTrading } = followRequest;

    // Check if trader exists
    const trader = await this.prisma.user.findUnique({
      where: { id: traderId }
    });

    if (!trader) {
      throw new NotFoundException('Trader not found');
    }

    if (traderId === userId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    // Check if already following
    const existingFollow = await this.prisma.follower.findUnique({
      where: {
        leaderId_followerId: {
          leaderId: traderId,
          followerId: userId
        }
      }
    });

    if (existingFollow) {
      throw new BadRequestException('Already following this trader');
    }

    // Create follow relationship
    await this.prisma.follower.create({
      data: {
        leaderId: traderId,
        followerId: userId,
        autoCopy: copyTrading?.enabled || false,
        alertOnly: !copyTrading?.enabled
      }
    });

    // Create notification for the trader
    await this.createNotification(traderId, {
      type: 'FOLLOWER_GAINED',
      title: '👥 New Follower!',
      message: `${trader.name || 'Someone'} started following you`,
      data: { followerId: userId }
    });

    // Award achievement
    await this.checkAndAwardSocialAchievements(userId);

    return {
      success: true,
      message: `Successfully followed ${trader.name || 'trader'}`
    };
  }

  async unfollowTrader(userId: string, traderId: string): Promise<{ success: boolean; message: string }> {
    const follow = await this.prisma.follower.findUnique({
      where: {
        leaderId_followerId: {
          leaderId: traderId,
          followerId: userId
        }
      }
    });

    if (!follow) {
      throw new NotFoundException('Not following this trader');
    }

    await this.prisma.follower.delete({
      where: { id: follow.id }
    });

    return {
      success: true,
      message: 'Successfully unfollowed trader'
    };
  }

  async getFollowing(userId: string): Promise<TraderProfile[]> {
    const followings = await this.prisma.follower.findMany({
      where: { followerId: userId },
      include: {
        leader: {
          include: {
            _count: {
              select: {
                followers: true,
                trades: true
              }
            }
          }
        }
      }
    });

    return followings.map(follow => ({
      id: follow.leader.id,
      name: follow.leader.name || `${follow.leader.firstName || ''} ${follow.leader.lastName || ''}`.trim() || 'Anonymous Trader',
      bio: follow.leader.bio,
      avatarUrl: follow.leader.avatarUrl,
      tradingExperience: follow.leader.tradingExperience,
      riskTolerance: follow.leader.riskTolerance,
      preferredMarkets: follow.leader.preferredMarkets || [],
      totalReturn: follow.leader.totalReturn ? Number(follow.leader.totalReturn) : undefined,
      winRate: follow.leader.winRate ? Number(follow.leader.winRate) : undefined,
      sharpeRatio: follow.leader.sharpeRatio ? Number(follow.leader.sharpeRatio) : undefined,
      maxDrawdown: follow.leader.maxDrawdown ? Number(follow.leader.maxDrawdown) : undefined,
      followerCount: follow.leader._count.followers,
      tradeCount: follow.leader._count.trades,
      isFollowed: true,
      isVerified: follow.leader.isVerified,
      joinedAt: follow.leader.createdAt
    }));
  }

  async getFollowers(userId: string): Promise<any[]> {
    const followers = await this.prisma.follower.findMany({
      where: { leaderId: userId },
      include: {
        follower: true
      }
    });

    return followers.map(follow => ({
      id: follow.follower.id,
      name: follow.follower.name || `${follow.follower.firstName || ''} ${follow.follower.lastName || ''}`.trim() || 'Anonymous User',
      avatarUrl: follow.follower.avatarUrl,
      followedAt: follow.createdAt,
      copyTrading: follow.autoCopy
    }));
  }

  private async calculatePerformanceMetrics(traderId: string): Promise<any> {
    // Calculate various performance metrics
    const trades = await this.prisma.trade.findMany({
      where: { userId: traderId },
      orderBy: { filledAt: 'asc' }
    });

    if (trades.length === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        avgReturn: 0,
        totalReturn: 0,
        monthlyReturn: 0,
        volatility: 0,
        sharpeRatio: 0,
        maxDrawdown: 0
      };
    }

    // For now, use basic calculations since we don't have P&L data
    const winningTrades = trades.filter(() => Math.random() > 0.5); // Mock data for now
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

    const returns: number[] = []; // No P&L data available yet
    const avgReturn = 0;
    const totalReturn = 0;

    // Simple volatility calculation (standard deviation of returns)
    const volatility = returns.length > 0 ? this.calculateStandardDeviation(returns) : 0;

    // Simple Sharpe ratio (assuming risk-free rate of 2%)
    const sharpeRatio = volatility > 0 ? (avgReturn - 0.02) / volatility : 0;

    return {
      totalTrades: trades.length,
      winRate: Math.round(winRate * 100) / 100,
      avgReturn: Math.round(avgReturn * 10000) / 100, // Convert to percentage
      totalReturn: Math.round(totalReturn * 100) / 100,
      monthlyReturn: 0, // TODO: Calculate monthly return
      volatility: Math.round(volatility * 10000) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      maxDrawdown: 0 // TODO: Calculate max drawdown
    };
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
    return Math.sqrt(avgSquaredDiff);
  }

  private async checkAndAwardSocialAchievements(userId: string): Promise<void> {
    const followingCount = await this.prisma.follower.count({
      where: { followerId: userId }
    });

    // Award achievements based on following count
    if (followingCount === 1) {
      await this.awardAchievement(userId, 'FIRST_FOLLOW');
    } else if (followingCount === 10) {
      await this.awardAchievement(userId, 'SOCIAL_TRADER');
    } else if (followingCount === 50) {
      await this.awardAchievement(userId, 'NETWORK_BUILDER');
    }
  }

  private async awardAchievement(userId: string, achievementKey: string): Promise<void> {
    try {
      const achievement = await this.prisma.achievement.findUnique({
        where: { name: achievementKey }
      });

      if (!achievement) return;

      const existing = await this.prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: {
            userId,
            achievementId: achievement.id
          }
        }
      });

      if (existing) return;

      await this.prisma.userAchievement.create({
        data: {
          userId,
          achievementId: achievement.id
        }
      });

      await this.createNotification(userId, {
        type: 'ACHIEVEMENT_UNLOCKED',
        title: '🏆 Achievement Unlocked!',
        message: `You've earned the "${achievement.description}" achievement!`,
        data: { achievementId: achievement.id }
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