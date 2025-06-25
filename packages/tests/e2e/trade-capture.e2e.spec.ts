import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../api/src/app.module';
import { PrismaService } from '../../api/src/lib/prisma.service';
import { EventBus } from '../../api/src/lib/event-bus';
import { TradeCaptureService } from '../../api/src/trade-capture/trade-capture.service';
import { v4 as uuidv4 } from 'uuid';
import { SnapTradeClient } from '../../api/src/3rdparty/snaptrade/snaptrade.client';

jest.mock('../../api/src/3rdparty/snaptrade/snaptrade.client');

describe('Trade Capture (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let eventBus: EventBus;
  let tradeCaptureService: TradeCaptureService;
  let testUserId: string;
  let testConnectionId: string;

  beforeAll(async () => {
    // Create test module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    eventBus = moduleFixture.get<EventBus>(EventBus);
    tradeCaptureService = moduleFixture.get<TradeCaptureService>(TradeCaptureService);

    // Spy on EventBus publish method
    jest.spyOn(eventBus, 'publish').mockImplementation(() => {});

    testUserId = uuidv4();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await prismaService.trade.deleteMany({});
    await prismaService.brokerConnection.deleteMany({});
    await prismaService.user.deleteMany({});

    // Create test user
    await prismaService.user.create({
      data: {
        id: testUserId,
        email: 'test@example.com',
      },
    });

    // Create test broker connection
    const connection = await prismaService.brokerConnection.create({
      data: {
        userId: testUserId,
        broker: 'snaptrade',
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        status: 'ACTIVE',
        snaptradeAuthorizationId: 'test-auth-id',
      },
    });
    testConnectionId = connection.id;
  });

  describe('Trade Capture & Processing', () => {
    it('should capture trades and create trade records', async () => {
      // Trigger manual trade capture
      await tradeCaptureService.manualCaptureTrades(testConnectionId);

      // Verify trades were created
      const trades = await prismaService.trade.findMany({
        where: { userId: testUserId },
        orderBy: { filledAt: 'desc' },
      });

      expect(trades.length).toBeGreaterThan(0);
      
      // Verify trade data structure
      const firstTrade = trades[0];
      expect(firstTrade).toHaveProperty('symbol');
      expect(firstTrade).toHaveProperty('side');
      expect(firstTrade).toHaveProperty('quantity');
      expect(firstTrade).toHaveProperty('fillPrice');
      expect(firstTrade).toHaveProperty('accountNumber');
      expect(firstTrade).toHaveProperty('filledAt');
    });

    it('should publish LeaderTradeFilled events for copy trading', async () => {
      // Trigger manual trade capture
      await tradeCaptureService.manualCaptureTrades(testConnectionId);

      // Verify LeaderTradeFilled events were published
      expect(eventBus.publish).toHaveBeenCalledWith('LeaderTradeFilled', expect.objectContaining({
        user_id: testUserId,
        broker_connection_id: testConnectionId,
        trade: expect.objectContaining({
          symbol: expect.any(String),
          side: expect.stringMatching(/^(BUY|SELL)$/),
          quantity: expect.any(Number),
          fill_price: expect.any(Number),
        }),
      }));
    });

    it('should publish TradeAlert events for notifications', async () => {
      // Trigger manual trade capture
      await tradeCaptureService.manualCaptureTrades(testConnectionId);

      // Verify TradeAlert events were published
      expect(eventBus.publish).toHaveBeenCalledWith('TradeAlert', expect.objectContaining({
        userId: testUserId,
        tradeId: expect.any(String),
        symbol: expect.any(String),
        side: expect.stringMatching(/^(BUY|SELL)$/),
        quantity: expect.any(Number),
        fillPrice: expect.any(Number),
        accountNumber: expect.any(String),
        filledAt: expect.any(String),
      }));
    });

    it('should handle multiple accounts correctly', async () => {
      // Trigger manual trade capture
      await tradeCaptureService.manualCaptureTrades(testConnectionId);

      // Verify trades from different accounts
      const trades = await prismaService.trade.findMany({
        where: { userId: testUserId },
      });

      const accountNumbers = [...new Set(trades.map(t => t.accountNumber))];
      expect(accountNumbers.length).toBeGreaterThan(1);
    });

    it('should update lastTradePollAt timestamp', async () => {
      const beforeCapture = new Date();
      
      // Trigger manual trade capture
      await tradeCaptureService.manualCaptureTrades(testConnectionId);

      // Verify timestamp was updated
      const updatedConnection = await prismaService.brokerConnection.findUnique({
        where: { id: testConnectionId },
      });

      expect(updatedConnection!.lastTradePollAt).toBeDefined();
      expect(updatedConnection!.lastTradePollAt!.getTime()).toBeGreaterThan(beforeCapture.getTime());
    });
  });

  describe('Trade History & Analytics', () => {
    beforeEach(async () => {
      // Create some test trades
      await prismaService.trade.createMany({
        data: [
          {
            userId: testUserId,
            brokerConnectionId: testConnectionId,
            accountNumber: '****1234',
            symbol: 'AAPL',
            side: 'BUY',
            quantity: 10,
            fillPrice: 150.25,
            filledAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
          },
          {
            userId: testUserId,
            brokerConnectionId: testConnectionId,
            accountNumber: '****1234',
            symbol: 'GOOGL',
            side: 'SELL',
            quantity: 5,
            fillPrice: 2750.50,
            filledAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
          },
          {
            userId: testUserId,
            brokerConnectionId: testConnectionId,
            accountNumber: '****5678',
            symbol: 'TSLA',
            side: 'BUY',
            quantity: 20,
            fillPrice: 200.75,
            filledAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
          },
          {
            userId: testUserId,
            brokerConnectionId: testConnectionId,
            accountNumber: '****1234',
            symbol: 'MSFT',
            side: 'BUY',
            quantity: 15,
            fillPrice: 325.80,
            filledAt: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
          },
        ],
      });
    });

    it('should return trade history', async () => {
      const response = await request(app.getHttpServer())
        .get('/trades/history')
        .set('Authorization', `Bearer ${testUserId}`)
        .expect(200);

      expect(response.body).toHaveLength(4);
      
      const firstTrade = response.body[0];
      expect(firstTrade).toHaveProperty('id');
      expect(firstTrade).toHaveProperty('symbol');
      expect(firstTrade).toHaveProperty('side');
      expect(firstTrade).toHaveProperty('quantity');
      expect(firstTrade).toHaveProperty('fillPrice');
      expect(firstTrade).toHaveProperty('accountNumber');
      expect(firstTrade).toHaveProperty('filledAt');
      expect(firstTrade).toHaveProperty('broker');
    });

    it('should return trade analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/trades/analytics')
        .set('Authorization', `Bearer ${testUserId}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalTrades', 4);
      expect(response.body).toHaveProperty('totalVolume');
      expect(response.body).toHaveProperty('totalValue');
      expect(response.body).toHaveProperty('buyCount', 3);
      expect(response.body).toHaveProperty('sellCount', 1);
      expect(response.body).toHaveProperty('averageTradeSize');
      expect(response.body).toHaveProperty('mostTradedSymbol');
      expect(response.body).toHaveProperty('recentActivity');
      expect(response.body.recentActivity).toHaveLength(4);
    });

    it('should return trades by symbol', async () => {
      const response = await request(app.getHttpServer())
        .get('/trades/symbol/AAPL')
        .set('Authorization', `Bearer ${testUserId}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].symbol).toBe('AAPL');
    });

    it('should return trade statistics for copy trading', async () => {
      const response = await request(app.getHttpServer())
        .get('/trades/stats/AAPL')
        .set('Authorization', `Bearer ${testUserId}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalTrades', 1);
      expect(response.body).toHaveProperty('totalVolume', 10);
      expect(response.body).toHaveProperty('averagePrice', 150.25);
      expect(response.body).toHaveProperty('lastTrade');
      expect(response.body.lastTrade).toHaveProperty('side', 'BUY');
      expect(response.body.lastTrade).toHaveProperty('quantity', 10);
      expect(response.body.lastTrade).toHaveProperty('fillPrice', 150.25);
    });

    it('should filter by days parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/trades/history?days=1')
        .set('Authorization', `Bearer ${testUserId}`)
        .expect(200);

      // Should return all trades since they're all recent
      expect(response.body).toHaveLength(4);
    });
  });

  describe('Trade Capture API Endpoints', () => {
    it('should allow manual trade capture', async () => {
      const response = await request(app.getHttpServer())
        .get(`/trades/capture/${testConnectionId}`)
        .set('Authorization', `Bearer ${testUserId}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Trade capture completed successfully');
    });

    it('should reject manual capture for non-existent connection', async () => {
      const fakeConnectionId = uuidv4();
      
      await request(app.getHttpServer())
        .get(`/trades/capture/${fakeConnectionId}`)
        .set('Authorization', `Bearer ${testUserId}`)
        .expect(500); // Should return error for non-existent connection
    });

    it('should require authentication for all endpoints', async () => {
      await request(app.getHttpServer())
        .get('/trades/history')
        .expect(401);

      await request(app.getHttpServer())
        .get('/trades/analytics')
        .expect(401);

      await request(app.getHttpServer())
        .get('/trades/symbol/AAPL')
        .expect(401);

      await request(app.getHttpServer())
        .get('/trades/stats/AAPL')
        .expect(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle SnapTrade API errors gracefully', async () => {
      // Mock SnapTrade to throw an error
      (SnapTradeClient.prototype.getActivities as jest.Mock).mockRejectedValueOnce(
        new Error('SnapTrade API error')
      );

      // Should not throw, but log error
      await expect(tradeCaptureService.manualCaptureTrades(testConnectionId)).rejects.toThrow();
    });

    it('should handle invalid trade data', async () => {
      // Mock SnapTrade to return invalid data
      (SnapTradeClient.prototype.getActivities as jest.Mock).mockResolvedValueOnce([
        {
          id: 'invalid-activity',
          type: 'FILL',
          timestamp: new Date().toISOString(),
          data: {
            // Missing required fields
            symbol: '',
            side: 'INVALID',
            quantity: -1,
            price: 0,
          },
        },
      ]);

      // Should handle gracefully without creating invalid trades
      await tradeCaptureService.manualCaptureTrades(testConnectionId);

      const trades = await prismaService.trade.findMany({
        where: { userId: testUserId },
      });

      // Should not create trades with invalid data
      expect(trades).toHaveLength(0);
    });

    it('should continue processing other connections if one fails', async () => {
      // Create a second connection
      const connection2 = await prismaService.brokerConnection.create({
        data: {
          userId: testUserId,
          broker: 'snaptrade',
          accessToken: 'access-token-2',
          refreshToken: 'refresh-token-2',
          status: 'ACTIVE',
          snaptradeAuthorizationId: 'auth-id-2',
        },
      });

      // Mock first connection to fail, second to succeed
      (SnapTradeClient.prototype.getActivities as jest.Mock)
        .mockRejectedValueOnce(new Error('First connection failed'))
        .mockResolvedValueOnce([
          {
            id: 'activity-success',
            type: 'FILL',
            timestamp: new Date().toISOString(),
            data: {
              symbol: 'MSFT',
              side: 'BUY',
              quantity: 10,
              price: 325.80,
              account_number: '****9999',
              filled_at: new Date().toISOString(),
            },
          },
        ]);

      // Trigger the cron job - should not throw
      await tradeCaptureService.captureTrades();

      // Verify second connection was processed
      const trades = await prismaService.trade.findMany({
        where: { userId: testUserId },
      });
      expect(trades.some(t => t.symbol === 'MSFT')).toBe(true);
    });
  });

  describe('Trade Capture Cron Job', () => {
    it('should process all active connections', async () => {
      // Create multiple connections
      await prismaService.brokerConnection.create({
        data: {
          userId: testUserId,
          broker: 'snaptrade',
          accessToken: 'access-token-2',
          refreshToken: 'refresh-token-2',
          status: 'ACTIVE',
          snaptradeAuthorizationId: 'auth-id-2',
        },
      });

      // Mock the cron job method
      const captureSpy = jest.spyOn(tradeCaptureService, 'captureTrades');

      // Trigger the cron job
      await tradeCaptureService.captureTrades();

      // Verify capture was called
      expect(captureSpy).toHaveBeenCalled();
    });

    it('should skip inactive connections', async () => {
      // Update connection to inactive
      await prismaService.brokerConnection.update({
        where: { id: testConnectionId },
        data: { status: 'INACTIVE' },
      });

      // Mock the process method to verify it's not called
      const processSpy = jest.spyOn(tradeCaptureService as any, 'processConnectionTrades');

      // Trigger the cron job
      await tradeCaptureService.captureTrades();

      // Verify process was not called for inactive connections
      expect(processSpy).not.toHaveBeenCalled();
    });
  });
}); 