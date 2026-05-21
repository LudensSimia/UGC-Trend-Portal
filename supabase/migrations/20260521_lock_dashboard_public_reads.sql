-- Keep dashboard data behind server-side API routes.
-- The app now reads these tables with the service-role client after checking
-- the authenticated dashboard tier, so anon/public read policies are no longer
-- needed for the dashboard.

alter table if exists public.games enable row level security;
alter table if exists public.game_metrics enable row level security;
alter table if exists public.roblox_chart_snapshots enable row level security;
alter table if exists public.fortnite_islands enable row level security;
alter table if exists public.fortnite_island_snapshots enable row level security;
alter table if exists public.minecraft_marketplace_items enable row level security;
alter table if exists public.minecraft_marketplace_snapshots enable row level security;
alter table if exists public.dashboard_snapshots enable row level security;
alter table if exists public.data_quality_snapshots enable row level security;
alter table if exists public.ingest_runs enable row level security;
alter table if exists public.raw_source_responses enable row level security;
alter table if exists public.data_integrity_snapshots enable row level security;

drop policy if exists "Public read games" on public.games;
drop policy if exists "Public read game metrics" on public.game_metrics;
drop policy if exists "Public read roblox chart snapshots" on public.roblox_chart_snapshots;
drop policy if exists "Public read fortnite islands" on public.fortnite_islands;
drop policy if exists "Public read fortnite island snapshots" on public.fortnite_island_snapshots;
drop policy if exists "Public read minecraft marketplace items" on public.minecraft_marketplace_items;
drop policy if exists "Public read minecraft marketplace snapshots" on public.minecraft_marketplace_snapshots;
drop policy if exists "Allow public read access to dashboard snapshots" on public.dashboard_snapshots;
drop policy if exists "Allow public read access to data quality snapshots" on public.data_quality_snapshots;
