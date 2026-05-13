# Data Reliability Audit - May 13, 2026

## Executive Summary

The dashboard is good enough for an early beta UI, but the data layer is not yet archive-grade. Roblox has the stronger time-series coverage, but the dedicated chart snapshot table did not store raw source payloads before this audit. Fortnite preserves raw payloads, but historical ranks and activity metrics are mostly missing, so several widgets are relying on source-order fallbacks rather than explicit source metrics.

The most important next step is to formalize ingestion as an auditable data pipeline: every run needs a run id, source URL, request timestamp, response payload, row count, error count, and completeness status. The current `ingest_runs` table exists but has no rows and no source-controlled migration.

## Live Table Shape Observed

### Core Tables

- `games`: 488 rows
- `game_metrics`: 6,070 rows
- `roblox_chart_snapshots`: 11,909 rows
- `fortnite_islands`: 1,099 rows
- `fortnite_island_snapshots`: 1,500 rows
- `dashboard_snapshots`: 16 rows
- `data_quality_snapshots`: 28 rows
- `ingest_runs`: 0 rows

### Source-Control Gap

The repository migrations do not define the original base tables:

- `games`
- `game_metrics`
- `roblox_chart_snapshots`
- `fortnite_islands`
- `fortnite_island_snapshots`
- `ingest_runs`

This is a high-priority reliability issue. If the Supabase project had to be recreated, the current repo could not rebuild the real data model.

## Roblox Pipeline

### Current Flow

Primary route:

- `src/app/api/roblox/import-all-charts/route.ts`
- Fetches Roblox Discover sorts.
- Fetches sort content per sort.
- Enriches with Roblox game details, thumbnails, votes, and attempted page taxonomy.
- Upserts `games` by `roblox_universe_id`.
- Inserts rows into `roblox_chart_snapshots`.
- Inserts rows into `game_metrics`.

Legacy route:

- `src/app/api/roblox/import-top-trending/route.ts`
- Fetches only `top-trending`.
- Previously inserted only `game_metrics`, not `roblox_chart_snapshots`.
- This audit updated it so future calls also insert chart snapshots.

### Live Coverage

`roblox_chart_snapshots` by date:

- 2026-05-05: 4,314
- 2026-05-06: 2,543
- 2026-05-07: 1,025
- 2026-05-08: 509
- 2026-05-09: 510
- 2026-05-10: 504
- 2026-05-11: 498
- 2026-05-12: 1,503
- 2026-05-13: 503

`game_metrics` by date:

- 2026-05-05: 1
- 2026-05-06: 1,017
- 2026-05-07: 1,025
- 2026-05-08: 509
- 2026-05-09: 510
- 2026-05-10: 504
- 2026-05-11: 498
- 2026-05-12: 1,503
- 2026-05-13: 503

### Roblox Storage Findings

High severity:

- `roblox_chart_snapshots` had 11,909 rows with `raw_chart_item`, `raw_game_details`, and `raw_thumbnail` missing on every row.
- `roblox_chart_snapshots` had `universe_id` and `root_place_id` missing on every row.
- There are 1,996 duplicate exact chart rows by `snapshot_date + sort_id + chart_rank + game_id`.
- The legacy `import-top-trending` route created a different data shape from `import-all-charts`.

Medium severity:

- `game_metrics.visits` and `game_metrics.favorites` are missing for 5,650 of 6,070 rows.
- This looks like a source/enrichment coverage issue or a Roblox API availability issue. The raw metric payload is present for nearly all rows, so older rows can be re-audited but not always enriched.
- Engagement fields are split between `game_metrics` and `roblox_chart_snapshots`. The dashboard reads both, but the fact model should be clearer.

Fix applied during this audit:

- Future `roblox_chart_snapshots` rows now store:
  - explicit `snapshot_date`
  - `universe_id`
  - `root_place_id`
  - `up_votes`
  - `down_votes`
  - `like_ratio`
  - `raw_chart_item`
  - `raw_game_details`
  - `raw_thumbnail`
- The legacy `import-top-trending` route now inserts a matching `roblox_chart_snapshots` row.

## Fortnite Pipeline

### Current Flow

Route:

- `src/app/api/fortnite/import-islands/route.ts`
- Fetches `https://api.fortnite.com/ecosystem/v1/islands`.
- Upserts `fortnite_islands` by `island_code`.
- Inserts one `fortnite_island_snapshots` row per returned island.
- Stores `raw_payload` in every snapshot.

### Live Coverage

`fortnite_island_snapshots` by date:

- 2026-05-05: 300
- 2026-05-06: 500
- 2026-05-07: 200
- 2026-05-08: 100
- 2026-05-09: 100
- 2026-05-10: 100
- 2026-05-11: 100
- 2026-05-12: 100

Rank coverage:

- 1,400 of 1,500 rows have no rank.
- Only 2026-05-12 has rank populated for all 100 rows.

Metric coverage:

- `minutes_played`: 1,500 missing
- `plays`: 1,500 missing
- `unique_players`: 1,500 missing
- `peak_ccu`: 1,500 missing
- `raw_payload`: 0 missing

Sample raw payload keys:

