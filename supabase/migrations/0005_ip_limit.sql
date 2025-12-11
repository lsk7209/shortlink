create table if not exists public.ip_limits (
  ip_hash text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (ip_hash, window_start)
);

create index if not exists idx_ip_limits_window on public.ip_limits (window_start desc);

