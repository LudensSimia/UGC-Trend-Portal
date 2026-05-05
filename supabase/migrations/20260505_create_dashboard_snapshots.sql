create table if not exists public.dashboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  snapshot_date date not null default current_date,
  platform text not null,
  data jsonb not null,
  unique (snapshot_date, platform)
);

alter table public.dashboard_snapshots enable row level security;

create policy "Allow public read access to dashboard snapshots"
  on public.dashboard_snapshots
  for select
  to anon
  using (true);

create index if not exists dashboard_snapshots_platform_date_idx
  on public.dashboard_snapshots (platform, snapshot_date desc);
