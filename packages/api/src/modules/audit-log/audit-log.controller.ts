import { Controller, Get, Request, Query, UseGuards } from '@nestjs/common';
import { AuditLogService } from '../../lib/audit-log.service';
import { AuthGuard } from '../../lib/auth.guard';

@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  async getMyLogs(@Request() req: any, @Query('limit') limit: string = '50') {
    return this.auditLogService.getUserLogs(req.user.id, parseInt(limit));
  }

  @Get('all')
  @UseGuards(AuthGuard)
  async getAllLogs(@Request() req: any, @Query('limit') limit: string = '100') {
    // TODO: Add admin check
    return this.auditLogService.getAllLogs(parseInt(limit));
  }
} 