import { Test, TestingModule } from '@nestjs/testing';
import { FollowerService } from '../../api/src/modules/followers/follower.service';
import { PrismaService } from '../../api/src/lib/prisma.service';

describe('FollowerService', () => {
  let service: FollowerService;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrisma = {
      follower: {
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowerService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<FollowerService>(FollowerService);
    mockPrismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setAutoCopy', () => {
    it('should create a new follower record when one does not exist', async () => {
      const leaderId = 'leader-123';
      const followerId = 'follower-456';
      const enabled = true;

      const mockFollower = {
        id: 'follower-record-1',
        leaderId,
        followerId,
        autoCopy: enabled,
        alertOnly: false,
        createdAt: new Date(),
      };

      (mockPrismaService.follower.upsert as jest.Mock).mockResolvedValue(mockFollower);

      const result = await service.setAutoCopy(leaderId, followerId, enabled);

      expect(mockPrismaService.follower.upsert).toHaveBeenCalledWith({
        where: {
          leaderId_followerId: {
            leaderId,
            followerId,
          },
        },
        update: {
          autoCopy: enabled,
        },
        create: {
          leaderId,
          followerId,
          autoCopy: enabled,
          alertOnly: false, // Should be false when autoCopy is true
        },
      });

      expect(result).toEqual(mockFollower);
    });

    it('should update existing follower record when one exists', async () => {
      const leaderId = 'leader-123';
      const followerId = 'follower-456';
      const enabled = false;

      const mockFollower = {
        id: 'follower-record-1',
        leaderId,
        followerId,
        autoCopy: enabled,
        alertOnly: true,
        createdAt: new Date(),
      };

      (mockPrismaService.follower.upsert as jest.Mock).mockResolvedValue(mockFollower);

      const result = await service.setAutoCopy(leaderId, followerId, enabled);

      expect(mockPrismaService.follower.upsert).toHaveBeenCalledWith({
        where: {
          leaderId_followerId: {
            leaderId,
            followerId,
          },
        },
        update: {
          autoCopy: enabled,
        },
        create: {
          leaderId,
          followerId,
          autoCopy: enabled,
          alertOnly: true, // Should be true when autoCopy is false
        },
      });

      expect(result).toEqual(mockFollower);
    });

    it('should toggle autoCopy from true to false', async () => {
      const leaderId = 'leader-123';
      const followerId = 'follower-456';

      // First call: enable autoCopy
      const mockFollowerEnabled = {
        id: 'follower-record-1',
        leaderId,
        followerId,
        autoCopy: true,
        alertOnly: false,
        createdAt: new Date(),
      };

      (mockPrismaService.follower.upsert as jest.Mock)
        .mockResolvedValueOnce(mockFollowerEnabled);

      const result1 = await service.setAutoCopy(leaderId, followerId, true);
      expect(result1.autoCopy).toBe(true);
      expect(result1.alertOnly).toBe(false);

      // Second call: disable autoCopy
      const mockFollowerDisabled = {
        ...mockFollowerEnabled,
        autoCopy: false,
        alertOnly: true,
      };

      (mockPrismaService.follower.upsert as jest.Mock)
        .mockResolvedValueOnce(mockFollowerDisabled);

      const result2 = await service.setAutoCopy(leaderId, followerId, false);
      expect(result2.autoCopy).toBe(false);
      expect(result2.alertOnly).toBe(true);

      expect(mockPrismaService.follower.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('listFollowersForLeader', () => {
    it('should return followers for a leader', async () => {
      const leaderId = 'leader-123';
      const mockFollowers = [
        {
          id: 'follower-1',
          followerId: 'user-1',
          autoCopy: true,
          alertOnly: false,
          createdAt: new Date(),
        },
        {
          id: 'follower-2',
          followerId: 'user-2',
          autoCopy: false,
          alertOnly: true,
          createdAt: new Date(),
        },
      ];

      (mockPrismaService.follower.findMany as jest.Mock).mockResolvedValue(mockFollowers);

      const result = await service.listFollowersForLeader(leaderId);

      expect(mockPrismaService.follower.findMany).toHaveBeenCalledWith({
        where: { leaderId },
        select: {
          id: true,
          followerId: true,
          autoCopy: true,
          alertOnly: true,
          createdAt: true,
        },
      });

      expect(result).toEqual(mockFollowers);
    });
  });
}); 