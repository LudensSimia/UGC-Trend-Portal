create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('user', 'admin')),
  subscription_tier text not null default 'newsletter' check (
    subscription_tier in ('newsletter', 'trial', 'paid', 'pro', 'admin')
  ),
  subscription_status text not null default 'none' check (
    subscription_status in ('none', 'trialing', 'active', 'past_due', 'canceled', 'unpaid')
  ),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.widget_entitlements (
  id uuid primary key default gen_random_uuid(),
  tier text not null check (tier in ('newsletter', 'trial', 'paid', 'pro', 'admin')),
  widget_key text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tier, widget_key)
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status text not null default 'active' check (status in ('active', 'unsubscribed', 'bounced')),
  frequency text not null default 'daily' check (frequency in ('daily', 'weekly')),
  interests text[] not null default array['roblox', 'fortnite'],
  tier text not null default 'newsletter' check (tier in ('newsletter', 'trial', 'paid', 'pro', 'admin')),
  unsubscribe_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create table if not exists public.newsletter_editions (
  key text primary key,
  name text not null,
  frequency text not null check (frequency in ('daily', 'weekly')),
  widget_keys text[] not null,
  platforms text[] not null default array['roblox', 'fortnite'],
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.newsletter_issues (
  id uuid primary key default gen_random_uuid(),
  edition_key text not null references public.newsletter_editions(key),
  subject text not null,
  preview_text text,
  platforms text[] not null,
  widget_keys text[] not null,
  payload jsonb not null,
  html text not null,
  text text not null,
  status text not null default 'generated' check (
    status in ('draft', 'generated', 'sending', 'sent', 'failed')
  ),
  generated_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_deliveries (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.newsletter_issues(id) on delete cascade,
  subscriber_id uuid references public.newsletter_subscribers(id) on delete set null,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  provider text,
  provider_message_id text,
  error text,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.widget_entitlements enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.newsletter_editions enable row level security;
alter table public.newsletter_issues enable row level security;
alter table public.newsletter_deliveries enable row level security;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists widget_entitlements_set_updated_at on public.widget_entitlements;
create trigger widget_entitlements_set_updated_at
before update on public.widget_entitlements
for each row execute function public.set_updated_at();

drop trigger if exists newsletter_subscribers_set_updated_at on public.newsletter_subscribers;
create trigger newsletter_subscribers_set_updated_at
before update on public.newsletter_subscribers
for each row execute function public.set_updated_at();

drop trigger if exists newsletter_editions_set_updated_at on public.newsletter_editions;
create trigger newsletter_editions_set_updated_at
before update on public.newsletter_editions
for each row execute function public.set_updated_at();

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Authenticated users can read widget entitlements" on public.widget_entitlements;
create policy "Authenticated users can read widget entitlements"
on public.widget_entitlements
for select
to authenticated
using (true);

create index if not exists profiles_subscription_idx
  on public.profiles (subscription_tier, subscription_status);

create index if not exists newsletter_subscribers_status_frequency_idx
  on public.newsletter_subscribers (status, frequency);

create index if not exists newsletter_issues_edition_created_idx
  on public.newsletter_issues (edition_key, created_at desc);

create index if not exists newsletter_deliveries_issue_idx
  on public.newsletter_deliveries (issue_id);

insert into public.newsletter_editions (key, name, frequency, widget_keys, platforms)
values
  (
    'daily_creator_digest',
    'Daily Creator Digest',
    'daily',
    array[
      'data_source_health',
      'top_games',
      'top_genres',
      'trending_games',
      'directional_research_maps'
    ],
    array['roblox', 'fortnite']
  ),
  (
    'weekly_market_brief',
    'Weekly Market Brief',
    'weekly',
    array[
      'top_genres',
      'keyword_cloud',
      'directional_research_maps',
      'forecasting_signal_inputs'
    ],
    array['roblox', 'fortnite']
  )
on conflict (key) do update set
  name = excluded.name,
  frequency = excluded.frequency,
  widget_keys = excluded.widget_keys,
  platforms = excluded.platforms,
  is_active = true;

insert into public.widget_entitlements (tier, widget_key)
select tier, widget_key
from (
  values
    ('newsletter', 'data_source_health'),
    ('newsletter', 'top_games'),
    ('newsletter', 'top_genres'),
    ('newsletter', 'trending_games'),
    ('newsletter', 'directional_research_maps'),
    ('trial', 'data_source_health'),
    ('trial', 'top_games'),
    ('trial', 'top_genres'),
    ('trial', 'trending_games'),
    ('trial', 'game_trends'),
    ('trial', 'genre_trends'),
    ('trial', 'keyword_cloud'),
    ('trial', 'common_structure'),
    ('trial', 'top_tile_colors'),
    ('trial', 'directional_research_maps'),
    ('trial', 'idea_card'),
    ('trial', 'research_signal_cards'),
    ('trial', 'player_activity_landscape'),
    ('trial', 'top_25_cards'),
    ('paid', 'data_source_health'),
    ('paid', 'top_games'),
    ('paid', 'top_genres'),
    ('paid', 'trending_games'),
    ('paid', 'game_trends'),
    ('paid', 'genre_trends'),
    ('paid', 'keyword_cloud'),
    ('paid', 'common_structure'),
    ('paid', 'top_tile_colors'),
    ('paid', 'directional_research_maps'),
    ('paid', 'idea_card'),
    ('paid', 'research_signal_cards'),
    ('paid', 'player_activity_landscape'),
    ('paid', 'top_25_cards'),
    ('pro', 'data_source_health'),
    ('pro', 'top_games'),
    ('pro', 'top_genres'),
    ('pro', 'trending_games'),
    ('pro', 'game_trends'),
    ('pro', 'genre_trends'),
    ('pro', 'keyword_cloud'),
    ('pro', 'common_structure'),
    ('pro', 'top_tile_colors'),
    ('pro', 'directional_research_maps'),
    ('pro', 'idea_card'),
    ('pro', 'research_signal_cards'),
    ('pro', 'player_activity_landscape'),
    ('pro', 'top_25_cards'),
    ('pro', 'forecasting_signal_inputs'),
    ('pro', 'historical_snapshots'),
    ('pro', 'exports'),
    ('admin', 'admin_tools')
) as defaults(tier, widget_key)
on conflict (tier, widget_key) do update set enabled = true;
