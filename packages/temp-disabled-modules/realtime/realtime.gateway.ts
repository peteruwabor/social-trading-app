import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../lib/auth.guard';
import { EventBus } from '../../lib/event-bus';
import { PrismaService } from '../../lib/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  namespace: '/realtime',
})
@UseGuards(AuthGuard)
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(
    private readonly eventBus: EventBus,
    private readonly prisma: PrismaService,
  ) {
    this.setupEventSubscriptions();
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract user from socket handshake auth
      const token = client.handshake.auth.token || client.handshake.headers.authorization;
      
      if (!token) {
        this.logger.warn('Connection attempt without token');
        client.disconnect();
        return;
      }

      // Verify token and get user (simplified for now)
      // In production, you'd want proper JWT verification
      const userId = token.replace('Bearer ', '');
      
      // Verify user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, handle: true },
      });

      if (!user) {
        this.logger.warn(`Invalid user ID: ${userId}`);
        client.disconnect();
        return;
      }

      client.userId = userId;
      client.user = user;
      this.connectedUsers.set(userId, client.id);

      // Join user-specific room
      await client.join(`user:${userId}`);

      this.logger.log(`User ${user.handle} (${userId}) connected`);
      
      // Send connection confirmation
      client.emit('connected', {
        userId,
        user: {
          id: user.id,
          email: user.email,
          handle: user.handle,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error('Error handling connection:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
      this.logger.log(`User ${client.userId} disconnected`);
    }
  }

  @SubscribeMessage('join_live_session')
  async handleJoinLiveSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.userId) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      const { sessionId } = data;

      // Verify session exists and is active
      const session = await this.prisma.liveSession.findUnique({
        where: { id: sessionId },
        include: {
          leader: {
            select: { id: true, handle: true, firstName: true, lastName: true },
          },
        },
      });

      if (!session) {
        client.emit('error', { message: 'Live session not found' });
        return;
      }

      if (session.status !== 'ACTIVE') {
        client.emit('error', { message: 'Live session is not active' });
        return;
      }

      // Join session room
      await client.join(`session:${sessionId}`);

      // Add viewer to database
      await this.prisma.liveSessionViewer.upsert({
        where: {
          sessionId_viewerId: {
            sessionId,
            viewerId: client.userId,
          },
        },
        update: {
          leftAt: null,
        },
        create: {
          sessionId,
          viewerId: client.userId,
        },
      });

      // Notify other viewers
      client.to(`session:${sessionId}`).emit('viewer_joined', {
        userId: client.userId,
        user: client.user,
        timestamp: new Date().toISOString(),
      });

      // Send session info to client
      client.emit('session_joined', {
        sessionId,
        session,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`User ${client.userId} joined session ${sessionId}`);

    } catch (error) {
      this.logger.error('Error joining live session:', error);
      client.emit('error', { message: 'Failed to join session' });
    }
  }

  @SubscribeMessage('leave_live_session')
  async handleLeaveLiveSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.userId) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      const { sessionId } = data;

      // Leave session room
      await client.leave(`session:${sessionId}`);

      // Update database
      await this.prisma.liveSessionViewer.update({
        where: {
          sessionId_viewerId: {
            sessionId,
            viewerId: client.userId,
          },
        },
        data: {
          leftAt: new Date(),
        },
      });

      // Notify other viewers
      client.to(`session:${sessionId}`).emit('viewer_left', {
        userId: client.userId,
        user: client.user,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`User ${client.userId} left session ${sessionId}`);

    } catch (error) {
      this.logger.error('Error leaving live session:', error);
      client.emit('error', { message: 'Failed to leave session' });
    }
  }

  @SubscribeMessage('send_comment')
  async handleSendComment(
    @MessageBody() data: { sessionId: string; content: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.userId) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      const { sessionId, content } = data;

      if (!content || content.trim().length === 0) {
        client.emit('error', { message: 'Comment cannot be empty' });
        return;
      }

      // Save comment to database
      const comment = await this.prisma.comment.create({
        data: {
          sessionId,
          userId: client.userId,
          content: content.trim(),
        },
        include: {
          user: {
            select: { id: true, handle: true, firstName: true, lastName: true },
          },
        },
      });

      // Broadcast to all session viewers
      this.server.to(`session:${sessionId}`).emit('new_comment', {
        comment,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Comment added to session ${sessionId} by ${client.userId}`);

    } catch (error) {
      this.logger.error('Error sending comment:', error);
      client.emit('error', { message: 'Failed to send comment' });
    }
  }

  @SubscribeMessage('like_comment')
  async handleLikeComment(
    @MessageBody() data: { commentId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.userId) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      const { commentId } = data;

      // Toggle like
      const existingLike = await this.prisma.like.findUnique({
        where: {
          commentId_userId: {
            commentId,
            userId: client.userId,
          },
        },
      });

      if (existingLike) {
        // Unlike
        await this.prisma.like.delete({
          where: { id: existingLike.id },
        });
      } else {
        // Like
        await this.prisma.like.create({
          data: {
            commentId,
            userId: client.userId,
          },
        });
      }

      // Get updated comment with likes count
      const comment = await this.prisma.comment.findUnique({
        where: { id: commentId },
        include: {
          likes: true,
          user: {
            select: { id: true, handle: true },
          },
        },
      });

      if (comment) {
        // Broadcast like update
        this.server.to(`session:${comment.sessionId}`).emit('comment_liked', {
          commentId,
          likesCount: comment.likes.length,
          isLiked: !existingLike,
          userId: client.userId,
          timestamp: new Date().toISOString(),
        });
      }

    } catch (error) {
      this.logger.error('Error liking comment:', error);
      client.emit('error', { message: 'Failed to like comment' });
    }
  }

  @SubscribeMessage('subscribe_trades')
  async handleSubscribeTrades(
    @MessageBody() data: { leaderId?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.userId) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      const { leaderId } = data;

      if (leaderId) {
        // Subscribe to specific leader's trades
        await client.join(`trades:${leaderId}`);
        this.logger.log(`User ${client.userId} subscribed to trades for leader ${leaderId}`);
      } else {
        // Subscribe to own trades
        await client.join(`trades:${client.userId}`);
        this.logger.log(`User ${client.userId} subscribed to own trades`);
      }

      client.emit('trades_subscribed', {
        leaderId: leaderId || client.userId,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error('Error subscribing to trades:', error);
      client.emit('error', { message: 'Failed to subscribe to trades' });
    }
  }

  @SubscribeMessage('unsubscribe_trades')
  async handleUnsubscribeTrades(
    @MessageBody() data: { leaderId?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.userId) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      const { leaderId } = data;
      const roomId = leaderId || client.userId;

      await client.leave(`trades:${roomId}`);
      this.logger.log(`User ${client.userId} unsubscribed from trades for ${roomId}`);

      client.emit('trades_unsubscribed', {
        leaderId: roomId,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error('Error unsubscribing from trades:', error);
      client.emit('error', { message: 'Failed to unsubscribe from trades' });
    }
  }

  private setupEventSubscriptions() {
    // Subscribe to trade events
    this.eventBus.subscribe('LeaderTradeFilled', (event) => {
      this.broadcastTradeEvent(event);
    });

    // Subscribe to copy order events
    this.eventBus.subscribe('CopyOrderFilled', (event) => {
      this.broadcastCopyOrderEvent(event);
    });

    // Subscribe to live session events
    this.eventBus.subscribe('LiveSessionStarted', (event) => {
      this.broadcastLiveSessionEvent(event);
    });

    this.eventBus.subscribe('LiveSessionEnded', (event) => {
      this.broadcastLiveSessionEvent(event);
    });
  }

  private broadcastTradeEvent(event: any) {
    const { user_id: leaderId, trade } = event;
    
    // Broadcast to leader's trade subscribers
    this.server.to(`trades:${leaderId}`).emit('trade_executed', {
      type: 'LEADER_TRADE',
      trade,
      leaderId,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Broadcasted trade event for leader ${leaderId}`);
  }

  private broadcastCopyOrderEvent(event: any) {
    const { followerId, copyOrder } = event;
    
    // Broadcast to follower's trade subscribers
    this.server.to(`trades:${followerId}`).emit('trade_executed', {
      type: 'COPY_TRADE',
      trade: copyOrder,
      followerId,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Broadcasted copy order event for follower ${followerId}`);
  }

  private broadcastLiveSessionEvent(event: any) {
    const { sessionId, type } = event;
    
    this.server.to(`session:${sessionId}`).emit('session_event', {
      type,
      sessionId,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Broadcasted live session event ${type} for session ${sessionId}`);
  }

  // Utility method to get connected users count
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Utility method to send message to specific user
  sendToUser(userId: string, event: string, data: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }
} 