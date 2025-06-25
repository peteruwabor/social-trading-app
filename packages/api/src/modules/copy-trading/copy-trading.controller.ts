import { Controller, Get, Post, Put, Delete, Body, Request, Query, Param, UseGuards, BadRequestException, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CopyTradingService } from './copy-trading.service';
import { AuthGuard } from '../../lib/auth.guard';

@Controller('copy-trading')
@ApiTags('Copy Trading')
@UseGuards(AuthGuard)
export class CopyTradingController {
  constructor(private readonly copyTradingService: CopyTradingService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Get copy trading statistics',
    description: 'Retrieves comprehensive copy trading statistics for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Copy trading statistics retrieved successfully',
  })
  async getCopyTradingStats(@Request() req: any) {
    return this.copyTradingService.getCopyTradingStats(req.user.id);
  }

  @Get('risk-metrics')
  @ApiOperation({
    summary: 'Get risk metrics',
    description: 'Retrieves risk metrics for copy trading activity',
  })
  @ApiResponse({
    status: 200,
    description: 'Risk metrics retrieved successfully',
  })
  async getRiskMetrics(@Request() req: any) {
    return this.copyTradingService.getRiskMetrics(req.user.id);
  }

  @Get('leader-performance')
  @ApiOperation({
    summary: 'Get performance by leader',
    description: 'Retrieves copy trading performance broken down by leader',
  })
  @ApiResponse({
    status: 200,
    description: 'Leader performance data retrieved successfully',
  })
  async getLeaderPerformance(@Request() req: any) {
    return this.copyTradingService.getLeaderPerformance(req.user.id);
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get copy order history',
    description: 'Retrieves copy order history with optional filtering',
  })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by order status' })
  @ApiQuery({ name: 'symbol', required: false, description: 'Filter by symbol' })
  @ApiQuery({ name: 'leaderId', required: false, description: 'Filter by leader ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter by start date' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date' })
  @ApiResponse({
    status: 200,
    description: 'Copy order history retrieved successfully',
  })
  async getCopyOrderHistory(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('symbol') symbol?: string,
    @Query('leaderId') leaderId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: any = {};
    
    if (status) filters.status = status;
    if (symbol) filters.symbol = symbol;
    if (leaderId) filters.leaderId = leaderId;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    return this.copyTradingService.getCopyOrderHistory(req.user.id, filters);
  }

  @Post('cancel/:copyOrderId')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Cancel copy order',
    description: 'Cancels a pending copy order',
  })
  @ApiResponse({
    status: 200,
    description: 'Copy order cancelled successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Copy order not found or cannot be cancelled',
  })
  async cancelCopyOrder(
    @Request() req: any,
    @Param('copyOrderId') copyOrderId: string,
  ) {
    try {
      return await this.copyTradingService.cancelCopyOrder(req.user.id, copyOrderId);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  @Get('settings')
  @ApiOperation({
    summary: 'Get copy trading settings',
    description: 'Retrieves copy trading settings and guardrails for the user',
  })
  @ApiResponse({
    status: 200,
    description: 'Copy trading settings retrieved successfully',
  })
  async getCopyTradingSettings(@Request() req: any) {
    return this.copyTradingService.getCopyTradingSettings(req.user.id);
  }

  @Put('settings/:leaderId')
  @ApiOperation({
    summary: 'Update copy trading settings',
    description: 'Updates copy trading settings for a specific leader',
  })
  @ApiResponse({
    status: 200,
    description: 'Copy trading settings updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Not following this leader',
  })
  async updateCopyTradingSettings(
    @Request() req: any,
    @Param('leaderId') leaderId: string,
    @Body() settings: {
      autoCopy?: boolean;
      alertOnly?: boolean;
      autoCopyPaused?: boolean;
    },
  ) {
    try {
      return await this.copyTradingService.updateCopyTradingSettings(req.user.id, leaderId, settings);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  @Post('guardrails/position-limit')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Set position limit',
    description: 'Sets a position limit guardrail for copy trading',
  })
  @ApiResponse({
    status: 200,
    description: 'Position limit set successfully',
  })
  async setPositionLimit(
    @Request() req: any,
    @Body() body: {
      symbol?: string; // null for global limit
      maxPct: number;
    },
  ) {
    if (!body.maxPct || body.maxPct <= 0 || body.maxPct > 100) {
      throw new BadRequestException('maxPct must be between 0 and 100');
    }

    return this.copyTradingService.setPositionLimit(req.user.id, body.symbol || null, body.maxPct);
  }

  @Delete('guardrails/position-limit')
  @ApiOperation({
    summary: 'Remove position limit',
    description: 'Removes a position limit guardrail',
  })
  @ApiResponse({
    status: 200,
    description: 'Position limit removed successfully',
  })
  async removePositionLimit(
    @Request() req: any,
    @Body() body: { symbol?: string },
  ) {
    return this.copyTradingService.removePositionLimit(req.user.id, body.symbol || null);
  }

  @Get('analytics/symbol/:symbol')
  @ApiOperation({
    summary: 'Get symbol analytics',
    description: 'Retrieves copy trading analytics for a specific symbol',
  })
  @ApiResponse({
    status: 200,
    description: 'Symbol analytics retrieved successfully',
  })
  async getSymbolAnalytics(
    @Request() req: any,
    @Param('symbol') symbol: string,
  ) {
    const history = await this.copyTradingService.getCopyOrderHistory(req.user.id, { symbol });
    
    const totalTrades = history.length;
    const successfulTrades = history.filter(order => order.status === 'FILLED').length;
    const totalVolume = history.reduce((sum, order) => sum + order.quantity, 0);
    const averageDelay = history
      .filter(order => order.filledAt && order.leaderTrade)
      .reduce((sum, order) => {
        const delay = order.filledAt!.getTime() - order.leaderTrade.filledAt.getTime();
        return sum + delay;
      }, 0) / Math.max(1, history.filter(order => order.filledAt).length);

    return {
      symbol,
      totalTrades,
      successfulTrades,
      successRate: totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0,
      totalVolume,
      averageDelay,
      trades: history.slice(0, 10), // Last 10 trades
    };
  }

  @Get('analytics/leaders/top')
  @ApiOperation({
    summary: 'Get top performing leaders',
    description: 'Retrieves top performing leaders based on copy trading success',
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of leaders to return', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Top leaders retrieved successfully',
  })
  async getTopLeaders(
    @Request() req: any,
    @Query('limit') limit: string = '10',
  ) {
    const leaderPerformance = await this.copyTradingService.getLeaderPerformance(req.user.id);
    
    // Sort by success rate and return top N
    const sortedLeaders = leaderPerformance
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, parseInt(limit));

    return {
      leaders: sortedLeaders,
      totalLeaders: leaderPerformance.length,
    };
  }

  @Get('analytics/performance-trends')
  @ApiOperation({
    summary: 'Get performance trends',
    description: 'Retrieves copy trading performance trends over time',
  })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to analyze', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Performance trends retrieved successfully',
  })
  async getPerformanceTrends(
    @Request() req: any,
    @Query('days') days: string = '30',
  ) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const history = await this.copyTradingService.getCopyOrderHistory(req.user.id, {
      startDate,
      endDate,
    });

    // Group by day
    const dailyStats = history.reduce((acc, order) => {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          date,
          totalTrades: 0,
          successfulTrades: 0,
          totalVolume: 0,
        };
      }

      acc[date].totalTrades++;
      if (order.status === 'FILLED') {
        acc[date].successfulTrades++;
      }
      acc[date].totalVolume += order.quantity;

      return acc;
    }, {} as Record<string, any>);

    const trends = Object.values(dailyStats).map((stat: any) => ({
      ...stat,
      successRate: stat.totalTrades > 0 ? (stat.successfulTrades / stat.totalTrades) * 100 : 0,
    }));

    return {
      period: `${days} days`,
      trends,
      summary: {
        totalTrades: trends.reduce((sum, day) => sum + day.totalTrades, 0),
        averageSuccessRate: trends.reduce((sum, day) => sum + day.successRate, 0) / Math.max(1, trends.length),
        totalVolume: trends.reduce((sum, day) => sum + day.totalVolume, 0),
      },
    };
  }
} 