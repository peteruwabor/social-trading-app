import { Test, TestingModule } from '@nestjs/testing';
import { BrokerConnectionService } from '../../api/src/broker-connection/broker-connection.service';
import { PrismaService } from '../../api/src/lib/prisma.service';
import { EventBus } from '../../api/src/lib/event-bus';
import { SnapTradeClient } from '../../api/src/3rdparty/snaptrade/snaptrade.client';
import { PortfolioSyncService } from '../../api/src/portfolio-sync/portfolio-sync.service';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Mock SnapTradeClient
jest.mock('../../api/src/3rdparty/snaptrade/snaptrade.client');
jest.mock('axios');
jest.mock('uuid');

describe('BrokerConnectionService - SnapTrade Integration', () => {
  let service: BrokerConnectionService;
  let mockPrismaService: jest.Mocked<PrismaService>;
  let mockEventBus: jest.Mocked<EventBus>;

  beforeEach(async () => {
    const mockPrisma = {
      brokerConnection: {
        create: jest.fn(),
        updateMany: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    } as any;

    const mockEventBusInstance = {
      publish: jest.fn(),
    };

    const mockPortfolioSyncService = {
      manualSync: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrokerConnectionService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: EventBus,
          useValue: mockEventBusInstance,
        },
        {
          provide: PortfolioSyncService,
          useValue: mockPortfolioSyncService,
        },
      ],
    }).compile();

    service = module.get<BrokerConnectionService>(BrokerConnectionService);
    mockPrismaService = module.get(PrismaService);
    mockEventBus = module.get(EventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.SNAPTRADE_MOCK;
  });

  describe('createAuthUrl', () => {
    it('should create SnapTrade auth URL and persist connection', async () => {
      const mockConnectToken = 'test-connect-token';
      const mockAuthUrl = `https://app.snaptrade.com/connect?client_id=${process.env.SNAPTRADE_CLIENT_ID}&connect_token=${mockConnectToken}`;
      
      const mockCreatedConnection = {
        id: 'conn-123',
        userId: 'user-123',
        broker: 'snaptrade',
        accessToken: mockConnectToken,
        refreshToken: '',
        scope: null,
        status: 'pending',
        lastSyncedAt: null,
        lastTradePollAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        snaptradeUserId: 'user-123',
        snaptradeAuthorizationId: null,
      };

      // Mock SnapTrade client
      (SnapTradeClient.prototype.createConnectToken as jest.Mock).mockResolvedValue({
        connectToken: mockConnectToken,
      });

      // Mock Prisma create
      (mockPrismaService.brokerConnection.create as jest.Mock).mockResolvedValue(mockCreatedConnection);

      const result = await service.createAuthUrl('snaptrade', 'user-123');

      expect(result.authUrl).toBe(mockAuthUrl);
      expect(mockPrismaService.brokerConnection.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          broker: 'snaptrade',
          snaptradeUserId: 'user-123',
          snaptradeAuthorizationId: null,
          status: 'pending',
          accessToken: mockConnectToken,
          refreshToken: '',
        },
      });
    });

    it('should handle non-SnapTrade brokers', async () => {
      const result = await service.createAuthUrl('robinhood', 'user-123');

      expect(result.authUrl).toBe('https://robinhood.com/oauth/authorize?client_id=123&redirect_uri=https://app.gioat.com/callback');
    });
  });

  describe('handleSnaptradeCallback', () => {
    it('should update connection status and emit event', async () => {
      const callbackData = {
        snaptrade_user_id: 'user-123',
        snaptrade_authorization_id: 'auth-456',
      };

      const mockUpdatedConnection = {
        id: 'conn-123',
        userId: 'user-123',
        broker: 'snaptrade',
        accessToken: 'test-token',
        refreshToken: '',
        scope: null,
        status: 'active',
        lastSyncedAt: null,
        lastTradePollAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        snaptradeUserId: 'user-123',
        snaptradeAuthorizationId: 'auth-456',
      };

      // Mock Prisma updateMany
      (mockPrismaService.brokerConnection.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      // Mock Prisma findFirst
      (mockPrismaService.brokerConnection.findFirst as jest.Mock).mockResolvedValue(mockUpdatedConnection);

      const result = await service.handleSnaptradeCallback(callbackData);

      expect(result.message).toBe('SnapTrade connection activated successfully');
      expect(mockPrismaService.brokerConnection.updateMany).toHaveBeenCalledWith({
        where: {
          snaptradeUserId: 'user-123',
          status: 'pending',
        },
        data: {
          status: 'active',
          snaptradeAuthorizationId: 'auth-456',
        },
      });
      expect(mockEventBus.publish).toHaveBeenCalledWith('ConnectionCreated', {
        connectionId: 'conn-123',
        userId: 'user-123',
        broker: 'snaptrade',
      });
    });

    it('should throw error when no pending connection found', async () => {
      const callbackData = {
        snaptrade_user_id: 'user-123',
        snaptrade_authorization_id: 'auth-456',
      };

      // Mock Prisma updateMany to return no updated records
      (mockPrismaService.brokerConnection.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      await expect(service.handleSnaptradeCallback(callbackData)).rejects.toThrow(
        'No pending SnapTrade connection found for this user'
      );
    });

    it('should throw error when updated connection not found', async () => {
      const callbackData = {
        snaptrade_user_id: 'user-123',
        snaptrade_authorization_id: 'auth-456',
      };

      // Mock Prisma updateMany
      (mockPrismaService.brokerConnection.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      // Mock Prisma findFirst to return null
      (mockPrismaService.brokerConnection.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.handleSnaptradeCallback(callbackData)).rejects.toThrow(
        'Failed to retrieve updated connection'
      );
    });
  });

  describe('listByUser', () => {
    it('should return connections with health colors', async () => {
      const mockConnections = [
        {
          id: 'conn-1',
          userId: 'user-123',
          broker: 'snaptrade',
          accessToken: 'token-1',
          refreshToken: 'refresh-1',
          scope: null,
          status: 'active',
          lastSyncedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          snaptradeUserId: 'user-123',
          snaptradeAuthorizationId: 'auth-1',
        },
        {
          id: 'conn-2',
          userId: 'user-123',
          broker: 'robinhood',
          accessToken: 'token-2',
          refreshToken: 'refresh-2',
          scope: null,
          status: 'active',
          lastSyncedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          snaptradeUserId: null,
          snaptradeAuthorizationId: null,
        },
      ];

      (mockPrismaService.brokerConnection.findMany as jest.Mock).mockResolvedValue(mockConnections);

      const result = await service.listByUser('user-123');

      expect(result).toHaveLength(2);
      expect(result[0].healthColor).toBe('green'); // Recently synced
      expect(result[1].healthColor).toBe('red'); // Never synced (null lastSyncedAt)
      expect(mockPrismaService.brokerConnection.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
        },
      });
    });
  });

  describe('disconnect', () => {
    it('should update connection status to revoked and emit event', async () => {
      const connectionId = 'conn-123';
      const userId = 'user-123';

      // Mock Prisma updateMany
      (mockPrismaService.brokerConnection.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await service.disconnect(connectionId, userId);

      expect(mockPrismaService.brokerConnection.updateMany).toHaveBeenCalledWith({
        where: {
          id: connectionId,
          userId: userId,
        },
        data: {
          status: 'revoked',
        },
      });
      expect(mockEventBus.publish).toHaveBeenCalledWith('connection.revoked', { connectionId });
    });

    it('should throw error when connection not found', async () => {
      const connectionId = 'conn-123';
      const userId = 'user-123';

      // Mock Prisma updateMany to return no updated records
      (mockPrismaService.brokerConnection.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      await expect(service.disconnect(connectionId, userId)).rejects.toThrow(
        'Connection not found or user does not have permission.'
      );
    });
  });
});

describe('SnapTradeClient.placeOrder', () => {
  const client = new SnapTradeClient();
  const params = {
    authorizationId: 'auth-123',
    accountNumber: 'acct-456',
    symbol: 'AAPL',
    side: 'BUY' as const,
    quantity: 10,
  };

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.SNAPTRADE_MOCK;
  });

  it('returns a mock orderId if SNAPTRADE_MOCK=true', async () => {
    process.env.SNAPTRADE_MOCK = 'true';
    (uuidv4 as jest.Mock).mockReturnValue('mock-uuid');
    const result = await client.placeOrder(params);
    expect(result).toEqual({ orderId: 'mock-uuid' });
  });

  it('calls axios and returns orderId if SNAPTRADE_MOCK is not true', async () => {
    process.env.SNAPTRADE_MOCK = 'false';
    (axios.post as jest.Mock).mockResolvedValue({ data: { orderId: 'real-order-id' } });
    const result = await client.placeOrder(params);
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining(`/authorizations/${params.authorizationId}/accounts/${params.accountNumber}/orders`),
      expect.objectContaining({ symbol: params.symbol, side: params.side, quantity: params.quantity }),
      expect.objectContaining({ headers: expect.any(Object) })
    );
    expect(result).toEqual({ orderId: 'real-order-id' });
  });
}); 