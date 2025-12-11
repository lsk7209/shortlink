create table if not exists public.rate_limits (
  user_id uuid not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (user_id, window_start)
);

create index if not exists idx_rate_limits_user_window on public.rate_limits (user_id, window_start desc);

