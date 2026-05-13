create extension if not exists pgcrypto;

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  title text,
  url text,
  genre text,
  subgenre text,
  thumbnail_url text,
  created_at timestamptz not null default now(),
  creator text,
  notes text,
  is_top_25 boolean,
  source text,
  chart_rank integer,
  roblox_universe_id text,
  roblox_place_id text,
  raw_top_trending jsonb,
  raw_game_details jsonb,
  thumbnail_dominant_color text,
  thumbnail_main_subject text,
  thumbnail_style_tags text[],
  description text,
  max_players integer,
  created_roblox_at timestamptz,
  updated_roblox_at timestamptz,
  core_loop text,
  session_type text,
  monetization_style text,
  multiplayer_type text,
  build_complexity text,
  inferred_genre text,
  inferred_subgenre text,
  extracted_tags text[],
  description_keywords text[],
  design_pattern text,
  audience_signal text,
  update_signal text
);

create table if not exists public.game_metrics (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references public.games(id) on delete cascade,
  date date not null default current_date,
  current_players integer not null default 0,
  visits bigint,
  likes bigint,
  favorites bigint,
  up_votes bigint,
  down_votes bigint,
  chart_rank integer,
  source text,
  like_ratio numeric,
  raw_metric_snapshot jsonb
);

create table if not exists public.roblox_chart_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null default current_date,
  sort_id text,
  sort_name text,
  chart_rank integer,
  universe_id text,
  root_place_id text,
  game_id uuid references public.games(id) on delete cascade,
  current_players integer not null default 0,
  up_votes bigint,
  down_votes bigint,
  like_ratio numeric,
  raw_chart_item jsonb,
  raw_game_details jsonb,
  raw_thumbnail jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.fortnite_islands (
  id uuid primary key default gen_random_uuid(),
  island_code text not null unique,
  title text,
  creator_name text,
  description text,
  url text,
  thumbnail_url text,
  content_type text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  raw_latest jsonb,
  inferred_genre text,
  inferred_subgenre text,
  core_loop text,
  session_type text,
  player_intent text,
  competition_level text,
  build_complexity text,
  extracted_tags text[],
  design_pattern text,
  audience_signal text
);

create table if not exists public.fortnite_island_snapshots (
  id uuid primary key default gen_random_uuid(),
  island_id uuid references public.fortnite_islands(id) on delete cascade,
  snapshot_date date not null default current_date,
  source_name text,
  rank integer,
  source_order integer,
  rank_source text,
  minutes_played bigint,
  minutes_per_player numeric,
  plays bigint,
  favorites bigint,
  recommends bigint,
  peak_ccu bigint,
  unique_players bigint,
  retention_d1 numeric,
  retention_d7 numeric,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists games_platform_idx
  on public.games (platform);

create unique index if not exists games_roblox_universe_id_idx
  on public.games (roblox_universe_id)
  where roblox_universe_id is not null;

create index if not exists game_metrics_game_id_date_idx
  on public.game_metrics (game_id, date desc);

create index if not exists roblox_chart_snapshots_game_date_idx
  on public.roblox_chart_snapshots (game_id, snapshot_date desc);

create index if not exists fortnite_islands_code_idx
  on public.fortnite_islands (island_code);

create index if not exists fortnite_island_snapshots_island_date_idx
  on public.fortnite_island_snapshots (island_id, snapshot_date desc);

alter table public.games enable row level security;
alter table public.game_metrics enable row level security;
alter table public.roblox_chart_snapshots enable row level security;
alter table public.fortnite_islands enable row level security;
alter table public.fortnite_island_snapshots enable row level security;
