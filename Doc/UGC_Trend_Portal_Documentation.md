# Snoutboard UGC Research Dashboard Documentation

Last updated: 2026-06-10

## Current Status

Snoutboard is now a research dashboard and internal content engine for UGC creator research. The dashboard is not currently positioned as a paid data-access product. The paid product direction is the Patreon research episode generated from dashboard interpretation, plus short public clips and possible Data Strategy Sessions.

Current name:

```text
Snoutboard - UGC Research Dashboard
```

Current stack:

- Next.js App Router
- React
- Supabase Postgres
- Recharts
- Vercel Analytics
- GitHub Actions scheduled refresh

Current data posture:

- Roblox is the stronger player-activity dataset because current-player snapshots are stored.
- Fortnite should be described as metadata, label, IP/collaboration, source-visible, and estimated-format research unless a widget has a reliable source activity/ranking metric.
- All platform signals are processed research inputs, not official advice or guarantees.

Current internal-only tools:

- Admin Access for local widget/copy/link controls.
- Usage Language Print Review for exporting all static usage, disclaimer,
  Terms, glossary, and footer language without dashboard data.
- Podcast Conductor for generating a paid Patreon episode guide and a complete
  12-15 minute host transcript from the current dashboard outputs.
- Podcast PDF generator in `scripts/generate-podcast-conductor-pdf.py`.

Podcast transcript behavior:

- Appears at the bottom of the internal conductor.
- Uses the same calculated values as the conductor sections.
- Includes off-air bracketed navigation and pause cues.
- Shows word count and estimated spoken runtime.
- Is included at the bottom of the generated PDF.
- Must remain framed as independent research, not official guidance or a
  guarantee of results.

Current safety wording:

- Use "captured," "stored snapshot," "estimated," "processed," "directional signal," "metadata," and "research."
- Avoid unsupported "official," "partner," "certified," "approved," "guaranteed," "best performing," "most popular," and "ranked."

Current entry acknowledgement:

- The dashboard is covered by a central blocking disclaimer on every page load.
- Entry requires an explicit "I acknowledge and enter" action.
- Terms of Service remain available before entry. The Glossary is available from the footer after entry.
- The browser stores the acknowledgement version and UTC timestamp for continuity.
- This record is not identity verification and does not replace lawyer-reviewed Terms, a Privacy Policy, or jurisdiction-specific consent requirements.
- When disclaimer wording changes materially, update `DISCLAIMER_VERSION` in `src/app/page.tsx`.
- The local Admin Access panel controls disclaimer copy, text alignment, paragraph emphasis, and the optional image shown in the acknowledgement gate.

Attorney review workflow:

- Open the local-only Admin Access panel.
- Select `Print usage copy`.
- Review or print the generated static-language document.
- The document excludes fetched games, metrics, rankings, charts, and stored dashboard records.
- Shared constants keep the printed Terms and Glossary aligned with the live modals.

The older project notes below are retained as historical context and may describe previous dashboard/payment assumptions that are no longer current.

# Historical UGC Trend Portal Notes

## 1. Project Goal

Build a **Trend Intelligence Platform for UGC Games (Roblox → UEFN → others)** that answers:

> “What should I build, and why?”

This is NOT a passive dashboard.
This is a **decision engine for creators**.

Core value:
- Identify trends early
- Translate data → actionable game ideas
- Provide opportunity scoring + warnings

---

## 2. Current State

### Platform
- Frontend: Next.js (App Router)
- Hosting: Vercel
- Database: Supabase (Postgres)
- Charts: Recharts

### Data Source (Current)
- Roblox Top Trending (Explore API)
- Game details (games.roblox.com)
- Thumbnails API

### Existing Features
- Game ingestion (Top Trending import)
- Game metrics storage:
  - current_players
  - visits
  - favorites
- Basic dashboard display
- Manual refresh endpoints

---

## 3. Database Schema (Current)

