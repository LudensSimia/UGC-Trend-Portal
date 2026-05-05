import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/serverAuth";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const supabase = createSupabaseServerClient();

export async function GET(req: Request) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  try {
    const [roblox, fortnite, audits] = await Promise.all([
      loadRobloxDashboardData(),
      loadFortniteDashboardData(),
      loadLatestAudits(),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const snapshots = [
      {
        snapshot_date: today,
        platform: "roblox",
        data: buildPlatformSnapshot("roblox", roblox, audits.roblox),
      },
      {
        snapshot_date: today,
        platform: "fortnite",
        data: buildPlatformSnapshot("fortnite", fortnite, audits.fortnite),
      },
    ];

    const { error } = await supabase
      .from("dashboard_snapshots")
      .upsert(snapshots, { onConflict: "snapshot_date,platform" });

    if (error) {
      return NextResponse.json(
        { error: "Dashboard snapshot save failed", details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, snapshots });
  } catch (err) {
    console.error("Dashboard snapshot failed:", err);

    return NextResponse.json(
      { error: "Dashboard snapshot failed" },
      { status: 500 }
    );
  }
}

async function loadRobloxDashboardData() {
  const { data, error } = await supabase
    .from("games")
    .select(
      `
        id,
        title,
        url,
        thumbnail_url,
        description,
        inferred_genre,
        inferred_subgenre,
        core_loop,
        extracted_tags,
        design_pattern,
        audience_signal,
        build_complexity,
        monetization_style,
        roblox_chart_snapshots (
          created_at,
          current_players,
          chart_rank,
          sort_name
        )
      `
    )
    .eq("platform", "roblox");

  if (error) throw new Error(`Roblox dashboard query failed: ${error.message}`);

  return (data ?? []).map(withLatestRobloxSnapshot);
}

async function loadFortniteDashboardData() {
  const { data, error } = await supabase.from("fortnite_islands").select(`
    id,
    island_code,
    title,
    url,
    thumbnail_url,
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
      raw_payload
    )
  `);

  if (error) throw new Error(`Fortnite dashboard query failed: ${error.message}`);

  return data ?? [];
}

async function loadLatestAudits() {
  const { data, error } = await supabase
    .from("data_quality_snapshots")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return { roblox: null, fortnite: null };
  }

  return {
    roblox: data?.find((row) => row.platform === "roblox") ?? null,
    fortnite: data?.find((row) => row.platform === "fortnite") ?? null,
  };
}

function buildPlatformSnapshot(platform: "roblox" | "fortnite", items: any[], audit: any) {
  const sorted =
    platform === "roblox"
      ? [...items].sort((a, b) => (b.latestPlayers ?? 0) - (a.latestPlayers ?? 0))
      : [...items].sort((a, b) =>
          (a.inferred_genre ?? "").localeCompare(b.inferred_genre ?? "")
        );

  const top25 = sorted.slice(0, 25);

  return {
    generated_at: new Date().toISOString(),
    platform,
    data_health: {
      total_records: items.length,
      audit,
    },
    top_games: top25.map((item, index) => ({
      rank: index + 1,
      id: item.id,
      title: item.title,
      url: item.url,
      thumbnail_url: item.thumbnail_url,
      current_players: item.latestPlayers ?? 0,
      inferred_genre: item.inferred_genre ?? null,
      inferred_subgenre: item.inferred_subgenre ?? null,
      core_loop: item.core_loop ?? null,
      design_pattern: item.design_pattern ?? null,
      build_complexity: item.build_complexity ?? null,
      latest_rank: item.latestRank ?? null,
      latest_sort: item.latestSort ?? null,
      player_gain_percent: item.playerGainPercent ?? 0,
    })),
    top_genres: buildGenreSummary(items, platform),
    keyword_cloud: buildKeywordCloud(top25),
    common_structure: buildCommonTemplate(top25),
    opportunity_readout: buildOpportunityReadout(items, platform),
  };
}

function withLatestRobloxSnapshot(game: any) {
  const snapshots = game.roblox_chart_snapshots ?? [];
  const sorted = [...snapshots].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const latest = sorted[sorted.length - 1];
  const earliest = sorted[0];

  return {
    ...game,
    snapshots: sorted,
    latestPlayers: latest?.current_players ?? 0,
    latestRank: latest?.chart_rank ?? null,
    latestSort: latest?.sort_name ?? null,
    playerGainPercent:
      earliest?.current_players && latest?.current_players
        ? ((latest.current_players - earliest.current_players) /
            Math.max(earliest.current_players, 1)) *
          100
        : 0,
  };
}

function buildGenreSummary(items: any[], platform: "roblox" | "fortnite") {
  const map: Record<string, { count: number; players: number }> = {};

  items.forEach((item) => {
    const key = `${item.inferred_genre ?? "Other"} / ${
      item.inferred_subgenre ?? "General"
    }`;
    if (!map[key]) map[key] = { count: 0, players: 0 };
    map[key].count += 1;
    map[key].players += item.latestPlayers ?? 0;
  });

  return Object.entries(map)
    .map(([label, value]) => ({
      label,
      count: value.count,
      players: value.players,
      metric: platform === "roblox" ? value.players : value.count,
    }))
    .sort((a, b) => b.metric - a.metric)
    .slice(0, 10);
}

function buildOpportunityReadout(items: any[], platform: "roblox" | "fortnite") {
  const maps = [
    buildOpportunityMap(items, "demand-saturation", platform),
    buildOpportunityMap(items, "velocity-saturation", platform),
    buildOpportunityMap(items, "demand-complexity", platform),
  ];
  const leaders = maps
    .map((map) => (map.items[0] ? { ...map.items[0], lens: map.title } : null))
    .filter(Boolean);

  return {
    leaders,
    strongest: leaders.sort((a: any, b: any) => b.score - a.score)[0] ?? null,
  };
}

function buildKeywordCloud(items: any[]) {
  const counts: Record<string, number> = {};
  const stopWords = new Set([
    "the",
    "and",
    "for",
    "with",
    "you",
    "your",
    "game",
    "games",
    "play",
    "this",
    "that",
    "from",
    "into",
  ]);

  items.forEach((item) => {
    const text = [
      item.description,
      item.core_loop,
      item.design_pattern,
      ...(item.extracted_tags ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    text
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word))
      .forEach((word) => {
        counts[word] = (counts[word] ?? 0) + 1;
      });
  });

  return Object.entries(counts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 18);
}

function buildCommonTemplate(items: any[]) {
  const map: Record<string, number> = {};

  items.forEach((item) => {
    const key = item.design_pattern ?? item.core_loop ?? "Explore -> Play -> Return";
    map[key] = (map[key] ?? 0) + 1;
  });

  const [pattern = "Explore -> Play -> Return", count = 0] =
    Object.entries(map).sort((a, b) => b[1] - a[1])[0] ?? [];

  return {
    pattern,
    count,
    steps: pattern
      .split(/→|->/)
      .map((step) => step.trim())
      .filter(Boolean),
  };
}

function buildOpportunityMap(
  items: any[],
  lens: string,
  platform: "roblox" | "fortnite"
) {
  const grouped = buildHeatMapItems(items);
  const maxPlayers = Math.max(...grouped.map((item: any) => item.players), 1);
  const maxCount = Math.max(...grouped.map((item: any) => item.count), 1);
  const maxVelocity = Math.max(
    ...grouped.map((item: any) => Math.abs(item.velocity)),
    1
  );

  const config: Record<string, any> = {
    "demand-saturation": {
      title: "Demand vs Saturation",
      x: (item: any) => item.players / maxPlayers || item.count / maxCount,
      y: (item: any) => item.count / maxCount,
      score: (x: number, y: number) => x * (1 - y * 0.65),
    },
    "velocity-saturation": {
      title: "Velocity vs Saturation",
      x: (item: any) =>
        platform === "roblox"
          ? Math.max(0, item.velocity) / maxVelocity
          : item.count / maxCount,
      y: (item: any) => item.count / maxCount,
      score: (x: number, y: number) => x * (1 - y * 0.55),
    },
    "demand-complexity": {
      title: "Demand vs Build Complexity",
      x: (item: any) => item.players / maxPlayers || item.count / maxCount,
      y: (item: any) => item.complexity,
      score: (x: number, y: number) => x * (1 - y * 0.5),
    },
  };

  const activeConfig = config[lens];

  return {
    ...activeConfig,
    items: grouped
      .map((item: any) => {
        const x = clamp01(activeConfig.x(item));
        const y = clamp01(activeConfig.y(item));

        return {
          ...item,
          score: clamp01(activeConfig.score(x, y)),
        };
      })
      .sort((a: any, b: any) => b.score - a.score),
  };
}

function buildHeatMapItems(items: any[]) {
  const map: Record<string, any> = {};

  items.forEach((item) => {
    const genre = item.inferred_genre ?? "Other";
    const subgenre = item.inferred_subgenre ?? "General";
    const key = `${genre} / ${subgenre}`;

    if (!map[key]) {
      map[key] = {
        label: key,
        genre,
        subgenre,
        count: 0,
        players: 0,
        velocityTotal: 0,
        complexityTotal: 0,
      };
    }

    map[key].count += 1;
    map[key].players += item.latestPlayers ?? 0;
    map[key].velocityTotal += item.playerGainPercent ?? 0;
    map[key].complexityTotal += complexityScore(item.build_complexity ?? "Medium");
  });

  return Object.values(map).map((item: any) => ({
    ...item,
    velocity: item.count ? item.velocityTotal / item.count : 0,
    complexity: item.count ? item.complexityTotal / item.count : 0.55,
  }));
}

function complexityScore(value: string) {
  if (/low/i.test(value)) return 0.2;
  if (/high/i.test(value)) return 0.9;
  return 0.55;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}
