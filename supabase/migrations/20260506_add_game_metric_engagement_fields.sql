alter table public.game_metrics
  add column if not exists visits bigint,
  add column if not exists favorites bigint,
  add column if not exists up_votes bigint,
  add column if not exists down_votes bigint,
  add column if not exists like_ratio numeric,
  add column if not exists raw_metric_snapshot jsonb;

create index if not exists game_metrics_game_id_date_idx
  on public.game_metrics (game_id, date desc);

create index if not exists game_metrics_source_date_idx
  on public.game_metrics (source, date desc);
