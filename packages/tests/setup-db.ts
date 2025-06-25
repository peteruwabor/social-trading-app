import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../../.env' });

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

async function setupDatabase() {
  console.log('Setting up database tables for E2E testing...');

  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text NOT NULL UNIQUE,
        created_at timestamptz DEFAULT now()
      );
    `);
    console.log('✅ Users table created/verified');

    // Create broker_connections table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.broker_connections (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
        broker text NOT NULL,
        access_token text NOT NULL,
        refresh_token text NOT NULL,
        scope text,
        status text DEFAULT 'active',
        last_synced_at timestamptz,
        last_trade_poll_at timestamptz,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        snaptrade_user_id text,
        snaptrade_authorization_id text
      );
    `);
    console.log('✅ Broker connections table created/verified');

    // Create holdings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.holdings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        broker_connection_id uuid NOT NULL,
        account_number text NOT NULL,
        symbol text NOT NULL,
        quantity numeric NOT NULL,
        market_value numeric NOT NULL,
        currency text DEFAULT 'USD',
        updated_at timestamptz DEFAULT now()
      );
    `);
    console.log('✅ Holdings table created/verified');

    // Create trades table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.trades (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        broker_connection_id uuid NOT NULL,
        account_number text NOT NULL,
        symbol text NOT NULL,
        side text NOT NULL,
        quantity numeric NOT NULL,
        fill_price numeric NOT NULL,
        filled_at timestamptz NOT NULL,
        created_at timestamptz DEFAULT now()
      );
    `);
    console.log('✅ Trades table created/verified');

    // Create followers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.followers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        leader_user_id uuid NOT NULL,
        auto_copy boolean DEFAULT false,
        alert_only boolean DEFAULT false,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    console.log('✅ Followers table created/verified');

    // Create device_tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.device_tokens (
        user_id uuid NOT NULL,
        token text NOT NULL,
        created_at timestamptz DEFAULT now(),
        PRIMARY KEY (user_id, token)
      );
    `);
    console.log('✅ Device tokens table created/verified');

    console.log('Database setup completed!');
  } catch (error) {
    console.error('Database setup failed:', error);
  } finally {
    await pool.end();
  }
}

setupDatabase(); 