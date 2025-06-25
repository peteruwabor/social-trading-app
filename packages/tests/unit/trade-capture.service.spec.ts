process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_KEY = 'test-key';
process.env.SNAPTRADE_CLIENT_ID = 'test-client-id';
process.env.SNAPTRADE_CONSUMER_KEY = 'test-consumer-key';

import { Test, TestingModule } from '@nestjs/testing';
import { TradeCaptureService } from '../../api/src/trade-capture/trade-capture.service';
import { PrismaService } from '../../api/src/lib/prisma.service';
import { EventBus } from '../../api/src/lib/event-bus';
import { SnapTradeClient } from '../../api/src/3rdparty/snaptrade/snaptrade.client';

// Mock SnapTradeClient
jest.mock('../../api/src/3rdparty/snaptrade/snaptrade.client');

describe('TradeCaptureService', () => {
  let service: TradeCaptureService;
  let mockPrismaService: jest.Mocked<PrismaService>;
  let mockEventBus: jest.Mocked<EventBus>;

  beforeEach(async () => {
    const mockPrisma = {
      brokerConnection: {
        findMany: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      trade: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
    } as any;

    const mockEventBusInstance = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradeCaptureService,
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

    service = module.get<TradeCaptureService>(TradeCaptureService);
    mockPrismaService = module.get(PrismaService);
    mockEventBus = module.get(EventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('captureTrades', () => {
    it('should process trades for active SnapTrade connections', async () => {
      const mockConnections = [
        {
          id: 'conn-1',
          userId: 'user-1',
          broker: 'snaptrade',
          status: 'ACTIVE',
          snaptradeAuthorizationId: 'auth-1',
          lastTradePollAt: new Date(Date.now() - 1000),
        },
      ];

      const mockActivities = [
        {
          type: 'FILL',
          data: {
            account_number: '123',
            symbol: 'AAPL',
            side: 'BUY',
            quantity: 10,
            price: 150.50,
            filled_at: '2023-01-01T10:00:00Z',
          },
          timestamp: '2023-01-01T10:00:00Z',
        },
      ];

      (mockPrismaService.brokerConnection.findMany as jest.Mock).mockResolvedValue(mockConnections);
      (SnapTradeClient.prototype.getActivities as jest.Mock).mockResolvedValue(mockActivities);
      (mockPrismaService.trade.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrismaService.trade.create as jest.Mock).mockResolvedValue({ id: 'trade-1' } as any);
      (mockPrismaService.brokerConnection.update as jest.Mock).mockResolvedValue({} as any);

      await service.captureTrades();

      expect(mockPrismaService.brokerConnection.findMany).toHaveBeenCalledWith({
        where: {
          broker: 'snaptrade',
          status: 'ACTIVE',
        },
      });

      expect(mockPrismaService.trade.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          brokerConnectionId: 'conn-1',
          symbol: 'AAPL',
          side: 'BUY',
          quantity: 10,
          filledAt: new Date('2023-01-01T10:00:00Z'),
        },
      });

      expect(mockPrismaService.trade.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          brokerConnectionId: 'conn-1',
          accountNumber: '123',
          symbol: 'AAPL',
          side: 'BUY',
          quantity: 10,
          fillPrice: 150.50,
          filledAt: new Date('2023-01-01T10:00:00Z'),
        },
      });

      expect(mockEventBus.publish).toHaveBeenCalledWith('LeaderTradeFilled', {
        user_id: 'user-1',
        broker_connection_id: 'conn-1',
        trade: {
          account_number: '123',
          symbol: 'AAPL',
          side: 'BUY',
          quantity: 10,
          fill_price: 150.50,
          filled_at: '2023-01-01T10:00:00Z',
        },
      });
    });

    it('should handle connections without SnapTrade authorization ID', async () => {
      const mockConnections = [
        {
          id: 'conn-1',
          userId: 'user-1',
          broker: 'snaptrade',
          status: 'ACTIVE',
          snaptradeAuthorizationId: null,
          lastTradePollAt: new Date(),
        },
      ];

      (mockPrismaService.brokerConnection.findMany as jest.Mock).mockResolvedValue(mockConnections);

      await service.captureTrades();

      expect(SnapTradeClient.prototype.getActivities).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (mockPrismaService.brokerConnection.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(service.captureTrades()).resolves.not.toThrow();
    });
  });
}); 