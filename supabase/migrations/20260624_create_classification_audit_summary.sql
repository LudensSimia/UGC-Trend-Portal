create or replace function public.get_classification_audit_summary()
returns table (
  platform text,
  source_table text,
  total_records bigint,
  classified_records bigint,
  missing_genre_records bigint,
  missing_subgenre_records bigint,
  missing_core_loop_records bigint,
  missing_source_records bigint,
  classification_coverage_percent numeric,
  source_coverage_percent numeric,
  confidence_percent numeric,
  notes text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with audit_counts as (
    select
      'roblox'::text as platform,
      'games'::text as source_table,
      count(*) as total_records,
      count(*) filter (
        where nullif(btrim(game.title), '') is not null
          and nullif(btrim(game.inferred_genre), '') is not null
          and game.inferred_genre <> 'Other'
          and nullif(btrim(game.inferred_subgenre), '') is not null
          and game.inferred_subgenre <> 'General'
          and nullif(btrim(game.core_loop), '') is not null
          and game.core_loop <> 'Unknown'
      ) as classified_records,
      count(*) filter (
        where nullif(btrim(game.inferred_genre), '') is null
          or game.inferred_genre = 'Other'
      ) as missing_genre_records,
      count(*) filter (
        where nullif(btrim(game.inferred_subgenre), '') is null
          or game.inferred_subgenre = 'General'
      ) as missing_subgenre_records,
      count(*) filter (
        where nullif(btrim(game.core_loop), '') is null
          or game.core_loop = 'Unknown'
      ) as missing_core_loop_records,
      count(*) filter (
        where not exists (
          select 1
          from public.roblox_chart_snapshots snapshot
          where snapshot.game_id = game.id
        )
      ) as missing_source_records
    from public.games game
    where game.platform = 'roblox'

    union all

    select
      'fortnite'::text as platform,
      'fortnite_islands'::text as source_table,
      count(*) as total_records,
      count(*) filter (
        where nullif(btrim(island.title), '') is not null
          and nullif(btrim(island.inferred_genre), '') is not null
          and island.inferred_genre <> 'Other'
          and nullif(btrim(island.inferred_subgenre), '') is not null
          and island.inferred_subgenre <> 'General'
          and nullif(btrim(island.core_loop), '') is not null
          and island.core_loop <> 'Unknown'
      ) as classified_records,
      count(*) filter (
        where nullif(btrim(island.inferred_genre), '') is null
          or island.inferred_genre = 'Other'
      ) as missing_genre_records,
      count(*) filter (
        where nullif(btrim(island.inferred_subgenre), '') is null
          or island.inferred_subgenre = 'General'
      ) as missing_subgenre_records,
      count(*) filter (
        where nullif(btrim(island.core_loop), '') is null
          or island.core_loop = 'Unknown'
      ) as missing_core_loop_records,
      count(*) filter (
        where island.raw_latest is null
          and not exists (
            select 1
            from public.fortnite_island_snapshots snapshot
            where snapshot.island_id = island.id
          )
      ) as missing_source_records
    from public.fortnite_islands island
  ), scored as (
    select
      audit_counts.*,
      case
        when total_records = 0 then 0::numeric
        else round(classified_records::numeric / total_records * 100, 2)
      end as classification_coverage_percent,
      case
        when total_records = 0 then 0::numeric
        else round((total_records - missing_source_records)::numeric / total_records * 100, 2)
      end as source_coverage_percent
    from audit_counts
  )
  select
    scored.platform,
    scored.source_table,
    scored.total_records,
    scored.classified_records,
    scored.missing_genre_records,
    scored.missing_subgenre_records,
    scored.missing_core_loop_records,
    scored.missing_source_records,
    scored.classification_coverage_percent,
    scored.source_coverage_percent,
    round(
      scored.classification_coverage_percent * 0.8
        + scored.source_coverage_percent * 0.2
    ) as confidence_percent,
    'Automated confidence is a data-quality proxy, not manually verified classification accuracy.'::text as notes
  from scored
  order by case scored.platform when 'roblox' then 1 else 2 end;
$$;

revoke all on function public.get_classification_audit_summary() from public;
revoke all on function public.get_classification_audit_summary() from anon;
revoke all on function public.get_classification_audit_summary() from authenticated;
grant execute on function public.get_classification_audit_summary() to service_role;

comment on function public.get_classification_audit_summary() is
  'Calculates complete Roblox and Fortnite classification and source-coverage counts inside Postgres for the protected data-quality audit.';
