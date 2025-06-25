import { Controller, Post, Body, Request, Get, UseGuards, BadRequestException } from '@nestjs/common';
import { AdminActionService } from './admin-action.service';
import { AuthGuard } from '../../lib/auth.guard';
import { KYCStatus } from '@prisma/client';

@Controller('admin')
export class AdminActionController {
  constructor(private readonly adminService: AdminActionService) {}

  @Post('ban-user')
  @UseGuards(AuthGuard)
  async banUser(@Request() req: any, @Body() body: { targetUserId: string; reason: string }) {
    if (!body.targetUserId || !body.reason) {
      throw new BadRequestException('targetUserId and reason are required');
    }
    return this.adminService.banUser(req.user.id, body.targetUserId, body.reason);
  }

  @Post('refund-tip')
  @UseGuards(AuthGuard)
  async refundTip(@Request() req: any, @Body() body: { tipId: string; reason: string }) {
    if (!body.tipId || !body.reason) {
      throw new BadRequestException('tipId and reason are required');
    }
    return this.adminService.refundTip(req.user.id, body.tipId, body.reason);
  }

  @Post('update-kyc-status')
  @UseGuards(AuthGuard)
  async updateKYCStatus(@Request() req: any, @Body() body: { targetUserId: string; kycStatus: string; reason?: string }) {
    if (!body.targetUserId || !body.kycStatus) {
      throw new BadRequestException('targetUserId and kycStatus are required');
    }
    // Cast string to KYCStatus enum
    const kycStatusEnum = (body.kycStatus as KYCStatus);
    return this.adminService.updateKYCStatus(req.user.id, body.targetUserId, kycStatusEnum, body.reason);
  }

  @Get('logs')
  @UseGuards(AuthGuard)
  async getLogs() {
    return this.adminService.getLogs();
  }
} 