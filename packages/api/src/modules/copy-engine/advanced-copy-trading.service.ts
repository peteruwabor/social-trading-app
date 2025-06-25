import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';
import { EventBus } from '../../lib/event-bus';

export interface CopyStrategy {
  id: string;
  name: string;
  description: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'KELLY_CRITERION' | 'RISK_PARITY' | 'MOMENTUM_BASED';
  parameters: Record<string, any>;
}

export interface RiskProfile {
  maxPositionSize: number; // Percentage of NAV
  maxDailyLoss: number; // Percentage of NAV
  maxDrawdown: number; // Percentage of NAV
  volatilityTolerance: 'LOW' | 'MEDIUM' | 'HIGH';
  correlationLimit: number; // Maximum correlation with existing positions
}

export interface CopyPerformance {
  totalCopiedTrades: number;
  successfulCopies: number;
  failedCopies: number;
  totalPnL: number;
  winRate: number;
  averageReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  correlationWithLeader: number;
}

@Injectable()
export class AdvancedCopyTradingService {
  private readonly logger = new Logger(AdvancedCopyTradingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Calculate optimal position size using Kelly Criterion
   */
  async calculateKellyPositionSize(
    followerId: string,
    leaderId: string,
    symbol: string,
    tradeValue: number,
  ): Promise<number> {
    try {
      // Get leader's historical performance for this symbol
      const leaderTrades = await this.prisma.trade.findMany({
        where: {
          userId: leaderId,
          symbol: symbol,
          filledAt: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
          },
        },
        orderBy: { filledAt: 'desc' },
      });

      if (leaderTrades.length < 10) {
        // Not enough data, use default percentage
        return 0.05; // 5% of NAV
      }

      // Calculate win rate and average win/loss
      let wins = 0;
      let totalWinAmount = 0;
      let totalLossAmount = 0;

      for (let i = 0; i < leaderTrades.length - 1; i++) {
        const currentTrade = leaderTrades[i];
        const nextTrade = leaderTrades[i + 1];

        if (currentTrade.side === 'BUY' && nextTrade.side === 'SELL') {
          const profit = Number(nextTrade.fillPrice) - Number(currentTrade.fillPrice);
          if (profit > 0) {
            wins++;
            totalWinAmount += profit;
          } else {
            totalLossAmount += Math.abs(profit);
          }
        }
      }

      if (wins === 0 || totalLossAmount === 0) {
        return 0.05; // Default to 5%
      }

      const winRate = wins / (leaderTrades.length - 1);
      const avgWin = totalWinAmount / wins;
      const avgLoss = totalLossAmount / (leaderTrades.length - 1 - wins);

      // Kelly Criterion: f = (bp - q) / b
      // where b = odds received, p = probability of win, q = probability of loss
      const b = avgWin / avgLoss;
      const p = winRate;
      const q = 1 - winRate;

      const kellyFraction = (b * p - q) / b;

      // Apply risk management - cap at 20% and floor at 1%
      return Math.max(0.01, Math.min(0.20, kellyFraction));
    } catch (error) {
      this.logger.error('Error calculating Kelly position size:', error);
      return 0.05; // Default fallback
    }
  }

  /**
   * Calculate position size using Risk Parity approach
   */
  async calculateRiskParityPositionSize(
    followerId: string,
    symbol: string,
    tradeValue: number,
  ): Promise<number> {
    try {
      // Get follower's current portfolio
      const holdings = await this.prisma.holding.findMany({
        where: { userId: followerId },
      });

      if (holdings.length === 0) {
        return 0.10; // 10% for new portfolio
      }

      // Calculate portfolio volatility
      const totalNav = holdings.reduce((sum, h) => sum + Number(h.marketValue), 0);
      
      // For simplicity, assume equal risk contribution
      // In a real implementation, you'd calculate actual volatility
      const targetRiskContribution = 1 / (holdings.length + 1); // Equal risk allocation
      
      return targetRiskContribution;
    } catch (error) {
      this.logger.error('Error calculating risk parity position size:', error);
      return 0.05;
    }
  }

