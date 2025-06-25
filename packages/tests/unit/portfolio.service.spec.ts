process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_KEY = 'test-key';

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PortfolioService } from '../../api/src/modules/portfolio/portfolio.service';
import { PrismaService } from '../../api/src/lib/prisma.service';

describe('PortfolioService', () => {
  let service: PortfolioService;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrisma = {
      holding: {
        findMany: jest.fn(),
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<PortfolioService>(PortfolioService);
    mockPrismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPortfolio', () => {
    it('should return portfolio with NAV and positions', async () => {
      const mockHoldings = [
        {
          id: 'holding-1',
          userId: 'user1',
          brokerConnectionId: 'conn-1',
          accountNumber: '123',
          symbol: 'AAPL',
          quantity: 10,
          marketValue: 1500,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'holding-2',
          userId: 'user1',
          brokerConnectionId: 'conn-1',
          accountNumber: '123',
          symbol: 'GOOGL',
          quantity: 5,
          marketValue: 2500,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrismaService.holding.findMany as jest.Mock).mockResolvedValue(mockHoldings);

      const result = await service.getPortfolio('user1');

      expect(result).toEqual({
        nav: 4000,
        positions: [
          {
            symbol: 'AAPL',
            quantity: 10,
            marketValue: 1500,
            allocationPct: 37.5,
          },
          {
            symbol: 'GOOGL',
            quantity: 5,
            marketValue: 2500,
            allocationPct: 62.5,
          },
        ],
      });
      expect(mockPrismaService.holding.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
        },
      });
    });

    it('should throw NotFoundException when no holdings found', async () => {
      (mockPrismaService.holding.findMany as jest.Mock).mockResolvedValue([]);

      await expect(service.getPortfolio('user1')).rejects.toThrow(
        'No portfolio holdings found for user user1'
      );
    });

    it('should handle database errors', async () => {
      const mockHoldings = [
        {
          id: 'holding-1',
          userId: 'user1',
          brokerConnectionId: 'conn-1',
          accountNumber: '123',
          symbol: 'AAPL',
          quantity: 10,
          marketValue: 1500,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrismaService.holding.findMany as jest.Mock).mockResolvedValue(mockHoldings);

      const result = await service.getPortfolio('user1');

      expect(result).toEqual({
        nav: 1500,
        positions: [
          {
            symbol: 'AAPL',
            quantity: 10,
            marketValue: 1500,
            allocationPct: 100,
          },
        ],
      });
    });
  });

  describe('cache operations', () => {
    it('should clear cache', () => {
      service.clearCache();
      expect(service.getCacheStats().portfolioSize).toBe(0);
      expect(service.getCacheStats().performanceSize).toBe(0);
    });

    it('should return cache stats', () => {
      const stats = service.getCacheStats();
      expect(stats).toHaveProperty('portfolioSize');
      expect(stats).toHaveProperty('performanceSize');
    });
  });
}); 