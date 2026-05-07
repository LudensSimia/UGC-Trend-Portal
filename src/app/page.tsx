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
  const [topGamesTrendLimit, setTopGamesTrendLimit] = useState<25 | 50>(25);
  const [topGamesTrendPercentile, setTopGamesTrendPercentile] =
    useState<25 | 50 | 75 | 100>(100);
  const [genreTrendLimit, setGenreTrendLimit] = useState<25 | 50>(25);
  const [genreTrendPercentile, setGenreTrendPercentile] =
    useState<25 | 50 | 75 | 100>(100);
  const [predictionSearch, setPredictionSearch] = useState("");
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
            rank,
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
    return [...fortniteIslands].sort(compareFortniteIslands);
  }, [fortniteIslands]);

  const trendingHighlights = buildTrendingHighlights(
    activePlatform === "roblox" ? robloxGames : fortniteIslands,
    activePlatform
  );

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
  const predictionTarget = useMemo(
    () => findPredictionTarget(activeItems, activePlatform, predictionSearch),
    [activeItems, activePlatform, predictionSearch]
  );
  const predictionSignals = buildPredictionSignals(
    predictionTarget,
    activeItems,
    activePlatform
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
                title="Data Source & Health"
                items={[
                  `How many games are queried in the latest snapshot: ${formatNumber(
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
                    : "By available activity signals"
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
                          subline: `${i.inferred_genre ?? "Other"} / ${
                            i.inferred_subgenre ?? "General"
                          }`,
	                        value: getFortniteActivityLabel(i),
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
                title="Trending Games"
                items={trendingHighlights}
                panel={panel}
                accent={accent}
                platform={activePlatform}
              />
            </section>

            <section className="mb-6 grid gap-6 lg:grid-cols-2">
              <ChartCard
                title="Most Played Games Over Time"
                subtitle={
                  activePlatform === "roblox"
                    ? `Top ${topGamesTrendLimit} experiences by current players, tracked across stored snapshot dates.`
                    : `Top ${topGamesTrendLimit} islands by available Fortnite activity metric, tracked across stored snapshots.`
                }
                panel={panel}
                action={
                  activePlatform === "roblox" ? (
                    <TrendControls
                      limit={topGamesTrendLimit}
                      percentile={topGamesTrendPercentile}
                      onLimitChange={setTopGamesTrendLimit}
                      onPercentileChange={setTopGamesTrendPercentile}
                      accent={accent}
                    />
                  ) : null
                }
              >
                {activePlatform === "roblox" ? (
                  <TopGamesTrend
                    games={topRobloxGames.slice(0, topGamesTrendLimit)}
                    percentile={topGamesTrendPercentile}
                  />
                ) : (
                  <FortniteIslandsTrend
                    islands={topFortniteIslands.slice(0, topGamesTrendLimit)}
                    percentile={topGamesTrendPercentile}
                  />
                )}
              </ChartCard>

              <ChartCard
                title="Most Played Genres Over Time"
                subtitle={
                  activePlatform === "roblox"
                    ? "Genre-level player curves using stored Roblox snapshot dates."
                    : "Genre-level Fortnite activity curves using peak CCU, plays, or unique-player snapshots when available."
                }
                panel={panel}
                action={
                  activePlatform === "roblox" ? (
                    <TrendControls
                      limit={genreTrendLimit}
                      percentile={genreTrendPercentile}
                      onLimitChange={setGenreTrendLimit}
                      onPercentileChange={setGenreTrendPercentile}
                      accent={accent}
                    />
                  ) : null
                }
              >
                {activePlatform === "roblox" ? (
                  <GenreLinesTrend
                    games={topRobloxGames.slice(0, genreTrendLimit)}
                    percentile={genreTrendPercentile}
                  />
                ) : (
                  <FortniteGenreTrend
                    islands={topFortniteIslands.slice(0, genreTrendLimit)}
                    percentile={genreTrendPercentile}
                  />
                )}
              </ChartCard>
            </section>

            <section className="mb-6 grid gap-6 lg:grid-cols-3">
	              <KeywordCloudCard
	                title="Top 25 Keyword Cloud"
	                subtitle="Common title and description signals by genre"
	                games={
	                  activePlatform === "roblox"
	                    ? topRobloxGames.slice(0, 25)
	                    : topFortniteIslands.slice(0, 25)
	                }
	                panel={panel}
	                accent={accent}
	              />

	              <TemplatePatternCard
	                title="Common Description Structure"
	                subtitle="Repeated description formula in the top set"
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
	                subtitle="Primary and secondary RGB colors by genre"
	                games={
	                  activePlatform === "roblox"
	                    ? topRobloxGames.slice(0, 50)
	                    : topFortniteIslands.slice(0, 50)
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
                    ? "Fortnite signals use official activity fields when the source returns them; missing fields should be treated as coverage gaps."
                    : "Roblox signals are based on current player snapshots and inferred classifications.",
                  "Use this as a directional signal, not a prediction of creator outcome.",
                ]}
              />
            </section>

            <section className={`mb-6 rounded-3xl border p-6 ${panel}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">Player Activity Landscape</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Rectangle size reflects current player activity. Color reflects stored player gain or loss.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-400">
                  <span className="h-3 w-3 rounded-sm bg-[#ef4444]" />
                  Loss
                  <span className="h-3 w-3 rounded-sm bg-[#334155]" />
                  Flat
                  <span className="h-3 w-3 rounded-sm bg-[#22c55e]" />
                  Gain
                </div>
              </div>

              {activePlatform === "roblox" ? (
                <PlayerActivityLandscape games={topRobloxGames.slice(0, 80)} />
              ) : (
                <Unavailable text="Player activity landscape requires current-player data, which is not available from the current Fortnite source." />
              )}
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

            <PredictionMarketSignalsCard
              panel={panel}
              accent={accent}
              search={predictionSearch}
              onSearchChange={setPredictionSearch}
              target={predictionTarget}
              signals={predictionSignals}
              platform={activePlatform}
            />
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
  const metrics = [...(game.game_metrics ?? [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const latest = sorted[sorted.length - 1];
  const earliest = sorted[0];
  const earliestRanked = sorted.find((snapshot) => snapshot.chart_rank);
  const latestMetric = metrics[metrics.length - 1];
  const latestEngagementMetric =
    [...metrics]
      .reverse()
      .find(
        (metric) =>
          typeof metric.visits === "number" ||
          typeof metric.favorites === "number" ||
          typeof metric.up_votes === "number" ||
          typeof metric.like_ratio === "number"
      ) ?? latestMetric;
  const bestRankSnapshot = sorted
    .filter((snapshot) => snapshot.chart_rank)
    .sort((a, b) => (a.chart_rank ?? 9999) - (b.chart_rank ?? 9999))[0];
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
    bestRank: bestRankSnapshot?.chart_rank ?? null,
    bestRankSort: bestRankSnapshot?.sort_name ?? null,
    averagePlayerGain7Days: getAveragePlayerGain(snapshots, 7),
    visits: latestEngagementMetric?.visits ?? game.visits ?? null,
    favorites: latestEngagementMetric?.favorites ?? game.favorites ?? null,
    upVotes: latestEngagementMetric?.up_votes ?? null,
    downVotes: latestEngagementMetric?.down_votes ?? null,
    likeRatio: latest?.like_ratio ?? latestEngagementMetric?.like_ratio ?? null,
    rankGain:
      earliestRanked?.chart_rank && latest?.chart_rank
        ? earliestRanked.chart_rank - latest.chart_rank
        : 0,
  };
}

function getAveragePlayerGain(snapshots: any[], days: number) {
  const sorted = [...(snapshots ?? [])]
    .filter((snapshot) => snapshot.created_at)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

  if (sorted.length < 2) return null;

  const latest = sorted[sorted.length - 1];
  const latestTime = new Date(latest.created_at).getTime();
  const cutoff = latestTime - days * 24 * 60 * 60 * 1000;
  const windowSnapshots = sorted.filter(
    (snapshot) => new Date(snapshot.created_at).getTime() >= cutoff
  );
  const earliest = windowSnapshots[0] ?? sorted[0];
  const earliestTime = new Date(earliest.created_at).getTime();
  const elapsedDays = Math.max(
    1,
    (latestTime - earliestTime) / (24 * 60 * 60 * 1000)
  );

  return Math.round(
    ((latest.current_players ?? 0) - (earliest.current_players ?? 0)) /
      elapsedDays
  );
}

function withLatestFortniteSnapshot(island: any) {
  const snapshots = island.fortnite_island_snapshots ?? [];
  const sorted = [...snapshots].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const latest = sorted[sorted.length - 1];

  return {
    ...island,
    raw: island.raw_latest ?? latest?.raw_payload ?? {},
    snapshots: sorted,
    latestRank: latest?.rank ?? null,
    latestPlays: latest?.plays ?? null,
    latestFavorites: latest?.favorites ?? null,
    latestRecommends: latest?.recommends ?? null,
    latestPeakCcu: latest?.peak_ccu ?? null,
    latestUniquePlayers: latest?.unique_players ?? null,
    latestMinutesPlayed: latest?.minutes_played ?? null,
    latestRetentionD1: latest?.retention_d1 ?? null,
    latestRetentionD7: latest?.retention_d7 ?? null,
    latestActivityValue: getFortniteSnapshotValue(latest),
    latestActivityLabel: getFortniteSnapshotMetricLabel(latest),
    latestPlayers: 0,
  };
}

function compareFortniteIslands(a: any, b: any) {
  const aScore = getFortniteActivityScore(a);
  const bScore = getFortniteActivityScore(b);

  if (aScore !== bScore) return bScore - aScore;

  const aRank = a.latestRank ?? 999999;
  const bRank = b.latestRank ?? 999999;
  if (aRank !== bRank) return aRank - bRank;

  return (a.title ?? "").localeCompare(b.title ?? "");
}

function getFortniteActivityScore(item: any) {
  return (
    item.latestActivityValue ??
    item.latestFavorites ??
    item.latestRecommends ??
    (item.latestRank ? 100000 - item.latestRank : 0)
  );
}

function getFortniteActivityLabel(item: any) {
  if (typeof item.latestPeakCcu === "number") {
    return `${formatNumber(item.latestPeakCcu)} peak CCU`;
  }

  if (typeof item.latestPlays === "number") {
    return `${formatNumber(item.latestPlays)} plays`;
  }

  if (typeof item.latestUniquePlayers === "number") {
    return `${formatNumber(item.latestUniquePlayers)} players`;
  }

  if (typeof item.latestRank === "number") {
    return `#${item.latestRank}`;
  }

  return "Imported";
}

function getFortniteSnapshotValue(snapshot: any) {
  if (!snapshot) return null;

  return (
    snapshot.peak_ccu ??
    snapshot.plays ??
    snapshot.unique_players ??
    snapshot.minutes_played ??
    snapshot.favorites ??
    snapshot.recommends ??
    null
  );
}

function getFortniteSnapshotMetricLabel(snapshot: any) {
  if (!snapshot) return "No activity metric";
  if (typeof snapshot.peak_ccu === "number") return "Peak CCU";
  if (typeof snapshot.plays === "number") return "Plays";
  if (typeof snapshot.unique_players === "number") return "Unique Players";
  if (typeof snapshot.minutes_played === "number") return "Minutes Played";
  if (typeof snapshot.favorites === "number") return "Favorites";
  if (typeof snapshot.recommends === "number") return "Recommends";
  return "No activity metric";
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

function buildTrendingHighlights(items: any[], platform: Platform) {
  if (platform !== "roblox") {
    return buildFortniteTrendingHighlights(items);
  }

  const yesterdayHighlights = buildYesterdayTrendingHighlights(items);
  const playerGain = [...items].sort(
    (a, b) => (b.playerGainPercent ?? 0) - (a.playerGainPercent ?? 0)
  )[0];
  const rankGain = [...items].sort(
    (a, b) => (b.rankGain ?? 0) - (a.rankGain ?? 0)
  )[0];
  const playerLoss = [...items].sort(
    (a, b) => (a.playerGainPercent ?? 0) - (b.playerGainPercent ?? 0)
  )[0];

  return [
    {
      label: "Most player gain",
      title: playerGain?.title ?? "placeholder",
      metric: `${Math.round(playerGain?.playerGainPercent ?? 0)}%`,
      direction: "up",
      href: playerGain?.url,
      subline: `Yesterday: ${yesterdayHighlights.playerGain?.title ?? "placeholder"}`,
    },
    {
      label: "Most position gain",
      title: rankGain?.rankGain ? rankGain.title : "placeholder",
      metric: rankGain?.rankGain ? `+${rankGain.rankGain} spots` : "N/A",
      direction: "up",
      href: rankGain?.url,
      subline: `Yesterday: ${yesterdayHighlights.rankGain?.title ?? "placeholder"}`,
    },
    {
      label: "Most player loss",
      title:
        playerLoss && (playerLoss.playerGainPercent ?? 0) < 0
          ? playerLoss.title
          : "placeholder",
      metric:
        playerLoss && (playerLoss.playerGainPercent ?? 0) < 0
          ? `${Math.round(Math.abs(playerLoss.playerGainPercent ?? 0))}%`
          : "N/A",
      direction: "down",
      href: playerLoss?.url,
      subline: `Yesterday: ${yesterdayHighlights.playerLoss?.title ?? "placeholder"}`,
    },
  ];
}

function buildFortniteTrendingHighlights(items: any[]) {
  const topActivity = [...items].sort(compareFortniteIslands)[0];
  const topRanked = [...items]
    .filter((item) => typeof item.latestRank === "number")
    .sort((a, b) => a.latestRank - b.latestRank)[0];
  const topAffinity = [...items]
    .filter(
      (item) =>
        typeof item.latestFavorites === "number" ||
        typeof item.latestRecommends === "number"
    )
    .sort(
      (a, b) =>
        (b.latestFavorites ?? b.latestRecommends ?? 0) -
        (a.latestFavorites ?? a.latestRecommends ?? 0)
    )[0];

  return [
    {
      label: "Strongest activity signal",
      title: topActivity?.title ?? "placeholder",
      metric: topActivity ? getFortniteActivityLabel(topActivity) : "Pending",
      direction: "up",
      href: topActivity?.url,
      subline: topActivity
        ? `${topActivity.inferred_genre ?? "Other"} / ${
            topActivity.inferred_subgenre ?? "General"
          }`
        : "Waiting for island activity data",
    },
    {
      label: "Best source rank",
      title: topRanked?.title ?? "placeholder",
      metric:
        typeof topRanked?.latestRank === "number"
          ? `#${topRanked.latestRank}`
          : "Pending",
      direction: "up",
      href: topRanked?.url,
      subline: topRanked
        ? `${topRanked.inferred_genre ?? "Other"} / ${
            topRanked.inferred_subgenre ?? "General"
          }`
        : "Rank unavailable from current source",
    },
    {
      label: "Highest affinity signal",
      title: topAffinity?.title ?? "placeholder",
      metric: topAffinity
        ? typeof topAffinity.latestFavorites === "number"
          ? `${formatNumber(topAffinity.latestFavorites)} fav`
          : `${formatNumber(topAffinity.latestRecommends)} rec`
        : "Pending",
      direction: "up",
      href: topAffinity?.url,
      subline: topAffinity
        ? `${topAffinity.inferred_genre ?? "Other"} / ${
            topAffinity.inferred_subgenre ?? "General"
          }`
        : "Favorites/recommendations unavailable from current source",
    },
  ];
}

function buildYesterdayTrendingHighlights(games: any[]) {
  const targetDate = new Date();
  targetDate.setUTCDate(targetDate.getUTCDate() - 1);
  const targetKey = targetDate.toISOString().slice(0, 10);
  const previousKey = getPreviousSnapshotDateKey(games, targetKey);

  if (!previousKey) {
    return { playerGain: null, rankGain: null, playerLoss: null };
  }

  const yesterdayRows = games
    .map((game) => {
      const yesterdaySnapshot = getLatestSnapshotForDate(game, targetKey);
      const previousSnapshot = getLatestSnapshotForDate(game, previousKey);

      if (!yesterdaySnapshot || !previousSnapshot) return null;

      const playerDeltaPercent =
        previousSnapshot.current_players && yesterdaySnapshot.current_players
          ? ((yesterdaySnapshot.current_players - previousSnapshot.current_players) /
              Math.max(previousSnapshot.current_players, 1)) *
            100
          : 0;

      const rankGain =
        previousSnapshot.chart_rank && yesterdaySnapshot.chart_rank
          ? previousSnapshot.chart_rank - yesterdaySnapshot.chart_rank
          : 0;

      return {
        title: game.title,
        playerDeltaPercent,
        rankGain,
      };
    })
    .filter(Boolean);

  return {
    playerGain: [...yesterdayRows].sort(
      (a: any, b: any) => b.playerDeltaPercent - a.playerDeltaPercent
    )[0],
    rankGain: [...yesterdayRows].sort(
      (a: any, b: any) => b.rankGain - a.rankGain
    )[0],
    playerLoss: [...yesterdayRows].sort(
      (a: any, b: any) => a.playerDeltaPercent - b.playerDeltaPercent
    )[0],
  };
}

function getLatestSnapshotForDate(game: any, dateKey: string) {
  return (game.snapshots ?? [])
    .filter((item: any) => String(item.created_at ?? "").startsWith(dateKey))
    .sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
}

function getPreviousSnapshotDateKey(games: any[], beforeDateKey: string) {
  return Array.from(
    new Set(
      games.flatMap((game) =>
        (game.snapshots ?? []).map((snapshot: any) =>
          String(snapshot.created_at ?? "").slice(0, 10)
        )
      )
    )
  )
    .filter((dateKey) => dateKey && dateKey < beforeDateKey)
    .sort()
    .at(-1);
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
  const map: Record<string, { genre: string; subgenre: string; count: number }> = {};
  islands.forEach((island) => {
    const genre = island.inferred_genre ?? "Other";
    const subgenre = island.inferred_subgenre ?? "General";
    const key = `${genre}|||${subgenre}`;

    if (!map[key]) {
      map[key] = { genre, subgenre, count: 0 };
    }

    map[key].count += 1;
  });

  const total = islands.length;

  return Object.values(map)
    .map((item) => ({
      label: item.genre,
      subline: item.subgenre,
      value: `${item.count}`,
      rawValue: item.count,
      share: total ? Math.round((item.count / total) * 100) : 0,
    }))
    .sort((a, b) => b.rawValue - a.rawValue)
    .slice(0, 3);
}

function buildKeywordCloud(items: any[], source: "title" | "description") {
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
    const text = source === "title"
      ? item.title
      : item.description;

    tokenizeCloudText(text)
      .filter(Boolean)
      .filter((word) => {
        const normalized = word.toLowerCase();
        return (
          (word.length > 1 || isEmojiToken(word)) &&
          !stopWords.has(normalized)
        );
      })
      .forEach((word) => {
        const key = isEmojiToken(word) ? word : word.toLowerCase();
        counts[key] = (counts[key] ?? 0) + 1;
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

function tokenizeCloudText(value: string | undefined) {
  const text = value ?? "";
  const matches = text.match(
    /\p{Extended_Pictographic}|[#@$%&+]\p{L}[\p{L}\p{N}_+-]*|\p{L}[\p{L}\p{N}'’&+-]*/gu
  );

  return matches ?? [];
}

function isEmojiToken(value: string) {
  return /\p{Extended_Pictographic}/u.test(value);
}

function buildCommonTemplate(items: any[]) {
  const signals = items.map(extractDescriptionSignals);
  const topSignals = descriptionSignalDefinitions
    .map((definition) => ({
      ...definition,
      count: signals.filter((signal) => signal[definition.id]).length,
    }))
    .filter((definition) => definition.count > 0)
    .sort((a, b) => b.count - a.count);
  const selectedSignals = topSignals.slice(0, 4);
  const count = selectedSignals[0]?.count ?? 0;
  const pattern = selectedSignals.length
    ? selectedSignals.map((signal) => signal.shortLabel).join(" -> ")
    : "Hook -> Action -> Reward -> Return";

  return {
    pattern,
    count,
    steps: selectedSignals.length
      ? selectedSignals.map((signal) => signal.template)
      : [
          "Open with the player fantasy in one sentence.",
          "Name the core action the player repeats.",
          "Promise a reward, upgrade, unlock, or status gain.",
          "Give a reason to return, share, or compete.",
        ],
  };
}

const descriptionSignalDefinitions = [
  {
    id: "hook",
    shortLabel: "Hook",
    template: "Lead with a concrete fantasy: become, survive, build, collect, or compete.",
    patterns: /become|be the|can you|welcome|enter|survive|build|collect|fight|battle|race|escape/,
  },
  {
    id: "action",
    shortLabel: "Core Action",
    template: "State the repeatable action clearly: fight, collect, upgrade, race, build, or roleplay.",
    patterns: /fight|collect|upgrade|race|build|roleplay|explore|survive|escape|train|complete|unlock/,
  },
  {
    id: "progression",
    shortLabel: "Progression",
    template: "Show progression pressure: earn currency, level up, unlock rare items, rebirth, or improve.",
    patterns: /earn|coins|cash|money|gems|level|upgrade|rebirth|unlock|rare|legendary|mythic|boost/,
  },
  {
    id: "social",
    shortLabel: "Social Proof",
    template: "Add a social or competitive reason: play with friends, leaderboard, PvP, teams, or ranks.",
    patterns: /friends|team|teams|pvp|leaderboard|ranked|compete|players|party|group|social/,
  },
  {
    id: "freshness",
    shortLabel: "Freshness",
    template: "Signal freshness with updates, events, seasons, limited items, or new content.",
    patterns: /update|updates|new|event|season|limited|weekly|code|codes|reward|free/,
  },
  {
    id: "cta",
    shortLabel: "CTA",
    template: "Close with a simple action: join, like, favorite, invite friends, or claim a reward.",
    patterns: /join|like|favorite|invite|claim|follow|group|code|codes|free|reward/,
  },
];

function extractDescriptionSignals(item: any) {
  const text = [
    item.description,
    item.core_loop,
    item.design_pattern,
    ...(item.extracted_tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return Object.fromEntries(
    descriptionSignalDefinitions.map((definition) => [
      definition.id,
      definition.patterns.test(text),
    ])
  );
}

function getTopGameByUtcDate(games: any[], daysAgo: number) {
  return getTopGamesByUtcDate(games, daysAgo, 1)[0];
}

function getTopGamesByUtcDate(games: any[], daysAgo: number, limit: number) {
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
    .sort((a: any, b: any) => b.players - a.players)
    .slice(0, limit);
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
  const source =
    platform === "roblox"
      ? "Roblox Explore API / discover charts"
      : "Fortnite Data API / ecosystem islands";

  const latestSnapshotDate = getLatestSourceDate(platform, items);
  const queriedToday = latestSnapshotDate
    ? platform === "roblox"
      ? items.filter((item) =>
          (item.snapshots ?? []).some((snapshot: any) =>
            String(snapshot.created_at ?? "").startsWith(latestSnapshotDate)
          )
        ).length
      : items.filter((item) =>
          String(item.last_seen_at ?? item.created_at ?? "").startsWith(
            latestSnapshotDate
          )
        ).length || items.length
    : items.length;

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

function getLatestSourceDate(platform: Platform, items: any[]) {
  const timestamp = getLatestSourceTimestamp(platform, items);
  return timestamp ? new Date(timestamp).toISOString().slice(0, 10) : "";
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
	              <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold leading-snug">
	                  {item.label}
                  </span>
                  {item.subline && (
                    <span className="mt-1 block truncate text-xs font-medium leading-snug text-slate-400">
                      {item.subline}
                    </span>
                  )}
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
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-snug">
                  {item.label}
                </p>
                {item.subline && (
                  <p className="mt-0.5 truncate text-xs font-medium leading-snug text-slate-400">
                    {item.subline}
                  </p>
                )}
              </div>
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

function TrendingCard({ title, items, panel }: any) {
  return (
    <div className={`rounded-3xl border p-5 ${panel}`}>
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <div className="mt-4 space-y-3">
        {items.map((item: any) => {
          const isDown = item.direction === "down";
          const content = (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                  {item.label}
                </p>
                <h3 className="mt-1 line-clamp-2 text-sm font-black leading-snug">
                  {item.title}
                </h3>
                {item.subline && (
                  <p className="mt-1 text-xs font-medium leading-snug text-slate-400">
                    {item.subline}
                  </p>
                )}
              </div>
              <div
                className={`flex-none rounded-full px-2 py-1 text-xs font-black ${
                  isDown ? "bg-red-50 text-red-500" : "bg-green-50 text-green-600"
                }`}
              >
                {item.metric} {isDown ? "▼" : "▲"}
              </div>
            </>
          );

          return item.href ? (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-3 rounded-xl p-2 transition hover:bg-slate-100/70"
            >
              {content}
            </a>
          ) : (
            <div key={item.label} className="flex items-start gap-3 rounded-xl p-2">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, panel, action, children }: any) {
  return (
    <div className={`rounded-3xl border p-5 ${panel}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">{title}</h3>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        {action}
      </div>
      <div className="h-64">{children}</div>
    </div>
  );
}

function TrendControls({
  limit,
  percentile,
  onLimitChange,
  onPercentileChange,
  accent,
}: any) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <ToggleGroup>
        {[25, 50].map((value) => (
          <ToggleButton
            key={value}
            active={limit === value}
            onClick={() => onLimitChange(value)}
            activeColor={accent}
          >
            Top {value}
          </ToggleButton>
        ))}
      </ToggleGroup>
      <ToggleGroup>
        {[25, 50, 75, 100].map((value) => (
          <ToggleButton
            key={value}
            active={percentile === value}
            onClick={() => onPercentileChange(value)}
            activeColor={accent}
          >
            {value === 100 ? "All" : `${value}%`}
          </ToggleButton>
        ))}
      </ToggleGroup>
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

function KeywordCloudCard({ title, subtitle, games, panel, accent }: any) {
  const genres = useMemo(
    () =>
      Array.from(
        new Set(games.map((game: any) => game.inferred_genre ?? "Other"))
      ).sort() as string[],
    [games]
  );
  const [selectedGenre, setSelectedGenre] = useState("");
  const activeGenre = selectedGenre || genres[0] || "";
  const selectedGames = useMemo(
    () =>
      games.filter(
        (game: any) => (game.inferred_genre ?? "Other") === activeGenre
      ),
    [games, activeGenre]
  );
  const titleCloud = buildKeywordCloud(selectedGames, "title");
  const descriptionCloud = buildKeywordCloud(selectedGames, "description");

  return (
    <div className={`rounded-3xl border p-5 ${panel}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        <select
          className="max-w-[10rem] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
          value={activeGenre}
          onChange={(event) => setSelectedGenre(event.target.value)}
        >
          {genres.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>
      </div>

      <KeywordCloudPanel
        title="Title cloud"
        items={titleCloud}
        emptyText="No title keywords available for this genre."
        accent={accent}
      />
      <KeywordCloudPanel
        title="Description cloud"
        items={descriptionCloud}
        emptyText="No description keywords available for this genre."
        accent={accent}
      />
    </div>
  );
}

function KeywordCloudPanel({ title, items, emptyText, accent }: any) {
  return (
    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
        {title}
      </p>
      <div className="mt-3 flex min-h-24 flex-wrap content-center items-center gap-x-3 gap-y-2">
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
          <p className="text-sm text-slate-500">{emptyText}</p>
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
  const genres = useMemo(
    () =>
      Array.from(
        new Set(games.map((game: any) => game.inferred_genre ?? "Other"))
      ).sort() as string[],
    [games]
  );
  const [selectedGenre, setSelectedGenre] = useState("");
  const activeGenre = selectedGenre || genres[0] || "";
  const selectedGames = useMemo(
    () =>
      games
        .filter((game: any) => (game.inferred_genre ?? "Other") === activeGenre)
        .slice(0, 5),
    [games, activeGenre]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadColors() {
      const extracted = await Promise.all(
        selectedGames.map(async (game: any, index: number) => {
          const color = await extractTileColors(game.thumbnail_url);
          return {
            title: game.title,
            color: color ?? fallbackTileColorPairs[index % fallbackTileColorPairs.length],
          };
        })
      );

      if (!cancelled) setColors(extracted);
    }

    loadColors();

    return () => {
      cancelled = true;
    };
  }, [activeGenre, selectedGames]);

  const visibleColors = colors.length
    ? colors
    : selectedGames.map((game: any, index: number) => ({
        title: game.title,
        color: fallbackTileColorPairs[index % fallbackTileColorPairs.length],
      }));

  return (
    <div className={`rounded-3xl border p-5 ${panel}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        <select
          className="max-w-[10rem] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
          value={activeGenre}
          onChange={(event) => setSelectedGenre(event.target.value)}
        >
          {genres.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5 space-y-3">
        {visibleColors.map((item: any) => (
          <div key={item.title} className="grid grid-cols-[2.75rem_1fr_auto] items-center gap-3">
            <div
              className="overflow-hidden rounded-lg border border-black/10"
            >
              <div
                className="h-6 w-11"
                style={{ backgroundColor: item.color.primary.hex }}
              />
              <div
                className="h-3 w-11"
                style={{ backgroundColor: item.color.secondary.hex }}
              />
            </div>
            <p className="line-clamp-2 text-sm font-semibold leading-snug">
              {item.title}
            </p>
            <div className="space-y-1 text-right">
              <p
                className="rounded-full px-2 py-1 text-[10px] font-black"
                style={{
                  backgroundColor: `${accent}1f`,
                  color: accent,
                }}
              >
                {item.color.primary.rgb}
              </p>
              <p className="text-[10px] font-bold text-slate-400">
                Secondary: {item.color.secondary.rgb}
              </p>
            </div>
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
  const averageGain = item.averagePlayerGain7Days;
  const averagePositive = (averageGain ?? 0) >= 0;
  const likesLabel =
    typeof item.upVotes === "number"
      ? formatNumber(item.upVotes)
      : typeof item.likeRatio === "number"
        ? `${Math.round(item.likeRatio * 100)}% ratio`
        : "N/A";

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
            {platform === "roblox" ? "Gain in players" : "Genre"}
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
            {platform === "roblox" ? "Stored peak players" : "Intent"}
          </p>
          <p className="font-black">
            {platform === "roblox"
              ? formatNumber(item.periodHigh)
              : item.player_intent ?? "N/A"}
          </p>
        </div>

        <div className="col-span-2">
          <p className="text-slate-400">Top measured rank</p>
          <p className="font-black">
            {platform === "roblox"
              ? `#${item.bestRank ?? item.latestRank ?? "N/A"} in ${
                  item.bestRankSort ?? item.latestSort ?? "Chart"
                }`
              : item.competition_level ?? "Metadata"}
          </p>
        </div>

        <div>
          <p className="text-slate-400">Genre</p>
          <p className="line-clamp-1 font-black">
            {item.inferred_genre ?? "Other"}
          </p>
        </div>

        <div>
          <p className="text-slate-400">Subgenre</p>
          <p className="line-clamp-1 font-black">
            {item.inferred_subgenre ?? "General"}
          </p>
        </div>

        {platform === "roblox" && (
          <>
            <div className="col-span-2">
              <p className="text-slate-400">Avg player gain/loss, past 7 days</p>
              <p
                className={`font-black ${
                  averagePositive ? "text-green-600" : "text-red-500"
                }`}
              >
                {typeof averageGain === "number"
                  ? `${averageGain > 0 ? "+" : ""}${formatNumber(
                      averageGain
                    )} players/day`
                  : "N/A"}
              </p>
            </div>

            <div>
              <p className="text-slate-400">Likes</p>
              <p className="font-black">{likesLabel}</p>
            </div>

            <div>
              <p className="text-slate-400">Visits</p>
              <p className="font-black">
                {typeof item.visits === "number"
                  ? formatNumber(item.visits)
                  : "N/A"}
              </p>
            </div>
          </>
        )}

        {platform === "fortnite" && (
          <>
            <div>
              <p className="text-slate-400">Activity metric</p>
              <p className="font-black">
                {item.latestActivityLabel ?? "Pending"}
              </p>
            </div>

            <div>
              <p className="text-slate-400">Activity value</p>
              <p className="font-black">
                {typeof item.latestActivityValue === "number"
                  ? formatNumber(item.latestActivityValue)
                  : "N/A"}
              </p>
            </div>

            <div>
              <p className="text-slate-400">Recommends</p>
              <p className="font-black">
                {typeof item.latestRecommends === "number"
                  ? formatNumber(item.latestRecommends)
                  : "N/A"}
              </p>
            </div>

            <div>
              <p className="text-slate-400">D7 retention</p>
              <p className="font-black">
                {typeof item.latestRetentionD7 === "number"
                  ? `${Math.round(item.latestRetentionD7 * 100) / 100}%`
                  : "N/A"}
              </p>
            </div>
          </>
        )}
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

function PlayerActivityLandscape({ games }: any) {
  const groups = buildLandscapeGroups(games);

  if (!groups.length) {
    return <Unavailable text="No player activity data available yet." />;
  }

  return (
    <div className="mt-6 overflow-hidden rounded-2xl bg-slate-950 p-1 shadow-inner">
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
          gridAutoRows: "76px",
        }}
      >
        {groups.map((group: any) => (
          <div
            key={group.genre}
            className="relative overflow-hidden rounded-xl border border-slate-950 bg-slate-900"
            style={{
              gridColumn: `span ${group.colSpan}`,
              gridRow: `span ${group.rowSpan}`,
              minHeight: 0,
            }}
          >
            <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 bg-slate-950/70 px-2 py-1 text-white backdrop-blur">
              <p className="truncate text-[11px] font-black uppercase tracking-wide">
                {group.genre}
              </p>
              <p className="shrink-0 text-[10px] font-bold text-white/70">
                {formatNumber(group.players)}
              </p>
            </div>

            <div
              className="grid h-full gap-px pt-6"
              style={{
                gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                gridAutoRows: "minmax(34px, 1fr)",
              }}
            >
              {group.games.map((game: any) => {
                const positive = (game.playerGainPercent ?? 0) >= 0;
                const href = game.url ?? `https://www.roblox.com/games/${game.id}`;

                return (
                  <a
                    key={game.id}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    title={`${game.title} - ${formatNumber(
                      game.latestPlayers
                    )} players`}
                    className="group relative flex min-h-0 flex-col justify-end overflow-hidden p-2 text-white transition hover:brightness-110"
                    style={{
                      gridColumn: `span ${game.colSpan}`,
                      gridRow: `span ${game.rowSpan}`,
                      backgroundColor: getLandscapeColor(game.playerGainPercent),
                    }}
                  >
                    {game.thumbnail_url && game.isHero && (
                      <img
                        src={game.thumbnail_url}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover opacity-20 transition group-hover:opacity-30"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                    <div className="relative">
                      <p className="line-clamp-2 text-[11px] font-black leading-tight drop-shadow md:text-sm">
                        {game.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-black leading-none drop-shadow md:text-xs">
                        <span>{formatNumber(game.latestPlayers)}</span>
                        <span>
                          {Math.abs(Math.round(game.playerGainPercent ?? 0))}%
                          {positive ? " ▲" : " ▼"}
                        </span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildLandscapeGroups(games: any[]) {
  const groupLayouts = [
    { colSpan: 7, rowSpan: 4 },
    { colSpan: 5, rowSpan: 4 },
    { colSpan: 6, rowSpan: 3 },
    { colSpan: 6, rowSpan: 3 },
    { colSpan: 4, rowSpan: 2 },
    { colSpan: 4, rowSpan: 2 },
    { colSpan: 4, rowSpan: 2 },
    { colSpan: 3, rowSpan: 2 },
    { colSpan: 3, rowSpan: 2 },
    { colSpan: 3, rowSpan: 2 },
    { colSpan: 3, rowSpan: 2 },
  ];

  const map: Record<string, any[]> = {};

  games
    .filter((game) => (game.latestPlayers ?? 0) > 0)
    .forEach((game) => {
      const genre = game.inferred_genre ?? "Other";
      if (!map[genre]) map[genre] = [];
      map[genre].push(game);
    });

  return Object.entries(map)
    .map(([genre, entries]) => {
      const sortedEntries = [...entries].sort(
        (a, b) => (b.latestPlayers ?? 0) - (a.latestPlayers ?? 0)
      );

      return {
        genre,
        players: sortedEntries.reduce(
          (sum, item) => sum + (item.latestPlayers ?? 0),
          0
        ),
        entries: sortedEntries,
      };
    })
    .sort((a, b) => b.players - a.players)
    .slice(0, groupLayouts.length)
    .map((group, index) => {
      const layout = groupLayouts[index];

      return {
        ...group,
        ...layout,
        games: group.entries
          .slice(0, getLandscapeGameCount(layout.rowSpan))
          .map((game, gameIndex) => ({
            ...game,
            ...getLandscapeTileLayout(gameIndex, layout),
            isHero: gameIndex === 0 && layout.rowSpan >= 3,
          })),
      };
    });
}

function getLandscapeGameCount(rowSpan: number) {
  if (rowSpan >= 4) return 10;
  if (rowSpan >= 3) return 8;
  return 5;
}

function getLandscapeTileLayout(index: number, groupLayout: any) {
  if (index === 0) {
    return groupLayout.rowSpan >= 3
      ? { colSpan: 4, rowSpan: 3 }
      : { colSpan: 3, rowSpan: 2 };
  }

  if (index === 1 && groupLayout.rowSpan >= 4) {
    return { colSpan: 2, rowSpan: 2 };
  }

  if (index === 2 && groupLayout.rowSpan >= 3) {
    return { colSpan: 2, rowSpan: 2 };
  }

  return { colSpan: index < 5 ? 2 : 1, rowSpan: 1 };
}

function getLandscapeColor(value: number | undefined) {
  const change = value ?? 0;

  if (change >= 20) return "#22c55e";
  if (change >= 8) return "#2f9e63";
  if (change > 0) return "#376b50";
  if (change <= -20) return "#ef4444";
  if (change <= -8) return "#b84b57";
  if (change < 0) return "#7f4b57";
  return "#334155";
}

function PredictionMarketSignalsCard({
  panel,
  accent,
  search,
  onSearchChange,
  target,
  signals,
  platform,
}: any) {
  return (
    <section className={`mt-6 rounded-3xl border p-6 ${panel}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-slate-400">
            Forecasting Layer
          </p>
          <h2 className="text-2xl font-bold">Prediction Market Signals</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Eight measurable signals that can support market-style questions
            around attention, momentum, persistence, and genre rotation.
          </p>
        </div>

        <div className="w-full max-w-sm">
          <label className="text-[11px] font-black uppercase tracking-wide text-slate-400">
            Search game
          </label>
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={
              platform === "roblox"
                ? "Search Roblox experience"
                : "Search Fortnite island"
            }
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-transparent focus:ring-2"
            style={{ "--tw-ring-color": accent } as any}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 p-4">
        {target?.thumbnail_url && (
          <img
            src={target.thumbnail_url}
            alt={target.title}
            className="h-14 w-14 rounded-xl object-cover"
          />
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-black">
            {target?.title ?? "No matching game found"}
          </p>
          <p className="text-sm text-slate-500">
            {target
              ? `${target.inferred_genre ?? "Other"} / ${
                  target.inferred_subgenre ?? "General"
                }`
              : "Try a different title."}
          </p>
        </div>
        {target?.url && (
          <a
            href={target.url}
            target="_blank"
            rel="noreferrer"
            className="ml-auto rounded-full px-4 py-2 text-sm font-black text-white transition hover:brightness-95"
            style={{ backgroundColor: accent }}
          >
            Open source
          </a>
        )}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {signals.map((signal: any) => (
          <div
            key={signal.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
              {signal.label}
            </p>
            <p className="mt-2 text-xl font-black text-slate-900">
              {signal.value}
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {signal.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function findPredictionTarget(items: any[], platform: Platform, search: string) {
  const sorted = [...items].sort((a, b) =>
    platform === "roblox"
      ? (b.latestPlayers ?? 0) - (a.latestPlayers ?? 0)
      : (a.title ?? "").localeCompare(b.title ?? "")
  );
  const query = search.trim().toLowerCase();

  if (!query) return sorted[0];

  return (
    sorted.find((item) => (item.title ?? "").toLowerCase() === query) ??
    sorted.find((item) => (item.title ?? "").toLowerCase().includes(query)) ??
    sorted[0]
  );
}

function buildPredictionSignals(
  target: any,
  items: any[],
  platform: Platform
) {
  if (!target) {
    return predictionSignalLabels.map((label) => ({
      label,
      value: "N/A",
      detail: "No game selected.",
    }));
  }

  if (platform !== "roblox") {
    return [
      {
        label: "Daily rank history",
        value:
          typeof target.latestRank === "number"
            ? `#${target.latestRank}`
            : "Pending",
        detail: "Latest source rank from the Fortnite island snapshot when provided.",
      },
      {
        label: "Player velocity",
        value: getFortniteVelocityLabel(target),
        detail: `Change in ${target.latestActivityLabel ?? "activity metric"} across stored Fortnite snapshots.`,
      },
      {
        label: "Volatility",
        value: getFortniteVolatility(target).label,
        detail: getFortniteVolatility(target).detail,
      },
      {
        label: "Peak retention",
        value:
          typeof target.latestRetentionD7 === "number"
            ? `${Math.round(target.latestRetentionD7 * 100) / 100}%`
            : "Pending",
        detail: "Uses D7 retention when returned by the Fortnite Data API.",
      },
      {
        label: "Genre share over time",
        value: getFortniteGenreActivityShare(target, items),
        detail: `${target.inferred_genre ?? "Other"} share of available Fortnite activity metrics.`,
      },
      {
        label: "New entrant detection",
        value: target.snapshots?.[0]?.created_at
          ? formatShortDate(target.snapshots[0].created_at)
          : "Pending",
        detail: "First stored appearance in the current Fortnite snapshot history.",
      },
      {
        label: "Breakout score",
        value: `${getFortniteBreakoutScore(target, items)}/100`,
        detail: "Composite of available activity, retention, recommendations, and rank.",
      },
      {
        label: "Settlement snapshots",
        value: `${target.snapshots?.length ?? 0} snapshots`,
        detail: target.snapshots?.at(-1)?.created_at
          ? `Latest settlement reference: ${new Date(
              target.snapshots.at(-1).created_at
            ).toISOString()} UTC.`
          : "No Fortnite settlement snapshot available yet.",
      },
    ];
  }

  const snapshots = target.snapshots ?? [];
  const latestSnapshot = snapshots[snapshots.length - 1];
  const firstSnapshot = snapshots[0];
  const rankedSnapshots = snapshots.filter((snapshot: any) => snapshot.chart_rank);
  const totalPlayers = items.reduce(
    (sum, item) => sum + (item.latestPlayers ?? 0),
    0
  );
  const genrePlayers = items
    .filter((item) => item.inferred_genre === target.inferred_genre)
    .reduce((sum, item) => sum + (item.latestPlayers ?? 0), 0);
  const genreShare = totalPlayers
    ? Math.round((genrePlayers / totalPlayers) * 100)
    : 0;
  const rankGain = target.rankGain ?? 0;
  const velocity = Math.round(target.playerGainPercent ?? 0);
  const retention = target.periodHigh
    ? Math.round(((target.latestPlayers ?? 0) / target.periodHigh) * 100)
    : 0;
  const volatility = getPlayerVolatility(snapshots);
  const breakoutScore = getBreakoutScore(target, totalPlayers);

  return [
    {
      label: "Daily rank history",
      value: rankedSnapshots.length
        ? `${rankedSnapshots.length} ranked snapshots`
        : "No ranked snapshots",
      detail: `Latest rank: #${target.latestRank ?? "N/A"} in ${
        target.latestSort ?? "current chart"
      }. Rank movement: ${rankGain > 0 ? "+" : ""}${rankGain} spots.`,
    },
    {
      label: "Player velocity",
      value: `${velocity > 0 ? "+" : ""}${velocity}%`,
      detail: "Stored-period player change from earliest to latest snapshot.",
    },
    {
      label: "Volatility",
      value: volatility.label,
      detail: `Observed range: ${formatNumber(volatility.low)} to ${formatNumber(
        volatility.high
      )} players.`,
    },
    {
      label: "Peak retention",
      value: `${retention}%`,
      detail: `Current players vs stored peak of ${formatNumber(
        target.periodHigh
      )}.`,
    },
    {
      label: "Genre share over time",
      value: `${genreShare}%`,
      detail: `${target.inferred_genre ?? "Other"} currently represents ${formatNumber(
        genrePlayers
      )} tracked players.`,
    },
    {
      label: "New entrant detection",
      value: firstSnapshot ? formatShortDate(firstSnapshot.created_at) : "N/A",
      detail: "First stored appearance in the current Supabase snapshot history.",
    },
    {
      label: "Breakout score",
      value: `${breakoutScore}/100`,
      detail: "Composite of player scale, velocity, rank gain, and peak retention.",
    },
    {
      label: "Settlement snapshots",
      value: `${snapshots.length} snapshots`,
      detail: latestSnapshot
        ? `Latest settlement reference: ${new Date(
            latestSnapshot.created_at
          ).toISOString()} UTC.`
        : "No settlement snapshot available yet.",
    },
  ];
}

const predictionSignalLabels = [
  "Daily rank history",
  "Player velocity",
  "Volatility",
  "Peak retention",
  "Genre share over time",
  "New entrant detection",
  "Breakout score",
  "Settlement snapshots",
];

function getFortniteVelocityLabel(target: any) {
  const values = (target.snapshots ?? [])
    .map(getFortniteSnapshotValue)
    .filter((value: any) => typeof value === "number");

  if (values.length < 2) return "Pending";

  const first = values[0];
  const latest = values[values.length - 1];
  const change = latest - first;
  const percent = first ? Math.round((change / first) * 100) : 0;

  return `${change >= 0 ? "+" : ""}${formatNumber(change)} (${percent >= 0 ? "+" : ""}${percent}%)`;
}

function getFortniteVolatility(target: any) {
  const values = (target.snapshots ?? [])
    .map(getFortniteSnapshotValue)
    .filter((value: any) => typeof value === "number");

  if (values.length < 2) {
    return {
      label: "Pending",
      detail: "Needs at least two Fortnite activity snapshots.",
    };
  }

  const low = Math.min(...values);
  const high = Math.max(...values);
  const midpoint = Math.max(1, (low + high) / 2);
  const spread = (high - low) / midpoint;

  return {
    label: spread > 0.75 ? "High" : spread > 0.3 ? "Medium" : "Low",
    detail: `Observed ${target.latestActivityLabel ?? "activity"} range: ${formatNumber(
      low
    )} to ${formatNumber(high)}.`,
  };
}

function getFortniteGenreActivityShare(target: any, items: any[]) {
  const total = items.reduce(
    (sum, item) => sum + (item.latestActivityValue ?? 0),
    0
  );
  const genreTotal = items
    .filter((item) => item.inferred_genre === target.inferred_genre)
    .reduce((sum, item) => sum + (item.latestActivityValue ?? 0), 0);

  if (!total) return "Pending";

  return `${Math.round((genreTotal / total) * 100)}%`;
}

function getFortniteBreakoutScore(target: any, items: any[]) {
  const maxActivity = Math.max(
    ...items.map((item) => item.latestActivityValue ?? 0),
    1
  );
  const activityScore = Math.min(
    40,
    ((target.latestActivityValue ?? 0) / maxActivity) * 40
  );
  const rankScore =
    typeof target.latestRank === "number"
      ? Math.max(0, Math.min(20, 20 - target.latestRank / 10))
      : 0;
  const retentionScore =
    typeof target.latestRetentionD7 === "number"
      ? Math.min(20, target.latestRetentionD7 * 2)
      : 0;
  const affinityScore = Math.min(
    20,
    ((target.latestRecommends ?? target.latestFavorites ?? 0) /
      Math.max(
        ...items.map(
          (item) => item.latestRecommends ?? item.latestFavorites ?? 0
        ),
        1
      )) *
      20
  );

  return Math.round(activityScore + rankScore + retentionScore + affinityScore);
}

function getPlayerVolatility(snapshots: any[]) {
  const values = snapshots
    .map((snapshot) => snapshot.current_players)
    .filter((value) => typeof value === "number");

  if (!values.length) {
    return { label: "N/A", low: 0, high: 0 };
  }

  const low = Math.min(...values);
  const high = Math.max(...values);
  const midpoint = Math.max(1, (low + high) / 2);
  const spread = (high - low) / midpoint;

  return {
    label: spread > 0.75 ? "High" : spread > 0.3 ? "Medium" : "Low",
    low,
    high,
  };
}

function getBreakoutScore(target: any, totalPlayers: number) {
  const scaleScore = totalPlayers
    ? Math.min(35, ((target.latestPlayers ?? 0) / totalPlayers) * 350)
    : 0;
  const velocityScore = Math.min(
    30,
    Math.max(0, target.playerGainPercent ?? 0) * 0.6
  );
  const rankScore = Math.min(20, Math.max(0, target.rankGain ?? 0) * 2);
  const retentionScore = target.periodHigh
    ? Math.min(15, ((target.latestPlayers ?? 0) / target.periodHigh) * 15)
    : 0;

  return Math.round(scaleScore + velocityScore + rankScore + retentionScore);
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

function TopGamesTrend({ games, percentile = 100 }: any) {
  const visibleGames = applyPercentileBand(games, percentile);
  const data = mergeGameTrends(visibleGames);
  const domain = getLineChartDomain(data, visibleGames.map((game: any) => game.title));
  const colors = ["#5fbfd0", "#7c3aed", "#d6a06d", "#5b5d78", "#16a34a"];

  if (!data.length) return <Unavailable text="No game snapshots available." />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
	        <CartesianGrid strokeDasharray="4 4" stroke="#d9dde5" />
	        <XAxis dataKey="date" fontSize={11} />
	        <YAxis fontSize={11} domain={domain} />
	        <Tooltip content={<TopGamesTooltip />} />
	        {visibleGames.map((game: any, index: number) => (
	          <Line
	            key={game.id}
	            type="monotone"
	            dataKey={game.title}
	            stroke={colors[index % colors.length]}
	            strokeWidth={index < 5 ? 2.5 : index < 10 ? 1.5 : 0.8}
              strokeOpacity={index < 5 ? 0.95 : index < 10 ? 0.58 : 0.22}
	            dot={false}
	          />
	        ))}
	      </LineChart>
	    </ResponsiveContainer>
	  );
}

function FortniteIslandsTrend({ islands, percentile = 100 }: any) {
  const visibleIslands = applyPercentileBand(islands, percentile);
  const data = mergeFortniteIslandTrends(visibleIslands);
  const domain = getLineChartDomain(
    data,
    visibleIslands.map((island: any) => island.title)
  );
  const colors = ["#7c3aed", "#5fbfd0", "#d6a06d", "#16a34a", "#ef4444"];

  if (!data.length) {
    return (
      <Unavailable text="No Fortnite activity snapshots available yet. Run the Fortnite refresh after deploying the updated importer." />
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="4 4" stroke="#d9dde5" />
        <XAxis dataKey="date" fontSize={11} />
        <YAxis fontSize={11} domain={domain} />
        <Tooltip content={<TopGamesTooltip />} />
        {visibleIslands.map((island: any, index: number) => (
          <Line
            key={island.id}
            type="monotone"
            dataKey={island.title}
            stroke={colors[index % colors.length]}
            strokeWidth={index < 5 ? 2.5 : index < 10 ? 1.5 : 0.8}
            strokeOpacity={index < 5 ? 0.95 : index < 10 ? 0.58 : 0.22}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function FortniteGenreTrend({ islands, percentile = 100 }: any) {
  const visibleIslands = applyPercentileBand(islands, percentile);
  const { data, genres } = mergeFortniteGenreTrends(visibleIslands);
  const domain = getLineChartDomain(data, genres);
  const colors = ["#7c3aed", "#5fbfd0", "#d6a06d", "#16a34a", "#ef4444"];

  if (!data.length) {
    return (
      <Unavailable text="No Fortnite genre activity snapshots available yet. Run the Fortnite refresh after deploying the updated importer." />
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="4 4" stroke="#d9dde5" />
        <XAxis dataKey="date" fontSize={11} />
        <YAxis fontSize={11} domain={domain} />
        <Tooltip content={<TopGamesTooltip />} />
        {genres.map((genre: string, index: number) => (
          <Line
            key={genre}
            type="monotone"
            dataKey={genre}
            stroke={colors[index % colors.length]}
            strokeWidth={index < 5 ? 2.5 : index < 10 ? 1.5 : 0.8}
            strokeOpacity={index < 5 ? 0.95 : index < 10 ? 0.58 : 0.22}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function TopGamesTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const rows = payload
    .filter((item: any) => item.value)
    .sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0))
    .slice(0, 8);

  return (
    <div className="max-w-xs rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <p className="mb-2 font-black text-slate-700">{label}</p>
      <div className="space-y-1">
        {rows.map((item: any) => (
          <div key={item.dataKey} className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-slate-600">{item.dataKey}</span>
            <span className="font-black text-slate-900">
              {formatNumber(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function applyPercentileBand(items: any[], percentile: number) {
  if (percentile === 100) return items;

  const bandSize = Math.max(1, Math.ceil(items.length * 0.25));
  const start = percentile === 25 ? 0 : percentile === 50 ? bandSize : bandSize * 2;

  return items.slice(start, start + bandSize);
}

function getLineChartDomain(data: any[], keys: string[]) {
  const values = data.flatMap((row) =>
    keys
      .map((key) => row[key])
      .filter((value) => typeof value === "number" && Number.isFinite(value))
  );

  if (!values.length) return ["auto", "auto"];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max(1, Math.round((max - min) * 0.08));

  return [Math.max(0, min - padding), max + padding];
}

function GenreLinesTrend({ games, percentile = 100 }: any) {
  const visibleGames = applyPercentileBand(games, percentile);
  const { data, genres } = mergeGenreTrends(visibleGames);
  const domain = getLineChartDomain(data, genres);
  const colors = ["#5fbfd0", "#7c3aed", "#d6a06d", "#5b5d78", "#16a34a", "#ef4444"];

  if (!data.length) return <Unavailable text="No genre snapshots available." />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="4 4" stroke="#d9dde5" />
        <XAxis dataKey="date" fontSize={11} />
	        <YAxis fontSize={11} domain={domain} />
	        <Tooltip content={<TopGamesTooltip />} />
	        {genres.map((genre: string, index: number) => (
	          <Line
            key={genre}
            type="monotone"
	            dataKey={genre}
	            stroke={colors[index % colors.length]}
	            strokeWidth={index < 5 ? 2.5 : index < 10 ? 1.5 : 0.8}
              strokeOpacity={index < 5 ? 0.95 : index < 10 ? 0.58 : 0.22}
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

function mergeFortniteIslandTrends(islands: any[]) {
  const byDate: Record<string, any> = {};

  islands.forEach((island) => {
    (island.snapshots ?? []).forEach((snapshot: any) => {
      const value = getFortniteSnapshotValue(snapshot);
      if (typeof value !== "number") return;

      const date = formatShortDate(snapshot.created_at);
      if (!byDate[date]) byDate[date] = { date };
      byDate[date][island.title] = value;
    });
  });

  return Object.values(byDate);
}

function mergeFortniteGenreTrends(islands: any[]) {
  const byGenreTotals: Record<string, number> = {};

  islands.forEach((island) => {
    const genre = island.inferred_genre ?? "Other";
    byGenreTotals[genre] =
      (byGenreTotals[genre] ?? 0) + (island.latestActivityValue ?? 0);
  });

  const genres = Object.entries(byGenreTotals)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([genre]) => genre);
  const byDate: Record<string, any> = {};

  islands
    .filter((island) => genres.includes(island.inferred_genre ?? "Other"))
    .forEach((island) => {
      (island.snapshots ?? []).forEach((snapshot: any) => {
        const value = getFortniteSnapshotValue(snapshot);
        if (typeof value !== "number") return;

        const date = formatShortDate(snapshot.created_at);
        const genre = island.inferred_genre ?? "Other";
        if (!byDate[date]) byDate[date] = { date };
        byDate[date][genre] = (byDate[date][genre] ?? 0) + value;
      });
    });

  return { data: Object.values(byDate), genres };
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

const fallbackTileColorPairs = [
  {
    primary: { hex: "#5fbfd0", rgb: "RGB 95, 191, 208" },
    secondary: { hex: "#111827", rgb: "RGB 17, 24, 39" },
  },
  {
    primary: { hex: "#7c3aed", rgb: "RGB 124, 58, 237" },
    secondary: { hex: "#d6a06d", rgb: "RGB 214, 160, 109" },
  },
  {
    primary: { hex: "#16a34a", rgb: "RGB 22, 163, 74" },
    secondary: { hex: "#5b5d78", rgb: "RGB 91, 93, 120" },
  },
  {
    primary: { hex: "#d6a06d", rgb: "RGB 214, 160, 109" },
    secondary: { hex: "#7c3aed", rgb: "RGB 124, 58, 237" },
  },
  {
    primary: { hex: "#5b5d78", rgb: "RGB 91, 93, 120" },
    secondary: { hex: "#5fbfd0", rgb: "RGB 95, 191, 208" },
  },
];

function extractTileColors(src?: string) {
  if (!src || typeof window === "undefined") {
    return Promise.resolve(null);
  }

  return new Promise<{
    primary: { hex: string; rgb: string };
    secondary: { hex: string; rgb: string };
  } | null>((resolve) => {
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
        const buckets: Record<string, { red: number; green: number; blue: number; count: number }> = {};

        for (let index = 0; index < data.length; index += 16) {
          const alpha = data[index + 3];
          if (alpha < 128) continue;

          const red = data[index];
          const green = data[index + 1];
          const blue = data[index + 2];
          const key = `${Math.round(red / 32) * 32},${Math.round(green / 32) * 32},${Math.round(blue / 32) * 32}`;

          if (!buckets[key]) {
            buckets[key] = { red: 0, green: 0, blue: 0, count: 0 };
          }

          buckets[key].red += red;
          buckets[key].green += green;
          buckets[key].blue += blue;
          buckets[key].count += 1;
        }

        const swatches = Object.values(buckets)
          .sort((a, b) => b.count - a.count)
          .slice(0, 2)
          .map((bucket) => {
            const r = Math.round(bucket.red / bucket.count);
            const g = Math.round(bucket.green / bucket.count);
            const b = Math.round(bucket.blue / bucket.count);

            return {
              hex: rgbToHex(r, g, b),
              rgb: `RGB ${r}, ${g}, ${b}`,
            };
          });

        if (!swatches.length) {
          resolve(null);
          return;
        }

        resolve({
          primary: swatches[0],
          secondary: swatches[1] ?? swatches[0],
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
  const sign = number < 0 ? "-" : "";
  const absolute = Math.abs(number);

  if (absolute >= 1000000) return `${sign}${(absolute / 1000000).toFixed(1)}M`;
  if (absolute >= 1000) return `${sign}${(absolute / 1000).toFixed(1)}K`;
  return `${number}`;
}

function parseNumber(value: string) {
  if (value.includes("M")) return parseFloat(value) * 1000000;
  if (value.includes("K")) return parseFloat(value) * 1000;
  return parseFloat(value) || 0;
}
