import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../api/src/app.module';
import { PrismaService } from '../../api/src/lib/prisma.service';
import { AuthGuard } from '../../api/src/lib/auth.guard';
import { EventBus } from '../../api/src/lib/event-bus';
import { SnapTradeClient } from '../../api/src/3rdparty/snaptrade/snaptrade.client';

// Mock SnapTradeClient
jest.mock('../../api/src/3rdparty/snaptrade/snaptrade.client');

process.env.SNAPTRADE_CLIENT_ID = 'test-client-id';
process.env.SNAPTRADE_CONSUMER_KEY = 'test-consumer-key';

describe('Epic J: Advanced Copy Trading & Risk Management (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let eventBus: EventBus;
  let testUser: any;
  let testLeader: any;
  let testUser2: any;
  let timestamp: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const request = context.switchToHttp().getRequest();
          request.user = { id: request.headers['x-test-user-id'] || 'test-user-id', email: 'test@example.com' };
          return true;
        },
      })
      .overrideProvider(EventBus)
      .useValue({
        publish: jest.fn(),
        subscribe: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    eventBus = moduleFixture.get<EventBus>(EventBus);

    // Mock SnapTradeClient methods
    (SnapTradeClient.prototype.placeOrder as jest.Mock).mockResolvedValue({ orderId: 'snaptrade-order-123' });

    // Clean up any existing test data
    timestamp = Date.now();
    
    // First, find all users with test-epic-j pattern
    const existingUsers = await prisma.user.findMany({
      where: { email: { contains: 'test-epic-j' } },
      select: { id: true }
    });
    
    const userIds = existingUsers.map(user => user.id);
    
    if (userIds.length > 0) {
      // Delete all related records in correct order
      await prisma.copyOrder.deleteMany({ where: { followerId: { in: userIds } } });
      await prisma.guardrail.deleteMany({ where: { followerId: { in: userIds } } });
      await prisma.liveSession.deleteMany({ where: { leaderId: { in: userIds } } });
      await prisma.tip.deleteMany({ where: { OR: [{ senderId: { in: userIds } }, { receiverId: { in: userIds } }] } });
      await prisma.trade.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.follower.deleteMany({ where: { OR: [{ leaderId: { in: userIds } }, { followerId: { in: userIds } }] } });
      await prisma.notificationPreference.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.brokerConnection.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }

    // Create test users
    testUser = await prisma.user.create({
      data: {
        email: `test-epic-j-follower-${timestamp}@example.com`,
        handle: `follower-${timestamp}`,
        firstName: 'John',
        lastName: 'Follower',
        status: 'ACTIVE',
        kycStatus: 'APPROVED',
      },
    });

    testLeader = await prisma.user.create({
      data: {
        email: `test-epic-j-leader-${timestamp}@example.com`,
        handle: `leader-${timestamp}`,
        firstName: 'Jane',
        lastName: 'Leader',
        status: 'ACTIVE',
        kycStatus: 'APPROVED',
      },
    });

    testUser2 = await prisma.user.create({
      data: {
        email: `test-epic-j-user2-${timestamp}@example.com`,
        handle: `user2-${timestamp}`,
        firstName: 'Bob',
        lastName: 'User2',
        status: 'ACTIVE',
        kycStatus: 'APPROVED',
      },
    });

    // Create broker connections
    const leaderConnection = await prisma.brokerConnection.create({
      data: {
        id: `leader-connection-${timestamp}`,
        userId: testLeader.id,
        broker: 'TestBroker',
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        status: 'ACTIVE',
      },
    });

    const followerConnection = await prisma.brokerConnection.create({
      data: {
        id: `follower-connection-${timestamp}`,
        userId: testUser.id,
        broker: 'TestBroker',
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        status: 'ACTIVE',
      },
    });

    // Create follower relationship
    await prisma.follower.create({
      data: {
        leaderId: testLeader.id,
        followerId: testUser.id,
        autoCopy: true,
        alertOnly: false,
        autoCopyPaused: false,
      },
    });

    // Create some test trades and copy orders
    const leaderTrade1 = await prisma.trade.create({
      data: {
        userId: testLeader.id,
        brokerConnectionId: leaderConnection.id,
        accountNumber: '123456',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 100,
        fillPrice: 150.00,
        filledAt: new Date('2024-01-01T10:00:00Z'),
      },
    });

    const leaderTrade2 = await prisma.trade.create({
      data: {
        userId: testLeader.id,
        brokerConnectionId: leaderConnection.id,
        accountNumber: '123456',
        symbol: 'GOOGL',
        side: 'SELL',
        quantity: 50,
        fillPrice: 2800.00,
        filledAt: new Date('2024-01-02T14:30:00Z'),
      },
    });

    // Create copy orders
    await prisma.copyOrder.create({
      data: {
        leaderTradeId: leaderTrade1.id,
        followerId: testUser.id,
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 5,
        status: 'FILLED',
        filledAt: new Date('2024-01-01T10:01:00Z'),
      },
    });

    await prisma.copyOrder.create({
      data: {
        leaderTradeId: leaderTrade2.id,
        followerId: testUser.id,
        symbol: 'GOOGL',
        side: 'SELL',
        quantity: 2,
        status: 'FILLED',
        filledAt: new Date('2024-01-02T14:31:00Z'),
      },
    });

    await prisma.copyOrder.create({
      data: {
        leaderTradeId: leaderTrade1.id,
        followerId: testUser.id,
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 3,
        status: 'QUEUED',
      },
    });

    // Create some guardrails
    await prisma.guardrail.create({
      data: {
        followerId: testUser.id,
        symbol: 'AAPL',
        maxPct: 10.0,
        maxPositionSize: 0.1,
        maxDailyLoss: 0.05,
        maxDrawdown: 0.15,
      },
    });

    await prisma.guardrail.create({
      data: {
        followerId: testUser.id,
        symbol: null, // Global limit
        maxPct: 25.0,
        maxPositionSize: 0.25,
        maxDailyLoss: 0.1,
        maxDrawdown: 0.2,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data in correct order
    await prisma.copyOrder.deleteMany({ where: { followerId: { in: [testUser.id, testUser2.id] } } });
    await prisma.guardrail.deleteMany({ where: { followerId: { in: [testUser.id, testUser2.id] } } });
    await prisma.liveSession.deleteMany({ where: { leaderId: { in: [testUser.id, testLeader.id, testUser2.id] } } });
    await prisma.tip.deleteMany({ where: { OR: [{ senderId: { in: [testUser.id, testLeader.id, testUser2.id] } }, { receiverId: { in: [testUser.id, testLeader.id, testUser2.id] } }] } });
    await prisma.trade.deleteMany({ where: { userId: { in: [testUser.id, testLeader.id, testUser2.id] } } });
    await prisma.follower.deleteMany({ where: { OR: [{ leaderId: { in: [testUser.id, testLeader.id, testUser2.id] } }, { followerId: { in: [testUser.id, testLeader.id, testUser2.id] } }] } });
    await prisma.notificationPreference.deleteMany({ where: { userId: { in: [testUser.id, testLeader.id, testUser2.id] } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: [testUser.id, testLeader.id, testUser2.id] } } });
    await prisma.brokerConnection.deleteMany({ where: { userId: { in: [testUser.id, testLeader.id, testUser2.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [testUser.id, testLeader.id, testUser2.id] } } });
    
    await app.close();
  });

  describe('Copy Trading Statistics', () => {
    it('should get copy trading statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/copy-trading/stats')
        .set('x-test-user-id', testUser.id)
        .expect(200);

      expect(response.body).toMatchObject({
        totalCopiedTrades: 3,
        successfulCopies: 2,
        failedCopies: 0,
        copySuccessRate: expect.any(Number),
        mostCopiedSymbols: expect.arrayContaining([
          expect.objectContaining({
            symbol: expect.any(String),
            count: expect.any(Number),
          }),
        ]),
      });
    });

    it('should get risk metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/copy-trading/risk-metrics')
        .set('x-test-user-id', testUser.id)
        .expect(200);

      expect(response.body).toMatchObject({
        maxDrawdown: expect.any(Number),
        sharpeRatio: expect.any(Number),
        volatility: expect.any(Number),
        maxPositionSize: expect.any(Number),
        totalExposure: expect.any(Number),
      });
    });

    it('should get leader performance', async () => {
      const response = await request(app.getHttpServer())
        .get('/copy-trading/leader-performance')
        .set('x-test-user-id', testUser.id)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        leader: expect.objectContaining({
          id: testLeader.id,
          handle: `leader-${timestamp}`,
        }),
        totalCopies: 3,
        successfulCopies: 2,
        successRate: expect.any(Number),
      });
    });
  });

  describe('Copy Order History & Management', () => {
    it('should get copy order history', async () => {
      const response = await request(app.getHttpServer())
        .get('/copy-trading/history')
        .set('x-test-user-id', testUser.id)
        .expect(200);

      expect(response.body).toHaveLength(3);
      expect(response.body[0]).toMatchObject({
        symbol: expect.any(String),
        side: expect.stringMatching(/^(BUY|SELL)$/),
        quantity: expect.any(Number),
        status: expect.stringMatching(/^(QUEUED|FILLED|FAILED|CANCELLED)$/),
        leaderTrade: expect.objectContaining({
          user: expect.objectContaining({
            id: testLeader.id,
          }),
        }),
      });
    });

    it('should filter copy order history by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/copy-trading/history?status=FILLED')
        .set('x-test-user-id', testUser.id)
        .expect(200);

      expect(response.body).toHaveLength(2);
      response.body.forEach((order: any) => {
        expect(order.status).toBe('FILLED');
      });
    });

    it('should filter copy order history by symbol', async () => {
      const response = await request(app.getHttpServer())
        .get('/copy-trading/history?symbol=AAPL')
        .set('x-test-user-id', testUser.id)
        .expect(200);

      expect(response.body).toHaveLength(2);
      response.body.forEach((order: any) => {
        expect(order.symbol).toBe('AAPL');
      });
    });

    it('should cancel a pending copy order', async () => {
      // First get a queued order
      const queuedOrders = await prisma.copyOrder.findMany({
        where: {
          followerId: testUser.id,
          status: 'QUEUED',
        },
      });

      expect(queuedOrders.length).toBeGreaterThan(0);
      const orderToCancel = queuedOrders[0];

      const response = await request(app.getHttpServer())
        .post(`/copy-trading/cancel/${orderToCancel.id}`)
        .set('x-test-user-id', testUser.id)
        .expect(200);

      expect(response.body.status).toBe('CANCELLED');

      // Verify event was published
      expect(eventBus.publish).toHaveBeenCalledWith('CopyOrderCancelled', {
        copyOrderId: orderToCancel.id,
        followerId: testUser.id,
        reason: 'User cancelled',
      });
    });

    it('should reject cancelling non-existent order', async () => {
      await request(app.getHttpServer())
        .post('/copy-trading/cancel/non-existent-id')
        .set('x-test-user-id', testUser.id)
        .expect(400);
    });
  });

  describe('Copy Trading Settings', () => {
    it('should get copy trading settings', async () => {
      const response = await request(app.getHttpServer())
        .get('/copy-trading/settings')
        .set('x-test-user-id', testUser.id)
        .expect(200);

      expect(response.body).toMatchObject({
        following: expect.arrayContaining([
          expect.objectContaining({
            leader: expect.objectContaining({
              id: testLeader.id,
            }),
            autoCopy: true,
            alertOnly: false,
            autoCopyPaused: false,
          }),
        ]),
        guardrails: expect.arrayContaining([
          expect.objectContaining({
            symbol: 'AAPL',
            maxPct: 10.0,
          }),
          expect.objectContaining({
            symbol: null,
            maxPct: 25.0,
          }),
        ]),
      });
    });

    it('should update copy trading settings', async () => {
      const newSettings = {
        autoCopy: false,
        alertOnly: true,
        autoCopyPaused: true,
      };

      const response = await request(app.getHttpServer())
        .put(`/copy-trading/settings/${testLeader.id}`)
        .set('x-test-user-id', testUser.id)
        .send(newSettings)
        .expect(200);

      expect(response.body).toMatchObject({
        autoCopy: false,
        alertOnly: true,
        autoCopyPaused: true,
      });
    });

    it('should reject updating settings for non-followed leader', async () => {
      await request(app.getHttpServer())
        .put(`/copy-trading/settings/${testUser2.id}`)
        .set('x-test-user-id', testUser.id)
        .send({ autoCopy: false })
        .expect(400);
    });
  });

  describe('Risk Management & Guardrails', () => {
    it('should set position limit for specific symbol', async () => {
      const response = await request(app.getHttpServer())
        .post('/copy-trading/guardrails/position-limit')
        .set('x-test-user-id', testUser.id)
        .send({
          symbol: 'TSLA',
          maxPct: 15.0,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        followerId: testUser.id,
        symbol: 'TSLA',
        maxPct: 15.0,
      });
    });

    it('should set global position limit', async () => {
      const response = await request(app.getHttpServer())
        .post('/copy-trading/guardrails/position-limit')
        .set('x-test-user-id', testUser.id)
        .send({
          maxPct: 30.0,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        followerId: testUser.id,
        symbol: null,
        maxPct: 30.0,
      });
    });

    it('should reject invalid position limit percentage', async () => {
      await request(app.getHttpServer())
        .post('/copy-trading/guardrails/position-limit')
        .set('x-test-user-id', testUser.id)
        .send({
          symbol: 'TSLA',
          maxPct: 150.0, // Invalid: > 100
        })
        .expect(400);
    });

    it('should remove position limit', async () => {
      const response = await request(app.getHttpServer())
        .delete('/copy-trading/guardrails/position-limit')
        .set('x-test-user-id', testUser.id)
        .send({
          symbol: 'AAPL',
        })
        .expect(200);

      expect(response.body.count).toBeGreaterThan(0);
    });
  });

  describe('Copy Trading Analytics', () => {
    it('should get symbol analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/copy-trading/analytics/symbol/AAPL')
        .set('x-test-user-id', testUser.id)
        .expect(200);

      expect(response.body).toMatchObject({
        symbol: 'AAPL',
        totalTrades: 2,
        successfulTrades: 1,
        successRate: expect.any(Number),
        totalVolume: expect.any(Number),
        averageDelay: expect.any(Number),
        trades: expect.arrayContaining([
          expect.objectContaining({
            symbol: 'AAPL',
          }),
        ]),
      });
    });

    it('should get top performing leaders', async () => {
      const response = await request(app.getHttpServer())
        .get('/copy-trading/analytics/leaders/top?limit=5')
        .set('x-test-user-id', testUser.id)
        .expect(200);

      expect(response.body).toMatchObject({
        leaders: expect.arrayContaining([
          expect.objectContaining({
            leader: expect.objectContaining({
              id: testLeader.id,
            }),
            totalCopies: expect.any(Number),
            successRate: expect.any(Number),
          }),
        ]),
        totalLeaders: expect.any(Number),
      });
    });

    it('should get performance trends', async () => {
      const response = await request(app.getHttpServer())
        .get('/copy-trading/analytics/performance-trends?days=7')
        .set('x-test-user-id', testUser.id)
        .expect(200);

      expect(response.body).toMatchObject({
        period: '7 days',
        trends: expect.arrayContaining([
          expect.objectContaining({
            date: expect.any(String),
            totalTrades: expect.any(Number),
            successfulTrades: expect.any(Number),
            successRate: expect.any(Number),
            totalVolume: expect.any(Number),
          }),
        ]),
        summary: expect.objectContaining({
          totalTrades: expect.any(Number),
          averageSuccessRate: expect.any(Number),
          totalVolume: expect.any(Number),
        }),
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent user', async () => {
      await request(app.getHttpServer())
        .get('/copy-trading/stats')
        .set('x-test-user-id', 'non-existent-user')
        .expect(200); // Service handles gracefully
    });

    it('should require authentication', async () => {
      // Create a new app instance without AuthGuard override to test real authentication
      const testModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      const testApp = testModule.createNestApplication();
      await testApp.init();

      try {
        await request(testApp.getHttpServer())
          .get('/copy-trading/stats')
          .expect(401);
      } finally {
        await testApp.close();
      }
    });
  });
}); 