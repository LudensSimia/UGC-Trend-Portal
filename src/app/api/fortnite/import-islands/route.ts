import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/serverAuth";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

/* =========================================================
   SUPABASE CLIENT
   ---------------------------------------------------------
   This route writes Fortnite island discovery data into
   Supabase. It updates the fortnite_islands table and
   appends metadata snapshots.
   ========================================================= */

const supabase = createSupabaseServerClient();

/* =========================================================
   FORTNITE INTELLIGENCE LAYER
   ---------------------------------------------------------
   Goal:
   Convert raw Fortnite island metadata into structured
   creator-facing signals.

   Unlike Roblox, Fortnite currently gives us strong tags but
   limited performance data from this endpoint. So this layer
   focuses on:
   - gameplay mode
   - player intent
   - competition level
   - session style
   - design pattern

   This is intentionally heuristic:
   - fast
   - explainable
   - auditable
   - easy to expand later
   ========================================================= */

function analyzeFortniteIsland(island: any) {
  const tags = (island.tags ?? []).map((tag: string) => tag.toLowerCase());

  const text = `${island.title ?? ""} ${island.category ?? ""} ${tags.join(
    " "
  )}`.toLowerCase();

  let inferred_genre = "Other";
  let inferred_subgenre = "General";
  let core_loop = "Unknown";
  let session_type = "Short session";
  let player_intent = "Casual play";
  let competition_level = "Medium";
  let build_complexity = "Medium";
  let design_pattern = "General Island";
  let audience_signal = "General Audience";

  /* -------------------------
     COMBAT / PVP
     -------------------------
     Fortnite UEFN is heavily weighted toward combat,
     practice maps, and short-session PvP loops.
     ------------------------- */

  if (
    text.match(
      /pvp|free for all|ffa|1v1|2v2|3v3|4v4|team deathmatch|tdm|boxfight|box fight|zonewars|zone wars|arena|fighting|battle|shooter|shooting|attack|gun game|aim training|practice/
    )
  ) {
    inferred_genre = "Combat";
    inferred_subgenre = "PvP Arena";
    core_loop = "Fight → Reset → Improve";
    session_type = "Short session";
    player_intent = "Skill practice / competition";
    competition_level = "High";
    build_complexity = "Medium to High";
    design_pattern = "Short Match → Skill Improvement → Replay";
    audience_signal = "Competitive";
  }

  /* -------------------------
     BATTLE ROYALE
     ------------------------- */

  if (text.match(/battle royale|last player|last one standing|br/)) {
    inferred_genre = "Battle Royale";
    inferred_subgenre = "Last-player-standing";
    core_loop = "Drop → Loot → Survive → Win";
    session_type = "Medium session";
    player_intent = "Competitive survival";
    competition_level = "High";
    build_complexity = "High";
    design_pattern = "Survive → Rotate → Eliminate";
    audience_signal = "Competitive";
  }

  /* -------------------------
     RACING / VEHICLE
     ------------------------- */

  if (
    text.match(
      /race|racing|driver simulator|driving|car|cars|vehicle|vehicles|bike|motorcycle|drift|speed|track|kart/
    )
  ) {
    inferred_genre = "Racing / Vehicle";
    inferred_subgenre = "Driving Challenge";
    core_loop = "Race → Improve → Repeat";
    session_type = "Short session";
    player_intent = "Skill challenge";
    competition_level = "Medium";
    build_complexity = "Medium";
    design_pattern = "Drive → Compete → Improve Time";
    audience_signal = "Competitive / Casual";
  }

  /* -------------------------
     PARKOUR / DEATHRUN
     ------------------------- */

  if (
    text.match(
      /parkour|deathrun|death run|obby|obstacle|movement|jump|climb|escape/
    )
  ) {
    inferred_genre = "Obstacle / Parkour";
    inferred_subgenre = "Deathrun / Movement";
    core_loop = "Run → Fail → Retry";
    session_type = "Short session";
    player_intent = "Movement mastery";
    competition_level = "Medium";
    build_complexity = "Medium";
    design_pattern = "Attempt → Fail → Improve";
    audience_signal = "Skill / Casual";
  }

  /* -------------------------
     PARTY / CASUAL
     ------------------------- */

  if (
    text.match(
      /party game|party|casual|just for fun|minigame|mini game|mini-game|fun with friends|social|hangout/
    )
  ) {
    inferred_genre = "Party / Casual";
    inferred_subgenre = "Social Minigame";
    core_loop = "Join → Play Round → Replay";
    session_type = "Short session";
    player_intent = "Casual fun";
    competition_level = "Low to Medium";
    build_complexity = "Low to Medium";
    design_pattern = "Quick Round → Social Replay";
    audience_signal = "Casual / Social";
  }

  /* -------------------------
     ADVENTURE / EXPLORATION
     ------------------------- */

  if (
    text.match(
      /open world|exploration|explore|adventure|quest|story|rpg|dungeon|world/
    )
  ) {
    inferred_genre = "Adventure / Exploration";
    inferred_subgenre = "Open World / Quest";
    core_loop = "Explore → Discover → Return";
    session_type = "Medium to Long session";
    player_intent = "Exploration";
    competition_level = "Low";
    build_complexity = "High";
    design_pattern = "Explore → Discover → Share";
    audience_signal = "Exploration-driven";
  }

  /* -------------------------
     HORROR / SURVIVAL
     ------------------------- */

  if (
    text.match(
      /horror|survival|survive|zombie|monster|scary|escape|infected|infection|creature/
    )
  ) {
    inferred_genre = "Survival / Horror";
    inferred_subgenre = "Escape / Survival";
    core_loop = "Survive → Escape → Replay";
    session_type = "Medium session";
    player_intent = "Tension / survival challenge";
    competition_level = "Medium";
    build_complexity = "Medium to High";
    design_pattern = "Threat → Escape → Replay";
    audience_signal = "Thrill-seeking";
  }

  /* -------------------------
     FANDOM / IP
     -------------------------
     Fortnite frequently surfaces branded or fandom-driven
     islands. If a fandom term appears alongside another mode,
     we keep the gameplay genre and mark audience as fandom.
     ------------------------- */

  if (
    text.match(
      /star wars|tmnt|kpop|k-pop|marvel|superhero|hero|anime|dragon ball|naruto|one piece|meme|viral/
    )
  ) {
    if (inferred_genre === "Other") {
      inferred_genre = "Fandom / IP";
      inferred_subgenre = "Brand-themed Island";
      core_loop = "Fandom Hook → Play → Share";
      player_intent = "Fandom participation";
      competition_level = "Medium";
      build_complexity = "Medium";
      design_pattern = "Recognizable Theme → Accessible Mode";
    }

    audience_signal = "Fandom-driven";
  }

  /* -------------------------
     TAG NORMALIZATION
     -------------------------
     We keep the raw Fortnite tags, but normalize them to
     lowercase so the dashboard can group them consistently.
     ------------------------- */

  const extracted_tags = Array.from(new Set(tags));

  return {
    inferred_genre,
    inferred_subgenre,
    core_loop,
    session_type,
    player_intent,
    competition_level,
    build_complexity,
    extracted_tags: extracted_tags.length ? extracted_tags : ["general"],
    design_pattern,
    audience_signal,
  };
}

