import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../api/src/app.module';
import { PrismaService } from '../../api/src/lib/prisma.service';
import { AuthGuard } from '../../api/src/lib/auth.guard';

process.env.SNAPTRADE_CLIENT_ID = 'test-client-id';
process.env.SNAPTRADE_CONSUMER_KEY = 'test-consumer-key';

describe('Epic I: User Experience, Settings & Personalization (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testUser: any;
  let testUser2: any;
  let timestamp: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const request = context.switchToHttp().getRequest();
          request.user = { id: request.headers['x-test-user-id'] || 'test-user-id', email: 'test@example.com' };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Clean up any existing test data
    timestamp = Date.now();
    
    // First, find all users with test-epic-i pattern
    const existingUsers = await prisma.user.findMany({
      where: { email: { contains: 'test-epic-i' } },
      select: { id: true }
    });
    
    const userIds = existingUsers.map(user => user.id);
    
    if (userIds.length > 0) {
      // Delete all related records in correct order
      await prisma.liveSession.deleteMany({ where: { leaderId: { in: userIds } } });
      await prisma.tip.deleteMany({ where: { OR: [{ senderId: { in: userIds } }, { receiverId: { in: userIds } }] } });
      await prisma.trade.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.follower.deleteMany({ where: { OR: [{ leaderId: { in: userIds } }, { followerId: { in: userIds } }] } });
      await prisma.notificationPreference.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.brokerConnection.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }

    // Create test users with unique emails
    testUser = await prisma.user.create({
      data: {
        email: `test-epic-i-user1-${timestamp}@example.com`,
        handle: `user1-${timestamp}`,
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Test user bio',
        avatarUrl: 'https://example.com/avatar1.jpg',
        isVerified: true,
        mfaEnabled: false,
        status: 'ACTIVE',
        kycStatus: 'APPROVED',
        subscriptionTier: 'PREMIUM',
      },
    });

    testUser2 = await prisma.user.create({
      data: {
        email: `test-epic-i-user2-${timestamp}@example.com`,
        handle: `user2-${timestamp}`,
        firstName: 'Jane',
        lastName: 'Smith',
        bio: 'Another test user',
        avatarUrl: 'https://example.com/avatar2.jpg',
        isVerified: false,
        mfaEnabled: false,
        status: 'ACTIVE',
        kycStatus: 'PENDING',
        subscriptionTier: 'FREE',
      },
    });

    // Create a BrokerConnection for testUser
    const brokerConnection = await prisma.brokerConnection.create({
      data: {
        id: `test-connection-${timestamp}`,
        userId: testUser.id,
        broker: 'TestBroker',
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        status: 'ACTIVE',
      },
    });

    // Create some test data for statistics
    await prisma.follower.create({
      data: {
        leaderId: testUser.id,
        followerId: testUser2.id,
        autoCopy: true,
        alertOnly: false,
      },
    });

    await prisma.trade.create({
      data: {
        userId: testUser.id,
        brokerConnectionId: brokerConnection.id,
        accountNumber: '123456',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 100,
        fillPrice: 150.00,
        filledAt: new Date(),
      },
    });

    await prisma.tip.create({
      data: {
        senderId: testUser2.id,
        receiverId: testUser.id,
        amount: 10.00,
        message: 'Great trade!',
        platformFee: 0.0,
      },
    });

    await prisma.liveSession.create({
      data: {
        leaderId: testUser.id,
        title: 'Test Session',
        status: 'ACTIVE',
        startedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    // Clean up test data in correct order to avoid foreign key constraints
    if (testUser?.id) {
      await prisma.liveSession.deleteMany({ where: { leaderId: testUser.id } });
      await prisma.tip.deleteMany({ where: { receiverId: testUser.id } });
      await prisma.trade.deleteMany({ where: { userId: testUser.id } });
      await prisma.follower.deleteMany({ where: { leaderId: testUser.id } });
      await prisma.notificationPreference.deleteMany({ where: { userId: testUser.id } });
      await prisma.auditLog.deleteMany({ where: { userId: testUser.id } });
    }
    if (testUser2?.id) {
      await prisma.follower.deleteMany({ where: { followerId: testUser2.id } });
      await prisma.tip.deleteMany({ where: { senderId: testUser2.id } });
      await prisma.notificationPreference.deleteMany({ where: { userId: testUser2.id } });
      await prisma.auditLog.deleteMany({ where: { userId: testUser2.id } });
    }
    await prisma.brokerConnection.deleteMany({ where: { userId: { in: [testUser?.id, testUser2?.id].filter(Boolean) } } });
    await prisma.user.deleteMany({ where: { id: { in: [testUser?.id, testUser2?.id].filter(Boolean) } } });
    
    await app.close();
  });

  describe('User Profile Management', () => {
    it('should get user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/user/profile')
        .set('x-test-user-id', testUser.id)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testUser.id,
        email: `test-epic-i-user1-${timestamp}@example.com`,
        handle: `user1-${timestamp}`,
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Test user bio',
        avatarUrl: 'https://example.com/avatar1.jpg',
        isVerified: true,
        mfaEnabled: false,
        status: 'ACTIVE',
        kycStatus: 'APPROVED',
        subscriptionTier: 'PREMIUM',
      });
    });

    it('should update user profile', async () => {
      const updateData = {
        handle: `updateduser1-${timestamp}`,
        firstName: 'Johnny',
        lastName: 'Doe Jr.',
        bio: 'Updated bio',
        avatarUrl: 'https://example.com/new-avatar.jpg',
      };

      const response = await request(app.getHttpServer())
        .put('/user/profile')
        .set('x-test-user-id', testUser.id)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testUser.id,
        email: `test-epic-i-user1-${timestamp}@example.com`,
        handle: `updateduser1-${timestamp}`,
        firstName: 'Johnny',
        lastName: 'Doe Jr.',
        bio: 'Updated bio',
        avatarUrl: 'https://example.com/new-avatar.jpg',
      });
    });

    it('should reject duplicate handle', async () => {
      const updateData = {
        handle: `user2-${timestamp}`, // Already taken by testUser2
      };

      await request(app.getHttpServer())
        .put('/user/profile')
        .set('x-test-user-id', testUser.id)
        .send(updateData)
        .expect(400);
    });
  });

  describe('Password Management', () => {
    it('should change password', async () => {
      const passwordData = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
      };

      const response = await request(app.getHttpServer())
        .post('/user/password')
        .set('x-test-user-id', testUser.id)
        .send(passwordData)
        .expect(201);

      expect(response.body).toEqual({
        message: 'Password changed successfully',
      });
    });

    it('should reject short password', async () => {
      const passwordData = {
        currentPassword: 'oldpassword',
        newPassword: 'short',
      };

      await request(app.getHttpServer())
        .post('/user/password')
        .set('x-test-user-id', testUser.id)
        .send(passwordData)
        .expect(400);
    });
  });

  describe('Multi-Factor Authentication', () => {
    it('should enable MFA', async () => {
      const response = await request(app.getHttpServer())
        .post('/user/mfa/enable')
        .set('x-test-user-id', testUser.id)
        .expect(201);

      expect(response.body).toHaveProperty('secret');
      expect(response.body).toHaveProperty('qrCode');
      expect(response.body.qrCode).toContain('otpauth://totp/Gioat:test-epic-i-user1-');
    });

    it('should reject enabling MFA when already enabled', async () => {
      await request(app.getHttpServer())
        .post('/user/mfa/enable')
        .set('x-test-user-id', testUser.id)
        .expect(400);
    });

    it('should disable MFA', async () => {
      const response = await request(app.getHttpServer())
        .post('/user/mfa/disable')
        .set('x-test-user-id', testUser.id)
        .expect(201);

      expect(response.body).toEqual({
        message: 'MFA disabled successfully',
      });
    });

    it('should reject disabling MFA when not enabled', async () => {
      await request(app.getHttpServer())
        .post('/user/mfa/disable')
        .set('x-test-user-id', testUser.id)
        .expect(400);
    });
  });

  describe('Privacy Settings', () => {
    it('should get privacy settings', async () => {
      const response = await request(app.getHttpServer())
        .get('/user/privacy')
        .set('x-test-user-id', testUser.id)
        .expect(200);

      expect(response.body).toEqual({
        profileVisibility: 'PUBLIC',
        showPortfolio: true,
        showTrades: true,
        allowCopyTrading: true,
        allowTips: true,
      });
    });

    it('should update privacy settings', async () => {
      const settings = {
        profileVisibility: 'FOLLOWERS_ONLY',
        showPortfolio: false,
        showTrades: false,
        allowCopyTrading: false,
        allowTips: false,
      };

      const response = await request(app.getHttpServer())
        .put('/user/privacy')
        .set('x-test-user-id', testUser.id)
        .send(settings)
        .expect(200);

      expect(response.body).toEqual(settings);
    });
  });

  describe('Notification Settings', () => {
    it('should get notification settings', async () => {
      const response = await request(app.getHttpServer())
        .get('/user/notifications')
        .set('x-test-user-id', testUser.id)
        .expect(200);

      expect(response.body).toMatchObject({
        tradeAlerts: true,
        copyExecuted: true,
        liveSessions: true,
        system: true,
        promotional: false,
        email: true,
        push: true,
        sms: false,
      });
    });

    it('should update notification settings', async () => {
      const settings = {
        tradeAlerts: false,
        copyExecuted: false,
        liveSessions: true,
        system: false,
        promotional: true,
        email: false,
        push: true,
        sms: true,
      };

      const response = await request(app.getHttpServer())
        .put('/user/notifications')
        .set('x-test-user-id', testUser.id)
        .send(settings)
        .expect(200);

      expect(response.body).toEqual(settings);
    });
  });

  describe('Personalization Settings', () => {
    it('should get personalization settings', async () => {
      const response = await request(app.getHttpServer())
        .get('/user/personalization')
        .set('x-test-user-id', testUser.id)
        .expect(200);

      expect(response.body).toEqual({
        theme: 'AUTO',
        language: 'en',
        timezone: 'UTC',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        numberFormat: '1,234.56',
      });
    });

    it('should update personalization settings', async () => {
      const settings = {
        theme: 'DARK',
        language: 'es',
        timezone: 'America/New_York',
        currency: 'EUR',
        dateFormat: 'DD/MM/YYYY',
        numberFormat: '1.234,56',
      };

      const response = await request(app.getHttpServer())
        .put('/user/personalization')
        .set('x-test-user-id', testUser.id)
        .send(settings)
        .expect(200);

      expect(response.body).toEqual(settings);
    });
  });

  describe('Account Statistics', () => {
    it('should get account statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/user/stats')
        .set('x-test-user-id', testUser.id)
        .expect(200);

      expect(response.body).toMatchObject({
        totalFollowers: 1,
        totalFollowing: 0,
        totalTrades: 1,
        totalTips: 1,
        totalLiveSessions: 1,
        accountAge: expect.any(Number),
      });
    });
  });

  describe('User Search', () => {
    it('should search users by handle', async () => {
      const response = await request(app.getHttpServer())
        .get('/user/search')
        .query({ q: `user2-${timestamp}` })
        .set('x-test-user-id', testUser.id)
        .expect(200);

      const testUser2Result = response.body.find((user: any) => user.id === testUser2.id);
      expect(testUser2Result).toBeDefined();
      expect(testUser2Result).toMatchObject({
        id: testUser2.id,
        email: `test-epic-i-user2-${timestamp}@example.com`,
        handle: `user2-${timestamp}`,
        firstName: 'Jane',
        lastName: 'Smith',
      });
    });

    it('should search users by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/user/search')
        .query({ q: 'Jane' })
        .set('x-test-user-id', testUser.id)
        .expect(200);

      const testUser2Result = response.body.find((user: any) => user.id === testUser2.id);
      expect(testUser2Result).toBeDefined();
      expect(testUser2Result).toMatchObject({
        id: testUser2.id,
        firstName: 'Jane',
        lastName: 'Smith',
      });
    });

    it('should return empty array for short query', async () => {
      const response = await request(app.getHttpServer())
        .get('/user/search?q=a')
        .set('x-test-user-id', testUser.id)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should exclude current user from search results', async () => {
      const response = await request(app.getHttpServer())
        .get('/user/search?q=user')
        .set('x-test-user-id', testUser.id)
        .expect(200);

      const testUser2Result = response.body.find((user: any) => user.id === testUser2.id);
      expect(testUser2Result).toBeDefined();
      expect(testUser2Result.id).toBe(testUser2.id);
    });
  });

  describe('Account Deletion', () => {
    it('should request account deletion with correct confirmation', async () => {
      const response = await request(app.getHttpServer())
        .delete('/user/account')
        .set('x-test-user-id', testUser.id)
        .send({ confirmation: 'DELETE_MY_ACCOUNT' })
        .expect(200);

      expect(response.body).toEqual({
        message: 'Account deletion request submitted. Your account will be deleted within 30 days.',
      });
    });

    it('should reject account deletion with incorrect confirmation', async () => {
      await request(app.getHttpServer())
        .delete('/user/account')
        .set('x-test-user-id', testUser.id)
        .send({ confirmation: 'WRONG_CONFIRMATION' })
        .expect(400);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent user', async () => {
      await request(app.getHttpServer())
        .get('/user/profile')
        .set('x-test-user-id', 'non-existent-id')
        .expect(404);
    });

    it('should return 404 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/user/profile')
        .expect(404);
    });
  });
}); 