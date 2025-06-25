import { Controller, Get, UseGuards, Request, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PortfolioService, Portfolio, MultiAccountPortfolio, PortfolioPerformance } from './portfolio.service';
import { AuthGuard } from '../../lib/auth.guard';

/**
 * DTO for portfolio position response
 */
export class PortfolioPositionDto {
  symbol!: string;
  quantity!: number;
  marketValue!: number;
  allocationPct!: number;
  costBasis?: number;
  unrealizedPnL?: number;
  accountNumber?: string;
}

/**
 * DTO for portfolio response
 */
export class PortfolioDto {
  nav!: number;
  positions!: PortfolioPositionDto[];
}

/**
 * DTO for multi-account portfolio response
 */
export class MultiAccountPortfolioDto {
  totalNav!: number;
  accounts!: {
    broker: string;
    accountNumber: string;
    nav: number;
    positions: PortfolioPositionDto[];
  }[];
}

/**
 * DTO for portfolio performance response
 */
export class PortfolioPerformanceDto {
  currentNav!: number;
  change24h!: number;
  changePercent24h!: number;
  change7d!: number;
  changePercent7d!: number;
  change30d!: number;
  changePercent30d!: number;
}

/**
 * DTO for portfolio history response
 */
export class PortfolioHistoryDto {
  id!: string;
  nav!: number;
  snapshotAt!: Date;
  positions!: any[];
}

@ApiTags('portfolio')
@Controller('portfolio')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  /**
   * Get portfolio data for the authenticated user
   * @param req - Express request object containing user information
   * @returns Portfolio data with NAV and position allocations
   */
  @Get()
  @ApiOperation({
    summary: 'Get portfolio data',
    description: 'Retrieves portfolio data including NAV and position allocations for the authenticated user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portfolio data retrieved successfully',
    type: PortfolioDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No portfolio holdings found for the user',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getPortfolio(@Request() req: any): Promise<PortfolioDto> {
    const userId = req.user.id;
    const portfolio = await this.portfolioService.getPortfolio(userId);
    
    return portfolio;
  }

  /**
   * Get multi-account portfolio summary for the authenticated user
   * @param req - Express request object containing user information
   * @returns Multi-account portfolio data grouped by broker and account
   */
  @Get('multi-account')
  @ApiOperation({
    summary: 'Get multi-account portfolio',
    description: 'Retrieves portfolio data grouped by broker and account number for the authenticated user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Multi-account portfolio data retrieved successfully',
    type: MultiAccountPortfolioDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No portfolio holdings found for the user',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getMultiAccountPortfolio(@Request() req: any): Promise<MultiAccountPortfolioDto> {
    const userId = req.user.id;
    const portfolio = await this.portfolioService.getMultiAccountPortfolio(userId);
    
    return portfolio;
  }
} 