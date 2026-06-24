create or replace function public.get_roblox_dashboard_core_rollups()
returns table (
  game_id uuid,
  game_metrics jsonb,
  roblox_chart_snapshots jsonb,
  roblox_rollups jsonb
)
language sql
stable
set search_path = public, pg_temp
as $$
  with latest_day as (
    select max(snapshot_date) as snapshot_date
    from public.roblox_chart_snapshots
    where game_id is not null
  ),
  daily as (
    select distinct on (snapshot.game_id, snapshot.snapshot_date)
      snapshot.game_id,
      snapshot.snapshot_date,
      snapshot.created_at,
      snapshot.current_players,
      snapshot.chart_rank,
      snapshot.sort_name
    from public.roblox_chart_snapshots snapshot
    cross join latest_day
    where snapshot.game_id is not null
      and snapshot.snapshot_date >= latest_day.snapshot_date - 30
    order by
      snapshot.game_id,
      snapshot.snapshot_date,
      snapshot.current_players desc,
      snapshot.created_at desc
  ),
  grouped as (
    select
      daily.game_id,
      latest_day.snapshot_date as as_of_date,
      jsonb_agg(
        jsonb_build_object(
          'snapshot_date', daily.snapshot_date,
          'created_at', daily.created_at,
          'current_players', daily.current_players,
          'chart_rank', daily.chart_rank,
          'sort_name', daily.sort_name
        ) order by daily.snapshot_date
      ) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 7
      ) as snapshots_8,
      array_agg(daily.snapshot_date order by daily.snapshot_date) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 6
      ) as dates_7,
      array_agg(daily.current_players order by daily.snapshot_date) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 6
      ) as players_7,
      array_agg(daily.chart_rank order by daily.snapshot_date) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 6
          and daily.chart_rank is not null
      ) as ranks_7,
      array_agg(daily.snapshot_date order by daily.snapshot_date) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 29
      ) as dates_30,
      array_agg(daily.current_players order by daily.snapshot_date) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 29
      ) as players_30,
      array_agg(daily.chart_rank order by daily.snapshot_date) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 29
          and daily.chart_rank is not null
      ) as ranks_30,
      min(daily.chart_rank) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 29
      ) as best_rank_30,
      (
        array_agg(daily.sort_name order by daily.chart_rank, daily.snapshot_date desc)
          filter (
            where daily.snapshot_date >= latest_day.snapshot_date - 29
              and daily.chart_rank is not null
          )
      )[1] as best_rank_sort_30,
      (
        array_agg(daily.chart_rank order by daily.snapshot_date desc)
          filter (where daily.chart_rank is not null)
      )[1] as latest_rank,
      (
        array_agg(daily.sort_name order by daily.snapshot_date desc)
          filter (where daily.chart_rank is not null)
      )[1] as latest_sort
    from daily
    cross join latest_day
    group by daily.game_id, latest_day.snapshot_date
  ),
  latest_metric as (
    select distinct on (metric.game_id)
      metric.game_id,
      jsonb_build_object(
        'date', metric.date,
        'current_players', metric.current_players,
        'visits', metric.visits,
        'favorites', metric.favorites,
        'up_votes', metric.up_votes,
        'down_votes', metric.down_votes,
        'like_ratio', metric.like_ratio
      ) as payload
    from public.game_metrics metric
    where metric.game_id is not null
    order by
      metric.game_id,
      (
        metric.visits is not null
        or metric.favorites is not null
        or metric.up_votes is not null
        or metric.like_ratio is not null
      ) desc,
      metric.date desc
  )
  select
    grouped.game_id,
    case
      when latest_metric.payload is null then '[]'::jsonb
      else jsonb_build_array(latest_metric.payload)
    end as game_metrics,
    coalesce(grouped.snapshots_8, '[]'::jsonb) as roblox_chart_snapshots,
    jsonb_build_object(
      'as_of_date', grouped.as_of_date,
      'latest', jsonb_build_object(
        'date', grouped.as_of_date,
        'current_players', grouped.players_30[cardinality(grouped.players_30)],
        'chart_rank', grouped.latest_rank,
        'sort_name', grouped.latest_sort
      ),
      'day_7', jsonb_build_object(
        'first_date', grouped.dates_7[1],
        'last_date', grouped.dates_7[cardinality(grouped.dates_7)],
        'sample_count', cardinality(grouped.players_7),
        'start_players', grouped.players_7[1],
        'end_players', grouped.players_7[cardinality(grouped.players_7)],
        'average_players', round(
          (select avg(value) from unnest(grouped.players_7) as value)
        ),
        'minimum_players', (select min(value) from unnest(grouped.players_7) as value),
        'maximum_players', (select max(value) from unnest(grouped.players_7) as value),
        'player_change',
          grouped.players_7[cardinality(grouped.players_7)] - grouped.players_7[1],
        'player_change_percent', case
          when coalesce(grouped.players_7[1], 0) = 0 then 0
          else (
            grouped.players_7[cardinality(grouped.players_7)] - grouped.players_7[1]
          )::numeric / grouped.players_7[1] * 100
        end,
        'average_daily_change', round(
          (
            grouped.players_7[cardinality(grouped.players_7)] - grouped.players_7[1]
          )::numeric / greatest(
            1,
            grouped.dates_7[cardinality(grouped.dates_7)] - grouped.dates_7[1]
          )
        ),
        'start_rank', grouped.ranks_7[1],
        'end_rank', grouped.ranks_7[cardinality(grouped.ranks_7)],
        'rank_change', coalesce(grouped.ranks_7[1], 0) - coalesce(
          grouped.ranks_7[cardinality(grouped.ranks_7)],
          0
        )
      ),
      'day_30', jsonb_build_object(
        'first_date', grouped.dates_30[1],
        'last_date', grouped.dates_30[cardinality(grouped.dates_30)],
        'sample_count', cardinality(grouped.players_30),
        'start_players', grouped.players_30[1],
        'end_players', grouped.players_30[cardinality(grouped.players_30)],
        'average_players', round(
          (select avg(value) from unnest(grouped.players_30) as value)
        ),
        'minimum_players', (select min(value) from unnest(grouped.players_30) as value),
        'maximum_players', (select max(value) from unnest(grouped.players_30) as value),
        'player_change',
          grouped.players_30[cardinality(grouped.players_30)] - grouped.players_30[1],
        'player_change_percent', case
          when coalesce(grouped.players_30[1], 0) = 0 then 0
          else (
            grouped.players_30[cardinality(grouped.players_30)] - grouped.players_30[1]
          )::numeric / grouped.players_30[1] * 100
        end,
        'best_rank', grouped.best_rank_30,
        'best_rank_sort', grouped.best_rank_sort_30
      )
    ) as roblox_rollups
  from grouped
  left join latest_metric on latest_metric.game_id = grouped.game_id;
$$;

revoke all on function public.get_roblox_dashboard_core_rollups() from public;
revoke all on function public.get_roblox_dashboard_core_rollups() from anon;
revoke all on function public.get_roblox_dashboard_core_rollups() from authenticated;
grant execute on function public.get_roblox_dashboard_core_rollups() to service_role;

comment on function public.get_roblox_dashboard_core_rollups() is
  'Returns one compact Roblox dashboard record per game using daily snapshots and rolling 7-day and 30-day summaries. Raw source tables remain unchanged.';
