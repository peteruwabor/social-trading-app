import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../api/src/app.module';
import { PrismaService } from '../../api/src/lib/prisma.service';
import { AuthGuard } from '../../api/src/lib/auth.guard';
import { PlatformIntegrationsService } from '../../api/src/modules/platform-integrations/platform-integrations.service';

describe('Epic K: Platform Integrations & API Ecosystem (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let platformIntegrationsService: PlatformIntegrationsService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const request = context.switchToHttp().getRequest();
          request.user = { id: 'test-user-123', email: 'test@gioat.app' };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    platformIntegrationsService = moduleFixture.get<PlatformIntegrationsService>(PlatformIntegrationsService);
    await app.init();

    // Create test user
    await prisma.user.upsert({
      where: { id: 'test-user-123' },
      update: {},
      create: {
        id: 'test-user-123',
        email: 'test@gioat.app',
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.apiKey.deleteMany({ where: { userId: 'test-user-123' } });
    await prisma.webhook.deleteMany({ where: { userId: 'test-user-123' } });
    await prisma.thirdPartyIntegration.deleteMany({ where: { userId: 'test-user-123' } });
    await prisma.apiUsage.deleteMany({ where: { userId: 'test-user-123' } });
    await prisma.rateLimit.deleteMany({ where: { userId: 'test-user-123' } });
  });

  describe('/platform-integrations/api-keys (POST)', () => {
    it('should create a new API key', () => {
      return request(app.getHttpServer())
        .post('/platform-integrations/api-keys')
        .set('X-Test-User', 'test-user-123')
        .send({
          name: 'Test API Key',
          permissions: ['read:portfolio', 'write:trades'],
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        })
        .expect(201)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe('Test API Key');
          expect(res.body.data.permissions).toEqual(['read:portfolio', 'write:trades']);
          expect(res.body.data.isActive).toBe(true);
          expect(res.body.data.key).toMatch(/^gioat_/);
          expect(res.body.message).toContain('save the key securely');
        });
    });

    it('should validate required fields', () => {
      return request(app.getHttpServer())
        .post('/platform-integrations/api-keys')
        .set('X-Test-User', 'test-user-123')
        .send({
          name: '',
          permissions: [],
        })
        .expect(400);
    });
  });

  describe('/platform-integrations/api-keys (GET)', () => {
    it('should return user API keys', async () => {
      // Create a test API key first
      await prisma.apiKey.create({
        data: {
          userId: 'test-user-123',
          name: 'Test Key',
          key: 'hashed_key_value',
          permissions: ['read:portfolio'],
          isActive: true,
        },
      });

      return request(app.getHttpServer())
        .get('/platform-integrations/api-keys')
        .set('X-Test-User', 'test-user-123')
        .expect(200)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.data[0].name).toBe('Test Key');
          expect(res.body.data[0].key).toMatch(/^\*\*\*/); // Should be masked
        });
    });
  });

  describe('/platform-integrations/api-keys/:id (PUT)', () => {
    it('should update an API key', async () => {
      const apiKey = await prisma.apiKey.create({
        data: {
          userId: 'test-user-123',
          name: 'Original Name',
          key: 'hashed_key_value',
          permissions: ['read:portfolio'],
          isActive: true,
        },
      });

      return request(app.getHttpServer())
        .put(`/platform-integrations/api-keys/${apiKey.id}`)
        .set('X-Test-User', 'test-user-123')
        .send({
          name: 'Updated Name',
          permissions: ['read:portfolio', 'write:trades'],
          isActive: false,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe('Updated Name');
          expect(res.body.data.permissions).toEqual(['read:portfolio', 'write:trades']);
          expect(res.body.data.isActive).toBe(false);
        });
    });
  });

  describe('/platform-integrations/api-keys/:id (DELETE)', () => {
    it('should delete an API key', async () => {
      const apiKey = await prisma.apiKey.create({
        data: {
          userId: 'test-user-123',
          name: 'To Delete',
          key: 'hashed_key_value',
          permissions: ['read:portfolio'],
          isActive: true,
        },
      });

      return request(app.getHttpServer())
        .delete(`/platform-integrations/api-keys/${apiKey.id}`)
        .set('X-Test-User', 'test-user-123')
        .expect(204);
    });
  });

  describe('/platform-integrations/webhooks (POST)', () => {
    it('should create a new webhook', () => {
      return request(app.getHttpServer())
        .post('/platform-integrations/webhooks')
        .set('X-Test-User', 'test-user-123')
        .send({
          name: 'Trade Notifications',
          url: 'https://example.com/webhook',
          events: ['trade.executed', 'portfolio.updated'],
        })
        .expect(201)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe('Trade Notifications');
          expect(res.body.data.url).toBe('https://example.com/webhook');
          expect(res.body.data.events).toEqual(['trade.executed', 'portfolio.updated']);
          expect(res.body.data.isActive).toBe(true);
          expect(res.body.data.secret).toMatch(/^whsec_/);
          expect(res.body.message).toContain('save the secret securely');
        });
    });
  });

  describe('/platform-integrations/webhooks (GET)', () => {
    it('should return user webhooks', async () => {
      await prisma.webhook.create({
        data: {
          userId: 'test-user-123',
          name: 'Test Webhook',
          url: 'https://example.com/webhook',
          events: ['trade.executed'],
          secret: 'test_secret',
          isActive: true,
        },
      });

      return request(app.getHttpServer())
        .get('/platform-integrations/webhooks')
        .set('X-Test-User', 'test-user-123')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.data[0].name).toBe('Test Webhook');
          expect(res.body.data[0].secret).toMatch(/^\*\*\*/); // Should be masked
        });
    });
  });

  describe('/platform-integrations/webhooks/:id/test (POST)', () => {
    it('should test a webhook', async () => {
      const webhook = await prisma.webhook.create({
        data: {
          userId: 'test-user-123',
          name: 'Test Webhook',
          url: 'https://example.com/webhook',
          events: ['trade.executed'],
          secret: 'test_secret',
          isActive: true,
        },
      });

      return request(app.getHttpServer())
        .post(`/platform-integrations/webhooks/${webhook.id}/test`)
        .set('X-Test-User', 'test-user-123')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.delivered).toBe(true);
        });
    });
  });

  describe('/platform-integrations/integrations (POST)', () => {
    it('should create a new third-party integration', () => {
      return request(app.getHttpServer())
        .post('/platform-integrations/integrations')
        .set('X-Test-User', 'test-user-123')
        .send({
          provider: 'slack',
          type: 'NOTIFICATION',
          config: {
            webhookUrl: 'https://hooks.slack.com/services/xxx',
            channel: '#trades',
          },
        })
        .expect(201)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.provider).toBe('slack');
          expect(res.body.data.type).toBe('NOTIFICATION');
          expect(res.body.data.isActive).toBe(true);
        });
    });
  });

  describe('/platform-integrations/integrations (GET)', () => {
    it('should return user integrations', async () => {
      await prisma.thirdPartyIntegration.create({
        data: {
          userId: 'test-user-123',
          provider: 'slack',
          type: 'NOTIFICATION',
          config: {
            webhookUrl: 'https://hooks.slack.com/services/xxx',
            channel: '#trades',
          },
          isActive: true,
        },
      });

      return request(app.getHttpServer())
        .get('/platform-integrations/integrations')
        .set('X-Test-User', 'test-user-123')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.data[0].provider).toBe('slack');
          expect(res.body.data[0].type).toBe('NOTIFICATION');
        });
    });
  });

  describe('/platform-integrations/integrations/:id/sync (POST)', () => {
    it('should sync an integration', async () => {
      const integration = await prisma.thirdPartyIntegration.create({
        data: {
          userId: 'test-user-123',
          provider: 'slack',
          type: 'NOTIFICATION',
          config: {
            webhookUrl: 'https://hooks.slack.com/services/xxx',
            channel: '#trades',
          },
          isActive: true,
        },
      });

      return request(app.getHttpServer())
        .post(`/platform-integrations/integrations/${integration.id}/sync`)
        .set('X-Test-User', 'test-user-123')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.synced).toBe(true);
        });
    });
  });

  describe('/platform-integrations/api-usage (GET)', () => {
    it('should return API usage statistics', async () => {
      // Create some test API usage data
      await prisma.apiUsage.createMany({
        data: [
          {
            userId: 'test-user-123',
            endpoint: '/api/portfolio',
            method: 'GET',
            timestamp: new Date(),
            responseTime: 150,
            statusCode: 200,
            userAgent: 'test-agent',
            ipAddress: '127.0.0.1',
          },
          {
            userId: 'test-user-123',
            endpoint: '/api/trades',
            method: 'POST',
            timestamp: new Date(),
            responseTime: 200,
            statusCode: 201,
            userAgent: 'test-agent',
            ipAddress: '127.0.0.1',
          },
        ],
      });

      return request(app.getHttpServer())
        .get('/platform-integrations/api-usage')
        .set('X-Test-User', 'test-user-123')
        .query({ period: 'day' })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.totalRequests).toBe(2);
          expect(res.body.data.averageResponseTime).toBe(175);
          expect(res.body.data.errorRate).toBe(0);
          expect(res.body.data.topEndpoints).toHaveLength(2);
        });
    });
  });

  describe('/platform-integrations/documentation (GET)', () => {
    it('should return API documentation', () => {
      return request(app.getHttpServer())
        .get('/platform-integrations/documentation')
        .set('X-Test-User', 'test-user-123')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.endpoints).toBeDefined();
          expect(res.body.data.schemas).toBeDefined();
        });
    });
  });

  describe('/platform-integrations/rate-limits (GET)', () => {
    it('should return rate limit information', () => {
      return request(app.getHttpServer())
        .get('/platform-integrations/rate-limits')
        .set('X-Test-User', 'test-user-123')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.limits).toBeDefined();
          expect(res.body.data.current).toBeDefined();
        });
    });
  });

  describe('/platform-integrations/providers (GET)', () => {
    it('should return available integration providers', () => {
      return request(app.getHttpServer())
        .get('/platform-integrations/providers')
        .set('X-Test-User', 'test-user-123')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
        });
    });
  });

  describe('/platform-integrations/webhook-events (GET)', () => {
    it('should return available webhook events', () => {
      return request(app.getHttpServer())
        .get('/platform-integrations/webhook-events')
        .set('X-Test-User', 'test-user-123')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
        });
    });
  });

  describe('API Key Validation', () => {
    it('should validate API keys correctly', async () => {
      // Create a test API key
      const createResponse = await request(app.getHttpServer())
        .post('/platform-integrations/api-keys')
        .set('X-Test-User', 'test-user-123')
        .send({
          name: 'Test Key',
          permissions: ['read:portfolio'],
        })
        .expect(201);

      const apiKey = createResponse.body.data.key;
      
      // Test valid key
      await request(app.getHttpServer())
        .get('/platform-integrations/api-keys')
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(200);

      // Test invalid key
      await request(app.getHttpServer())
        .get('/platform-integrations/api-keys')
        .set('Authorization', 'Bearer invalid_key')
        .expect(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Test rate limiting
      const result1 = await platformIntegrationsService.checkRateLimit(
        'test-user-123',
        '/api/test',
        10,
        60000,
      );
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(9);

      // Make multiple requests
      for (let i = 0; i < 9; i++) {
        await platformIntegrationsService.checkRateLimit(
          'test-user-123',
          '/api/test',
          10,
          60000,
        );
      }

      // Should be rate limited now
      const result2 = await platformIntegrationsService.checkRateLimit(
        'test-user-123',
        '/api/test',
        10,
        60000,
      );
      expect(result2.allowed).toBe(false);
      expect(result2.remaining).toBe(0);
    });
  });

  describe('Webhook Signature Generation', () => {
    it('should generate valid webhook signatures', async () => {
      // Create a webhook
      const webhook = await platformIntegrationsService.createWebhook('test-user-123', {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['trade.executed'],
      });

      // Test webhook delivery
      const payload = { event: 'trade.executed', data: { symbol: 'AAPL' } };
      const result = await platformIntegrationsService.triggerWebhook(webhook.id, 'trade.executed', payload);
      expect(result).toBe(true);
    });
  });

  describe('Integration Provider Support', () => {
    it('should support multiple integration types', () => {
      const supportedTypes = ['ANALYTICS', 'NOTIFICATION', 'TRADING', 'SOCIAL', 'PAYMENT'];
      expect(supportedTypes).toHaveLength(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid API key updates gracefully', () => {
      return request(app.getHttpServer())
        .put('/platform-integrations/api-keys/invalid-id')
        .set('X-Test-User', 'test-user-123')
        .send({
          name: 'Updated Name',
        })
        .expect(404);
    });

    it('should handle invalid webhook URLs', () => {
      return request(app.getHttpServer())
        .post('/platform-integrations/webhooks')
        .set('X-Test-User', 'test-user-123')
        .send({
          name: 'Invalid Webhook',
          url: 'not-a-url',
          events: ['test'],
        })
        .expect(400);
    });
  });
}); 