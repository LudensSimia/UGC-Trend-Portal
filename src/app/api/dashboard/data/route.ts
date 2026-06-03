import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const supabase = createSupabaseServerClient();

const ROBLOX_SELECT = `
  id,
  title,
  url,
  thumbnail_url,
  description,
  genre,
  raw_game_details,
  inferred_genre,
  inferred_subgenre,
  core_loop,
  extracted_tags,
  design_pattern,
  audience_signal,
  build_complexity,
  monetization_style,
  game_metrics (
    date,
    current_players,
    visits,
    favorites,
    up_votes,
    down_votes,
    like_ratio
  ),
  roblox_chart_snapshots (
    snapshot_date,
    created_at,
    current_players,
    chart_rank,
    sort_name
  )
`;

const FORTNITE_SELECT = `
  id,
  island_code,
  title,
  url,
  thumbnail_url,
  description,
  inferred_genre,
  inferred_subgenre,
  core_loop,
  player_intent,
  competition_level,
  build_complexity,
  extracted_tags,
  design_pattern,
  audience_signal,
  raw_latest,
  fortnite_island_snapshots (
    created_at,
    rank,
    source_order,
    rank_source,
    minutes_played,
    minutes_per_player,
    plays,
    favorites,
    recommends,
    peak_ccu,
    unique_players,
    retention_d1,
    retention_d7,
    raw_payload
  )
`;

export async function GET(_req: NextRequest) {
  const [robloxResult, fortniteResult, auditResult] = await Promise.all([
    supabase.from("games").select(ROBLOX_SELECT).eq("platform", "roblox"),
    fetchAllFortniteIslands(),
    supabase
      .from("data_quality_snapshots")
      .select(
        `
          platform,
          total_records,
          classified_records,
          classification_coverage_percent,
          confidence_percent,
          created_at
        `
      )
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (robloxResult.error) {
    return NextResponse.json(
      { error: "Roblox data fetch failed", details: robloxResult.error.message },
      { status: 500 }
    );
  }

  if (fortniteResult.error) {
    return NextResponse.json(
      { error: "Fortnite data fetch failed", details: fortniteResult.error.message },
      { status: 500 }
    );
  }

  if (auditResult.error) {
    return NextResponse.json(
      { error: "Audit data fetch failed", details: auditResult.error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    tier: "research",
    dataScope: "full",
    roblox: robloxResult.data ?? [],
    fortnite: fortniteResult.data,
    dataQualitySnapshots: auditResult.data ?? [],
  });
}

async function fetchAllFortniteIslands() {
  const pageSize = 1000;
  const rows: any[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("fortnite_islands")
      .select(FORTNITE_SELECT)
      .order("island_code", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      return { data: rows, error };
    }

    rows.push(...(data ?? []));

    if (!data || data.length < pageSize) {
      return { data: rows, error: null };
    }
  }
}

function pruneRobloxFreeData(rows: any[]) {
  return rows.map((row) => {
    const latestSnapshot = latestByDate(row.roblox_chart_snapshots ?? [], "created_at");
    const latestMetric = latestByDate(row.game_metrics ?? [], "date");

    return {
      id: row.id,
      title: row.title,
      url: row.url,
      thumbnail_url: row.thumbnail_url,
      genre: row.genre,
      inferred_genre: row.inferred_genre,
      inferred_subgenre: row.inferred_subgenre,
      extracted_tags: row.extracted_tags,
      roblox_chart_snapshots: latestSnapshot ? [latestSnapshot] : [],
      game_metrics: latestMetric ? [stripEngagementMetric(latestMetric)] : [],
    };
  });
}

function pruneFortniteFreeData(rows: any[]) {
  return rows.map((row) => ({
    id: row.id,
    island_code: row.island_code,
    title: row.title,
    url: row.url,
    thumbnail_url: row.thumbnail_url,
    inferred_genre: row.inferred_genre,
    inferred_subgenre: row.inferred_subgenre,
    core_loop: row.core_loop,
    extracted_tags: row.extracted_tags,
    design_pattern: row.design_pattern,
    fortnite_island_snapshots: [],
  }));
}

function latestByDate(rows: any[], key: string) {
  return (
    [...rows]
      .filter((row) => row?.[key])
      .sort(
        (a, b) =>
          new Date(b[key]).getTime() - new Date(a[key]).getTime()
      )[0] ?? null
  );
}

function stripEngagementMetric(metric: any) {
  return {
    date: metric.date,
    current_players: metric.current_players,
    up_votes: metric.up_votes,
    like_ratio: metric.like_ratio,
  };
}
