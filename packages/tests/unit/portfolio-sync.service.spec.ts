import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioSyncService } from '../../api/src/portfolio-sync/portfolio-sync.service';
import { PrismaService } from '../../api/src/lib/prisma.service';
import { EventBus } from '../../api/src/lib/event-bus';
import { SnapTradeClient } from '../../api/src/3rdparty/snaptrade/snaptrade.client';

// Mock SnapTradeClient
jest.mock('../../api/src/3rdparty/snaptrade/snaptrade.client');

describe('PortfolioSyncService', () => {
  let service: PortfolioSyncService;
  let mockPrismaService: jest.Mocked<PrismaService>;
  let mockEventBus: jest.Mocked<EventBus>;

  beforeEach(async () => {
    const mockPrisma = {
      brokerConnection: {
        findMany: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      holding: {
        upsert: jest.fn(),
      },
    } as any;

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
  });

  describe('syncPortfolios', () => {
    it('should sync active connections that need syncing', async () => {
      const mockConnections = [
        {
          id: 'conn-1',
          userId: 'user-1',
          broker: 'snaptrade',
          status: 'ACTIVE',
          lastSyncedAt: null, // Never synced
          snaptradeAuthorizationId: 'auth-1',
        },
        {
          id: 'conn-2',
          userId: 'user-2',
          broker: 'snaptrade',
          status: 'ACTIVE',
          lastSyncedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
          snaptradeAuthorizationId: 'auth-2',
        },
      ];

      const mockHoldings = [
        {
          accountNumber: '123',
          holdings: [
            {
              symbol: 'AAPL',
              quantity: 10,
              marketValue: 1500,
              currency: 'USD',
            },
          ],
        },
      ];

      (mockPrismaService.brokerConnection.findMany as jest.Mock).mockResolvedValue(mockConnections);
      (SnapTradeClient.prototype.getHoldings as jest.Mock).mockResolvedValue(mockHoldings);
      (mockPrismaService.holding.upsert as jest.Mock).mockResolvedValue({} as any);
      (mockPrismaService.brokerConnection.update as jest.Mock).mockResolvedValue({} as any);

      // Mock the cron job method directly
      await service.syncPortfolios();

      expect(mockPrismaService.brokerConnection.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
      });

      expect(mockPrismaService.brokerConnection.update).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.brokerConnection.update).toHaveBeenCalledWith({
        where: { id: 'conn-1' },
        data: { lastSyncedAt: expect.any(Date) },
      });
      expect(mockPrismaService.brokerConnection.update).toHaveBeenCalledWith({
        where: { id: 'conn-2' },
        data: { lastSyncedAt: expect.any(Date) },
      });

      expect(mockEventBus.publish).toHaveBeenCalledTimes(2);
      expect(mockEventBus.publish).toHaveBeenCalledWith('SyncQueued', {
        connectionId: 'conn-1',
        userId: 'user-1',
        broker: 'snaptrade',
        timestamp: expect.any(String),
      });
    });

    it('should not sync connections that were recently synced', async () => {
      const mockConnections = [
        {
          id: 'conn-1',
          userId: 'user-1',
          broker: 'snaptrade',
          status: 'ACTIVE',
          lastSyncedAt: new Date(), // Recently synced
          snaptradeAuthorizationId: 'auth-1',
        },
      ];

      (mockPrismaService.brokerConnection.findMany as jest.Mock).mockResolvedValue(mockConnections);

      await service.syncPortfolios();

      expect(mockPrismaService.brokerConnection.update).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (mockPrismaService.brokerConnection.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(service.syncPortfolios()).resolves.not.toThrow();
    });

    it('should handle SnapTrade sync errors for individual connections', async () => {
      const mockConnections = [
        {
          id: 'conn-1',
          userId: 'user-1',
          broker: 'snaptrade',
          status: 'ACTIVE',
          lastSyncedAt: null,
          snaptradeAuthorizationId: 'auth-1',
        },
      ];

      (mockPrismaService.brokerConnection.findMany as jest.Mock).mockResolvedValue(mockConnections);
      (SnapTradeClient.prototype.getHoldings as jest.Mock).mockRejectedValue(new Error('SnapTrade error'));
      (mockPrismaService.brokerConnection.update as jest.Mock).mockResolvedValue({} as any);

      // Should not throw
      await expect(service.syncPortfolios()).resolves.not.toThrow();

      // Should still update lastSyncedAt and publish event
      expect(mockPrismaService.brokerConnection.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
    });
  });

  describe('getConnectionsNeedingSync', () => {
    it('should return connections that need syncing', async () => {
      const mockConnections = [
        {
          id: 'conn-1',
          userId: 'user-1',
          broker: 'snaptrade',
          status: 'ACTIVE',
          lastSyncedAt: null,
          snaptradeAuthorizationId: 'auth-1',
        },
        {
          id: 'conn-2',
          userId: 'user-2',
          broker: 'snaptrade',
          status: 'ACTIVE',
          lastSyncedAt: new Date(Date.now() - 15 * 60 * 1000),
          snaptradeAuthorizationId: 'auth-2',
        },
        {
          id: 'conn-3',
          userId: 'user-3',
          broker: 'snaptrade',
          status: 'ACTIVE',
          lastSyncedAt: new Date(), // Recently synced
          snaptradeAuthorizationId: 'auth-3',
        },
      ];

      (mockPrismaService.brokerConnection.findMany as jest.Mock).mockResolvedValue(mockConnections);

      const result = await service.getConnectionsNeedingSync();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('conn-1');
      expect(result[1].id).toBe('conn-2');
    });
  });

  describe('manualSync', () => {
    it('should manually sync a specific connection', async () => {
      const mockConnection = {
        id: 'conn-1',
        userId: 'user-1',
        broker: 'snaptrade',
        status: 'ACTIVE',
        lastSyncedAt: null,
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
            },
          ],
        },
      ];

      (mockPrismaService.brokerConnection.findUnique as jest.Mock).mockResolvedValue(mockConnection);
      (SnapTradeClient.prototype.getHoldings as jest.Mock).mockResolvedValue(mockHoldings);
      (mockPrismaService.holding.upsert as jest.Mock).mockResolvedValue({} as any);
      (mockPrismaService.brokerConnection.update as jest.Mock).mockResolvedValue({} as any);

      await service.manualSync('conn-1');

      expect(mockPrismaService.brokerConnection.findUnique).toHaveBeenCalledWith({
        where: { id: 'conn-1' },
      });
      expect(mockPrismaService.brokerConnection.update).toHaveBeenCalledWith({
        where: { id: 'conn-1' },
        data: { lastSyncedAt: expect.any(Date) },
      });
    });

    it('should throw error when connection not found', async () => {
      (mockPrismaService.brokerConnection.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.manualSync('non-existent')).rejects.toThrow(
        'Connection non-existent not found'
      );
    });
  });
}); 