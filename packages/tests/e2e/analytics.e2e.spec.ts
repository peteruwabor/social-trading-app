process.env.SNAPTRADE_CLIENT_ID = 'test-client-id';
process.env.SNAPTRADE_CONSUMER_KEY = 'test-consumer-key';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../api/src/app.module';
import { PrismaService } from '../../api/src/lib/prisma.service';
import { NotificationService } from '../../api/src/lib/notification.service';

describe('Analytics & Reporting (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let notificationService: NotificationService;

  // Test user IDs
  let leaderUserId: string;
  let followerUserId: string;
  let regularUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NotificationService)
      .useValue({
        sendPush: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    notificationService = moduleFixture.get<NotificationService>(NotificationService);
  });

  beforeEach(async () => {
    // Clean up database
    await prismaService.portfolioSnapshot.deleteMany();
    await prismaService.copyOrder.deleteMany();
    await prismaService.tip.deleteMany();
    await prismaService.follower.deleteMany();
    await prismaService.trade.deleteMany();
    await prismaService.holding.deleteMany();
    await prismaService.brokerConnection.deleteMany();
    await prismaService.user.deleteMany();

    // Reset mocks
    jest.clearAllMocks();

    // Create test users
    const leader = await prismaService.user.create({
      data: {
        email: 'leader@gioat.app',
        handle: 'trading_leader',
        firstName: 'John',
        lastName: 'Leader',
      },
    });
    leaderUserId = leader.id;

    const follower = await prismaService.user.create({
      data: {
        email: 'follower@gioat.app',
        handle: 'copy_trader',
        firstName: 'Jane',
        lastName: 'Follower',
      },
    });
    followerUserId = follower.id;

    const regular = await prismaService.user.create({
      data: {
        email: 'regular@gioat.app',
        handle: 'regular_user',
        firstName: 'Bob',
        lastName: 'Regular',
      },
    });
    regularUserId = regular.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('User Performance Analytics', () => {
    beforeEach(async () => {
      // Create broker connection for leader
      const connection = await prismaService.brokerConnection.create({
        data: {
          userId: leaderUserId,
          broker: 'test_broker',
          accessToken: 'test_token',
          refreshToken: 'test_refresh',
        },
      });

      // Create sample trades
      await prismaService.trade.createMany({
        data: [
          {
            userId: leaderUserId,
            brokerConnectionId: connection.id,
            accountNumber: '12345',
            symbol: 'AAPL',
            side: 'BUY',
            quantity: 10,
            fillPrice: 150.00,
            filledAt: new Date(),
          },
          {
            userId: leaderUserId,
            brokerConnectionId: connection.id,
            accountNumber: '12345',
            symbol: 'AAPL',
            side: 'SELL',
            quantity: 5,
            fillPrice: 155.00,
            filledAt: new Date(),
          },
          {
            userId: leaderUserId,
            brokerConnectionId: connection.id,
            accountNumber: '12345',
            symbol: 'TSLA',
            side: 'BUY',
            quantity: 5,
            fillPrice: 200.00,
            filledAt: new Date(),
          },
        ],
      });
    });

    it('should return user performance analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/performance')
        .set('Authorization', `Bearer ${leaderUserId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        totalTrades: 3,
        buyTrades: 2,
        sellTrades: 1,
        winRate: '33.3',
        averageTradeSize: expect.any(String),
        totalVolume: expect.any(String),
        totalPnL: expect.any(String),
      });
    });

    it('should return performance for different timeframes', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/performance?timeframe=7d')
        .set('Authorization', `Bearer ${leaderUserId}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalTrades');
      expect(response.body).toHaveProperty('buyTrades');
      expect(response.body).toHaveProperty('sellTrades');
    });

    it('should return zero performance for user with no trades', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/performance')
        .set('Authorization', `Bearer ${regularUserId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        totalTrades: 0,
        buyTrades: 0,
        sellTrades: 0,
        winRate: '0.0',
        averageTradeSize: '0.00',
        totalVolume: '0.00',
        totalPnL: '0.00',
      });
    });
  });

  describe('Portfolio Analytics', () => {
    beforeEach(async () => {
      // Create broker connection
      const connection = await prismaService.brokerConnection.create({
        data: {
          userId: leaderUserId,
          broker: 'test_broker',
          accessToken: 'test_token',
          refreshToken: 'test_refresh',
        },
      });

      // Create sample holdings
      await prismaService.holding.createMany({
        data: [
          {
            userId: leaderUserId,
            brokerConnectionId: connection.id,
            accountNumber: '12345',
            symbol: 'AAPL',
            quantity: 10,
            marketValue: 1500.00,
            currency: 'USD',
            costBasis: 1450.00,
            unrealizedPnL: 50.00,
          },
          {
            userId: leaderUserId,
            brokerConnectionId: connection.id,
            accountNumber: '12345',
            symbol: 'TSLA',
            quantity: 5,
            marketValue: 1000.00,
            currency: 'USD',
            costBasis: 950.00,
            unrealizedPnL: 50.00,
          },
        ],
      });
    });

    it('should return portfolio analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/portfolio')
        .set('Authorization', `Bearer ${leaderUserId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        totalNav: '2500.00',
        totalUnrealizedPnL: '100.00',
        positionCount: 2,
        topHoldings: expect.arrayContaining([
          expect.objectContaining({
            symbol: 'AAPL',
            quantity: 10,
            marketValue: '1500.00',
            unrealizedPnL: '50.00',
            weight: '60.0',
          }),
        ]),
      });
    });

    it('should return empty portfolio for user with no holdings', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/portfolio')
        .set('Authorization', `Bearer ${regularUserId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        totalNav: '0.00',
        totalUnrealizedPnL: '0.00',
        positionCount: 0,
        topHoldings: [],
      });
    });
  });

  describe('Leader Rankings', () => {
    beforeEach(async () => {
      // Create followers
      await prismaService.follower.createMany({
        data: [
          {
            leaderId: leaderUserId,
            followerId: followerUserId,
            autoCopy: true,
          },
          {
            leaderId: leaderUserId,
            followerId: regularUserId,
            autoCopy: false,
          },
        ],
      });

      // Create broker connection and trades for leader
      const connection = await prismaService.brokerConnection.create({
        data: {
          userId: leaderUserId,
          broker: 'test_broker',
          accessToken: 'test_token',
          refreshToken: 'test_refresh',
        },
      });

      await prismaService.trade.createMany({
        data: [
          {
            userId: leaderUserId,
            brokerConnectionId: connection.id,
            accountNumber: '12345',
            symbol: 'AAPL',
            side: 'BUY',
            quantity: 10,
            fillPrice: 150.00,
            filledAt: new Date(),
          },
        ],
      });
    });

    it('should return leader rankings', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/leaders')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: leaderUserId,
        handle: 'trading_leader',
        followerCount: 2,
        tradeCount: 1,
        rank: 1,
        score: expect.any(String),
        totalVolume: '1500.00',
      });
    });

    it('should return empty rankings when no leaders exist', async () => {
      // Delete all followers
      await prismaService.follower.deleteMany();

      const response = await request(app.getHttpServer())
        .get('/analytics/leaders')
        .expect(200);

      expect(response.body).toHaveLength(0);
    });
  });

  describe('Platform Statistics', () => {
    beforeEach(async () => {
      // Create some sample data
      await prismaService.follower.create({
        data: {
          leaderId: leaderUserId,
          followerId: followerUserId,
        },
      });

      await prismaService.tip.create({
        data: {
          senderId: followerUserId,
          receiverId: leaderUserId,
          amount: 25.00,
          platformFee: 1.25,
        },
      });
    });

    it('should return platform statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/platform')
        .expect(200);

      expect(response.body).toMatchObject({
        totalUsers: 3,
        totalTrades: 0,
        totalFollowers: 1,
        totalTips: 1,
        totalTipAmount: '25.00',
        activeLeaders: 1,
        averageFollowersPerLeader: '1.0',
      });
    });
  });

  describe('Follower Success Metrics', () => {
    beforeEach(async () => {
      // Create broker connection for leader
      const leaderConnection = await prismaService.brokerConnection.create({
        data: {
          userId: leaderUserId,
          broker: 'test_broker',
          accessToken: 'test_token',
          refreshToken: 'test_refresh',
        },
      });

      // Create leader trade
      const leaderTrade = await prismaService.trade.create({
        data: {
          userId: leaderUserId,
          brokerConnectionId: leaderConnection.id,
          accountNumber: '12345',
          symbol: 'AAPL',
          side: 'BUY',
          quantity: 10,
          fillPrice: 150.00,
          filledAt: new Date(),
        },
      });

      // Create copy orders
      await prismaService.copyOrder.createMany({
        data: [
          {
            leaderTradeId: leaderTrade.id,
            followerId: followerUserId,
            symbol: 'AAPL',
            side: 'BUY',
            quantity: 5,
            status: 'FILLED',
            filledAt: new Date(),
          },
          {
            leaderTradeId: leaderTrade.id,
            followerId: followerUserId,
            symbol: 'AAPL',
            side: 'BUY',
            quantity: 3,
            status: 'FAILED',
            errorMessage: 'Insufficient funds',
          },
        ],
      });
    });

    it('should return follower success metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/follower-metrics')
        .set('Authorization', `Bearer ${followerUserId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        totalCopyOrders: 2,
        successfulCopies: 1,
        failedCopies: 1,
        successRate: '50.0',
        totalInvested: '500.00',
        averageOrderSize: '500.00',
      });
    });

    it('should return zero metrics for user with no copy orders', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/follower-metrics')
        .set('Authorization', `Bearer ${regularUserId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        totalCopyOrders: 0,
        successfulCopies: 0,
        failedCopies: 0,
        successRate: '0.0',
        totalInvested: '0.00',
        averageOrderSize: '0.00',
      });
    });
  });

  describe('Portfolio Snapshots', () => {
    beforeEach(async () => {
      // Create broker connection
      const connection = await prismaService.brokerConnection.create({
        data: {
          userId: leaderUserId,
          broker: 'test_broker',
          accessToken: 'test_token',
          refreshToken: 'test_refresh',
        },
      });

      // Create holdings
      await prismaService.holding.createMany({
        data: [
          {
            userId: leaderUserId,
            brokerConnectionId: connection.id,
            accountNumber: '12345',
            symbol: 'AAPL',
            quantity: 10,
            marketValue: 1500.00,
            currency: 'USD',
          },
        ],
      });
    });

    it('should generate portfolio snapshot', async () => {
      const response = await request(app.getHttpServer())
        .post('/analytics/portfolio-snapshot')
        .set('Authorization', `Bearer ${leaderUserId}`)
        .expect(201);

      expect(response.body).toMatchObject({
        userId: leaderUserId,
        nav: '1500',
        positions: expect.arrayContaining([
          expect.objectContaining({
            symbol: 'AAPL',
            quantity: 10,
            marketValue: 1500,
          }),
        ]),
      });
    });

    it('should return portfolio history', async () => {
      // Generate a snapshot first
      await prismaService.portfolioSnapshot.create({
        data: {
          userId: leaderUserId,
          nav: 1500,
          positions: [{ symbol: 'AAPL', quantity: 10, marketValue: 1500 }],
        },
      });

      const response = await request(app.getHttpServer())
        .get('/analytics/portfolio-history')
        .set('Authorization', `Bearer ${leaderUserId}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        nav: '1500.00',
        cashBalance: null,
      });
    });

    it('should return portfolio history for specified days', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/portfolio-history?days=7')
        .set('Authorization', `Bearer ${leaderUserId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should require authentication for protected endpoints', async () => {
      await request(app.getHttpServer())
        .get('/analytics/performance')
        .expect(401);

      await request(app.getHttpServer())
        .get('/analytics/portfolio')
        .expect(401);

      await request(app.getHttpServer())
        .get('/analytics/follower-metrics')
        .expect(401);

      await request(app.getHttpServer())
        .post('/analytics/portfolio-snapshot')
        .expect(401);

      await request(app.getHttpServer())
        .get('/analytics/portfolio-history')
        .expect(401);
    });

    it('should allow public access to leader rankings and platform statistics', async () => {
      await request(app.getHttpServer())
        .get('/analytics/leaders')
        .expect(200);

      await request(app.getHttpServer())
        .get('/analytics/platform')
        .expect(200);
    });
  });
}); 