alter table public.dashboard_public_payloads
  drop constraint if exists dashboard_public_payloads_platform_check;

alter table public.dashboard_public_payloads
  add constraint dashboard_public_payloads_platform_check
  check (platform in ('roblox', 'fortnite', 'mobile'));

comment on table public.dashboard_public_payloads is
  'Latest precomputed dashboard and mobile public payloads. Service-role access only; public delivery is handled by CDN-cached app routes.';
