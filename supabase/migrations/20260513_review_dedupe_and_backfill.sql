/*
  REVIEW BEFORE RUNNING.

  This file intentionally does not execute destructive cleanup automatically.
  Use it as a Supabase SQL editor checklist after exporting/backing up tables.
*/

-- 1. Inspect duplicate Roblox chart snapshot groups.
select
  snapshot_date,
  sort_id,
  chart_rank,
  game_id,
  count(*) as duplicate_count
from public.roblox_chart_snapshots
group by snapshot_date, sort_id, chart_rank, game_id
having count(*) > 1
order by snapshot_date desc, duplicate_count desc;

-- 2. Inspect duplicate Roblox metric groups.
select
  date,
  source,
  chart_rank,
  game_id,
  count(*) as duplicate_count
from public.game_metrics
group by date, source, chart_rank, game_id
having count(*) > 1
order by date desc, duplicate_count desc;

-- 3. Inspect duplicate Fortnite island snapshot groups.
select
  snapshot_date,
  source_name,
  island_id,
  count(*) as duplicate_count
from public.fortnite_island_snapshots
group by snapshot_date, source_name, island_id
having count(*) > 1
order by snapshot_date desc, duplicate_count desc;

-- 4. Backfill Fortnite source order into source_order/rank/rank_source.
-- This keeps one deterministic order per source/date based on insertion time.
with ordered as (
  select
    id,
    row_number() over (
      partition by snapshot_date, source_name
      order by created_at asc, id asc
    ) as computed_source_order
  from public.fortnite_island_snapshots
)
update public.fortnite_island_snapshots s
set
  source_order = ordered.computed_source_order,
  rank = coalesce(s.rank, ordered.computed_source_order),
  rank_source = case
    when s.rank is null then 'source_order_fallback'
    else coalesce(s.rank_source, 'explicit_rank')
  end
from ordered
where s.id = ordered.id;

-- 5. After reviewing duplicates, keep the oldest row per exact key.
-- Uncomment only after backup.
/*
delete from public.roblox_chart_snapshots s
using public.roblox_chart_snapshots older
where s.snapshot_date = older.snapshot_date
  and s.sort_id is not distinct from older.sort_id
  and s.chart_rank is not distinct from older.chart_rank
  and s.game_id is not distinct from older.game_id
  and s.created_at > older.created_at;

delete from public.game_metrics s
using public.game_metrics older
where s.date = older.date
  and s.source is not distinct from older.source
  and s.chart_rank is not distinct from older.chart_rank
  and s.game_id is not distinct from older.game_id
  and s.id > older.id;

delete from public.fortnite_island_snapshots s
using public.fortnite_island_snapshots older
where s.snapshot_date = older.snapshot_date
  and s.source_name is not distinct from older.source_name
  and s.island_id is not distinct from older.island_id
  and s.created_at > older.created_at;
*/

-- 6. Add uniqueness after duplicate cleanup.
-- Uncomment only after duplicate checks return zero rows.
/*
create unique index if not exists roblox_chart_snapshots_unique_fact_idx
  on public.roblox_chart_snapshots (snapshot_date, sort_id, chart_rank, game_id);

create unique index if not exists game_metrics_unique_fact_idx
  on public.game_metrics (date, source, chart_rank, game_id);

create unique index if not exists fortnite_island_snapshots_unique_fact_idx
  on public.fortnite_island_snapshots (snapshot_date, source_name, island_id);
*/
