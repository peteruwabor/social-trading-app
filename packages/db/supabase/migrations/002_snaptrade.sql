-- add snaptrade IDs
alter table public.broker_connections
  add column snaptrade_user_id uuid,
  add column snaptrade_authorization_id uuid;

-- status default stays 'active'
-- supabase:ignore-rls 