### `games`
- id
- title
- platform
- url
- created_at
- chart_rank (⚠️ missing in schema → caused error)

### `game_metrics`
- id
- game_id (FK)
- date
- current_players
- visits
- favorites

---

## 4. Key Problems Identified

### Data Issues
- Missing `chart_rank` column → breaks ingestion
- No historical tracking of rankings
- No classification system (genre defaults to "Other")

### UX Issues
- Dashboard = data viewer, not decision tool
- Trends over time unclear / noisy
- Heatmap not meaningful
- No clear “what to build” output

---

## 5. Key Product Decisions

### Shift in Philosophy
From:
> “Here is what’s trending”

To:
> “Here is what YOU should build next”

---

### Core Features to Implement

#### 1. Trend Over Time (3 Views)
- Most Played Games (Top 25)
- Genre Trends (curves per genre)
- Emerging Games (visual card, not graph)

#### 2. Classification Engine (V1 Heuristic)
Each game gets:
- inferred_genre
- subgenre
- core_loop
- monetization_style
- session_type
- build_complexity

#### 3. Opportunity Engine
Outputs:
- Opportunity score
- Market saturation
- Trend velocity
- Risk warnings

#### 4. “My Game Idea Is” Block
Rewritten as:
- Bullet points
- Clear actionable design direction

#### 5. Visual Improvements
- Dark mode aligned with Roblox/Fortnite UI
- Pie chart for composition (% breakdown)
- Candle-style visual for genre dominance

---

## 6. Data Pipeline (Target State)

### Step 1 – Ingest
- Pull Top 25–50 games daily

### Step 2 – Store
- Snapshot rankings
- Append metrics history

### Step 3 – Enrich
- Apply classification heuristics

### Step 4 – Analyze
- Trend detection
- Growth rate calculation

### Step 5 – Output
- Insights → UI blocks
- Recommendations → creator-facing

---

## 7. API Routes

### Current
- `/api/roblox`
- `/api/roblox/import-top-trending`
- `/api/refresh-all`

### Needed
- `/api/classify`
- `/api/trends`
- `/api/opportunities`

---

## 8. Known Errors / Fixes

### ❌ Supabase Error
PGRST204: column "chart_rank" not found

### ✅ Fix
```sql
ALTER TABLE games ADD COLUMN chart_rank INT;
```

---

## 9. Short-Term Roadmap (1–2 Weeks)

### Priority 1
- Fix schema issues
- Track Top 25 daily snapshots

### Priority 2
- Build trend graphs (3 separate views)

### Priority 3
- Implement classification v1

---

## 10. Mid-Term Roadmap (1–2 Months)

- Opportunity scoring system
- Heatmap redesign (experience spectrum)
- Creator recommendation engine
- Roblox → UEFN expansion

---

## 11. Long-Term Vision

A **cross-platform UGC intelligence system** where:

Creators choose:
- Roblox
- Fortnite UEFN
- Minecraft
- GTA (future)

And receive:
- Validated game ideas
- Market gaps
- Monetization strategy

---

## 12. Business Model

### Funnel
- Free newsletter (trend insights)
- Paid dashboard (full data + recommendations)

### Positioning
Not a tool.
A **competitive advantage engine for creators**.

---

## 13. Open Questions

- How to score “fun” vs “profitability”?
- How to validate classification accuracy?
- What defines a “trend” vs noise?
- How to differentiate from raw analytics tools?

---

## 14. Next Steps

1. Fix Supabase schema
2. Stabilize ingestion pipeline
3. Build trend visualizations
4. Implement classification logic
5. Redesign UI for decision-making

---

## 15. Codex Prompt Starter

"This is a Next.js + Supabase project for a UGC Trend Intelligence Dashboard.  
We ingest Roblox trending games, track metrics over time, and want to build a recommendation engine that tells creators what to build next.  
Start by fixing schema issues and implementing a trend tracking system for Top 25 games over time."
