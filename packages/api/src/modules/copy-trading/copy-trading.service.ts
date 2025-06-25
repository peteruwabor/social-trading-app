import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';
import { EventBus } from '../../lib/event-bus';
import { withinMaxPositionPct } from '../../lib/guardrails.util';

export interface CopyTradingStats {
  totalCopiedTrades: number;
  successfulCopies: number;
  failedCopies: number;
  totalProfitLoss: number;
  averageCopyDelay: number;
  mostCopiedSymbols: Array<{ symbol: string; count: number }>;
  copySuccessRate: number;
}

export interface RiskMetrics {
  maxDrawdown: number;
  sharpeRatio: number;
  volatility: number;
  maxPositionSize: number;
  totalExposure: number;
}

@Injectable()
export class CopyTradingService {
  private readonly logger = new Logger(CopyTradingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Get comprehensive copy trading statistics for a user
   */
  async getCopyTradingStats(userId: string): Promise<CopyTradingStats> {
    const copyOrders = await this.prisma.copyOrder.findMany({
      where: { followerId: userId },
      include: {
        leaderTrade: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalCopiedTrades = copyOrders.length;
    const successfulCopies = copyOrders.filter(order => order.status === 'FILLED').length;
    const failedCopies = copyOrders.filter(order => order.status === 'FAILED').length;

    // Calculate total P&L (simplified calculation)
    const totalProfitLoss = copyOrders
      .filter(order => order.status === 'FILLED')
      .reduce((sum, order) => {
        // Simplified P&L calculation based on leader trade
        const leaderTrade = order.leaderTrade;
        if (leaderTrade) {
          // This is a simplified calculation - in real implementation would track actual fills
          return sum + (leaderTrade.side === 'BUY' ? 1 : -1) * Number(leaderTrade.fillPrice) * order.quantity;
        }
        return sum;
      }, 0);

    // Calculate average copy delay
    const copyDelays = copyOrders
      .filter(order => order.filledAt && order.leaderTrade)
      .map(order => {
        const leaderFilledAt = order.leaderTrade.filledAt;
        const copyFilledAt = order.filledAt!;
        return copyFilledAt.getTime() - leaderFilledAt.getTime();
      });

    const averageCopyDelay = copyDelays.length > 0 
      ? copyDelays.reduce((sum, delay) => sum + delay, 0) / copyDelays.length 
      : 0;

    // Get most copied symbols
    const symbolCounts = copyOrders.reduce((acc, order) => {
      acc[order.symbol] = (acc[order.symbol] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCopiedSymbols = Object.entries(symbolCounts)
      .map(([symbol, count]) => ({ symbol, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const copySuccessRate = totalCopiedTrades > 0 
      ? (successfulCopies / totalCopiedTrades) * 100 
      : 0;

    return {
      totalCopiedTrades,
      successfulCopies,
      failedCopies,
      totalProfitLoss,
      averageCopyDelay,
      mostCopiedSymbols,
      copySuccessRate,
    };
  }

  /**
   * Get risk metrics for a user's copy trading activity
   */
  async getRiskMetrics(userId: string): Promise<RiskMetrics> {
    const copyOrders = await this.prisma.copyOrder.findMany({
      where: { 
        followerId: userId,
        status: 'FILLED',
      },
      include: {
        leaderTrade: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (copyOrders.length === 0) {
      return {
        maxDrawdown: 0,
        sharpeRatio: 0,
        volatility: 0,
        maxPositionSize: 0,
        totalExposure: 0,
      };
    }

    // Calculate returns (simplified)
    const returns = copyOrders.map(order => {
      const leaderTrade = order.leaderTrade;
      if (leaderTrade) {
        return (leaderTrade.side === 'BUY' ? 1 : -1) * Number(leaderTrade.fillPrice) * order.quantity;
      }
      return 0;
    });

    // Calculate max drawdown
    let maxDrawdown = 0;
    let peak = returns[0];
    let runningTotal = 0;

    for (const ret of returns) {
      runningTotal += ret;
      if (runningTotal > peak) {
        peak = runningTotal;
      }
      const drawdown = (peak - runningTotal) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // Calculate volatility (standard deviation of returns)
    const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);

    // Calculate Sharpe ratio (simplified - assuming risk-free rate of 0)
    const sharpeRatio = meanReturn > 0 ? meanReturn / volatility : 0;

    // Calculate max position size
    const positionSizes = copyOrders.map(order => order.quantity * Number(order.leaderTrade.fillPrice));
    const maxPositionSize = Math.max(...positionSizes);

    // Calculate total exposure
    const totalExposure = positionSizes.reduce((sum, size) => sum + size, 0);

    return {
      maxDrawdown: maxDrawdown * 100, // Convert to percentage
      sharpeRatio,
      volatility,
      maxPositionSize,
      totalExposure,
    };
  }

  /**
   * Get copy trading performance by leader
   */
  async getLeaderPerformance(userId: string) {
    const copyOrders = await this.prisma.copyOrder.findMany({
      where: { followerId: userId },
      include: {
        leaderTrade: {
          include: {
            user: {
              select: {
                id: true,
                handle: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Group by leader
    const leaderStats = copyOrders.reduce((acc, order) => {
      const leaderId = order.leaderTrade.user.id;
      if (!acc[leaderId]) {
        acc[leaderId] = {
          leader: order.leaderTrade.user,
          totalCopies: 0,
          successfulCopies: 0,
          totalProfitLoss: 0,
          averageDelay: 0,
        };
      }

      acc[leaderId].totalCopies++;
      if (order.status === 'FILLED') {
        acc[leaderId].successfulCopies++;
      }

      // Calculate P&L
      const leaderTrade = order.leaderTrade;
      if (leaderTrade) {
        acc[leaderId].totalProfitLoss += (leaderTrade.side === 'BUY' ? 1 : -1) * Number(leaderTrade.fillPrice) * order.quantity;
      }

      // Calculate delay
      if (order.filledAt && leaderTrade) {
        const delay = order.filledAt.getTime() - leaderTrade.filledAt.getTime();
        acc[leaderId].averageDelay = (acc[leaderId].averageDelay * (acc[leaderId].totalCopies - 1) + delay) / acc[leaderId].totalCopies;
      }

      return acc;
    }, {} as Record<string, any>);

    return Object.values(leaderStats).map((stat: any) => ({
      ...stat,
      successRate: (stat.successfulCopies / stat.totalCopies) * 100,
    }));
  }

  /**
   * Get copy order history with filtering
   */
  async getCopyOrderHistory(
    userId: string,
    filters: {
      status?: string;
      symbol?: string;
      leaderId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ) {
    const where: any = { followerId: userId };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.symbol) {
      where.symbol = filters.symbol;
    }

    if (filters.leaderId) {
      where.leaderTrade = {
        userId: filters.leaderId,
      };
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    return this.prisma.copyOrder.findMany({
      where,
      include: {
        leaderTrade: {
          include: {
            user: {
              select: {
                id: true,
                handle: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cancel a pending copy order
   */
  async cancelCopyOrder(userId: string, copyOrderId: string) {
    const copyOrder = await this.prisma.copyOrder.findFirst({
      where: {
        id: copyOrderId,
        followerId: userId,
        status: 'QUEUED',
      },
    });

    if (!copyOrder) {
      throw new Error('Copy order not found or cannot be cancelled');
    }

    const updatedOrder = await this.prisma.copyOrder.update({
      where: { id: copyOrderId },
      data: { status: 'CANCELLED' },
    });

    // Publish cancellation event
    this.eventBus.publish('CopyOrderCancelled', {
      copyOrderId: copyOrderId,
      followerId: userId,
      reason: 'User cancelled',
    });

    return updatedOrder;
  }

  /**
   * Get copy trading settings for a user
   */
  async getCopyTradingSettings(userId: string) {
    const followers = await this.prisma.follower.findMany({
      where: { followerId: userId },
      include: {
        leader: {
          select: {
            id: true,
            handle: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const guardrails = await this.prisma.guardrail.findMany({
      where: { followerId: userId },
    });

    return {
      following: followers.map(f => ({
        leader: f.leader,
        autoCopy: f.autoCopy,
        alertOnly: f.alertOnly,
        autoCopyPaused: f.autoCopyPaused,
      })),
      guardrails: guardrails.map(g => ({
        symbol: g.symbol,
        maxPct: Number(g.maxPct),
      })),
    };
  }

  /**
   * Update copy trading settings
   */
  async updateCopyTradingSettings(
    userId: string,
    leaderId: string,
    settings: {
      autoCopy?: boolean;
      alertOnly?: boolean;
      autoCopyPaused?: boolean;
    },
  ) {
    const follower = await this.prisma.follower.findFirst({
      where: {
        followerId: userId,
        leaderId: leaderId,
      },
    });

    if (!follower) {
      throw new Error('Not following this leader');
    }

    return this.prisma.follower.update({
      where: { id: follower.id },
      data: settings,
    });
  }

  /**
   * Set position limit guardrail
   */
  async setPositionLimit(
    userId: string,
    symbol: string | null, // null for global limit
    maxPct: number,
  ) {
    // Delete existing guardrail for this symbol
    await this.prisma.guardrail.deleteMany({
      where: {
        followerId: userId,
        symbol: symbol,
      },
    });

    // Create new guardrail with all required fields
    const guardrail = await this.prisma.guardrail.create({
      data: {
        followerId: userId,
        symbol: symbol,
        maxPct: maxPct,
        maxPositionSize: 0.1, // Default 10% max position size
        maxDailyLoss: 0.05,   // Default 5% max daily loss
        maxDrawdown: 0.15,    // Default 15% max drawdown
      },
    });

    // Return with maxPct as number
    return {
      ...guardrail,
      maxPct: Number(guardrail.maxPct),
    };
  }

  /**
   * Remove position limit guardrail
   */
  async removePositionLimit(userId: string, symbol: string | null) {
    return this.prisma.guardrail.deleteMany({
      where: {
        followerId: userId,
        symbol: symbol,
      },
    });
  }
} 