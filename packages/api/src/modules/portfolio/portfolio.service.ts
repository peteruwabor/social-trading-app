import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';
import { LRUCache } from 'lru-cache';

/**
 * Represents a portfolio position with allocation percentage
 */
export interface PortfolioPosition {
  symbol: string;
  quantity: number;
  marketValue: number;
  allocationPct: number;
  costBasis?: number;
  unrealizedPnL?: number;
  accountNumber?: string;
}

/**
 * Represents a complete portfolio with NAV and positions
 */
export interface Portfolio {
  nav: number;
  positions: PortfolioPosition[];
}

/**
 * Represents a multi-account portfolio
 */
export interface MultiAccountPortfolio {
  totalNav: number;
  accounts: {
    broker: string;
    accountNumber: string;
    nav: number;
    positions: PortfolioPosition[];
  }[];
}

/**
 * Represents portfolio performance data
 */
export interface PortfolioPerformance {
  currentNav: number;
  change24h: number;
  changePercent24h: number;
  change7d: number;
  changePercent7d: number;
  change30d: number;
  changePercent30d: number;
}

@Injectable()
export class PortfolioService {
  private readonly portfolioCache: LRUCache<string, Portfolio>;
  private readonly performanceCache: LRUCache<string, PortfolioPerformance>;

  constructor(private readonly prisma: PrismaService) {
    this.portfolioCache = new LRUCache<string, Portfolio>({
      max: 1000, // Maximum number of items
      ttl: 60 * 1000, // 60 seconds TTL
      updateAgeOnGet: true, // Update age when accessed
    });
    
    this.performanceCache = new LRUCache<string, PortfolioPerformance>({
      max: 1000,
      ttl: 5 * 60 * 1000, // 5 minutes TTL
      updateAgeOnGet: true,
    });
  }

  /**
   * Generates cache key based on user ID and current hour
   */
  private generateCacheKey(userId: string): string {
    const hourOfDay = new Date().getHours();
    return `${userId}:${hourOfDay}`;
  }

  /**
   * Generates performance cache key
   */
  private generatePerformanceCacheKey(userId: string): string {
    return `${userId}:performance`;
  }