- `category`
- `code`
- `createdIn`
- `creatorCode`
- `meta`
- `tags`
- `title`

### Fortnite Storage Findings

High severity:

- Current source payload does not expose official activity metrics in the observed data, despite the table having columns for them.
- Historical ranks are missing before 2026-05-12, even though rank can usually be represented as source order.
- There are 200 duplicate island-day snapshot keys by `snapshot_date + island_id`.
- The dashboard sometimes treats source order as rank, but this distinction is not explicit in storage.

Medium severity:

- `fortnite_islands.raw_latest` is useful for current metadata, but a long-term archive should rely on immutable snapshot rows, not latest mutable fields.
- `first_seen_at` and `last_seen_at` exist, but without source-run records it is hard to distinguish "not returned by source" from "ingestion did not run".
- The source endpoint appears to return changing pools of 100/200/300/500 records rather than a stable top list. That is fine, but the dashboard should label it as source visibility, not popularity, unless official activity metrics are present.

Fix applied during this audit:

- Future `fortnite_island_snapshots` rows now write explicit `snapshot_date`.

## Dashboard Processing Risks

High severity:

- Frontend sorting for Fortnite relies on a fallback hierarchy: official activity metric, favorites/recommends, rank, then title. Because official activity metrics are currently missing, many Fortnite displays are source-rank/source-order based.
- Roblox trend calculations sort by `created_at`, while user-facing historical logic usually talks about dates. Multiple runs on the same date can overweight a day unless views aggregate per date first.
- `dashboard_snapshots` are derived summaries, not source-of-truth archives. They should not be treated as archival data.

Medium severity:

- `data_quality_snapshots` currently audits classification coverage, not raw source coverage, duplicate snapshot detection, run completion, or metric completeness.
- The dashboard reads a narrow field subset. That is good for performance, but the backend archive must keep raw payloads independently.

## Required Reliability Standard

For confidence six months or two years later, every ingestion run should answer:

- Did the run start and finish?
- Which endpoint did it call?
- Which platform and source was captured?
- Which exact UTC timestamp and snapshot date were used?
- How many rows did the source return?
- How many rows were inserted?
- How many rows failed?
- Was the result complete, partial, or failed?
- What was the raw source response or a durable pointer to it?
- Which parser version transformed it?
- Which dashboard build consumed it?

## Recommended Data Model Changes

### 1. Source-controlled base schema

Create migrations for the current live base tables. This should happen before larger feature work.

### 2. Ingestion run ledger

Use `ingest_runs` for every automated job:

- `id`
- `platform`
- `source_name`
- `source_url`
- `started_at`
- `finished_at`
- `snapshot_date`
- `status`
- `http_status`
- `rows_returned`
- `rows_inserted`
- `rows_failed`
- `parser_version`
- `dashboard_build`
- `error_message`
- `raw_response_summary`

### 3. Immutable raw source archive

Add a table such as `raw_source_responses`:

- `id`
- `ingest_run_id`
- `platform`
- `source_name`
- `source_url`
- `response_started_at`
- `response_finished_at`
- `payload`
- `payload_sha256`
- `row_count`

This lets us prove what the API exposed, even if our parser changes later.

### 4. Snapshot uniqueness constraints

After deduplicating existing rows, add unique constraints:

- Roblox chart snapshot: `snapshot_date + sort_id + chart_rank + game_id`
- Roblox metric snapshot: `date + source + chart_rank + game_id`
- Fortnite island snapshot: `snapshot_date + island_id + source_name`

### 5. Rank source clarity

Fortnite should distinguish:

- `source_rank`: explicit rank from API, if present.
- `source_order`: row order in API response.
- `rank_source`: `explicit_rank` or `source_order_fallback`.

The current `rank` column can stay, but long-term auditability needs to know where it came from.

### 6. Archive-safe dashboard views

Create backend views or RPCs for:

- latest complete Roblox snapshot date
- latest complete Fortnite snapshot date
- per-date Roblox top games
- per-date Fortnite source-visible islands
- per-date genre/label summaries

The frontend should read these curated views instead of inferring completeness in client code.

## Immediate Remediation Sequence

1. Backfill Fortnite rank from source order for historical rows where `rank` is null.
2. Deduplicate `roblox_chart_snapshots`, `game_metrics`, and `fortnite_island_snapshots`.
3. Create source-controlled migrations for all live base tables.
4. Add non-null `snapshot_date` discipline to all future insert paths. Completed for the active import routes during this audit.
5. Add `ingest_runs` writes to `import-all-charts`, `import-islands`, `audit/classification`, and `snapshots/dashboard`.
6. Add a daily data integrity audit that checks row counts, duplicate counts, raw payload coverage, rank coverage, and metric coverage.
7. Update Fortnite UI labels to say "source visibility" unless official activity metrics are present.

## Bottom Line

Roblox is close to a usable historical product once raw chart snapshot payloads are captured going forward and duplicates are cleaned. Fortnite is useful as a metadata and source-visibility tracker today, but it is not yet a true popularity tracker because the current official endpoint is not exposing activity metrics in the observed payloads.

The archive-grade version of Snout should preserve raw API responses first, then derive dashboard facts second.
