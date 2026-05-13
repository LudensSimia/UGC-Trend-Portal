create extension if not exists pgcrypto;

create table if not exists public.ingest_runs (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  source_name text not null,
  source_url text,
  snapshot_date date not null default current_date,
  status text not null default 'running' check (
    status in ('running', 'completed', 'partial', 'failed')
  ),
  http_status integer,
  rows_returned integer not null default 0,
  rows_inserted integer not null default 0,
  rows_failed integer not null default 0,
  parser_version text,
  dashboard_build text,
  error_message text,
  raw_response_summary jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.raw_source_responses (
  id uuid primary key default gen_random_uuid(),
  ingest_run_id uuid references public.ingest_runs(id) on delete set null,
  platform text not null,
  source_name text not null,
  source_url text,
  response_started_at timestamptz,
  response_finished_at timestamptz not null default now(),
  http_status integer,
  row_count integer not null default 0,
  payload_sha256 text,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.data_integrity_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  snapshot_date date not null default current_date,
  status text not null default 'completed',
  payload jsonb not null
);

alter table public.games
  add column if not exists raw_top_trending jsonb,
  add column if not exists raw_game_details jsonb;

alter table public.roblox_chart_snapshots
  add column if not exists snapshot_date date not null default current_date,
  add column if not exists universe_id text,
  add column if not exists root_place_id text,
  add column if not exists up_votes bigint,
  add column if not exists down_votes bigint,
  add column if not exists like_ratio numeric,
  add column if not exists raw_chart_item jsonb,
  add column if not exists raw_game_details jsonb,
  add column if not exists raw_thumbnail jsonb;

alter table public.fortnite_island_snapshots
  add column if not exists snapshot_date date not null default current_date,
  add column if not exists source_order integer,
  add column if not exists rank_source text;

create index if not exists ingest_runs_platform_date_idx
  on public.ingest_runs (platform, snapshot_date desc, started_at desc);

create index if not exists raw_source_responses_run_idx
  on public.raw_source_responses (ingest_run_id);

create index if not exists raw_source_responses_platform_date_idx
  on public.raw_source_responses (platform, created_at desc);

create index if not exists data_integrity_snapshots_date_idx
  on public.data_integrity_snapshots (snapshot_date desc, created_at desc);

create index if not exists roblox_chart_snapshots_date_sort_idx
  on public.roblox_chart_snapshots (snapshot_date, sort_id, chart_rank);

create index if not exists fortnite_island_snapshots_date_source_idx
  on public.fortnite_island_snapshots (snapshot_date, source_name);

alter table public.ingest_runs enable row level security;
alter table public.raw_source_responses enable row level security;
alter table public.data_integrity_snapshots enable row level security;