  /**
   * Retrieves and calculates portfolio data for a given user
   * @param userId - The user ID to get portfolio for
   * @returns Portfolio object with NAV and positions with allocation percentages
   * @throws NotFoundException if no holdings found for the user
   */
  async getPortfolio(userId: string): Promise<Portfolio> {
    const cacheKey = this.generateCacheKey(userId);
    
    // Check cache first
    const cachedPortfolio = this.portfolioCache.get(cacheKey);
    if (cachedPortfolio) {
      return cachedPortfolio;
    }

    try {
      // Query holdings for the user
      const holdings = await this.prisma.holding.findMany({
        where: {
          userId: userId,
        },
      });

      if (!holdings || holdings.length === 0) {
        throw new NotFoundException(`No portfolio holdings found for user ${userId}`);
      }

      // Calculate total NAV (sum of all market values)
      const nav = holdings.reduce((total, holding) => {
        return total + Number(holding.marketValue || 0);
      }, 0);

      // Calculate positions with allocation percentages
      const positions: PortfolioPosition[] = holdings.map(holding => {
        const marketValue = Number(holding.marketValue || 0);
        const allocationPct = nav > 0 ? Math.round((marketValue / nav) * 100 * 100) / 100 : 0;

        return {
          symbol: holding.symbol,
          quantity: Number(holding.quantity || 0),
          marketValue,
          allocationPct,
          accountNumber: holding.accountNumber,
        };
      });

      const portfolio: Portfolio = {
        nav,
        positions,
      };

      // Cache the result
      this.portfolioCache.set(cacheKey, portfolio);

      return portfolio;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to retrieve portfolio for user ${userId}: ${(error as Error).message}`);
    }
  }

  /**
   * Get multi-account portfolio summary
   * @param userId - The user ID to get multi-account portfolio for
   * @returns MultiAccountPortfolio object with accounts grouped by broker and account number
   */
  async getMultiAccountPortfolio(userId: string): Promise<MultiAccountPortfolio> {
    const holdings = await this.prisma.holding.findMany({
      where: { userId },
      include: {
        brokerConnection: true,
      },
    });

    if (!holdings || holdings.length === 0) {
      throw new NotFoundException(`No portfolio holdings found for user ${userId}`);
    }

    // Group by account
    const accounts = new Map<string, any>();
    let totalNav = 0;

    for (const holding of holdings) {
      const accountKey = `${holding.brokerConnection.broker}-${holding.accountNumber}`;
      const marketValue = Number(holding.marketValue);
      totalNav += marketValue;

      if (!accounts.has(accountKey)) {
        accounts.set(accountKey, {
          broker: holding.brokerConnection.broker,
          accountNumber: holding.accountNumber,
          nav: 0,
          positions: [],
        });
      }

      const account = accounts.get(accountKey);
      account.nav += marketValue;
      account.positions.push({
        symbol: holding.symbol,
        quantity: Number(holding.quantity),
        marketValue,
        allocationPct: 0, // Will be calculated below
        accountNumber: holding.accountNumber,
      });
    }

    // Calculate allocation percentages for each account
    for (const account of accounts.values()) {
      for (const position of account.positions) {
        position.allocationPct = account.nav > 0 ? (position.marketValue / account.nav) * 100 : 0;
      }
    }

    return {
      totalNav,
      accounts: Array.from(accounts.values()),
    };
  }

  /**
   * Get portfolio performance data
   * @param userId - The user ID to get performance data for
   * @returns PortfolioPerformance object with NAV changes over different time periods
   */
  async getPortfolioPerformance(userId: string): Promise<PortfolioPerformance> {
    const cacheKey = this.generatePerformanceCacheKey(userId);
    
    // Check cache first
    const cachedPerformance = this.performanceCache.get(cacheKey);
    if (cachedPerformance) {
      return cachedPerformance;
    }

    try {
      // Get current portfolio
      const currentPortfolio = await this.getPortfolio(userId);
      const currentNav = currentPortfolio.nav;

      // For now, we'll use mock data for historical performance
      // In a real implementation, this would query portfolio snapshots or historical data
      const mockHistoricalData = {
        nav24h: currentNav * 0.985, // 1.5% decrease
        nav7d: currentNav * 0.92,   // 8% decrease
        nav30d: currentNav * 0.85,  // 15% decrease
      };

      const performance: PortfolioPerformance = {
        currentNav,
        change24h: currentNav - mockHistoricalData.nav24h,
        changePercent24h: ((currentNav - mockHistoricalData.nav24h) / mockHistoricalData.nav24h) * 100,
        change7d: currentNav - mockHistoricalData.nav7d,
        changePercent7d: ((currentNav - mockHistoricalData.nav7d) / mockHistoricalData.nav7d) * 100,
        change30d: currentNav - mockHistoricalData.nav30d,
        changePercent30d: ((currentNav - mockHistoricalData.nav30d) / mockHistoricalData.nav30d) * 100,
      };

      // Cache the result
      this.performanceCache.set(cacheKey, performance);

      return performance;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to retrieve portfolio performance for user ${userId}: ${(error as Error).message}`);
    }
  }

  /**
   * Clears the portfolio cache (useful for testing or manual cache invalidation)
   */
  clearCache(): void {
    this.portfolioCache.clear();
    this.performanceCache.clear();
  }

  /**
   * Gets cache statistics (useful for monitoring)
   */
  getCacheStats(): { portfolioSize: number; performanceSize: number } {
    return {
      portfolioSize: this.portfolioCache.size,
      performanceSize: this.performanceCache.size,
    };
  }
} 