import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/serverAuth";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const supabase = createSupabaseServerClient();
const DASHBOARD_CACHE_TTL_MS = 5 * 60 * 1000;
const DASHBOARD_BROWSER_CACHE_SECONDS = 60;
const DASHBOARD_CDN_CACHE_SECONDS = 5 * 60;
const DASHBOARD_CDN_STALE_SECONDS = 24 * 60 * 60;

const dashboardDataCache = new Map<string, { expiresAt: number; payload: any }>();
const dashboardDataRequests = new Map<string, Promise<any>>();

const ROBLOX_BASE_SELECT = `
  id,
  title,
  url,
  thumbnail_url,
  description,
  genre,
  inferred_genre,
  inferred_subgenre,
  core_loop,
  extracted_tags,
  design_pattern,
  audience_signal,
  build_complexity,
  monetization_style
`;

const ROBLOX_COMPACT_BASE_SELECT = `
  id,
  title,
  url,
  thumbnail_url,
  genre,
  inferred_genre,
  inferred_subgenre,
  core_loop,
  extracted_tags,
  design_pattern,
  audience_signal,
  build_complexity,
  monetization_style
`;

const ROBLOX_METRICS_SELECT = `
  game_id,
  date,
  current_players,
  visits,
  favorites,
  up_votes,
  down_votes,
  like_ratio
`;

const ROBLOX_CHART_SNAPSHOTS_SELECT = `
  game_id,
  snapshot_date,
  created_at,
  current_players,
  chart_rank,
  sort_name
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
  fortnite_island_snapshots (
    snapshot_date,
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
    retention_d7
  )
`;

const FORTNITE_COMPACT_SELECT = `
  id,
  island_code,
  title,
  url,
  thumbnail_url,
  inferred_genre,
  inferred_subgenre,
  core_loop,
  extracted_tags,
  design_pattern
`;

const FORTNITE_CORE_SELECT = `
  ${FORTNITE_COMPACT_SELECT},
  fortnite_island_snapshots (
    snapshot_date,
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
    retention_d7
  )
`;

type DashboardPlatform = "roblox" | "fortnite" | "all";
type DashboardScope = "core" | "full" | "compact";

