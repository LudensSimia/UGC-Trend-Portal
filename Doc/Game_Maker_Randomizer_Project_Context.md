# Game Maker Randomizer App Context

Last updated: 2026-05-28

This document is a handoff brief for a new project derived from Snoutboard's creative tooling ideas, but intentionally separated from the Roblox/Fortnite API data dashboard.

## Project Intent

Build a standalone game maker randomizer app that helps creators generate fictional game concepts, thumbnails directions, mechanics, genre combinations, and short creative briefs.

The app should not query, store, display, or derive outputs from Roblox, Fortnite, Epic Games, or other third-party platform APIs. It should be a creative brainstorming tool, not a market-data dashboard.

## Business Pivot

The current Snoutboard dashboard collected and processed public platform signals for research. The new randomizer should pivot away from platform-derived data and toward:

- Original creative prompts.
- Manually authored design taxonomies.
- User-controlled randomization.
- Educational ideation support.
- No claims about popularity, ranking, performance, or market demand.

The new product can still serve the same audience: UGC creators, Roblox/Fortnite-style game makers, indie designers, and small studios. But it should not depend on third-party API access or platform data licensing.

## Core Product Concept

Working title options:

- Snoutboard Game Maker
- Snoutboard Idea Lab
- Snoutboard Game Randomizer
- Creator Game Spark

Primary user flow:

1. User selects a creative direction.
2. User clicks "Generate".
3. App creates a fictional game concept card.
4. User can reroll individual parts or the entire concept.
5. User can save/export the generated brief.

## Important Boundary

Do not use live or historical API data from:

- Roblox.
- Epic Games.
- Fortnite.
- Fortnite Data API.
- Fortnite.GG.
- Any third-party game trend API.

Avoid wording that implies:

- The generated idea is likely to succeed.
- The idea is based on current platform trends.
- The idea is recommended by any platform owner.
- The app has official platform affiliation.

Use safer wording:

- "Creative prompt"
- "Fictional concept"
- "Design direction"
- "Idea starter"
- "Not a guarantee of performance"
- "Use as inspiration, not business advice"

## Recommended MVP

### Screen 1: Game Concept Generator

Controls:

- Platform style: Generic UGC, sandbox, social, competitive, cozy, roleplay, action, puzzle.
- Audience mood: relaxed, chaotic, competitive, funny, skill-based, collectible, story-driven.
- Complexity: simple, medium, layered.
- Session length: short, medium, long.
- Monetization style: cosmetic, progression, battle pass-like, collection, none.
- Randomness level: grounded, mixed, weird.

Generated card:

- Title.
- Genre.
- Subgenre.
- Core loop.
- Player fantasy.
- One-line pitch.
- Bullet-point description.
- Key mechanics.
- Social hook.
- Replay hook.
- Thumbnail direction.
- Suggested color palette.
- Risk note.

### Screen 2: Thumbnail Direction Randomizer

Inputs:

- Mood.
- Genre.
- Main subject.
- Color intensity.
- Camera angle.

Outputs:

- Suggested composition.
- Primary color.
- Secondary color.
- Accent color.
- Text treatment.
- Visual do/don't.

### Screen 3: Mechanic Mixer

Inputs:

- Main mechanic.
- Secondary mechanic.
- Progression system.
- Social mechanic.
- Surprise mechanic.

Outputs:

- Short playable concept.
- Why the mechanic combination could feel engaging.
- Possible scope risk.

### Screen 4: Saved Ideas

Basic features:

- Save generated concepts locally.
- Rename concepts.
- Export as Markdown.
- Copy to clipboard.
- Optional future account sync.

## Data Model

Use local hand-authored dictionaries, not API-fed tables.

Example categories:

```ts
type GameIdea = {
  title: string;
  genre: string;
  subgenre: string;
  coreLoop: string;
  playerFantasy: string;
  pitch: string;
  descriptionBullets: string[];
  mechanics: string[];
  socialHook: string;
  replayHook: string;
  thumbnailDirection: ThumbnailDirection;
  palette: ColorPalette;
  riskNote: string;
};

type ThumbnailDirection = {
  subject: string;
  cameraAngle: string;
  background: string;
  focalEmotion: string;
  textCue: string;
};

type ColorPalette = {
  primary: string;
  secondary: string;
  accent: string;
};
```

