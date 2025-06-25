// E2E Test Setup
import { config } from 'dotenv';

// Load environment variables
config({ path: '../../.env' });

// Validate required environment variables for E2E tests
const requiredEnvVars = [
  'DATABASE_URL',
  'PGHOST',
  'PGDATABASE',
  'PGUSER',
  'PGPASSWORD',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

console.log('✅ E2E test environment configured successfully');
console.log(`📊 Postgres Host: ${process.env.PGHOST}`);
console.log(`🔑 Database: ${process.env.PGDATABASE}`); 