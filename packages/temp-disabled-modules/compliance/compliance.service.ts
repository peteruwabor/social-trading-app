import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';
import { AuditLogService } from '../../lib/audit-log.service';

@Injectable()
export class ComplianceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getKYCStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        kycStatus: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return {
      userId: user.id,
      email: user.email,
      kycStatus: user.kycStatus,
      accountStatus: user.status,
      submittedAt: user.createdAt,
    };
  }

  async submitKYC(userId: string, kycData: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Update KYC status to pending
    await this.prisma.user.update({
      where: { id: userId },
      data: { kycStatus: 'PENDING' },
    });

    // Log KYC submission
    await this.auditLogService.logAction({
      userId,
      action: 'KYC_SUBMITTED',
      resource: 'KYC',
      resourceId: userId,
      details: {
        kycData: {
          // Don't log sensitive data in production
          hasDocuments: !!kycData.documents,
          hasIdentity: !!kycData.identity,
        },
      },
    });

    return {
      message: 'KYC submitted successfully',
      status: 'PENDING',
    };
  }

  async getComplianceReport(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        trades: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        tips: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const totalTradeVolume = user.trades.reduce((sum, trade) => 
      sum + (Number(trade.fillPrice) * trade.quantity), 0
    );

    const totalTipsSent = user.tips.reduce((sum, tip) => 
      sum + Number(tip.amount), 0
    );

    return {
      userId: user.id,
      email: user.email,
      kycStatus: user.kycStatus,
      accountStatus: user.status,
      totalTradeVolume: totalTradeVolume.toFixed(2),
      totalTipsSent: totalTipsSent.toFixed(2),
      recentTrades: user.trades.length,
      recentTips: user.tips.length,
      recentActivity: user.auditLogs.length,
      riskScore: this.calculateRiskScore(user),
    };
  }

  private calculateRiskScore(user: any): number {
    let score = 0;
    
    // KYC status impact
    switch (user.kycStatus) {
      case 'APPROVED':
        score += 30;
        break;
      case 'PENDING':
        score += 10;
        break;
      case 'REJECTED':
        score -= 20;
        break;
      default:
        score -= 10;
    }

    // Account status impact
    switch (user.status) {
      case 'ACTIVE':
        score += 20;
        break;
      case 'SUSPENDED':
        score -= 30;
        break;
      case 'BANNED':
        score -= 50;
        break;
    }

    // Activity level impact
    if (user.trades.length > 0) score += 10;
    if (user.tips.length > 0) score += 5;

    return Math.max(0, Math.min(100, score));
  }
} 