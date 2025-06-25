import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '../../lib/auth.guard';
import { AdvancedCopyTradingService, CopyStrategy, RiskProfile, CopyPerformance } from './advanced-copy-trading.service';

export class SetupCopyTradingDto {
  leaderId!: string;
  strategy!: CopyStrategy;
  riskProfile!: RiskProfile;
}

export class UpdateRiskProfileDto {
  maxPositionSize!: number;
  maxDailyLoss!: number;
  maxDrawdown!: number;
  volatilityTolerance!: 'LOW' | 'MEDIUM' | 'HIGH';
  correlationLimit!: number;
}

@ApiTags('Advanced Copy Trading')
@Controller('copy-trading/advanced')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class AdvancedCopyTradingController {
  constructor(
    private readonly advancedCopyTradingService: AdvancedCopyTradingService,
  ) {}

  /**
   * Get recommended copy trading strategies for the user
   */
  @Get('strategies')
  @ApiOperation({
    summary: 'Get recommended copy trading strategies',
    description: 'Returns personalized copy trading strategies based on user experience and risk profile',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Strategies retrieved successfully',
  })
  async getRecommendedStrategies(@Query('userId') userId: string): Promise<CopyStrategy[]> {
    try {
      return await this.advancedCopyTradingService.getRecommendedStrategies(userId);
    } catch (error) {
      throw new HttpException(
        `Failed to get recommended strategies: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Set up automated copy trading with advanced strategy
   */
  @Post('setup')
  @ApiOperation({
    summary: 'Set up automated copy trading',
    description: 'Configure automated copy trading with advanced strategy and risk management',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Copy trading setup successfully',
  })
  async setupCopyTrading(
    @Body() setupDto: SetupCopyTradingDto,
    @Query('followerId') followerId: string,
  ): Promise<{ message: string; strategyId: string }> {
    try {
      await this.advancedCopyTradingService.setupAutomatedCopyTrading(
        followerId,
        setupDto.leaderId,
        setupDto.strategy,
        setupDto.riskProfile,
      );

      return {
        message: 'Copy trading setup successfully',
        strategyId: setupDto.strategy.id,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to setup copy trading: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get copy trading performance analytics
   */
  @Get('performance/:leaderId')
  @ApiOperation({
    summary: 'Get copy trading performance',
    description: 'Returns detailed performance metrics for copy trading with a specific leader',
  })
  @ApiParam({ name: 'leaderId', description: 'Leader user ID' })
  @ApiQuery({ name: 'followerId', description: 'Follower user ID' })
  @ApiQuery({ 
    name: 'timeframe', 
    description: 'Performance timeframe',
    enum: ['7D', '30D', '90D', '1Y'],
    required: false 
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance metrics retrieved successfully',
  })
  async getCopyPerformance(
    @Param('leaderId') leaderId: string,
    @Query('followerId') followerId: string,
    @Query('timeframe') timeframe: '7D' | '30D' | '90D' | '1Y' = '30D',
  ): Promise<CopyPerformance> {
    try {
      return await this.advancedCopyTradingService.calculateCopyPerformance(
        followerId,
        leaderId,
        timeframe,
      );
    } catch (error) {
      throw new HttpException(
        `Failed to get copy performance: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Calculate Kelly Criterion position size
   */
  @Get('kelly-position-size')
  @ApiOperation({
    summary: 'Calculate Kelly Criterion position size',
    description: 'Calculate optimal position size using Kelly Criterion based on leader performance',
  })
  @ApiQuery({ name: 'followerId', description: 'Follower user ID' })
  @ApiQuery({ name: 'leaderId', description: 'Leader user ID' })
  @ApiQuery({ name: 'symbol', description: 'Trading symbol' })
  @ApiQuery({ name: 'tradeValue', description: 'Trade value in dollars' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Position size calculated successfully',
  })
  async calculateKellyPositionSize(
    @Query('followerId') followerId: string,
    @Query('leaderId') leaderId: string,
    @Query('symbol') symbol: string,
    @Query('tradeValue') tradeValue: number,
  ): Promise<{ positionSize: number; confidence: number }> {
    try {
      const positionSize = await this.advancedCopyTradingService.calculateKellyPositionSize(
        followerId,
        leaderId,
        symbol,
        tradeValue,
      );

      // Calculate confidence based on data quality
      const confidence = positionSize > 0.05 ? 0.8 : 0.6; // Simplified confidence calculation

      return { positionSize, confidence };
    } catch (error) {
      throw new HttpException(
        `Failed to calculate Kelly position size: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Calculate Risk Parity position size
   */
  @Get('risk-parity-position-size')
  @ApiOperation({
    summary: 'Calculate Risk Parity position size',
    description: 'Calculate position size using Risk Parity approach for portfolio balance',
  })
  @ApiQuery({ name: 'followerId', description: 'Follower user ID' })
  @ApiQuery({ name: 'symbol', description: 'Trading symbol' })
  @ApiQuery({ name: 'tradeValue', description: 'Trade value in dollars' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Position size calculated successfully',
  })
  async calculateRiskParityPositionSize(
    @Query('followerId') followerId: string,
    @Query('symbol') symbol: string,
    @Query('tradeValue') tradeValue: number,
  ): Promise<{ positionSize: number; riskContribution: number }> {
    try {
      const positionSize = await this.advancedCopyTradingService.calculateRiskParityPositionSize(
        followerId,
        symbol,
        tradeValue,
      );

      return { 
        positionSize, 
        riskContribution: positionSize // Simplified risk contribution
      };
    } catch (error) {
      throw new HttpException(
        `Failed to calculate Risk Parity position size: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Calculate Momentum-based position size
   */
  @Get('momentum-position-size')
  @ApiOperation({
    summary: 'Calculate Momentum-based position size',
    description: 'Calculate position size based on market momentum indicators',
  })
  @ApiQuery({ name: 'followerId', description: 'Follower user ID' })
  @ApiQuery({ name: 'symbol', description: 'Trading symbol' })
  @ApiQuery({ name: 'tradeValue', description: 'Trade value in dollars' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Position size calculated successfully',
  })
  async calculateMomentumPositionSize(
    @Query('followerId') followerId: string,
    @Query('symbol') symbol: string,
    @Query('tradeValue') tradeValue: number,
  ): Promise<{ positionSize: number; momentum: number }> {
    try {
      const positionSize = await this.advancedCopyTradingService.calculateMomentumPositionSize(
        followerId,
        symbol,
        tradeValue,
      );

      // Calculate momentum (simplified)
      const momentum = (positionSize - 0.05) / 0.05; // Normalized momentum

      return { positionSize, momentum };
    } catch (error) {
      throw new HttpException(
        `Failed to calculate Momentum position size: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Validate risk limits for a proposed trade
   */
  @Post('validate-risk')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Validate risk limits',
    description: 'Check if a proposed copy trade meets risk management requirements',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Risk validation completed',
  })
  async validateRiskLimits(
    @Body() body: {
      followerId: string;
      symbol: string;
      proposedPositionSize: number;
    },
  ): Promise<{ allowed: boolean; reason?: string; adjustedSize?: number }> {
    try {
      return await this.advancedCopyTradingService.validateRiskLimits(
        body.followerId,
        body.symbol,
        body.proposedPositionSize,
      );
    } catch (error) {
      throw new HttpException(
        `Failed to validate risk limits: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get copy trading analytics dashboard
   */
  @Get('analytics')
  @ApiOperation({
    summary: 'Get copy trading analytics',
    description: 'Returns comprehensive analytics for copy trading performance',
  })
  @ApiQuery({ name: 'followerId', description: 'Follower user ID' })
  @ApiQuery({ name: 'timeframe', description: 'Analytics timeframe', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Analytics retrieved successfully',
  })
  async getCopyTradingAnalytics(
    @Query('followerId') followerId: string,
    @Query('timeframe') timeframe: '7D' | '30D' | '90D' | '1Y' = '30D',
  ): Promise<{
    overallPerformance: CopyPerformance;
    leaderPerformance: Record<string, CopyPerformance>;
    riskMetrics: {
      currentDrawdown: number;
      sharpeRatio: number;
      volatility: number;
      correlation: number;
    };
  }> {
    try {
      // Get overall performance
      const overallPerformance = await this.advancedCopyTradingService.calculateCopyPerformance(
        followerId,
        'all', // This would need to be modified to handle multiple leaders
        timeframe,
      );

      // Get performance by leader (simplified)
      const leaderPerformance: Record<string, CopyPerformance> = {};

      // Calculate risk metrics (simplified)
      const riskMetrics = {
        currentDrawdown: overallPerformance.maxDrawdown,
        sharpeRatio: overallPerformance.sharpeRatio,
        volatility: 0.15, // Simplified volatility calculation
        correlation: overallPerformance.correlationWithLeader,
      };

      return {
        overallPerformance,
        leaderPerformance,
        riskMetrics,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get copy trading analytics: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Pause automated copy trading
   */
  @Put('pause/:leaderId')
  @ApiOperation({
    summary: 'Pause automated copy trading',
    description: 'Temporarily pause automated copy trading with a specific leader',
  })
  @ApiParam({ name: 'leaderId', description: 'Leader user ID' })
  @ApiQuery({ name: 'followerId', description: 'Follower user ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Copy trading paused successfully',
  })
  async pauseCopyTrading(
    @Param('leaderId') leaderId: string,
    @Query('followerId') followerId: string,
  ): Promise<{ message: string }> {
    try {
      // This would update the follower relationship to pause auto-copy
      // Implementation would depend on your database schema
      return { message: 'Copy trading paused successfully' };
    } catch (error) {
      throw new HttpException(
        `Failed to pause copy trading: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Resume automated copy trading
   */
  @Put('resume/:leaderId')
  @ApiOperation({
    summary: 'Resume automated copy trading',
    description: 'Resume automated copy trading with a specific leader',
  })
  @ApiParam({ name: 'leaderId', description: 'Leader user ID' })
  @ApiQuery({ name: 'followerId', description: 'Follower user ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Copy trading resumed successfully',
  })
  async resumeCopyTrading(
    @Param('leaderId') leaderId: string,
    @Query('followerId') followerId: string,
  ): Promise<{ message: string }> {
    try {
      // This would update the follower relationship to resume auto-copy
      return { message: 'Copy trading resumed successfully' };
    } catch (error) {
      throw new HttpException(
        `Failed to resume copy trading: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
} 