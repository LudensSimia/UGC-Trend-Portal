# Beta Release Data Readiness

## Practical Release Threshold

For an early paid/user beta, the dashboard should have at least 14 consecutive clean daily runs after the data reliability foundation is deployed.

Roblox can likely reach release confidence first because it already has usable player-count time series. Fortnite should be released with more careful language until official activity metrics are available; today it is strongest as a metadata, label, IP/collaboration, and source-visibility tracker.

## Suggested Confidence Gates

### Minimum Beta Gate

- 14 consecutive scheduled runs complete.
- `ingest_runs` shows no failed jobs.
- `raw_source_responses` has one or more archived raw payloads per source per day.
- Roblox chart snapshots have raw payload coverage above 95%.
- Fortnite snapshots have raw payload coverage above 95%.
- Duplicate snapshot groups are zero after cleanup.
- Dashboard copy clearly labels Fortnite as source visibility when activity metrics are absent.

### Stronger Paid Gate

- 30 consecutive scheduled runs complete.
- Data integrity audit is green for raw payload coverage, duplicate keys, row counts, and run completion.
- Roblox source taxonomy and heuristic fallback rates are shown transparently.
- Fortnite rank source is explicitly tracked as `explicit_rank` or `source_order_fallback`.
- Any data export or historical-date view reads from immutable snapshot tables, not mutable latest tables.

### Pro / Historical Gate

- 90 days of daily snapshots.
- Backfilled and deduplicated historical tables.
- Source-controlled schema fully recreates the database.
- Raw source response hashes are stored and can be matched to parsed rows.
- Dashboard snapshot summaries can be regenerated from raw/fact tables.

## When To Release

If the reliability foundation is deployed today and daily jobs run once per day, a cautious early beta could be ready after roughly two clean weeks. A more polished paid release should wait closer to 30 clean daily runs.

## Current Platform Judgment

### Roblox

Status: near beta-ready after reliability cleanup.

Roblox has meaningful historical player-count snapshots. The main issue was raw payload coverage in `roblox_chart_snapshots`, which is fixed going forward but not retroactive.

### Fortnite

Status: beta-ready only if framed as source visibility and metadata intelligence.

The current official endpoint does not appear to expose player activity metrics in the observed payloads. Until that changes, Fortnite widgets should avoid implying true popularity unless based on source-rank/source-order visibility.