/* =========================================================
   MAIN ROUTE
   ---------------------------------------------------------
   Flow:
   1. Protect route with CRON_SECRET
   2. Fetch Fortnite island metadata
   3. Analyze each island's tags/title/category
   4. Upsert into fortnite_islands
   5. Insert snapshot into fortnite_island_snapshots

   Important:
   The current Fortnite source gives metadata and tags.
   It does not currently provide reliable CCU, retention,
   plays, or revenue metrics.
   ========================================================= */

export async function GET(req: Request) {
  try {
    const unauthorized = requireCronSecret(req);
    if (unauthorized) return unauthorized;

    const res = await fetch("https://api.fortnite.com/ecosystem/v1/islands", {
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          error: "Official Fortnite Data API fetch failed",
          status: res.status,
        },
        { status: 500 }
      );
    }

    const payload = await res.json();

    const islands =
      payload.data ??
      payload.islands ??
      payload.results ??
      [];

    let inserted = 0;

    for (const island of islands) {
      const islandCode = island.code ?? island.mnemonic ?? island.id;

      if (!islandCode) continue;

      const intelligence = analyzeFortniteIsland(island);

      const { data: islandRow, error: upsertError } = await supabase
        .from("fortnite_islands")
        .upsert(
          {
            island_code: String(islandCode),
            title: island.title ?? island.name ?? "Untitled Fortnite Island",
            creator_name:
              island.creator ??
              island.creatorName ??
              island.creatorCode ??
              null,
            description:
              island.description ??
              `${intelligence.inferred_genre} | ${intelligence.core_loop}`,
            url:
              island.url ??
              `https://www.fortnite.com/@${
                island.creator ?? island.creatorCode ?? ""
              }/${islandCode}`,
            thumbnail_url: island.imageUrl ?? island.thumbnailUrl ?? null,
            content_type: "island",
            raw_latest: island,
            last_seen_at: new Date().toISOString(),

            inferred_genre: intelligence.inferred_genre,
            inferred_subgenre: intelligence.inferred_subgenre,
            core_loop: intelligence.core_loop,
            session_type: intelligence.session_type,
            player_intent: intelligence.player_intent,
            competition_level: intelligence.competition_level,
            build_complexity: intelligence.build_complexity,
            extracted_tags: intelligence.extracted_tags,
            design_pattern: intelligence.design_pattern,
            audience_signal: intelligence.audience_signal,
          },
          { onConflict: "island_code" }
        )
        .select("id")
        .single();

      if (upsertError) {
        console.error("Fortnite island upsert failed:", upsertError);

        return NextResponse.json(
          {
            error: "Fortnite island upsert failed",
            details: upsertError,
          },
          { status: 500 }
        );
      }

      const { error: snapshotError } = await supabase
        .from("fortnite_island_snapshots")
        .insert({
          island_id: islandRow.id,
          source_name: "fortnite_data_api",
          rank: island.rank ?? null,

          /*
             These fields are kept for forward compatibility.
             If a future endpoint provides performance data,
             the database is already ready to store it.
          */
          minutes_played: island.minutesPlayed ?? null,
          minutes_per_player: island.minutesPerPlayer ?? null,
          plays: island.plays ?? null,
          favorites: island.favorites ?? null,
          recommends: island.recommends ?? null,
          peak_ccu: island.peakCCU ?? island.peakCcu ?? null,
          unique_players: island.uniquePlayers ?? null,
          retention_d1: island.retentionD1 ?? null,
          retention_d7: island.retentionD7 ?? null,

          raw_payload: island,
        });

      if (snapshotError) {
        console.error("Fortnite snapshot insert failed:", snapshotError);

        return NextResponse.json(
          {
            error: "Fortnite snapshot insert failed",
            details: snapshotError,
          },
          { status: 500 }
        );
      }

      inserted++;
    }

    return NextResponse.json({
      ok: true,
      platform: "fortnite",
      inserted,
    });
  } catch (err) {
    console.error("Fortnite import server error:", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
