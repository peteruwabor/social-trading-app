import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  HttpStatus,
  HttpCode,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '../../lib/auth.guard';
import { PrismaService } from '../../lib/prisma.service';
import { NotificationService } from '../../lib/notification.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

export class MobileDashboardDto {
  totalFollowers!: number;
  totalFollowing!: number;
  totalTrades!: number;
  totalPnL!: number;
  recentTrades!: any[];
  activeLiveSessions!: any[];
  pendingNotifications!: number;
}

export class MobileTradeDto {
  id!: string;
  symbol!: string;
  side!: string;
  quantity!: number;
  fillPrice!: number;
  filledAt!: string;
  pctOfNAV?: number;
}

export class MobileLiveSessionDto {
  id!: string;
  title!: string;
  status!: string;
  startedAt!: string;
  viewerCount!: number;
  leader!: {
    id: string;
    handle: string;
    firstName?: string;
    lastName?: string;
  };
}

export class MobileNotificationDto {
  id!: string;
  type!: string;
  title!: string;
  body!: string;
  data?: any;
  read!: boolean;
  createdAt!: string;
}

export class DeviceInfoDto {
  deviceId!: string;
  platform!: 'IOS' | 'ANDROID' | 'WEB';
  appVersion!: string;
  osVersion!: string;
  deviceModel?: string;
}

