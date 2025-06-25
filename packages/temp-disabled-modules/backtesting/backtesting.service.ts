import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';

export interface BacktestResult {
  id: string;
  userId: string;
  leaderId: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  totalReturnPercent: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  equityCurve: EquityPoint[];
  trades: BacktestTrade[];
  createdAt: Date;
}

export interface EquityPoint {
  date: Date;
  equity: number;
  drawdown: number;
}

export interface BacktestTrade {
  date: Date;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  value: number;
  pnl?: number;
  cumulativePnl: number;
}

export interface BacktestConfig {
  leaderId: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  positionSize: number; // Percentage of capital per trade
  maxPositionSize: number; // Maximum position size as percentage
  stopLoss?: number; // Stop loss percentage
  takeProfit?: number; // Take profit percentage
  slippage: number; // Slippage percentage
  commission: number; // Commission per trade
}

@Injectable()
export class BacktestingService {
  private readonly logger = new Logger(BacktestingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Run a backtest simulation
   */
  async runBacktest(userId: string, config: BacktestConfig): Promise<BacktestResult> {
    try {
      this.logger.log(`Starting backtest for user ${userId} following leader ${config.leaderId}`);

      // Get leader's historical trades
      const leaderTrades = await this.prisma.trade.findMany({
        where: {
          userId: config.leaderId,
          filledAt: {
            gte: config.startDate,
            lte: config.endDate,
          },
        },
        orderBy: { filledAt: 'asc' },
      });

      if (leaderTrades.length === 0) {
        throw new Error('No trades found for the specified period');
      }

      // Run simulation
      const result = await this.simulateTrading(config, leaderTrades);

      // Save backtest result
      const savedResult = await this.prisma.backtestResult.create({
        data: {
          userId: userId,
          leaderId: config.leaderId,
          startDate: config.startDate,
          endDate: config.endDate,
          initialCapital: config.initialCapital,
          finalCapital: result.finalCapital,
          totalReturn: result.totalReturn,
          totalReturnPercent: result.totalReturnPercent,
          maxDrawdown: result.maxDrawdown,
          sharpeRatio: result.sharpeRatio,
          winRate: result.winRate,
          totalTrades: result.totalTrades,
          successfulTrades: result.successfulTrades,
          failedTrades: result.failedTrades,
          equityCurve: result.equityCurve,
          trades: result.trades,
        },
      });

      this.logger.log(`Backtest completed: ${savedResult.id}`);
      return savedResult;
    } catch (error) {
      this.logger.error('Error running backtest:', error);
      throw error;
    }
  }

  /**
   * Simulate trading based on leader's trades
   */
  private async simulateTrading(config: BacktestConfig, leaderTrades: any[]): Promise<BacktestResult> {
    let currentCapital = config.initialCapital;
    let maxCapital = config.initialCapital;
    let maxDrawdown = 0;
    let totalPnL = 0;
    let successfulTrades = 0;
    let failedTrades = 0;

    const equityCurve: EquityPoint[] = [];
    const trades: BacktestTrade[] = [];
    const positions = new Map<string, { quantity: number; avgPrice: number }>();

    // Initialize equity curve
    equityCurve.push({
      date: config.startDate,
      equity: currentCapital,
      drawdown: 0,
    });

    for (const leaderTrade of leaderTrades) {
      const tradeDate = leaderTrade.filledAt;
      const symbol = leaderTrade.symbol;
      const side = leaderTrade.side;
      const leaderQuantity = leaderTrade.quantity;
      const leaderPrice = Number(leaderTrade.fillPrice);

      // Calculate position size based on current capital
      const tradeValue = leaderQuantity * leaderPrice;
      const positionValue = currentCapital * config.positionSize;
      const quantity = Math.floor(positionValue / leaderPrice);

      if (quantity < 1) {
        continue; // Skip if quantity too small
      }

      // Apply slippage and commission
      const executionPrice = leaderPrice * (1 + (side === 'BUY' ? config.slippage : -config.slippage));
      const tradeCost = quantity * executionPrice;
      const commission = tradeCost * config.commission;

      let tradePnL = 0;
      let isSuccessful = true;

      if (side === 'BUY') {
        // Buy trade
        if (positions.has(symbol)) {
          // Add to existing position
          const position = positions.get(symbol)!;
          const totalQuantity = position.quantity + quantity;
          const totalCost = (position.quantity * position.avgPrice) + tradeCost;
          position.quantity = totalQuantity;
          position.avgPrice = totalCost / totalQuantity;
        } else {
          // New position
          positions.set(symbol, {
            quantity: quantity,
            avgPrice: executionPrice,
          });
        }

        currentCapital -= (tradeCost + commission);
      } else {
        // Sell trade
        const position = positions.get(symbol);
        if (position && position.quantity >= quantity) {
          // Calculate PnL
          tradePnL = (executionPrice - position.avgPrice) * quantity - commission;
          currentCapital += (tradeCost - commission + tradePnL);

          // Update position
          position.quantity -= quantity;
          if (position.quantity === 0) {
            positions.delete(symbol);
          }

          totalPnL += tradePnL;
          if (tradePnL > 0) {
            successfulTrades++;
          } else {
            failedTrades++;
          }
        } else {
          // Failed trade - insufficient position
          isSuccessful = false;
          failedTrades++;
        }
      }

      // Update max capital and drawdown
      if (currentCapital > maxCapital) {
        maxCapital = currentCapital;
      }

      const drawdown = (maxCapital - currentCapital) / maxCapital;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }

      // Record trade
      trades.push({
        date: tradeDate,
        symbol: symbol,
        side: side,
        quantity: quantity,
        price: executionPrice,
        value: tradeCost,
        pnl: side === 'SELL' ? tradePnL : undefined,
        cumulativePnl: totalPnL,
      });

      // Update equity curve
      equityCurve.push({
        date: tradeDate,
        equity: currentCapital,
        drawdown: drawdown,
      });
    }

    // Close remaining positions at end of period
    for (const [symbol, position] of positions.entries()) {
      const closeValue = position.quantity * leaderTrades[leaderTrades.length - 1].fillPrice;
      const closePnL = (leaderTrades[leaderTrades.length - 1].fillPrice - position.avgPrice) * position.quantity;
      
      currentCapital += closeValue + closePnL;
      totalPnL += closePnL;

      if (closePnL > 0) {
        successfulTrades++;
      } else {
        failedTrades++;
      }
    }

    // Calculate final metrics
    const totalReturn = currentCapital - config.initialCapital;
    const totalReturnPercent = (totalReturn / config.initialCapital) * 100;
    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? successfulTrades / totalTrades : 0;
    const sharpeRatio = this.calculateSharpeRatio(equityCurve);

    return {
      id: '',
      userId: '',
      leaderId: config.leaderId,
      startDate: config.startDate,
      endDate: config.endDate,
      initialCapital: config.initialCapital,
      finalCapital: currentCapital,
      totalReturn: totalReturn,
      totalReturnPercent: totalReturnPercent,
      maxDrawdown: maxDrawdown,
      sharpeRatio: sharpeRatio,
      winRate: winRate,
      totalTrades: totalTrades,
      successfulTrades: successfulTrades,
      failedTrades: failedTrades,
      equityCurve: equityCurve,
      trades: trades,
      createdAt: new Date(),
    };
  }

