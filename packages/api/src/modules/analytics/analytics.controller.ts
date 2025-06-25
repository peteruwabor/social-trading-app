import { Controller, Get, Request, Query, Post, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '../../lib/auth.guard';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('performance')
  @UseGuards(AuthGuard)
  async getUserPerformance(
    @Request() req: any,
    @Query('timeframe') timeframe: string = '30d',
  ) {
    return this.analyticsService.getUserPerformance(req.user.id, timeframe);
  }

  @Get('portfolio')
  @UseGuards(AuthGuard)
  async getPortfolioAnalytics(@Request() req: any) {
    return this.analyticsService.getPortfolioAnalytics(req.user.id);
  }

  @Get('leaders')
  async getLeaderRankings(@Query('timeframe') timeframe: string = '30d') {
    return this.analyticsService.getLeaderRankings(timeframe);
  }

  @Get('platform')
  async getPlatformStatistics() {
    return this.analyticsService.getPlatformStatistics();
  }

  @Get('follower-metrics')
  @UseGuards(AuthGuard)
  async getFollowerSuccessMetrics(@Request() req: any) {
    return this.analyticsService.getFollowerSuccessMetrics(req.user.id);
  }

  @Post('portfolio-snapshot')
  @UseGuards(AuthGuard)
  async generatePortfolioSnapshot(@Request() req: any) {
    return this.analyticsService.generatePortfolioSnapshot(req.user.id);
  }

  @Get('portfolio-history')
  @UseGuards(AuthGuard)
  async getPortfolioHistory(
    @Request() req: any,
    @Query('days') days: string = '30',
  ) {
    return this.analyticsService.getPortfolioHistory(req.user.id, parseInt(days));
  }
} 