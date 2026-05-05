"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Platform = "roblox" | "fortnite";

type DataQualitySnapshot = {
  platform: Platform;
  total_records: number;
  classified_records: number;
  classification_coverage_percent: number;
  confidence_percent: number;
  created_at: string;
};

export default function Home() {
  const [activePlatform, setActivePlatform] = useState<Platform>("roblox");
  const [darkMode, setDarkMode] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [robloxGames, setRobloxGames] = useState<any[]>([]);
  const [fortniteIslands, setFortniteIslands] = useState<any[]>([]);
  const [dataQualitySnapshots, setDataQualitySnapshots] = useState<
    DataQualitySnapshot[]
  >([]);
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedSubgenre, setSelectedSubgenre] = useState("");
  const [loading, setLoading] = useState(true);

  const accent = activePlatform === "roblox" ? "#5fbfd0" : "#7c3aed";

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const { data: robloxData, error: robloxError } = await supabase
        .from("games")
        .select(`
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
          roblox_chart_snapshots (
            created_at,
            current_players,
            chart_rank,
            sort_name
          )
        `)
        .eq("platform", "roblox");

      if (robloxError) console.error("Roblox fetch error:", robloxError);

      const { data: fortniteData, error: fortniteError } = await supabase
        .from("fortnite_islands")
        .select(`
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

      if (fortniteError) console.error("Fortnite fetch error:", fortniteError);

      const { data: auditData, error: auditError } = await supabase
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
        .limit(20);

      if (auditError) {
        console.warn("Data quality audit fetch warning:", auditError.message);
      }

      setRobloxGames((robloxData ?? []).map(withLatestRobloxSnapshot));
      setFortniteIslands((fortniteData ?? []).map(withLatestFortniteSnapshot));
      setDataQualitySnapshots((auditData ?? []) as DataQualitySnapshot[]);
      setLoading(false);
    }

    fetchData();
  }, []);

  const activeItems =
    activePlatform === "roblox" ? robloxGames : fortniteIslands;

  const genres = useMemo(() => {
    return Array.from(
      new Set(activeItems.map((item) => item.inferred_genre ?? "Other"))
    ).sort();
  }, [activeItems]);

  const subgenres = useMemo(() => {
    return Array.from(
      new Set(
        activeItems
          .filter(
            (item) => !selectedGenre || item.inferred_genre === selectedGenre
          )
          .map((item) => item.inferred_subgenre ?? "General")
      )
    ).sort();
  }, [activeItems, selectedGenre]);

  const filteredIdeaItems = activeItems.filter((item) => {
    const genreMatch = !selectedGenre || item.inferred_genre === selectedGenre;
    const subgenreMatch =
      !selectedSubgenre || item.inferred_subgenre === selectedSubgenre;
    return genreMatch && subgenreMatch;
  });

  const topRobloxGames = useMemo(() => {
    return [...robloxGames].sort(
      (a, b) => (b.latestPlayers ?? 0) - (a.latestPlayers ?? 0)
    );
  }, [robloxGames]);

  const topFortniteIslands = useMemo(() => {
    return [...fortniteIslands].sort((a, b) =>
      (a.inferred_genre ?? "").localeCompare(b.inferred_genre ?? "")
    );
  }, [fortniteIslands]);

  const mostPlayedGame = topRobloxGames[0];
  const mostPlayedGameTrend = mostPlayedGame
    ? buildGameTrend(mostPlayedGame)
    : [];

  const genreCandles = buildGenreCandles(robloxGames);
  const emergingGame = findEmergingGame(robloxGames);

  const totalPlayersInIdea = filteredIdeaItems.reduce(
    (sum, item) => sum + (item.latestPlayers ?? 0),
    0
  );

  const ideaPercent =
    activeItems.length > 0
      ? Math.round((filteredIdeaItems.length / activeItems.length) * 100)
      : 0;

  const topSimilar = [...filteredIdeaItems]
    .sort((a, b) => (b.latestPlayers ?? 0) - (a.latestPlayers ?? 0))
    .slice(0, 3);

  const topGenreScoreboard = buildTopGenreScoreboard(robloxGames);
  const topGameScoreboard = topRobloxGames.slice(0, 3);
  const topPlayedYesterday = getTopGameByUtcDate(robloxGames, 1);
  const topPlayedLastWeek = getTopGameByUtcDate(robloxGames, 7);
  const activeAuditSnapshot = dataQualitySnapshots.find(
    (snapshot) => snapshot.platform === activePlatform
  );
  const dataSourceHealth = buildDataSourceHealth(
    activePlatform,
    activeItems,
    activeAuditSnapshot
  );

  const shell = darkMode
    ? "bg-[#111318] text-slate-100"
    : "bg-[#e9eaec] text-[#242832]";

  const panel = darkMode
    ? "bg-[#191c22] border-[#303540]"
    : "bg-white border-[#d9dde5]";

  return (
    <main className={`min-h-screen p-6 ${shell}`}>
      <div className={`mx-auto max-w-7xl rounded-[32px] p-8 ${panel} border`}>
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-slate-100 font-black text-slate-500">
              ◈
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">
                Snout Intel Dashboard
              </h1>
              <p className="text-xs text-slate-500">
                Creator Development intelligence portal by FDS LLC
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ToggleGroup>
              <ToggleButton
                active={activePlatform === "roblox"}
                onClick={() => {
                  setActivePlatform("roblox");
                  setSelectedGenre("");
                  setSelectedSubgenre("");
                }}
                activeColor="#5fbfd0"
              >
                Roblox
              </ToggleButton>
              <ToggleButton
                active={activePlatform === "fortnite"}
                onClick={() => {
                  setActivePlatform("fortnite");
                  setSelectedGenre("");
                  setSelectedSubgenre("");
                }}
                activeColor="#7c3aed"
              >
                Fortnite
              </ToggleButton>
            </ToggleGroup>

            <ToggleGroup>
              <ToggleButton
                active={!darkMode}
                onClick={() => setDarkMode(false)}
                activeColor={accent}
              >
                Light
              </ToggleButton>
              <ToggleButton
                active={darkMode}
                onClick={() => setDarkMode(true)}
                activeColor={accent}
              >
                Dark
              </ToggleButton>
            </ToggleGroup>
          </div>
        </header>

        {showDisclaimer && (
          <div className="mb-8 flex items-start justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p>
              <strong>Informational use only.</strong> UGC Intel provides
              directional market signals and does not guarantee creator,
              business, revenue, discovery, or engagement outcomes.
            </p>
            <button
              onClick={() => setShowDisclaimer(false)}
              className="ml-4 rounded-full border px-3 py-1 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        <section className="mb-6">
          <h2 className="text-3xl font-bold">Creator Trend Intelligence</h2>
          <p className="mt-2 text-sm text-slate-500">
            Platform-specific market signals for deciding what to build next.
          </p>
        </section>

        {loading ? (
          <p>Loading platform data...</p>
        ) : (
          <>
            <section className="mb-6 grid gap-4 lg:grid-cols-4">
              <DataSourceHealthCard
                title="Data Source & health"
                items={[
                  `How many games are queried today: ${formatNumber(
                    dataSourceHealth.queriedToday
                  )}.`,
                  `The data is pulled from: ${dataSourceHealth.source}.`,
                  `Automated classification confidence is ${dataSourceHealth.confidence}%.`,
                ]}
                lastRunLabel={dataSourceHealth.lastRunLabel}
                panel={panel}
                accent={accent}
              />

              <ScoreboardCard
                title="Top 3 Most Played Games"
                subtitle={
                  activePlatform === "roblox"
                    ? "By current players"
                    : "Performance metrics unavailable"
                }
                items={
                  activePlatform === "roblox"
                    ? topGameScoreboard.map((g) => ({
                        label: g.title,
                        value: formatNumber(g.latestPlayers),
                        href: g.url,
                      }))
                    : topFortniteIslands.slice(0, 3).map((i) => ({
                        label: i.title,
                        value: i.inferred_genre ?? "Metadata",
                        href: i.url,
                      }))
                }
                references={
                  activePlatform === "roblox"
                    ? [
                        {
                          label: "Top played yesterday",
                          value: topPlayedYesterday?.title ?? "placeholder",
                          href: topPlayedYesterday?.url,
                        },
                        {
                          label: "Top played last week",
                          value: topPlayedLastWeek?.title ?? "placeholder",
                          href: topPlayedLastWeek?.url,
                        },
                      ]
                    : [
                        {
                          label: "Top played yesterday",
                          value: "placeholder",
                        },
                        {
                          label: "Top played last week",
                          value: "placeholder",
                        },
                      ]
                }
                panel={panel}
                accent={accent}
              />

              <GenreShareCard
                title="Top 3 Genres / Subgenres"
                subtitle={
                  activePlatform === "roblox"
                    ? "By current player pool"
                    : "By imported island count"
                }
                items={
                  activePlatform === "roblox"
                    ? topGenreScoreboard
                    : buildFortniteGenreScoreboard(fortniteIslands)
                }
                panel={panel}
                accent={accent}
              />

              <TrendingCard
                title="Most Trending Game"
                item={
                  activePlatform === "roblox"
                    ? emergingGame
                    : topFortniteIslands[0]
                }
                panel={panel}
                accent={accent}
                platform={activePlatform}
              />
            </section>

            <section className="mb-6 grid gap-6 lg:grid-cols-3">
              <ChartCard
                title="Most Played Games Over Time"
                subtitle={
                  activePlatform === "roblox"
                    ? "Top 25 experiences by current players, tracked across stored snapshot dates."
                    : "Fortnite player-performance history is not available from the current endpoint."
                }
                panel={panel}
              >
                {activePlatform === "roblox" ? (
                  <TopGamesTrend games={topRobloxGames.slice(0, 25)} />
                ) : (
                  <Unavailable text="Fortnite island metadata is available, but player-performance history is not exposed by the current source." />
                )}
              </ChartCard>

              <ChartCard
                title="Most Played Genres Over Time"
                subtitle="Genre-level player curves using stored Roblox snapshot dates."
                panel={panel}
              >
                {activePlatform === "roblox" ? (
                  <GenreLinesTrend games={robloxGames} />
                ) : (
                  <Unavailable text="Fortnite genre counts are available, but not CCU curves." />
                )}
              </ChartCard>

              <ChartCard
                title="Emerging Game"
                subtitle="Game with strongest stored player gain"
                panel={panel}
              >
                {activePlatform === "roblox" ? (
                  <EmergingGameVisual game={emergingGame} accent={accent} />
                ) : (
                  <EmergingGameVisual
                    game={topFortniteIslands[0]}
                    accent={accent}
                    metadataOnly
                  />
                )}
              </ChartCard>
            </section>

            <section className="mb-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
              <div className={`rounded-3xl border p-6 ${panel}`}>
                <h2 className="text-2xl font-bold">Opportunity Map</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Opportunity proxy is derived from visibility concentration and
                  repeatable design patterns. Higher demand / visibility means
                  more players or more frequent imported signals.
                </p>
                <BlockHeatMap
                  items={activeItems}
                  selectedGenre={selectedGenre}
                  selectedSubgenre={selectedSubgenre}
                  accent={accent}
                />
              </div>

              <div className={`rounded-3xl border p-6 ${panel}`}>
                <h2 className="text-2xl font-bold">My Game Idea Is</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Use this as a reflection tool to position your concept.
                </p>

                <div className="mt-5 space-y-3">
                  <select
                    className="w-full rounded-xl border p-3 text-sm text-slate-800"
                    value={selectedGenre}
                    onChange={(e) => {
                      setSelectedGenre(e.target.value);
                      setSelectedSubgenre("");
                    }}
                  >
                    <option value="">Select Genre</option>
                    {genres.map((genre) => (
                      <option key={genre} value={genre}>
                        {genre}
                      </option>
                    ))}
                  </select>

                  <select
                    className="w-full rounded-xl border p-3 text-sm text-slate-800"
                    value={selectedSubgenre}
                    onChange={(e) => setSelectedSubgenre(e.target.value)}
                  >
                    <option value="">Select Subgenre</option>
                    {subgenres.map((subgenre) => (
                      <option key={subgenre} value={subgenre}>
                        {subgenre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  <ul className="list-disc space-y-2 pl-5">
                    <li>
                      This combination of genre and subgenre makes{" "}
                      <strong>{ideaPercent}%</strong> of the imported{" "}
                      {activePlatform === "roblox" ? "experiences" : "islands"}.
                    </li>
                    <li>
                      This represents a potential pool of{" "}
                      <strong>{formatNumber(totalPlayersInIdea)}</strong> current players.
                    </li>
                    <li>
                      The top similar games are:{" "}
                      <strong>
                        {topSimilar.map((g) => g.title).join(", ") ||
                          "Select a genre to populate suggestions"}
                      </strong>
                      .
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-6 grid gap-4 lg:grid-cols-3">
              <RecommendationBlock
                title="Opportunity"
                panel={panel}
                accent={accent}
                bullets={[
                  activePlatform === "roblox"
                    ? `This segment currently maps to ${formatNumber(
                        totalPlayersInIdea
                      )} players across ${filteredIdeaItems.length} imported experiences.`
                    : `This segment maps to ${filteredIdeaItems.length} imported islands.`,
                  `${ideaPercent}% of the active platform dataset matches this idea profile.`,
                  filteredIdeaItems.length > 5
                    ? "There are enough examples to study repeatable patterns."
                    : "This is a lower-signal area and should be treated as exploratory.",
                ]}
              />

              <RecommendationBlock
                title="Design Cues"
                panel={panel}
                accent={accent}
                tags={topTags(filteredIdeaItems)}
              />

              <RecommendationBlock
                title="Warnings"
                panel={panel}
                accent={accent}
                bullets={[
                  filteredIdeaItems.length < 5
                    ? "This combination has low representation in the imported dataset."
                    : "This combination has visible competition in the imported dataset.",
                  activePlatform === "fortnite"
                    ? "Fortnite signals are metadata-based and do not currently include CCU or retention."
                    : "Roblox signals are based on current player snapshots and inferred classifications.",
                  "Use this as a directional signal, not a prediction of creator outcome.",
                ]}
              />
            </section>

            <section className={`rounded-3xl border p-6 ${panel}`}>
              <h2 className="text-2xl font-bold">
                Top 25{" "}
                {activePlatform === "roblox"
                  ? "Roblox Experiences"
                  : "Fortnite Islands"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {activePlatform === "roblox"
                  ? "Ranked by latest stored current player count."
                  : "Metadata cards for imported Fortnite islands."}
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {(activePlatform === "roblox"
                  ? topRobloxGames
                  : topFortniteIslands
                )
                  .slice(0, 25)
                  .map((item: any, index: number) => (
                    <GameMarketCard
                      key={item.id}
                      item={item}
                      rank={index + 1}
                      platform={activePlatform}
                      panel={panel}
                    />
                  ))}
              </div>
            </section>
          </>
        )}

        <footer className="mt-12 h-20" />
      </div>
    </main>
  );
}

function withLatestRobloxSnapshot(game: any) {
  const snapshots = game.roblox_chart_snapshots ?? [];
  const sorted = [...snapshots].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const latest = sorted[sorted.length - 1];
  const earliest = sorted[0];
  const high = Math.max(...sorted.map((s) => s.current_players ?? 0), 0);
  const gain =
    earliest?.current_players && latest?.current_players
      ? ((latest.current_players - earliest.current_players) /
          Math.max(earliest.current_players, 1)) *
        100
      : 0;

  return {
    ...game,
    snapshots: sorted,
    latestPlayers: latest?.current_players ?? 0,
    playerGainPercent: gain,
    periodHigh: high,
    latestRank: latest?.chart_rank ?? null,
    latestSort: latest?.sort_name ?? null,
  };
}

function withLatestFortniteSnapshot(island: any) {
  const snapshots = island.fortnite_island_snapshots ?? [];
  const latest = [...snapshots].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];

  return {
    ...island,
    raw: island.raw_latest ?? latest?.raw_payload ?? {},
    latestPlayers: 0,
  };
}

function buildGameTrend(game: any) {
  return (game.snapshots ?? []).map((s: any) => ({
    date: formatShortDate(s.created_at),
    total: s.current_players ?? 0,
  }));
}

function buildGenreCandles(games: any[]) {
  const topGenre = buildTopGenreScoreboard(games)[0]?.rawGenre;
  if (!topGenre) return [];

  const byDate: Record<string, number> = {};

  games
    .filter((g) => g.inferred_genre === topGenre)
    .forEach((game) => {
      (game.snapshots ?? []).forEach((s: any) => {
        const date = formatShortDate(s.created_at);
        byDate[date] = (byDate[date] ?? 0) + (s.current_players ?? 0);
      });
    });

  const entries = Object.entries(byDate);
  return entries.map(([date, close], index) => {
    const open = index === 0 ? close : entries[index - 1][1];
    const high = Math.max(open, close);
    const low = Math.min(open, close);
    return { date, open, close, high, low };
  });
}

function findEmergingGame(games: any[]) {
  return [...games].sort(
    (a, b) => (b.playerGainPercent ?? 0) - (a.playerGainPercent ?? 0)
  )[0];
}

function buildImportBars(items: any[]) {
  const byDate: Record<string, number> = {};
  items.forEach((item) => {
    const date = formatShortDate(
      item.last_seen_at ??
        item.created_at ??
        item.snapshots?.[item.snapshots.length - 1]?.created_at ??
        new Date().toISOString()
    );
    byDate[date] = (byDate[date] ?? 0) + 1;
  });
  return Object.values(byDate).slice(-6);
}

function buildTopGenreScoreboard(games: any[]) {
  const map: Record<string, { players: number; count: number }> = {};

  games.forEach((game) => {
    const key = `${game.inferred_genre ?? "Other"} / ${
      game.inferred_subgenre ?? "General"
    }`;
    if (!map[key]) map[key] = { players: 0, count: 0 };
    map[key].players += game.latestPlayers ?? 0;
    map[key].count += 1;
  });

  const rows = Object.entries(map).map(([label, value]) => ({
      label,
      value: formatNumber(value.players),
      rawValue: value.players,
      rawGenre: label.split(" / ")[0],
    }));
  const total = rows.reduce((sum, row) => sum + row.rawValue, 0);

  return rows
    .map((row) => ({
      ...row,
      share: total ? Math.round((row.rawValue / total) * 100) : 0,
    }))
    .sort((a, b) => b.rawValue - a.rawValue)
    .slice(0, 3);
}

function buildFortniteGenreScoreboard(islands: any[]) {
  const map: Record<string, number> = {};
  islands.forEach((island) => {
    const key = `${island.inferred_genre ?? "Other"} / ${
      island.inferred_subgenre ?? "General"
    }`;
    map[key] = (map[key] ?? 0) + 1;
  });

  const total = islands.length;

  return Object.entries(map)
    .map(([label, count]) => ({
      label,
      value: `${count}`,
      rawValue: count,
      share: total ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.rawValue - a.rawValue)
    .slice(0, 3);
}

function getTopGameByUtcDate(games: any[], daysAgo: number) {
  const targetDate = new Date();
  targetDate.setUTCDate(targetDate.getUTCDate() - daysAgo);
  const targetKey = targetDate.toISOString().slice(0, 10);

  return games
    .map((game) => {
      const snapshot = (game.snapshots ?? [])
        .filter((item: any) =>
          String(item.created_at ?? "").startsWith(targetKey)
        )
        .sort(
          (a: any, b: any) =>
            (b.current_players ?? 0) - (a.current_players ?? 0)
        )[0];

      if (!snapshot) return null;

      return {
        title: game.title,
        url: game.url,
        players: snapshot.current_players ?? 0,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.players - a.players)[0];
}

function topTags(items: any[]) {
  const map: Record<string, number> = {};
  items.forEach((item) => {
    (item.extracted_tags ?? []).forEach((tag: string) => {
      map[tag] = (map[tag] ?? 0) + 1;
    });
  });

  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

function buildDataSourceHealth(
  platform: Platform,
  items: any[],
  auditSnapshot?: DataQualitySnapshot
) {
  const today = new Date().toISOString().slice(0, 10);
  const source =
    platform === "roblox"
      ? "Roblox Explore API / discover charts"
      : "Fortnite Data API / ecosystem islands";

  const queriedToday =
    platform === "roblox"
      ? items.filter((item) =>
          (item.snapshots ?? []).some((snapshot: any) =>
            String(snapshot.created_at ?? "").startsWith(today)
          )
        ).length
      : items.filter((item) =>
          String(item.last_seen_at ?? item.created_at ?? "").startsWith(today)
        ).length || items.length;

  const classifiedRecords = items.filter((item) => {
    const hasIdentity = Boolean(item.title);
    const hasUsefulGenre =
      Boolean(item.inferred_genre) && item.inferred_genre !== "Other";
    const hasUsefulSubgenre =
      Boolean(item.inferred_subgenre) && item.inferred_subgenre !== "General";
    const hasSource =
      platform === "roblox"
        ? (item.snapshots ?? []).length > 0
        : Boolean(item.raw_latest ?? item.raw);

    return hasIdentity && hasUsefulGenre && hasUsefulSubgenre && hasSource;
  }).length;

  const fallbackConfidence = items.length
    ? Math.round((classifiedRecords / items.length) * 100)
    : 0;
  const confidence = Math.round(
    auditSnapshot?.confidence_percent ?? fallbackConfidence
  );

  return {
    queriedToday,
    source,
    confidence,
    lastRunLabel: formatUtcTimestamp(
      auditSnapshot?.created_at ?? getLatestSourceTimestamp(platform, items)
    ),
  };
}

function getLatestSourceTimestamp(platform: Platform, items: any[]) {
  const timestamps = items.flatMap((item) => {
    if (platform === "roblox") {
      return (item.snapshots ?? []).map((snapshot: any) => snapshot.created_at);
    }

    return [
      item.last_seen_at,
      item.created_at,
      ...(item.fortnite_island_snapshots ?? []).map(
        (snapshot: any) => snapshot.created_at
      ),
    ];
  });

  return timestamps
    .filter(Boolean)
    .sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    )[0];
}

function formatUtcTimestamp(value?: string) {
  if (!value) return "Last query snapshot: not available yet";

  return `Last query snapshot: ${new Date(value)
    .toISOString()
    .replace(".000Z", "Z")} UTC`;
}

function DataSourceHealthCard({
  title,
  items,
  lastRunLabel,
  panel,
  accent,
}: any) {
  return (
    <div className={`rounded-3xl border p-5 ${panel}`}>
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <ul className="mt-4 space-y-3 text-sm leading-6">
        {items.map((item: string) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full" style={{ backgroundColor: accent }} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-slate-200 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {lastRunLabel}
      </p>
    </div>
  );
}

function MiniBarKpi({ title, value, bars, panel, accent }: any) {
  const max = Math.max(...bars, 1);

  return (
    <div className={`rounded-3xl border p-5 ${panel}`}>
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <h3 className="mt-1 text-3xl font-black">{value}</h3>
      <div className="mt-5 flex h-12 items-end gap-1">
        {bars.map((bar: number, index: number) => (
          <div
            key={index}
            className="w-full rounded-t"
            style={{
              height: `${Math.max(8, (bar / max) * 48)}px`,
              backgroundColor: accent,
              opacity: index === bars.length - 1 ? 1 : 0.25,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ScoreboardCard({
  title,
  subtitle,
  items,
  references,
  panel,
  accent,
}: any) {
  return (
    <div className={`rounded-3xl border p-5 ${panel}`}>
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="text-xs text-slate-400">{subtitle}</p>
      <div className="mt-4 space-y-2">
        {items.map((item: any, index: number) => {
          const content = (
            <>
              <span className="w-5 flex-none text-xs font-bold text-slate-400">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug">
                {item.label}
              </span>
              <span
                className="flex-none text-right text-sm font-black"
                style={{ color: accent }}
              >
                {item.value}
              </span>
            </>
          );

          return item.href ? (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-2 rounded-xl px-1 py-1 transition hover:bg-slate-100/70"
            >
              {content}
            </a>
          ) : (
            <div key={item.label} className="flex items-start gap-2 px-1 py-1">
              {content}
            </div>
          );
        })}
      </div>
      {references?.length ? (
        <div className="mt-4 space-y-2 border-t border-slate-200 pt-3">
          {references.map((reference: any) => {
            const value = reference.href ? (
              <a
                href={reference.href}
                target="_blank"
                rel="noreferrer"
                className="font-bold hover:underline"
                style={{ color: accent }}
              >
                {reference.value}
              </a>
            ) : (
              <span className="font-bold text-slate-500">
                {reference.value}
              </span>
            );

            return (
              <p
                key={reference.label}
                className="text-xs leading-5 text-slate-500"
              >
                <span className="font-semibold">{reference.label}:</span>{" "}
                {value}
              </p>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function GenreShareCard({ title, subtitle, items, panel, accent }: any) {
  return (
    <div className={`rounded-3xl border p-5 ${panel}`}>
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="text-xs text-slate-400">{subtitle}</p>
      <div className="mt-4 space-y-4">
        {items.map((item: any) => (
          <div key={item.label}>
            <div className="mb-1 flex items-start justify-between gap-3">
              <p className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug">
                {item.label}
              </p>
              <span
                className="flex-none text-sm font-black"
                style={{ color: accent }}
              >
                {item.share}%
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(item.share, 4)}%`,
                  backgroundColor: accent,
                }}
              />
            </div>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendingCard({ title, item, panel, accent, platform }: any) {
  return (
    <div className={`rounded-3xl border p-5 ${panel}`}>
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <h3 className="mt-2 line-clamp-2 text-xl font-black">
        {item?.title ?? "N/A"}
      </h3>
      <p className="mt-2 text-sm font-bold text-green-600">
        {platform === "roblox"
          ? `${Math.round(item?.playerGainPercent ?? 0)}% ▲`
          : "Metadata Signal"}
      </p>
      <p className="mt-1 text-xs text-slate-400">
        {platform === "roblox"
          ? "Compared against earliest stored snapshot"
          : item?.inferred_genre ?? "Imported Island"}
      </p>
    </div>
  );
}

