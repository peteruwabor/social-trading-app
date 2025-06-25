import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../../api/src/app.module';
import { PrismaService } from '../../api/src/lib/prisma.service';
import { AdvancedCopyTradingService } from '../../api/src/modules/copy-engine/advanced-copy-trading.service';

describe('Epic J: Advanced Copy Trading - Simple Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let advancedCopyTradingService: AdvancedCopyTradingService;

  // Test data
  let testLeader: any;
  let testFollower: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Strategy Recommendations', () => {
    it('should recommend conservative strategy for new users', async () => {
      const strategies = await advancedCopyTradingService.getRecommendedStrategies(testFollower.id);

      expect(strategies).toHaveLength(1);
      expect(strategies[0].id).toBe('conservative');
      expect(strategies[0].type).toBe('PERCENTAGE');
      expect(strategies[0].parameters.positionSize).toBe(0.03);
    });
  });

  describe('Performance Analytics', () => {
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

  describe('Position Sizing Algorithms', () => {
    it('should calculate Kelly Criterion with default fallback', async () => {
      const positionSize = await advancedCopyTradingService.calculateKellyPositionSize(
        testFollower.id,
        testLeader.id,
        'AAPL',
        15000,
      );

      expect(positionSize).toBe(0.05); // Default fallback
    });

    it('should calculate Risk Parity position size', async () => {
      const positionSize = await advancedCopyTradingService.calculateRiskParityPositionSize(
        testFollower.id,
        'AAPL',
        10000,
      );

      expect(positionSize).toBe(0.10); // Default for new portfolio
    });

    it('should calculate Momentum-based position size', async () => {
      const positionSize = await advancedCopyTradingService.calculateMomentumPositionSize(
        testFollower.id,
        'TSLA',
        15000,
      );

      expect(positionSize).toBe(0.05); // Default for insufficient data
    });
  });

  describe('Risk Management', () => {
    it('should validate risk limits for user not found', async () => {
      const result = await advancedCopyTradingService.validateRiskLimits(
        'invalid-user-id',
        'AAPL',
        0.05,
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('User not found');
    });

    it('should validate risk limits for valid user', async () => {
      const result = await advancedCopyTradingService.validateRiskLimits(
        testFollower.id,
        'AAPL',
        0.05,
      );

      expect(result.allowed).toBe(true);
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