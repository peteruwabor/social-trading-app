import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CopyEngineService, LeaderTradeFilledEvent } from '../../api/src/modules/copy-engine/copy-engine.service';
import { PrismaService } from '../../api/src/lib/prisma.service';
import { EventBus } from '../../api/src/lib/event-bus';
import { SnapTradeClient } from '../../api/src/3rdparty/snaptrade/snaptrade.client';
import { withinMaxPositionPct } from '../../api/src/lib/guardrails.util';
import { AdvancedCopyTradingService } from '../../api/src/modules/copy-engine/advanced-copy-trading.service';

// Mock SnapTradeClient
jest.mock('../../api/src/3rdparty/snaptrade/snaptrade.client');
// Mock guardrails utility
jest.mock('../../api/src/lib/guardrails.util');

describe('CopyEngineService', () => {
  let service: CopyEngineService;
  let mockPrismaService: jest.Mocked<PrismaService>;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;

  const leaderId = 'leader-123';
  const followerId = 'follower-456';
  const brokerConnectionId = 'conn-789';

  beforeEach(async () => {
    const mockPrisma = {
      trade: {
        findFirst: jest.fn(),
      },
      holding: {
        findMany: jest.fn(),
      },
      follower: {
        findMany: jest.fn(),
      },
      brokerConnection: {
        findFirst: jest.fn(),
      },
      copyOrder: {
        create: jest.fn(),
        update: jest.fn(),
      },
    } as any;

    const mockEventBusInstance = {
      publish: jest.fn(),
    };

    const mockEventEmitterInstance = {
      emit: jest.fn(),
    };

    const mockAdvancedCopyTradingService = {
      validateRiskLimits: jest.fn().mockResolvedValue({ allowed: true }),
      calculateKellyPositionSize: jest.fn().mockResolvedValue(0.05),
      calculateRiskParityPositionSize: jest.fn().mockResolvedValue(0.05),
      calculateMomentumPositionSize: jest.fn().mockResolvedValue(0.05),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CopyEngineService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: EventBus,
          useValue: mockEventBusInstance,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitterInstance,
        },
        {
          provide: AdvancedCopyTradingService,
          useValue: mockAdvancedCopyTradingService,
        },
      ],
    }).compile();

    service = module.get<CopyEngineService>(CopyEngineService);
    mockPrismaService = module.get(PrismaService);
    mockEventBus = module.get(EventBus);
    mockEventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleLeaderTradeFilled', () => {
    const mockEvent: LeaderTradeFilledEvent = {
      user_id: leaderId,
      broker_connection_id: brokerConnectionId,
      trade: {
        account_number: '****1234',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 10,
        fill_price: 150.00,
        filled_at: '2023-01-01T10:00:00Z',
      },
    };

    const mockLeaderTrade = {
      id: 'trade-123',
      userId: leaderId,
      brokerConnectionId,
      symbol: 'AAPL',
      side: 'BUY',
      quantity: 10,
      fillPrice: 150.00,
      filledAt: new Date('2023-01-01T10:00:00Z'),
      brokerConnection: {
        id: brokerConnectionId,
        snaptradeAuthorizationId: 'auth-123',
      },
    };

    const mockLeaderHoldings = [
      {
        id: 'holding-1',
        userId: leaderId,
        symbol: 'AAPL',
        marketValue: 1500.00,
      },
      {
        id: 'holding-2',
        userId: leaderId,
        symbol: 'GOOGL',
        marketValue: 2500.00,
      },
    ];

    const mockFollower = {
      id: 'follower-1',
      leaderId,
      followerId,
      autoCopy: true,
      alertOnly: false,
    };

    const mockFollowerHoldings = [
      {
        id: 'follower-holding-1',
        userId: followerId,
        symbol: 'AAPL',
        marketValue: 750.00,
      },
      {
        id: 'follower-holding-2',
        userId: followerId,
        symbol: 'GOOGL',
        marketValue: 1250.00,
      },
    ];

    const mockFollowerConnection = {
      id: 'follower-conn-1',
      userId: followerId,
      status: 'ACTIVE',
      snaptradeAuthorizationId: 'follower-auth-456',
    };

    const mockCopyOrder = {
      id: 'copy-order-1',
      leaderTradeId: mockLeaderTrade.id,
      followerId,
      symbol: 'AAPL',
      side: 'BUY',
      quantity: 5,
      status: 'queued',
    };

    it('should process leader trade and create copy orders for followers', async () => {
      // Mock Prisma queries
      (mockPrismaService.trade.findFirst as jest.Mock).mockResolvedValue(mockLeaderTrade);
      (mockPrismaService.holding.findMany as jest.Mock)
        .mockResolvedValueOnce(mockLeaderHoldings) // Leader holdings
        .mockResolvedValueOnce(mockFollowerHoldings); // Follower holdings
      (mockPrismaService.follower.findMany as jest.Mock).mockResolvedValue([mockFollower]);
      (mockPrismaService.brokerConnection.findFirst as jest.Mock).mockResolvedValue(mockFollowerConnection);
      (mockPrismaService.copyOrder.create as jest.Mock).mockResolvedValue(mockCopyOrder);
      (mockPrismaService.copyOrder.update as jest.Mock).mockResolvedValue({ ...mockCopyOrder, status: 'placed' });

      // Mock SnapTrade placeOrder
      (SnapTradeClient.prototype.placeOrder as jest.Mock).mockResolvedValue({ orderId: 'snaptrade-order-123' });

      // Mock guardrails check
      (withinMaxPositionPct as jest.Mock).mockResolvedValue(true);

      // Trigger the event handler
      await service.handleLeaderTradeFilled(mockEvent);

      // Verify guardrails check was called
      expect(withinMaxPositionPct).toHaveBeenCalledWith(
        followerId,
        'AAPL',
        0.375 // (1500/4000) = 0.375
      );

      // Verify leader trade lookup
      expect(mockPrismaService.trade.findFirst).toHaveBeenCalledWith({
        where: {
          userId: leaderId,
          brokerConnectionId,
          symbol: 'AAPL',
          side: 'BUY',
          quantity: 10,
          filledAt: new Date('2023-01-01T10:00:00Z'),
        },
        include: {
          brokerConnection: true,
        },
      });

      // Verify leader holdings lookup
      expect(mockPrismaService.holding.findMany).toHaveBeenCalledWith({
        where: { userId: leaderId },
      });

      // Verify followers lookup
      expect(mockPrismaService.follower.findMany).toHaveBeenCalledWith({
        where: {
          leaderId,
          autoCopy: true,
        },
      });

      // Verify follower holdings lookup
      expect(mockPrismaService.holding.findMany).toHaveBeenCalledWith({
        where: { userId: followerId },
      });

      // Verify follower connection lookup
      expect(mockPrismaService.brokerConnection.findFirst).toHaveBeenCalledWith({
        where: {
          userId: followerId,
          status: 'ACTIVE',
        },
      });

      // Verify CopyOrder creation
      expect(mockPrismaService.copyOrder.create).toHaveBeenCalledWith({
        data: {
          leaderTradeId: mockLeaderTrade.id,
          followerId,
          symbol: 'AAPL',
          side: 'BUY',
          quantity: 5, // (1500/4000 * 2000) / 150 = 5
          status: 'queued',
        },
      });

      // Verify SnapTrade placeOrder call
      expect(SnapTradeClient.prototype.placeOrder).toHaveBeenCalledWith({
        authorizationId: 'follower-auth-456',
        accountNumber: '****1234',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 5,
      });

      // Verify CopyOrder status update
      expect(mockPrismaService.copyOrder.update).toHaveBeenCalledWith({
        where: { id: mockCopyOrder.id },
        data: {
          status: 'placed',
          filledAt: expect.any(Date),
        },
      });

      // Verify CopyExecuted event publication
      expect(mockEventBus.publish).toHaveBeenCalledWith('CopyExecuted', {
        copyOrderId: mockCopyOrder.id,
        followerId,
        leaderTradeId: mockLeaderTrade.id,
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 5,
        status: 'placed',
      });
    });

    it('should skip followers when position limit is exceeded', async () => {
      // Mock Prisma queries
      (mockPrismaService.trade.findFirst as jest.Mock).mockResolvedValue(mockLeaderTrade);
      (mockPrismaService.holding.findMany as jest.Mock)
        .mockResolvedValueOnce(mockLeaderHoldings) // Leader holdings
        .mockResolvedValueOnce(mockFollowerHoldings); // Follower holdings
      (mockPrismaService.follower.findMany as jest.Mock).mockResolvedValue([mockFollower]);

      // Mock guardrails check to return false (limit exceeded)
      (withinMaxPositionPct as jest.Mock).mockResolvedValue(false);

      await service.handleLeaderTradeFilled(mockEvent);

      // Verify guardrails check was called
      expect(withinMaxPositionPct).toHaveBeenCalledWith(
        followerId,
        'AAPL',
        0.375
      );

      // Should not create CopyOrder or call placeOrder
      expect(mockPrismaService.copyOrder.create).not.toHaveBeenCalled();
      expect(SnapTradeClient.prototype.placeOrder).not.toHaveBeenCalled();
    });

    it('should skip followers with quantity < 1', async () => {
      // Mock data with very small follower NAV
      const smallFollowerHoldings = [
        {
          id: 'follower-holding-1',
          userId: followerId,
          symbol: 'AAPL',
          marketValue: 50.00, // Very small NAV
        },
      ];

      (mockPrismaService.trade.findFirst as jest.Mock).mockResolvedValue(mockLeaderTrade);
      (mockPrismaService.holding.findMany as jest.Mock)
        .mockResolvedValueOnce(mockLeaderHoldings)
        .mockResolvedValueOnce(smallFollowerHoldings);
      (mockPrismaService.follower.findMany as jest.Mock).mockResolvedValue([mockFollower]);

      await service.handleLeaderTradeFilled(mockEvent);

      // Should not call guardrails check or create CopyOrder
      expect(withinMaxPositionPct).not.toHaveBeenCalled();
      expect(mockPrismaService.copyOrder.create).not.toHaveBeenCalled();
      expect(SnapTradeClient.prototype.placeOrder).not.toHaveBeenCalled();
    });

    it('should handle missing leader trade gracefully', async () => {
      (mockPrismaService.trade.findFirst as jest.Mock).mockResolvedValue(null);

      await service.handleLeaderTradeFilled(mockEvent);

      // Should not proceed with any processing
      expect(mockPrismaService.follower.findMany).not.toHaveBeenCalled();
      expect(withinMaxPositionPct).not.toHaveBeenCalled();
      expect(mockPrismaService.copyOrder.create).not.toHaveBeenCalled();
    });

    it('should handle missing follower connection gracefully', async () => {
      (mockPrismaService.trade.findFirst as jest.Mock).mockResolvedValue(mockLeaderTrade);
      (mockPrismaService.holding.findMany as jest.Mock)
        .mockResolvedValueOnce(mockLeaderHoldings)
        .mockResolvedValueOnce(mockFollowerHoldings);
      (mockPrismaService.follower.findMany as jest.Mock).mockResolvedValue([mockFollower]);
      (mockPrismaService.brokerConnection.findFirst as jest.Mock).mockResolvedValue(null);

      // Mock guardrails check
      (withinMaxPositionPct as jest.Mock).mockResolvedValue(true);

      await service.handleLeaderTradeFilled(mockEvent);

      // Should not create CopyOrder
      expect(mockPrismaService.copyOrder.create).not.toHaveBeenCalled();
    });

    it('should handle placeOrder failure and update CopyOrder status', async () => {
      // Mock successful setup
      (mockPrismaService.trade.findFirst as jest.Mock).mockResolvedValue(mockLeaderTrade);
      (mockPrismaService.holding.findMany as jest.Mock)
        .mockResolvedValueOnce(mockLeaderHoldings)
        .mockResolvedValueOnce(mockFollowerHoldings);
      (mockPrismaService.follower.findMany as jest.Mock).mockResolvedValue([mockFollower]);
      (mockPrismaService.brokerConnection.findFirst as jest.Mock).mockResolvedValue(mockFollowerConnection);
      (mockPrismaService.copyOrder.create as jest.Mock).mockResolvedValue(mockCopyOrder);

      // Mock guardrails check
      (withinMaxPositionPct as jest.Mock).mockResolvedValue(true);

      // Mock placeOrder failure
      (SnapTradeClient.prototype.placeOrder as jest.Mock).mockRejectedValue(new Error('API Error'));

      await service.handleLeaderTradeFilled(mockEvent);

      // Verify CopyOrder status updated to failed
      expect(mockPrismaService.copyOrder.update).toHaveBeenCalledWith({
        where: { id: mockCopyOrder.id },
        data: { status: 'failed' },
      });

      // Verify CopyExecuted event with failure status
      expect(mockEventBus.publish).toHaveBeenCalledWith('CopyExecuted', {
        copyOrderId: mockCopyOrder.id,
        followerId,
        leaderTradeId: mockLeaderTrade.id,
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 5,
        status: 'failed',
        error: 'API Error',
      });
    });
  });

  describe('roundToLot', () => {
    it('should floor the quantity', () => {
      expect(service.roundToLot(5.7)).toBe(5);
      expect(service.roundToLot(5.2)).toBe(5);
      expect(service.roundToLot(5.0)).toBe(5);
      expect(service.roundToLot(0.9)).toBe(0);
    });
  });
}); 