import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../api/src/app.module';
import { EventBus } from '../../api/src/lib/event-bus';
import { PrismaService } from '../../api/src/lib/prisma.service';
import { SnapTradeClient } from '../../api/src/3rdparty/snaptrade/snaptrade.client';
import { CopyEngineService, LeaderTradeFilledEvent } from '../../api/src/modules/copy-engine/copy-engine.service';
import { v4 as uuidv4 } from 'uuid';

// Mock SnapTradeClient
jest.mock('../../api/src/3rdparty/snaptrade/snaptrade.client');

describe('Auto-Copy (e2e)', () => {
  let app: INestApplication;
  let eventBus: EventBus;
  let prismaService: PrismaService;
  let copyEngineService: CopyEngineService;
  let mockSnapTradeClient: jest.Mocked<SnapTradeClient>;

  // Test data
  let leaderId: string;
  let followerId: string;
  let leaderConnectionId: string;
  let followerConnectionId: string;
  let leaderTradeId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    eventBus = moduleFixture.get<EventBus>(EventBus);
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    copyEngineService = moduleFixture.get<CopyEngineService>(CopyEngineService);
    mockSnapTradeClient = moduleFixture.get(SnapTradeClient);

    // Initialize test data
    leaderId = uuidv4();
    followerId = uuidv4();
    leaderConnectionId = uuidv4();
    followerConnectionId = uuidv4();
    leaderTradeId = uuidv4();
  });

  beforeEach(async () => {
    // Clean up any existing test data in proper order to avoid foreign key constraints
    await prismaService.copyOrder.deleteMany();
    await prismaService.trade.deleteMany();
    await prismaService.holding.deleteMany();
    await prismaService.follower.deleteMany();
    await prismaService.brokerConnection.deleteMany();
    await prismaService.user.deleteMany();

    // Reset mocks
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should process LeaderTradeFilled event and create copy orders for followers', async () => {
    // Step 1: Seed leader user
    await prismaService.user.create({
      data: {
        id: leaderId,
        email: 'leader@gioat.app',
      }
    });

    // Step 2: Seed follower user
    await prismaService.user.create({
      data: {
        id: followerId,
        email: 'follower@gioat.app',
      }
    });

    // Step 3: Seed leader broker connection
    await prismaService.brokerConnection.create({
      data: {
        id: leaderConnectionId,
        userId: leaderId,
        broker: 'snaptrade',
        accessToken: 'leader-access-token',
        refreshToken: 'leader-refresh-token',
        status: 'ACTIVE',
        snaptradeAuthorizationId: 'leader-auth-123',
      }
    });

    // Step 4: Seed follower broker connection
    await prismaService.brokerConnection.create({
      data: {
        id: followerConnectionId,
        userId: followerId,
        broker: 'snaptrade',
        accessToken: 'follower-access-token',
        refreshToken: 'follower-refresh-token',
        status: 'ACTIVE',
        snaptradeAuthorizationId: 'follower-auth-456',
      }
    });

    // Step 5: Seed follower relationship with autoCopy=true
    await prismaService.follower.create({
      data: {
        leaderId: leaderId,
        followerId: followerId,
        autoCopy: true,
        alertOnly: false,
      }
    });

    // Step 6: Seed leader holdings (NAV = 100,000)
    await prismaService.holding.createMany({
      data: [
        {
          userId: leaderId,
          brokerConnectionId: leaderConnectionId,
          accountNumber: 'leader-account',
          symbol: 'AAPL',
          quantity: 100,
          marketValue: 20000, // 100 shares * $200
          currency: 'USD',
        },
        {
          userId: leaderId,
          brokerConnectionId: leaderConnectionId,
          accountNumber: 'leader-account',
          symbol: 'GOOGL',
          quantity: 50,
          marketValue: 80000, // 50 shares * $1600
          currency: 'USD',
        },
      ]
    });

    // Step 7: Seed follower holdings (NAV = 20,000)
    await prismaService.holding.createMany({
      data: [
        {
          userId: followerId,
          brokerConnectionId: followerConnectionId,
          accountNumber: 'follower-account',
          symbol: 'AAPL',
          quantity: 10,
          marketValue: 2000, // 10 shares * $200
          currency: 'USD',
        },
        {
          userId: followerId,
          brokerConnectionId: followerConnectionId,
          accountNumber: 'follower-account',
          symbol: 'GOOGL',
          quantity: 5,
          marketValue: 8000, // 5 shares * $1600
          currency: 'USD',
        },
        {
          userId: followerId,
          brokerConnectionId: followerConnectionId,
          accountNumber: 'follower-account',
          symbol: 'TSLA',
          quantity: 20,
          marketValue: 10000, // 20 shares * $500
          currency: 'USD',
        },
      ]
    });

    // Step 8: Seed leader trade (5% of NAV = $5,000 worth of AAPL at $200 = 25 shares)
    const leaderTrade = await prismaService.trade.create({
      data: {
        id: leaderTradeId,
        userId: leaderId,
        brokerConnectionId: leaderConnectionId,
        accountNumber: 'leader-account',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 25,
        fillPrice: 200,
        filledAt: new Date('2023-01-01T10:00:00Z'),
      }
    });

    // Step 9: Mock SnapTrade placeOrder to return success
    (SnapTradeClient.prototype.placeOrder as jest.Mock).mockResolvedValue({
      orderId: 'snaptrade-order-123'
    });

    // Step 10: Emit LeaderTradeFilled event
    const event: LeaderTradeFilledEvent = {
      user_id: leaderId,
      broker_connection_id: leaderConnectionId,
      trade: {
        account_number: 'leader-account',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 25,
        fill_price: 200,
        filled_at: '2023-01-01T10:00:00Z',
      },
    };

    console.log('Publishing LeaderTradeFilled event:', JSON.stringify(event, null, 2));
    await eventBus.publish('LeaderTradeFilled', event);

    // Step 11: Wait for async processing
    console.log('Waiting for async processing...');
    await new Promise(resolve => setTimeout(resolve, 500)); // Increased from 100ms to 500ms

    // Step 12: Assert CopyOrder was created with correct quantity
    const copyOrders = await prismaService.copyOrder.findMany({
      where: {
        followerId: followerId,
        leaderTradeId: leaderTradeId,
      }
    });

    console.log('Found copy orders:', copyOrders.length);
    if (copyOrders.length === 0) {
      // Debug: Check if follower exists
      const followers = await prismaService.follower.findMany({
        where: { leaderId: leaderId }
      });
      console.log('Followers found:', followers.length, followers);
      
      // Debug: Check if leader trade exists
      const leaderTrades = await prismaService.trade.findMany({
        where: { userId: leaderId }
      });
      console.log('Leader trades found:', leaderTrades.length, leaderTrades);
      
      // Debug: Check if holdings exist
      const leaderHoldings = await prismaService.holding.findMany({
        where: { userId: leaderId }
      });
      console.log('Leader holdings found:', leaderHoldings.length, leaderHoldings);
      
      const followerHoldings = await prismaService.holding.findMany({
        where: { userId: followerId }
      });
      console.log('Follower holdings found:', followerHoldings.length, followerHoldings);
    }

    expect(copyOrders).toHaveLength(1);
    const copyOrder = copyOrders[0];

    // Calculate expected quantity: floor((0.05 * 20000) / 200) = floor(1000 / 200) = floor(5) = 5
    const expectedQuantity = Math.floor((0.05 * 20000) / 200);
    expect(Number(copyOrder.quantity)).toBe(expectedQuantity);
    expect(copyOrder.symbol).toBe('AAPL');
    expect(copyOrder.side).toBe('BUY');
    expect(copyOrder.status).toBe('placed');

    // Step 13: Assert SnapTrade placeOrder was called with correct parameters
    expect(SnapTradeClient.prototype.placeOrder).toHaveBeenCalledTimes(1);
    expect(SnapTradeClient.prototype.placeOrder).toHaveBeenCalledWith({
      authorizationId: 'follower-auth-456',
      accountNumber: 'leader-account',
      symbol: 'AAPL',
      side: 'BUY',
      quantity: expectedQuantity,
    });

    // Step 14: Verify CopyOrder was updated to 'placed' status
    const updatedCopyOrder = await prismaService.copyOrder.findUnique({
      where: { id: copyOrder.id }
    });

    expect(updatedCopyOrder).toBeDefined();
    expect(updatedCopyOrder!.status).toBe('placed');
    expect(updatedCopyOrder!.filledAt).toBeDefined();
    expect(updatedCopyOrder!.filledAt).not.toBeNull();
  });

  it('should not create copy orders for followers with autoCopy=false', async () => {
    // Seed users and connections (same as above)
    await prismaService.user.createMany({
      data: [
        { id: leaderId, email: 'leader@gioat.app' },
        { id: followerId, email: 'follower@gioat.app' },
      ]
    });

    await prismaService.brokerConnection.createMany({
      data: [
        {
          id: leaderConnectionId,
          userId: leaderId,
          broker: 'snaptrade',
          accessToken: 'leader-access-token',
          refreshToken: 'leader-refresh-token',
          status: 'ACTIVE',
          snaptradeAuthorizationId: 'leader-auth-123',
        },
        {
          id: followerConnectionId,
          userId: followerId,
          broker: 'snaptrade',
          accessToken: 'follower-access-token',
          refreshToken: 'follower-refresh-token',
          status: 'ACTIVE',
          snaptradeAuthorizationId: 'follower-auth-456',
        },
      ]
    });

    // Create follower with autoCopy=false
    await prismaService.follower.create({
      data: {
        leaderId: leaderId,
        followerId: followerId,
        autoCopy: false, // Disabled auto-copy
        alertOnly: true,
      }
    });

    // Seed minimal holdings
    await prismaService.holding.createMany({
      data: [
        {
          userId: leaderId,
          brokerConnectionId: leaderConnectionId,
          accountNumber: 'leader-account',
          symbol: 'AAPL',
          quantity: 100,
          marketValue: 20000,
          currency: 'USD',
        },
        {
          userId: followerId,
          brokerConnectionId: followerConnectionId,
          accountNumber: 'follower-account',
          symbol: 'AAPL',
          quantity: 10,
          marketValue: 2000,
          currency: 'USD',
        },
      ]
    });

    // Seed leader trade
    await prismaService.trade.create({
      data: {
        id: leaderTradeId,
        userId: leaderId,
        brokerConnectionId: leaderConnectionId,
        accountNumber: 'leader-account',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 25,
        fillPrice: 200,
        filledAt: new Date('2023-01-01T10:00:00Z'),
      }
    });

    // Emit event
    const event: LeaderTradeFilledEvent = {
      user_id: leaderId,
      broker_connection_id: leaderConnectionId,
      trade: {
        account_number: 'leader-account',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 25,
        fill_price: 200,
        filled_at: '2023-01-01T10:00:00Z',
      },
    };

    await eventBus.publish('LeaderTradeFilled', event);

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Assert no CopyOrder was created
    const copyOrders = await prismaService.copyOrder.findMany({
      where: { followerId: followerId }
    });

    expect(copyOrders).toHaveLength(0);
    expect(SnapTradeClient.prototype.placeOrder).not.toHaveBeenCalled();
  });

  it('should handle placeOrder failure and update CopyOrder status to failed', async () => {
    // Seed all the same data as the first test
    await prismaService.user.createMany({
      data: [
        { id: leaderId, email: 'leader@gioat.app' },
        { id: followerId, email: 'follower@gioat.app' },
      ]
    });

    await prismaService.brokerConnection.createMany({
      data: [
        {
          id: leaderConnectionId,
          userId: leaderId,
          broker: 'snaptrade',
          accessToken: 'leader-access-token',
          refreshToken: 'leader-refresh-token',
          status: 'ACTIVE',
          snaptradeAuthorizationId: 'leader-auth-123',
        },
        {
          id: followerConnectionId,
          userId: followerId,
          broker: 'snaptrade',
          accessToken: 'follower-access-token',
          refreshToken: 'follower-refresh-token',
          status: 'ACTIVE',
          snaptradeAuthorizationId: 'follower-auth-456',
        },
      ]
    });

    await prismaService.follower.create({
      data: {
        leaderId: leaderId,
        followerId: followerId,
        autoCopy: true,
        alertOnly: false,
      }
    });

    await prismaService.holding.createMany({
      data: [
        {
          userId: leaderId,
          brokerConnectionId: leaderConnectionId,
          accountNumber: 'leader-account',
          symbol: 'AAPL',
          quantity: 100,
          marketValue: 20000,
          currency: 'USD',
        },
        {
          userId: followerId,
          brokerConnectionId: followerConnectionId,
          accountNumber: 'follower-account',
          symbol: 'AAPL',
          quantity: 10,
          marketValue: 2000,
          currency: 'USD',
        },
      ]
    });

    await prismaService.trade.create({
      data: {
        id: leaderTradeId,
        userId: leaderId,
        brokerConnectionId: leaderConnectionId,
        accountNumber: 'leader-account',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 25,
        fillPrice: 200,
        filledAt: new Date('2023-01-01T10:00:00Z'),
      }
    });

    // Mock SnapTrade placeOrder to fail
    (SnapTradeClient.prototype.placeOrder as jest.Mock).mockRejectedValue(
      new Error('API Error')
    );

    // Emit event
    const event: LeaderTradeFilledEvent = {
      user_id: leaderId,
      broker_connection_id: leaderConnectionId,
      trade: {
        account_number: 'leader-account',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 25,
        fill_price: 200,
        filled_at: '2023-01-01T10:00:00Z',
      },
    };

    await eventBus.publish('LeaderTradeFilled', event);

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Assert CopyOrder was created but status is 'failed'
    const copyOrders = await prismaService.copyOrder.findMany({
      where: { followerId: followerId }
    });

    expect(copyOrders).toHaveLength(1);
    expect(copyOrders[0].status).toBe('failed');
    expect(copyOrders[0].filledAt).toBeNull();

    // Verify placeOrder was called
    expect(SnapTradeClient.prototype.placeOrder).toHaveBeenCalledTimes(1);
  });
}); 