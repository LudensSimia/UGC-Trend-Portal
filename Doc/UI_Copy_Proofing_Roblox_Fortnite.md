# Snoutboard UI Copy Proofing

Last updated: 2026-06-10

## Current Copy Direction

Current product name:

```text
Snoutboard - UGC Research Dashboard
```

Current positioning:

- Independent research dashboard.
- Processed source signals for creative research.
- No affiliation with Roblox, Epic Games, Fortnite, or related platform owners.
- No guarantee of creator, business, revenue, discovery, or engagement outcomes.

Current important copy patterns:

- Data Source & Health should refer to API/source responses and data capture coverage, not "accuracy."
- Roblox widgets can reference current players when based on stored snapshots.
- Fortnite widgets should avoid "top," "most popular," "best performing," and "ranked" unless the specific source field supports the claim.
- Estimated fields should be labeled "Estimated."
- Podcast conductor copy should frame the full Patreon episode as the paid product and public output as three short clips.

Current required entry acknowledgement:

| Area | Element | Current copy |
| --- | --- | --- |
| Entry gate | Eyebrow | Required acknowledgement |
| Entry gate | Title | Before entering Snoutboard |
| Entry gate | Responsibility line | By entering, you confirm that you understand these limitations and accept responsibility for how you interpret and use the displayed research. |
| Entry gate | Button | I acknowledge and enter |
| Entry gate | Record note | Acknowledgement version 2026-06-10. A timestamp is stored in this browser. |

The full research-limit, no-advice, no-guarantee, and no-affiliation paragraphs
are editable in the local Admin Access panel. The explicit entry action remains
required. The same panel controls disclaimer text alignment, paragraph emphasis,
and the optional local image shown in the acknowledgement gate.

The acknowledgement gate exposes the Terms of Service before entry. The
Glossary is intentionally omitted from the gate and remains available in the
dashboard footer.

The local Admin Access panel includes `Print usage copy`, which creates a
print-formatted legal-language review containing the disclaimer, acknowledgement
copy, Terms, glossary definitions, recurring usage notices, trademark, build
version, and affiliation notice. It excludes all fetched and stored dashboard
data.

Current shared footer:

```text
Snoutboard is independent and is not affiliated with, endorsed by, sponsored by, certified by, approved by, or operated by Roblox, Epic Games, Fortnite, or any related platform owner.
```

The older inventory below is retained for proofreading history and may contain stale names such as "Snout Intel Dashboard."

# Historical UGC Trend Portal UI Copy Proofing
Roblox and Fortnite dashboard text inventory
Purpose: review user-facing static copy from the dashboard UI. This inventory excludes fetched data such as game names, live counts, dates, ranks, source values, and generated keyword terms. Dynamic values are shown in brackets.
Source file: src/app/page.tsx. Generated for proofreading on May 8, 2026.

## Review Notes
- Game titles, fetched descriptions, live metrics, RGB values, chart series names, and database-derived genres/tags are intentionally excluded unless they are static labels.
- Bracketed text such as [count], [percent], [entry], and [timestamp] marks a dynamic value the user will see filled by app data.
- Some empty states are included even if the current dashboard usually has data, because a user could still face them.
- The Fortnite page is now separated from the Roblox page, so Fortnite-only and Roblox-only sections are listed separately.

## Common / Shared UI Copy
Text that can appear regardless of selected platform.

