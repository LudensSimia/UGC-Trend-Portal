import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type {
  FortniteMobileLabPayload,
  MobileLabFortniteIsland,
  MobileLabGame,
  MobileLabSeries,
  RobloxMobileLabPayload,
} from "@/lib/mobileLabTypes";

const DAY_MS = 24 * 60 * 60 * 1000;
const SERIES_COLORS = ["#7c3aed", "#0d69ac", "#dc6b32", "#16845b", "#b34d70"];

async function fetchAllRows(buildQuery: () => any) {
  const pageSize = 1000;
  const rows: any[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}

function cleanLabel(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const label = value.trim();
  if (!label || /^(all|all genres|classification pending|n\/a|none|unknown)$/i.test(label)) {
    return fallback;
  }
  return label;
}

function dateKey(value: unknown) {
  return typeof value === "string" ? value.slice(0, 10) : "";
}

function parseTags(value: unknown) {
  if (Array.isArray(value)) return value.map(String).map((tag) => tag.trim()).filter(Boolean);
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).map((tag) => tag.trim()).filter(Boolean);
  } catch {
    // Fall back to comma-delimited source values.
  }

  return value.split(",").map((tag) => tag.trim()).filter(Boolean);
}

function recentCutoff() {
  return new Date(Date.now() - 10 * DAY_MS).toISOString().slice(0, 10);
}

function buildPresenceSeries(
  islands: Array<{ id: string; genre: string; labels: string[]; dates: string[] }>,
  dates: string[],
  field: "genre" | "primaryLabel"
): MobileLabSeries[] {
  const totals = new Map<string, number>();
  const daily = new Map<string, Map<string, Set<string>>>();

  for (const date of dates) daily.set(date, new Map());

  for (const island of islands) {
    const label = field === "genre" ? island.genre : island.labels[0] || "No primary label";
    for (const date of island.dates) {
      if (!daily.has(date)) continue;
      const byLabel = daily.get(date)!;
      const ids = byLabel.get(label) ?? new Set<string>();
      ids.add(island.id);
      byLabel.set(label, ids);
    }
  }

  for (const date of dates) {
    for (const [label, ids] of daily.get(date) ?? []) {
      totals.set(label, (totals.get(label) ?? 0) + ids.size);
    }
  }

  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label], index) => ({
      key: `${field}-${label}`,
      label,
      color: SERIES_COLORS[index],
      points: dates.map((date) => ({
        date,
        value: daily.get(date)?.get(label)?.size ?? 0,
      })),
    }));
}

