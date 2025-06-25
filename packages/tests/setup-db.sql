-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Create broker_connections table
CREATE TABLE IF NOT EXISTS public.broker_connections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  broker text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  scope text,
  status text DEFAULT 'active',
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_broker_connections_user_id ON public.broker_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_broker_connections_status ON public.broker_connections(status);
CREATE INDEX IF NOT EXISTS idx_broker_connections_last_synced_at ON public.broker_connections(last_synced_at);

-- Enable Row Level Security (RLS) - you may want to configure policies later
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_connections ENABLE ROW LEVEL SECURITY; 