| Screen / Area | Element | Copy to proof |
| --- | --- | --- |
| Global header | Product title | Snout Intel Dashboard |
| Global header | Product subtitle | Creator Development intelligence portal by FDS LLC |
| Global header | Platform toggle | Roblox |
| Global header | Platform toggle | Fortnite |
| Global header | Theme toggle | Light |
| Global header | Theme toggle | Dark |
| Disclaimer | Lead sentence | Informational use only. UGC Intel provides directional market signals and does not guarantee creator, business, revenue, discovery, or engagement outcomes. |
| Disclaimer | Creative-use sentence | Video games are a form of art, please use the displayed information to fuel your creativity and ultimately provide fun. |
| Disclaimer | Dismiss button | Dismiss |
| Main intro | Section title | Creator Trend Intelligence |
| Main intro | Supporting copy | Platform-specific market signals for deciding what to build next. |
| Loading | Loading state | Loading platform data... |
| Shared selectors | Genre dropdown placeholder | Select Genre |
| Shared selectors | Subgenre dropdown placeholder | Select Subgenre |
| Shared controls | Trend limit | Top 25 |
| Shared controls | Trend limit | Top 50 |
| Shared controls | Percentile zoom | 25% |
| Shared controls | Percentile zoom | 50% |
| Shared controls | Percentile zoom | 75% |
| Shared controls | Percentile zoom | 100% |
| Opportunity maps | Section title | Opportunity Map |
| Opportunity maps | Section intro | Green indicates stronger opportunity; red indicates weaker opportunity or higher risk. |
| Opportunity maps | Map title | Demand vs Saturation |
| Opportunity maps | Map subtitle | Find demand that is not already overcrowded. |
| Opportunity maps | X-axis label | Audience Demand |
| Opportunity maps | Y-axis label | Market Saturation |
| Opportunity maps | Axis endpoint | Lower demand |
| Opportunity maps | Axis endpoint | Higher demand |
| Opportunity maps | Color label | Opportunity |
| Opportunity maps | Demand formula - Roblox | Current player pool divided by the largest segment player pool. |
| Opportunity maps | Demand formula - Fortnite | Imported island count in the segment divided by the largest segment count. |
| Opportunity maps | Saturation formula | Number of records in this genre/subgenre divided by the most represented segment. |
| Opportunity maps | Color formula | Demand score discounted by saturation; greener means high demand without extreme crowding. |
| Opportunity maps | Map title | Velocity vs Saturation |
| Opportunity maps | Map subtitle | Find categories moving upward before they get crowded. |
| Opportunity maps | X-axis label | Trend Velocity |
| Opportunity maps | Axis endpoint | Slower |
| Opportunity maps | Axis endpoint | Faster |
| Opportunity maps | Color label | Momentum |
| Opportunity maps | Velocity formula - Roblox | Average player gain percentage for the segment, normalized against the fastest segment. |
| Opportunity maps | Velocity formula - Fortnite | Imported metadata movement is not available yet, so this lens uses current segment activity as a temporary proxy. |
| Opportunity maps | Color formula | Velocity score discounted by saturation; greener means faster movement with less crowding. |
| Opportunity maps | Map title | Demand vs Game Format Complexity |
| Opportunity maps | Map subtitle | Find strong demand in formats with a lighter estimated scope. |
| Opportunity maps | Y-axis label | Game Format Complexity |
| Opportunity maps | Color label | Feasibility |
| Opportunity maps | Complexity formula | Estimated average game format complexity: simpler genre formats are lower on the map, broader or more system-heavy formats are higher on the map. |
| Opportunity maps | Color formula | Demand score discounted by estimated game format complexity; deeper blue means strong demand with a lighter inferred format scope. |
| Opportunity maps | Calculation label | X calculation: |
| Opportunity maps | Calculation label | Y calculation: |
| Opportunity maps | Calculation label | Color: |
| Read Out | Card title | Read Out |
| Read Out | Supporting copy | Synthesis across demand, saturation, velocity, and estimated game format complexity. |
| Read Out | Signal label | Strongest signal |
| Read Out | Template sentence | This segment scores highest in [lens], with [players] players across [count] records. |
| Read Out | Interpretation | Creator interpretation: prioritize ideas that appear green in more than one lens; treat red/yellow areas as either crowded, slow-moving, or expensive to build. |
| Read Out | Empty state | Not enough classified records to generate a read out. |
| Recommendation cards | Card title | Opportunity |
| Recommendation cards | Card title | Design Cues |
| Recommendation cards | Card title | Warnings |
| Top 25 cards | Shared label | Genre |
| Top 25 cards | Shared label | Subgenre |
| Prediction section | Eyebrow | Forecasting Layer |
| Prediction section | Title | Prediction Market Signals |
| Prediction section | Intro | Eight measurable signals that can support market-style questions around attention, momentum, persistence, and genre rotation. |
| Prediction section | Search label | Search game |
| Prediction section | No result | No matching game found |
| Prediction section | No result help | Try a different title. |
| Prediction section | Link button | Open source |