export async function getRobloxMobileLabData(): Promise<RobloxMobileLabPayload> {
  const supabase = createSupabaseServerClient();
  const cutoff = recentCutoff();
  const [games, snapshots, metrics] = await Promise.all([
    fetchAllRows(() =>
      supabase
        .from("games")
        .select("id,title,url,thumbnail_url,description,genre,inferred_genre,inferred_subgenre")
        .eq("platform", "roblox")
        .order("title", { ascending: true })
    ),
    fetchAllRows(() =>
      supabase
        .from("roblox_chart_snapshots")
        .select("game_id,snapshot_date,created_at,current_players,chart_rank,sort_name")
        .gte("snapshot_date", cutoff)
        .order("snapshot_date", { ascending: true })
    ),
    fetchAllRows(() =>
      supabase
        .from("game_metrics")
        .select("game_id,date,up_votes,like_ratio")
        .gte("date", cutoff)
        .order("date", { ascending: true })
    ),
  ]);

  const snapshotsByGame = new Map<string, any[]>();
  for (const snapshot of snapshots) {
    if (!snapshot.game_id) continue;
    const existing = snapshotsByGame.get(snapshot.game_id) ?? [];
    existing.push(snapshot);
    snapshotsByGame.set(snapshot.game_id, existing);
  }

  const metricsByGame = new Map<string, any[]>();
  for (const metric of metrics) {
    if (!metric.game_id) continue;
    const existing = metricsByGame.get(metric.game_id) ?? [];
    existing.push(metric);
    metricsByGame.set(metric.game_id, existing);
  }

  const preparedGames = games
    .map((game: any): MobileLabGame | null => {
      const daily = new Map<string, any>();
      for (const snapshot of snapshotsByGame.get(game.id) ?? []) {
        const day = dateKey(snapshot.snapshot_date || snapshot.created_at);
        if (!day) continue;
        const previous = daily.get(day);
        if (!previous || Number(snapshot.current_players ?? 0) > Number(previous.current_players ?? 0)) {
          daily.set(day, snapshot);
        }
      }

      const history = [...daily.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, snapshot]) => ({
          date,
          players: Number(snapshot.current_players ?? 0),
          rank: typeof snapshot.chart_rank === "number" ? snapshot.chart_rank : null,
          sort: snapshot.sort_name ?? null,
        }));

      if (!history.length) return null;
      const latestMetric = (metricsByGame.get(game.id) ?? []).at(-1);
      return {
        id: String(game.id),
        title: game.title || "Untitled experience",
        url: game.url ?? null,
        thumbnailUrl: game.thumbnail_url ?? null,
        genre: cleanLabel(game.genre || game.inferred_genre, "Estimated genre"),
        subgenre: cleanLabel(game.inferred_subgenre, "Estimated subgenre"),
        description: game.description ?? null,
        upVotes: typeof latestMetric?.up_votes === "number" ? latestMetric.up_votes : null,
        likeRatio: typeof latestMetric?.like_ratio === "number" ? latestMetric.like_ratio : null,
        history,
      };
    })
    .filter(Boolean) as MobileLabGame[];

  const latestDate = preparedGames.flatMap((game) => game.history.map((point) => point.date)).sort().at(-1);
  const rankedGames = preparedGames
    .filter((game) => game.history.at(-1)?.date === latestDate)
    .sort((a, b) => Number(b.history.at(-1)?.players ?? 0) - Number(a.history.at(-1)?.players ?? 0));

  return { platform: "roblox", games: rankedGames.slice(0, 50), latestDate: latestDate ?? null };
}

export async function getFortniteMobileLabData(): Promise<FortniteMobileLabPayload> {
  const supabase = createSupabaseServerClient();
  const cutoff = recentCutoff();
  const [islands, snapshots] = await Promise.all([
    fetchAllRows(() =>
      supabase
        .from("fortnite_islands")
        .select("id,island_code,title,url,thumbnail_url,inferred_genre,inferred_subgenre,extracted_tags")
        .order("title", { ascending: true })
    ),
    fetchAllRows(() =>
      supabase
        .from("fortnite_island_snapshots")
        .select("island_id,snapshot_date,created_at")
        .gte("snapshot_date", cutoff)
        .order("snapshot_date", { ascending: true })
    ),
  ]);

  const datesByIsland = new Map<string, Set<string>>();
  for (const snapshot of snapshots) {
    if (!snapshot.island_id) continue;
    const day = dateKey(snapshot.snapshot_date || snapshot.created_at);
    if (!day) continue;
    const existing = datesByIsland.get(snapshot.island_id) ?? new Set<string>();
    existing.add(day);
    datesByIsland.set(snapshot.island_id, existing);
  }

  const prepared = islands.map((island: any) => ({
    id: String(island.id),
    islandCode: island.island_code ?? null,
    title: island.title || "Untitled island",
    url: island.url ?? null,
    thumbnailUrl: island.thumbnail_url ?? null,
    genre: cleanLabel(island.inferred_genre, "Estimated format unavailable"),
    subgenre: cleanLabel(island.inferred_subgenre, "Estimated subformat unavailable"),
    labels: parseTags(island.extracted_tags),
    dates: [...(datesByIsland.get(island.id) ?? [])].sort(),
  }));

  const latestDate = prepared.flatMap((island) => island.dates).sort().at(-1);
  const sevenDates = [...new Set(prepared.flatMap((island) => island.dates))].sort().slice(-7);
  const currentIslands = prepared
    .filter((island) => island.dates.includes(latestDate ?? ""))
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, 10) as MobileLabFortniteIsland[];

  return {
    platform: "fortnite",
    islands: currentIslands,
    latestDate: latestDate ?? null,
    labelSeries: buildPresenceSeries(prepared, sevenDates, "primaryLabel"),
    genreSeries: buildPresenceSeries(prepared, sevenDates, "genre"),
  };
}
