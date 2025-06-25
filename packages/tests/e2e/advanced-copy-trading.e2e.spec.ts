import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../../api/src/app.module';
import { PrismaService } from '../../api/src/lib/prisma.service';
import { EventBus } from '../../api/src/lib/event-bus';
import { AdvancedCopyTradingService } from '../../api/src/modules/copy-engine/advanced-copy-trading.service';
import { TradeSide, CopyOrderStatus } from '@prisma/client';
import { AuthGuard } from '../../api/src/lib/auth.guard';

describe('Epic J: Advanced Copy Trading & Risk Management (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let eventBus: EventBus;
  let advancedCopyTradingService: AdvancedCopyTradingService;

  // Test data
  let testUser: any;
  let testLeader: any;
  let testFollower: any;
  let leaderConnection: any;
  let followerConnection: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const request = context.switchToHttp().getRequest();
          const userId = request.headers['x-test-user-id'];
          if (!userId) return false;
          request.user = { id: userId, email: 'test@example.com' };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    eventBus = moduleFixture.get<EventBus>(EventBus);
    advancedCopyTradingService = moduleFixture.get<AdvancedCopyTradingService>(AdvancedCopyTradingService);
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.copyOrder.deleteMany();
    await prisma.trade.deleteMany();
    await prisma.holding.deleteMany();
    await prisma.follower.deleteMany();
    await prisma.brokerConnection.deleteMany();
    await prisma.user.deleteMany();

    // Create test users
    testLeader = await prisma.user.create({
      data: {
        id: `leader-${uuidv4()}`,
        email: 'leader@gioat.app',
        handle: 'testleader',
        firstName: 'Test',
        lastName: 'Leader',
        status: 'ACTIVE',
      },
    });

    testFollower = await prisma.user.create({
      data: {
        id: `follower-${uuidv4()}`,
        email: 'follower@gioat.app',
        handle: 'testfollower',
        firstName: 'Test',
        lastName: 'Follower',
        status: 'ACTIVE',
      },
    });

    // Create broker connections
    leaderConnection = await prisma.brokerConnection.create({
      data: {
        userId: testLeader.id,
        broker: 'TestBroker',
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        status: 'ACTIVE',
      },
    });

    followerConnection = await prisma.brokerConnection.create({
      data: {
        userId: testFollower.id,
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
        followerId: testFollower.id,
        autoCopy: true,
        alertOnly: false,
        autoCopyPaused: false,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Advanced Position Sizing Algorithms', () => {
    it('should calculate Kelly Criterion position size correctly', async () => {
      // Create historical trades for Kelly calculation
      const trades = [];
      for (let i = 0; i < 20; i++) {
        trades.push({
          userId: testLeader.id,
          brokerConnectionId: leaderConnection.id,
          accountNumber: '123456',
          symbol: 'AAPL',
          side: i % 2 === 0 ? TradeSide.BUY : TradeSide.SELL,
          quantity: 100,
          fillPrice: 150 + (i * 2), // Increasing price trend
          filledAt: new Date(Date.now() - (20 - i) * 24 * 60 * 60 * 1000),
        });
      }
      await prisma.trade.createMany({ data: trades });

      const positionSize = await advancedCopyTradingService.calculateKellyPositionSize(
        testFollower.id,
        testLeader.id,
        'AAPL',
        15000,
      );

      expect(positionSize).toBeGreaterThan(0);
      expect(positionSize).toBeLessThanOrEqual(0.20); // Max Kelly fraction
      expect(positionSize).toBeGreaterThanOrEqual(0.01); // Min Kelly fraction
    });

    it('should calculate Risk Parity position size correctly', async () => {
      // Create portfolio holdings for risk parity calculation
      await prisma.holding.createMany({
        data: [
          {
            userId: testFollower.id,
            brokerConnectionId: followerConnection.id,
            accountNumber: '123456',
            symbol: 'GOOGL',
            quantity: 10,
            marketValue: 5000,
            currency: 'USD',
          },
          {
            userId: testFollower.id,
            brokerConnectionId: followerConnection.id,
            accountNumber: '123456',
            symbol: 'MSFT',
            quantity: 20,
            marketValue: 8000,
            currency: 'USD',
          },
        ],
      });

      const positionSize = await advancedCopyTradingService.calculateRiskParityPositionSize(
        testFollower.id,
        'AAPL',
        10000,
      );

      expect(positionSize).toBeGreaterThan(0);
      expect(positionSize).toBeLessThanOrEqual(1);
    });

    it('should calculate Momentum-based position size correctly', async () => {
      // Create recent trades for momentum calculation
      const recentTrades = [];
      for (let i = 0; i < 10; i++) {
        recentTrades.push({
          userId: testLeader.id,
          brokerConnectionId: leaderConnection.id,
          accountNumber: '123456',
          symbol: 'TSLA',
          side: TradeSide.BUY,
          quantity: 50,
          fillPrice: 200 + (i * 5), // Strong upward momentum
          filledAt: new Date(Date.now() - (10 - i) * 24 * 60 * 60 * 1000),
        });
      }
      await prisma.trade.createMany({ data: recentTrades });

      const positionSize = await advancedCopyTradingService.calculateMomentumPositionSize(
        testFollower.id,
        'TSLA',
        15000,
      );

      expect(positionSize).toBeGreaterThan(0.05); // Should be higher due to positive momentum
      expect(positionSize).toBeLessThanOrEqual(0.08); // Max momentum size
    });
  });

  describe('Risk Management', () => {
    it('should validate risk limits correctly', async () => {
      // Create holdings for risk validation
      await prisma.holding.createMany({
        data: [
          {
            userId: testFollower.id,
            brokerConnectionId: followerConnection.id,
            accountNumber: '123456',
            symbol: 'AAPL',
            quantity: 100,
            marketValue: 20000,
            currency: 'USD',
          },
        ],
      });

      // Test position size within limits
      const validResult = await advancedCopyTradingService.validateRiskLimits(
        testFollower.id,
        'GOOGL',
        0.05, // 5% position size
      );

      expect(validResult.allowed).toBe(true);

      // Test position size exceeding limits
      const invalidResult = await advancedCopyTradingService.validateRiskLimits(
        testFollower.id,
        'GOOGL',
        0.30, // 30% position size (exceeds 25% limit)
      );

      expect(invalidResult.allowed).toBe(false);
      expect(invalidResult.reason).toContain('exceeds maximum allowed');
      expect(invalidResult.adjustedSize).toBe(0.25);
    });

    it('should handle daily loss limits', async () => {
      // Create holdings
      await prisma.holding.createMany({
        data: [
          {
            userId: testFollower.id,
            brokerConnectionId: followerConnection.id,
            accountNumber: '123456',
            symbol: 'AAPL',
            quantity: 100,
            marketValue: 20000,
            currency: 'USD',
          },
        ],
      });

      // Create losing trades for today
      await prisma.trade.createMany({
        data: [
          {
            userId: testFollower.id,
            brokerConnectionId: followerConnection.id,
            accountNumber: '123456',
            symbol: 'AAPL',
            side: TradeSide.BUY,
            quantity: 100,
            fillPrice: 200,
            filledAt: new Date(),
          },
          {
            userId: testFollower.id,
            brokerConnectionId: followerConnection.id,
            accountNumber: '123456',
            symbol: 'AAPL',
            side: TradeSide.SELL,
            quantity: 100,
            fillPrice: 180, // Loss of $2000
            filledAt: new Date(),
          },
        ],
      });

      const result = await advancedCopyTradingService.validateRiskLimits(
        testFollower.id,
        'GOOGL',
        0.05,
      );

      // Should be blocked due to daily loss limit (10% loss > 5% limit)
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Daily loss limit exceeded');
    });
  });

  describe('Performance Analytics', () => {
    it('should calculate copy performance metrics correctly', async () => {
      const now = new Date();
      const leaderTrade = await prisma.trade.create({
        data: {
          userId: testLeader.id,
          brokerConnectionId: leaderConnection.id,
          accountNumber: '123456',
          symbol: 'AAPL',
          side: TradeSide.BUY,
          quantity: 100,
          fillPrice: 150,
          filledAt: now,
        },
      });

      await prisma.copyOrder.createMany({
        data: [
          {
            leaderTradeId: leaderTrade.id,
            followerId: testFollower.id,
            symbol: 'AAPL',
            side: TradeSide.BUY,
            quantity: 10,
            status: CopyOrderStatus.FILLED,
            filledAt: now,
          },
          {
            leaderTradeId: leaderTrade.id,
            followerId: testFollower.id,
            symbol: 'AAPL',
            side: TradeSide.BUY,
            quantity: 5,
            status: CopyOrderStatus.FILLED,
            filledAt: new Date(now.getTime() - 1000 * 60 * 60 * 24), // 1 day ago
          },
          {
            leaderTradeId: leaderTrade.id,
            followerId: testFollower.id,
            symbol: 'AAPL',
            side: TradeSide.BUY,
            quantity: 3,
            status: CopyOrderStatus.FAILED,
            filledAt: new Date(now.getTime() - 1000 * 60 * 60 * 2), // 2 hours ago
          },
        ],
      });

      const performance = await advancedCopyTradingService.calculateCopyPerformance(
        testFollower.id,
        testLeader.id,
        '30D',
      );

      expect(performance.totalCopiedTrades).toBe(3);
      expect(performance.successfulCopies).toBe(2);
      expect(performance.failedCopies).toBe(1);
      expect(performance.winRate).toBe(2/3);
      expect(performance.totalPnL).toBeDefined();
      expect(performance.sharpeRatio).toBeDefined();
      expect(performance.maxDrawdown).toBeDefined();
      expect(performance.correlationWithLeader).toBeDefined();
    });

    it('should return empty performance for new users', async () => {
      const performance = await advancedCopyTradingService.calculateCopyPerformance(
        testFollower.id,
        testLeader.id,
        '30D',
      );

      expect(performance.totalCopiedTrades).toBe(0);
      expect(performance.successfulCopies).toBe(0);
      expect(performance.failedCopies).toBe(0);
      expect(performance.winRate).toBe(0);
      expect(performance.totalPnL).toBe(0);
    });
  });

  describe('Strategy Recommendations', () => {
    it('should recommend conservative strategy for new users', async () => {
      const strategies = await advancedCopyTradingService.getRecommendedStrategies(testFollower.id);

      expect(strategies).toHaveLength(1);
      expect(strategies[0].id).toBe('conservative');
      expect(strategies[0].type).toBe('PERCENTAGE');
      expect(strategies[0].parameters.positionSize).toBe(0.03);
    });

    it('should recommend multiple strategies for experienced users', async () => {
      // Create many copy orders to simulate experience
      const leaderTrade = await prisma.trade.create({
        data: {
          userId: testLeader.id,
          brokerConnectionId: leaderConnection.id,
          accountNumber: '123456',
          symbol: 'AAPL',
          side: TradeSide.BUY,
          quantity: 100,
          fillPrice: 150,
          filledAt: new Date(),
        },
      });

      const copyOrders = [];
      for (let i = 0; i < 60; i++) {
        copyOrders.push({
          leaderTradeId: leaderTrade.id,
          followerId: testFollower.id,
          symbol: 'AAPL',
          side: TradeSide.BUY,
          quantity: 10,
          status: CopyOrderStatus.FILLED,
          filledAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        });
      }
      await prisma.copyOrder.createMany({ data: copyOrders });

      const strategies = await advancedCopyTradingService.getRecommendedStrategies(testFollower.id);

      expect(strategies.length).toBeGreaterThan(1);
      expect(strategies.some(s => s.id === 'kelly')).toBe(true);
      expect(strategies.some(s => s.id === 'momentum')).toBe(true);
    });
  });

  describe('API Endpoints', () => {
    it('should get recommended strategies via API', async () => {
      const response = await request(app.getHttpServer())
        .get('/copy-trading/advanced/strategies')
        .query({ userId: testFollower.id })
        .set('x-test-user-id', testFollower.id)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('type');
    });

    it('should calculate Kelly position size via API', async () => {
      const response = await request(app.getHttpServer())
        .get('/copy-trading/advanced/kelly-position-size')
        .query({
          followerId: testFollower.id,
          leaderId: testLeader.id,
          symbol: 'AAPL',
          tradeValue: 15000,
        })
        .set('x-test-user-id', testFollower.id)
        .expect(200);

      expect(response.body).toHaveProperty('positionSize');
      expect(response.body).toHaveProperty('confidence');
      expect(response.body.positionSize).toBeGreaterThan(0);
      expect(response.body.confidence).toBeGreaterThan(0);
    });

    it('should validate risk limits via API', async () => {
      const response = await request(app.getHttpServer())
        .post('/copy-trading/advanced/validate-risk')
        .send({
          followerId: testFollower.id,
          symbol: 'AAPL',
          proposedPositionSize: 0.05,
        })
        .set('x-test-user-id', testFollower.id)
        .expect(200);

      expect(response.body).toHaveProperty('allowed');
      expect(typeof response.body.allowed).toBe('boolean');
    });

    it('should get copy performance via API', async () => {
      const response = await request(app.getHttpServer())
        .get(`/copy-trading/advanced/performance/${testLeader.id}`)
        .query({
          followerId: testFollower.id,
          timeframe: '30D',
        })
        .set('x-test-user-id', testFollower.id)
        .expect(200);

      expect(response.body).toHaveProperty('totalCopiedTrades');
      expect(response.body).toHaveProperty('successfulCopies');
      expect(response.body).toHaveProperty('failedCopies');
      expect(response.body).toHaveProperty('winRate');
      expect(response.body).toHaveProperty('totalPnL');
    });

    it('should get copy trading analytics via API', async () => {
      const response = await request(app.getHttpServer())
        .get('/copy-trading/advanced/analytics')
        .query({
          followerId: testFollower.id,
          timeframe: '30D',
        })
        .set('x-test-user-id', testFollower.id)
        .expect(200);

      expect(response.body).toHaveProperty('overallPerformance');
      expect(response.body).toHaveProperty('leaderPerformance');
      expect(response.body).toHaveProperty('riskMetrics');
      expect(response.body.riskMetrics).toHaveProperty('currentDrawdown');
      expect(response.body.riskMetrics).toHaveProperty('sharpeRatio');
    });
  });

  describe('Automated Copy Trading Setup', () => {
    it('should setup automated copy trading with strategy', async () => {
      const strategy = {
        id: 'conservative',
        name: 'Conservative Copy Trading',
        description: 'Low-risk strategy with small position sizes',
        type: 'PERCENTAGE' as const,
        parameters: {
          positionSize: 0.03,
          maxDailyLoss: 0.02,
          maxDrawdown: 0.10,
        },
      };

      const riskProfile = {
        maxPositionSize: 0.25,
        maxDailyLoss: 0.05,
        maxDrawdown: 0.15,
        volatilityTolerance: 'LOW' as const,
        correlationLimit: 0.7,
      };

      await advancedCopyTradingService.setupAutomatedCopyTrading(
        testFollower.id,
        testLeader.id,
        strategy,
        riskProfile,
      );

      // Verify follower relationship was updated
      const follower = await prisma.follower.findUnique({
        where: {
          leaderId_followerId: {
            leaderId: testLeader.id,
            followerId: testFollower.id,
          },
        },
      });

      expect(follower).toBeDefined();
      expect(follower!.autoCopy).toBe(true);
      expect(follower!.autoCopyPaused).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid user IDs gracefully', async () => {
      const performance = await advancedCopyTradingService.calculateCopyPerformance(
        'invalid-user-id',
        testLeader.id,
        '30D',
      );

      expect(performance.totalCopiedTrades).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      // This test would require mocking database errors
      // For now, we'll test that the service doesn't crash
      const positionSize = await advancedCopyTradingService.calculateKellyPositionSize(
        testFollower.id,
        testLeader.id,
        'INVALID_SYMBOL',
        1000,
      );

      expect(positionSize).toBe(0.05); // Default fallback
    });
  });
}); 