## Roblox Page UI Copy
Static Roblox dashboard text and templates, excluding fetched Roblox experience titles and live metric values.

| Screen / Area | Element | Copy to proof |
| --- | --- | --- |
| Data Source & Health | Title | Data Source & Health |
| Data Source & Health | Bullet | How many games are queried in the latest snapshot: [count]. |
| Data Source & Health | Bullet | The data is pulled from: [source]. |
| Data Source & Health | Bullet | Automated classification confidence is [percent]%. |
| Data Source & Health | Timestamp label | Last query snapshot: [timestamp] UTC |
| Top summary | Card title | Top 3 Most Played Games |
| Top summary | Subtitle | By current players |
| Top summary | Reference label | Top played yesterday |
| Top summary | Reference label | Top played last week |
| Top summary | Card title | Top 3 Genres / Subgenres |
| Top summary | Subtitle | By current player pool |
| Trending Games | Card title | Trending Games |
| Trending Games | Signal label | Most player gain |
| Trending Games | Signal label | Most position gain |
| Trending Games | Signal label | Most player loss |
| Trending Games | Subline template | Yesterday: [entry] |
| Charts | Title | Most Played Games Over Time |
| Charts | Subtitle | Top [25 or 50] experiences by current players, tracked across stored snapshot dates. |
| Charts | Title | Most Played Genres Over Time |
| Charts | Subtitle | Genre-level player curves using stored Roblox snapshot dates. |
| Charts | Empty state | No game snapshots available. |
| Charts | Empty state | No genre snapshots available. |
| Keyword Cloud | Title | Top 25 Keyword Cloud |
| Keyword Cloud | Subtitle | Common title and description signals by genre |
| Keyword Cloud | Panel title | Title cloud |
| Keyword Cloud | Panel title | Description cloud |
| Keyword Cloud | Empty state | No title keywords available for this genre. |
| Keyword Cloud | Empty state | No description keywords available for this genre. |
| Description Structure | Title | Common Description Structure |
| Description Structure | Subtitle | Repeated description formula in the top set |
| Description Structure | Label | Mini Template |
| Description Structure | Footer template | Seen in [count] of the top 25 records. |
| Top Tile Colors | Title | Top Tile Colors |
| Top Tile Colors | Subtitle | Primary and secondary RGB colors by genre |
| Top Tile Colors | Color label | Secondary: [RGB value] |
| My Game Idea | Title | My Game Idea Is |
| My Game Idea | Supporting copy | Use this as a reflection tool to position your concept. |
| My Game Idea | Bullet | This combination of genre and subgenre makes [percent]% of the imported experiences. |
| My Game Idea | Bullet | This represents a potential pool of [count] current players. |
| My Game Idea | Similar section | Similar top games |
| My Game Idea | Empty state | Select a genre to populate suggestions. |
| Recommendation cards | Opportunity bullet | This segment currently maps to [players] players across [count] imported experiences. |
| Recommendation cards | Opportunity bullet | [percent]% of the active platform dataset matches this idea profile. |
| Recommendation cards | Opportunity bullet | There are enough examples to study repeatable patterns. |
| Recommendation cards | Opportunity bullet | This is a lower-signal area and should be treated as exploratory. |
| Recommendation cards | Warning bullet | This combination has low representation in the imported dataset. |
| Recommendation cards | Warning bullet | This combination has visible competition in the imported dataset. |
| Recommendation cards | Warning bullet | Roblox signals are based on current player snapshots and inferred classifications. |
| Recommendation cards | Warning bullet | Use this as a directional signal, not a prediction of creator outcome. |
| Player Activity Landscape | Title | Player Activity Landscape |
| Player Activity Landscape | Supporting copy | Rectangle size reflects current player activity. Color reflects stored player gain or loss. |
| Player Activity Landscape | Legend | Loss |
| Player Activity Landscape | Legend | Flat |
| Player Activity Landscape | Legend | Gain |
| Top 25 Cards | Title | Top 25 Roblox Experiences |
| Top 25 Cards | Subtitle | Ranked by latest stored current player count. |
| Top 25 Cards | Label | Gain in players |
| Top 25 Cards | Label | Stored peak players |
| Top 25 Cards | Label | Top measured rank |
| Top 25 Cards | Label | Avg player gain/loss, past 7 days |
| Top 25 Cards | Label | Likes |
| Top 25 Cards | Label | Visits |
| Similar cards | Label | Players |
| Prediction | Search placeholder | Search Roblox experience |
| Prediction | Signal label | Daily rank history |
| Prediction | Value fallback | No ranked snapshots |
| Prediction | Detail template | Latest rank: #[rank] in [chart]. Rank movement: [spots] spots. |
| Prediction | Signal label | Player velocity |
| Prediction | Detail | Stored-period player change from earliest to latest snapshot. |
| Prediction | Signal label | Volatility |
| Prediction | Detail template | Observed range: [low] to [high] players. |
| Prediction | Signal label | Peak retention |
| Prediction | Detail template | Current players vs stored peak of [count]. |
| Prediction | Signal label | Genre share over time |
| Prediction | Detail template | [genre] currently represents [count] tracked players. |
| Prediction | Signal label | New entrant detection |
| Prediction | Detail | First stored appearance in the current Supabase snapshot history. |
| Prediction | Signal label | Breakout score |
| Prediction | Detail | Composite of player scale, velocity, rank gain, and peak retention. |
| Prediction | Signal label | Settlement snapshots |
| Prediction | Detail template | Latest settlement reference: [timestamp] UTC. |
| Prediction | Empty detail | No settlement snapshot available yet. |

