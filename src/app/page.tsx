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
          monetization_style,
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

            <section className="mb-6 grid gap-6 lg:grid-cols-3">
              <KeywordCloudCard
                title="Top 25 Keyword Cloud"
                subtitle="Most common terms in leading game descriptions"
                items={buildKeywordCloud(
                  activePlatform === "roblox"
                    ? topRobloxGames.slice(0, 25)
                    : topFortniteIslands.slice(0, 25)
                )}
                panel={panel}
                accent={accent}
              />

              <TemplatePatternCard
                title="Common Structure"
                subtitle="Most repeated design pattern in the top set"
                template={buildCommonTemplate(
                  activePlatform === "roblox"
                    ? topRobloxGames.slice(0, 25)
                    : topFortniteIslands.slice(0, 25)
                )}
                panel={panel}
                accent={accent}
              />

              <ColorBreakdownCard
                title="Top Tile Colors"
                subtitle="RGB breakdown from the five most played tiles"
                games={
                  activePlatform === "roblox"
                    ? topRobloxGames.slice(0, 5)
                    : topFortniteIslands.slice(0, 5)
                }
                panel={panel}
                accent={accent}
              />
            </section>

            <section className="mb-6">
              <div className={`rounded-3xl border p-6 ${panel}`}>
                <h2 className="text-2xl font-bold">Opportunity Map</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Green indicates stronger opportunity; red indicates weaker opportunity or higher risk.
                </p>
                <BlockHeatMap
                  items={activeItems}
                  selectedGenre={selectedGenre}
                  selectedSubgenre={selectedSubgenre}
                  platform={activePlatform}
                  panel={panel}
                />
              </div>
            </section>

            <section className="mb-6">
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
	                  </ul>
                    <div className="mt-5 border-t border-slate-200 pt-4">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                        Similar top games
                      </p>
                      {topSimilar.length ? (
                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          {topSimilar.map((item: any, index: number) => (
                            <MiniSimilarGameCard
                              key={item.id}
                              item={item}
                              rank={index + 1}
                              platform={activePlatform}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-slate-500">
                          Select a genre to populate suggestions.
                        </p>
                      )}
                    </div>
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

function buildKeywordCloud(items: any[]) {
  const stopWords = new Set([
    "the",
    "and",
    "for",
    "with",
    "you",
    "your",
    "are",
    "can",
    "this",
    "that",
    "from",
    "into",
    "play",
    "game",
    "games",
    "roblox",
    "experience",
    "new",
    "all",
    "get",
    "now",
    "more",
    "will",
    "have",
    "has",
    "our",
    "out",
    "join",
    "use",
  ]);
  const counts: Record<string, number> = {};

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

  const max = Math.max(...Object.values(counts), 1);

  return Object.entries(counts)
    .map(([word, count]) => ({
      word,
      count,
      size: 13 + Math.round((count / max) * 17),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 18)
    .map((item, rank) => ({ ...item, rank }));
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
      .filter(Boolean)
      .slice(0, 4),
  };
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

  const href = game.url ?? `https://fortnite.gg/island?code=${game.island_code}`;
  const metric = metadataOnly
    ? game.design_pattern ?? "Metadata"
    : `${Math.round(game.playerGainPercent ?? 0)}% ▲`;
  const detail = metadataOnly
    ? game.inferred_genre ?? "Metadata Signal"
    : `${formatNumber(game.latestPlayers)} current players`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group block h-full"
    >
      <div className="relative mx-auto aspect-square h-full max-h-64 overflow-hidden rounded-2xl bg-slate-900 shadow-sm">
        {game.thumbnail_url ? (
          <img
            src={game.thumbnail_url}
            alt={game.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-200 text-sm font-bold text-slate-500">
            No image
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <p className="mb-2 inline-flex rounded-full bg-white/15 px-2 py-1 text-[10px] font-black uppercase tracking-wide backdrop-blur">
            {metadataOnly ? "Signal" : "Player Gain"}
          </p>
          <h4 className="line-clamp-2 text-lg font-black leading-tight">
            {game.title}
          </h4>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-xs font-semibold text-white/75">{detail}</p>
            <p className="text-xl font-black" style={{ color: accent }}>
              {metric}
            </p>
          </div>
        </div>
      </div>
    </a>
  );
}

function KeywordCloudCard({ title, subtitle, items, panel, accent }: any) {
  return (
    <div className={`rounded-3xl border p-5 ${panel}`}>
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="text-xs text-slate-400">{subtitle}</p>
      <div className="mt-5 flex min-h-48 flex-wrap content-center items-center gap-x-3 gap-y-2">
        {items.length ? (
          items.map((item: any) => (
            <span
              key={item.word}
              className="font-black leading-none"
              style={{
                color: item.rank < 4 ? accent : undefined,
                fontSize: `${item.size}px`,
                opacity: item.rank < 6 ? 1 : 0.72,
              }}
            >
              {item.word}
            </span>
          ))
        ) : (
          <Unavailable text="No description keywords available yet." />
        )}
      </div>
    </div>
  );
}

function TemplatePatternCard({ title, subtitle, template, panel, accent }: any) {
  return (
    <div className={`rounded-3xl border p-5 ${panel}`}>
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="text-xs text-slate-400">{subtitle}</p>

      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
          Mini Template
        </p>
        <h3 className="mt-2 text-xl font-black leading-tight">
          {template.pattern}
        </h3>
        <div className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
          {template.steps.map((step: string, index: number) => (
            <div key={step} className="flex gap-2">
              <span
                className="mt-1 flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] font-black text-white"
                style={{ backgroundColor: accent }}
              >
                {index + 1}
              </span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Seen in {template.count} of the top 25 records.
      </p>
    </div>
  );
}

function ColorBreakdownCard({ title, subtitle, games, panel, accent }: any) {
  const [colors, setColors] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadColors() {
      const extracted = await Promise.all(
        games.map(async (game: any, index: number) => {
          const color = await extractDominantColor(game.thumbnail_url);
          return {
            title: game.title,
            color: color ?? fallbackTileColors[index % fallbackTileColors.length],
          };
        })
      );

      if (!cancelled) setColors(extracted);
    }

    loadColors();

    return () => {
      cancelled = true;
    };
  }, [games]);

  const visibleColors = colors.length
    ? colors
    : games.map((game: any, index: number) => ({
        title: game.title,
        color: fallbackTileColors[index % fallbackTileColors.length],
      }));

  return (
    <div className={`rounded-3xl border p-5 ${panel}`}>
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="text-xs text-slate-400">{subtitle}</p>

      <div className="mt-5 space-y-3">
        {visibleColors.map((item: any) => (
          <div key={item.title} className="grid grid-cols-[2.25rem_1fr_auto] items-center gap-3">
            <div
              className="h-9 w-9 rounded-lg border border-black/10"
              style={{ backgroundColor: item.color.hex }}
            />
            <p className="line-clamp-2 text-sm font-semibold leading-snug">
              {item.title}
            </p>
            <p
              className="rounded-full px-2 py-1 text-[10px] font-black"
              style={{
                backgroundColor: `${accent}1f`,
                color: accent,
              }}
            >
              {item.color.rgb}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BlockHeatMap({
  items,
  selectedGenre,
  selectedSubgenre,
  platform,
  panel,
}: any) {
  const [monetizationFilter, setMonetizationFilter] =
    useState<"monetized" | "unmonetized">("monetized");
  const filteredItems = items.filter((item: any) =>
    monetizationFilter === "monetized"
      ? isMonetizedItem(item, platform)
      : !isMonetizedItem(item, platform)
  );
  const maps = [
    buildOpportunityMap(filteredItems, "demand-saturation", platform),
    buildOpportunityMap(filteredItems, "velocity-saturation", platform),
    buildOpportunityMap(filteredItems, "demand-complexity", platform),
  ];
  const selectedKey =
    selectedGenre && selectedSubgenre
      ? `${selectedGenre} / ${selectedSubgenre}`
      : selectedGenre || "";

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Showing {formatNumber(filteredItems.length)}{" "}
          {monetizationFilter} records in the opportunity maps.
        </p>
        <ToggleGroup>
          <ToggleButton
            active={monetizationFilter === "monetized"}
            onClick={() => setMonetizationFilter("monetized")}
            activeColor="#2fb8bd"
          >
            Monetized
          </ToggleButton>
          <ToggleButton
            active={monetizationFilter === "unmonetized"}
            onClick={() => setMonetizationFilter("unmonetized")}
            activeColor="#2fb8bd"
          >
            Unmonetized
          </ToggleButton>
        </ToggleGroup>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <OpportunityMapCard
          map={maps[0]}
          selectedKey={selectedKey}
          selectedGenre={selectedGenre}
          selectedSubgenre={selectedSubgenre}
        />
        <OpportunityMapCard
          map={maps[1]}
          selectedKey={selectedKey}
          selectedGenre={selectedGenre}
          selectedSubgenre={selectedSubgenre}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <OpportunityMapCard
          map={maps[2]}
          selectedKey={selectedKey}
          selectedGenre={selectedGenre}
          selectedSubgenre={selectedSubgenre}
        />
        <ReadOutCard
          maps={maps}
          panel={panel}
        />
      </div>
    </div>
  );
}

function OpportunityMapCard({
  map,
  selectedKey,
  selectedGenre,
  selectedSubgenre,
}: any) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-black">{map.title}</h3>
          <p className="text-xs text-slate-500">{map.subtitle}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
          {map.colorLabel}
        </span>
      </div>

      <OpportunityGrid
        map={map}
        selectedKey={selectedKey}
        selectedGenre={selectedGenre}
        selectedSubgenre={selectedSubgenre}
      />

      <div className="mt-2 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        <span>{map.xLow}</span>
        <span>{map.xHigh}</span>
      </div>
      <p className="mt-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
        X-axis: {map.xLabel}
      </p>
      <p className="mt-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
        Y-axis: {map.yLabel}
      </p>

      <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
        <p>
          <strong>X calculation:</strong> {map.xFormula}
        </p>
        <p>
          <strong>Y calculation:</strong> {map.yFormula}
        </p>
        <p>
          <strong>Color:</strong> {map.colorFormula}
        </p>
      </div>
    </div>
  );
}

function OpportunityGrid({ map, selectedKey, selectedGenre, selectedSubgenre }: any) {
  return (
    <div className="relative mx-auto grid max-w-xl grid-cols-4 rounded-xl border-2 border-slate-900">
      {Array.from({ length: 16 }).map((_, i) => (
        <div
          key={i}
          className="min-h-32 border border-slate-900 p-1.5"
          style={{ backgroundColor: opportunityCellColor(i) }}
        >
          {map.items
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
                  className="mb-1 rounded-lg px-2 py-1 text-[9px] font-bold leading-tight shadow"
                  style={{
                    backgroundColor: active
                      ? "rgba(17, 24, 39, 0.74)"
                      : "rgba(255, 255, 255, 0.5)",
                    color: active ? "white" : "#1e293b",
                    border: active
                      ? "2px solid rgba(255, 255, 255, 0.9)"
                      : "1px solid rgba(148, 163, 184, 0.55)",
                  }}
                  title={`${item.label} · score ${Math.round(item.score * 100)}`}
                >
                  <span className="block">{item.genre}</span>
                  <span className="block font-semibold opacity-70">
                    {item.subgenre}
                  </span>
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
}

function ReadOutCard({ maps, panel }: any) {
  const leaders = maps
    .map((map: any) => map.items[0] ? { ...map.items[0], lens: map.title } : null)
    .filter(Boolean);
  const strongest = leaders.sort((a: any, b: any) => b.score - a.score)[0];

  return (
    <div className={`rounded-3xl border p-6 ${panel}`}>
      <h2 className="text-2xl font-bold">Read Out</h2>
      <p className="mt-1 text-sm text-slate-500">
        Synthesis across demand, saturation, velocity, and build complexity.
      </p>

      {strongest ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
              Strongest signal
            </p>
            <h3 className="mt-2 text-xl font-black leading-tight">
              {strongest.label}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              This segment scores highest in <strong>{strongest.lens}</strong>,
              with {formatNumber(strongest.players)} players across{" "}
              {strongest.count} records.
            </p>
          </div>

          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-500">
            {leaders.map((leader: any) => (
              <li key={leader.lens}>
                <strong>{leader.lens}:</strong> {leader.label}
              </li>
            ))}
          </ul>

          <div className="rounded-2xl border border-slate-200 p-4 text-sm leading-6 text-slate-600">
            <strong>Creator interpretation:</strong>{" "}
            prioritize ideas that appear green in more than one lens; treat
            red/yellow areas as either crowded, slow-moving, or expensive to build.
          </div>
        </div>
      ) : (
        <Unavailable text="Not enough classified records to generate a read out." />
      )}
    </div>
  );
}

function opportunityCellColor(index: number) {
  const col = index % 4;
  const row = Math.floor(index / 4);
  const score = (col + (3 - row)) / 6;

  if (score >= 0.72) return "#2fb8bd";
  if (score >= 0.48) return "#d9e75f";
  if (score >= 0.28) return "#fedb7a";
  return "#fee2e2";
}

function buildOpportunityMap(items: any[], lens: string, platform: Platform) {
  const grouped = buildHeatMapItems(items);
  const maxPlayers = Math.max(...grouped.map((item: any) => item.players), 1);
  const maxCount = Math.max(...grouped.map((item: any) => item.count), 1);
  const maxVelocity = Math.max(...grouped.map((item: any) => Math.abs(item.velocity)), 1);
  const demandFormula =
    platform === "roblox"
      ? "Current player pool divided by the largest segment player pool."
      : "Imported island count in the segment divided by the largest segment count.";
  const velocityFormula =
    platform === "roblox"
      ? "Average player gain percentage for the segment, normalized against the fastest segment."
      : "Imported metadata movement is not available yet, so this lens uses current segment activity as a temporary proxy.";

  const config: Record<string, any> = {
    "demand-saturation": {
      id: "demand-saturation",
      title: "Demand vs Saturation",
      subtitle: "Find demand that is not already overcrowded.",
      xLabel: "Audience Demand",
      yLabel: "Market Saturation",
      xLow: "Lower demand",
      xHigh: "Higher demand",
      colorLabel: "Opportunity",
      xFormula: demandFormula,
      yFormula: "Number of records in this genre/subgenre divided by the most represented segment.",
      colorFormula: "Demand score discounted by saturation; greener means high demand without extreme crowding.",
      x: (item: any) => item.players / maxPlayers || item.count / maxCount,
      y: (item: any) => item.count / maxCount,
      score: (x: number, y: number) => x * (1 - y * 0.65),
    },
    "velocity-saturation": {
      id: "velocity-saturation",
      title: "Velocity vs Saturation",
      subtitle: "Find categories moving upward before they get crowded.",
      xLabel: "Trend Velocity",
      yLabel: "Market Saturation",
      xLow: "Slower",
      xHigh: "Faster",
      colorLabel: "Momentum",
      xFormula: velocityFormula,
      yFormula: "Number of records in this genre/subgenre divided by the most represented segment.",
      colorFormula: "Velocity score discounted by saturation; greener means faster movement with less crowding.",
      x: (item: any) =>
        platform === "roblox"
          ? Math.max(0, item.velocity) / maxVelocity
          : item.count / maxCount,
      y: (item: any) => item.count / maxCount,
      score: (x: number, y: number) => x * (1 - y * 0.55),
    },
    "demand-complexity": {
      id: "demand-complexity",
      title: "Demand vs Build Complexity",
      subtitle: "Find strong demand with manageable production effort.",
      xLabel: "Audience Demand",
      yLabel: "Build Complexity",
      xLow: "Lower demand",
      xHigh: "Higher demand",
      colorLabel: "Feasibility",
      xFormula: demandFormula,
      yFormula: "Average inferred build complexity: low is lower on the map, high is higher on the map.",
      colorFormula: "Demand score discounted by build complexity; greener means strong demand with manageable effort.",
      x: (item: any) => item.players / maxPlayers || item.count / maxCount,
      y: (item: any) => item.complexity,
      score: (x: number, y: number) => x * (1 - y * 0.5),
    },
  };

  const activeConfig = config[lens];

  return {
    ...activeConfig,
    items: grouped
      .map((item: any, index: number) => {
        const x = clamp01(activeConfig.x(item));
        const y = clamp01(activeConfig.y(item));
        const col = Math.min(3, Math.floor(x * 4));
        const row = Math.min(3, Math.floor(y * 4));

        return {
          ...item,
          score: clamp01(activeConfig.score(x, y)),
          cell: row * 4 + col,
          x: 14 + ((index * 31) % 58),
          y: 18 + ((index * 47) % 54),
        };
      })
      .sort((a: any, b: any) => b.score - a.score),
  };
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function complexityScore(value: string) {
  if (/low/i.test(value)) return 0.2;
  if (/high/i.test(value)) return 0.9;
  return 0.55;
}

function isMonetizedItem(item: any, platform: Platform) {
  if (platform === "roblox") {
    return Boolean(
      item.monetization_style &&
        item.monetization_style !== "Unknown" &&
        item.monetization_style !== "None"
    );
  }

  const text = [
    item.title,
    item.description,
    item.core_loop,
    item.design_pattern,
    item.player_intent,
    ...(item.extracted_tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /shop|store|coin|coins|currency|purchase|premium|pass|battle pass|skin|skins|cosmetic|reward/.test(
    text
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

function MiniSimilarGameCard({ item, rank, platform }: any) {
  const positive = (item.playerGainPercent ?? 0) >= 0;
  const href = item.url ?? `https://fortnite.gg/island?code=${item.island_code}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-xs font-black leading-snug">
          {item.title}
        </h3>
        <span className="text-[10px] font-bold text-slate-400">#{rank}</span>
      </div>

      {item.thumbnail_url && (
        <img
          src={item.thumbnail_url}
          alt={item.title}
          className="mt-2 aspect-square w-full rounded-xl object-cover"
        />
      )}

      <div className="mt-3 text-[11px] leading-4">
        <p className="text-slate-400">
          {platform === "roblox" ? "Players" : "Genre"}
        </p>
        <p className="font-black">
          {platform === "roblox"
            ? formatNumber(item.latestPlayers)
            : item.inferred_genre ?? "Other"}
        </p>
        {platform === "roblox" && (
          <p className={positive ? "font-bold text-green-600" : "font-bold text-red-500"}>
            {Math.round(item.playerGainPercent ?? 0)}% {positive ? "▲" : "▼"}
          </p>
        )}
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
        velocityTotal: 0,
        complexityTotal: 0,
        patterns: new Set(),
      };
    }

    map[key].count += 1;
    map[key].players += item.latestPlayers ?? 0;
    map[key].velocityTotal += item.playerGainPercent ?? 0;
    map[key].complexityTotal += complexityScore(item.build_complexity ?? "Medium");
    if (item.design_pattern) map[key].patterns.add(item.design_pattern);
  });

  const values = Object.values(map);

  return values.map((item: any) => {
    return {
      ...item,
      velocity: item.count ? item.velocityTotal / item.count : 0,
      complexity: item.count ? item.complexityTotal / item.count : 0.55,
    };
  });
}

const fallbackTileColors = [
  { hex: "#5fbfd0", rgb: "RGB 95, 191, 208" },
  { hex: "#7c3aed", rgb: "RGB 124, 58, 237" },
  { hex: "#d6a06d", rgb: "RGB 214, 160, 109" },
  { hex: "#16a34a", rgb: "RGB 22, 163, 74" },
  { hex: "#5b5d78", rgb: "RGB 91, 93, 120" },
];

function extractDominantColor(src?: string) {
  if (!src || typeof window === "undefined") {
    return Promise.resolve(null);
  }

  return new Promise<{ hex: string; rgb: string } | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.referrerPolicy = "no-referrer";

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });

        if (!context) {
          resolve(null);
          return;
        }

        canvas.width = 24;
        canvas.height = 24;
        context.drawImage(image, 0, 0, 24, 24);

        const data = context.getImageData(0, 0, 24, 24).data;
        let red = 0;
        let green = 0;
        let blue = 0;
        let count = 0;

        for (let index = 0; index < data.length; index += 16) {
          const alpha = data[index + 3];
          if (alpha < 128) continue;

          red += data[index];
          green += data[index + 1];
          blue += data[index + 2];
          count += 1;
        }

        if (!count) {
          resolve(null);
          return;
        }

        const r = Math.round(red / count);
        const g = Math.round(green / count);
        const b = Math.round(blue / count);

        resolve({
          hex: rgbToHex(r, g, b),
          rgb: `RGB ${r}, ${g}, ${b}`,
        });
      } catch {
        resolve(null);
      }
    };

    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
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
