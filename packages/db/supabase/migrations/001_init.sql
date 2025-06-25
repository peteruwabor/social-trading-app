-- supabase:ignore-rls

-- Users
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  created_at timestamptz default now()
);

-- Broker Connections
create table if not exists public.broker_connections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  broker text not null,                -- 'questrade' | 'ibkr'
  access_token text not null,
  refresh_token text not null,
  scope text,
  status text default 'active',        -- active | revoked | error
  last_synced_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
); 