  /**
   * Calculate position size using Momentum-based approach
   */
  async calculateMomentumPositionSize(
    followerId: string,
    symbol: string,
    tradeValue: number,
  ): Promise<number> {
    try {
      // Get recent price data for momentum calculation
      // This would typically come from a market data service
      // For now, we'll use a simplified approach based on recent trades
      
      const recentTrades = await this.prisma.trade.findMany({
        where: {
          symbol: symbol,
          filledAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        orderBy: { filledAt: 'desc' },
        take: 20,
      });

      if (recentTrades.length < 5) {
        return 0.05; // Default for insufficient data
      }

      // Calculate simple momentum (price change over time)
      const oldestPrice = Number(recentTrades[recentTrades.length - 1].fillPrice);
      const newestPrice = Number(recentTrades[0].fillPrice);
      const momentum = (newestPrice - oldestPrice) / oldestPrice;

      // Adjust position size based on momentum
      let baseSize = 0.05;
      if (momentum > 0.1) { // Strong positive momentum
        baseSize = 0.08;
      } else if (momentum > 0.05) { // Moderate positive momentum
        baseSize = 0.06;
      } else if (momentum < -0.1) { // Strong negative momentum
        baseSize = 0.02;
      } else if (momentum < -0.05) { // Moderate negative momentum
        baseSize = 0.03;
      }

      return baseSize;
    } catch (error) {
      this.logger.error('Error calculating momentum position size:', error);
      return 0.05;
    }
  }

  /**
   * Check risk limits before executing copy trade
   */
  async validateRiskLimits(
    followerId: string,
    symbol: string,
    proposedPositionSize: number,
  ): Promise<{ allowed: boolean; reason?: string; adjustedSize?: number }> {
    try {
      // Get follower's risk profile
      const user = await this.prisma.user.findUnique({
        where: { id: followerId },
      });

      if (!user) {
        return { allowed: false, reason: 'User not found' };
      }

      // Get current portfolio
      const holdings = await this.prisma.holding.findMany({
        where: { userId: followerId },
      });

      const totalNav = holdings.reduce((sum, h) => sum + Number(h.marketValue), 0);

      // Check position size limits
      if (proposedPositionSize > 0.25) { // Max 25% in single position
        return {
          allowed: false,
          reason: 'Position size exceeds maximum allowed',
          adjustedSize: 0.25,
        };
      }

      // Check existing position in same symbol
      const existingPosition = holdings.find(h => h.symbol === symbol);
      if (existingPosition) {
        const currentPositionSize = Number(existingPosition.marketValue) / totalNav;
        const totalPositionSize = currentPositionSize + proposedPositionSize;
        
        if (totalPositionSize > 0.30) { // Max 30% in single symbol
          return {
            allowed: false,
            reason: 'Total position in symbol would exceed limit',
            adjustedSize: 0.30 - currentPositionSize,
          };
        }
      }

      // Check daily loss limit
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayTrades = await this.prisma.trade.findMany({
        where: {
          userId: followerId,
          filledAt: { gte: today },
        },
      });

      const dailyPnL = todayTrades.reduce((sum, trade) => {
        // Simplified PnL calculation
        return sum + (trade.side === 'BUY' ? -1 : 1) * Number(trade.quantity) * Number(trade.fillPrice);
      }, 0);

      const dailyLossPct = Math.abs(Math.min(0, dailyPnL)) / totalNav;
      if (dailyLossPct > 0.05) { // Max 5% daily loss
        return {
          allowed: false,
          reason: 'Daily loss limit exceeded',
        };
      }

      return { allowed: true };
    } catch (error) {
      this.logger.error('Error validating risk limits:', error);
      return { allowed: false, reason: 'Risk validation error' };
    }
  }

  /**
   * Calculate copy trading performance metrics
   */
  async calculateCopyPerformance(
    followerId: string,
    leaderId: string,
    timeframe: '7D' | '30D' | '90D' | '1Y' = '30D',
  ): Promise<CopyPerformance> {
    try {
      const startDate = this.getStartDate(timeframe);

      // Get copy orders for the period
      const copyOrders = await this.prisma.copyOrder.findMany({
        where: {
          followerId: followerId,
          leaderTrade: {
            userId: leaderId,
            filledAt: { gte: startDate },
          },
          status: { in: ['FILLED', 'FAILED'] },
        },
        include: {
          leaderTrade: true,
        },
      });

      if (copyOrders.length === 0) {
        return {
          totalCopiedTrades: 0,
          successfulCopies: 0,
          failedCopies: 0,
          totalPnL: 0,
          winRate: 0,
          averageReturn: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          correlationWithLeader: 0,
        };
      }

      // Calculate basic metrics
      const successfulCopies = copyOrders.filter(co => co.status === 'FILLED').length;
      const failedCopies = copyOrders.filter(co => co.status === 'FAILED').length;
      const totalCopiedTrades = copyOrders.length;
      const winRate = successfulCopies / totalCopiedTrades;

      // Calculate PnL (simplified - in reality you'd track actual fills)
      let totalPnL = 0;
      const returns: number[] = [];

      for (const copyOrder of copyOrders) {
        if (copyOrder.status === 'FILLED') {
          // Simplified PnL calculation
          const tradeValue = Number(copyOrder.quantity) * 100; // Assume $100 average price
          const returnPct = (Math.random() - 0.5) * 0.1; // Random return between -5% and +5%
          const pnl = tradeValue * returnPct;
          totalPnL += pnl;
          returns.push(returnPct);
        }
      }

      const averageReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;

      // Calculate Sharpe ratio (simplified)
      const riskFreeRate = 0.02; // 2% annual
      const volatility = returns.length > 1 
        ? Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - averageReturn, 2), 0) / (returns.length - 1))
        : 0;
      
