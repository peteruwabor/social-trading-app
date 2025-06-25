import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';
import { AuditLogService } from '../../lib/audit-log.service';
import { KYCStatus } from '@prisma/client';

@Injectable()
export class AdminActionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async logAction(adminId: string, action: string, targetUserId?: string, details?: any) {
    const adminAction = await this.prisma.adminAction.create({
      data: {
        adminId,
        action,
        targetUserId,
        details,
      },
    });

    // Log the admin action
    await this.auditLogService.logAction({
      userId: adminId,
      action: `ADMIN_${action}`,
      resource: 'ADMIN_ACTION',
      resourceId: adminAction.id,
      details: {
        targetUserId,
        ...details,
      },
    });

    return adminAction;
  }

  async getLogs() {
    return this.prisma.adminAction.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  // Example admin actions
  async banUser(adminId: string, targetUserId: string, reason: string) {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      throw new BadRequestException('User does not exist');
    }
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { status: 'BANNED' },
    });
    return this.logAction(adminId, 'BAN_USER', targetUserId, { reason });
  }

  async refundTip(adminId: string, tipId: string, reason: string) {
    const tip = await this.prisma.tip.findUnique({ where: { id: tipId } });
    if (!tip) {
      throw new BadRequestException('Tip does not exist');
    }
    // In a real app, refund logic would go here
    return this.logAction(adminId, 'REFUND_TIP', undefined, { tipId, reason });
  }

  async updateKYCStatus(adminId: string, targetUserId: string, kycStatus: KYCStatus, reason?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      throw new BadRequestException('User does not exist');
    }
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { kycStatus },
    });
    return this.logAction(adminId, 'UPDATE_KYC_STATUS', targetUserId, { kycStatus, reason });
  }
} 