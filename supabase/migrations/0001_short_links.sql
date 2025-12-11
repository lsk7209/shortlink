-- short_links 테이블
create table if not exists public.short_links (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  target_url text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz null,
  click_count bigint not null default 0,
  owner_id uuid not null,
  owner_domain text null,
  active boolean not null default true
);

create index if not exists idx_short_links_owner_created_at on public.short_links (owner_id, created_at desc);

-- 활동 로그(선택)
create table if not exists public.link_logs (
  id uuid primary key default gen_random_uuid(),
  link_id uuid references public.short_links(id) on delete cascade,
  actor_id uuid,
  action text not null,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.short_links enable row level security;
alter table public.link_logs enable row level security;

-- 일반 사용자: 자신의 링크만 조회/수정
create policy "select_own_links" on public.short_links
  for select using (auth.uid() = owner_id);

create policy "insert_own_links" on public.short_links
  for insert with check (auth.uid() = owner_id);

create policy "update_own_links" on public.short_links
  for update using (auth.uid() = owner_id);

-- 관리자는 app_metadata.role = 'admin' 인 경우 전체 허용
create policy "admin_select_all" on public.short_links
  for select using (coalesce(auth.jwt()->>'role', '') = 'admin');

create policy "admin_update_all" on public.short_links
  for update using (coalesce(auth.jwt()->>'role', '') = 'admin');

create policy "admin_insert_all" on public.short_links
  for insert with check (coalesce(auth.jwt()->>'role', '') = 'admin');

-- 로그 테이블도 동일한 접근 패턴
create policy "select_own_logs" on public.link_logs
  for select using (auth.uid() = actor_id);

create policy "insert_own_logs" on public.link_logs
  for insert with check (auth.uid() = actor_id);

create policy "admin_logs_select_all" on public.link_logs
  for select using (coalesce(auth.jwt()->>'role', '') = 'admin');

create policy "admin_logs_insert_all" on public.link_logs
  for insert with check (coalesce(auth.jwt()->>'role', '') = 'admin');

