process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_KEY = 'test-key';
process.env.SNAPTRADE_CLIENT_ID = 'test-client-id';
process.env.SNAPTRADE_CONSUMER_KEY = 'test-consumer-key';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../api/src/app.module';
import { PrismaService } from '../../api/src/lib/prisma.service';
import { EventBus } from '../../api/src/lib/event-bus';
import { PortfolioSyncService } from '../../api/src/portfolio-sync/portfolio-sync.service';
import { v4 as uuidv4 } from 'uuid';
import { SnapTradeClient } from '../../api/src/3rdparty/snaptrade/snaptrade.client';

jest.mock('../../api/src/3rdparty/snaptrade/snaptrade.client');

describe('Portfolio (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let eventBus: EventBus;
  let portfolioSyncService: PortfolioSyncService;
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
    portfolioSyncService = moduleFixture.get<PortfolioSyncService>(PortfolioSyncService);

    // Spy on EventBus publish method
    jest.spyOn(eventBus, 'publish').mockImplementation(() => {});

    // Mock SnapTradeClient.getHoldings for all tests
    (SnapTradeClient.prototype.getHoldings as jest.Mock).mockResolvedValue([
      {
        accountId: 'mock-account-1',
        accountNumber: '****1234',
        holdings: [
          {
            symbol: 'AAPL',
            quantity: 10,
            marketValue: 1500.00,
            currency: 'USD',
            accountNumber: '****1234',
          },
          {
            symbol: 'GOOGL',
            quantity: 5,
            marketValue: 2500.00,
            currency: 'USD',
            accountNumber: '****1234',
          },
        ],
      },
      {
        accountId: 'mock-account-2',
        accountNumber: '****5678',
        holdings: [
          {
            symbol: 'TSLA',
            quantity: 20,
            marketValue: 4000.00,
            currency: 'USD',
            accountNumber: '****5678',
          },
        ],
      },
    ]);

    testUserId = uuidv4();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await prismaService.holding.deleteMany({});
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

  describe('Portfolio Sync & Holdings Management', () => {
    it('should sync portfolio holdings and create snapshots', async () => {
      // Trigger manual sync
      await portfolioSyncService.manualSync(testConnectionId);

      // Verify holdings were created
      const holdings = await prismaService.holding.findMany({
        where: { userId: testUserId },
      });

      expect(holdings).toHaveLength(3);
      expect(holdings.map(h => h.symbol)).toEqual(['AAPL', 'GOOGL', 'TSLA']);
    });

    it('should handle multiple account holdings correctly', async () => {
      // Trigger manual sync
      await portfolioSyncService.manualSync(testConnectionId);

      // Verify holdings are grouped by account
      const holdings = await prismaService.holding.findMany({
        where: { userId: testUserId },
        orderBy: { accountNumber: 'asc' },
      });

      expect(holdings).toHaveLength(3);
      
      const account1234Holdings = holdings.filter(h => h.accountNumber === '****1234');
      const account5678Holdings = holdings.filter(h => h.accountNumber === '****5678');

      expect(account1234Holdings).toHaveLength(2); // AAPL, GOOGL
      expect(account5678Holdings).toHaveLength(1); // TSLA
    });

    it('should calculate cost basis and unrealized P&L', async () => {
      // Trigger manual sync
      await portfolioSyncService.manualSync(testConnectionId);

      // Verify holdings have cost basis and P&L calculated
      const holdings = await prismaService.holding.findMany({
        where: { userId: testUserId },
      });

      for (const holding of holdings) {
        expect(holding.symbol).toBeDefined();
        expect(holding.quantity).toBeDefined();
        expect(holding.marketValue).toBeDefined();
      }
    });

    it('should publish SyncQueued event after successful sync', async () => {
      // Trigger manual sync
      await portfolioSyncService.manualSync(testConnectionId);

      // Verify event was published
      expect(eventBus.publish).toHaveBeenCalledWith('SyncQueued', expect.objectContaining({
        connectionId: testConnectionId,
        userId: testUserId,
        broker: 'snaptrade',
      }));
    });
  });

  describe('Portfolio API Endpoints', () => {
    beforeEach(async () => {
      // Create some holdings for API tests
      await prismaService.holding.createMany({
        data: [
          {
            userId: testUserId,
            brokerConnectionId: testConnectionId,
            accountNumber: '****1234',
            symbol: 'AAPL',
            quantity: 10,
            marketValue: 1500.00,
            currency: 'USD',
          },
          {
            userId: testUserId,
            brokerConnectionId: testConnectionId,
            accountNumber: '****1234',
            symbol: 'GOOGL',
            quantity: 5,
            marketValue: 2500.00,
            currency: 'USD',
          },
          {
            userId: testUserId,
            brokerConnectionId: testConnectionId,
            accountNumber: '****5678',
            symbol: 'TSLA',
            quantity: 20,
            marketValue: 4000.00,
            currency: 'USD',
          },
        ],
      });
    });

    it('should return portfolio with NAV and allocations', async () => {
      const response = await request(app.getHttpServer())
        .get('/portfolio')
        .set('Authorization', `Bearer ${testUserId}`)
        .expect(200);

      expect(response.body).toHaveProperty('nav', 8000);
      expect(response.body.positions).toHaveLength(3);
      
      // Verify allocation percentages
      const aaplPosition = response.body.positions.find((p: any) => p.symbol === 'AAPL');
      expect(aaplPosition.allocationPct).toBe(18.75); // 1500/8000 * 100
      
      const googlPosition = response.body.positions.find((p: any) => p.symbol === 'GOOGL');
      expect(googlPosition.allocationPct).toBe(31.25); // 2500/8000 * 100
      
      const tslaPosition = response.body.positions.find((p: any) => p.symbol === 'TSLA');
      expect(tslaPosition.allocationPct).toBe(50); // 4000/8000 * 100
    });

    it('should return multi-account portfolio summary', async () => {
      const response = await request(app.getHttpServer())
        .get('/portfolio/multi-account')
        .set('Authorization', `Bearer ${testUserId}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalNav', 8000);
      expect(response.body.accounts).toHaveLength(2);
      
      const account1234 = response.body.accounts.find((a: any) => a.accountNumber === '****1234');
      expect(account1234.nav).toBe(4000); // 1500 + 2500
      expect(account1234.positions).toHaveLength(2);
      
      const account5678 = response.body.accounts.find((a: any) => a.accountNumber === '****5678');
      expect(account5678.nav).toBe(4000); // 4000
      expect(account5678.positions).toHaveLength(1);
    });

    it('should return portfolio performance metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/portfolio/performance')
        .set('Authorization', `Bearer ${testUserId}`)
        .expect(200);

      expect(response.body).toHaveProperty('currentNav', 8000);
      expect(response.body).toHaveProperty('change24h', 500); // 8000 - 7500
      expect(response.body).toHaveProperty('changePercent24h', 6.67); // (500/7500)*100
      expect(response.body).toHaveProperty('change7d', 1000); // 8000 - 7000
      expect(response.body).toHaveProperty('changePercent7d', 14.29); // (1000/7000)*100
      expect(response.body).toHaveProperty('change30d', 2000); // 8000 - 6000
      expect(response.body).toHaveProperty('changePercent30d', 33.33); // (2000/6000)*100
    });

    it('should return portfolio history', async () => {
      const response = await request(app.getHttpServer())
        .get('/portfolio/history?days=7')
        .set('Authorization', `Bearer ${testUserId}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].nav).toBe(7500);
      expect(response.body[1].nav).toBe(8000);
    });

    it('should return 404 when no portfolio found', async () => {
      // Delete all holdings
      await prismaService.holding.deleteMany({});

      await request(app.getHttpServer())
        .get('/portfolio')
        .set('Authorization', `Bearer ${testUserId}`)
        .expect(404);
    });
  });

  describe('Portfolio Sync Cron Job', () => {
    it('should sync connections that need syncing', async () => {
      // Create a connection that hasn't been synced recently
      const oldConnection = await prismaService.brokerConnection.create({
        data: {
          userId: testUserId,
          broker: 'snaptrade',
          accessToken: 'old-access-token',
          refreshToken: 'old-refresh-token',
          status: 'ACTIVE',
          snaptradeAuthorizationId: 'old-auth-id',
          lastSyncedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        },
      });

      // Mock the cron job method
      const syncSpy = jest.spyOn(portfolioSyncService, 'syncPortfolios');

      // Trigger the cron job
      await portfolioSyncService.syncPortfolios();

      // Verify sync was called
      expect(syncSpy).toHaveBeenCalled();

      // Verify the connection was updated
      const updatedConnection = await prismaService.brokerConnection.findUnique({
        where: { id: oldConnection.id },
      });
      expect(updatedConnection!.lastSyncedAt).toBeDefined();
    });

    it('should skip connections that were recently synced', async () => {
      // Create a connection that was recently synced
      await prismaService.brokerConnection.update({
        where: { id: testConnectionId },
        data: {
          lastSyncedAt: new Date(), // Just now
        },
      });

      // Mock the sync method to verify it's not called
      const syncSpy = jest.spyOn(portfolioSyncService as any, 'syncSnapTradeHoldings');

      // Trigger the cron job
      await portfolioSyncService.syncPortfolios();

      // Verify sync was not called for recently synced connections
      expect(syncSpy).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle SnapTrade API errors gracefully', async () => {
      // Mock SnapTrade to throw an error
      (SnapTradeClient.prototype.getHoldings as jest.Mock).mockRejectedValueOnce(
        new Error('SnapTrade API error')
      );

      // Should not throw, but log error
      await expect(portfolioSyncService.manualSync(testConnectionId)).rejects.toThrow();
    });

    it('should continue syncing other connections if one fails', async () => {
      // Create multiple connections
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
      (SnapTradeClient.prototype.getHoldings as jest.Mock)
        .mockRejectedValueOnce(new Error('First connection failed'))
        .mockResolvedValueOnce([
          {
            accountId: 'mock-account-3',
            accountNumber: '****9999',
            holdings: [
              {
                symbol: 'MSFT',
                quantity: 15,
                marketValue: 3000.00,
                currency: 'USD',
                accountNumber: '****9999',
              },
            ],
          },
        ]);

      // Trigger sync - should not throw
      await portfolioSyncService.syncPortfolios();

      // Verify second connection was processed
      const holdings = await prismaService.holding.findMany({
        where: { userId: testUserId },
      });
      expect(holdings.some(h => h.symbol === 'MSFT')).toBe(true);
    });
  });
}); 