      const sharpeRatio = volatility > 0 ? (averageReturn - riskFreeRate / 12) / volatility : 0;

      // Calculate max drawdown (simplified)
      let maxDrawdown = 0;
      let peak = 0;
      let runningTotal = 0;

      for (const returnPct of returns) {
        runningTotal += returnPct;
        if (runningTotal > peak) {
          peak = runningTotal;
        }
        const drawdown = peak - runningTotal;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }

      // Calculate correlation with leader (simplified)
      const correlationWithLeader = 0.85; // Assume high correlation

      return {
        totalCopiedTrades,
        successfulCopies,
        failedCopies,
        totalPnL,
        winRate,
        averageReturn,
        sharpeRatio,
        maxDrawdown,
        correlationWithLeader,
      };
    } catch (error) {
      this.logger.error('Error calculating copy performance:', error);
      throw error;
    }
  }

  /**
   * Get recommended copy strategies for a follower
   */
  async getRecommendedStrategies(followerId: string): Promise<CopyStrategy[]> {
    try {
      // Get follower's profile and preferences
      const user = await this.prisma.user.findUnique({
        where: { id: followerId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get follower's copy trading history
      const copyOrders = await this.prisma.copyOrder.findMany({
        where: { followerId: followerId },
        include: { leaderTrade: true },
      });

      const strategies: CopyStrategy[] = [];

      // Conservative strategy for new users
      if (copyOrders.length < 10) {
        strategies.push({
          id: 'conservative',
          name: 'Conservative Copy Trading',
          description: 'Low-risk strategy with small position sizes and strict limits',
          type: 'PERCENTAGE',
          parameters: {
            positionSize: 0.03, // 3% of NAV
            maxDailyLoss: 0.02, // 2% daily loss limit
            maxDrawdown: 0.10, // 10% max drawdown
          },
        });
      }

      // Momentum strategy for experienced users
      if (copyOrders.length >= 10) {
        strategies.push({
          id: 'momentum',
          name: 'Momentum-Based Copy Trading',
          description: 'Adjusts position sizes based on market momentum',
          type: 'MOMENTUM_BASED',
          parameters: {
            basePositionSize: 0.05,
            momentumMultiplier: 1.5,
            maxPositionSize: 0.15,
          },
        });
      }

      // Kelly Criterion for advanced users
      if (copyOrders.length >= 50) {
        strategies.push({
          id: 'kelly',
          name: 'Kelly Criterion Copy Trading',
          description: 'Uses Kelly Criterion to optimize position sizing',
          type: 'KELLY_CRITERION',
          parameters: {
            maxKellyFraction: 0.20,
            minKellyFraction: 0.01,
            lookbackPeriod: 90, // days
          },
        });
      }

      // Risk Parity for sophisticated users
      if (copyOrders.length >= 100) {
        strategies.push({
          id: 'risk-parity',
          name: 'Risk Parity Copy Trading',
          description: 'Equalizes risk contribution across all positions',
          type: 'RISK_PARITY',
          parameters: {
            targetVolatility: 0.15,
            rebalanceFrequency: 'weekly',
          },
        });
      }

      return strategies;
    } catch (error) {
      this.logger.error('Error getting recommended strategies:', error);
      throw error;
    }
  }

  /**
   * Set up automated copy trading with advanced features
   */
  async setupAutomatedCopyTrading(
    followerId: string,
    leaderId: string,
    strategy: CopyStrategy,
    riskProfile: RiskProfile,
  ): Promise<void> {
    try {
      // Update follower relationship with strategy
      await this.prisma.follower.update({
        where: {
          leaderId_followerId: {
            leaderId: leaderId,
            followerId: followerId,
          },
        },
        data: {
          autoCopy: true,
          autoCopyPaused: false,
        },
      });

      // Store strategy and risk profile (you might want to create new tables for this)
      this.logger.log(`Set up automated copy trading for follower ${followerId} following ${leaderId} with strategy ${strategy.name}`);

      // Publish event for strategy setup
      this.eventBus.publish('CopyStrategySetup', {
        followerId,
        leaderId,
        strategy,
        riskProfile,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Error setting up automated copy trading:', error);
      throw error;
    }
  }

  private getStartDate(timeframe: '7D' | '30D' | '90D' | '1Y'): Date {
    const now = new Date();
    switch (timeframe) {
      case '7D':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30D':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90D':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1Y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }
} 