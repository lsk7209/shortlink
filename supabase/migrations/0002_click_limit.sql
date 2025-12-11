alter table public.short_links add column if not exists click_limit integer null;

create index if not exists idx_short_links_active on public.short_links (active);

