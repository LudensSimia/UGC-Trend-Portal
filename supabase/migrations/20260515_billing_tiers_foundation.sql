create extension if not exists pgcrypto;

alter table public.profiles
  drop constraint if exists profiles_subscription_tier_check;

alter table public.profiles
  add constraint profiles_subscription_tier_check check (
    subscription_tier in ('free', 'newsletter', 'trial', 'scout', 'paid', 'pro', 'admin')
  );

alter table public.profiles
  add column if not exists current_plan_key text,
  add column if not exists billing_period text check (
    billing_period is null or billing_period in ('free', 'monthly', 'project_3_month', 'annual')
  ),
  add column if not exists access_expires_at timestamptz,
  add column if not exists payment_provider text,
  add column if not exists provider_customer_id text,
  add column if not exists provider_subscription_id text,
  add column if not exists provider_price_id text;

update public.profiles
set subscription_tier = 'scout'
where subscription_tier = 'paid';

alter table public.widget_entitlements
  drop constraint if exists widget_entitlements_tier_check;

alter table public.widget_entitlements
  add constraint widget_entitlements_tier_check check (
    tier in ('free', 'newsletter', 'trial', 'scout', 'paid', 'pro', 'admin')
  );

alter table public.newsletter_subscribers
  drop constraint if exists newsletter_subscribers_tier_check;

alter table public.newsletter_subscribers
  add constraint newsletter_subscribers_tier_check check (
    tier in ('free', 'newsletter', 'trial', 'scout', 'paid', 'pro', 'admin')
  );

create table if not exists public.billing_plans (
  key text primary key,
  tier text not null check (tier in ('free', 'scout', 'pro')),
  name text not null,
  billing_period text not null check (
    billing_period in ('free', 'monthly', 'project_3_month', 'annual')
  ),
  price_cents integer not null default 0,
  currency text not null default 'usd',
  active boolean not null default true,
  provider text,
  provider_price_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  email text,
  plan_key text not null references public.billing_plans(key),
  tier text not null,
  billing_period text not null,
  provider text not null default 'stripe',
  provider_session_id text,
  provider_customer_id text,
  provider_subscription_id text,
  checkout_url text,
  status text not null default 'created' check (
    status in ('created', 'open', 'completed', 'expired', 'failed', 'canceled')
  ),
  amount_cents integer not null default 0,
  currency text not null default 'usd',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'stripe',
  provider_event_id text unique,
  event_type text not null,
  profile_id uuid references public.profiles(id) on delete set null,
  email text,
  plan_key text,
  tier text,
  billing_period text,
  provider_customer_id text,
  provider_subscription_id text,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

drop trigger if exists billing_plans_set_updated_at on public.billing_plans;
create trigger billing_plans_set_updated_at
before update on public.billing_plans
for each row execute function public.set_updated_at();

drop trigger if exists billing_checkout_sessions_set_updated_at on public.billing_checkout_sessions;
create trigger billing_checkout_sessions_set_updated_at
before update on public.billing_checkout_sessions
for each row execute function public.set_updated_at();

alter table public.billing_plans enable row level security;
alter table public.billing_checkout_sessions enable row level security;
alter table public.billing_events enable row level security;

create index if not exists billing_plans_tier_period_idx
  on public.billing_plans (tier, billing_period);

create index if not exists billing_checkout_sessions_profile_idx
  on public.billing_checkout_sessions (profile_id, created_at desc);

create index if not exists billing_events_provider_customer_idx
  on public.billing_events (provider, provider_customer_id, created_at desc);

insert into public.billing_plans
  (key, tier, name, billing_period, price_cents, currency, active)
values
  ('free', 'free', 'Free', 'free', 0, 'usd', true),
  ('scout_monthly', 'scout', 'Scout Monthly', 'monthly', 1900, 'usd', true),
  ('scout_project_3_month', 'scout', 'Scout 3-Month Project Pass', 'project_3_month', 4900, 'usd', true),
  ('scout_annual', 'scout', 'Scout Annual', 'annual', 19000, 'usd', true),
  ('pro_monthly', 'pro', 'Pro Monthly', 'monthly', 4900, 'usd', true),
  ('pro_project_3_month', 'pro', 'Pro 3-Month Project Pass', 'project_3_month', 12900, 'usd', true),
  ('pro_annual', 'pro', 'Pro Annual', 'annual', 49000, 'usd', true)
on conflict (key) do update set
  tier = excluded.tier,
  name = excluded.name,
  billing_period = excluded.billing_period,
  price_cents = excluded.price_cents,
  currency = excluded.currency,
  active = excluded.active;

insert into public.widget_entitlements (tier, widget_key)
select tier, widget_key
from (
  values
    ('free', 'data_source_health'),
    ('free', 'top_games'),
    ('free', 'top_genres'),
    ('newsletter', 'data_source_health'),
    ('newsletter', 'top_games'),
    ('newsletter', 'top_genres'),
    ('newsletter', 'trending_games'),
    ('newsletter', 'directional_research_maps'),
    ('scout', 'data_source_health'),
    ('scout', 'top_games'),
    ('scout', 'top_genres'),
    ('scout', 'trending_games'),
    ('scout', 'game_trends'),
    ('scout', 'genre_trends'),
    ('scout', 'keyword_cloud'),
    ('scout', 'common_structure'),
    ('scout', 'top_tile_colors'),
    ('scout', 'directional_research_maps'),
    ('scout', 'idea_card'),
    ('scout', 'research_signal_cards'),
    ('scout', 'player_activity_landscape'),
    ('scout', 'top_25_cards'),
    ('pro', 'forecasting_signal_inputs'),
    ('pro', 'historical_snapshots'),
    ('pro', 'exports')
) as defaults(tier, widget_key)
on conflict (tier, widget_key) do update set enabled = true;
