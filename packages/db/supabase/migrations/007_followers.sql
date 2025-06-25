-- Followers table for leader-follower relationships
create table if not exists public.followers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  leader_user_id uuid references public.users(id) on delete cascade,
  auto_copy boolean default false,
  alert_only boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Ensure a user can only follow a leader once
  unique(user_id, leader_user_id)
);

-- Indexes for faster lookups
create index if not exists idx_followers_user_id on public.followers(user_id);
create index if not exists idx_followers_leader_user_id on public.followers(leader_user_id);
create index if not exists idx_followers_auto_copy on public.followers(auto_copy);
create index if not exists idx_followers_alert_only on public.followers(alert_only); 