import { Controller, Get, UseGuards, Request, HttpStatus, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TradeCaptureService, TradeAnalytics } from './trade-capture.service';
import { AuthGuard } from '../lib/auth.guard';

/**
 * DTO for trade history response
 */
export class TradeHistoryDto {
  id!: string;
  symbol!: string;
  side!: string;
  quantity!: number;
  fillPrice!: number;
  accountNumber!: string;
  filledAt!: Date;
  broker!: string;
}

/**
 * DTO for trade analytics response
 */
export class TradeAnalyticsDto {
  totalTrades!: number;
  totalVolume!: number;
  totalValue!: number;
  buyCount!: number;
  sellCount!: number;
  averageTradeSize!: number;
  mostTradedSymbol!: string;
  recentActivity!: any[];
}

/**
 * DTO for trade by symbol response
 */
export class TradeBySymbolDto {
  id!: string;
  side!: string;
  quantity!: number;
  fillPrice!: number;
  accountNumber!: string;
  filledAt!: Date;
}

/**
 * DTO for trade stats response
 */
export class TradeStatsDto {
  totalTrades!: number;
  totalVolume!: number;
  averagePrice!: number;
  lastTrade!: any;
}

@ApiTags('trades')
@Controller('trades')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class TradeCaptureController {
  constructor(private readonly tradeCaptureService: TradeCaptureService) {}

  /**
   * Get trade history for the authenticated user
   * @param req - Express request object containing user information
   * @param days - Number of days to look back (default: 30)
   * @returns Array of trade history records
   */
  @Get('history')
  @ApiOperation({
    summary: 'Get trade history',
    description: 'Retrieves trade history for the authenticated user',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to look back (default: 30)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trade history retrieved successfully',
    type: [TradeHistoryDto],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getTradeHistory(
    @Request() req: any,
    @Query('days') days?: string
  ): Promise<TradeHistoryDto[]> {
    const userId = req.user.id;
    const daysNumber = days ? parseInt(days, 10) : 30;
    const history = await this.tradeCaptureService.getTradeHistory(userId, daysNumber);
    
    return history;
  }

  /**
   * Get trade analytics for the authenticated user
   * @param req - Express request object containing user information
   * @param days - Number of days to look back (default: 30)
   * @returns Trade analytics data
   */
  @Get('analytics')
  @ApiOperation({
    summary: 'Get trade analytics',
    description: 'Retrieves trade analytics and statistics for the authenticated user',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to look back (default: 30)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trade analytics retrieved successfully',
    type: TradeAnalyticsDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getTradeAnalytics(
    @Request() req: any,
    @Query('days') days?: string
  ): Promise<TradeAnalyticsDto> {
    const userId = req.user.id;
    const daysNumber = days ? parseInt(days, 10) : 30;
    const analytics = await this.tradeCaptureService.getTradeAnalytics(userId, daysNumber);
    
    return analytics;
  }

  /**
   * Get trades by symbol for the authenticated user
   * @param req - Express request object containing user information
   * @param symbol - Stock symbol to filter by
   * @param days - Number of days to look back (default: 30)
   * @returns Array of trades for the specified symbol
   */
  @Get('symbol/:symbol')
  @ApiOperation({
    summary: 'Get trades by symbol',
    description: 'Retrieves trade history for a specific symbol for the authenticated user',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to look back (default: 30)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trades by symbol retrieved successfully',
    type: [TradeBySymbolDto],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getTradesBySymbol(
    @Request() req: any,
    @Param('symbol') symbol: string,
    @Query('days') days?: string
  ): Promise<TradeBySymbolDto[]> {
    const userId = req.user.id;
    const daysNumber = days ? parseInt(days, 10) : 30;
    const trades = await this.tradeCaptureService.getTradesBySymbol(userId, symbol, daysNumber);
    
    return trades;
  }

  /**
   * Get trade statistics for copy trading
   * @param req - Express request object containing user information
   * @param symbol - Stock symbol to get stats for
   * @param days - Number of days to look back (default: 7)
   * @returns Trade statistics for copy trading
   */
  @Get('stats/:symbol')
  @ApiOperation({
    summary: 'Get trade statistics for copy trading',
    description: 'Retrieves trade statistics for a specific symbol for copy trading purposes',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to look back (default: 7)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trade statistics retrieved successfully',
    type: TradeStatsDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getTradeStats(
    @Request() req: any,
    @Param('symbol') symbol: string,
    @Query('days') days?: string
  ): Promise<TradeStatsDto> {
    const userId = req.user.id;
    const daysNumber = days ? parseInt(days, 10) : 7;
    const stats = await this.tradeCaptureService.getTradeStatsForCopyTrading(userId, symbol, daysNumber);
    
    return stats;
  }

  /**
   * Manually trigger trade capture for testing
   * @param req - Express request object containing user information
   * @param connectionId - Broker connection ID to capture trades for
   * @returns Success message
   */
  @Get('capture/:connectionId')
  @ApiOperation({
    summary: 'Manually trigger trade capture',
    description: 'Manually triggers trade capture for a specific broker connection (for testing)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trade capture triggered successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Connection not found',
  })
  async manualCaptureTrades(
    @Request() req: any,
    @Param('connectionId') connectionId: string
  ): Promise<{ message: string }> {
    const userId = req.user.id;
    
    // Verify the connection belongs to the user
    const connection = await this.tradeCaptureService['prisma'].brokerConnection.findFirst({
      where: {
        id: connectionId,
        userId: userId,
      },
    });

    if (!connection) {
      throw new Error('Connection not found or access denied');
    }

    await this.tradeCaptureService.manualCaptureTrades(connectionId);
    
    return { message: 'Trade capture completed successfully' };
  }
} 