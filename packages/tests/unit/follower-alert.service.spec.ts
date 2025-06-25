process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

import { Test, TestingModule } from '@nestjs/testing';
import { FollowerAlertService } from '../../api/src/follower-alert/follower-alert.service';
import { PrismaService } from '../../api/src/lib/prisma.service';
import { EventBus } from '../../api/src/lib/event-bus';
import { NotificationService } from '../../api/src/lib/notification.service';

describe('FollowerAlertService', () => {
  let service: FollowerAlertService;
  let mockPrismaService: jest.Mocked<PrismaService>;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockNotificationService: jest.Mocked<NotificationService>;

  beforeEach(async () => {
    const mockPrisma = {
      follower: {
        findMany: jest.fn(),
      },
      deviceToken: {
        findMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    } as any;

    const mockEventBusInstance = {
      publish: jest.fn(),
      subscribe: jest.fn(),
    };

    const mockNotificationServiceInstance = {
      sendPush: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowerAlertService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: EventBus,
          useValue: mockEventBusInstance,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationServiceInstance,
        },
      ],
    }).compile();

    service = module.get<FollowerAlertService>(FollowerAlertService);
    mockPrismaService = module.get(PrismaService);
    mockEventBus = module.get(EventBus);
    mockNotificationService = module.get(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should subscribe to LeaderTradeFilled events', () => {
      service.onModuleInit();

      expect(mockEventBus.subscribe).toHaveBeenCalledWith('LeaderTradeFilled', expect.any(Function));
    });
  });

  describe('processLeaderTrade', () => {
    it('should process LeaderTradeFilled event successfully', async () => {
      const mockEvent = {
        user_id: 'leader-123',
        broker_connection_id: 'conn-123',
        trade: {
          account_number: '123',
          symbol: 'AAPL',
          side: 'BUY',
          quantity: 10,
          fill_price: 150.50,
          filled_at: '2023-01-01T10:00:00Z',
        },
      };

      const mockFollowers = [
        {
          id: 'follower-1',
          userId: 'follower-123',
          leaderUserId: 'leader-123',
          autoCopy: true,
          alertOnly: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockDeviceTokens = [
        {
          userId: 'follower-123',
          token: 'device-token-1',
          createdAt: new Date(),
        },
      ];

      const mockLeader = {
        id: 'leader-123',
        email: 'leader@example.com',
        createdAt: new Date(),
      };

      (mockPrismaService.follower.findMany as jest.Mock).mockResolvedValue(mockFollowers);
      (mockPrismaService.deviceToken.findMany as jest.Mock).mockResolvedValue(mockDeviceTokens);
      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue(mockLeader);
      mockNotificationService.sendPush.mockResolvedValue([]);

      // Call the private method directly
      await (service as any).processLeaderTrade(mockEvent);

      expect(mockPrismaService.follower.findMany).toHaveBeenCalledWith({
        where: {
          leaderUserId: 'leader-123',
          autoCopy: true,
        },
      });

      expect(mockNotificationService.sendPush).toHaveBeenCalledWith(
        ['device-token-1'],
        'leader traded AAPL',
        'BUY 10 @ $150.50',
        {
          symbol: 'AAPL',
          leader: 'leader',
          pct: 0.5,
        }
      );
    });

    it('should handle errors gracefully', async () => {
      const mockEvent = {
        user_id: 'leader-123',
        broker_connection_id: 'conn-123',
        trade: {
          account_number: '123',
          symbol: 'AAPL',
          side: 'BUY',
          quantity: 10,
          fill_price: 150.50,
          filled_at: '2023-01-01T10:00:00Z',
        },
      };

      (mockPrismaService.follower.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Call the private method directly
      await (service as any).processLeaderTrade(mockEvent);

      // Should not throw
      expect(mockNotificationService.sendPush).not.toHaveBeenCalled();
    });
  });

  describe('getFollowers', () => {
    it('should return followers with auto_copy or alert_only', async () => {
      const mockAutoCopyFollowers = [
        {
          id: 'follower-1',
          userId: 'follower-123',
          leaderUserId: 'leader-123',
          autoCopy: true,
          alertOnly: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockAlertOnlyFollowers = [
        {
          id: 'follower-2',
          userId: 'follower-456',
          leaderUserId: 'leader-123',
          autoCopy: false,
          alertOnly: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrismaService.follower.findMany as jest.Mock)
        .mockResolvedValueOnce(mockAutoCopyFollowers)
        .mockResolvedValueOnce(mockAlertOnlyFollowers);

      const result = await (service as any).getFollowers('leader-123');

      expect(result).toHaveLength(2);
      expect(result[0].user_id).toBe('follower-123');
      expect(result[1].user_id).toBe('follower-456');
    });

    it('should handle database errors', async () => {
      (mockPrismaService.follower.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await (service as any).getFollowers('leader-123');

      expect(result).toEqual([]);
    });
  });

  describe('getDeviceTokens', () => {
    it('should return device tokens for user', async () => {
      const mockTokens = [
        {
          userId: 'user-123',
          token: 'device-token-1',
          createdAt: new Date(),
        },
        {
          userId: 'user-123',
          token: 'device-token-2',
          createdAt: new Date(),
        },
      ];

      (mockPrismaService.deviceToken.findMany as jest.Mock).mockResolvedValue(mockTokens);

      const result = await (service as any).getDeviceTokens('user-123');

      expect(result).toEqual(['device-token-1', 'device-token-2']);
    });

    it('should handle database errors', async () => {
      (mockPrismaService.deviceToken.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await (service as any).getDeviceTokens('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('getLeaderHandle', () => {
    it('should return leader handle from email', async () => {
      const mockLeader = {
        id: 'leader-123',
        email: 'leader@example.com',
        createdAt: new Date(),
      };

      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue(mockLeader);

      const result = await (service as any).getLeaderHandle('leader-123');

      expect(result).toBe('leader');
    });

    it('should return fallback when leader not found', async () => {
      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await (service as any).getLeaderHandle('leader-123');

      expect(result).toBe('Leader');
    });

    it('should handle database errors', async () => {
      (mockPrismaService.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await (service as any).getLeaderHandle('leader-123');

      expect(result).toBe('Leader');
    });
  });
}); 