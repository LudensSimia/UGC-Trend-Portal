create or replace function public.get_fortnite_dashboard_core_rollups()
returns table (
  island_id uuid,
  fortnite_island_snapshots jsonb,
  fortnite_rollups jsonb
)
language sql
stable
set search_path = public, pg_temp
as $$
  with latest_day as (
    select max(snapshot_date) as snapshot_date
    from public.fortnite_island_snapshots
    where island_id is not null
  ),
  daily as (
    select distinct on (snapshot.island_id, snapshot.snapshot_date)
      snapshot.island_id,
      snapshot.snapshot_date,
      snapshot.created_at,
      snapshot.rank,
      snapshot.source_order,
      snapshot.rank_source,
      snapshot.minutes_played,
      snapshot.minutes_per_player,
      snapshot.plays,
      snapshot.favorites,
      snapshot.recommends,
      snapshot.peak_ccu,
      snapshot.unique_players,
      snapshot.retention_d1,
      snapshot.retention_d7
    from public.fortnite_island_snapshots snapshot
    cross join latest_day
    where snapshot.island_id is not null
      and snapshot.snapshot_date >= latest_day.snapshot_date - 30
    order by
      snapshot.island_id,
      snapshot.snapshot_date,
      snapshot.source_order asc nulls last,
      snapshot.created_at desc
  ),
  grouped as (
    select
      daily.island_id,
      latest_day.snapshot_date as as_of_date,
      jsonb_agg(
        jsonb_build_object(
          'snapshot_date', daily.snapshot_date,
          'created_at', daily.created_at,
          'rank', daily.rank,
          'source_order', daily.source_order,
          'rank_source', daily.rank_source,
          'minutes_played', daily.minutes_played,
          'minutes_per_player', daily.minutes_per_player,
          'plays', daily.plays,
          'favorites', daily.favorites,
          'recommends', daily.recommends,
          'peak_ccu', daily.peak_ccu,
          'unique_players', daily.unique_players,
          'retention_d1', daily.retention_d1,
          'retention_d7', daily.retention_d7
        ) order by daily.snapshot_date
      ) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 7
      ) as snapshots_8,
      min(daily.snapshot_date) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 6
      ) as first_date_7,
      max(daily.snapshot_date) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 6
      ) as last_date_7,
      count(*) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 6
      ) as sample_count_7,
      min(daily.source_order) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 6
      ) as best_source_order_7,
      avg(daily.peak_ccu) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 6
      ) as average_peak_ccu_7,
      max(daily.peak_ccu) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 6
      ) as maximum_peak_ccu_7,
      avg(daily.plays) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 6
      ) as average_plays_7,
      max(daily.plays) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 6
      ) as maximum_plays_7,
      avg(daily.unique_players) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 6
      ) as average_unique_players_7,
      max(daily.unique_players) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 6
      ) as maximum_unique_players_7,
      avg(daily.minutes_played) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 6
      ) as average_minutes_played_7,
      max(daily.minutes_played) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 6
      ) as maximum_minutes_played_7,
      min(daily.snapshot_date) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 29
      ) as first_date_30,
      max(daily.snapshot_date) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 29
      ) as last_date_30,
      count(*) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 29
      ) as sample_count_30,
      min(daily.source_order) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 29
      ) as best_source_order_30,
      avg(daily.peak_ccu) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 29
      ) as average_peak_ccu_30,
      max(daily.peak_ccu) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 29
      ) as maximum_peak_ccu_30,
      avg(daily.plays) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 29
      ) as average_plays_30,
      max(daily.plays) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 29
      ) as maximum_plays_30,
      avg(daily.unique_players) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 29
      ) as average_unique_players_30,
      max(daily.unique_players) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 29
      ) as maximum_unique_players_30,
      avg(daily.minutes_played) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 29
      ) as average_minutes_played_30,
      max(daily.minutes_played) filter (
        where daily.snapshot_date >= latest_day.snapshot_date - 29
      ) as maximum_minutes_played_30,
      (array_agg(daily.created_at order by daily.snapshot_date desc, daily.created_at desc))[1]
        as latest_created_at,
      (array_agg(daily.rank order by daily.snapshot_date desc, daily.created_at desc)
        filter (where daily.rank is not null))[1] as latest_rank,
      (array_agg(daily.source_order order by daily.snapshot_date desc, daily.created_at desc)
        filter (where daily.source_order is not null))[1] as latest_source_order,
      (array_agg(daily.rank_source order by daily.snapshot_date desc, daily.created_at desc)
        filter (where daily.rank_source is not null))[1] as latest_rank_source,
      (array_agg(daily.minutes_played order by daily.snapshot_date desc, daily.created_at desc)
        filter (where daily.minutes_played is not null))[1] as latest_minutes_played,
      (array_agg(daily.minutes_per_player order by daily.snapshot_date desc, daily.created_at desc)
        filter (where daily.minutes_per_player is not null))[1] as latest_minutes_per_player,
      (array_agg(daily.plays order by daily.snapshot_date desc, daily.created_at desc)
        filter (where daily.plays is not null))[1] as latest_plays,
      (array_agg(daily.favorites order by daily.snapshot_date desc, daily.created_at desc)
        filter (where daily.favorites is not null))[1] as latest_favorites,
      (array_agg(daily.recommends order by daily.snapshot_date desc, daily.created_at desc)
        filter (where daily.recommends is not null))[1] as latest_recommends,
      (array_agg(daily.peak_ccu order by daily.snapshot_date desc, daily.created_at desc)
        filter (where daily.peak_ccu is not null))[1] as latest_peak_ccu,
      (array_agg(daily.unique_players order by daily.snapshot_date desc, daily.created_at desc)
        filter (where daily.unique_players is not null))[1] as latest_unique_players,
      (array_agg(daily.retention_d1 order by daily.snapshot_date desc, daily.created_at desc)
        filter (where daily.retention_d1 is not null))[1] as latest_retention_d1,
      (array_agg(daily.retention_d7 order by daily.snapshot_date desc, daily.created_at desc)
        filter (where daily.retention_d7 is not null))[1] as latest_retention_d7
    from daily
    cross join latest_day
    group by daily.island_id, latest_day.snapshot_date
  )
  select
    grouped.island_id,
    coalesce(grouped.snapshots_8, '[]'::jsonb) as fortnite_island_snapshots,
    jsonb_build_object(
      'as_of_date', grouped.as_of_date,
      'latest', jsonb_build_object(
        'snapshot_date', grouped.as_of_date,
        'created_at', grouped.latest_created_at,
        'rank', grouped.latest_rank,
        'source_order', grouped.latest_source_order,
        'rank_source', grouped.latest_rank_source,
        'minutes_played', grouped.latest_minutes_played,
        'minutes_per_player', grouped.latest_minutes_per_player,
        'plays', grouped.latest_plays,
        'favorites', grouped.latest_favorites,
        'recommends', grouped.latest_recommends,
        'peak_ccu', grouped.latest_peak_ccu,
        'unique_players', grouped.latest_unique_players,
        'retention_d1', grouped.latest_retention_d1,
        'retention_d7', grouped.latest_retention_d7
      ),
      'day_7', jsonb_build_object(
        'first_date', grouped.first_date_7,
        'last_date', grouped.last_date_7,
        'sample_count', grouped.sample_count_7,
        'best_source_order', grouped.best_source_order_7,
        'average_peak_ccu', round(grouped.average_peak_ccu_7),
        'maximum_peak_ccu', grouped.maximum_peak_ccu_7,
        'average_plays', round(grouped.average_plays_7),
        'maximum_plays', grouped.maximum_plays_7,
        'average_unique_players', round(grouped.average_unique_players_7),
        'maximum_unique_players', grouped.maximum_unique_players_7,
        'average_minutes_played', round(grouped.average_minutes_played_7),
        'maximum_minutes_played', grouped.maximum_minutes_played_7
      ),
      'day_30', jsonb_build_object(
        'first_date', grouped.first_date_30,
        'last_date', grouped.last_date_30,
        'sample_count', grouped.sample_count_30,
        'best_source_order', grouped.best_source_order_30,
        'average_peak_ccu', round(grouped.average_peak_ccu_30),
        'maximum_peak_ccu', grouped.maximum_peak_ccu_30,
        'average_plays', round(grouped.average_plays_30),
        'maximum_plays', grouped.maximum_plays_30,
        'average_unique_players', round(grouped.average_unique_players_30),
        'maximum_unique_players', grouped.maximum_unique_players_30,
        'average_minutes_played', round(grouped.average_minutes_played_30),
        'maximum_minutes_played', grouped.maximum_minutes_played_30
      )
    ) as fortnite_rollups
  from grouped;
$$;

revoke all on function public.get_fortnite_dashboard_core_rollups() from public;
revoke all on function public.get_fortnite_dashboard_core_rollups() from anon;
revoke all on function public.get_fortnite_dashboard_core_rollups() from authenticated;
grant execute on function public.get_fortnite_dashboard_core_rollups() to service_role;

comment on function public.get_fortnite_dashboard_core_rollups() is
  'Returns compact Fortnite island metadata, eight daily source snapshots, and rolling 7-day and 30-day summaries. It does not assert that source order represents popularity.';
