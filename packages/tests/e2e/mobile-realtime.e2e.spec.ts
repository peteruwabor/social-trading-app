import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../api/src/app.module';
import { PrismaService } from '../../api/src/lib/prisma.service';
import { AuthGuard } from '../../api/src/lib/auth.guard';
import { v4 as uuidv4 } from 'uuid';

// Set required environment variables for SnapTrade
process.env.SNAPTRADE_CLIENT_ID = 'test-client-id';
process.env.SNAPTRADE_CONSUMER_KEY = 'test-consumer-key';

// Set database URL for Prisma
process.env.DATABASE_URL = 'postgresql://gioat:gioat_dev_pwd@localhost:5432/gioat_dev';

// Helper for test user
const testUser = {
  id: 'test-mobile-user-id',
  email: 'test-mobile-user@example.com',
  handle: 'testmobileuser',
};

describe('Epic L: Mobile App & Real-time Features (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const request = context.switchToHttp().getRequest();
          request.user = { id: testUser.id, email: testUser.email };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Clean up test data
    await prisma.like.deleteMany({ where: { userId: testUser.id } });
    await prisma.comment.deleteMany({ where: { userId: testUser.id } });
    await prisma.liveSessionViewer.deleteMany({ where: { viewerId: testUser.id } });
    await prisma.liveSession.deleteMany({ where: { leaderId: testUser.id } });
    await prisma.deviceToken.deleteMany({ where: { userId: testUser.id } });
    await prisma.trade.deleteMany({ where: { userId: testUser.id } });
    await prisma.brokerConnection.deleteMany({ where: { userId: testUser.id } });
    await prisma.follower.deleteMany({ where: { leaderId: testUser.id } });
    await prisma.follower.deleteMany({ where: { followerId: testUser.id } });
    await prisma.user.deleteMany({ where: { id: testUser.id } });

    // Create test user
    await prisma.user.create({
      data: {
        id: testUser.id,
        email: testUser.email,
        handle: testUser.handle,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Mobile Dashboard', () => {
    beforeEach(async () => {
      // Create a follower user first (use upsert to avoid duplicate key error)
      const followerUser = await prisma.user.upsert({
        where: { id: 'follower-1' },
        update: {},
        create: {
          id: 'follower-1',
          email: 'follower@test.com',
          firstName: 'Follower',
          lastName: 'User',
        },
      });

      // Create some test data
      await prisma.follower.upsert({
        where: { 
          leaderId_followerId: {
            leaderId: testUser.id,
            followerId: followerUser.id,
          }
        },
        update: {},
        create: {
          leaderId: testUser.id,
          followerId: followerUser.id,
          autoCopyPaused: false,
        },
      });

      // Create another user for the test user to follow (use upsert to avoid duplicate key error)
      const leaderUser = await prisma.user.upsert({
        where: { id: 'leader-1' },
        update: {},
        create: {
          id: 'leader-1',
          email: 'leader@test.com',
          firstName: 'Leader',
          lastName: 'User',
        },
      });

      await prisma.follower.upsert({
        where: { 
          leaderId_followerId: {
            leaderId: leaderUser.id,
            followerId: testUser.id,
          }
        },
        update: {},
        create: {
          leaderId: leaderUser.id,
          followerId: testUser.id,
          autoCopyPaused: false,
        },
      });

      // Create broker connection for trades
      const brokerConnection = await prisma.brokerConnection.create({
        data: {
          userId: testUser.id,
          broker: 'SNAP_TRADE',
          status: 'ACTIVE',
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
        },
      });

      // Create test trades
      await prisma.trade.createMany({
        data: [
          {
            userId: testUser.id,
            brokerConnectionId: brokerConnection.id,
            accountNumber: '123456789',
            symbol: 'AAPL',
            side: 'BUY',
            quantity: 10,
            fillPrice: 150.00,
            filledAt: new Date(),
          },
          {
            userId: testUser.id,
            brokerConnectionId: brokerConnection.id,
            accountNumber: '123456789',
            symbol: 'GOOGL',
            side: 'SELL',
            quantity: 5,
            fillPrice: 2800.00,
            filledAt: new Date(),
          },
        ],
      });

      await prisma.deviceToken.create({
        data: {
          userId: testUser.id,
          token: 'ExponentPushToken[test-mobile-token]',
          platform: 'IOS',
        },
      });
    });

    afterEach(async () => {
      // Clean up test data
      await prisma.follower.deleteMany({ where: { leaderId: testUser.id } });
      await prisma.follower.deleteMany({ where: { followerId: testUser.id } });
      await prisma.trade.deleteMany({ where: { userId: testUser.id } });
      await prisma.brokerConnection.deleteMany({ where: { userId: testUser.id } });
      await prisma.deviceToken.deleteMany({ where: { userId: testUser.id } });
    });

    it('should get mobile dashboard data', async () => {
      const response = await request(app.getHttpServer())
        .get('/mobile/dashboard')
        .set('Authorization', `Bearer ${testUser.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalFollowers');
      expect(response.body).toHaveProperty('totalFollowing');
      expect(response.body).toHaveProperty('totalTrades');
      expect(response.body).toHaveProperty('totalPnL');
      expect(response.body).toHaveProperty('recentTrades');
      expect(response.body).toHaveProperty('activeLiveSessions');
      expect(response.body).toHaveProperty('pendingNotifications');

      expect(response.body.totalFollowers).toBe(1);
      expect(response.body.totalFollowing).toBe(1);
      expect(response.body.totalTrades).toBe(2);
      expect(Array.isArray(response.body.recentTrades)).toBe(true);
      expect(Array.isArray(response.body.activeLiveSessions)).toBe(true);
    });
  });

  describe('Mobile Trades', () => {
    beforeEach(async () => {
      // Create broker connection for trades
      const brokerConnection = await prisma.brokerConnection.create({
        data: {
          userId: testUser.id,
          broker: 'SNAP_TRADE',
          status: 'ACTIVE',
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
        },
      });

      // Create test trades
      await prisma.trade.createMany({
        data: [
          {
            userId: testUser.id,
            brokerConnectionId: brokerConnection.id,
            accountNumber: '123456789',
            symbol: 'AAPL',
            side: 'BUY',
            quantity: 10,
            fillPrice: 150.00,
            filledAt: new Date(),
          },
          {
            userId: testUser.id,
            brokerConnectionId: brokerConnection.id,
            accountNumber: '123456789',
            symbol: 'GOOGL',
            side: 'SELL',
            quantity: 5,
            fillPrice: 2800.00,
            filledAt: new Date(),
          },
          {
            userId: testUser.id,
            brokerConnectionId: brokerConnection.id,
            accountNumber: '123456789',
            symbol: 'MSFT',
            side: 'BUY',
            quantity: 20,
            fillPrice: 300.00,
            filledAt: new Date(),
          },
        ],
      });
    });

    afterEach(async () => {
      await prisma.trade.deleteMany({ where: { userId: testUser.id } });
      await prisma.brokerConnection.deleteMany({ where: { userId: testUser.id } });
    });

    it('should get mobile trades with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/mobile/trades?page=1&limit=10')
        .set('Authorization', `Bearer ${testUser.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('trades');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('totalPages');
      expect(Array.isArray(response.body.trades)).toBe(true);
      expect(response.body.total).toBe(3);
      expect(response.body.trades).toHaveLength(3);
    });

    it('should filter trades by symbol', async () => {
      const response = await request(app.getHttpServer())
        .get('/mobile/trades?symbol=AAPL')
        .set('Authorization', `Bearer ${testUser.id}`)
        .expect(200);

      expect(response.body.trades).toHaveLength(1);
      expect(response.body.trades[0].symbol).toBe('AAPL');
    });

    it('should return correct trade data structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/mobile/trades')
        .set('Authorization', `Bearer ${testUser.id}`)
        .expect(200);

      const trade = response.body.trades[0];
      expect(trade).toHaveProperty('id');
      expect(trade).toHaveProperty('symbol');
      expect(trade).toHaveProperty('side');
      expect(trade).toHaveProperty('quantity');
      expect(trade).toHaveProperty('fillPrice');
      expect(trade).toHaveProperty('filledAt');
      expect(typeof trade.fillPrice).toBe('number');
      expect(typeof trade.filledAt).toBe('string');
    });

    it('should handle empty results gracefully', async () => {
      const response = await request(app.getHttpServer())
        .get('/mobile/trades?symbol=NONEXISTENT')
        .set('Authorization', `Bearer ${testUser.id}`)
        .expect(200);

      expect(response.body.trades).toHaveLength(0);
      expect(response.body.total).toBe(0);
      expect(response.body.totalPages).toBe(0);
    });
  });

  describe('Mobile Live Sessions', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Create a viewer user first (use upsert to avoid duplicate key error)
      const viewerUser = await prisma.user.upsert({
        where: { id: 'viewer-1' },
        update: {},
        create: {
          id: 'viewer-1',
          email: 'viewer@test.com',
          firstName: 'Viewer',
          lastName: 'User',
        },
      });

      // Create test live session
      const session = await prisma.liveSession.create({
        data: {
          leaderId: testUser.id,
          title: 'Test Mobile Session',
          status: 'ACTIVE',
          startedAt: new Date(),
        },
      });
      sessionId = session.id;

      // Add viewer
      await prisma.liveSessionViewer.create({
        data: {
          sessionId,
          viewerId: viewerUser.id,
        },
      });
    });

    afterEach(async () => {
      await prisma.liveSessionViewer.deleteMany({ where: { sessionId } });
      await prisma.liveSession.deleteMany({ where: { id: sessionId } });
    });

    it('should get mobile live sessions', async () => {
      const response = await request(app.getHttpServer())
        .get('/mobile/live-sessions')
        .set('Authorization', `Bearer ${testUser.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const session = response.body[0];
      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('title');
      expect(session).toHaveProperty('status');
      expect(session).toHaveProperty('startedAt');
      expect(session).toHaveProperty('viewerCount');
      expect(session).toHaveProperty('leader');
    });

    it('should filter live sessions by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/mobile/live-sessions?status=ACTIVE')
        .set('Authorization', `Bearer ${testUser.id}`)
        .expect(200);

      expect(response.body.every((s: any) => s.status === 'ACTIVE')).toBe(true);
    });
  });

  describe('Mobile Notifications', () => {
    it('should get mobile notifications', async () => {
      const response = await request(app.getHttpServer())
        .get('/mobile/notifications')
        .set('Authorization', `Bearer ${testUser.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const notification = response.body[0];
      expect(notification).toHaveProperty('id');
      expect(notification).toHaveProperty('type');
      expect(notification).toHaveProperty('title');
      expect(notification).toHaveProperty('body');
      expect(notification).toHaveProperty('read');
      expect(notification).toHaveProperty('createdAt');
    });

    it('should filter unread notifications', async () => {
      const response = await request(app.getHttpServer())
        .get('/mobile/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${testUser.id}`)
        .expect(200);

      expect(response.body.every((n: any) => !n.read)).toBe(true);
    });
  });

  describe('Device Information', () => {
    it('should register device information', async () => {
      const deviceInfo = {
        deviceId: 'test-device-123',
        platform: 'IOS',
        appVersion: '1.0.0',
        osVersion: '15.0',
        deviceModel: 'iPhone 13',
      };

      const response = await request(app.getHttpServer())
        .post('/mobile/device-info')
        .set('Authorization', `Bearer ${testUser.id}`)
        .send(deviceInfo)
        .expect(200);

      expect(response.body.message).toBe('Device info registered successfully');
    });
  });

  describe('Connection Status', () => {
    it('should get connection status', async () => {
      const response = await request(app.getHttpServer())
        .get('/mobile/connection-status')
        .set('Authorization', `Bearer ${testUser.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('connected');
      expect(response.body).toHaveProperty('connectedUsers');
      expect(typeof response.body.connected).toBe('boolean');
      expect(typeof response.body.connectedUsers).toBe('number');
    });
  });

  describe('Test Notifications', () => {
    beforeEach(async () => {
      // Create device token
      await prisma.deviceToken.create({
        data: {
          userId: testUser.id,
          token: 'ExponentPushToken[test-notification-token]',
          platform: 'IOS',
        },
      });
    });

    afterEach(async () => {
      await prisma.deviceToken.deleteMany({ where: { userId: testUser.id } });
    });

    it('should send test notification', async () => {
      const response = await request(app.getHttpServer())
        .post('/mobile/test-notification')
        .set('Authorization', `Bearer ${testUser.id}`)
        .expect(200);

      expect(response.body.message).toBe('Test notification sent successfully');
    });
  });

  describe('Mobile Configuration', () => {
    it('should get mobile app configuration', async () => {
      const response = await request(app.getHttpServer())
        .get('/mobile/config')
        .set('Authorization', `Bearer ${testUser.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('features');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body).toHaveProperty('limits');

      expect(response.body.features).toHaveProperty('realTimeTrades');
      expect(response.body.features).toHaveProperty('liveSessions');
      expect(response.body.features).toHaveProperty('pushNotifications');
      expect(response.body.features).toHaveProperty('copyTrading');

      expect(response.body.endpoints).toHaveProperty('websocket');
      expect(response.body.endpoints).toHaveProperty('api');

      expect(response.body.limits).toHaveProperty('maxTradesPerPage');
      expect(response.body.limits).toHaveProperty('maxLiveSessions');
    });
  });

  describe('Authentication & Authorization', () => {
    let appWithoutAuth: INestApplication;

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      appWithoutAuth = moduleFixture.createNestApplication();
      await appWithoutAuth.init();
    });

    afterAll(async () => {
      await appWithoutAuth.close();
    });

    it('should reject requests without authentication', async () => {
      await request(appWithoutAuth.getHttpServer())
        .get('/mobile/dashboard')
        .expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(appWithoutAuth.getHttpServer())
        .get('/mobile/dashboard')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid query parameters gracefully', async () => {
      const response = await request(app.getHttpServer())
        .get('/mobile/trades?page=invalid&limit=invalid')
        .set('Authorization', `Bearer ${testUser.id}`)
        .expect(200); // Should still work with defaults

      expect(response.body).toHaveProperty('trades');
      expect(response.body).toHaveProperty('total');
    });
  });
}); 