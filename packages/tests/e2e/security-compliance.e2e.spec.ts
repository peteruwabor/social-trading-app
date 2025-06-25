process.env.SNAPTRADE_CLIENT_ID = 'test-client-id';
process.env.SNAPTRADE_CONSUMER_KEY = 'test-consumer-key';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../api/src/app.module';
import { PrismaService } from '../../api/src/lib/prisma.service';
import { NotificationService } from '../../api/src/lib/notification.service';

describe('Security, Compliance & Audit Logging (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let notificationService: NotificationService;

  // Test user IDs
  let adminUserId: string;
  let regularUserId: string;
  let targetUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NotificationService)
      .useValue({
        sendPush: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    notificationService = moduleFixture.get<NotificationService>(NotificationService);
  });

  beforeEach(async () => {
    // Clean up database
    await prismaService.auditLog.deleteMany();
    await prismaService.adminAction.deleteMany();
    await prismaService.tip.deleteMany();
    await prismaService.trade.deleteMany();
    await prismaService.brokerConnection.deleteMany();
    await prismaService.user.deleteMany();

    // Reset mocks
    jest.clearAllMocks();

    // Create test users
    const admin = await prismaService.user.create({
      data: {
        email: 'admin@gioat.app',
        handle: 'admin_user',
        firstName: 'Admin',
        lastName: 'User',
      },
    });
    adminUserId = admin.id;

    const regular = await prismaService.user.create({
      data: {
        email: 'regular@gioat.app',
        handle: 'regular_user',
        firstName: 'Regular',
        lastName: 'User',
      },
    });
    regularUserId = regular.id;

    const target = await prismaService.user.create({
      data: {
        email: 'target@gioat.app',
        handle: 'target_user',
        firstName: 'Target',
        lastName: 'User',
      },
    });
    targetUserId = target.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Audit Logging', () => {
    it('should log tip actions', async () => {
      // Send a tip
      const tipResponse = await request(app.getHttpServer())
        .post('/tips')
        .set('Authorization', `Bearer ${regularUserId}`)
        .send({
          receiverId: targetUserId,
          amount: 25.00,
          message: 'Test tip',
        })
        .expect(201);

      // Check audit log was created
      const auditLogs = await prismaService.auditLog.findMany({
        where: { userId: regularUserId },
      });

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        action: 'SEND_TIP',
        resource: 'TIP',
        resourceId: tipResponse.body.id,
        details: expect.objectContaining({
          receiverId: targetUserId,
          amount: 25,
        }),
      });
    });

    it('should log admin actions', async () => {
      // Ban a user
      await request(app.getHttpServer())
        .post('/admin/ban-user')
        .set('Authorization', `Bearer ${adminUserId}`)
        .send({
          targetId,
          reason: 'Test ban',
        })
        .expect(201);

      // Check audit log was created
      const auditLogs = await prismaService.auditLog.findMany({
        where: { userId: adminUserId },
      });

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        action: 'ADMIN_BAN_USER',
        resource: 'ADMIN_ACTION',
        details: expect.objectContaining({
          targetId,
          reason: 'Test ban',
        }),
      });
    });

    it('should allow users to view their own audit logs', async () => {
      // Create some audit logs
      await prismaService.auditLog.createMany({
        data: [
          {
            userId: regularUserId,
            action: 'LOGIN',
            resource: 'AUTH',
            details: { ip: '127.0.0.1' },
          },
          {
            userId: regularUserId,
            action: 'VIEW_PORTFOLIO',
            resource: 'PORTFOLIO',
            details: { timestamp: new Date() },
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/audit-logs/me')
        .set('Authorization', `Bearer ${regularUserId}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('action');
      expect(response.body[0]).toHaveProperty('resource');
      expect(response.body[0]).toHaveProperty('createdAt');
    });

    it('should allow admins to view all audit logs', async () => {
      // Create audit logs for different users
      await prismaService.auditLog.createMany({
        data: [
          {
            userId: regularUserId,
            action: 'LOGIN',
            resource: 'AUTH',
          },
          {
            userId: targetUserId,
            action: 'SEND_TIP',
            resource: 'TIP',
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/audit-logs/all')
        .set('Authorization', `Bearer ${adminUserId}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
    });
  });

  describe('KYC & Compliance', () => {
    it('should return KYC status for user', async () => {
      const response = await request(app.getHttpServer())
        .get('/compliance/kyc-status')
        .set('Authorization', `Bearer ${regularUserId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        userId: regularUserId,
        email: 'regular@gioat.app',
        kycStatus: 'NOT_SUBMITTED',
        accountStatus: 'PENDING',
      });
    });

    it('should allow users to submit KYC', async () => {
      const kycData = {
        identity: {
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-01-01',
        },
        documents: {
          idDocument: 'base64-encoded-document',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/compliance/submit-kyc')
        .set('Authorization', `Bearer ${regularUserId}`)
        .send(kycData)
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'KYC submitted successfully',
        status: 'PENDING',
      });

      // Check KYC status was updated
      const user = await prismaService.user.findUnique({
        where: { id: regularUserId },
      });
      expect(user?.kycStatus).toBe('PENDING');

      // Check audit log was created
      const auditLogs = await prismaService.auditLog.findMany({
        where: { userId: regularUserId },
      });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].action).toBe('KYC_SUBMITTED');
    });

    it('should generate compliance report', async () => {
      // Create some activity for the user
      await prismaService.tip.create({
        data: {
          senderId: regularUserId,
          receiverId: targetUserId,
          amount: 50.00,
          platformFee: 2.50,
        },
      });

      await prismaService.auditLog.create({
        data: {
          userId: regularUserId,
          action: 'LOGIN',
          resource: 'AUTH',
        },
      });

      const response = await request(app.getHttpServer())
        .get('/compliance/report')
        .set('Authorization', `Bearer ${regularUserId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        userId: regularUserId,
        email: 'regular@gioat.app',
        kycStatus: 'NOT_SUBMITTED',
        accountStatus: 'PENDING',
        totalTipsSent: '50.00',
        recentTips: 1,
        recentActivity: 1,
        riskScore: expect.any(Number),
      });
    });
  });

  describe('Admin Actions', () => {
    it('should allow admins to ban users', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/ban-user')
        .set('Authorization', `Bearer ${adminUserId}`)
        .send({
          targetId,
          reason: 'Violation of terms',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.actionType).toBe('BAN_USER');

      // Check user was banned
      const user = await prismaService.user.findUnique({
        where: { id: targetUserId },
      });
      expect(user?.status).toBe('BANNED');
    });

    it('should allow admins to refund tips', async () => {
      // Create a tip first
      const tip = await prismaService.tip.create({
        data: {
          senderId: regularUserId,
          receiverId: targetUserId,
          amount: 25.00,
          platformFee: 1.25,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/admin/refund-tip')
        .set('Authorization', `Bearer ${adminUserId}`)
        .send({
          tipId: tip.id,
          reason: 'User request',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.actionType).toBe('REFUND_TIP');
    });

    it('should allow admins to update KYC status', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/update-kyc-status')
        .set('Authorization', `Bearer ${adminUserId}`)
        .send({
          targetId,
          kycStatus: 'APPROVED',
          reason: 'Documents verified',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.actionType).toBe('UPDATE_KYC_STATUS');

      // Check KYC status was updated
      const user = await prismaService.user.findUnique({
        where: { id: targetUserId },
      });
      expect(user?.kycStatus).toBe('APPROVED');
    });

    it('should return admin action logs', async () => {
      // Create some admin actions
      await prismaService.adminAction.createMany({
        data: [
          {
            adminId: adminUserId,
            actionType: 'BAN_USER',
            targetId,
            details: { reason: 'Test' },
          },
          {
            adminId: adminUserId,
            actionType: 'UPDATE_KYC_STATUS',
            targetId,
            details: { kycStatus: 'APPROVED' },
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/admin/logs')
        .set('Authorization', `Bearer ${adminUserId}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('actionType');
      expect(response.body[0]).toHaveProperty('adminId');
      expect(response.body[0]).toHaveProperty('createdAt');
    });
  });

  describe('Security Features', () => {
    it('should require authentication for protected endpoints', async () => {
      await request(app.getHttpServer())
        .get('/audit-logs/me')
        .expect(401);

      await request(app.getHttpServer())
        .get('/compliance/kyc-status')
        .expect(401);

      await request(app.getHttpServer())
        .post('/admin/ban-user')
        .expect(401);
    });

    it('should validate required fields for admin actions', async () => {
      await request(app.getHttpServer())
        .post('/admin/ban-user')
        .set('Authorization', `Bearer ${adminUserId}`)
        .send({})
        .expect(400);

      await request(app.getHttpServer())
        .post('/admin/refund-tip')
        .set('Authorization', `Bearer ${adminUserId}`)
        .send({})
        .expect(400);

      await request(app.getHttpServer())
        .post('/admin/update-kyc-status')
        .set('Authorization', `Bearer ${adminUserId}`)
        .send({})
        .expect(400);
    });

    it('should handle invalid user IDs gracefully', async () => {
      await request(app.getHttpServer())
        .post('/admin/ban-user')
        .set('Authorization', `Bearer ${adminUserId}`)
        .send({
          targetId: 'invalid-id',
          reason: 'Test',
        })
        .expect(400);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain audit trail for all critical actions', async () => {
      // Perform multiple actions
      await request(app.getHttpServer())
        .post('/tips')
        .set('Authorization', `Bearer ${regularUserId}`)
        .send({
          receiverId: targetUserId,
          amount: 10.00,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/admin/ban-user')
        .set('Authorization', `Bearer ${adminUserId}`)
        .send({
          targetId,
          reason: 'Test',
        })
        .expect(201);

      // Verify audit logs exist
      const auditLogs = await prismaService.auditLog.findMany();
      expect(auditLogs.length).toBeGreaterThan(0);

      // Verify admin actions exist
      const adminActions = await prismaService.adminAction.findMany();
      expect(adminActions.length).toBeGreaterThan(0);
    });

    it('should include proper metadata in audit logs', async () => {
      await request(app.getHttpServer())
        .post('/tips')
        .set('Authorization', `Bearer ${regularUserId}`)
        .send({
          receiverId: targetUserId,
          amount: 15.00,
          message: 'Test message',
        })
        .expect(201);

      const auditLog = await prismaService.auditLog.findFirst({
        where: { userId: regularUserId },
      });

      expect(auditLog).toHaveProperty('id');
      expect(auditLog).toHaveProperty('userId');
      expect(auditLog).toHaveProperty('action');
      expect(auditLog).toHaveProperty('resource');
      expect(auditLog).toHaveProperty('resourceId');
      expect(auditLog).toHaveProperty('details');
      expect(auditLog).toHaveProperty('createdAt');
    });
  });
}); 