import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '../../lib/auth.guard';
import { SocialService, FollowRequest, SearchFilters } from './social.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('social')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('social')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Get('discover')
  @ApiOperation({ summary: 'Discover traders with filters' })
  @ApiResponse({ status: 200, description: 'Traders retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'riskTolerance', required: false, type: String, isArray: true })
  @ApiQuery({ name: 'tradingExperience', required: false, type: String, isArray: true })
  @ApiQuery({ name: 'markets', required: false, type: String, isArray: true })
  @ApiQuery({ name: 'minReturn', required: false, type: Number })
  @ApiQuery({ name: 'maxDrawdown', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['return', 'winRate', 'followers', 'recent'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async discoverTraders(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('riskTolerance') riskTolerance?: string | string[],
    @Query('tradingExperience') tradingExperience?: string | string[],
    @Query('markets') markets?: string | string[],
    @Query('minReturn') minReturn?: string,
    @Query('maxDrawdown') maxDrawdown?: string,
    @Query('sortBy') sortBy?: 'return' | 'winRate' | 'followers' | 'recent',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc'
  ) {
    const filters: SearchFilters = {
      riskTolerance: Array.isArray(riskTolerance) ? riskTolerance : riskTolerance ? [riskTolerance] : undefined,
      tradingExperience: Array.isArray(tradingExperience) ? tradingExperience : tradingExperience ? [tradingExperience] : undefined,
      markets: Array.isArray(markets) ? markets : markets ? [markets] : undefined,
      minReturn: minReturn ? parseFloat(minReturn) : undefined,
      maxDrawdown: maxDrawdown ? parseFloat(maxDrawdown) : undefined,
      sortBy,
      sortOrder
    };

    return this.socialService.discoverTraders(
      req.user.sub,
      filters,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20
    );
  }

  @Get('trader/:traderId')
  @ApiOperation({ summary: 'Get detailed trader profile' })
  @ApiResponse({ status: 200, description: 'Trader profile retrieved successfully' })
  async getTraderProfile(@Request() req: any, @Param('traderId') traderId: string) {
    return this.socialService.getTraderProfile(req.user.sub, traderId);
  }

  @Post('follow')
  @ApiOperation({ summary: 'Follow a trader' })
  @ApiResponse({ status: 200, description: 'Trader followed successfully' })
  async followTrader(@Request() req: any, @Body() followRequest: FollowRequest) {
    return this.socialService.followTrader(req.user.sub, followRequest);
  }

  @Delete('follow/:traderId')
  @ApiOperation({ summary: 'Unfollow a trader' })
  @ApiResponse({ status: 200, description: 'Trader unfollowed successfully' })
  async unfollowTrader(@Request() req: any, @Param('traderId') traderId: string) {
    return this.socialService.unfollowTrader(req.user.sub, traderId);
  }

  @Get('following')
  @ApiOperation({ summary: 'Get list of traders user is following' })
  @ApiResponse({ status: 200, description: 'Following list retrieved successfully' })
  async getFollowing(@Request() req: any) {
    return this.socialService.getFollowing(req.user.sub);
  }

  @Get('followers')
  @ApiOperation({ summary: 'Get list of user followers' })
  @ApiResponse({ status: 200, description: 'Followers list retrieved successfully' })
  async getFollowers(@Request() req: any) {
    return this.socialService.getFollowers(req.user.sub);
  }
} 