## Fortnite Page UI Copy
Static Fortnite dashboard text and templates, excluding fetched island names, metadata values, and live metric values.

| Screen / Area | Element | Copy to proof |
| --- | --- | --- |
| Data Source & Health | Title | Data Source & Health |
| Data Source & Health | Bullet | How many islands are queried in the latest snapshot: [count]. |
| Data Source & Health | Bullet | The data is pulled from: [source]. |
| Data Source & Health | Bullet | Automated classification confidence is [percent]%. |
| Data Source & Health | Timestamp label | Last query snapshot: [timestamp] UTC |
| Top summary | Card title | Top 5 Fortnite Islands |
| Top summary | Subtitle | Ranked by the latest imported source snapshot |
| Top summary | Subline template | Yesterday: [entry] |
| Top summary | Card title | Top 3 Genres / Subgenres |
| Top summary | Subtitle | By imported island count |
| Gameplay Labels | Card title | Top 10 Gameplay Labels |
| Gameplay Labels | Subtitle | Most frequent labels across imported islands |
| Gameplay Labels | Movement value | NEW |
| Charts | Title | Gameplay Label Usage Over Time |
| Charts | Subtitle | Top [10 or 25] labels by island usage across stored Fortnite snapshots. |
| Charts | Toggle | Top 10 |
| Charts | Toggle | Top 25 |
| Charts | Empty state | No Fortnite label snapshots available yet. |
| Keyword Cloud | Title | Top 25 Keyword Cloud |
| Keyword Cloud | Subtitle | Common title and description signals across the top 25 islands |
| Keyword Cloud | Empty state | No title or description keywords available. |
| Top Tile Colors | Title | Top Tile Colors |
| Top Tile Colors | Subtitle | Primary and secondary RGB colors from the top 25 islands |
| Top Tile Colors | Pagination template | [start]-[end] of [total] |
| Top Tile Colors | Previous button aria-label | Previous color set |
| Top Tile Colors | Next button aria-label | Next color set |
| Top Tile Colors | Item label | Island |
| Top Tile Colors | Color label | Secondary: [RGB value] |
| Opportunity Map | Status line | Showing [count] imported Fortnite islands in the opportunity maps. |
| My Island Idea | Title | My Fortnite Island Idea Is |
| My Island Idea | Supporting copy | Use this as a reflection tool to position your island concept. |
| My Island Idea | Bullet | This combination of genre and subgenre makes [percent]% of the imported Fortnite islands. |
| My Island Idea | Similar section | Similar top islands |
| Recommendation cards | Opportunity bullet | This segment maps to [count] imported Fortnite islands. |
| Recommendation cards | Opportunity bullet | [percent]% of the Fortnite dataset matches this idea profile. |
| Recommendation cards | Opportunity bullet | There are enough examples to study repeatable island patterns. |
| Recommendation cards | Opportunity bullet | This is a lower-signal area and should be treated as exploratory. |
| Recommendation cards | Warning bullet | This combination has low representation in the imported Fortnite dataset. |
| Recommendation cards | Warning bullet | This combination has visible competition in the imported Fortnite dataset. |
| Recommendation cards | Warning bullet | Fortnite signals use official activity fields when the source returns them; missing fields should be treated as coverage gaps. |
| Recommendation cards | Warning bullet | Use this as a directional signal, not a prediction of creator outcome. |
| Top 25 Cards | Title | Top 25 Fortnite Islands |
| Top 25 Cards | Subtitle | Ranked by the latest imported source snapshot. |
| Top 25 Cards | Label | Genre |
| Top 25 Cards | Label | Subgenre |
| Top 25 Cards | Label | Player intent |
| Top 25 Cards | Label | Core loop |
| Top 25 Cards | Label | Labels |
| Top 25 Cards | Fallback value | Unclassified |
| Top 25 Cards | Fallback value | General |
| Top 25 Cards | Fallback value | Not classified yet |
| Similar cards | Label | Genre |
| Prediction | Search placeholder | Search Fortnite island |
| Prediction | Signal label | Current source rank |
| Prediction | Value fallback | Unranked |
| Prediction | Detail | Latest imported rank from the Fortnite island source order. |
| Prediction | Signal label | Rank movement |
| Prediction | Value fallback | Not enough history |
| Prediction | Detail | Needs at least two ranked snapshots to compare position movement. |
| Prediction | Detail template | Rank stayed at #[rank] across stored ranked snapshots. |
| Prediction | Detail template | Moved from #[first] to #[latest]; positive means the island climbed. |
| Prediction | Signal label | Genre field share |
| Prediction | Detail template | [count] of [total] imported islands are classified as [genre]. |
| Prediction | Signal label | Subgenre field share |
| Prediction | Detail template | [count] of [total] imported islands are classified as [subgenre]. |
| Prediction | Signal label | Gameplay label cluster |
| Prediction | Detail | No gameplay labels are available for this island yet. |
| Prediction | Detail template | [count] of [total] imported islands share at least one gameplay label: [labels]. |
| Prediction | Signal label | Competition tier |
| Prediction | Value fallback | Unclassified |
| Prediction | Detail | Derived from the imported genre, subgenre, intent, and label mix. |
| Prediction | Signal label | First tracked |
| Prediction | Value fallback | Not tracked |
| Prediction | Detail | First stored appearance in the current Fortnite snapshot history. |
| Prediction | Signal label | Settlement snapshots |
| Prediction | Detail template | Latest settlement reference: [timestamp] UTC. |
| Prediction | Empty detail | No dated snapshot available for this island yet. |
| Removed/legacy empty states | Fortnite activity chart empty state | No Fortnite activity snapshots available yet. Run the Fortnite refresh after deploying the updated importer. |
| Removed/legacy empty states | Fortnite genre chart empty state | No Fortnite genre activity snapshots available yet. Run the Fortnite refresh after deploying the updated importer. |

## Proofing Checklist
- Check capitalization consistency across Health/health, Genre/Subgenre, and Fortnite Island/Island.
- Check whether creator-facing language avoids implying certainty or guaranteed outcomes.
- Check whether Fortnite copy avoids mentioning Roblox, and Roblox copy avoids mentioning Fortnite, except platform toggles.
- Check whether any placeholder/fallback terms such as N/A, Unclassified, or Not classified yet should be softened further.
- Check whether prediction-market wording is understandable to creators who are not analysts.
