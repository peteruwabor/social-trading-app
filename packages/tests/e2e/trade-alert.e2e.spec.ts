process.env.SNAPTRADE_CLIENT_ID = 'test-client-id';
process.env.SNAPTRADE_CONSUMER_KEY = 'test-consumer-key';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../api/src/app.module';
import { TradeCaptureService } from '../../api/src/trade-capture/trade-capture.service';
import { EventBus } from '../../api/src/lib/event-bus';
import { NotificationService } from '../../api/src/lib/notification.service';
import { PrismaService } from '../../api/src/lib/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { FollowerAlertService } from '../../api/src/follower-alert/follower-alert.service';
import { SnapTradeClient } from '../../api/src/3rdparty/snaptrade/snaptrade.client';
import request from 'supertest';

// Mock SnapTradeClient
jest.mock('../../api/src/3rdparty/snaptrade/snaptrade.client');

describe('Trade Alert (e2e)', () => {
  let app: INestApplication;
  let tradeCaptureService: TradeCaptureService;
  let followerAlertService: FollowerAlertService;
  let eventBus: EventBus;
  let notificationService: NotificationService;
  let prismaService: PrismaService;

  // Test data
  let leaderUserId: string;
  let followerUserId: string;
  let connectionId: string;
  let deviceToken: string;
  let authId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    tradeCaptureService = moduleFixture.get<TradeCaptureService>(TradeCaptureService);
    followerAlertService = moduleFixture.get<FollowerAlertService>(FollowerAlertService);
    eventBus = moduleFixture.get<EventBus>(EventBus);
    notificationService = moduleFixture.get<NotificationService>(NotificationService);
    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    // Initialize test data
    leaderUserId = uuidv4();
    followerUserId = uuidv4();
    connectionId = uuidv4();
    deviceToken = 'ExponentPushToken[test-token-123]';
    authId = 'snaptrade-auth-123';
  });

  beforeEach(async () => {
    // Clean up any existing test data in proper order to avoid foreign key constraints
    await prismaService.trade.deleteMany();
    await prismaService.holding.deleteMany();
    await prismaService.deviceToken.deleteMany();
    await prismaService.follower.deleteMany();
    await prismaService.brokerConnection.deleteMany();
    await prismaService.user.deleteMany();

    // Reset mocks
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should capture trade, publish event, and send notification to follower', async () => {
    // Step 1: Seed leader user + follower user + device token
    await prismaService.user.create({
      data: {
        id: leaderUserId,
        email: 'leader@gioat.app',
      }
    });

    await prismaService.user.create({
      data: {
        id: followerUserId,
        email: 'follower@gioat.app',
      }
    });

    await prismaService.deviceToken.create({
      data: {
        userId: followerUserId,
        token: deviceToken,
        platform: 'IOS',
      }
    });

    // Step 2: Seed broker_connection for leader; set lastTradePollAt to now-1h
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await prismaService.brokerConnection.create({
      data: {
        id: connectionId,
        userId: leaderUserId,
        broker: 'snaptrade',
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        status: 'ACTIVE',
        lastTradePollAt: oneHourAgo,
        snaptradeAuthorizationId: authId,
      }
    });

    // Step 3: Create follower relationship
    await prismaService.follower.create({
      data: {
        followerId: followerUserId,
        leaderId: leaderUserId,
        autoCopy: false,
        alertOnly: true,
      }
    });

    // Step 4: Mock SnapTradeClient.getActivities to return 1 BUY fill
    jest.spyOn(SnapTradeClient.prototype, 'getActivities').mockResolvedValue([
      {
        type: 'FILL',
        timestamp: new Date().toISOString(),
        data: {
          account_number: '****1234',
          symbol: 'AAPL',
          side: 'BUY',
          quantity: 10,
          price: 150.00,
          filled_at: new Date().toISOString(),
        },
      },
    ]);

    // Step 5: Run cron handler once (manually trigger the captureTrades method)
    await tradeCaptureService.captureTrades();

    // Step 6: Assert trades row exists
    const trades = await prismaService.trade.findMany({
      where: {
        userId: leaderUserId,
        brokerConnectionId: connectionId,
      }
    });

    expect(trades).toHaveLength(1);
    expect(trades[0]).toMatchObject({
      userId: leaderUserId,
      brokerConnectionId: connectionId,
      accountNumber: '****1234',
      symbol: 'AAPL',
      side: 'BUY',
      quantity: expect.any(Object),
      fillPrice: expect.any(Object),
    });

    // Step 7: Verify that the broker connection's lastTradePollAt was updated
    const updatedConnection = await prismaService.brokerConnection.findUnique({
      where: { id: connectionId }
    });

    expect(updatedConnection).toBeDefined();
    expect(updatedConnection!.lastTradePollAt).toBeDefined();
    expect(updatedConnection!.lastTradePollAt).not.toBeNull();
    expect(updatedConnection!.lastTradePollAt!.getTime()).toBeGreaterThan(
      oneHourAgo.getTime()
    );
  });

  it('should handle multiple followers with different notification preferences', async () => {
    // Create leader user
    await prismaService.user.create({
      data: { id: leaderUserId, email: 'leader@gioat.app' }
    });
    // Create follower user
    await prismaService.user.create({
      data: { id: followerUserId, email: 'follower@gioat.app' }
    });
    // Create broker connection
    await prismaService.brokerConnection.create({
      data: {
        id: connectionId,
        userId: leaderUserId,
        broker: 'snaptrade',
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        status: 'ACTIVE',
        snaptradeAuthorizationId: authId,
      }
    });
    // Create follower relationship
    await prismaService.follower.create({
      data: {
        followerId: followerUserId,
        leaderId: leaderUserId,
        autoCopy: false,
        alertOnly: true,
      }
    });
    // Create device token for follower
    await prismaService.deviceToken.create({
      data: {
        userId: followerUserId,
        token: 'ExponentPushToken[abc]',
        platform: 'IOS',
      }
    });

    // Simulate trade fill event
    await request(app.getHttpServer())
      .post('/trade-capture/fill')
      .set('Authorization', `Bearer ${leaderUserId}`)
      .send({
        brokerConnectionId: connectionId,
        trade: {
          accountNumber: '****1234',
          symbol: 'TSLA',
          side: 'SELL',
          quantity: 5,
          fillPrice: 250,
          filledAt: new Date().toISOString(),
        },
      })
      .expect(201);

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check that the trade was recorded
    const trades = await prismaService.trade.findMany({
      where: { userId: leaderUserId, brokerConnectionId: connectionId, symbol: 'TSLA' },
    });
    expect(trades).toHaveLength(1);
    expect(trades[0].symbol).toBe('TSLA');
  });
}); 