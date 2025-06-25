-- Add last_trade_poll_at column to broker_connections table
alter table public.broker_connections 
add column if not exists last_trade_poll_at timestamptz;

-- Initialize existing records with current timestamp
update public.broker_connections 
set last_trade_poll_at = now() 
where last_trade_poll_at is null; 