@ApiTags('Mobile')
@Controller('mobile')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class MobileController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  /**
   * Get mobile dashboard data
   */
  @Get('dashboard')
  @ApiOperation({
    summary: 'Get mobile dashboard',
    description: 'Retrieves optimized dashboard data for mobile apps',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard data retrieved successfully',
    type: MobileDashboardDto,
  })
  async getDashboard(@Request() req: any): Promise<MobileDashboardDto> {
    const userId = req.user.id;

    // Get follower counts
    const [totalFollowers, totalFollowing] = await Promise.all([
      this.prisma.follower.count({ where: { leaderId: userId } }),
      this.prisma.follower.count({ where: { followerId: userId } }),
    ]);

    // Get trade statistics
    const trades = await this.prisma.trade.findMany({
      where: { userId },
      orderBy: { filledAt: 'desc' },
      take: 10,
      select: {
        id: true,
        symbol: true,
        side: true,
        quantity: true,
        fillPrice: true,
        filledAt: true,
      },
    });

    // Calculate total P&L (simplified)
    const totalPnL = trades.reduce((sum, trade) => {
      // This is a simplified calculation - in reality you'd need more complex logic
      return sum + (trade.side === 'BUY' ? -1 : 1) * Number(trade.fillPrice) * trade.quantity;
    }, 0);

    // Get active live sessions
    const activeLiveSessions = await this.prisma.liveSession.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { leaderId: userId },
          {
            viewers: {
              some: {
                viewerId: userId,
                leftAt: null,
              },
            },
          },
        ],
      },
      include: {
        leader: {
          select: {
            id: true,
            handle: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            viewers: {
              where: { leftAt: null },
            },
          },
        },
      },
      take: 5,
    });

    // Get unread notifications count
    const pendingNotifications = await this.prisma.notificationPreference.count({
      where: {
        userId,
        enabled: true,
      },
    });

    return {
      totalFollowers,
      totalFollowing,
      totalTrades: trades.length,
      totalPnL,
      recentTrades: trades.map(trade => ({
        id: trade.id,
        symbol: trade.symbol,
        side: trade.side,
        quantity: trade.quantity,
        fillPrice: Number(trade.fillPrice),
        filledAt: trade.filledAt.toISOString(),
      })),
      activeLiveSessions: activeLiveSessions.map(session => ({
        id: session.id,
        title: session.title,
        status: session.status,
        startedAt: session.startedAt.toISOString(),
        viewerCount: session._count.viewers,
        leader: session.leader,
      })),
      pendingNotifications,
    };
  }

  /**
   * Get mobile-optimized trades
   */
  @Get('trades')
  @ApiOperation({
    summary: 'Get mobile trades',
    description: 'Retrieves optimized trade data for mobile apps',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'symbol', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trades retrieved successfully',
    type: [MobileTradeDto],
  })
  async getTrades(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('symbol') symbol?: string,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Parse and validate pagination parameters
    const pageNum = Math.max(1, parseInt(page || '1') || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20') || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { userId };
    if (symbol) {
      where.symbol = { contains: symbol, mode: 'insensitive' };
    }

    const [trades, total] = await Promise.all([
      this.prisma.trade.findMany({
        where,
        orderBy: {
          filledAt: 'desc',
        },
        skip,
        take: limitNum,
        select: {
          id: true,
          symbol: true,
          side: true,
          quantity: true,
          fillPrice: true,
          filledAt: true,
        },
      }),
      this.prisma.trade.count({ where }),
    ]);

    return {
      trades: trades.map(trade => ({
        ...trade,
        fillPrice: Number(trade.fillPrice),
        filledAt: trade.filledAt.toISOString(),
      })),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  /**
   * Get mobile-optimized live sessions
   */
  @Get('live-sessions')
  @ApiOperation({
    summary: 'Get mobile live sessions',
    description: 'Retrieves optimized live session data for mobile apps',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'ENDED', 'PAUSED'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Live sessions retrieved successfully',
    type: [MobileLiveSessionDto],
  })
  async getLiveSessions(
    @Request() req: any,
    @Query('status') status?: string,
  ): Promise<MobileLiveSessionDto[]> {
    const userId = req.user.id;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const sessions = await this.prisma.liveSession.findMany({
      where,
      include: {
        leader: {
          select: {
            id: true,
            handle: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            viewers: {
              where: { leftAt: null },
            },
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });

    return sessions.map(session => ({
      id: session.id,
      title: session.title || 'Untitled Session',
      status: session.status,
      startedAt: session.startedAt.toISOString(),
      viewerCount: session._count.viewers,
      leader: {
        id: session.leader.id,
        handle: session.leader.handle || 'unknown',
        firstName: session.leader.firstName || undefined,
        lastName: session.leader.lastName || undefined,
      },
    }));
  }

  /**
   * Get mobile notifications
   */
  @Get('notifications')
  @ApiOperation({
    summary: 'Get mobile notifications',
    description: 'Retrieves optimized notification data for mobile apps',
  })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notifications retrieved successfully',
    type: [MobileNotificationDto],
  })
  async getNotifications(
    @Request() req: any,
    @Query('unreadOnly') unreadOnly = false,
  ): Promise<MobileNotificationDto[]> {
    const userId = req.user.id;

    // For now, return mock notifications since we don't have a notification table
    // In a real implementation, you'd query from a notifications table
    const mockNotifications: MobileNotificationDto[] = [
      {
        id: '1',
        type: 'TRADE_ALERT',
        title: 'New Trade Alert',
        body: 'AAPL BUY 100 @ $150.00',
        read: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        type: 'LIVE_SESSION',
        title: 'Live Session Started',
        body: 'JohnDoe started a live trading session',
        read: true,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ];

    if (unreadOnly) {
      return mockNotifications.filter(n => !n.read);
    }

    return mockNotifications;
  }

  /**
   * Register device information
   */
  @Post('device-info')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Register device info',
    description: 'Registers device information for mobile app optimization',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Device info registered successfully',
  })
  async registerDeviceInfo(
    @Request() req: any,
    @Body() deviceInfo: DeviceInfoDto,
  ): Promise<{ message: string }> {
    const userId = req.user.id;

    // Store device info (simplified - in reality you'd have a device_info table)
    // For now, we'll just log it
    console.log(`Device info for user ${userId}:`, deviceInfo);

    return { message: 'Device info registered successfully' };
  }

  /**
   * Get real-time connection status
   */
  @Get('connection-status')
  @ApiOperation({
    summary: 'Get connection status',
    description: 'Returns real-time connection status and statistics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Connection status retrieved successfully',
  })
  async getConnectionStatus(@Request() req: any): Promise<{
    connected: boolean;
    connectedUsers: number;
    lastSeen?: string;
  }> {
    const userId = req.user.id;
    const connectedUsers = this.realtimeGateway.getConnectedUsersCount();

    // Check if user is currently connected
    const connected = connectedUsers > 0; // Simplified check

    return {
      connected,
      connectedUsers,
      lastSeen: connected ? new Date().toISOString() : undefined,
    };
  }

  /**
   * Send test notification to mobile device
   */
  @Post('test-notification')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Send test notification',
    description: 'Sends a test notification to the user\'s mobile device',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test notification sent successfully',
  })
  async sendTestNotification(@Request() req: any): Promise<{ message: string }> {
    const userId = req.user.id;

    try {
      // Get user's device tokens
      const deviceTokens = await this.prisma.deviceToken.findMany({
        where: { userId },
        select: { token: true },
      });

      if (deviceTokens.length === 0) {
        return { message: 'No device tokens found for user' };
      }

      const tokens = deviceTokens.map(dt => dt.token);
      const title = 'Mobile Test Notification';
      const body = 'This is a test notification from the mobile API';
      const data = {
        type: 'MOBILE_TEST',
        timestamp: new Date().toISOString(),
      };

      await this.notificationService.sendPush(tokens, title, body, data);

      return { message: 'Test notification sent successfully' };
    } catch (error) {
      return { message: 'Failed to send test notification' };
    }
  }

  /**
   * Get mobile app configuration
   */
  @Get('config')
  @ApiOperation({
    summary: 'Get mobile config',
    description: 'Retrieves mobile app configuration and feature flags',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuration retrieved successfully',
  })
  async getMobileConfig(): Promise<{
    features: Record<string, boolean>;
    endpoints: Record<string, string>;
    limits: Record<string, number>;
  }> {
    return {
      features: {
        realTimeTrades: true,
        liveSessions: true,
        pushNotifications: true,
        copyTrading: true,
        socialFeatures: true,
        darkMode: true,
        biometricAuth: true,
      },
      endpoints: {
        websocket: '/realtime',
        api: '/api',
        uploads: '/uploads',
      },
      limits: {
        maxTradesPerPage: 50,
        maxLiveSessions: 10,
        maxCommentsPerSession: 100,
        maxFollowers: 1000,
        maxFollowing: 1000,
      },
    };
  }
} 