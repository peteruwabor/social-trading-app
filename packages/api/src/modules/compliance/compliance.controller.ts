import { Controller, Get, Post, Body, Request, UseGuards } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { AuthGuard } from '../../lib/auth.guard';

@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('kyc-status')
  @UseGuards(AuthGuard)
  async getKYCStatus(@Request() req: any) {
    return this.complianceService.getKYCStatus(req.user.id);
  }

  @Post('submit-kyc')
  @UseGuards(AuthGuard)
  async submitKYC(@Request() req: any, @Body() kycData: any) {
    return this.complianceService.submitKYC(req.user.id, kycData);
  }

  @Get('report')
  @UseGuards(AuthGuard)
  async getComplianceReport(@Request() req: any) {
    return this.complianceService.getComplianceReport(req.user.id);
  }
} 