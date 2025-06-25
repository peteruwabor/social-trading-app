import { Controller, Post, Get, Delete, Body, Param, UseGuards, Request, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '../../lib/auth.guard';
import { BacktestingService, BacktestConfig } from './backtesting.service';

export class RunBacktestDto {
  leaderId!: string;
  startDate!: Date;
  endDate!: Date;
  initialCapital!: number;
  positionSize!: number;
  maxPositionSize!: number;
  stopLoss?: number;
  takeProfit?: number;
  slippage!: number;
  commission!: number;
}

export class BacktestResultDto {
  id!: string;
  userId!: string;
  leaderId!: string;
  startDate!: Date;
  endDate!: Date;
  initialCapital!: number;
  finalCapital!: number;
  totalReturn!: number;
  totalReturnPercent!: number;
  maxDrawdown!: number;
  sharpeRatio!: number;
  winRate!: number;
  totalTrades!: number;
  successfulTrades!: number;
  failedTrades!: number;
  equityCurve!: any[];
  trades!: any[];
  createdAt!: Date;
  leader?: {
    id: string;
    handle: string;
  };
}

export class CompareBacktestsDto {
  resultIds!: string[];
}

@Controller('backtesting')
@ApiTags('Backtesting')
@UseGuards(AuthGuard)
export class BacktestingController {
  constructor(private readonly backtestingService: BacktestingService) {}

  /**
   * Run a backtest simulation
   */
  @Post('run')
  @ApiOperation({
    summary: 'Run backtest',
    description: 'Run a backtest simulation following a leader\'s historical trades',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Backtest completed successfully',
    type: BacktestResultDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid backtest configuration',
  })
  async runBacktest(
    @Body() dto: RunBacktestDto,
    @Request() req: any,
  ): Promise<BacktestResultDto> {
    const config: BacktestConfig = {
      leaderId: dto.leaderId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      initialCapital: dto.initialCapital,
      positionSize: dto.positionSize,
      maxPositionSize: dto.maxPositionSize,
      stopLoss: dto.stopLoss,
      takeProfit: dto.takeProfit,
      slippage: dto.slippage,
      commission: dto.commission,
    };

    return this.backtestingService.runBacktest(req.user.id, config);
  }

  /**
   * Get backtest results for the authenticated user
   */
  @Get('results')
  @ApiOperation({
    summary: 'Get backtest results',
    description: 'Retrieve backtest results for the authenticated user',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Backtest results retrieved successfully',
    type: [BacktestResultDto],
  })
  async getBacktestResults(
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<BacktestResultDto[]> {
    return this.backtestingService.getBacktestResults(req.user.id, page, limit);
  }

  /**
   * Get a specific backtest result
   */
  @Get('results/:resultId')
  @ApiOperation({
    summary: 'Get backtest result',
    description: 'Retrieve a specific backtest result by ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Backtest result retrieved successfully',
    type: BacktestResultDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Backtest result not found',
  })
  async getBacktestResult(
    @Param('resultId') resultId: string,
  ): Promise<BacktestResultDto | null> {
    return this.backtestingService.getBacktestResult(resultId);
  }

  /**
   * Compare multiple backtest results
   */
  @Post('compare')
  @ApiOperation({
    summary: 'Compare backtests',
    description: 'Compare multiple backtest results side by side',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Backtest comparison completed successfully',
    type: [BacktestResultDto],
  })
  async compareBacktests(
    @Body() dto: CompareBacktestsDto,
  ): Promise<BacktestResultDto[]> {
    return this.backtestingService.compareBacktests(dto.resultIds);
  }

  /**
   * Get backtest statistics for a leader
   */
  @Get('leader/:leaderId/stats')
  @ApiOperation({
    summary: 'Get leader backtest stats',
    description: 'Get aggregated backtest statistics for a specific leader',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Leader backtest stats retrieved successfully',
  })
  async getLeaderBacktestStats(
    @Param('leaderId') leaderId: string,
  ): Promise<any> {
    return this.backtestingService.getLeaderBacktestStats(leaderId);
  }

  /**
   * Delete a backtest result
   */
  @Delete('results/:resultId')
  @ApiOperation({
    summary: 'Delete backtest result',
    description: 'Delete a specific backtest result',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Backtest result deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Backtest result not found',
  })
  async deleteBacktestResult(
    @Param('resultId') resultId: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    await this.backtestingService.deleteBacktestResult(req.user.id, resultId);
    return { message: 'Backtest result deleted successfully' };
  }

  /**
   * Get quick backtest with default settings
   */
  @Post('quick/:leaderId')
  @ApiOperation({
    summary: 'Quick backtest',
    description: 'Run a quick backtest with default settings for the last 30 days',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Quick backtest completed successfully',
    type: BacktestResultDto,
  })
  async quickBacktest(
    @Param('leaderId') leaderId: string,
    @Request() req: any,
  ): Promise<BacktestResultDto> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const config: BacktestConfig = {
      leaderId: leaderId,
      startDate: startDate,
      endDate: endDate,
      initialCapital: 10000, // Default $10,000
      positionSize: 0.05, // Default 5%
      maxPositionSize: 0.25, // Default 25%
      slippage: 0.001, // Default 0.1%
      commission: 0.005, // Default $5 per trade
    };

    return this.backtestingService.runBacktest(req.user.id, config);
  }
} 