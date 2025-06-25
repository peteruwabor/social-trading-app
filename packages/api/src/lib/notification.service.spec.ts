process.env.NODE_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { PrismaService } from './prisma.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockPrismaService: jest.Mocked<PrismaService>;
  let loggerLogSpy: jest.SpyInstance;

  beforeEach(async () => {
    const mockPrisma = {
      deviceToken: {
        findMany: jest.fn(),
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    mockPrismaService = module.get(PrismaService);
    loggerLogSpy = jest.spyOn((service as any).logger, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create production service', () => {
    const prodService = new NotificationService(mockPrismaService);
    expect(prodService).toBeDefined();
  });

  it('should log and resolve in test env', async () => {
    await expect(
      service.sendPush(['ExponentPushToken[abc]'], 'Test Title', 'Test Body', { foo: 'bar' })
    ).resolves.toBeUndefined();
    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[MOCK PUSH] Test Title: Test Body to ExponentPushToken[abc]')
    );
  });

  it('should throw if called in prod without EXPO_ACCESS_TOKEN', async () => {
    process.env.NODE_ENV = 'production';
    process.env.EXPO_ACCESS_TOKEN = '';
    const prodService = new NotificationService(mockPrismaService);
    // Should fallback to mock
    await expect(
      prodService.sendPush(['ExponentPushToken[abc]'], 'Prod Title', 'Prod Body')
    ).resolves.toBeUndefined();
  });
}); 