  /**
   * Calculate Sharpe ratio from equity curve
   */
  private calculateSharpeRatio(equityCurve: EquityPoint[]): number {
    if (equityCurve.length < 2) {
      return 0;
    }

    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const return_ = (equityCurve[i].equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity;
      returns.push(return_);
    }

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    return stdDev > 0 ? avgReturn / stdDev : 0;
  }

  /**
   * Get backtest results for a user
   */
  async getBacktestResults(userId: string, page: number = 1, limit: number = 10): Promise<BacktestResult[]> {
    try {
      const results = await this.prisma.backtestResult.findMany({
        where: { userId: userId },
        include: {
          leader: {
            select: {
              id: true,
              handle: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return results;
    } catch (error) {
      this.logger.error('Error getting backtest results:', error);
      throw error;
    }
  }

  /**
   * Get a specific backtest result
   */
  async getBacktestResult(resultId: string): Promise<BacktestResult | null> {
    try {
      const result = await this.prisma.backtestResult.findUnique({
        where: { id: resultId },
        include: {
          leader: {
            select: {
              id: true,
              handle: true,
            },
          },
        },
      });

      return result;
    } catch (error) {
      this.logger.error('Error getting backtest result:', error);
      throw error;
    }
  }

  /**
   * Compare multiple backtest results
   */
  async compareBacktests(resultIds: string[]): Promise<BacktestResult[]> {
    try {
      const results = await this.prisma.backtestResult.findMany({
        where: {
          id: {
            in: resultIds,
          },
        },
        include: {
          leader: {
            select: {
              id: true,
              handle: true,
            },
          },
        },
        orderBy: { totalReturnPercent: 'desc' },
      });

      return results;
    } catch (error) {
      this.logger.error('Error comparing backtests:', error);
      throw error;
    }
  }

  /**
   * Get backtest statistics for a leader
   */
  async getLeaderBacktestStats(leaderId: string): Promise<any> {
    try {
      const results = await this.prisma.backtestResult.findMany({
        where: { leaderId: leaderId },
        select: {
          totalReturnPercent: true,
          maxDrawdown: true,
          sharpeRatio: true,
          winRate: true,
          totalTrades: true,
        },
      });

      if (results.length === 0) {
        return null;
      }

      const avgReturn = results.reduce((sum, r) => sum + r.totalReturnPercent, 0) / results.length;
      const avgDrawdown = results.reduce((sum, r) => sum + r.maxDrawdown, 0) / results.length;
      const avgSharpe = results.reduce((sum, r) => sum + r.sharpeRatio, 0) / results.length;
      const avgWinRate = results.reduce((sum, r) => sum + r.winRate, 0) / results.length;

      return {
        totalBacktests: results.length,
        averageReturn: avgReturn,
        averageDrawdown: avgDrawdown,
        averageSharpeRatio: avgSharpe,
        averageWinRate: avgWinRate,
        bestReturn: Math.max(...results.map(r => r.totalReturnPercent)),
        worstReturn: Math.min(...results.map(r => r.totalReturnPercent)),
      };
    } catch (error) {
      this.logger.error('Error getting leader backtest stats:', error);
      throw error;
    }
  }

  /**
   * Delete a backtest result
   */
  async deleteBacktestResult(userId: string, resultId: string): Promise<void> {
    try {
      await this.prisma.backtestResult.deleteMany({
        where: {
          id: resultId,
          userId: userId,
        },
      });
    } catch (error) {
      this.logger.error('Error deleting backtest result:', error);
      throw error;
    }
  }
} 