export async function GET(req: NextRequest) {
  const allowedParams = new Set(["compact", "platform", "scope", "fresh"]);
  const unknownParam = [...req.nextUrl.searchParams.keys()].find(
    (key) => !allowedParams.has(key)
  );
  if (unknownParam) {
    return NextResponse.json(
      { error: `Unsupported dashboard query parameter: ${unknownParam}` },
      { status: 400, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const compactParam = req.nextUrl.searchParams.get("compact");
  const freshParam = req.nextUrl.searchParams.get("fresh");
  if ((compactParam && compactParam !== "1") || (freshParam && freshParam !== "1")) {
    return NextResponse.json(
      { error: "Unsupported dashboard query value" },
      { status: 400, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const compact = compactParam === "1";
  const requestedPlatform = req.nextUrl.searchParams.get("platform");
  if (
    requestedPlatform &&
    requestedPlatform !== "roblox" &&
    requestedPlatform !== "fortnite"
  ) {
    return NextResponse.json(
      { error: "Unsupported dashboard platform" },
      { status: 400, headers: { "Cache-Control": "private, no-store" } }
    );
  }
  const platform: DashboardPlatform =
    requestedPlatform === "roblox" || requestedPlatform === "fortnite"
      ? requestedPlatform
      : "all";
  const requestedScope = req.nextUrl.searchParams.get("scope");
  if (requestedScope && requestedScope !== "core" && requestedScope !== "full") {
    return NextResponse.json(
      { error: "Unsupported dashboard scope" },
      { status: 400, headers: { "Cache-Control": "private, no-store" } }
    );
  }
  const scope: DashboardScope = compact
    ? "compact"
    : requestedScope === "core"
      ? "core"
      : "full";
  const cacheKey = `${platform}:${scope}`;
  const forceFresh = freshParam === "1";

  if (forceFresh) {
    const unauthorized = requireCronSecret(req);
    if (unauthorized) return unauthorized;
  }

  try {
    const payload = await getDashboardPayload(platform, scope, forceFresh);
    return dashboardJson(payload, {}, {
      cacheable: !forceFresh,
      cacheTag: `dashboard-${platform}-${scope}`,
    });
  } catch (error: any) {
    const stalePayload = dashboardDataCache.get(cacheKey)?.payload;

    if (stalePayload && !forceFresh) {
      return dashboardJson(
        {
          ...stalePayload,
          stale: true,
          staleReason: error?.message ?? "Dashboard data refresh failed",
        },
        { "x-dashboard-data-stale": "true" },
        { cacheTag: `dashboard-${platform}-${scope}` }
      );
    }

    return NextResponse.json(
      {
        error: "Dashboard data fetch failed",
        details: error?.message ?? "Unknown dashboard data error",
      },
      { status: 500, headers: { "Cache-Control": "private, no-store" } }
    );
  }
}

function dashboardJson(
  payload: any,
  headers: Record<string, string> = {},
  options: { cacheable?: boolean; cacheTag?: string } = {}
) {
  const response = NextResponse.json(payload);

  if (options.cacheable === false) {
    response.headers.set("Cache-Control", "private, no-store");
  } else {
    response.headers.set(
      "Cache-Control",
      `public, max-age=${DASHBOARD_BROWSER_CACHE_SECONDS}, stale-while-revalidate=${DASHBOARD_CDN_CACHE_SECONDS}`
    );
    response.headers.set(
      "Vercel-CDN-Cache-Control",
      `public, max-age=${DASHBOARD_CDN_CACHE_SECONDS}, stale-while-revalidate=${DASHBOARD_CDN_STALE_SECONDS}`
    );
    if (options.cacheTag) {
      response.headers.set("Vercel-Cache-Tag", options.cacheTag);
    }
  }

  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}

async function getDashboardPayload(
  platform: DashboardPlatform,
  scope: DashboardScope,
  forceFresh = false
) {
  const now = Date.now();
  const cacheKey = `${platform}:${scope}`;
  const cachedPayload = dashboardDataCache.get(cacheKey);

  if (!forceFresh && cachedPayload && cachedPayload.expiresAt > now) {
    return cachedPayload.payload;
  }

  const requestKey = forceFresh ? `${cacheKey}:fresh` : cacheKey;

  if (!dashboardDataRequests.has(requestKey)) {
    const request = resolveDashboardPayload(platform, scope, forceFresh)
      .then((payload) => {
        if (!forceFresh) {
          dashboardDataCache.set(cacheKey, {
            payload,
            expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS,
          });
        }
        return payload;
      })
      .finally(() => {
        dashboardDataRequests.delete(requestKey);
      });

    dashboardDataRequests.set(requestKey, request);
  }

  return dashboardDataRequests.get(requestKey);
}

async function resolveDashboardPayload(
  platform: DashboardPlatform,
  scope: DashboardScope,
  forceFresh: boolean
) {
  if (!forceFresh && platform !== "all" && scope !== "compact") {
    const precomputed = await loadPrecomputedPayload(platform, scope);
    if (precomputed) return precomputed;
  }

  return buildDashboardPayload(platform, scope);
}

async function loadPrecomputedPayload(
  platform: Exclude<DashboardPlatform, "all">,
  scope: Exclude<DashboardScope, "compact">
) {
  const { data, error } = await supabase
    .from("dashboard_public_payloads")
    .select("generated_at,payload")
    .eq("platform", platform)
    .eq("scope", scope)
    .maybeSingle();

  if (error) {
    // Deployments remain compatible until the migration is run.
    if (error.code !== "42P01" && error.code !== "PGRST205") {
      console.warn("Precomputed dashboard payload read failed:", error.message);
    }
    return null;
  }

  if (!data?.payload) return null;

  return {
    ...data.payload,
    precomputed: true,
    payloadGeneratedAt: data.generated_at,
  };
}

async function buildDashboardPayload(
  platform: DashboardPlatform,
  scope: DashboardScope
) {
  const includeRoblox = platform === "all" || platform === "roblox";
  const includeFortnite = platform === "all" || platform === "fortnite";
  const [robloxResult, fortniteResult, auditResult] = await Promise.all([
    includeRoblox
      ? fetchRobloxGames(scope)
      : Promise.resolve({ data: [], error: null }),
    includeFortnite
      ? fetchAllFortniteIslands(scope)
      : Promise.resolve({ data: [], error: null }),
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
      .in(
        "platform",
        platform === "all" ? ["roblox", "fortnite"] : [platform]
      )
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (robloxResult.error) {
    throw new Error(`Roblox data fetch failed: ${robloxResult.error.message}`);
  }

  if (fortniteResult.error) {
    throw new Error(`Fortnite data fetch failed: ${fortniteResult.error.message}`);
  }

  if (auditResult.error) {
    throw new Error(`Audit data fetch failed: ${auditResult.error.message}`);
  }

  return {
    tier: "research",
    platform,
    dataScope: scope,
    roblox:
      scope === "compact"
        ? pruneRobloxFreeData(robloxResult.data ?? [])
        : scope === "core"
          ? pruneRobloxCoreData(robloxResult.data ?? [])
          : robloxResult.data ?? [],
    fortnite:
      scope === "compact"
        ? pruneFortniteFreeData(fortniteResult.data ?? [])
        : scope === "core"
          ? pruneFortniteCoreData(fortniteResult.data ?? [])
          : fortniteResult.data ?? [],
    dataQualitySnapshots: auditResult.data ?? [],
  };
}

async function fetchRobloxGames(scope: DashboardScope = "full") {
  if (scope === "core") {
    const coreResult = await fetchRobloxCoreRollups();
    if (!coreResult.error) return coreResult;

    console.warn(
      "Roblox core rollup RPC unavailable; using the temporary raw-row fallback:",
      coreResult.error.message
    );
  }

  const compact = scope !== "full";
  const historyDays = scope === "core" ? 31 : scope === "full" ? 93 : 10;
  const recentDate = new Date();
  recentDate.setUTCDate(recentDate.getUTCDate() - historyDays);
  const recentDateIso = recentDate.toISOString().slice(0, 10);

  const [gamesResult, metricsResult, chartSnapshotsResult] = await Promise.all([
    fetchAllRows(() =>
      supabase
        .from("games")
        .select(compact ? ROBLOX_COMPACT_BASE_SELECT : ROBLOX_BASE_SELECT)
        .eq("platform", "roblox")
        .order("title", { ascending: true })
    ),
    fetchAllRows(() =>
      {
        let query = supabase
        .from("game_metrics")
        .select(ROBLOX_METRICS_SELECT)
        .order("date", { ascending: true });

        query = query.gte("date", recentDateIso);

        return query;
      }
    ),
    fetchAllRows(() =>
      {
        let query = supabase
        .from("roblox_chart_snapshots")
        .select(ROBLOX_CHART_SNAPSHOTS_SELECT)
        .order("snapshot_date", { ascending: true });

        query = query.gte("snapshot_date", recentDateIso);

        return query;
      }
    ),
  ]);

  if (gamesResult.error) {
    return { data: [], error: gamesResult.error };
  }

  if (metricsResult.error) {
    return { data: [], error: metricsResult.error };
  }

  if (chartSnapshotsResult.error) {
    return { data: [], error: chartSnapshotsResult.error };
  }

  const metricsByGameId = groupRowsByGameId(metricsResult.data);
  const snapshotsByGameId = groupRowsByGameId(chartSnapshotsResult.data);

  return {
    data: gamesResult.data.map((game: any) => ({
      ...game,
      game_metrics: metricsByGameId.get(game.id) ?? [],
      roblox_chart_snapshots: snapshotsByGameId.get(game.id) ?? [],
    })),
    error: null,
  };
}

async function fetchRobloxCoreRollups() {
  const [gamesResult, rollupsResult] = await Promise.all([
    fetchAllRows(() =>
      supabase
        .from("games")
        .select(ROBLOX_COMPACT_BASE_SELECT)
        .eq("platform", "roblox")
        .order("title", { ascending: true })
    ),
    supabase.rpc("get_roblox_dashboard_core_rollups"),
  ]);

  if (gamesResult.error) return { data: [], error: gamesResult.error };
  if (rollupsResult.error) return { data: [], error: rollupsResult.error };

  const rollupsByGameId = new Map(
    (rollupsResult.data ?? []).map((row: any) => [row.game_id, row])
  );

  return {
    data: gamesResult.data.map((game: any) => {
      const rollup = rollupsByGameId.get(game.id) as any;
      return {
        ...game,
        game_metrics: rollup?.game_metrics ?? [],
        roblox_chart_snapshots: rollup?.roblox_chart_snapshots ?? [],
        roblox_rollups: rollup?.roblox_rollups ?? null,
      };
    }),
    error: null,
  };
}

function groupRowsByGameId(rows: any[]) {
  const map = new Map<string, any[]>();

  rows.forEach((row) => {
    const gameId = row.game_id;
    if (!gameId) return;

    const { game_id: _gameId, ...rest } = row;
    const existing = map.get(gameId) ?? [];
    existing.push(rest);
    map.set(gameId, existing);
  });

  return map;
}

async function fetchAllRows(buildQuery: () => any) {
  const pageSize = 1000;
  const pageConcurrency = 6;
  const rows: any[] = [];

  for (let batchStart = 0; ; batchStart += pageSize * pageConcurrency) {
    const pages = await Promise.all(
      Array.from({ length: pageConcurrency }, (_, pageIndex) => {
        const from = batchStart + pageIndex * pageSize;
        return buildQuery().range(from, from + pageSize - 1);
      })
    );

    for (const { data, error } of pages) {
      if (error) {
        return { data: rows, error };
      }

      rows.push(...(data ?? []));

      if (!data || data.length < pageSize) {
        return { data: rows, error: null };
      }
    }
  }
}

async function fetchAllFortniteIslands(scope: DashboardScope = "full") {
  if (scope === "core") {
    const coreResult = await fetchFortniteCoreRollups();
    if (!coreResult.error) return coreResult;

    console.warn(
      "Fortnite core rollup RPC unavailable; using the temporary raw-row fallback:",
      coreResult.error.message
    );
  }

  const pageSize = 1000;
  const rows: any[] = [];
  const select =
    scope === "compact"
      ? FORTNITE_COMPACT_SELECT
      : scope === "core"
        ? FORTNITE_CORE_SELECT
        : FORTNITE_SELECT;

  for (let from = 0; ; from += pageSize) {
    let query = supabase
      .from("fortnite_islands")
      .select(select)
      .order("island_code", { ascending: true })
      .range(from, from + pageSize - 1);

    if (scope === "full") {
      const recentDate = new Date();
      recentDate.setUTCDate(recentDate.getUTCDate() - 93);
      query = query.gte(
        "fortnite_island_snapshots.snapshot_date",
        recentDate.toISOString().slice(0, 10)
      );
    }

    const { data, error } = await query;

    if (error) {
      return { data: rows, error };
    }

    rows.push(...(data ?? []));

    if (!data || data.length < pageSize) {
      return { data: rows, error: null };
    }
  }
}

async function fetchFortniteCoreRollups() {
  const [islandsResult, rollupsResult] = await Promise.all([
    fetchAllRows(() =>
      supabase
        .from("fortnite_islands")
        .select(FORTNITE_COMPACT_SELECT)
        .order("island_code", { ascending: true })
    ),
    supabase.rpc("get_fortnite_dashboard_core_rollups"),
  ]);

  if (islandsResult.error) return { data: [], error: islandsResult.error };
  if (rollupsResult.error) return { data: [], error: rollupsResult.error };

  const rollupsByIslandId = new Map(
    (rollupsResult.data ?? []).map((row: any) => [row.island_id, row])
  );

  return {
    data: islandsResult.data.map((island: any) => {
      const rollup = rollupsByIslandId.get(island.id) as any;
      return {
        ...island,
        fortnite_island_snapshots:
          rollup?.fortnite_island_snapshots ?? [],
        fortnite_rollups: rollup?.fortnite_rollups ?? null,
      };
    }),
    error: null,
  };
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

function pruneRobloxCoreData(rows: any[]) {
  return rows.map((row) => {
    if (row.roblox_rollups) return row;

    const dailySnapshots = dailyRows(
      row.roblox_chart_snapshots ?? [],
      "snapshot_date",
      "current_players"
    );
    const latestMetric = latestEngagementMetric(row.game_metrics ?? []);

    return {
      ...row,
      roblox_rollups: buildRobloxRollups(dailySnapshots),
      game_metrics: latestMetric ? [stripEngagementMetric(latestMetric)] : [],
      // The default charts use seven days. Keep one extra point for comparisons.
      roblox_chart_snapshots: dailySnapshots.slice(-8),
    };
  });
}

function buildRobloxRollups(dailySnapshots: any[]) {
  const latest = dailySnapshots.at(-1) ?? null;

  return {
    as_of_date: latest?.snapshot_date ?? latest?.created_at ?? null,
    latest: latest
      ? {
          date: latest.snapshot_date ?? latest.created_at ?? null,
          current_players: latest.current_players ?? null,
          chart_rank: latest.chart_rank ?? null,
          sort_name: latest.sort_name ?? null,
        }
      : null,
    day_7: summarizeRobloxWindow(dailySnapshots, 7),
    day_30: summarizeRobloxWindow(dailySnapshots, 30),
  };
}

function summarizeRobloxWindow(dailySnapshots: any[], days: number) {
  const latest = dailySnapshots.at(-1);
  if (!latest) return null;

  const latestDate = new Date(latest.snapshot_date ?? latest.created_at);
  const cutoff = new Date(latestDate);
  cutoff.setUTCDate(cutoff.getUTCDate() - days + 1);
  const windowRows = dailySnapshots.filter((row) => {
    const date = new Date(row.snapshot_date ?? row.created_at);
    return date >= cutoff && date <= latestDate;
  });
  const first = windowRows[0];
  const last = windowRows.at(-1);
  if (!first || !last) return null;

  const playerValues = windowRows
    .map((row) => Number(row.current_players))
    .filter(Number.isFinite);
  const rankedRows = windowRows.filter((row) => Number.isFinite(Number(row.chart_rank)));
  const startPlayers = Number(first.current_players) || 0;
  const endPlayers = Number(last.current_players) || 0;
  const elapsedDays = Math.max(
    1,
    (new Date(last.snapshot_date ?? last.created_at).getTime() -
      new Date(first.snapshot_date ?? first.created_at).getTime()) /
      86400000
  );
  const bestRankRow = [...rankedRows].sort(
    (a, b) => Number(a.chart_rank) - Number(b.chart_rank)
  )[0];
  const startRank = Number.isFinite(Number(first.chart_rank))
    ? Number(first.chart_rank)
    : null;
  const endRank = Number.isFinite(Number(last.chart_rank))
    ? Number(last.chart_rank)
    : null;

  return {
    first_date: first.snapshot_date ?? first.created_at ?? null,
    last_date: last.snapshot_date ?? last.created_at ?? null,
    sample_count: windowRows.length,
    start_players: startPlayers,
    end_players: endPlayers,
    average_players: playerValues.length
      ? Math.round(playerValues.reduce((sum, value) => sum + value, 0) / playerValues.length)
      : null,
    minimum_players: playerValues.length ? Math.min(...playerValues) : null,
    maximum_players: playerValues.length ? Math.max(...playerValues) : null,
    player_change: endPlayers - startPlayers,
    player_change_percent: startPlayers
      ? ((endPlayers - startPlayers) / Math.max(startPlayers, 1)) * 100
      : 0,
    average_daily_change: Math.round((endPlayers - startPlayers) / elapsedDays),
    start_rank: startRank,
    end_rank: endRank,
    rank_change: startRank !== null && endRank !== null ? startRank - endRank : 0,
    best_rank: bestRankRow?.chart_rank ?? null,
    best_rank_sort: bestRankRow?.sort_name ?? null,
  };
}

function latestEngagementMetric(metrics: any[]) {
  return (
    [...metrics]
      .filter((metric) => metric?.date)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .find(
        (metric) =>
          typeof metric.visits === "number" ||
          typeof metric.favorites === "number" ||
          typeof metric.up_votes === "number" ||
          typeof metric.like_ratio === "number"
      ) ?? latestByDate(metrics, "date")
  );
}

function pruneFortniteCoreData(rows: any[]) {
  return rows.map((row) => {
    if (row.fortnite_rollups) return row;

    const dailySnapshots = dailyRows(
      row.fortnite_island_snapshots ?? [],
      "created_at",
      "source_order",
      true
    );

    return {
      ...row,
      fortnite_rollups: buildFortniteRollups(dailySnapshots),
      fortnite_island_snapshots: dailySnapshots.slice(-8),
    };
  });
}

function buildFortniteRollups(dailySnapshots: any[]) {
  const latest = dailySnapshots.at(-1) ?? null;

  return {
    as_of_date: latest?.snapshot_date ?? latest?.created_at ?? null,
    latest,
    day_7: summarizeFortniteWindow(dailySnapshots, 7),
    day_30: summarizeFortniteWindow(dailySnapshots, 30),
  };
}

function summarizeFortniteWindow(dailySnapshots: any[], days: number) {
  const latest = dailySnapshots.at(-1);
  if (!latest) return null;

  const latestDate = new Date(latest.snapshot_date ?? latest.created_at);
  const cutoff = new Date(latestDate);
  cutoff.setUTCDate(cutoff.getUTCDate() - days + 1);
  const windowRows = dailySnapshots.filter((row) => {
    const date = new Date(row.snapshot_date ?? row.created_at);
    return date >= cutoff && date <= latestDate;
  });

  const summarizeMetric = (key: string) => {
    const values = windowRows
      .map((row) => Number(row[key]))
      .filter(Number.isFinite);
    return {
      average: values.length
        ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
        : null,
      maximum: values.length ? Math.max(...values) : null,
    };
  };

  const sourceOrders = windowRows
    .map((row) => Number(row.source_order))
    .filter(Number.isFinite);

  return {
    first_date:
      windowRows[0]?.snapshot_date ?? windowRows[0]?.created_at ?? null,
    last_date:
      windowRows.at(-1)?.snapshot_date ?? windowRows.at(-1)?.created_at ?? null,
    sample_count: windowRows.length,
    best_source_order: sourceOrders.length ? Math.min(...sourceOrders) : null,
    peak_ccu: summarizeMetric("peak_ccu"),
    plays: summarizeMetric("plays"),
    unique_players: summarizeMetric("unique_players"),
    minutes_played: summarizeMetric("minutes_played"),
  };
}

function dailyRows(
  rows: any[],
  dateKey: string,
  valueKey: string,
  lowerValueWins = false
) {
  const byDate = new Map<string, any>();

  rows.forEach((row) => {
    const rawDate = row?.[dateKey];
    if (!rawDate) return;
    const day = String(rawDate).slice(0, 10);
    const existing = byDate.get(day);
    const value = Number(row?.[valueKey]);
    const existingValue = Number(existing?.[valueKey]);
    const usableValue = Number.isFinite(value) ? value : lowerValueWins ? Infinity : -Infinity;
    const usableExisting = Number.isFinite(existingValue)
      ? existingValue
      : lowerValueWins
        ? Infinity
        : -Infinity;
    const better = lowerValueWins
      ? usableValue < usableExisting
      : usableValue > usableExisting;
    const newer =
      usableValue === usableExisting &&
      String(row.created_at ?? rawDate) > String(existing?.created_at ?? existing?.[dateKey] ?? "");

    if (!existing || better || newer) byDate.set(day, row);
  });

  return [...byDate.values()].sort((a, b) =>
    String(a?.[dateKey] ?? "").localeCompare(String(b?.[dateKey] ?? ""))
  );
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
    visits: metric.visits,
    favorites: metric.favorites,
    up_votes: metric.up_votes,
    down_votes: metric.down_votes,
    like_ratio: metric.like_ratio,
  };
}