function ChartCard({ title, subtitle, panel, children }: any) {
  return (
    <div className={`rounded-3xl border p-5 ${panel}`}>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mb-4 text-sm text-slate-500">{subtitle}</p>
      <div className="h-64">{children}</div>
    </div>
  );
}

function AreaTrend({ data, accent }: any) {
  if (!data.length) return <Unavailable text="No snapshots available yet." />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="4 4" stroke="#d9dde5" />
        <XAxis dataKey="date" fontSize={11} />
        <YAxis fontSize={11} />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="total"
          stroke={accent}
          fill={accent}
          fillOpacity={0.18}
          strokeWidth={3}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function CandleVisual({ data, accent }: any) {
  if (!data.length) return <Unavailable text="No genre snapshots available." />;

  const max = Math.max(...data.map((d: any) => d.high), 1);

  return (
    <div className="flex h-full items-end gap-3 overflow-x-auto pb-6">
      {data.map((d: any) => {
        const closeY = (d.close / max) * 180;
        const openY = (d.open / max) * 180;
        const highY = (d.high / max) * 180;
        const lowY = (d.low / max) * 180;
        const up = d.close >= d.open;

        return (
          <div key={d.date} className="flex min-w-10 flex-col items-center">
            <div className="relative h-48 w-6">
              <div
                className="absolute left-1/2 w-px -translate-x-1/2 bg-slate-400"
                style={{
                  bottom: `${lowY}px`,
                  height: `${Math.max(4, highY - lowY)}px`,
                }}
              />
              <div
                className="absolute left-0 w-6 rounded-sm"
                style={{
                  bottom: `${Math.min(openY, closeY)}px`,
                  height: `${Math.max(8, Math.abs(closeY - openY))}px`,
                  backgroundColor: up ? accent : "#ef4444",
                }}
              />
            </div>
            <span className="mt-1 text-[10px] text-slate-400">{d.date}</span>
          </div>
        );
      })}
    </div>
  );
}

function EmergingGameVisual({ game, accent, metadataOnly = false }: any) {
  if (!game) return <Unavailable text="No emerging game available." />;

  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <h4 className="text-2xl font-black">{game.title}</h4>
        <p className="mt-2 text-sm text-slate-500">
          {metadataOnly
            ? game.inferred_genre ?? "Metadata Signal"
            : `${formatNumber(game.latestPlayers)} current players`}
        </p>
      </div>

      {game.thumbnail_url && (
        <img
          src={game.thumbnail_url}
          alt={game.title}
          className="mt-4 h-24 w-full rounded-2xl object-cover"
        />
      )}

      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        <p className="text-sm text-slate-500">
          {metadataOnly ? "Signal" : "Player Gain"}
        </p>
        <p className="text-3xl font-black" style={{ color: accent }}>
          {metadataOnly
            ? game.design_pattern ?? "Metadata"
            : `${Math.round(game.playerGainPercent ?? 0)}% ▲`}
        </p>
      </div>
    </div>
  );
}