Recommended dictionary groups:

- Genres.
- Subgenres.
- Core loops.
- Player fantasies.
- Mechanics.
- Progression systems.
- Social hooks.
- Reward styles.
- Thumbnail subjects.
- Color palettes.
- Tone words.
- Title keywords.
- Risk notes.

## Generation Logic

Use a weighted randomizer, not pure random selection.

Rules:

- Avoid repeating the same keyword in a title.
- Keep generated titles to 2-4 major words.
- Keep descriptions structured as bullet points.
- Match subgenres to compatible genres.
- Match mechanics to compatible session lengths.
- Match color palettes to mood and genre.
- Show a "reroll" button per section.
- Never output "unknown", "classification pending", or API-like confidence language.

Example generation modes:

- Mainstream: familiar, broad appeal, easy-to-understand concept.
- Uncommon: more unusual combinations, but still coherent.
- Experimental: surprising combinations with higher scope risk.
- Cozy: low-pressure, social, collection, customization.
- Competitive: skill, ranked-like goals, repeated mastery.
- Social-first: roleplay, party, collaboration, group identity.

## UI Direction

Reuse the general Snoutboard design language, but remove data-dashboard density:

- Clean cards.
- Soft blue accent.
- Clear generate/reroll buttons.
- Color swatches.
- Compact readable briefs.
- No "market intelligence" language.
- No charts required for MVP.

Possible layout:

- Top bar with logo and app name.
- Left control panel.
- Main generated concept card.
- Side panel for thumbnail/color/mechanic breakdown.
- Saved ideas drawer or bottom section.

## Safety / Legal Copy

Suggested footer:

```text
Snoutboard Game Maker is an independent creative ideation tool. Generated concepts are fictional prompts for brainstorming and do not guarantee audience demand, platform approval, commercial success, or game performance.
```

If mentioning Roblox/Fortnite-style creation, use:

```text
Designed for creators making UGC-style games and interactive experiences.
```

Avoid:

```text
Roblox trend generator
Fortnite trend generator
Build what is popular
Guaranteed winning game idea
Official platform insights
```

## Suggested Tech Stack

For a dedicated new app:

- Next.js.
- TypeScript.
- Tailwind CSS.
- Local JSON/TypeScript dictionaries for prompt data.
- Optional Supabase later for saved ideas/accounts.
- No Supabase needed for MVP if concepts can be local-only.

## First Build Scope

1. Create a new Next.js project.
2. Add the Snoutboard logo and visual theme.
3. Build dictionary files for genres, mechanics, titles, colors, and thumbnail directions.
4. Build a deterministic randomizer utility.
5. Build the main Game Concept Generator card.
6. Add reroll controls.
7. Add copy/export to Markdown.
8. Add saved ideas in local storage.
9. Add disclaimer/footer.

## What To Reuse From The Current Dashboard

Can reuse:

- Branding direction.
- Card style.
- Color swatch UI pattern.
- Game template generator interaction pattern.
- Terms/disclaimer posture.
- Tier ideas later, if needed.

Do not reuse:

- API ingestion routes.
- Platform data tables.
- Dashboard trend widgets.
- "Top", "most played", "most popular", or "market signal" language.
- Live Roblox/Fortnite data.

## Starter Prompt For A New Chat

```text
I want to build a new standalone app called Snoutboard Game Maker. It should be a creative game idea randomizer for UGC-style creators, but it must not query, store, display, or derive anything from Roblox, Fortnite, Epic Games, or any platform API.

The app should generate fictional game concept cards using hand-authored local dictionaries: genre, subgenre, core loop, mechanics, player fantasy, title keywords, thumbnail direction, color palette, social hook, replay hook, and risk note.

The MVP should have:
- A clean Snoutboard-themed interface.
- A main Game Concept Generator.
- Buttons for Mainstream, Uncommon, Experimental, Cozy, Competitive, and Social-first generation modes.
- A generated card with title, genre, subgenre, one-line pitch, bullet-point description, key mechanics, thumbnail direction, suggested colors, and a risk note.
- Reroll buttons for the whole concept and individual sections.
- Copy/export to Markdown.
- Local saved ideas.
- A footer disclaimer saying generated concepts are fictional creative prompts and not a guarantee of success or platform approval.

Please help me create a dedicated project for this app.
```

