import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';
import { createObjectCsvWriter } from 'csv-writer';
import { Readable } from 'stream';

export interface TaxExportConfig {
  userId: string;
  year: number;
  format: 'CSV' | 'JSON';
  includeUnrealized: boolean;
  includeRealized: boolean;
  includeDividends: boolean;
  includeFees: boolean;
}

export interface TaxRecord {
  date: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  proceeds: number;
  costBasis: number;
  gainLoss: number;
  gainLossType: 'SHORT_TERM' | 'LONG_TERM';
  holdingPeriod: number; // Days
  washSale: boolean;
  washSaleAdjustment: number;
}

export interface TaxSummary {
  totalProceeds: number;
  totalCostBasis: number;
  totalGainLoss: number;
  shortTermGainLoss: number;
  longTermGainLoss: number;
  washSaleAdjustments: number;
  totalFees: number;
  totalDividends: number;
  totalTrades: number;
  realizedTrades: number;
  unrealizedPositions: number;
}

@Injectable()
export class TaxExportService {
  private readonly logger = new Logger(TaxExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate tax export for a user
   */
  async generateTaxExport(config: TaxExportConfig): Promise<{ data: string | Buffer; filename: string; summary: TaxSummary }> {
    try {
      this.logger.log(`Generating tax export for user ${config.userId} for year ${config.year}`);

      // Get all trades for the year
      const startDate = new Date(config.year, 0, 1);
      const endDate = new Date(config.year, 11, 31, 23, 59, 59);

      const trades = await this.prisma.trade.findMany({
        where: {
          userId: config.userId,
          filledAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { filledAt: 'asc' },
      });

      if (trades.length === 0) {
        throw new Error('No trades found for the specified year');
      }

      // Process trades and calculate tax records
      const taxRecords = await this.processTradesForTax(trades, config);

      // Calculate summary
      const summary = this.calculateTaxSummary(taxRecords);

      // Generate export file
      let data: string | Buffer;
      let filename: string;

      if (config.format === 'CSV') {
        data = await this.generateCSV(taxRecords, config);
        filename = `tax_export_${config.userId}_${config.year}.csv`;
      } else {
        data = JSON.stringify({ records: taxRecords, summary }, null, 2);
        filename = `tax_export_${config.userId}_${config.year}.json`;
      }

      this.logger.log(`Tax export generated: ${filename}`);
      return { data, filename, summary };
    } catch (error) {
      this.logger.error('Error generating tax export:', error);
      throw error;
    }
  }

  /**
   * Process trades and calculate tax records
   */
  private async processTradesForTax(trades: any[], config: TaxExportConfig): Promise<TaxRecord[]> {
    const taxRecords: TaxRecord[] = [];
    const positions = new Map<string, { quantity: number; avgPrice: number; buyDates: Date[] }>();

    for (const trade of trades) {
      const symbol = trade.symbol;
      const side = trade.side;
      const quantity = Number(trade.quantity);
      const price = Number(trade.fillPrice);
      const date = trade.filledAt;

      if (side === 'BUY') {
        // Buy trade - add to position
        if (positions.has(symbol)) {
          const position = positions.get(symbol)!;
          const totalQuantity = position.quantity + quantity;
          const totalCost = (position.quantity * position.avgPrice) + (quantity * price);
          
          position.quantity = totalQuantity;
          position.avgPrice = totalCost / totalQuantity;
          
          // Add buy dates for this quantity
          for (let i = 0; i < quantity; i++) {
            position.buyDates.push(date);
          }
        } else {
          // New position
          const buyDates: Date[] = [];
          for (let i = 0; i < quantity; i++) {
            buyDates.push(date);
          }
          
          positions.set(symbol, {
            quantity: quantity,
            avgPrice: price,
            buyDates: buyDates,
          });
        }
      } else {
        // Sell trade - calculate gains/losses
        const position = positions.get(symbol);
        if (position && position.quantity >= quantity) {
          // Calculate gains/losses using FIFO method
          const soldShares = this.getSoldShares(position.buyDates, quantity);
          
          for (const soldShare of soldShares) {
            const holdingPeriod = this.calculateHoldingPeriod(soldShare.buyDate, date);
            const gainLoss = price - soldShare.costBasis;
            const gainLossType = holdingPeriod > 365 ? 'LONG_TERM' : 'SHORT_TERM';
            
            // Check for wash sale (simplified - in reality, more complex rules apply)
            const washSale = this.isWashSale(soldShare.buyDate, date);
            const washSaleAdjustment = washSale ? Math.abs(gainLoss) * 0.1 : 0; // Simplified adjustment

            taxRecords.push({
              date: date.toISOString().split('T')[0],
              symbol: symbol,
              side: 'SELL',
              quantity: 1,
              price: price,
              proceeds: price,
              costBasis: soldShare.costBasis,
              gainLoss: gainLoss,
              gainLossType: gainLossType,
              holdingPeriod: holdingPeriod,
              washSale: washSale,
              washSaleAdjustment: washSaleAdjustment,
            });
          }

          // Update position
          position.quantity -= quantity;
          if (position.quantity === 0) {
            positions.delete(symbol);
          } else {
            // Remove sold shares from buy dates
            for (let i = 0; i < quantity; i++) {
              position.buyDates.shift();
            }
          }
        }
      }
    }

    return taxRecords;
  }

  /**
   * Get sold shares using FIFO method
   */
  private getSoldShares(buyDates: Date[], quantity: number): Array<{ buyDate: Date; costBasis: number }> {
    const soldShares: Array<{ buyDate: Date; costBasis: number }> = [];
    
    // Use FIFO - take the oldest shares first
    for (let i = 0; i < quantity && i < buyDates.length; i++) {
      soldShares.push({
        buyDate: buyDates[i],
        costBasis: 0, // Will be calculated based on position average
      });
    }
    
    return soldShares;
  }

  /**
   * Calculate holding period in days
   */
  private calculateHoldingPeriod(buyDate: Date, sellDate: Date): number {
    const diffTime = sellDate.getTime() - buyDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if trade is a wash sale (simplified)
   */
  private isWashSale(buyDate: Date, sellDate: Date): boolean {
    const diffTime = sellDate.getTime() - buyDate.getTime();
    const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Wash sale if sold within 30 days of purchase (simplified rule)
    return daysDiff <= 30;
  }

  /**
   * Calculate tax summary
   */
  private calculateTaxSummary(taxRecords: TaxRecord[]): TaxSummary {
    let totalProceeds = 0;
    let totalCostBasis = 0;
    let totalGainLoss = 0;
    let shortTermGainLoss = 0;
    let longTermGainLoss = 0;
    let washSaleAdjustments = 0;

    for (const record of taxRecords) {
      totalProceeds += record.proceeds;
      totalCostBasis += record.costBasis;
      totalGainLoss += record.gainLoss;
      washSaleAdjustments += record.washSaleAdjustment;

      if (record.gainLossType === 'SHORT_TERM') {
        shortTermGainLoss += record.gainLoss;
      } else {
        longTermGainLoss += record.gainLoss;
      }
    }

    return {
      totalProceeds,
      totalCostBasis,
      totalGainLoss,
      shortTermGainLoss,
      longTermGainLoss,
      washSaleAdjustments,
      totalFees: 0, // Would need to be calculated from actual fee data
      totalDividends: 0, // Would need to be calculated from dividend data
      totalTrades: taxRecords.length,
      realizedTrades: taxRecords.length,
      unrealizedPositions: 0, // Would need to be calculated from current positions
    };
  }

  /**
   * Generate CSV export
   */
  private async generateCSV(taxRecords: TaxRecord[], config: TaxExportConfig): Promise<string> {
    return new Promise((resolve, reject) => {
      const csvWriter = createObjectCsvWriter({
        path: '/tmp/temp_export.csv',
        header: [
          { id: 'date', title: 'Date' },
          { id: 'symbol', title: 'Symbol' },
          { id: 'side', title: 'Side' },
          { id: 'quantity', title: 'Quantity' },
          { id: 'price', title: 'Price' },
          { id: 'proceeds', title: 'Proceeds' },
          { id: 'costBasis', title: 'Cost Basis' },
          { id: 'gainLoss', title: 'Gain/Loss' },
          { id: 'gainLossType', title: 'Gain/Loss Type' },
          { id: 'holdingPeriod', title: 'Holding Period (Days)' },
          { id: 'washSale', title: 'Wash Sale' },
          { id: 'washSaleAdjustment', title: 'Wash Sale Adjustment' },
        ],
      });

      csvWriter.writeRecords(taxRecords)
        .then(() => {
          // Read the file and return as string
          const fs = require('fs');
          const data = fs.readFileSync('/tmp/temp_export.csv', 'utf8');
          fs.unlinkSync('/tmp/temp_export.csv'); // Clean up
          resolve(data);
        })
        .catch(reject);
    });
  }

  /**
   * Get tax export history for a user
   */
  async getTaxExportHistory(userId: string): Promise<any[]> {
    try {
      const exports = await this.prisma.taxExport.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          year: true,
          format: true,
          summary: true,
          createdAt: true,
        },
      });

      return exports;
    } catch (error) {
      this.logger.error('Error getting tax export history:', error);
      throw error;
    }
  }

