create table if not exists public.dashboard_public_payloads (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('roblox', 'fortnite')),
  scope text not null check (scope in ('core', 'full')),
  generated_at timestamptz not null default now(),
  source_snapshot_date date not null default current_date,
  payload jsonb not null,
  payload_bytes bigint not null default 0,
  payload_sha256 text,
  unique (platform, scope)
);

create index if not exists dashboard_public_payloads_generated_at_idx
  on public.dashboard_public_payloads (generated_at desc);

alter table public.dashboard_public_payloads enable row level security;

revoke all on table public.dashboard_public_payloads from anon, authenticated;
grant select, insert, update, delete on table public.dashboard_public_payloads to service_role;

comment on table public.dashboard_public_payloads is
  'Latest precomputed dashboard API payloads. Service-role access only; public delivery is handled by the CDN-cached dashboard route.';
