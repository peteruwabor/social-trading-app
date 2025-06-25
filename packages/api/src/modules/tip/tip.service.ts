import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';
import { AuditLogService } from '../../lib/audit-log.service';

@Injectable()
export class TipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async sendTip(senderId: string, receiverId: string, amount: number, message?: string) {
    if (amount <= 0) {
      throw new BadRequestException('Tip amount must be greater than 0');
    }

    const platformFee = amount * 0.05; // 5% platform fee

    const tip = await this.prisma.tip.create({
      data: {
        senderId,
        receiverId,
        amount,
        message,
        platformFee,
      },
    });

    // Log the tip action
    await this.auditLogService.logAction({
      userId: senderId,
      action: 'SEND_TIP',
      resource: 'TIP',
      resourceId: tip.id,
      details: {
        receiverId,
        amount,
        platformFee,
        message,
      },
    });

    return tip;
  }

  async getTipHistory(userId: string) {
    const tips = await this.prisma.tip.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    return tips.map(tip => ({
      ...tip,
      amount: tip.amount.toFixed(2),
      platformFee: tip.platformFee?.toFixed(2) || '0.00',
    }));
  }

  async getEarnings(userId: string) {
    const tips = await this.prisma.tip.findMany({
      where: { receiverId: userId },
    });
    const total = tips.reduce((sum, t) => sum + Number(t.amount), 0);
    const fees = tips.reduce((sum, t) => sum + Number(t.platformFee), 0);
    return { total: total.toFixed(2), fees: fees.toFixed(2), net: (total - fees).toFixed(2) };
  }

  async getTipsReceived(userId: string) {
    return this.prisma.tip.findMany({
      where: { receiverId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTipsSent(userId: string) {
    return this.prisma.tip.findMany({
      where: { senderId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }
} 