  /**
   * Get tax summary for a specific year
   */
  async getTaxSummary(userId: string, year: number): Promise<TaxSummary | null> {
    try {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);

      const trades = await this.prisma.trade.findMany({
        where: {
          userId: userId,
          filledAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { filledAt: 'asc' },
      });

      if (trades.length === 0) {
        return null;
      }

      const taxRecords = await this.processTradesForTax(trades, {
        userId,
        year,
        format: 'CSV',
        includeUnrealized: false,
        includeRealized: true,
        includeDividends: false,
        includeFees: false,
      });

      return this.calculateTaxSummary(taxRecords);
    } catch (error) {
      this.logger.error('Error getting tax summary:', error);
      throw error;
    }
  }

  /**
   * Get unrealized gains/losses for current positions
   */
  async getUnrealizedGainsLosses(userId: string): Promise<any[]> {
    try {
      const holdings = await this.prisma.holding.findMany({
        where: { userId: userId },
        include: {
          trades: {
            where: { side: 'BUY' },
            orderBy: { filledAt: 'asc' },
          },
        },
      });

      const unrealized = [];

      for (const holding of holdings) {
        if (holding.trades.length > 0) {
          const avgCostBasis = holding.trades.reduce((sum, trade) => 
            sum + (Number(trade.quantity) * Number(trade.fillPrice)), 0
          ) / holding.trades.reduce((sum, trade) => sum + Number(trade.quantity), 0);

          const currentValue = Number(holding.marketValue);
          const unrealizedGainLoss = currentValue - avgCostBasis;

          unrealized.push({
            symbol: holding.symbol,
            quantity: holding.quantity,
            avgCostBasis: avgCostBasis,
            currentValue: currentValue,
            unrealizedGainLoss: unrealizedGainLoss,
            unrealizedGainLossPercent: (unrealizedGainLoss / avgCostBasis) * 100,
          });
        }
      }

      return unrealized;
    } catch (error) {
      this.logger.error('Error getting unrealized gains/losses:', error);
      throw error;
    }
  }

  /**
   * Save tax export record
   */
  async saveTaxExport(userId: string, year: number, format: string, summary: TaxSummary): Promise<void> {
    try {
      await this.prisma.taxExport.create({
        data: {
          userId: userId,
          year: year,
          format: format,
          summary: JSON.parse(JSON.stringify(summary)),
        },
      });
    } catch (error) {
      this.logger.error('Error saving tax export:', error);
      throw error;
    }
  }
} 