process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_KEY = 'test-key';
process.env.SNAPTRADE_CLIENT_ID = 'test-client-id';
process.env.SNAPTRADE_CONSUMER_KEY = 'test-consumer-key';

import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioSyncService } from '../../api/src/portfolio-sync/portfolio-sync.service';
import { PrismaService } from '../../api/src/lib/prisma.service';
import { EventBus } from '../../api/src/lib/event-bus';
import { SnapTradeClient } from '../../api/src/3rdparty/snaptrade/snaptrade.client';

// Mock dependencies
jest.mock('../../api/src/3rdparty/snaptrade/snaptrade.client');

describe('PortfolioSyncService - SnapTrade Holdings', () => {
  let service: PortfolioSyncService;
  let mockPrismaService: jest.Mocked<PrismaService>;
  let mockEventBus: jest.Mocked<EventBus>;

  beforeEach(async () => {
    const mockPrisma = {
      brokerConnection: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      holding: {
        upsert: jest.fn(),
      },
    };

    const mockEventBusInstance = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioSyncService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: EventBus,
          useValue: mockEventBusInstance,
        },
      ],
    }).compile();

    service = module.get<PortfolioSyncService>(PortfolioSyncService);
    mockPrismaService = module.get(PrismaService);
    mockEventBus = module.get(EventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('syncSnapTradeHoldings', () => {
    it('should sync SnapTrade holdings to database', async () => {
      const mockConnection = {
        id: 'conn-1',
        userId: 'user-1',
        broker: 'snaptrade',
        status: 'ACTIVE',
        snaptradeAuthorizationId: 'auth-1',
      };

      const mockHoldings = [
        {
          accountNumber: '123',
          holdings: [
            {
              symbol: 'AAPL',
              quantity: 10,
              marketValue: 1500,
              currency: 'USD',
              accountNumber: '123',
            },
            {
              symbol: 'GOOGL',
              quantity: 5,
              marketValue: 2500,
              currency: 'USD',
              accountNumber: '123',
            },
          ],
        },
        {
          accountNumber: '456',
          holdings: [
            {
              symbol: 'TSLA',
              quantity: 20,
              marketValue: 4000,
              currency: 'USD',
              accountNumber: '456',
            },
          ],
        },
      ];

      (SnapTradeClient.prototype.getHoldings as jest.Mock).mockResolvedValue(mockHoldings);
      (mockPrismaService.holding.upsert as jest.Mock).mockResolvedValue({} as any);

      await (service as any).syncSnapTradeHoldings(mockConnection);

      expect(SnapTradeClient.prototype.getHoldings).toHaveBeenCalledWith('auth-1');
      expect(mockPrismaService.holding.upsert).toHaveBeenCalledTimes(3);

      // Verify first holding upsert
      expect(mockPrismaService.holding.upsert).toHaveBeenCalledWith({
        where: {
          userId_symbol_accountNumber: {
            userId: 'user-1',
            symbol: 'AAPL',
            accountNumber: '123',
          },
        },
        update: {
          quantity: 10,
          marketValue: 1500,
          currency: 'USD',
          updatedAt: expect.any(Date),
        },
        create: {
          userId: 'user-1',
          brokerConnectionId: 'conn-1',
          accountNumber: '123',
          symbol: 'AAPL',
          quantity: 10,
          marketValue: 1500,
          currency: 'USD',
        },
      });

      // Verify second holding upsert
      expect(mockPrismaService.holding.upsert).toHaveBeenCalledWith({
        where: {
          userId_symbol_accountNumber: {
            userId: 'user-1',
            symbol: 'GOOGL',
            accountNumber: '123',
          },
        },
        update: {
          quantity: 5,
          marketValue: 2500,
          currency: 'USD',
          updatedAt: expect.any(Date),
        },
        create: {
          userId: 'user-1',
          brokerConnectionId: 'conn-1',
          accountNumber: '123',
          symbol: 'GOOGL',
          quantity: 5,
          marketValue: 2500,
          currency: 'USD',
        },
      });

      // Verify third holding upsert
      expect(mockPrismaService.holding.upsert).toHaveBeenCalledWith({
        where: {
          userId_symbol_accountNumber: {
            userId: 'user-1',
            symbol: 'TSLA',
            accountNumber: '456',
          },
        },
        update: {
          quantity: 20,
          marketValue: 4000,
          currency: 'USD',
          updatedAt: expect.any(Date),
        },
        create: {
          userId: 'user-1',
          brokerConnectionId: 'conn-1',
          accountNumber: '456',
          symbol: 'TSLA',
          quantity: 20,
          marketValue: 4000,
          currency: 'USD',
        },
      });
    });

    it('should handle empty holdings response', async () => {
      const mockConnection = {
        id: 'conn-1',
        userId: 'user-1',
        broker: 'snaptrade',
        status: 'ACTIVE',
        snaptradeAuthorizationId: 'auth-1',
      };

      (SnapTradeClient.prototype.getHoldings as jest.Mock).mockResolvedValue([]);

      await (service as any).syncSnapTradeHoldings(mockConnection);

      expect(SnapTradeClient.prototype.getHoldings).toHaveBeenCalledWith('auth-1');
      expect(mockPrismaService.holding.upsert).not.toHaveBeenCalled();
    });

    it('should throw error if SnapTrade API fails', async () => {
      const mockConnection = {
        id: 'conn-1',
        userId: 'user-1',
        broker: 'snaptrade',
        status: 'ACTIVE',
        snaptradeAuthorizationId: 'auth-1',
      };

      // Remove any previous mockResolvedValue for getHoldings
      (SnapTradeClient.prototype.getHoldings as jest.Mock).mockReset();
      (SnapTradeClient.prototype.getHoldings as jest.Mock).mockRejectedValue(new Error('SnapTrade API error'));

      await expect((service as any).syncSnapTradeHoldings(mockConnection)).rejects.toThrow('SnapTrade API error');
    });
  });

  describe('manualSync method', () => {
    it('should manually sync a specific SnapTrade connection', async () => {
      jest.useFakeTimers();
      const now = new Date('2023-01-01T12:00:00Z');
      jest.setSystemTime(now);

      const mockConnection = {
        id: 'conn-123',
        userId: 'user-456',
        broker: 'snaptrade',
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        scope: null,
        status: 'ACTIVE',
        snapTradeUserId: 'snap-user-123',
        snaptradeAuthorizationId: 'auth-789',
        lastSyncedAt: null,
        createdAt: '2023-01-01T10:00:00Z',
        updatedAt: '2023-01-01T10:00:00Z',
      };

      const mockHoldings = [
        {
          accountId: 'account-1',
          accountNumber: '****1234',
          holdings: [
            {
              symbol: 'AAPL',
              quantity: 10,
              marketValue: 1500.00,
              currency: 'USD',
              accountNumber: '****1234',
            },
          ],
        },
      ];

      // Setup mocks
      (mockPrismaService.brokerConnection.findUnique as jest.Mock).mockResolvedValue(mockConnection);
      (mockPrismaService.holding.upsert as jest.Mock).mockResolvedValue({} as any);
      (mockPrismaService.brokerConnection.update as jest.Mock).mockResolvedValue({} as any);

      // Run manual sync
      await service.manualSync('conn-123');

      // Verify holding was upserted
      expect(mockPrismaService.holding.upsert).toHaveBeenCalledWith({
        where: {
          userId_symbol_accountNumber: {
            userId: 'user-456',
            symbol: 'AAPL',
            accountNumber: '****1234',
          },
        },
        update: {
          quantity: 10,
          marketValue: 1500.00,
          currency: 'USD',
          updatedAt: now.toISOString(),
        },
        create: {
          userId: 'user-456',
          brokerConnectionId: 'conn-123',
          accountNumber: '****1234',
          symbol: 'AAPL',
          quantity: 10,
          marketValue: 1500.00,
          currency: 'USD',
        },
      });

      // Verify connection timestamp was updated
      expect(mockPrismaService.brokerConnection.update).toHaveBeenCalledWith({
        where: { id: 'conn-123' },
        data: { lastSyncedAt: now }
      });
    });

    it('should throw error for non-existent connection', async () => {
      // Setup mocks
      (mockPrismaService.brokerConnection.findUnique as jest.Mock).mockResolvedValue(null);

      // Run manual sync - should throw
      await expect(service.manualSync('non-existent')).rejects.toThrow('Connection non-existent not found');
    });

    it('should handle non-SnapTrade connections in manual sync', async () => {
      jest.useFakeTimers();
      const now = new Date('2023-01-01T12:00:00Z');
      jest.setSystemTime(now);

      const mockConnection = {
        id: 'conn-123',
        userId: 'user-456',
        broker: 'questrade', // Not SnapTrade
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        scope: null,
        status: 'ACTIVE',
        snapTradeUserId: 'snap-user-123',
        snaptradeAuthorizationId: null, // No authorization ID for non-SnapTrade
        lastSyncedAt: null,
        createdAt: '2023-01-01T10:00:00Z',
        updatedAt: '2023-01-01T10:00:00Z',
      };

      // Setup mocks
      (mockPrismaService.brokerConnection.findUnique as jest.Mock).mockResolvedValue(mockConnection);
      (mockPrismaService.brokerConnection.update as jest.Mock).mockResolvedValue({} as any);

      // Run manual sync
      await service.manualSync('conn-123');

      // Verify connection timestamp was updated
      expect(mockPrismaService.brokerConnection.update).toHaveBeenCalledWith({
        where: { id: 'conn-123' },
        data: { lastSyncedAt: now }
      });
    });
  });
}); 