create table if not exists public.data_quality_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  platform text not null,
  source_table text not null,
  total_records integer not null default 0,
  classified_records integer not null default 0,
  missing_genre_records integer not null default 0,
  missing_subgenre_records integer not null default 0,
  missing_core_loop_records integer not null default 0,
  missing_source_records integer not null default 0,
  classification_coverage_percent numeric(5,2) not null default 0,
  source_coverage_percent numeric(5,2) not null default 0,
  confidence_percent numeric(5,2) not null default 0,
  notes text
);

alter table public.data_quality_snapshots enable row level security;

create policy "Allow public read access to data quality snapshots"
  on public.data_quality_snapshots
  for select
  to anon
  using (true);

create index if not exists data_quality_snapshots_platform_created_at_idx
  on public.data_quality_snapshots (platform, created_at desc);
