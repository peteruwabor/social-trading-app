import { Controller, Post, Get, Body, Param, UseGuards, Request, HttpStatus, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthGuard } from '../../lib/auth.guard';
import { TaxExportService, TaxExportConfig } from './tax-export.service';

export class GenerateTaxExportDto {
  year!: number;
  format!: 'CSV' | 'JSON';
  includeUnrealized?: boolean;
  includeRealized?: boolean;
  includeDividends?: boolean;
  includeFees?: boolean;
}

export class TaxSummaryDto {
  totalProceeds!: number;
  totalCostBasis!: number;
  totalGainLoss!: number;
  shortTermGainLoss!: number;
  longTermGainLoss!: number;
  washSaleAdjustments!: number;
  totalFees!: number;
  totalDividends!: number;
  totalTrades!: number;
  realizedTrades!: number;
  unrealizedPositions!: number;
}

export class TaxExportHistoryDto {
  id!: string;
  year!: number;
  format!: string;
  summary!: any;
  createdAt!: Date;
}

@Controller('tax-export')
@ApiTags('Tax Export')
@UseGuards(AuthGuard)
export class TaxExportController {
  constructor(private readonly taxExportService: TaxExportService) {}

  /**
   * Generate tax export for a specific year
   */
  @Post('generate')
  @ApiOperation({
    summary: 'Generate tax export',
    description: 'Generate tax export for a specific year with trading gains/losses',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tax export generated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid export configuration',
  })
  async generateTaxExport(
    @Body() dto: GenerateTaxExportDto,
    @Request() req: any,
    @Res() res: Response,
  ): Promise<void> {
    const config: TaxExportConfig = {
      userId: req.user.id,
      year: dto.year,
      format: dto.format,
      includeUnrealized: dto.includeUnrealized ?? false,
      includeRealized: dto.includeRealized ?? true,
      includeDividends: dto.includeDividends ?? false,
      includeFees: dto.includeFees ?? false,
    };

    const result = await this.taxExportService.generateTaxExport(config);

    // Save export record
    await this.taxExportService.saveTaxExport(req.user.id, dto.year, dto.format, result.summary);

    // Set response headers for file download
    res.setHeader('Content-Type', dto.format === 'CSV' ? 'text/csv' : 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    
    // Send the file data
    res.send(result.data);
  }

  /**
   * Get tax summary for a specific year
   */
  @Get('summary/:year')
  @ApiOperation({
    summary: 'Get tax summary',
    description: 'Get tax summary for a specific year without generating full export',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tax summary retrieved successfully',
    type: TaxSummaryDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No trades found for the specified year',
  })
  async getTaxSummary(
    @Param('year') year: number,
    @Request() req: any,
  ): Promise<TaxSummaryDto | null> {
    return this.taxExportService.getTaxSummary(req.user.id, year);
  }

  /**
   * Get unrealized gains/losses for current positions
   */
  @Get('unrealized')
  @ApiOperation({
    summary: 'Get unrealized gains/losses',
    description: 'Get unrealized gains/losses for current portfolio positions',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Unrealized gains/losses retrieved successfully',
  })
  async getUnrealizedGainsLosses(@Request() req: any): Promise<any[]> {
    return this.taxExportService.getUnrealizedGainsLosses(req.user.id);
  }

  /**
   * Get tax export history
   */
  @Get('history')
  @ApiOperation({
    summary: 'Get tax export history',
    description: 'Get history of tax exports for the authenticated user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tax export history retrieved successfully',
    type: [TaxExportHistoryDto],
  })
  async getTaxExportHistory(@Request() req: any): Promise<TaxExportHistoryDto[]> {
    return this.taxExportService.getTaxExportHistory(req.user.id);
  }

  /**
   * Preview tax export (returns summary without generating file)
   */
  @Post('preview')
  @ApiOperation({
    summary: 'Preview tax export',
    description: 'Preview tax export data without generating file download',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tax export preview generated successfully',
  })
  async previewTaxExport(
    @Body() dto: GenerateTaxExportDto,
    @Request() req: any,
  ): Promise<{ summary: TaxSummaryDto; recordCount: number }> {
    const config: TaxExportConfig = {
      userId: req.user.id,
      year: dto.year,
      format: 'JSON', // Always use JSON for preview
      includeUnrealized: dto.includeUnrealized ?? false,
      includeRealized: dto.includeRealized ?? true,
      includeDividends: dto.includeDividends ?? false,
      includeFees: dto.includeFees ?? false,
    };

    const result = await this.taxExportService.generateTaxExport(config);
    const data = JSON.parse(result.data as string);
    
    return {
      summary: data.summary,
      recordCount: data.records.length,
    };
  }

  /**
   * Get available years for tax export
   */
  @Get('available-years')
  @ApiOperation({
    summary: 'Get available years',
    description: 'Get list of years with trading activity for tax export',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Available years retrieved successfully',
  })
  async getAvailableYears(@Request() req: any): Promise<number[]> {
    // This would need to be implemented in the service
    // For now, return current year and previous year
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear];
  }

  /**
   * Get tax export statistics
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get tax export statistics',
    description: 'Get overall statistics for tax exports',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tax export statistics retrieved successfully',
  })
  async getTaxExportStats(@Request() req: any): Promise<any> {
    const history = await this.taxExportService.getTaxExportHistory(req.user.id);
    
    return {
      totalExports: history.length,
      lastExport: history.length > 0 ? history[0].createdAt : null,
      mostExportedYear: history.length > 0 ? 
        history.reduce((prev, current) => 
          history.filter(h => h.year === prev.year).length > 
          history.filter(h => h.year === current.year).length ? prev : current
        ).year : null,
      preferredFormat: history.length > 0 ?
        history.reduce((prev, current) => 
          history.filter(h => h.format === prev.format).length > 
          history.filter(h => h.format === current.format).length ? prev : current
        ).format : null,
    };
  }
} 