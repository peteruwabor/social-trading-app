import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables from .env.test if it exists
config({ path: '.env.test' });

// Set default test environment variables if not already set
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://peteruwabor@localhost:5432/gioat_test';
process.env.SNAPTRADE_CLIENT_ID = process.env.SNAPTRADE_CLIENT_ID || 'GIOAT-TEST-HTZCG';
process.env.SNAPTRADE_CONSUMER_KEY = process.env.SNAPTRADE_CONSUMER_KEY || '7aEBAbQUTl4caNSpNrtVB57fd65I57yoxXQDNXigHZkPwIK9XF';
process.env.VAULT_KEY = process.env.VAULT_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

declare global {
  var prisma: PrismaClient;
}

beforeAll(async () => {
  global.prisma = new PrismaClient();
});

afterAll(async () => {
  await global.prisma.$disconnect();
}); 