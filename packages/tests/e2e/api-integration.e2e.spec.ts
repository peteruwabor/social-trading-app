import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../api/src/app.module';
import { PrismaService } from '../../api/src/lib/prisma.service';
import { AuthGuard } from '../../api/src/lib/auth.guard';

// Set required environment variables for SnapTrade
process.env.SNAPTRADE_CLIENT_ID = 'test-client-id';
process.env.SNAPTRADE_CONSUMER_KEY = 'test-consumer-key';

// Set database URL for Prisma
process.env.DATABASE_URL = 'postgresql://gioat:gioat_dev_pwd@localhost:5432/gioat_dev';

// Helper for test user
const testUser = {
  id: 'test-api-user-id',
  email: 'test-api-user@example.com',
};

describe('Epic K: API Keys & Webhooks (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let createdApiKey: any;
  let createdWebhook: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const request = context.switchToHttp().getRequest();
          request.user = testUser;
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Clean up test data
    await prisma.apiKey.deleteMany({ where: { userId: testUser.id } });
    await prisma.webhook.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.deleteMany({ where: { id: testUser.id } });
    await prisma.user.create({
      data: {
        id: testUser.id,
        email: testUser.email,
        firstName: 'API',
        lastName: 'User',
        status: 'ACTIVE',
        kycStatus: 'APPROVED',
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('API Key Management', () => {
    it('should create an API key', async () => {
      const response = await request(app.getHttpServer())
        .post('/api-keys')
        .send({ name: 'Test Key', scopes: ['read', 'write'] })
        .expect(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('key');
      expect(response.body.scopes).toContain('read');
      createdApiKey = response.body;
    });

    it('should list API keys', async () => {
      const response = await request(app.getHttpServer())
        .get('/api-keys')
        .expect(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('key');
    });

    it('should get API key stats', async () => {
      const response = await request(app.getHttpServer())
        .get('/api-keys/stats')
        .expect(200);
      expect(response.body).toHaveProperty('totalKeys');
      expect(response.body).toHaveProperty('activeKeys');
    });

    it('should revoke an API key', async () => {
      await request(app.getHttpServer())
        .delete(`/api-keys/${createdApiKey.id}`)
        .expect(200);
      // Should be marked as revoked
      const keys = await request(app.getHttpServer())
        .get('/api-keys')
        .expect(200);
      expect(keys.body.find((k: any) => k.id === createdApiKey.id).status).toBe('REVOKED');
    });

    it('should reject creating API key with no scopes', async () => {
      await request(app.getHttpServer())
        .post('/api-keys')
        .send({ name: 'Invalid Key', scopes: [] })
        .expect(400);
    });
  });

  describe('Webhook Management', () => {
    it('should register a webhook', async () => {
      const response = await request(app.getHttpServer())
        .post('/webhooks')
        .send({ url: 'https://example.com/webhook', eventTypes: ['TRADE_FILLED'] })
        .expect(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('secret');
      createdWebhook = response.body;
    });

    it('should list webhooks', async () => {
      const response = await request(app.getHttpServer())
        .get('/webhooks')
        .expect(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).not.toHaveProperty('secret');
    });

    it('should update a webhook', async () => {
      const response = await request(app.getHttpServer())
        .put(`/webhooks/${createdWebhook.id}`)
        .send({ eventTypes: ['TRADE_FILLED', 'TIP_RECEIVED'] })
        .expect(200);
      expect(response.body.eventTypes).toContain('TIP_RECEIVED');
    });

    it('should get webhook stats', async () => {
      const response = await request(app.getHttpServer())
        .get('/webhooks/stats')
        .expect(200);
      expect(response.body).toHaveProperty('totalWebhooks');
      expect(response.body).toHaveProperty('activeWebhooks');
    });

    it('should get available event types', async () => {
      const response = await request(app.getHttpServer())
        .get('/webhooks/events')
        .expect(200);
      expect(response.body.eventTypes).toContain('TRADE_FILLED');
    });

    it('should get webhook logs (empty)', async () => {
      const response = await request(app.getHttpServer())
        .get('/webhooks/logs')
        .expect(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should delete a webhook', async () => {
      await request(app.getHttpServer())
        .delete(`/webhooks/${createdWebhook.id}`)
        .expect(200);
      const response = await request(app.getHttpServer())
        .get('/webhooks')
        .expect(200);
      expect(response.body.find((w: any) => w.id === createdWebhook.id)).toBeUndefined();
    });

    it('should reject registering webhook with invalid URL', async () => {
      await request(app.getHttpServer())
        .post('/webhooks')
        .send({ url: 'not-a-url', eventTypes: ['TRADE_FILLED'] })
        .expect(400);
    });
  });
}); 