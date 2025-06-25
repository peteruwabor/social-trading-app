import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../api/src/app.module';
import { PrismaService } from '../../api/src/lib/prisma.service';
import { NotificationService } from '../../api/src/lib/notification.service';

process.env.SNAPTRADE_CLIENT_ID = 'test-client-id';
process.env.SNAPTRADE_CONSUMER_KEY = 'test-consumer-key';

describe('Tipping, Monetization & Admin Tools (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let notificationService: NotificationService;

  // Test user IDs
  let senderUserId: string;
  let receiverUserId: string;
  let adminUserId: string;
  let tipId: string;

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
    await prismaService.adminAction.deleteMany();
    await prismaService.tip.deleteMany();
    await prismaService.user.deleteMany();

    // Reset mocks
    jest.clearAllMocks();

    // Create test users
    const sender = await prismaService.user.create({
      data: {
        email: 'sender@gioat.app',
        handle: 'sender',
        firstName: 'John',
        lastName: 'Sender',
      },
    });
    senderUserId = sender.id;

    const receiver = await prismaService.user.create({
      data: {
        email: 'receiver@gioat.app',
        handle: 'receiver',
        firstName: 'Jane',
        lastName: 'Receiver',
      },
    });
    receiverUserId = receiver.id;

    const admin = await prismaService.user.create({
      data: {
        email: 'admin@gioat.app',
        handle: 'admin',
        firstName: 'Admin',
        lastName: 'User',
      },
    });
    adminUserId = admin.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Tipping System', () => {
    describe('Sending Tips', () => {
      it('should allow a user to send a tip to another user', async () => {
        const response = await request(app.getHttpServer())
          .post('/tips')
          .set('Authorization', `Bearer ${senderUserId}`)
          .send({
            receiverId: receiverUserId,
            amount: 10.50,
            message: 'Great trading session!',
          })
          .expect(201);

        expect(response.body).toMatchObject({
          senderId: senderUserId,
          receiverId: receiverUserId,
          amount: '10.50',
          message: 'Great trading session!',
          platformFee: '0.53', // 5% of 10.50
        });

        tipId = response.body.id;
      });

      it('should allow sending a tip without a message', async () => {
        const response = await request(app.getHttpServer())
          .post('/tips')
          .set('Authorization', `Bearer ${senderUserId}`)
          .send({
            receiverId: receiverUserId,
            amount: 5.00,
          })
          .expect(201);

        expect(response.body).toMatchObject({
          senderId: senderUserId,
          receiverId: receiverUserId,
          amount: '5.00',
          message: null,
          platformFee: '0.25', // 5% of 5.00
        });
      });

      it('should reject sending tip to non-existent user', async () => {
        await request(app.getHttpServer())
          .post('/tips')
          .set('Authorization', `Bearer ${senderUserId}`)
          .send({
            receiverId: 'non-existent-user-id',
            amount: 10.00,
          })
          .expect(400);
      });

      it('should reject sending tip with invalid amount', async () => {
        await request(app.getHttpServer())
          .post('/tips')
          .set('Authorization', `Bearer ${senderUserId}`)
          .send({
            receiverId: receiverUserId,
            amount: -5.00,
          })
          .expect(400);
      });
    });

    describe('Tip History', () => {
      beforeEach(async () => {
        // Create some tips
        await prismaService.tip.createMany({
          data: [
            {
              senderId: senderUserId,
              receiverId: receiverUserId,
              amount: 10.00,
              message: 'Tip 1',
              platformFee: 0.50,
            },
            {
              senderId: receiverUserId,
              receiverId: senderUserId,
              amount: 5.00,
              message: 'Tip 2',
              platformFee: 0.25,
            },
          ],
        });
      });

      it('should return tip history for a user (sent and received)', async () => {
        const response = await request(app.getHttpServer())
          .get('/tips/history')
          .set('Authorization', `Bearer ${senderUserId}`)
          .expect(200);

        expect(response.body).toHaveLength(2);
        const expectedTips = [
          {
            senderId: receiverUserId,
            receiverId: senderUserId,
            amount: '5.00',
            message: 'Tip 2',
          },
          {
            senderId: senderUserId,
            receiverId: receiverUserId,
            amount: '10.00',
            message: 'Tip 1',
          },
        ];
        for (const expected of expectedTips) {
          expect(response.body).toEqual(
            expect.arrayContaining([
              expect.objectContaining(expected),
            ]),
          );
        }
      });

      it('should return empty array for user with no tips', async () => {
        const newUser = await prismaService.user.create({
          data: { email: 'newuser@gioat.app' },
        });

        const response = await request(app.getHttpServer())
          .get('/tips/history')
          .set('Authorization', `Bearer ${newUser.id}`)
          .expect(200);

        expect(response.body).toHaveLength(0);
      });
    });

    describe('Earnings', () => {
      beforeEach(async () => {
        // Create tips received by receiver
        await prismaService.tip.createMany({
          data: [
            {
              senderId: senderUserId,
              receiverId: receiverUserId,
              amount: 20.00,
              message: 'Tip 1',
              platformFee: 1.00,
            },
            {
              senderId: adminUserId,
              receiverId: receiverUserId,
              amount: 15.00,
              message: 'Tip 2',
              platformFee: 0.75,
            },
          ],
        });
      });

      it('should return earnings summary for a user', async () => {
        const response = await request(app.getHttpServer())
          .get('/tips/earnings')
          .set('Authorization', `Bearer ${receiverUserId}`)
          .expect(200);

        expect(response.body).toMatchObject({
          total: '35.00', // 20 + 15
          fees: '1.75',   // 1.00 + 0.75
          net: '33.25',   // 35.00 - 1.75
        });
      });

      it('should return zero earnings for user with no received tips', async () => {
        const response = await request(app.getHttpServer())
          .get('/tips/earnings')
          .set('Authorization', `Bearer ${senderUserId}`)
          .expect(200);

        expect(response.body).toMatchObject({
          total: '0.00',
          fees: '0.00',
          net: '0.00',
        });
      });
    });
  });

  describe('Admin Tools', () => {
    describe('User Management', () => {
      it('should allow admin to ban a user', async () => {
        const response = await request(app.getHttpServer())
          .post('/admin/ban-user')
          .set('Authorization', `Bearer ${adminUserId}`)
          .send({
            targetUserId: receiverUserId,
            reason: 'Violation of community guidelines',
          })
          .expect(201);

        expect(response.body).toMatchObject({
          adminId: adminUserId,
          action: 'BAN_USER',
          targetUserId: receiverUserId,
          details: { reason: 'Violation of community guidelines' },
        });

        // Verify user is banned
        const bannedUser = await prismaService.user.findUnique({
          where: { id: receiverUserId },
        });
        expect(bannedUser).not.toBeNull();
        expect(bannedUser!.status).toBe('BANNED');
      });

      it('should reject banning non-existent user', async () => {
        await request(app.getHttpServer())
          .post('/admin/ban-user')
          .set('Authorization', `Bearer ${adminUserId}`)
          .send({
            targetUserId: 'non-existent-user-id',
            reason: 'Test reason',
          })
          .expect(400);
      });
    });

    describe('Tip Management', () => {
      beforeEach(async () => {
        // Create a tip to refund
        const tip = await prismaService.tip.create({
          data: {
            senderId: senderUserId,
            receiverId: receiverUserId,
            amount: 25.00,
            message: 'Tip to refund',
            platformFee: 1.25,
          },
        });
        tipId = tip.id;
      });

      it('should allow admin to refund a tip', async () => {
        const response = await request(app.getHttpServer())
          .post('/admin/refund-tip')
          .set('Authorization', `Bearer ${adminUserId}`)
          .send({
            tipId: tipId,
            reason: 'Customer requested refund',
          })
          .expect(201);

        expect(response.body).toMatchObject({
          adminId: adminUserId,
          action: 'REFUND_TIP',
          details: {
            tipId: tipId,
            reason: 'Customer requested refund',
          },
        });
      });

      it('should reject refunding non-existent tip', async () => {
        await request(app.getHttpServer())
          .post('/admin/refund-tip')
          .set('Authorization', `Bearer ${adminUserId}`)
          .send({
            tipId: 'non-existent-tip-id',
            reason: 'Test reason',
          })
          .expect(400);
      });
    });

    describe('Audit Logs', () => {
      beforeEach(async () => {
        // Create some admin actions
        await prismaService.adminAction.createMany({
          data: [
            {
              adminId: adminUserId,
              targetId: receiverUserId,
              actionType: 'BAN_USER',
              details: { reason: 'Test ban' },
            },
            {
              adminId: adminUserId,
              targetId: receiverUserId,
              actionType: 'REFUND_TIP',
              details: { tipId: 'test-tip-id', reason: 'Test refund' },
            },
          ],
        });
      });

      it('should return all admin action logs', async () => {
        const response = await request(app.getHttpServer())
          .get('/admin/logs')
          .set('Authorization', `Bearer ${adminUserId}`)
          .expect(200);

        expect(response.body).toHaveLength(2);
        const expectedLogs = [
          {
            adminId: adminUserId,
            targetId: receiverUserId,
            actionType: 'REFUND_TIP',
            details: { tipId: 'test-tip-id', reason: 'Test refund' },
          },
          {
            adminId: adminUserId,
            targetId: receiverUserId,
            actionType: 'BAN_USER',
            details: { reason: 'Test ban' },
          },
        ];
        for (const expected of expectedLogs) {
          expect(response.body).toEqual(
            expect.arrayContaining([
              expect.objectContaining(expected),
            ]),
          );
        }
      });

      it('should return logs in descending order by creation time', async () => {
        const response = await request(app.getHttpServer())
          .get('/admin/logs')
          .set('Authorization', `Bearer ${adminUserId}`)
          .expect(200);

        const logs = response.body;
        expect(new Date(logs[0].createdAt).getTime()).toBeGreaterThanOrEqual(new Date(logs[1].createdAt).getTime());
      });
    });
  });

  describe('Error Handling', () => {
    it('should require authentication for all endpoints', async () => {
      // Test tipping endpoints
      await request(app.getHttpServer())
        .post('/tips')
        .send({ receiverId: receiverUserId, amount: 10.00 })
        .expect(401);

      await request(app.getHttpServer())
        .get('/tips/history')
        .expect(401);

      await request(app.getHttpServer())
        .get('/tips/earnings')
        .expect(401);

      // Test admin endpoints
      await request(app.getHttpServer())
        .post('/admin/ban-user')
        .send({ targetUserId: receiverUserId, reason: 'Test' })
        .expect(401);

      await request(app.getHttpServer())
        .post('/admin/refund-tip')
        .send({ tipId: 'test-id', reason: 'Test' })
        .expect(401);

      await request(app.getHttpServer())
        .get('/admin/logs')
        .expect(401);
    });

    it('should handle invalid request bodies gracefully', async () => {
      await request(app.getHttpServer())
        .post('/tips')
        .set('Authorization', `Bearer ${senderUserId}`)
        .send({})
        .expect(400);

      await request(app.getHttpServer())
        .post('/admin/ban-user')
        .set('Authorization', `Bearer ${adminUserId}`)
        .send({})
        .expect(400);
    });
  });
}); 