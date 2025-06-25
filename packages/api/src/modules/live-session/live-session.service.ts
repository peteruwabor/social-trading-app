import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';
import { EventBus } from '../../lib/event-bus';
import { NotificationService } from '../../lib/notification.service';

export interface LiveSessionCreateDto {
  title?: string;
  leaderId: string;
}

export interface LiveSessionUpdateDto {
  title?: string;
  status?: 'ACTIVE' | 'PAUSED' | 'ENDED';
  recordingUrl?: string;
}

export interface LiveSessionStats {
  totalSessions: number;
  totalViewers: number;
  averageSessionDuration: number;
  mostPopularSessions: any[];
}

@Injectable()
export class LiveSessionService implements OnModuleInit {
  private readonly logger = new Logger(LiveSessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
    private readonly notificationService: NotificationService,
  ) {}

  onModuleInit() {
    // Subscribe to trade events to notify live session viewers
    this.eventBus.subscribe('LeaderTradeFilled', this.handleLeaderTrade.bind(this));
  }

  /**
   * Create a new live trading session
   */
  async createSession(data: LiveSessionCreateDto) {
    try {
      const session = await this.prisma.liveSession.create({
        data: {
          leaderId: data.leaderId,
          title: data.title || 'Live Trading Session',
          status: 'ACTIVE',
          startedAt: new Date(),
        },
        include: {
          leader: {
            select: {
              id: true,
              email: true,
              handle: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      });

      this.logger.log(`Created live session ${session.id} for leader ${data.leaderId}`);

      // Publish event for notifications
      this.eventBus.publish('LiveSessionStarted', {
        sessionId: session.id,
        leaderId: data.leaderId,
        title: session.title,
      });

      return session;
    } catch (error) {
      this.logger.error('Error creating live session:', error);
      throw error;
    }
  }

  /**
   * Update a live session
   */
  async updateSession(sessionId: string, data: LiveSessionUpdateDto) {
    try {
      const updateData: any = {};
      
      if (data.title !== undefined) updateData.title = data.title;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.recordingUrl !== undefined) updateData.recordingUrl = data.recordingUrl;
      
      if (data.status === 'ENDED') {
        updateData.endedAt = new Date();
      }

      const session = await this.prisma.liveSession.update({
        where: { id: sessionId },
        data: updateData,
        include: {
          leader: {
            select: {
              id: true,
              email: true,
              handle: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          viewers: {
            include: {
              viewer: {
                select: {
                  id: true,
                  email: true,
                  handle: true,
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      this.logger.log(`Updated live session ${sessionId}`);

      // Publish event for session status changes
      if (data.status) {
        this.eventBus.publish('LiveSessionStatusChanged', {
          sessionId,
          status: data.status,
          leaderId: session.leaderId,
        });
      }

      return session;
    } catch (error) {
      this.logger.error('Error updating live session:', error);
      throw error;
    }
  }

  /**
   * Get active live sessions
   */
  async getActiveSessions() {
    try {
      const sessions = await this.prisma.liveSession.findMany({
        where: { status: 'ACTIVE' },
        include: {
          leader: {
            select: {
              id: true,
              email: true,
              handle: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              viewers: true,
            },
          },
        },
        orderBy: { startedAt: 'desc' },
      });

      return sessions.map(session => ({
        ...session,
        viewerCount: session._count.viewers,
        _count: undefined,
      }));
    } catch (error) {
      this.logger.error('Error getting active sessions:', error);
      throw error;
    }
  }

  /**
   * Get a specific live session with details
   */
  async getSession(sessionId: string) {
    const session = await this.prisma.liveSession.findUnique({
      where: { id: sessionId },
      include: {
        leader: true,
        viewers: {
          include: {
            viewer: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Live session not found');
    }

    return session;
  }

  /**
   * Join a live session as a viewer
   */
  async joinSession(sessionId: string, viewerId: string) {
    try {
      // Check if session exists and is active
      const session = await this.prisma.liveSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw new Error('Live session not found');
      }

      if (session.status !== 'ACTIVE') {
        throw new Error('Live session is not active');
      }

      // Add viewer to session
      const viewer = await this.prisma.liveSessionViewer.upsert({
        where: {
          sessionId_viewerId: {
            sessionId,
            viewerId,
          },
        },
        update: {
          leftAt: null, // Re-join if previously left
        },
        create: {
          sessionId,
          viewerId,
        },
        include: {
          viewer: {
            select: {
              id: true,
              email: true,
              handle: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      });

      // Update viewer count
      await this.updateViewerCount(sessionId);

      this.logger.log(`User ${viewerId} joined session ${sessionId}`);

      // Publish event for real-time updates
      this.eventBus.publish('ViewerJoined', {
        sessionId,
        viewerId,
        viewer: viewer.viewer,
      });

      return viewer;
    } catch (error) {
      this.logger.error('Error joining live session:', error);
      throw error;
    }
  }

  /**
   * Leave a live session
   */
  async leaveSession(sessionId: string, viewerId: string) {
    try {
      const viewer = await this.prisma.liveSessionViewer.update({
        where: {
          sessionId_viewerId: {
            sessionId,
            viewerId,
          },
        },
        data: {
          leftAt: new Date(),
        },
        include: {
          viewer: {
            select: {
              id: true,
              email: true,
              handle: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      });

      // Update viewer count
      await this.updateViewerCount(sessionId);

      this.logger.log(`User ${viewerId} left session ${sessionId}`);

      // Publish event for real-time updates
      this.eventBus.publish('ViewerLeft', {
        sessionId,
        viewerId,
        viewer: viewer.viewer,
      });

      return viewer;
    } catch (error) {
      this.logger.error('Error leaving live session:', error);
      throw error;
    }
  }

  /**
   * Get live session statistics
   */
  async getSessionStats(leaderId: string, days: number = 30): Promise<LiveSessionStats> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const sessions = await this.prisma.liveSession.findMany({
        where: {
          leaderId,
          createdAt: {
            gte: startDate,
          },
        },
        include: {
          _count: {
            select: {
              viewers: true,
            },
          },
        },
      });

      const totalSessions = sessions.length;
      const totalViewers = sessions.reduce((sum, session) => sum + session._count.viewers, 0);

      // Calculate average session duration
      const endedSessions = sessions.filter(s => s.endedAt);
      const averageSessionDuration = endedSessions.length > 0
        ? endedSessions.reduce((sum, session) => {
            const duration = session.endedAt!.getTime() - session.startedAt.getTime();
            return sum + duration;
          }, 0) / endedSessions.length
        : 0;

      // Get most popular sessions (by viewer count)
      const mostPopularSessions = sessions
        .sort((a, b) => b._count.viewers - a._count.viewers)
        .slice(0, 5)
        .map(session => ({
          id: session.id,
          title: session.title,
          viewerCount: session._count.viewers,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
        }));

      return {
        totalSessions,
        totalViewers,
        averageSessionDuration,
        mostPopularSessions,
      };
    } catch (error) {
      this.logger.error('Error getting session stats:', error);
      throw error;
    }
  }

  /**
   * Handle leader trade events to notify live session viewers
   */
  private async handleLeaderTrade(event: any) {
    try {
      const { user_id: leaderId } = event;

      // Check if leader has an active live session
      const activeSession = await this.prisma.liveSession.findFirst({
        where: {
          leaderId,
          status: 'ACTIVE',
        },
        include: {
          viewers: {
            include: {
              viewer: {
                include: {
                  deviceTokens: true,
                },
              },
            },
          },
        },
      });

      if (!activeSession) {
        return;
      }

      // Send notifications to all viewers
      const notificationPromises = activeSession.viewers.map(async viewer => {
        if (viewer.viewer.deviceTokens.length > 0) {
          const deviceTokens = viewer.viewer.deviceTokens.map(dt => dt.token);
          const message = `${event.trade.symbol} ${event.trade.side} ${event.trade.quantity} @ ${event.trade.fill_price}`;
          return this.notificationService.sendPush(
            deviceTokens,
            'Live Trade Alert',
            message,
            {
              type: 'LIVE_SESSION_TRADE',
              sessionId: activeSession.id,
              symbol: event.trade.symbol,
              side: event.trade.side,
              quantity: event.trade.quantity.toString(),
              fillPrice: event.trade.fill_price.toString(),
            }
          );
        }
        return Promise.resolve();
      });

      await Promise.allSettled(notificationPromises);

      this.logger.log(`Sent live trade notifications to ${activeSession.viewers.length} viewers`);
    } catch (error) {
      this.logger.error('Error handling leader trade for live session:', error);
    }
  }

  /**
   * Update viewer count for a session
   */
  private async updateViewerCount(sessionId: string) {
    try {
      const activeViewers = await this.prisma.liveSessionViewer.count({
        where: {
          sessionId,
          leftAt: null,
        },
      });

      await this.prisma.liveSession.update({
        where: { id: sessionId },
        data: { viewerCount: activeViewers },
      });
    } catch (error) {
      this.logger.error('Error updating viewer count:', error);
    }
  }
} 