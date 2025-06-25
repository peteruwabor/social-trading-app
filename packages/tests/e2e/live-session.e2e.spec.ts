process.env.SNAPTRADE_CLIENT_ID = 'test-client-id';
process.env.SNAPTRADE_CONSUMER_KEY = 'test-consumer-key';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../api/src/app.module';
import { LiveSessionService } from '../../api/src/modules/live-session/live-session.service';
import { EventBus } from '../../api/src/lib/event-bus';
import { NotificationService } from '../../api/src/lib/notification.service';
import { PrismaService } from '../../api/src/lib/prisma.service';
import { SnapTradeClient } from '../../api/src/3rdparty/snaptrade/snaptrade.client';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

// Mock SnapTradeClient
jest.mock('../../api/src/3rdparty/snaptrade/snaptrade.client');

describe('Live Trading Sessions & Social Features (e2e)', () => {
  let app: INestApplication;
  let liveSessionService: LiveSessionService;
  let eventBus: EventBus;
  let notificationService: NotificationService;
  let prismaService: PrismaService;

  // Test data
  let leaderUserId: string;
  let viewerUserId: string;
  let sessionId: string;
  let commentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    liveSessionService = moduleFixture.get<LiveSessionService>(LiveSessionService);
    eventBus = moduleFixture.get<EventBus>(EventBus);
    notificationService = moduleFixture.get<NotificationService>(NotificationService);
    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    // Initialize test data
    leaderUserId = uuidv4();
    viewerUserId = uuidv4();
  });

  beforeEach(async () => {
    // Clean up database
    await prismaService.like.deleteMany();
    await prismaService.comment.deleteMany();
    await prismaService.liveSessionViewer.deleteMany();
    await prismaService.liveSession.deleteMany();
    await prismaService.deviceToken.deleteMany();
    await prismaService.user.deleteMany();

    // Reset mocks
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Live Session Management', () => {
    beforeEach(async () => {
      // Create test users
      await prismaService.user.create({
        data: {
          id: leaderUserId,
          email: 'leader@gioat.app',
          firstName: 'John',
          lastName: 'Trader',
        }
      });

      await prismaService.user.create({
        data: {
          id: viewerUserId,
          email: 'viewer@gioat.app',
          firstName: 'Jane',
          lastName: 'Viewer',
        }
      });
    });

    it('should create a new live trading session', async () => {
      const response = await request(app.getHttpServer())
        .post('/live-sessions')
        .set('Authorization', `Bearer ${leaderUserId}`)
        .send({
          title: 'My Live Trading Session',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('My Live Trading Session');
      expect(response.body.leaderId).toBe(leaderUserId);
      expect(response.body.status).toBe('ACTIVE');
      expect(response.body.viewerCount).toBe(0);
      expect(response.body.leader).toHaveProperty('id', leaderUserId);

      sessionId = response.body.id;
    });

    it('should get all active live sessions', async () => {
      // Create a session first
      const session = await liveSessionService.createSession({
        leaderId: leaderUserId,
        title: 'Active Trading Session',
      });

      const response = await request(app.getHttpServer())
        .get('/live-sessions')
        .set('Authorization', `Bearer ${viewerUserId}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(session.id);
      expect(response.body[0].title).toBe('Active Trading Session');
      expect(response.body[0].status).toBe('ACTIVE');
      expect(response.body[0].leader).toHaveProperty('id', leaderUserId);
    });

    it('should get a specific live session with details', async () => {
      // Create a session first
      const session = await liveSessionService.createSession({
        leaderId: leaderUserId,
        title: 'Detailed Session',
      });

      const response = await request(app.getHttpServer())
        .get(`/live-sessions/${session.id}`)
        .set('Authorization', `Bearer ${viewerUserId}`)
        .expect(200);

      expect(response.body.id).toBe(session.id);
      expect(response.body.title).toBe('Detailed Session');
      expect(response.body.leaderId).toBe(leaderUserId);
      expect(response.body.status).toBe('ACTIVE');
      expect(response.body.viewerCount).toBe(0);
      expect(response.body.leader).toHaveProperty('id', leaderUserId);
    });

    it('should update a live session', async () => {
      // Create a session first
      const session = await liveSessionService.createSession({
        leaderId: leaderUserId,
        title: 'Original Title',
      });

      const response = await request(app.getHttpServer())
        .put(`/live-sessions/${session.id}`)
        .set('Authorization', `Bearer ${leaderUserId}`)
        .send({
          title: 'Updated Title',
          status: 'PAUSED',
        })
        .expect(200);

      expect(response.body.title).toBe('Updated Title');
      expect(response.body.status).toBe('PAUSED');
    });

    it('should reject session update from non-leader', async () => {
      // Create a session first
      const session = await liveSessionService.createSession({
        leaderId: leaderUserId,
        title: 'Protected Session',
      });

      await request(app.getHttpServer())
        .put(`/live-sessions/${session.id}`)
        .set('Authorization', `Bearer ${viewerUserId}`)
        .send({
          title: 'Unauthorized Update',
        })
        .expect(500); // Should throw error for unauthorized update
    });

    it('should end a live session', async () => {
      // Create a session first
      const session = await liveSessionService.createSession({
        leaderId: leaderUserId,
        title: 'Ending Session',
      });

      const response = await request(app.getHttpServer())
        .put(`/live-sessions/${session.id}`)
        .set('Authorization', `Bearer ${leaderUserId}`)
        .send({
          status: 'ENDED',
        })
        .expect(200);

      expect(response.body.status).toBe('ENDED');
      expect(response.body.endedAt).toBeDefined();
    });
  });

  describe('Viewer Management', () => {
    beforeEach(async () => {
      // Create test users
      await prismaService.user.create({
        data: {
          id: leaderUserId,
          email: 'leader@gioat.app',
        }
      });

      await prismaService.user.create({
        data: {
          id: viewerUserId,
          email: 'viewer@gioat.app',
        }
      });

      // Create a session
      const session = await liveSessionService.createSession({
        leaderId: leaderUserId,
        title: 'Viewer Test Session',
      });
      sessionId = session.id;
    });

    it('should allow a user to join a live session', async () => {
      const response = await request(app.getHttpServer())
        .post(`/live-sessions/${sessionId}/join`)
        .set('Authorization', `Bearer ${viewerUserId}`)
        .expect(200);

      expect(response.body.message).toBe('Successfully joined session');

      // Verify viewer was added
      const session = await liveSessionService.getSession(sessionId);
      expect(session.viewerCount).toBe(1);
    });

    it('should allow a user to leave a live session', async () => {
      // Join first
      await liveSessionService.joinSession(sessionId, viewerUserId);

      const response = await request(app.getHttpServer())
        .post(`/live-sessions/${sessionId}/leave`)
        .set('Authorization', `Bearer ${viewerUserId}`)
        .expect(200);

      expect(response.body.message).toBe('Successfully left session');

      // Verify viewer count updated
      const session = await liveSessionService.getSession(sessionId);
      expect(session.viewerCount).toBe(0);
    });

    it('should reject joining an inactive session', async () => {
      // End the session first
      await liveSessionService.updateSession(sessionId, { status: 'ENDED' });

      await request(app.getHttpServer())
        .post(`/live-sessions/${sessionId}/join`)
        .set('Authorization', `Bearer ${viewerUserId}`)
        .expect(500); // Should throw error for inactive session
    });

    it('should handle multiple viewers joining and leaving', async () => {
      // Create additional viewers
      const viewer2Id = uuidv4();
      const viewer3Id = uuidv4();

      await prismaService.user.createMany({
        data: [
          { id: viewer2Id, email: 'viewer2@gioat.app' },
          { id: viewer3Id, email: 'viewer3@gioat.app' },
        ]
      });

      // All viewers join
      await liveSessionService.joinSession(sessionId, viewerUserId);
      await liveSessionService.joinSession(sessionId, viewer2Id);
      await liveSessionService.joinSession(sessionId, viewer3Id);

      let session = await liveSessionService.getSession(sessionId);
      expect(session.viewerCount).toBe(3);

      // One viewer leaves
      await liveSessionService.leaveSession(sessionId, viewer2Id);

      session = await liveSessionService.getSession(sessionId);
      expect(session.viewerCount).toBe(2);
    });
  });

  describe('Session Statistics', () => {
    beforeEach(async () => {
      // Create test users
      await prismaService.user.create({
        data: {
          id: leaderUserId,
          email: 'leader@gioat.app',
        }
      });

      await prismaService.user.create({
        data: {
          id: viewerUserId,
          email: 'viewer@gioat.app',
        }
      });
    });

    it('should get session statistics for a leader', async () => {
      // Create multiple sessions with different data
      const session1 = await liveSessionService.createSession({
        leaderId: leaderUserId,
        title: 'Session 1',
      });

      const session2 = await liveSessionService.createSession({
        leaderId: leaderUserId,
        title: 'Session 2',
      });

      // Add viewers to sessions
      await liveSessionService.joinSession(session1.id, viewerUserId);

      // End one session
      await liveSessionService.updateSession(session1.id, { status: 'ENDED' });

      const response = await request(app.getHttpServer())
        .get(`/live-sessions/stats/leader/${leaderUserId}`)
        .set('Authorization', `Bearer ${viewerUserId}`)
        .expect(200);

      expect(response.body.totalSessions).toBe(2);
      expect(response.body.totalViewers).toBe(1);
      expect(response.body.averageSessionDuration).toBeGreaterThan(0);
      expect(response.body.mostPopularSessions).toHaveLength(2);
    });

    it('should get my session statistics', async () => {
      // Create sessions for the leader
      await liveSessionService.createSession({
        leaderId: leaderUserId,
        title: 'My Session 1',
      });

      await liveSessionService.createSession({
        leaderId: leaderUserId,
        title: 'My Session 2',
      });

      const response = await request(app.getHttpServer())
        .get('/live-sessions/stats/my')
        .set('Authorization', `Bearer ${leaderUserId}`)
        .expect(200);

      expect(response.body.totalSessions).toBe(2);
      expect(response.body.totalViewers).toBe(0);
    });

    it('should filter statistics by days parameter', async () => {
      // Create a session
      await liveSessionService.createSession({
        leaderId: leaderUserId,
        title: 'Recent Session',
      });

      const response = await request(app.getHttpServer())
        .get(`/live-sessions/stats/leader/${leaderUserId}?days=7`)
        .set('Authorization', `Bearer ${viewerUserId}`)
        .expect(200);

      expect(response.body.totalSessions).toBe(1);
    });
  });

  describe('Live Trade Notifications', () => {
    beforeEach(async () => {
      // Create test users
      await prismaService.user.create({
        data: {
          id: leaderUserId,
          email: 'leader@gioat.app',
        }
      });

      await prismaService.user.create({
        data: {
          id: viewerUserId,
          email: 'viewer@gioat.app',
        }
      });

      // Create device token for viewer
      await prismaService.deviceToken.create({
        data: {
          userId: viewerUserId,
          token: 'ExponentPushToken[test-token-123]',
          platform: 'IOS',
        }
      });

      // Create a session
      const session = await liveSessionService.createSession({
        leaderId: leaderUserId,
        title: 'Trade Notification Session',
      });
      sessionId = session.id;

      // Join session
      await liveSessionService.joinSession(sessionId, viewerUserId);
    });

    it('should notify live session viewers when leader trades', async () => {
      // Mock notification service
      jest.spyOn(notificationService, 'sendPush').mockResolvedValue([]);

      // Simulate a leader trade event
      const tradeEvent = {
        user_id: leaderUserId,
        broker_connection_id: 'test-connection',
        trade: {
          symbol: 'AAPL',
          side: 'BUY',
          quantity: 10,
          fill_price: 150.25,
          account_number: '****1234',
          filled_at: new Date().toISOString(),
        },
      };

      // Publish the event
      eventBus.publish('LeaderTradeFilled', tradeEvent);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify notification was sent
      expect(notificationService.sendPush).toHaveBeenCalledWith(
        ['ExponentPushToken[test-token-123]'],
        'Live Trade Alert',
        'AAPL BUY 10 @ 150.25',
        expect.objectContaining({
          type: 'LIVE_SESSION_TRADE',
          sessionId: sessionId,
          symbol: 'AAPL',
          side: 'BUY',
          quantity: '10',
          fillPrice: '150.25',
        })
      );
    });

    it('should not notify viewers if leader has no active session', async () => {
      // End the session
      await liveSessionService.updateSession(sessionId, { status: 'ENDED' });

      // Mock notification service
      jest.spyOn(notificationService, 'sendPush').mockResolvedValue([]);

      // Simulate a leader trade event
      const tradeEvent = {
        user_id: leaderUserId,
        broker_connection_id: 'test-connection',
        trade: {
          symbol: 'AAPL',
          side: 'BUY',
          quantity: 10,
          fill_price: 150.25,
          account_number: '****1234',
          filled_at: new Date().toISOString(),
        },
      };

      // Publish the event
      eventBus.publish('LeaderTradeFilled', tradeEvent);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify no notification was sent
      expect(notificationService.sendPush).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      // Create test users
      await prismaService.user.create({
        data: {
          id: leaderUserId,
          email: 'leader@gioat.app',
        }
      });

      await prismaService.user.create({
        data: {
          id: viewerUserId,
          email: 'viewer@gioat.app',
        }
      });
    });

    it('should handle non-existent session gracefully', async () => {
      const fakeSessionId = uuidv4();

      await request(app.getHttpServer())
        .get(`/live-sessions/${fakeSessionId}`)
        .set('Authorization', `Bearer ${viewerUserId}`)
        .expect(404); // Should throw error for non-existent session
    });

    it('should require authentication for all endpoints', async () => {
      await request(app.getHttpServer())
        .post('/live-sessions')
        .expect(401);

      await request(app.getHttpServer())
        .get('/live-sessions')
        .expect(401);

      await request(app.getHttpServer())
        .get('/live-sessions/stats/my')
        .expect(401);
    });
  });
}); 