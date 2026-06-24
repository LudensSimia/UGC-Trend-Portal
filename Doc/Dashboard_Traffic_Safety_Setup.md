# Dashboard Traffic Safety Setup

This runbook separates protections implemented in the repository from controls that must be enabled in Vercel and Supabase before a public launch.

## Implemented in the application

- The dashboard makes no platform-data request before the visitor accepts the disclaimer and selects Roblox or Fortnite.
- The selected platform is loaded independently.
- Research-heavy widgets load on request.
- Roblox core history is reduced to one representative record per game per day.
- The Roblox overview uses a database rollup function. Raw snapshots remain
  unchanged, while the public core payload receives the latest eight daily
  points plus 7-day and 30-day summaries.
- Selecting Month or 3M on a Roblox over-time chart requests the longer
  93-day research payload only when needed.
- The Fortnite overview follows the same pattern: eight daily source snapshots
  plus 7-day and 30-day metadata rollups are returned initially. Month and 3M
  controls request longer history only when selected.
- Fortnite rollups retain source position as source metadata. They do not
  reinterpret source order as verified popularity or performance ranking.
- Public platform responses use Vercel shared-CDN cache headers for five minutes, with a stale response available during revalidation.
- Daily refreshes generate persistent `core` and `full` payloads for Roblox and Fortnite.
- Public requests read the precomputed payload first and fall back to live Supabase queries if no payload exists.
- Fresh payload generation requires `CRON_SECRET` and is never publicly cached.
- Unknown query parameters and values are rejected to prevent cache-key flooding.

## Required Supabase step

Run this migration in the Supabase SQL editor before deploying the precompute endpoint:

`supabase/migrations/20260622_create_dashboard_public_payloads.sql`

Then run the Roblox rollup migration:

`supabase/migrations/20260623_create_roblox_dashboard_core_rollups.sql`

Then run the Fortnite rollup migration:

`supabase/migrations/20260624_create_fortnite_dashboard_core_rollups.sql`

The rollup functions can only be executed by `service_role`. They calculate the
dashboard summaries inside PostgreSQL so Next.js does not need to page through
all raw metric and chart rows. If either migration is missing, the application
temporarily falls back to the slower raw-row calculation and logs a warning.

The table has RLS enabled, grants no access to `anon` or `authenticated`, and is available only to the server-side service role.

After deployment, run the **Refresh Platform Metrics** GitHub Action once. Its final step should report four generated payloads:

- Roblox core
- Roblox full
- Fortnite core
- Fortnite full

Verify storage with:

```sql
select
  platform,
  scope,
  generated_at,
  payload_bytes,
  payload_sha256
from public.dashboard_public_payloads
order by platform, scope;
```

## Required Vercel spend controls

Complete this before promoting the public URL:

1. Open the Vercel team dashboard.
2. Go to **Settings > Billing > Spend Management**.
3. Enable Spend Management.
4. Start with a $50 monthly metered-usage threshold while the dashboard is in beta.
5. Enable web and email notifications at 50%, 75%, and 100%.
6. Enable **Pause production deployment** at 100%.
7. Add SMS notification at 100% if available on the account.

Pausing produces a 503 response until the project is manually resumed. Increase the threshold only after reviewing real traffic and cache-hit data.

## Required Vercel firewall controls

Create this rule in **Project > Firewall > Configure > New Rule**:

- Name: `Dashboard data API rate limit`
- If: Request Path equals `/api/dashboard/data`
- Then: Rate Limit
- Strategy: Fixed Window
- Window: 10 minutes
- Limit: 60 requests
- Key: IP
- Initial action: Log

Observe the rule for at least 24 hours. If normal visitors stay comfortably below the limit, change the action to **Deny (429)**.

Also enable **Bot Protection** in log mode first. Move it to Challenge after confirming that GitHub Actions and legitimate monitoring are unaffected. The protected refresh and precompute endpoints should continue using `CRON_SECRET`.

## Required Supabase cost control

1. Open the Supabase organization billing settings.
2. Confirm the Pro-plan spend cap remains enabled.
3. Add usage notifications for database egress, database size, and compute.
4. Review **Database Egress** after the first public week.

The precomputed payload and Vercel CDN should make Supabase egress depend mainly on cache refreshes rather than visitor count.

## Launch verification

- Initial page visit makes no `/api/dashboard/data` request.
- Selecting one platform does not fetch the other platform.
- The first response contains `precomputed: true` after the daily payload job has run.
- Vercel response headers show a CDN cache hit on repeated public requests.
- The firewall rule appears in Vercel's traffic view.
- Spend Management shows notifications and automatic project pausing enabled.
- Supabase Security Advisor confirms RLS on `dashboard_public_payloads`.

Do not treat the traffic-cost risk as closed until every launch-verification item passes in production.
