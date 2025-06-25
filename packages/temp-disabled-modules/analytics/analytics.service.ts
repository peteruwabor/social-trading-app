import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserPerformance(userId: string, timeframe: string = '30d') {
    const startDate = this.getStartDate(timeframe);
    
    const trades = await this.prisma.trade.findMany({
      where: {
        userId,
        filledAt: { gte: startDate },
      },
      orderBy: { filledAt: 'desc' },
    });

    const totalTrades = trades.length;
    const buyTrades = trades.filter(t => t.side === 'BUY').length;
    const sellTrades = trades.filter(t => t.side === 'SELL').length;
    
    // Calculate P&L (simplified - in real app would need more complex logic)
    let totalPnL = 0;
    let totalVolume = 0;
    
    for (const trade of trades) {
      const tradeValue = Number(trade.fillPrice) * trade.quantity;
      totalVolume += tradeValue;
      // Simplified P&L calculation
      if (trade.side === 'SELL') {
        totalPnL += tradeValue * 0.02; // Assume 2% profit on sells
      }
    }

    return {
      totalTrades,
      buyTrades,
      sellTrades,
      totalVolume: totalVolume.toFixed(2),
      totalPnL: totalPnL.toFixed(2),
      winRate: totalTrades > 0 ? ((sellTrades / totalTrades) * 100).toFixed(1) : '0.0',
      averageTradeSize: totalTrades > 0 ? (totalVolume / totalTrades).toFixed(2) : '0.00',
    };
  }

  async getPortfolioAnalytics(userId: string) {
    const holdings = await this.prisma.holding.findMany({
      where: { userId },
    });

    const totalNav = holdings.reduce((sum, h) => sum + Number(h.marketValue), 0);
    const totalUnrealizedPnL = holdings.reduce((sum, h) => sum + Number(h.unrealizedPnL || 0), 0);
    
    const topHoldings = holdings
      .sort((a, b) => Number(b.marketValue) - Number(a.marketValue))
      .slice(0, 5)
      .map(h => ({
        symbol: h.symbol,
        quantity: h.quantity,
        marketValue: Number(h.marketValue).toFixed(2),
        unrealizedPnL: Number(h.unrealizedPnL || 0).toFixed(2),
        weight: totalNav > 0 ? ((Number(h.marketValue) / totalNav) * 100).toFixed(1) : '0.0',
      }));

    return {
      totalNav: totalNav.toFixed(2),
      totalUnrealizedPnL: totalUnrealizedPnL.toFixed(2),
      positionCount: holdings.length,
      topHoldings,
    };
  }

  async getLeaderRankings(timeframe: string = '30d') {
    const startDate = this.getStartDate(timeframe);
    
    // Get all users who have followers
    const leaders = await this.prisma.user.findMany({
      where: {
        followersAsLeader: { some: {} },
      },
      include: {
        followersAsLeader: true,
        trades: {
          where: { filledAt: { gte: startDate } },
        },
      },
    });

    const rankings = leaders.map(leader => {
      const followerCount = leader.followersAsLeader.length;
      const tradeCount = leader.trades.length;
      const totalVolume = leader.trades.reduce((sum, t) => sum + Number(t.fillPrice) * t.quantity, 0);
      
      return {
        id: leader.id,
        handle: leader.handle || leader.email,
        followerCount,
        tradeCount,
        totalVolume: totalVolume.toFixed(2),
        score: (followerCount * 10) + (tradeCount * 5) + (totalVolume / 1000), // Simple scoring
      };
    });

    return rankings
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((leader, index) => ({
        ...leader,
        rank: index + 1,
        score: leader.score.toFixed(1),
      }));
  }

  async getPlatformStatistics() {
    const [
      totalUsers,
      totalTrades,
      totalFollowers,
      totalTips,
      activeLeaders,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.trade.count(),
      this.prisma.follower.count(),
      this.prisma.tip.count(),
      this.prisma.user.count({
        where: { followersAsLeader: { some: {} } },
      }),
    ]);

    const totalTipAmount = await this.prisma.tip.aggregate({
      _sum: { amount: true },
    });

    return {
      totalUsers,
      totalTrades,
      totalFollowers,
      totalTips,
      totalTipAmount: Number(totalTipAmount._sum.amount || 0).toFixed(2),
      activeLeaders,
      averageFollowersPerLeader: activeLeaders > 0 ? (totalFollowers / activeLeaders).toFixed(1) : '0.0',
    };
  }

  async getFollowerSuccessMetrics(userId: string) {
    const copyOrders = await this.prisma.copyOrder.findMany({
      where: { followerId: userId },
      include: { leaderTrade: true },
    });

    const totalCopyOrders = copyOrders.length;
    const successfulCopies = copyOrders.filter(co => co.status === 'FILLED').length;
    const failedCopies = copyOrders.filter(co => co.status === 'FAILED').length;

    const totalInvested = copyOrders
      .filter(co => co.status === 'FILLED')
      .reduce((sum, co) => sum + (co.quantity * 100), 0); // Assume $100 per share

    return {
      totalCopyOrders,
      successfulCopies,
      failedCopies,
      successRate: totalCopyOrders > 0 ? ((successfulCopies / totalCopyOrders) * 100).toFixed(1) : '0.0',
      totalInvested: totalInvested.toFixed(2),
      averageOrderSize: successfulCopies > 0 ? (totalInvested / successfulCopies).toFixed(2) : '0.00',
    };
  }

  async generatePortfolioSnapshot(userId: string) {
    const holdings = await this.prisma.holding.findMany({
      where: { userId },
    });

    const nav = holdings.reduce((sum, h) => sum + Number(h.marketValue), 0);
    const positions = holdings.map(h => ({
      symbol: h.symbol,
      quantity: h.quantity,
      marketValue: Number(h.marketValue),
      unrealizedPnL: Number(h.unrealizedPnL || 0),
    }));

    return this.prisma.portfolioSnapshot.create({
      data: {
        userId,
        nav,
        positions,
      },
    });
  }

  async getPortfolioHistory(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const snapshots = await this.prisma.portfolioSnapshot.findMany({
      where: {
        userId,
        snapshotAt: { gte: startDate },
      },
      orderBy: { snapshotAt: 'asc' },
    });

    return snapshots.map(s => ({
      date: s.snapshotAt,
      nav: Number(s.nav).toFixed(2),
      cashBalance: s.cashBalance ? Number(s.cashBalance).toFixed(2) : null,
    }));
  }

  private getStartDate(timeframe: string): Date {
    const now = new Date();
    switch (timeframe) {
      case '7d':
        now.setDate(now.getDate() - 7);
        break;
      case '30d':
        now.setDate(now.getDate() - 30);
        break;
      case '90d':
        now.setDate(now.getDate() - 90);
        break;
      case '1y':
        now.setFullYear(now.getFullYear() - 1);
        break;
      default:
        now.setDate(now.getDate() - 30);
    }
    return now;
  }
} 