# Dashboard Change Guardrails

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
