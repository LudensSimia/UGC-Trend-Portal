# Snoutboard - UGC Research Dashboard

Snoutboard is a Next.js + Supabase research dashboard for studying UGC market signals across Roblox and Fortnite/UEFN-style island metadata.

The current product direction is research-first:

- The dashboard is not positioned as paid access to platform data.
- The app processes stored snapshots into creator-facing research widgets.
- The podcast conductor is an internal tool for preparing a paid Patreon research episode.
- Public clips should be short excerpts from that paid episode, not a separate free full show.

Snoutboard is independent and is not affiliated with, endorsed by, sponsored by, certified by, approved by, or operated by Roblox, Epic Games, Fortnite, or any related platform owner.

Dashboard entry is protected by a required click-through disclaimer. A visitor
must click an acknowledgement button before entering. The acknowledgement
version and time are stored in that browser for continuity, while the gate is
shown again on a new page load. This is a clear product-boundary notice, not a
substitute for lawyer-reviewed Terms of Service or proof of a user's legal
identity.

The entry gate links to the Terms of Service only. The Glossary remains
available from the dashboard footer after entry.

## Current Stack

- Next.js 16 App Router
- React 19
- Supabase Postgres
- Recharts
- Vercel Analytics
- GitHub Actions scheduled ingestion
- Vercel deployment

## Local Development

Install dependencies:

```bash
npm install
```

Run the local server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

For mobile testing on the local network, `next.config.ts` currently allows:

```text
192.168.1.64
```

Adjust `allowedDevOrigins` if your local network IP changes.

## Environment Variables

Keep `.env.local` private. It is ignored by git through `.gitignore`.

Required for dashboard data:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Required for protected scheduled jobs:

- `CRON_SECRET`

Local-only internal tools:

- `NEXT_PUBLIC_ENABLE_INTERNAL_ADMIN=true`
- `DASHBOARD_DEV_TIER=admin`

Optional / legacy / future:

- `DASHBOARD_PASSWORD`
- `DASHBOARD_ADMIN_PASSWORD`
- `DASHBOARD_AUTH_SECRET`
- `MINECRAFT_MARKETPLACE_URL`
- `RESEND_API_KEY`
- `NEWSLETTER_FROM_EMAIL`
- `NEXT_PUBLIC_APP_URL` or `APP_BASE_URL`

Do not add local internal admin flags to Vercel unless you intentionally want internal tools visible in that environment.

## Useful Commands

```bash
npm run dev
npm run build
npx tsc --noEmit --incremental false --pretty false
npm run verify:dashboard
```

Generate a podcast conductor PDF from the local API:

```bash
/Users/loiclautredou/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/generate-podcast-conductor-pdf.py --output podcast-conductor-YYYY-MM-DD.pdf
```

The script expects the local app to be running at:

```text
http://localhost:3000/api/dashboard/data
```

The exported PDF includes the conductor notes first and the complete host
transcript at the bottom. Bracketed directions are production cues and should
not be read on-air.

## Scheduled Data Refresh

GitHub Actions runs `.github/workflows/refresh-metrics.yml` daily at `14:00 UTC` and can also be triggered manually.

The workflow calls:

- `/api/roblox/import-all-charts`
- `/api/fortnite/import-islands`
- `/api/audit/classification`
- `/api/audit/data-integrity`
- `/api/snapshots/dashboard`

Each call uses:

```text
Authorization: Bearer $CRON_SECRET
```

## Core Data Routes

Dashboard read:

- `/api/dashboard/data`

Roblox ingestion:

- `/api/roblox/import-all-charts`
- `/api/roblox/import-top-trending` legacy/smaller route

Fortnite ingestion:

- `/api/fortnite/import-islands`

Audit and snapshot:

- `/api/audit/classification`
- `/api/audit/data-integrity`
- `/api/audit/roblox-source-genre`
- `/api/snapshots/dashboard`

Newsletter draft infrastructure:

- `/api/newsletter/preview`
- `/api/newsletter/generate`
- `/api/newsletter/subscribe`
- `/api/newsletter/unsubscribe`

## Current Product Notes

Roblox is the stronger player-activity dataset because the app stores current-player snapshots and related engagement fields when available.

Fortnite should be described as metadata, label, IP/collaboration, source-visibility, and estimated-format research. The current source should not be described as a popularity ranking unless the source provides a reliable ranking metric for the specific widget.

Admin controls are local-only and currently intended for:

- Turning widgets/options on or off.
- Editing dashboard copy while testing.
- Opening a print-ready, data-free review of the disclaimer, Terms, glossary
  definitions, recurring usage notices, and footer language for legal review.
- Setting social and Data Strategy Session URLs.
- Generating the private podcast conductor, including a complete host
  transcript targeted to a 12-15 minute spoken episode.

The public dashboard should not expose admin tools.

The disclaimer copy can be edited from the local Admin Access panel. Material
changes should also increment `DISCLAIMER_VERSION` in `src/app/page.tsx` so the
stored acknowledgement identifies the wording generation presented.
The Admin Access panel also controls disclaimer text alignment, paragraph
emphasis, and the optional local image shown in the acknowledgement gate.

## Documentation Map

- `Doc/UGC_Trend_Portal_Documentation.md`: main product and architecture documentation.
- `Doc/Data_Reliability_Audit_2026-05-13.md`: reliability foundation and current audit model.
- `Doc/Dashboard_Change_Guardrails.md`: engineering guardrails for UI/data changes.
- `Doc/UI_Copy_Proofing_Roblox_Fortnite.md`: current user-facing copy inventory.
- `Doc/Beta_Release_Data_Readiness.md`: release-readiness gates.
- `Doc/Cease_And_Desist_Response_Runbook.md`: response protocol for platform data-use challenges.
- `Doc/Access_Tiers_and_Newsletter_Foundation.md`: legacy access-tier foundation and current newsletter posture.
- `Doc/Payment_Integration_Foundation.md`: paused payment work and future consulting/Patreon posture.
- `Doc/Game_Maker_Randomizer_Project_Context.md`: separate no-platform-data project brief.

Historical snapshots live under `archive/` and should not be edited as living documentation.
