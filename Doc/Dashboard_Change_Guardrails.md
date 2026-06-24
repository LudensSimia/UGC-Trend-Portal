# Dashboard Change Guardrails

Last updated: 2026-06-10

## Current Guardrail Summary

Current business boundary:

- Do not reintroduce paid dashboard access copy without explicit approval.
- The dashboard is a research portal and internal content engine.
- The paid product is the Patreon research episode.
- Public clips are short excerpts only.
- Admin tools are local-only.

Current required checks:

```bash
npx tsc --noEmit --incremental false --pretty false
npm run build
npm run verify:dashboard
```

If podcast output changes, regenerate and inspect the conductor PDF.

Current platform language rules:

- Roblox can use player activity when based on stored current-player snapshots.
- Fortnite should be framed as metadata, labels, IP/collaboration, source-visible collections, and estimated formats unless explicit activity metrics are returned.
- Use "captured," "stored snapshot," "estimated," "processed," "directional signal," and "research."
- Avoid unsupported "official," "partner," "certified," "approved," "guaranteed," "best performing," "most popular," and "ranked."

The older guardrails below are retained for history and restore-point context.

## Restore Point

Before splitting the platform dashboard paths, a local safety branch was created:

`safety-before-dashboard-split-20260507-112958`

Use it as the known-good restore point if a future dashboard edit drops major sections.

## Platform Boundary

- Roblox dashboard work lives in the Roblox render branch in `src/app/page.tsx`.
- Fortnite dashboard work lives in `FortniteDashboardView`.
- Shared components can still be reused, but platform-specific copy, metrics, and card behavior should stay in the matching platform path.

## Required Check

Before pushing dashboard changes, run:

```bash
npm run verify:dashboard
npx tsc --noEmit --incremental false --pretty false
```

The guardrail check confirms that the critical dashboard sections still exist:

- Three opportunity heat maps
- Prediction Market Signals
- Expanded game cards
- Player Activity Landscape
- Keyword cloud, common structure, and tile color cards
- Fortnite-specific dashboard view

## Fortnite Metrics

Fortnite.gg should be treated as a reference for metric naming and market
context, not as an ingested data source unless permission or an approved API is
available.

Current Fortnite dashboard metrics should come from `fortnite_islands` and
`fortnite_island_snapshots`.