function BlockHeatMap({ items, selectedGenre, selectedSubgenre, accent }: any) {
  const grouped = buildHeatMapItems(items);
  const selectedKey =
    selectedGenre && selectedSubgenre
      ? `${selectedGenre} / ${selectedSubgenre}`
      : selectedGenre || "";

  const cells = [
    "#35d399", "#35d399", "#d8df24", "#ffcf22",
    "#35d399", "#d8df24", "#ffcf22", "#ffad32",
    "#d8df24", "#ffcf22", "#ffad32", "#f87171",
    "#ffcf22", "#ffad32", "#f87171", "#f87171",
  ];

  return (
    <div className="mt-6">
      <div className="relative mx-auto grid max-w-xl grid-cols-4 overflow-hidden rounded-xl border-2 border-slate-900">
        {cells.map((color, i) => (
          <div
            key={i}
            className="relative h-28 border border-slate-900"
            style={{ backgroundColor: color }}
          >
            {grouped
              .filter((item: any) => item.cell === i)
              .slice(0, 2)
              .map((item: any) => {
                const active =
                  item.label === selectedKey ||
                  item.genre === selectedGenre ||
                  item.subgenre === selectedSubgenre;

                return (
                  <div
                    key={item.label}
                    className="absolute rounded-full px-2 py-1 text-[10px] font-bold shadow"
                    style={{
                      left: `${item.x}%`,
                      top: `${item.y}%`,
                      backgroundColor: active ? accent : "white",
                      color: active ? "white" : "#1e293b",
                      border: active ? "2px solid #111827" : "1px solid #cbd5e1",
                    }}
                    title={`${item.label} · ${item.count} records`}
                  >
                    {item.genre.slice(0, 10)}
                  </div>
                );
              })}
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500">
        <p>
          <strong>Opportunity proxy:</strong> derived from record concentration,
          current players where available, and repeatable design patterns.
        </p>
        <p>
          <strong>Higher demand / visibility:</strong> based on player pools for
          Roblox and imported metadata frequency for Fortnite.
        </p>
      </div>
    </div>
  );
}

function RecommendationBlock({ title, text, bullets, tags, panel, accent }: any) {
  const total = tags?.reduce((sum: number, tag: any) => sum + tag.value, 0) ?? 0;
  const pieColors = [accent, "#d6a06d", "#5b5d78", "#94a3b8", "#cbd5e1"];

  return (
    <div className={`rounded-3xl border p-5 ${panel}`}>
      <h3 className="text-xl font-bold">{title}</h3>

      {tags?.length ? (
        <div className="mt-4 grid grid-cols-[130px_1fr] gap-4">
          <PieChart width={130} height={130}>
            <Pie
              data={tags}
              dataKey="value"
              nameKey="name"
              innerRadius={42}
              outerRadius={62}
              paddingAngle={2}
            >
              {tags.map((_: any, index: number) => (
                <Cell key={index} fill={pieColors[index % pieColors.length]} />
              ))}
            </Pie>
          </PieChart>

          <div className="space-y-2">
            {tags.map((tag: any, index: number) => {
              const percent = total
                ? Math.round((tag.value / total) * 100)
                : 0;

              return (
                <div key={tag.name} className="flex items-center justify-between gap-3">
                  <span className="text-sm">{tag.name}</span>
                  <span className="font-bold" style={{ color: pieColors[index % pieColors.length] }}>
                    {percent}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : bullets?.length ? (
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-500">
          {bullets.map((bullet: string) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-6 text-slate-500">{text}</p>
      )}
    </div>
  );
}

function GameMarketCard({ item, rank, platform, panel }: any) {
  const positive = (item.playerGainPercent ?? 0) >= 0;

  return (
    <a
      href={item.url ?? `https://fortnite.gg/island?code=${item.island_code}`}
      target="_blank"
      rel="noreferrer"
      className={`rounded-3xl border p-4 shadow-sm transition hover:-translate-y-0.5 ${panel}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-sm font-black">{item.title}</h3>
        <span className="text-xs font-bold text-slate-400">#{rank}</span>
      </div>

      {item.thumbnail_url && (
        <img
          src={item.thumbnail_url}
          alt={item.title}
          className="mt-3 h-24 w-full rounded-2xl object-cover"
        />
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-slate-400">
            {platform === "roblox" ? "Gain" : "Genre"}
          </p>
          <p
            className={`font-black ${
              platform === "roblox"
                ? positive
                  ? "text-green-600"
                  : "text-red-500"
                : ""
            }`}
          >
            {platform === "roblox"
              ? `${Math.round(item.playerGainPercent ?? 0)}% ${
                  positive ? "▲" : "▼"
                }`
              : item.inferred_genre ?? "Other"}
          </p>
        </div>

        <div>
          <p className="text-slate-400">
            {platform === "roblox" ? "Period H" : "Intent"}
          </p>
          <p className="font-black">
            {platform === "roblox"
              ? formatNumber(item.periodHigh)
              : item.player_intent ?? "N/A"}
          </p>
        </div>

        <div className="col-span-2">
          <p className="text-slate-400">Ranking</p>
          <p className="font-black">
            {platform === "roblox"
              ? `#${item.latestRank ?? "N/A"} in ${item.latestSort ?? "Chart"}`
              : item.competition_level ?? "Metadata"}
          </p>
        </div>
      </div>
    </a>
  );
}

function ToggleGroup({ children }: any) {
  return <div className="flex rounded-full bg-slate-100 p-1">{children}</div>;
}

function ToggleButton({ active, onClick, children, activeColor }: any) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-4 py-2 text-sm font-bold transition"
      style={{
        backgroundColor: active ? activeColor : "transparent",
        color: active ? "white" : "#64748b",
      }}
    >
      {children}
    </button>
  );
}

function Unavailable({ text }: any) {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function TopGamesTrend({ games }: any) {
  const data = mergeGameTrends(games);
  const colors = ["#5fbfd0", "#7c3aed", "#d6a06d", "#5b5d78", "#16a34a"];

  if (!data.length) return <Unavailable text="No game snapshots available." />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="4 4" stroke="#d9dde5" />
        <XAxis dataKey="date" fontSize={11} />
        <YAxis fontSize={11} />
        <Tooltip />
        {games.slice(0, 25).map((game: any, index: number) => (
          <Line
            key={game.id}
            type="monotone"
            dataKey={game.title}
            stroke={colors[index % colors.length]}
            strokeWidth={index < 5 ? 2 : 1}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function GenreLinesTrend({ games }: any) {
  const { data, genres } = mergeGenreTrends(games);
  const colors = ["#5fbfd0", "#7c3aed", "#d6a06d", "#5b5d78", "#16a34a", "#ef4444"];

  if (!data.length) return <Unavailable text="No genre snapshots available." />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="4 4" stroke="#d9dde5" />
        <XAxis dataKey="date" fontSize={11} />
        <YAxis fontSize={11} />
        <Tooltip />
        <Legend />
        {genres.map((genre: string, index: number) => (
          <Line
            key={genre}
            type="monotone"
            dataKey={genre}
            stroke={colors[index % colors.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function mergeGameTrends(games: any[]) {
  const byDate: Record<string, any> = {};

  games.forEach((game) => {
    (game.snapshots ?? []).forEach((s: any) => {
      const date = formatShortDate(s.created_at);
      if (!byDate[date]) byDate[date] = { date };
      byDate[date][game.title] = s.current_players ?? 0;
    });
  });

  return Object.values(byDate);
}

function mergeGenreTrends(games: any[]) {
  const byGenreTotals: Record<string, number> = {};

  games.forEach((game) => {
    byGenreTotals[game.inferred_genre ?? "Other"] =
      (byGenreTotals[game.inferred_genre ?? "Other"] ?? 0) +
      (game.latestPlayers ?? 0);
  });

  const genres = Object.entries(byGenreTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([genre]) => genre);

  const byDate: Record<string, any> = {};

  games
    .filter((game) => genres.includes(game.inferred_genre ?? "Other"))
    .forEach((game) => {
      (game.snapshots ?? []).forEach((s: any) => {
        const date = formatShortDate(s.created_at);
        const genre = game.inferred_genre ?? "Other";
        if (!byDate[date]) byDate[date] = { date };
        byDate[date][genre] = (byDate[date][genre] ?? 0) + (s.current_players ?? 0);
      });
    });

  return { data: Object.values(byDate), genres };
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
        patterns: new Set(),
      };
    }

    map[key].count += 1;
    map[key].players += item.latestPlayers ?? 0;
    if (item.design_pattern) map[key].patterns.add(item.design_pattern);
  });

  const values = Object.values(map);
  const maxPlayers = Math.max(...values.map((v: any) => v.players), 1);
  const maxCount = Math.max(...values.map((v: any) => v.count), 1);

  return values.map((item: any, index: number) => {
    const demand = item.players / maxPlayers || item.count / maxCount;
    const opportunity = Math.min(1, (item.patterns.size + item.count / maxCount) / 2);

    const col = Math.min(3, Math.floor(demand * 4));
    const row = Math.min(3, Math.floor((1 - opportunity) * 4));
    const cell = row * 4 + col;

    return {
      ...item,
      cell,
      x: 20 + ((index * 31) % 60),
      y: 20 + ((index * 47) % 60),
    };
  });
}

function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatNumber(value: number | undefined) {
  const number = value ?? 0;
  if (number >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(1)}K`;
  return `${number}`;
}

function parseNumber(value: string) {
  if (value.includes("M")) return parseFloat(value) * 1000000;
  if (value.includes("K")) return parseFloat(value) * 1000;
  return parseFloat(value) || 0;
}
