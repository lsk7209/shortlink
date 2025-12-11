create table if not exists public.click_events (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.short_links(id) on delete cascade,
  clicked_at timestamptz not null default now(),
  referrer text null,
  ua text null,
  country text null,
  ip_hash text null
);

create index if not exists idx_click_events_link_time on public.click_events (link_id, clicked_at desc);

