# Access Tiers and Newsletter Foundation

This foundation keeps the current password-protected dashboard intact while adding the database and API layer needed for paid access, pro access, and newsletter generation.

## Access Tiers

- `newsletter`: email-only teaser digest. No dashboard access by default.
- `trial`: temporary dashboard access.
- `paid`: core dashboard widgets.
- `pro`: paid widgets plus historical snapshots, exports, and forecasting-oriented research inputs.
- `admin`: internal access and future admin tools.

Widget access is defined in code at `src/lib/entitlements.ts` and seeded into Supabase in `widget_entitlements`. The database table lets us override or inspect access later without guessing which widgets belong to which tier.

## Newsletter Flow

1. Run the dashboard snapshot job so the latest Roblox and Fortnite data is stored in `dashboard_snapshots`.
2. Generate a newsletter issue from the latest snapshots.
3. Optionally send that generated issue to active subscribers through Resend.

Preview endpoint:

```text
/api/newsletter/preview?edition=daily_creator_digest&secret=YOUR_CRON_SECRET
```

Generate and save an issue:

```text
/api/newsletter/generate?edition=daily_creator_digest&secret=YOUR_CRON_SECRET
```

Generate and send:

```text
/api/newsletter/generate?edition=daily_creator_digest&send=true&secret=YOUR_CRON_SECRET
```

## Required Environment Variables

- `CRON_SECRET`: protects the newsletter generation endpoints.
- `NEXT_PUBLIC_APP_URL` or `APP_BASE_URL`: used for dashboard links inside email blocks.
- `RESEND_API_KEY`: required only when sending email.
- `NEWSLETTER_FROM_EMAIL`: required only when sending email, for example `Snout Intel <digest@yourdomain.com>`.

## Database Tables

- `profiles`: future Supabase Auth user profile, role, and subscription tier.
- `widget_entitlements`: maps tiers to widget keys.
- `newsletter_subscribers`: email recipients and preferences.
- `newsletter_editions`: reusable newsletter templates by frequency and widget list.
- `newsletter_issues`: generated newsletter payloads, HTML, and text.
- `newsletter_deliveries`: per-recipient send status.

All new tables have Row-Level Security enabled. Direct public reads are not enabled; newsletter and subscription writes go through server routes using the Supabase service role.

## Safety Language

Newsletter output includes the same conservative positioning as the dashboard: informational market intelligence only, no professional advice, and no guaranteed creator outcome.
