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
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const FORTNITE_ISLAND_SELECT = `
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

type Platform = "roblox" | "fortnite";
type TrendTimeWindow = "7d" | "30d" | "3m";

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
  const [showTerms, setShowTerms] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);
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
  const [topGamesTrendWindow, setTopGamesTrendWindow] =
    useState<TrendTimeWindow>("7d");
  const [genreTrendLimit, setGenreTrendLimit] = useState<3 | 10>(3);
  const [genreTrendPercentile, setGenreTrendPercentile] =
    useState<25 | 50 | 75 | 100>(100);
  const [genreTrendWindow, setGenreTrendWindow] =
    useState<TrendTimeWindow>("7d");
  const [fortniteLabelTrendLimit, setFortniteLabelTrendLimit] =
    useState<10 | 25>(10);
  const [fortniteLifecycleLimit, setFortniteLifecycleLimit] =
    useState<10 | 25>(25);
  const [fortniteLabelTrendWindow, setFortniteLabelTrendWindow] =
    useState<TrendTimeWindow>("7d");
  const [fortniteGenreScoreboardLimit, setFortniteGenreScoreboardLimit] =
    useState<10 | 25>(25);
  const [fortniteGenreScoreboardWindow, setFortniteGenreScoreboardWindow] =
    useState<TrendTimeWindow>("7d");
  const [predictionSearch, setPredictionSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const accent = activePlatform === "roblox" ? "#0d69ac" : "#7c3aed";
  const currentDateLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    []
  );

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
          genre,
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

      const { data: fortniteData, error: fortniteError } =
        await fetchAllFortniteIslands();

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
  const activeGenreAnalysisItems = useMemo(
    () => getGenreAnalysisItems(activeItems, activePlatform),
    [activeItems, activePlatform]
  );

  const genres = useMemo(() => {
    return Array.from(
      new Set(
        activeGenreAnalysisItems.map((item) => getDisplayGenre(item, activePlatform))
      )
    ).sort();
  }, [activeGenreAnalysisItems, activePlatform]);

  const subgenres = useMemo(() => {
    return Array.from(
      new Set(
        activeGenreAnalysisItems
          .filter(
            (item) => !selectedGenre || getDisplayGenre(item, activePlatform) === selectedGenre
          )
          .map((item) => getDisplaySubgenre(item, activePlatform))
      )
    ).sort();
  }, [activeGenreAnalysisItems, activePlatform, selectedGenre]);

  const filteredIdeaItems = activeGenreAnalysisItems.filter((item) => {
    const genreMatch = !selectedGenre || getDisplayGenre(item, activePlatform) === selectedGenre;
    const subgenreMatch =
      !selectedSubgenre || getDisplaySubgenre(item, activePlatform) === selectedSubgenre;
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
  const robloxGenreAnalysisGames = useMemo(
    () => getGenreAnalysisItems(robloxGames, "roblox"),
    [robloxGames]
  );
  const topRobloxGenreAnalysisGames = useMemo(
    () =>
      [...robloxGenreAnalysisGames].sort(
        (a, b) => (b.latestPlayers ?? 0) - (a.latestPlayers ?? 0)
      ),
    [robloxGenreAnalysisGames]
  );

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

  const topGenreScoreboard = buildTopGenreScoreboard(robloxGenreAnalysisGames);
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
  const robloxHeuristicCount = useMemo(
    () =>
      activePlatform === "roblox"
        ? activeGenreAnalysisItems.filter(
            (item) => getClassificationConfidence(item, "roblox") === "estimated"
          ).length
        : 0,
    [activeGenreAnalysisItems, activePlatform]
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

  const dashboardContext = {
    activePlatform,
    activeItems,
    dataSourceHealth,
    activeGenreAnalysisItems,
    robloxGenreAnalysisGames,
    topRobloxGenreAnalysisGames,
    panel,
    accent,
    topFortniteIslands,
    fortniteIslands,
    trendingHighlights,
    topGamesTrendLimit,
    topGamesTrendPercentile,
    topGamesTrendWindow,
    setTopGamesTrendLimit,
    setTopGamesTrendPercentile,
    setTopGamesTrendWindow,
    genreTrendLimit,
    genreTrendPercentile,
    genreTrendWindow,
    setGenreTrendLimit,
    setGenreTrendPercentile,
    setGenreTrendWindow,
    fortniteLabelTrendLimit,
    fortniteLifecycleLimit,
    fortniteLabelTrendWindow,
    fortniteGenreScoreboardLimit,
    fortniteGenreScoreboardWindow,
    setFortniteLabelTrendLimit,
    setFortniteLifecycleLimit,
    setFortniteLabelTrendWindow,
    setFortniteGenreScoreboardLimit,
    setFortniteGenreScoreboardWindow,
    selectedGenre,
    selectedSubgenre,
    setSelectedGenre,
    setSelectedSubgenre,
    genres,
    subgenres,
    filteredIdeaItems,
    ideaPercent,
    topSimilar,
    predictionSearch,
    setPredictionSearch,
    predictionTarget,
    predictionSignals,
  };

  return (
    <main className={`min-h-screen p-6 ${shell}`}>
      <div className={`mx-auto max-w-7xl rounded-[32px] p-8 ${panel} border`}>
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 flex-none items-center justify-center"
              role="img"
              aria-label="Snout logo"
            >
              <img
                src="/LogoSnoutBoard.svg"
                alt=""
                aria-hidden="true"
                className="h-10 w-10 object-contain"
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black tracking-tight">
                  Snout - UGC Intel Dashboard
                </h1>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                  Beta
                </span>
              </div>
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
                activeColor="#0d69ac"
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

            <DatePill date={currentDateLabel} accent={accent} />

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
              <span>
                <strong>Informational use only.</strong> Snout provides
                directional market intelligence, data summaries, and automated
                classifications for research and creative exploration. It does
                not provide legal, financial, investment, business, or
                professional advice and does not guarantee revenue, player
                growth, discoverability, platform placement, or creator success.
              </span>
              <span className="mt-2 block">
                Video games are a form of art, please use the displayed
                information to fuel your creativity and ultimately provide fun.
              </span>
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
            Platform-specific market signals for creative research and market exploration.
          </p>
        </section>

        {loading ? (
          <p>Loading platform data...</p>
        ) : activePlatform === "roblox" ? (
          /* Roblox dashboard branch. Keep Fortnite-specific UI changes in FortniteDashboardView. */
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
                  `Rows included in genre-level analysis, source-confirmed or estimated: ${formatNumber(
                    dataSourceHealth.genreEligibleCount
                  )} of ${formatNumber(dataSourceHealth.totalRecords)}.`,
                  `Heuristic fallback rows are labeled when Roblox source taxonomy is unavailable: ${formatNumber(
                    robloxHeuristicCount
                  )}.`,
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
                            getDisplaySubgenre(i, activePlatform)
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
                footerAction={
                  activePlatform === "roblox" ? (
                    <TimeWindowControls
                      timeWindow={topGamesTrendWindow}
                      onTimeWindowChange={setTopGamesTrendWindow}
                      accent={accent}
                    />
                  ) : null
                }
              >
                {activePlatform === "roblox" ? (
                  <TopGamesTrend
                    games={topRobloxGames.slice(0, topGamesTrendLimit)}
                    percentile={topGamesTrendPercentile}
                    timeWindow={topGamesTrendWindow}
                  />
                ) : (
                  <FortniteIslandsTrend
                    islands={topFortniteIslands.slice(0, topGamesTrendLimit)}
                    percentile={topGamesTrendPercentile}
                    timeWindow={topGamesTrendWindow}
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
                    <GenreTrendControls
                      limit={genreTrendLimit}
                      onLimitChange={setGenreTrendLimit}
                      accent={accent}
                    />
                  ) : null
                }
                footerAction={
                  activePlatform === "roblox" ? (
                    <TimeWindowControls
                      timeWindow={genreTrendWindow}
                      onTimeWindowChange={setGenreTrendWindow}
                      accent={accent}
                    />
                  ) : null
                }
              >
                {activePlatform === "roblox" ? (
                    <GenreLinesTrend
                    games={topRobloxGenreAnalysisGames}
                    limit={genreTrendLimit}
                    timeWindow={genreTrendWindow}
                  />
                ) : (
                  <FortniteGenreTrend
                    islands={topFortniteIslands.slice(0, genreTrendLimit)}
                    percentile={genreTrendPercentile}
                    timeWindow={genreTrendWindow}
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
                genreOptionsItems={
                  activePlatform === "roblox"
                    ? robloxGenreAnalysisGames
                    : topFortniteIslands
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
                genreOptionsItems={
                  activePlatform === "roblox"
                    ? robloxGenreAnalysisGames
                    : topFortniteIslands
                }
                panel={panel}
                accent={accent}
              />
            </section>

            <section className="mb-6">
              <CorrelationAnalysisCard
                title="Metric Correlation Analysis"
                subtitle="Compare Roblox game-level metrics to see whether two signals move together."
                games={topRobloxGames}
                panel={panel}
                accent={accent}
              />
            </section>

            <section className="mb-6">
              <div className={`rounded-3xl border p-6 ${panel}`}>
                <h2 className="text-2xl font-bold">Directional Research Map</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Deeper blue indicates a stronger directional research signal; lighter blue indicates weaker signal strength or higher uncertainty.
                </p>
                <BlockHeatMap
                  items={activeGenreAnalysisItems}
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
                        <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                          {topSimilar.slice(0, 5).map((item: any, index: number) => (
                            <GameMarketCard
                              key={item.id}
                              item={item}
                              rank={index + 1}
                              platform={activePlatform}
                              panel={panel}
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
                title="Research Signal"
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
	                    ? "There are enough examples to investigate repeatable patterns."
	                    : "This is a lower-signal area and should be treated as exploratory.",
                ]}
              />

              <RecommendationBlock
                title="Design Cues"
                panel={panel}
                accent={accent}
                readout={buildDesignCuesReadout(topTags(filteredIdeaItems), filteredIdeaItems.length)}
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
	                  "Roblox signals are based on current player snapshots and inferred classifications.",
                    "Rows marked Heuristic fallback use title, description, and chart text because Roblox source taxonomy was unavailable.",
		                  "Use this as informational market intelligence, not as business advice or a prediction of creator outcome.",
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
        ) : (
          <FortniteDashboardView context={dashboardContext} />
        )}

        <footer className="mt-12 flex min-h-20 flex-wrap items-start justify-between gap-3 border-t border-slate-200 pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowTerms(true)}
              className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-500 transition hover:bg-slate-100"
            >
              Terms of service
            </button>
            <button
              type="button"
              onClick={() => setShowGlossary(true)}
              className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-500 transition hover:bg-slate-100"
            >
              Glossary
            </button>
          </div>
          <p className="rounded-full bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-400">
            v0.01
          </p>
        </footer>
        {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
        {showGlossary && <GlossaryModal onClose={() => setShowGlossary(false)} />}
      </div>
    </main>
  );
}

function FortniteDashboardView({ context }: any) {
  const {
    activePlatform,
    activeItems,
    dataSourceHealth,
    panel,
    accent,
    topFortniteIslands,
    fortniteIslands,
    trendingHighlights,
    topGamesTrendLimit,
    topGamesTrendPercentile,
    topGamesTrendWindow,
    setTopGamesTrendLimit,
    setTopGamesTrendPercentile,
    setTopGamesTrendWindow,
    genreTrendLimit,
    genreTrendPercentile,
    genreTrendWindow,
    setGenreTrendLimit,
    setGenreTrendPercentile,
    setGenreTrendWindow,
    fortniteLabelTrendLimit,
    fortniteLifecycleLimit,
    fortniteLabelTrendWindow,
    fortniteGenreScoreboardLimit,
    fortniteGenreScoreboardWindow,
    setFortniteLabelTrendLimit,
    setFortniteLifecycleLimit,
    setFortniteLabelTrendWindow,
    setFortniteGenreScoreboardLimit,
    setFortniteGenreScoreboardWindow,
    selectedGenre,
    selectedSubgenre,
    setSelectedGenre,
    setSelectedSubgenre,
    genres,
    subgenres,
    filteredIdeaItems,
    ideaPercent,
    topSimilar,
    predictionSearch,
    setPredictionSearch,
    predictionTarget,
    predictionSignals,
  } = context;
  const currentTopFortniteIslands = getFortniteIslandsBySnapshotRank(
    fortniteIslands,
    0
  );

  return (
    <>
      <section className="mb-6 grid gap-4 lg:grid-cols-4">
        <DataSourceHealthCard
          title="Data Source & Health"
          items={[
            `How many islands are queried in the latest snapshot: ${formatNumber(
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
          title="Top 5 Fortnite Islands"
          subtitle="Ranked by the latest imported source snapshot"
          items={currentTopFortniteIslands.slice(0, 5).map((island: any, index: number) => {
            const yesterdayIsland = getFortniteIslandBySnapshotRank(
              fortniteIslands,
              index + 1,
              1
            );

            return {
              label: island.title,
              subline: `Yesterday: ${yesterdayIsland?.title ?? "placeholder"}`,
              badge: getFortniteIpSignal(island)?.label,
              wrap: true,
              href: island.url,
            };
          })}
          panel={panel}
          accent={accent}
        />

        <GenreShareCard
          title="Top 3 Genres / Subgenres"
          subtitle={`By source Top ${fortniteGenreScoreboardLimit} appearances across ${getTrendWindowLabel(fortniteGenreScoreboardWindow)}`}
          items={buildFortniteGenreScoreboard(
            fortniteIslands,
            fortniteGenreScoreboardLimit,
            fortniteGenreScoreboardWindow
          )}
          action={
            <FortniteLabelTrendControls
              limit={fortniteGenreScoreboardLimit}
              onLimitChange={setFortniteGenreScoreboardLimit}
              accent={accent}
            />
          }
          footerAction={
            <TimeWindowControls
              timeWindow={fortniteGenreScoreboardWindow}
              onTimeWindowChange={setFortniteGenreScoreboardWindow}
              accent={accent}
            />
          }
          panel={panel}
          accent={accent}
        />

        <FortniteLabelRankingsCard
          title="Top 10 Primary Labels"
          subtitle="First surfaced label across imported islands"
          items={buildFortniteLabelRankings(fortniteIslands)}
          panel={panel}
          accent={accent}
        />
      </section>

      <section className="mb-6 grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Most Featured Islands"
          subtitle="Islands with the most captured days in the source Top 25."
          panel={panel}
          contentClassName="min-h-[30rem]"
        >
          <FortniteFeaturedIslandsBar
            islands={fortniteIslands}
            limit={25}
            accent={accent}
          />
        </ChartCard>

        <ChartCard
          title="Primary Label Usage Over Time"
          subtitle={`Top ${fortniteLabelTrendLimit} first-surfaced labels by island usage across stored snapshots.`}
          panel={panel}
          action={
            <FortniteLabelTrendControls
              limit={fortniteLabelTrendLimit}
              onLimitChange={setFortniteLabelTrendLimit}
              accent={accent}
            />
          }
          footerAction={
            <TimeWindowControls
              timeWindow={fortniteLabelTrendWindow}
              onTimeWindowChange={setFortniteLabelTrendWindow}
              accent={accent}
            />
          }
        >
          <FortniteLabelUsageTrend
            islands={fortniteIslands}
            limit={fortniteLabelTrendLimit}
            timeWindow={fortniteLabelTrendWindow}
          />
        </ChartCard>
      </section>

      <section className="mb-6">
        <ChartCard
          title="Genre / Format Presence Over Time"
          subtitle="Count of tracked islands by inferred Fortnite genre or format."
          panel={panel}
          footerAction={
            <TimeWindowControls
              timeWindow={genreTrendWindow}
              onTimeWindowChange={setGenreTrendWindow}
              accent={accent}
            />
          }
        >
          <FortniteGenrePresenceTrend
            islands={fortniteIslands}
            timeWindow={genreTrendWindow}
          />
        </ChartCard>
      </section>

      <section className="mb-6">
        <ChartCard
          title="New vs Returning Islands"
          subtitle={`Newest and longest-standing islands in the source Top ${fortniteLifecycleLimit}.`}
          panel={panel}
          contentClassName="h-auto"
          action={
            <FortniteLabelTrendControls
              limit={fortniteLifecycleLimit}
              onLimitChange={setFortniteLifecycleLimit}
              accent={accent}
            />
          }
        >
          <FortniteIslandLifecycleRankings
            islands={fortniteIslands}
            limit={fortniteLifecycleLimit}
            accent={accent}
          />
        </ChartCard>
      </section>

      <section className="mb-6 grid gap-6 lg:grid-cols-3">
        <KeywordCloudCard
          title="Top 25 Keyword Cloud"
          subtitle="Common title and description signals across the top 25 islands"
          games={topFortniteIslands.slice(0, 25)}
          panel={panel}
          accent={accent}
          combinedCloud={true}
        />

        <FortniteIpSignalsCard
          title="IP / Collaboration Signals"
          subtitle="Primary labels and description cues in the latest substantial island collection"
          islands={getFortniteIslandsByLatestSubstantialSnapshot(fortniteIslands)}
          panel={panel}
          accent={accent}
        />

        <ColorBreakdownCard
          title="Top Tile Colors"
          subtitle="Primary and secondary RGB colors from the top 25 islands"
          games={currentTopFortniteIslands.slice(0, 25)}
          panel={panel}
          accent={accent}
        />
      </section>

      <section className="mb-6">
        <CorrelationAnalysisCard
          title="Metric Correlation Analysis"
          subtitle="Compare Fortnite island-level metadata and source visibility signals to see whether two captured signals move together."
          games={buildFortniteCorrelationItems(fortniteIslands)}
          metrics={fortniteCorrelationMetricOptions}
          defaultXMetricKey="sourcePopularityProxy"
          defaultYMetricKey="topThreeLabelReach"
          caveat="Correlation is directional market intelligence, not causation. Source ordering, rotating discovery surfaces, sparse rank history, and categorical encoding can distort the result."
          panel={panel}
          accent={accent}
        />
      </section>

      <section className="mb-6">
        <div className={`rounded-3xl border p-6 ${panel}`}>
          <h2 className="text-2xl font-bold">Directional Research Map</h2>
          <p className="mt-1 text-sm text-slate-500">
            Deeper blue indicates a stronger directional research signal; lighter blue indicates weaker signal strength or higher uncertainty.
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
          <h2 className="text-2xl font-bold">My Fortnite Island Idea Is</h2>
          <p className="mt-1 text-sm text-slate-500">
            Use this as a reflection tool to position your island concept.
          </p>

          <div className="mt-5 space-y-3">
            <select
              className="w-full rounded-xl border p-3 text-sm text-slate-800"
              value={selectedGenre}
              onChange={(event) => {
                setSelectedGenre(event.target.value);
                setSelectedSubgenre("");
              }}
            >
              <option value="">Select Genre</option>
              {genres.map((genre: string) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>

            <select
              className="w-full rounded-xl border p-3 text-sm text-slate-800"
              value={selectedSubgenre}
              onChange={(event) => setSelectedSubgenre(event.target.value)}
            >
              <option value="">Select Subgenre</option>
              {subgenres.map((subgenre: string) => (
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
                <strong>{ideaPercent}%</strong> of the imported Fortnite islands.
              </li>
            </ul>
            {topSimilar.length ? (
              <div className="mt-5 border-t border-slate-200 pt-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Similar top islands
                </p>
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
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        <RecommendationBlock
          title="Research Signal"
          panel={panel}
          accent={accent}
          bullets={[
            `This segment maps to ${filteredIdeaItems.length} imported Fortnite islands.`,
            `${ideaPercent}% of the Fortnite dataset matches this idea profile.`,
            filteredIdeaItems.length > 5
              ? "There are enough examples to investigate repeatable island patterns."
              : "This is a lower-signal area and should be treated as exploratory.",
          ]}
        />

        <RecommendationBlock
          title="Design Cues"
          panel={panel}
          accent={accent}
          readout={buildDesignCuesReadout(topTags(filteredIdeaItems), filteredIdeaItems.length)}
          tags={topTags(filteredIdeaItems)}
        />

        <RecommendationBlock
          title="Warnings"
          panel={panel}
          accent={accent}
          bullets={[
            filteredIdeaItems.length < 5
              ? "This combination has low representation in the imported Fortnite dataset."
              : "This combination has visible competition in the imported Fortnite dataset.",
            "Fortnite signals use official activity fields when the source returns them; missing fields should be treated as coverage gaps.",
            "Use this as informational market intelligence, not as business advice or a prediction of creator outcome.",
          ]}
        />
      </section>

      <section className={`rounded-3xl border p-6 ${panel}`}>
        <h2 className="text-2xl font-bold">Top 25 Fortnite Islands</h2>
        <p className="mt-1 text-sm text-slate-500">
          Ranked by the latest imported source snapshot.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {currentTopFortniteIslands.slice(0, 25).map((item: any, index: number) => (
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

async function fetchAllFortniteIslands() {
  const pageSize = 1000;
  const rows: any[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("fortnite_islands")
      .select(FORTNITE_ISLAND_SELECT)
      .order("island_code", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("Fortnite fetch error:", error);
      return { data: rows, error };
    }

    rows.push(...(data ?? []));

    if (!data || data.length < pageSize) {
      return { data: rows, error: null };
    }
  }
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
    latestRank: getFortniteSnapshotRank(latest),
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

  return "Official metrics pending";
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
  const map: Record<
    string,
    {
      genre: string;
      subgenre: string;
      players: number;
      count: number;
      heuristicCount: number;
    }
  > = {};

  games.forEach((game) => {
    const genre = getDisplayGenre(game, "roblox");
    const subgenre = getDisplaySubgenre(game, "roblox");
    const key = `${genre}|||${subgenre}`;

    if (!map[key]) {
      map[key] = { genre, subgenre, players: 0, count: 0, heuristicCount: 0 };
    }

    map[key].players += game.latestPlayers ?? 0;
    map[key].count += 1;
    if (getClassificationConfidence(game, "roblox") === "estimated") {
      map[key].heuristicCount += 1;
    }
  });

  const rows = Object.values(map).map((value) => ({
      label: value.genre,
      subline:
        value.heuristicCount > 0
          ? `${value.subgenre} · ${formatNumber(value.heuristicCount)} heuristic`
          : value.subgenre,
      value: formatNumber(value.players),
      rawValue: value.players,
      rawGenre: value.genre,
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

function buildFortniteGenreScoreboard(
  islands: any[],
  limit: 10 | 25 = 25,
  timeWindow: TrendTimeWindow = "7d"
) {
  const map: Record<string, { genre: string; subgenre: string; count: number }> = {};
  const latestDateKey =
    getFortniteSubstantialSnapshotDateKeys(islands).at(-1) ??
    getAvailableFortniteSnapshotDateKeys(islands).at(-1);
  const latestDate = parseDateKey(latestDateKey);
  const startDate = latestDate ? new Date(latestDate) : null;

  if (startDate) {
    startDate.setUTCDate(startDate.getUTCDate() - getTrendWindowDays(timeWindow) + 1);
  }

  let total = 0;

  islands.forEach((island) => {
    const genre = island.inferred_genre ?? "Other";
    const subgenre = island.inferred_subgenre ?? "General";
    const key = `${genre}|||${subgenre}`;
    const seenDateKeys = new Set<string>();

    if (!map[key]) {
      map[key] = { genre, subgenre, count: 0 };
    }

    (island.snapshots ?? []).forEach((snapshot: any) => {
      const dateKey = getSnapshotDateKey(snapshot.created_at);
      const snapshotDate = parseDateKey(dateKey);
      const inWindow =
        snapshotDate &&
        latestDate &&
        startDate &&
        snapshotDate >= startDate &&
        snapshotDate <= latestDate;
      const inRankScope =
        typeof snapshot.rank === "number" && snapshot.rank <= limit;

      if (!dateKey || !inWindow || !inRankScope || seenDateKeys.has(dateKey)) {
        return;
      }

      seenDateKeys.add(dateKey);
      map[key].count += 1;
      total += 1;
    });
  });

  if (!total) {
    islands.slice(0, limit).forEach((island) => {
      const genre = island.inferred_genre ?? "Other";
      const subgenre = island.inferred_subgenre ?? "General";
      const key = `${genre}|||${subgenre}`;

      if (!map[key]) {
        map[key] = { genre, subgenre, count: 0 };
      }

      map[key].count += 1;
      total += 1;
    });
  }

  return Object.values(map)
    .filter((item) => item.count > 0)
    .map((item) => ({
      label: item.genre,
      subline: item.subgenre,
      value: `${formatNumber(item.count)} appearances`,
      rawValue: item.count,
      share: total ? Math.round((item.count / total) * 100) : 0,
    }))
    .sort((a, b) => b.rawValue - a.rawValue)
    .slice(0, 3);
}

function buildFortniteMetricCoverage(islands: any[]) {
  const total = islands.length || 1;
  const definitions = [
    { label: "Peak CCU", key: "latestPeakCcu" },
    { label: "Plays", key: "latestPlays" },
    { label: "Minutes Played", key: "latestMinutesPlayed" },
    { label: "Recommends", key: "latestRecommends" },
    { label: "Unique Players", key: "latestUniquePlayers" },
    { label: "D7 Retention", key: "latestRetentionD7" },
  ];

  return definitions.map((definition) => {
    const count = islands.filter(
      (island) => typeof island[definition.key] === "number"
    ).length;

    return {
      ...definition,
      count,
      total: islands.length,
      percent: Math.round((count / total) * 100),
    };
  });
}

function buildFortniteLabelRankings(islands: any[]) {
  const dateKeys = getFortniteSubstantialSnapshotDateKeys(islands);
  const latestDate = dateKeys.at(-1) ?? "";
  const previousDate = dateKeys.length > 1 ? dateKeys.at(-2) ?? "" : "";
  const currentRows = rankFortniteLabels(
    latestDate
      ? islands.filter((island) =>
          (island.snapshots ?? []).some((snapshot: any) =>
            String(snapshot.created_at ?? "").startsWith(latestDate)
          )
        )
      : islands
  );
  const previousRows = previousDate
    ? rankFortniteLabels(
        islands.filter((island) =>
          (island.snapshots ?? []).some((snapshot: any) =>
            String(snapshot.created_at ?? "").startsWith(previousDate)
          )
        )
      )
    : [];
  const previousRankByLabel = new Map(
    previousRows.map((row: any) => [row.label, row.rank])
  );

  return currentRows.slice(0, 10).map((row: any) => {
    const previousRank = previousRankByLabel.get(row.label) ?? null;

    return {
      ...row,
      previousRank,
      movement: previousRank ? previousRank - row.rank : 0,
    };
  });
}

function rankFortniteLabels(islands: any[]) {
  const counts: Record<string, number> = {};

  islands.forEach((island) => {
    const label = getFortnitePrimaryLabel(island);
    if (label) {
      counts[label] = (counts[label] ?? 0) + 1;
    }
  });

  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

const fortniteIpLabelPatterns = [
  { label: "Star Wars", pattern: /star\s*wars/i },
  { label: "Marvel", pattern: /marvel/i },
  { label: "Disney", pattern: /disney/i },
  { label: "TMNT", pattern: /tmnt|teenage mutant ninja/i },
  { label: "LEGO", pattern: /lego/i },
  { label: "Dragon Ball", pattern: /dragon\s*ball/i },
  { label: "Naruto", pattern: /naruto/i },
  { label: "One Piece", pattern: /one\s*piece/i },
  { label: "K-Pop", pattern: /k-?pop/i },
  { label: "Sports IP", pattern: /nfl|nba|fifa|ufc/i },
  { label: "Nike", pattern: /nike/i },
  { label: "Adidas", pattern: /adidas/i },
  { label: "Squid Game", pattern: /squid\s*game/i },
  { label: "The Simpsons", pattern: /simpsons/i },
  { label: "Avatar", pattern: /avatar/i },
  { label: "Jurassic", pattern: /jurassic/i },
  { label: "Transformers", pattern: /transformers/i },
  { label: "DC / Batman", pattern: /batman|dc comics/i },
  { label: "Restaurant Brand", pattern: /wendy'?s|mcdonald|burger king/i },
];

function buildFortniteIpSignals(islands: any[]) {
  const map: Record<string, { label: string; type: string; count: number; examples: string[] }> = {};

  islands.forEach((island) => {
    const signal = getFortniteIpSignal(island);
    if (!signal) return;

    if (!map[signal.label]) {
      map[signal.label] = {
        label: signal.label,
        type: signal.type,
        count: 0,
        examples: [],
      };
    }

    map[signal.label].count += 1;
    if (map[signal.label].examples.length < 3) {
      map[signal.label].examples.push(island.title ?? "Untitled island");
    }
  });

  return Object.values(map).sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label)
  );
}

function getFortniteIpSignal(island: any) {
  const primaryLabel = getFortnitePrimaryLabel(island);
  const allLabels = getFortniteGameplayLabels(island);
  const descriptionText = getFortniteSearchableText(island);
  const labelMatch = [primaryLabel, ...allLabels].find((label) =>
    isFortniteIpLabel(label)
  );
  const textMatch = getFortniteIpTextMatch(descriptionText);

  if (labelMatch) {
    return {
      label: getFortniteIpTextMatch(labelMatch) ?? labelMatch,
      type: primaryLabel === labelMatch ? "Primary label" : "IP label",
    };
  }

  if (textMatch) {
    return {
      label: textMatch,
      type: "Description cue",
    };
  }

  if (/trademark|copyright|all rights reserved|not official|not endorsed/i.test(descriptionText)) {
    return {
      label: "Rights / brand notice",
      type: "Description cue",
    };
  }

  return null;
}

function getFortniteSearchableText(island: any) {
  const raw = island.raw ?? island.raw_latest ?? {};
  const textParts = [
    island.title,
    island.description,
    island.raw?.description,
    island.raw?.title,
    island.raw?.name,
    island.raw_latest?.description,
    island.raw_latest?.title,
    island.raw_latest?.name,
    stringifyFortniteText(raw),
  ];

  return textParts.filter(Boolean).join(" ");
}

function isFortniteIpLabel(label: unknown) {
  const text = String(label ?? "").trim();
  if (!text) return false;

  return Boolean(getFortniteIpTextMatch(text));
}

function getFortniteIpTextMatch(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return null;

  return fortniteIpLabelPatterns.find((item) => item.pattern.test(text))?.label ?? null;
}

function getFortnitePrimaryLabel(island: any) {
  const firstTag = getFortniteSourceLabels(island)
    .map((label: any) => String(label).trim())
    .find((label: string) => label && !/^unknown|general$/i.test(label));

  return firstTag ?? null;
}

function getFortniteGameplayLabels(island: any) {
  const labels = [
    ...getFortniteSourceLabels(island),
    island.inferred_genre,
    island.inferred_subgenre,
    island.player_intent,
    island.core_loop,
  ]
    .filter(Boolean)
    .map((label) => String(label).trim())
    .filter((label) => label && !/^unknown|general$/i.test(label));

  return Array.from(new Set(labels));
}

function getFortniteSourceLabels(island: any) {
  const raw = island.raw ?? island.raw_latest ?? {};
  const rawLabels = collectFortniteLabelValues([
    raw.tags,
    raw.labels,
    raw.categories,
    raw.gameplayTags,
    raw.keywords,
    raw.metadata?.tags,
    raw.metadata?.labels,
    raw.metadata?.categories,
  ]);

  return [...(island.extracted_tags ?? []), ...rawLabels];
}

function collectFortniteLabelValues(value: any): string[] {
  if (!value) return [];
  if (typeof value === "string") return [value];
  if (typeof value === "number") return [String(value)];
  if (Array.isArray(value)) return value.flatMap(collectFortniteLabelValues);
  if (typeof value === "object") {
    const directValues = [
      value.name,
      value.title,
      value.label,
      value.tag,
      value.value,
      value.displayName,
      value.slug,
    ].filter(Boolean);

    return directValues.map((item) => String(item));
  }

  return [];
}

function stringifyFortniteText(value: any, depth = 0): string {
  if (!value || depth > 4) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => stringifyFortniteText(item, depth + 1)).join(" ");
  }
  if (typeof value === "object") {
    return Object.values(value)
      .map((item) => stringifyFortniteText(item, depth + 1))
      .join(" ");
  }

  return "";
}

function buildKeywordCloud(items: any[], source: "title" | "description" | "all") {
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
    const text =
      source === "title"
        ? item.title
        : source === "description"
          ? item.description
          : `${item.title ?? ""} ${item.description ?? ""}`;

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

function getFortniteIslandBySnapshotRank(
  islands: any[],
  rank: number,
  daysFromLatest: number
) {
  return getFortniteIslandsBySnapshotRank(islands, daysFromLatest)[rank - 1] ?? null;
}

function getFortniteIslandsBySnapshotRank(islands: any[], daysFromLatest: number) {
  const dateKeys = getFortniteSubstantialSnapshotDateKeys(islands);
  const targetKey = dateKeys[dateKeys.length - 1 - daysFromLatest];

  if (!targetKey) return [];

  return islands
    .map((island) => {
      const snapshot = (island.snapshots ?? [])
        .filter((item: any) =>
          String(item.created_at ?? "").startsWith(targetKey)
        )
        .sort(
          (a: any, b: any) =>
            (getFortniteSnapshotRank(a) ?? 999999) -
            (getFortniteSnapshotRank(b) ?? 999999)
        )[0];

      if (!snapshot) return null;

      return {
        ...island,
        rank: getFortniteSnapshotRank(snapshot),
        latestRank: getFortniteSnapshotRank(snapshot) ?? island.latestRank ?? null,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => (a.rank ?? 999999) - (b.rank ?? 999999));
}

function getFortniteIslandsByLatestSnapshot(islands: any[]) {
  const dateKeys = getFortniteSubstantialSnapshotDateKeys(islands);
  const latestKey = dateKeys.at(-1);

  if (!latestKey) return islands;

  return islands.filter((island) =>
    (island.snapshots ?? []).some((snapshot: any) =>
      String(snapshot.created_at ?? "").startsWith(latestKey)
    )
  );
}

function getFortniteIslandsByLatestSubstantialSnapshot(islands: any[]) {
  const latestSubstantialDate = getFortniteSubstantialSnapshotDateKeys(islands).at(-1);

  if (!latestSubstantialDate) return islands;

  return islands.filter((island) =>
    (island.snapshots ?? []).some((snapshot: any) =>
      String(snapshot.created_at ?? "").startsWith(latestSubstantialDate)
    )
  );
}

function getFortniteSnapshotDateCounts(islands: any[]) {
  const dateKeys = getAvailableFortniteSnapshotDateKeys(islands);

  return dateKeys.map((dateKey) => ({
    dateKey,
    count: islands.filter((island) =>
      (island.snapshots ?? []).some((snapshot: any) =>
        String(snapshot.created_at ?? "").startsWith(dateKey)
      )
    ).length,
  }));
}

function getFortniteSubstantialSnapshotDateKeys(islands: any[]) {
  const dateCounts = getFortniteSnapshotDateCounts(islands);
  const substantialKeys = dateCounts
    .filter((row) => row.count >= 25)
    .map((row) => row.dateKey);

  if (substantialKeys.length) return substantialKeys;

  const fallbackDate = [...dateCounts].sort((a, b) => b.count - a.count)[0]?.dateKey;
  return fallbackDate ? [fallbackDate] : [];
}

function getAvailableFortniteSnapshotDateKeys(islands: any[]) {
  return Array.from(
    new Set(
      islands.flatMap((island) =>
        (island.snapshots ?? [])
          .map((snapshot: any) => getSnapshotDateKey(snapshot.created_at))
          .filter(Boolean)
      )
    )
  ).sort();
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

function buildDesignCuesReadout(tags: any[], itemCount: number) {
  if (!itemCount) return "Select a segment to surface recurring design cues.";
  if (!tags.length) return "No recurring design cue is available for this segment yet.";

  const leader = tags[0];
  const share = Math.round((leader.value / Math.max(1, itemCount)) * 100);

  return `${leader.name} is the strongest recurring cue, appearing in ${share}% of this segment.`;
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
  const genreEligibleCount = getGenreAnalysisItems(items, platform).length;

  return {
    totalRecords: items.length,
    queriedToday,
    source,
    confidence,
    genreEligibleCount,
    genreExcludedCount: Math.max(0, items.length - genreEligibleCount),
    lastRunLabel: formatUtcTimestamp(
      auditSnapshot?.created_at ?? getLatestSourceTimestamp(platform, items)
    ),
  };
}

function getGenreAnalysisItems(items: any[], platform: Platform) {
  if (platform !== "roblox") return items;

  return items.filter((item) => getClassificationConfidence(item, platform) !== "pending");
}

function getClassificationConfidence(item: any, platform: Platform) {
  if (platform !== "roblox") return "medium";

  const sourceGenre = getRobloxSourceGenre(item);
  const hasEstimatedGenre =
    Boolean(item.inferred_genre) && item.inferred_genre !== "Other";
  const hasEstimatedSubgenre =
    Boolean(item.inferred_subgenre) && item.inferred_subgenre !== "General";

  if (sourceGenre) return "source";
  if (hasEstimatedGenre && hasEstimatedSubgenre) return "estimated";
  return "pending";
}

function getRobloxSourceGenre(item: any) {
  return cleanClassificationLabel(item.genre);
}

function getDisplayGenre(item: any, platform: Platform) {
  if (getClassificationConfidence(item, platform) === "pending") {
    return "Classification pending";
  }

  return item.inferred_genre ?? "Other";
}

function getDisplaySubgenre(item: any, platform: Platform) {
  if (getClassificationConfidence(item, platform) === "pending") {
    return "Classification pending";
  }

  return item.inferred_subgenre ?? "General";
}

function cleanClassificationLabel(value: unknown) {
  return typeof value === "string" && value.trim() && value !== "Other"
    ? value.trim()
    : null;
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
          const itemKey = `${item.href ?? item.label}-${index}`;
          const content = (
            <>
	              <span className="w-5 flex-none text-xs font-bold text-slate-400">
	                {index + 1}
	              </span>
	              <span className="min-w-0 flex-1">
                  <span
                    className={`flex min-w-0 flex-wrap items-center gap-1.5 text-sm font-semibold leading-snug ${
                      item.wrap ? "break-words" : "truncate"
                    }`}
                  >
	                  <span className={item.wrap ? "min-w-0" : "truncate"}>
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                        {item.badge}
                      </span>
                    )}
                  </span>
                  {item.subline && (
                    <span className="mt-1 block truncate text-xs font-medium leading-snug text-slate-400">
                      {item.subline}
                    </span>
                  )}
	              </span>
              {item.value ? (
                <span
                  className="flex-none text-right text-sm font-black"
                  style={{ color: accent }}
                >
                  {item.value}
                </span>
              ) : null}
            </>
          );

          return item.href ? (
            <a
              key={itemKey}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-2 rounded-xl px-1 py-1 transition hover:bg-slate-100/70"
            >
              {content}
            </a>
          ) : (
            <div key={itemKey} className="flex items-start gap-2 px-1 py-1">
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

function GenreShareCard({
  title,
  subtitle,
  items,
  action,
  footerAction,
  panel,
  accent,
}: any) {
  return (
    <div className={`rounded-3xl border p-5 ${panel}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-4 space-y-4">
        {items.map((item: any, index: number) => (
          <div key={`${item.label}-${index}`}>
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
      {footerAction ? (
        <div className="mt-4 flex justify-end border-t border-slate-200 pt-3">
          {footerAction}
        </div>
      ) : null}
    </div>
  );
}

function FortniteLabelRankingsCard({ title, subtitle, items, panel, accent }: any) {
  return (
    <div className={`rounded-3xl border p-5 ${panel}`}>
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="text-xs text-slate-400">{subtitle}</p>

      <div className="mt-4 space-y-2">
        {items.map((item: any, index: number) => {
          const isUp = item.movement > 0;
          const isDown = item.movement < 0;
          const movementLabel =
            item.previousRank === null
              ? "NEW"
              : `${isUp ? "+" : ""}${item.movement}`;

          return (
            <div
              key={`${item.label}-${index}`}
              className="grid grid-cols-[1.5rem_1fr_auto_auto] items-center gap-2 rounded-xl px-1 py-1"
            >
              <span className="text-xs font-bold text-slate-400">
                {index + 1}
              </span>
              <span className="min-w-0 truncate text-sm font-black">
                {item.label}
              </span>
              <span className="text-sm font-black" style={{ color: accent }}>
                {item.count}
              </span>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-black ${
                  item.previousRank === null
                    ? "bg-slate-100 text-slate-500"
                    : isUp
                      ? "bg-green-50 text-green-600"
                      : isDown
                        ? "bg-red-50 text-red-500"
                        : "bg-slate-100 text-slate-500"
                }`}
              >
                {movementLabel}
                {isUp ? " ▲" : isDown ? " ▼" : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FortniteIpSignalsCard({ title, subtitle, islands, panel, accent }: any) {
  const signals = buildFortniteIpSignals(islands);
  const topSignals = signals.slice(0, 5);
  const ipLedIslands = islands.filter((island: any) => getFortniteIpSignal(island));

  return (
    <div className={`rounded-3xl border p-5 ${panel}`}>
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="text-xs text-slate-400">{subtitle}</p>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
          IP-led islands
        </p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <span className="text-3xl font-black" style={{ color: accent }}>
            {ipLedIslands.length}
          </span>
          <span className="text-right text-xs font-bold text-slate-400">
            of {islands.length} top islands
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {topSignals.length ? (
          topSignals.map((signal: any, index: number) => (
            <div key={signal.label} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                    {index + 1}. {signal.type}
                  </p>
                  <p className="truncate text-sm font-black">{signal.label}</p>
                </div>
                <span
                  className="rounded-full px-2 py-1 text-xs font-black"
                  style={{ backgroundColor: `${accent}1f`, color: accent }}
                >
                  {signal.count}
                </span>
              </div>
              <p className="mt-2 line-clamp-1 text-xs font-semibold text-slate-400">
                {signal.examples.join(", ")}
              </p>
            </div>
          ))
        ) : (
          <Unavailable text="No likely IP or collaboration labels detected in the latest substantial island collection yet." />
        )}
      </div>
    </div>
  );
}

function TrendingCard({ title, items, panel }: any) {
  return (
    <div className={`rounded-3xl border p-5 ${panel}`}>
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <div className="mt-4 space-y-3">
        {items.map((item: any, index: number) => {
          const isDown = item.direction === "down";
          const itemKey = `${item.href ?? item.label ?? item.title}-${index}`;
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
              key={itemKey}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-3 rounded-xl p-2 transition hover:bg-slate-100/70"
            >
              {content}
            </a>
          ) : (
            <div key={itemKey} className="flex items-start gap-3 rounded-xl p-2">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  panel,
  action,
  footerAction,
  contentClassName = "h-64",
  children,
}: any) {
  return (
    <div className={`rounded-3xl border p-5 ${panel}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">{title}</h3>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        {action}
      </div>
      <div className={contentClassName}>{children}</div>
      {footerAction && <div className="mt-3 flex justify-end">{footerAction}</div>}
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

function GenreTrendControls({ limit, onLimitChange, accent }: any) {
  return (
    <ToggleGroup>
      {[3, 10].map((value) => (
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
  );
}

function TimeWindowControls({ timeWindow, onTimeWindowChange, accent }: any) {
  return (
    <ToggleGroup>
      {[
        ["7d", "7D"],
        ["30d", "Month"],
        ["3m", "3M"],
      ].map(([value, label]) => (
        <ToggleButton
          key={value}
          active={timeWindow === value}
          onClick={() => onTimeWindowChange(value)}
          activeColor={accent}
        >
          {label}
        </ToggleButton>
      ))}
    </ToggleGroup>
  );
}

function FortniteLabelTrendControls({ limit, onLimitChange, accent }: any) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <ToggleGroup>
        {[10, 25].map((value) => (
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

function KeywordCloudCard({
  title,
  subtitle,
  games,
  genreOptionsItems,
  panel,
  accent,
  filterByGenre = true,
  combinedCloud = false,
}: any) {
  const overallOption = "__overall__";
  const genreItems = genreOptionsItems ?? games;
  const genres = useMemo(
    () =>
      Array.from(
        new Set(genreItems.map((game: any) => game.inferred_genre ?? "Other"))
      ).sort() as string[],
    [genreItems]
  );
  const [selectedGenre, setSelectedGenre] = useState(overallOption);
  const activeGenre = selectedGenre || overallOption;
  const selectedGames = useMemo(
    () =>
      filterByGenre && activeGenre !== overallOption
        ? games.filter(
            (game: any) => (game.inferred_genre ?? "Other") === activeGenre
          )
        : games,
    [games, activeGenre, filterByGenre]
  );
  const combinedItems = buildKeywordCloud(selectedGames, "all");
  const titleCloud = buildKeywordCloud(selectedGames, "title");
  const descriptionCloud = buildKeywordCloud(selectedGames, "description");

  return (
    <div className={`rounded-3xl border p-5 ${panel}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        {filterByGenre && (
          <select
            className="max-w-[10rem] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
            value={activeGenre}
            onChange={(event) => setSelectedGenre(event.target.value)}
          >
            <option value={overallOption}>Overall</option>
            {genres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        )}
      </div>

      {combinedCloud ? (
        <KeywordCloudPanel
          items={combinedItems}
          emptyText="No title or description keywords available."
          accent={accent}
        />
      ) : (
        <>
          <KeywordCloudPanel
            title="Title cloud"
            items={titleCloud}
            emptyText="No title keywords available for this selection."
            accent={accent}
          />
          <KeywordCloudPanel
            title="Description cloud"
            items={descriptionCloud}
            emptyText="No description keywords available for this selection."
            accent={accent}
          />
        </>
      )}
    </div>
  );
}

function KeywordCloudPanel({ title, items, emptyText, accent }: any) {
  return (
    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
      {title ? (
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
          {title}
        </p>
      ) : null}
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

function ColorBreakdownCard({
  title,
  subtitle,
  games,
  genreOptionsItems,
  panel,
  accent,
  filterByGenre = true,
}: any) {
  const overallOption = "__overall__";
  const genreItems = genreOptionsItems ?? games;
  const [colors, setColors] = useState<any[]>([]);
  const [colorPage, setColorPage] = useState(0);
  const genres = useMemo(
    () =>
      Array.from(
        new Set(genreItems.map((game: any) => game.inferred_genre ?? "Other"))
      ).sort() as string[],
    [genreItems]
  );
  const [selectedGenre, setSelectedGenre] = useState(overallOption);
  const activeGenre = selectedGenre || overallOption;
  const selectedGames = useMemo(
    () =>
      filterByGenre && activeGenre !== overallOption
        ? games.filter(
            (game: any) => (game.inferred_genre ?? "Other") === activeGenre
          )
        : games,
    [games, activeGenre, filterByGenre]
  );
  const colorPageSize = 5;
  const colorPageCount = Math.max(1, Math.ceil(selectedGames.length / colorPageSize));
  const safeColorPage = Math.min(colorPage, colorPageCount - 1);
  const colorPageStart = safeColorPage * colorPageSize;
  const colorPageEnd = Math.min(colorPageStart + colorPageSize, selectedGames.length);
  const colorPageGames = useMemo(
    () => selectedGames.slice(colorPageStart, colorPageEnd),
    [selectedGames, colorPageStart, colorPageEnd]
  );

  useEffect(() => {
    setColorPage(0);
  }, [activeGenre, filterByGenre, games]);

  useEffect(() => {
    let cancelled = false;
    setColors([]);

    async function loadColors() {
      const extracted = await Promise.all(
        colorPageGames.map(async (game: any, index: number) => {
          const color = await extractTileColors(game.thumbnail_url);
          return {
            title:
              String(game.title ?? "").trim() ||
              game.island_code ||
              `Island ${colorPageStart + index + 1}`,
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
  }, [colorPageGames, colorPageStart]);

  const visibleColors = colors.length
    ? colors
    : colorPageGames.map((game: any, index: number) => ({
        title:
          String(game.title ?? "").trim() ||
          game.island_code ||
          `Island ${colorPageStart + index + 1}`,
        color: fallbackTileColorPairs[index % fallbackTileColorPairs.length],
      }));

  return (
    <div className={`rounded-3xl border p-5 ${panel}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        {filterByGenre && (
          <select
            className="max-w-[10rem] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
            value={activeGenre}
            onChange={(event) => setSelectedGenre(event.target.value)}
          >
            <option value={overallOption}>Overall</option>
            {genres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedGames.length > colorPageSize ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
            {colorPageStart + 1}-{colorPageEnd} of {selectedGames.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous color set"
              disabled={safeColorPage === 0}
              onClick={() => setColorPage((page) => Math.max(0, page - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
            >
              {"<"}
            </button>
            <button
              type="button"
              aria-label="Next color set"
              disabled={safeColorPage >= colorPageCount - 1}
              onClick={() =>
                setColorPage((page) => Math.min(colorPageCount - 1, page + 1))
              }
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
            >
              {">"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {visibleColors.map((item: any, index: number) => (
          <div
            key={`${item.title}-${index}`}
            className="grid grid-cols-[2.75rem_1fr_auto] items-center gap-3"
          >
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
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                Island
              </p>
              <p
                className="line-clamp-3 break-words text-sm font-semibold leading-snug"
                title={item.title}
              >
                {item.title}
              </p>
            </div>
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
  const supportsMonetizationFilter = platform === "roblox";
  const filteredItems = supportsMonetizationFilter
    ? items.filter((item: any) =>
        monetizationFilter === "monetized"
          ? isMonetizedItem(item, platform)
          : !isMonetizedItem(item, platform)
      )
    : items;
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
          {supportsMonetizationFilter
            ? `Showing ${formatNumber(
                filteredItems.length
              )} ${monetizationFilter} records in the opportunity maps.`
            : `Showing ${formatNumber(
                filteredItems.length
              )} imported Fortnite islands in the opportunity maps.`}
        </p>
        {supportsMonetizationFilter && (
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
        )}
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
        platform={map.platform}
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

const correlationMetricOptions = [
  {
    key: "latestPlayers",
    label: "Current players",
    value: (game: any) => game.latestPlayers,
    format: formatNumber,
  },
  {
    key: "periodHigh",
    label: "Stored peak players",
    value: (game: any) => game.periodHigh,
    format: formatNumber,
  },
  {
    key: "playerGainPercent",
    label: "Player gain %",
    value: (game: any) => game.playerGainPercent,
    format: (value: number) => `${Math.round(value)}%`,
  },
  {
    key: "averagePlayerGain7Days",
    label: "Avg daily gain, 7D",
    value: (game: any) => game.averagePlayerGain7Days,
    format: (value: number) => `${formatNumber(Math.round(value))}/day`,
  },
  {
    key: "upVotes",
    label: "Likes",
    value: (game: any) => game.upVotes,
    format: formatNumber,
  },
  {
    key: "likeRatio",
    label: "Like ratio",
    value: (game: any) =>
      typeof game.likeRatio === "number" ? game.likeRatio * 100 : null,
    format: (value: number) => `${Math.round(value)}%`,
  },
  {
    key: "visits",
    label: "Visits",
    value: (game: any) => game.visits,
    format: formatNumber,
  },
  {
    key: "bestRank",
    label: "Best measured rank",
    value: (game: any) => game.bestRank,
    format: (value: number) => `#${Math.round(value)}`,
  },
];

const fortniteCorrelationMetricOptions = [
  {
    key: "sourcePopularityProxy",
    label: "Source popularity proxy",
    value: (island: any) => island.sourcePopularityProxy,
    format: formatNumber,
  },
  {
    key: "latestRank",
    label: "Latest source rank",
    value: (island: any) => island.latestRank,
    format: (value: number) => `#${Math.round(value)}`,
  },
  {
    key: "bestSourceRank",
    label: "Best captured source rank",
    value: (island: any) => island.bestSourceRank,
    format: (value: number) => `#${Math.round(value)}`,
  },
  {
    key: "topThreeLabelReach",
    label: "Top 3 label reach",
    value: (island: any) => island.topThreeLabelReach,
    format: formatNumber,
  },
  {
    key: "primaryLabelReach",
    label: "Primary label reach",
    value: (island: any) => island.primaryLabelReach,
    format: formatNumber,
  },
  {
    key: "coreLoopReach",
    label: "Core loop reach",
    value: (island: any) => island.coreLoopReach,
    format: formatNumber,
  },
  {
    key: "genreFormatReach",
    label: "Genre / format reach",
    value: (island: any) => island.genreFormatReach,
    format: formatNumber,
  },
  {
    key: "gameFormatComplexity",
    label: "Estimated format complexity",
    value: (island: any) => island.gameFormatComplexity,
    format: (value: number) => `${Math.round(value * 100)}%`,
  },
  {
    key: "ipSignalScore",
    label: "IP / collab signal",
    value: (island: any) => island.ipSignalScore,
    format: (value: number) => (value ? "Detected" : "None"),
  },
  {
    key: "top25Days",
    label: "Captured Top 25 days",
    value: (island: any) => island.top25Days,
    format: formatNumber,
  },
];

function CorrelationAnalysisCard({
  title,
  subtitle,
  games,
  panel,
  accent,
  metrics = correlationMetricOptions,
  defaultXMetricKey = "latestPlayers",
  defaultYMetricKey = "upVotes",
  caveat = "Correlation is directional market intelligence, not causation. Outliers, missing visits, and heuristic classifications can distort the result.",
}: any) {
  const [xMetricKey, setXMetricKey] = useState(defaultXMetricKey);
  const [yMetricKey, setYMetricKey] = useState(defaultYMetricKey);
  const xMetric =
    metrics.find((metric: any) => metric.key === xMetricKey) ?? metrics[0];
  const yMetric =
    metrics.find((metric: any) => metric.key === yMetricKey) ?? metrics[1];
  const analysis = useMemo(
    () => buildCorrelationAnalysis(games, xMetric, yMetric),
    [games, xMetric, yMetric]
  );
  const lineColor =
    analysis.correlation == null
      ? "#94a3b8"
      : analysis.correlation >= 0
        ? "#16a34a"
        : "#ef4444";

  return (
    <div className={`rounded-3xl border p-6 ${panel}`}>
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)]">
        <div className="rounded-2xl bg-slate-50 p-4">
          <CorrelationScatterPlot
            analysis={analysis}
            xMetric={xMetric}
            yMetric={yMetric}
            lineColor={lineColor}
            accent={accent}
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
              Axes
            </p>
            <div className="mt-3 grid gap-3">
              <MetricSelect
                label="X axis"
                value={xMetricKey}
                onChange={setXMetricKey}
                metrics={metrics}
              />
              <MetricSelect
                label="Y axis"
                value={yMetricKey}
                onChange={setYMetricKey}
                metrics={metrics}
              />
            </div>
          </div>

          <CorrelationReadout
            analysis={analysis}
            xMetric={xMetric}
            yMetric={yMetric}
            lineColor={lineColor}
            caveat={caveat}
          />
        </div>
      </div>
    </div>
  );
}

function MetricSelect({ label, value, onChange, metrics = correlationMetricOptions }: any) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <select
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {metrics.map((metric: any) => (
          <option key={metric.key} value={metric.key}>
            {metric.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CorrelationScatterPlot({
  analysis,
  xMetric,
  yMetric,
  lineColor,
  accent,
}: any) {
  if (analysis.points.length < 3) {
    return (
      <Unavailable text="Not enough complete rows for this metric pair yet." />
    );
  }

  const width = 720;
  const height = 360;
  const margin = { top: 18, right: 28, bottom: 56, left: 72 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const xScale = (value: number) =>
    margin.left +
    ((value - analysis.xMin) / Math.max(analysis.xMax - analysis.xMin, 1)) *
      plotWidth;
  const yScale = (value: number) =>
    margin.top +
    plotHeight -
    ((value - analysis.yMin) / Math.max(analysis.yMax - analysis.yMin, 1)) *
      plotHeight;
  const lineStart = {
    x: xScale(analysis.xMin),
    y: yScale(analysis.slope * analysis.xMin + analysis.intercept),
  };
  const lineEnd = {
    x: xScale(analysis.xMax),
    y: yScale(analysis.slope * analysis.xMax + analysis.intercept),
  };

  return (
    <div className="h-[24rem]">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full overflow-visible"
        role="img"
        aria-label={`${xMetric.label} versus ${yMetric.label} scatter plot`}
      >
        <line
          x1={margin.left}
          y1={margin.top + plotHeight}
          x2={margin.left + plotWidth}
          y2={margin.top + plotHeight}
          stroke="#cbd5e1"
          strokeWidth="2"
        />
        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left}
          y2={margin.top + plotHeight}
          stroke="#cbd5e1"
          strokeWidth="2"
        />

        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const x = margin.left + tick * plotWidth;
          const y = margin.top + tick * plotHeight;

          return (
            <g key={tick}>
              <line
                x1={x}
                y1={margin.top}
                x2={x}
                y2={margin.top + plotHeight}
                stroke="#e2e8f0"
                strokeDasharray="4 6"
              />
              <line
                x1={margin.left}
                y1={y}
                x2={margin.left + plotWidth}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="4 6"
              />
            </g>
          );
        })}

        <line
          x1={lineStart.x}
          y1={lineStart.y}
          x2={lineEnd.x}
          y2={lineEnd.y}
          stroke={lineColor}
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.86"
        />

        {analysis.points.map((point: any) => (
          <circle
            key={point.id}
            cx={xScale(point.x)}
            cy={yScale(point.y)}
            r="5"
            fill={accent}
            opacity="0.62"
          >
            <title>
              {point.title}: {xMetric.label} {xMetric.format(point.x)},{" "}
              {yMetric.label} {yMetric.format(point.y)}
            </title>
          </circle>
        ))}

        <text
          x={margin.left + plotWidth / 2}
          y={height - 16}
          textAnchor="middle"
          className="fill-slate-500 text-[13px] font-bold"
        >
          {xMetric.label}
        </text>
        <text
          x={-margin.top - plotHeight / 2}
          y={20}
          textAnchor="middle"
          transform="rotate(-90)"
          className="fill-slate-500 text-[13px] font-bold"
        >
          {yMetric.label}
        </text>
      </svg>
    </div>
  );
}

function CorrelationReadout({ analysis, xMetric, yMetric, lineColor, caveat }: any) {
  const correlationLabel =
    analysis.correlation == null
      ? "Pending"
      : `${analysis.correlation >= 0 ? "+" : ""}${analysis.correlation.toFixed(2)}`;
  const direction =
    analysis.correlation == null
      ? "not enough data"
      : analysis.correlation >= 0
        ? "positive"
        : "negative";
  const strength =
    analysis.correlation == null
      ? "unclear"
      : Math.abs(analysis.correlation) >= 0.7
        ? "strong"
        : Math.abs(analysis.correlation) >= 0.4
          ? "moderate"
          : Math.abs(analysis.correlation) >= 0.2
            ? "weak"
            : "very weak";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
        Readout
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <MetricStat
          label={`${xMetric.label} mean`}
          value={xMetric.format(analysis.xMean)}
        />
        <MetricStat
          label={`${xMetric.label} std dev`}
          value={xMetric.format(analysis.xStdDev)}
        />
        <MetricStat
          label={`${yMetric.label} mean`}
          value={yMetric.format(analysis.yMean)}
        />
        <MetricStat
          label={`${yMetric.label} std dev`}
          value={yMetric.format(analysis.yStdDev)}
        />
      </div>

      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
          Correlation
        </p>
        <p className="mt-1 text-2xl font-black" style={{ color: lineColor }}>
          {correlationLabel}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          There is a {strength} {direction} link between{" "}
          <strong>{xMetric.label}</strong> and{" "}
          <strong>{yMetric.label}</strong> in the rows with complete data.
        </p>
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-400">
        {caveat}
      </p>
    </div>
  );
}

function MetricStat({ label, value }: any) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-black text-slate-800">{value}</p>
    </div>
  );
}

function buildCorrelationAnalysis(games: any[], xMetric: any, yMetric: any) {
  const points = games
    .map((game) => ({
      id: game.id,
      title: game.title,
      x: toFiniteMetricValue(xMetric.value(game)),
      y: toFiniteMetricValue(yMetric.value(game)),
    }))
    .filter((point) => point.x != null && point.y != null) as Array<{
      id: string;
      title: string;
      x: number;
      y: number;
    }>;
  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const xMean = mean(xValues);
  const yMean = mean(yValues);
  const xStdDev = standardDeviation(xValues, xMean);
  const yStdDev = standardDeviation(yValues, yMean);
  const covariance =
    points.reduce((sum, point) => sum + (point.x - xMean) * (point.y - yMean), 0) /
    Math.max(points.length - 1, 1);
  const correlation =
    points.length >= 3 && xStdDev > 0 && yStdDev > 0
      ? covariance / (xStdDev * yStdDev)
      : null;
  const slope = xStdDev > 0 ? covariance / (xStdDev * xStdDev) : 0;
  const intercept = yMean - slope * xMean;
  const xMin = Math.min(...xValues, 0);
  const xMax = Math.max(...xValues, 1);
  const yMin = Math.min(...yValues, 0);
  const yMax = Math.max(...yValues, 1);

  return {
    points,
    correlation,
    slope,
    intercept,
    xMean,
    yMean,
    xStdDev,
    yStdDev,
    xMin,
    xMax,
    yMin,
    yMax,
  };
}

function buildFortniteCorrelationItems(islands: any[]) {
  const latestDateKey = getFortniteSubstantialSnapshotDateKeys(islands).at(-1);
  const scopedIslands = latestDateKey
    ? islands.filter((island) =>
        (island.snapshots ?? []).some((snapshot: any) =>
          String(snapshot.created_at ?? "").startsWith(latestDateKey)
        )
      )
    : islands;
  const top25RowsByIsland = new Map(
    buildFortniteFeaturedIslandRows(islands, 25).map((row: any) => [
      getFortniteIslandKey(row),
      row,
    ])
  );
  const primaryLabelCounts = scopedIslands.reduce((counts: Record<string, number>, island) => {
    const label = normalizeFortniteCorrelationGroup(getFortnitePrimaryLabel(island));
    counts[label] = (counts[label] ?? 0) + 1;
    return counts;
  }, {});
  const topThreeLabelCounts = scopedIslands.reduce((counts: Record<string, number>, island) => {
    getFortniteTopLabels(island, 3).forEach((label) => {
      counts[label] = (counts[label] ?? 0) + 1;
    });
    return counts;
  }, {});
  const coreLoopCounts = scopedIslands.reduce((counts: Record<string, number>, island) => {
    const label = normalizeFortniteCorrelationGroup(island.core_loop);
    counts[label] = (counts[label] ?? 0) + 1;
    return counts;
  }, {});
  const genreFormatCounts = scopedIslands.reduce((counts: Record<string, number>, island) => {
    const label = normalizeFortniteCorrelationGroup(island.inferred_genre);
    counts[label] = (counts[label] ?? 0) + 1;
    return counts;
  }, {});

  return scopedIslands.map((island) => {
    const latestSnapshot = getFortniteSnapshotForDate(island, latestDateKey);
    const latestRank =
      getFortniteSnapshotRank(latestSnapshot) ?? getFortniteSnapshotRank(island.snapshots?.at(-1));
    const labels = getFortniteSourceLabels(island);
    const primaryLabel = normalizeFortniteCorrelationGroup(getFortnitePrimaryLabel(island));
    const topThreeLabels = getFortniteTopLabels(island, 3);
    const top25Row = top25RowsByIsland.get(getFortniteIslandKey(island));
    const ipSignal = getFortniteIpSignal(island);
    const bestSourceRank = Math.min(
      ...((island.snapshots ?? [])
        .map((snapshot: any) => getFortniteSnapshotRank(snapshot))
        .filter((rank: any) => typeof rank === "number") as number[])
    );

    return {
      ...island,
      latestRank,
      sourcePopularityProxy:
        typeof latestRank === "number" ? Math.max(0, 101 - latestRank) : null,
      bestSourceRank: Number.isFinite(bestSourceRank) ? bestSourceRank : null,
      primaryLabel,
      primaryLabelReach: primaryLabelCounts[primaryLabel] ?? 0,
      topThreeLabelReach: topThreeLabels.reduce(
        (sum, label) => sum + (topThreeLabelCounts[label] ?? 0),
        0
      ),
      coreLoopReach:
        coreLoopCounts[normalizeFortniteCorrelationGroup(island.core_loop)] ?? 0,
      genreFormatReach:
        genreFormatCounts[normalizeFortniteCorrelationGroup(island.inferred_genre)] ?? 0,
      tagCount: labels.length,
      descriptionLength: String(island.description ?? "").length,
      titleLength: String(island.title ?? "").length,
      gameFormatComplexity: complexityScore(island.build_complexity ?? ""),
      ipSignalScore: ipSignal?.label ? 1 : 0,
      top25Days: top25Row?.featuredCount ?? 0,
    };
  });
}

function getFortniteTopLabels(island: any, limit: number) {
  const labels = getFortniteSourceLabels(island)
    .map((label: any) => normalizeFortniteCorrelationGroup(label))
    .filter((label: string) => !/^unknown|general|unlabeled$/i.test(label));

  return Array.from(new Set(labels)).slice(0, limit);
}

function normalizeFortniteCorrelationGroup(value: unknown) {
  const label = String(value ?? "").trim();
  return label && !/^unknown|general$/i.test(label) ? label : "Unlabeled";
}

function getFortniteSnapshotForDate(island: any, dateKey?: string) {
  if (!dateKey) return island.snapshots?.at(-1) ?? null;

  return (
    [...(island.snapshots ?? [])]
      .filter((snapshot: any) => String(snapshot.created_at ?? "").startsWith(dateKey))
      .sort((a: any, b: any) => {
        const aRank = getFortniteSnapshotRank(a) ?? 999999;
        const bRank = getFortniteSnapshotRank(b) ?? 999999;
        if (aRank !== bRank) return aRank - bRank;
        return String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
      })[0] ?? null
  );
}

function toFiniteMetricValue(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[], valueMean = mean(values)) {
  if (values.length < 2) return 0;

  const variance =
    values.reduce((sum, value) => sum + (value - valueMean) ** 2, 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

function OpportunityGrid({ map, selectedKey, selectedGenre, selectedSubgenre, platform }: any) {
  return (
    <div className="relative mx-auto grid max-w-xl grid-cols-4 rounded-xl border-2 border-slate-900">
      {Array.from({ length: 16 }).map((_, i) => (
        <div
          key={i}
          className="min-h-32 border border-slate-900 p-1.5"
          style={{ backgroundColor: opportunityCellColor(i, platform) }}
        >
          {map.items
            .filter((item: any) => item.cell === i)
            .slice(0, 2)
            .map((item: any, itemIndex: number) => {
              const active =
                item.label === selectedKey ||
                item.genre === selectedGenre ||
                item.subgenre === selectedSubgenre;

              return (
                <div
                  key={`${item.label}-${itemIndex}`}
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
      <h2 className="text-2xl font-bold">Research Readout</h2>
      <p className="mt-1 text-sm text-slate-500">
        Synthesis across demand, saturation, velocity, and estimated game format complexity.
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
            <strong>Research interpretation:</strong>{" "}
            consider investigating segments that appear as deeper blue in more
            than one lens; treat lighter areas as potentially crowded,
            slow-moving, uncertain, or expensive to build.
          </div>
        </div>
      ) : (
        <Unavailable text="Not enough classified records to generate a read out." />
      )}
    </div>
  );
}

function opportunityCellColor(index: number, platform: Platform = "roblox") {
  const col = index % 4;
  const row = Math.floor(index / 4);
  const score = (col + (3 - row)) / 6;

  if (platform === "fortnite") {
    if (score >= 0.72) return "#7c3aed";
    if (score >= 0.48) return "#a17cf3";
    if (score >= 0.28) return "#d6c7fb";
    return "#f3effe";
  }

  if (score >= 0.72) return "#0d69ac";
  if (score >= 0.48) return "#4d91c4";
  if (score >= 0.28) return "#9fc7e4";
  return "#e8f2fa";
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
      colorLabel: "Research signal",
      xFormula: demandFormula,
      yFormula: "Number of records in this genre/subgenre divided by the most represented segment.",
      colorFormula: "Demand score discounted by saturation; deeper blue means a stronger directional research signal, not a guaranteed outcome.",
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
      colorFormula: "Velocity score discounted by saturation; deeper blue means faster movement with less crowding.",
      x: (item: any) =>
        platform === "roblox"
          ? Math.max(0, item.velocity) / maxVelocity
          : item.count / maxCount,
      y: (item: any) => item.count / maxCount,
      score: (x: number, y: number) => x * (1 - y * 0.55),
    },
    "demand-complexity": {
      id: "demand-complexity",
      title: "Demand vs Game Format Complexity",
      subtitle: "Find strong demand in formats with a lighter estimated scope.",
      xLabel: "Audience Demand",
      yLabel: "Game Format Complexity",
      xLow: "Lower demand",
      xHigh: "Higher demand",
      colorLabel: "Feasibility",
      xFormula: demandFormula,
      yFormula: "Estimated average game format complexity: simpler genre formats are lower on the map, broader or more system-heavy formats are higher on the map.",
      colorFormula: "Demand score discounted by estimated game format complexity; deeper blue means strong demand with a lighter inferred format scope.",
      x: (item: any) => item.players / maxPlayers || item.count / maxCount,
      y: (item: any) => item.complexity,
      score: (x: number, y: number) => x * (1 - y * 0.5),
    },
  };

  const activeConfig = config[lens];

  return {
    ...activeConfig,
    platform,
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

function RecommendationBlock({ title, text, bullets, tags, panel, accent, readout }: any) {
  const total = tags?.reduce((sum: number, tag: any) => sum + tag.value, 0) ?? 0;
  const pieColors = [accent, "#d6a06d", "#5b5d78", "#94a3b8", "#cbd5e1"];

  return (
    <div className={`rounded-3xl border p-5 ${panel}`}>
      <h3 className="text-xl font-bold">{title}</h3>
      {readout ? (
        <p className="mt-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-500">
          {readout}
        </p>
      ) : null}

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
  if (platform === "fortnite") {
    return (
      <FortniteMarketCard
        item={item}
        rank={rank}
        panel={panel}
      />
    );
  }

  const positive = (item.playerGainPercent ?? 0) >= 0;
  const averageGain = item.averagePlayerGain7Days;
  const averagePositive = (averageGain ?? 0) >= 0;
  const likesLabel =
    typeof item.upVotes === "number"
      ? formatNumber(item.upVotes)
      : typeof item.likeRatio === "number"
        ? `${Math.round(item.likeRatio * 100)}% ratio`
        : "N/A";
  const classificationConfidence = getClassificationConfidence(item, platform);
  const classificationLabel =
    classificationConfidence === "source"
      ? "Roblox source"
      : classificationConfidence === "estimated"
        ? "Heuristic fallback"
        : "Classification pending";

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
              : getDisplayGenre(item, platform)}
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
            {getDisplayGenre(item, platform)}
          </p>
        </div>

        <div>
          <p className="text-slate-400">Subgenre</p>
          <p className="line-clamp-1 font-black">
            {getDisplaySubgenre(item, platform)}
          </p>
        </div>

        {platform === "roblox" && (
          <>
            <div className="col-span-2">
              <p className="text-slate-400">Classification source</p>
              <p
                className={`font-black ${
                  classificationConfidence === "estimated"
                    ? "text-amber-600"
                    : classificationConfidence === "source"
                      ? "text-green-600"
                      : "text-slate-500"
                }`}
              >
                {classificationLabel}
              </p>
            </div>

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

      </div>
    </a>
  );
}

function FortniteMarketCard({ item, rank, panel }: any) {
  const href = item.url ?? `https://fortnite.gg/island?code=${item.island_code}`;
  const genre = item.inferred_genre ?? "Unclassified";
  const subgenre = item.inferred_subgenre ?? "General";
  const intent = item.player_intent ?? item.audience_signal ?? "Not classified yet";
  const loop = item.core_loop ?? item.design_pattern ?? "Not classified yet";
  const ipSignal = getFortniteIpSignal(item);
  const labels = getFortniteGameplayLabels(item)
    .filter((label) => label !== genre && label !== subgenre && label !== intent && label !== loop)
    .slice(0, 3);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`rounded-3xl border p-4 shadow-sm transition hover:-translate-y-0.5 ${panel}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-black">{item.title}</h3>
          {ipSignal?.label && (
            <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">
              {ipSignal.label}
            </span>
          )}
        </div>
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
          <p className="text-slate-400">Genre</p>
          <p className="line-clamp-1 font-black">
            {genre}
          </p>
        </div>

        <div>
          <p className="text-slate-400">Subgenre</p>
          <p className="line-clamp-1 font-black">
            {subgenre}
          </p>
        </div>

        <div className="col-span-2">
          <p className="text-slate-400">Player intent</p>
          <p className="line-clamp-2 font-black">
            {intent}
          </p>
        </div>

        <div className="col-span-2">
          <p className="text-slate-400">Core loop</p>
          <p className="line-clamp-2 font-black">
            {loop}
          </p>
        </div>

        {labels.length ? (
          <div className="col-span-2">
            <p className="text-slate-400">Labels</p>
            <p className="line-clamp-2 font-black">
              {labels.join(" / ")}
            </p>
          </div>
        ) : null}
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
            Research Layer
          </p>
          <h2 className="text-2xl font-bold">Forecasting Signal Inputs</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Eight measurable inputs for research questions around attention,
            momentum, persistence, and genre rotation. These inputs are not
            predictions, recommendations, or guarantees.
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
    const rankMovement = getFortniteRankMovement(target);
    const genreShare = getFortniteCategoryShare(
      target,
      items,
      "inferred_genre"
    );
    const subgenreShare = getFortniteCategoryShare(
      target,
      items,
      "inferred_subgenre"
    );
    const labelSignal = getFortniteLabelClusterSignal(target, items);
    const snapshotDates = getFortniteSnapshotDates(target);

    return [
      {
        label: "Current source rank",
        value:
          typeof target.latestRank === "number"
            ? `#${target.latestRank}`
            : "Unranked",
        detail: "Latest imported rank from the Fortnite island source order.",
      },
      {
        label: "Rank movement",
        value:
          rankMovement.change === null
            ? "Not enough history"
            : `${rankMovement.change > 0 ? "+" : ""}${rankMovement.change} spots`,
        detail: rankMovement.detail,
      },
      {
        label: "Genre field share",
        value: `${genreShare.percent}%`,
        detail: `${genreShare.count} of ${genreShare.total} imported islands are classified as ${
          target.inferred_genre ?? "Other"
        }.`,
      },
      {
        label: "Subgenre field share",
        value: `${subgenreShare.percent}%`,
        detail: `${subgenreShare.count} of ${subgenreShare.total} imported islands are classified as ${
          target.inferred_subgenre ?? "General"
        }.`,
      },
      {
        label: "Gameplay label cluster",
        value: `${labelSignal.percent}%`,
        detail: labelSignal.detail,
      },
      {
        label: "Competition tier",
        value: target.competition_level ?? "Unclassified",
        detail: "Derived from the imported genre, subgenre, intent, and label mix.",
      },
      {
        label: "First tracked",
        value: snapshotDates.first
          ? formatShortDate(snapshotDates.first)
          : "Not tracked",
        detail: "First stored appearance in the current Fortnite snapshot history.",
      },
      {
        label: "Settlement snapshots",
        value: `${target.snapshots?.length ?? 0} snapshots`,
        detail: snapshotDates.latest
          ? `Latest settlement reference: ${new Date(
              snapshotDates.latest
            ).toISOString()} UTC.`
          : "No dated snapshot available for this island yet.",
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
      label: "Momentum Signal Score",
      value: `${breakoutScore}/100`,
      detail: "Composite of player scale, velocity, rank gain, and peak retention for research context only.",
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
  "Momentum Signal Score",
  "Settlement snapshots",
];

function getFortniteRankMovement(target: any) {
  const rankedSnapshots = (target.snapshots ?? [])
    .filter((snapshot: any) => typeof snapshot.rank === "number")
    .sort(
      (a: any, b: any) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

  if (rankedSnapshots.length < 2) {
    return {
      change: null,
      detail: "Needs at least two ranked snapshots to compare position movement.",
    };
  }

  const first = rankedSnapshots[0].rank;
  const latest = rankedSnapshots[rankedSnapshots.length - 1].rank;
  const change = first - latest;

  return {
    change,
    detail:
      change === 0
        ? `Rank stayed at #${latest} across stored ranked snapshots.`
        : `Moved from #${first} to #${latest}; positive means the island climbed.`,
  };
}

function getFortniteCategoryShare(target: any, items: any[], field: string) {
  const value = target[field] ?? (field === "inferred_subgenre" ? "General" : "Other");
  const total = Math.max(1, items.length);
  const count = items.filter(
    (item) => (item[field] ?? (field === "inferred_subgenre" ? "General" : "Other")) === value
  ).length;

  return {
    count,
    total,
    percent: Math.round((count / total) * 100),
  };
}

function getFortniteLabelClusterSignal(target: any, items: any[]) {
  const labels = getFortniteGameplayLabels(target);

  if (!labels.length) {
    return {
      percent: 0,
      detail: "No gameplay labels are available for this island yet.",
    };
  }

  const total = Math.max(1, items.length);
  const matching = items.filter((item) => {
    const itemLabels = getFortniteGameplayLabels(item);
    return labels.some((label) => itemLabels.includes(label));
  }).length;

  return {
    percent: Math.round((matching / total) * 100),
    detail: `${matching} of ${total} imported islands share at least one gameplay label: ${labels
      .slice(0, 3)
      .join(", ")}.`,
  };
}

function getFortniteSnapshotDates(target: any) {
  const dates = (target.snapshots ?? [])
    .map((snapshot: any) => snapshot.created_at)
    .filter(Boolean)
    .sort();

  return {
    first: dates[0],
    latest: dates[dates.length - 1],
  };
}

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

function DatePill({ date, accent }: any) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
      <span
        className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-black text-white"
        style={{ backgroundColor: accent }}
        aria-hidden="true"
      >
        ◷
      </span>
      <span>{date}</span>
    </div>
  );
}

function TermsModal({ onClose }: any) {
  const sections = [
    {
      title: "Informational market intelligence only",
      body:
        "Snout - UGC Intel Dashboard provides directional market intelligence, data summaries, automated classifications, and research tools. It does not provide legal, financial, investment, business, or professional advice.",
    },
    {
      title: "No guaranteed outcomes",
      body:
        "The dashboard does not guarantee revenue, profit, player growth, audience retention, discoverability, platform placement, publishing success, or any specific creative or business result. Users are solely responsible for their own creative, production, publishing, investment, and business decisions.",
    },
    {
      title: "Interpreted and incomplete data",
      body:
        "Displayed information may be incomplete, delayed, inferred, automatically classified, experimental, or inaccurate. Scores, maps, labels, rankings, and forecasts are research signals only and should be independently reviewed before use.",
    },
    {
      title: "All access tiers",
      body:
        "These terms apply to all users and access types, including newsletter subscribers, trial users, paid users, pro users, and admin/internal users. Newsletter content is also informational and does not provide business advice or guaranteed outcomes.",
    },
    {
      title: "Beta product",
      body:
        "Snout is currently in beta. Features, data sources, calculations, labels, and tier access may change as the product develops.",
    },
    {
      title: "No platform affiliation",
      body:
        "Unless expressly stated otherwise, Snout is not affiliated with, endorsed by, or sponsored by Roblox, Epic Games, Fortnite, Microsoft, Mojang, or any related platform owner.",
    },
    {
      title: "Use of the service",
      body:
        "Users may not misuse, resell, scrape, redistribute, or present Snout outputs as guaranteed business advice. Continued use of the dashboard means you understand these limitations.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[86vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-emerald-700">
              Beta terms
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              Terms of Service
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              This summary is designed to make the product boundaries clear. A
              lawyer should review the final Terms before paid access launches.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-500 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {sections.map((section) => (
            <div key={section.title} className="rounded-2xl bg-slate-50 p-4">
              <h3 className="text-sm font-black text-slate-800">
                {section.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {section.body}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-5 text-xs leading-5 text-slate-400">
          Last updated: May 8, 2026. This beta summary does not replace a
          lawyer-reviewed agreement, privacy policy, or subscription terms.
        </p>
      </div>
    </div>
  );
}

function GlossaryModal({ onClose }: any) {
  const terms = [
    {
      title: "Current players",
      body:
        "The latest stored concurrent player count for a Roblox experience when that metric is available.",
    },
    {
      title: "Source rank",
      body:
        "The position captured from the source list or the imported source order when an explicit rank is unavailable.",
    },
    {
      title: "Top 10 / Top 25",
      body:
        "A filtered view of the highest-ranked or first-surfaced entries in the imported source data for that platform.",
    },
    {
      title: "Classification confidence",
      body:
        "An internal transparency estimate based on how many rows have usable genre, subgenre, label, or taxonomy signals.",
    },
    {
      title: "Heuristic fallback",
      body:
        "A label shown when source taxonomy is unavailable and the dashboard estimates classification from title, description, chart context, or stored metadata.",
    },
    {
      title: "Primary label",
      body:
        "For Fortnite islands, the first surfaced label captured from the island metadata. This can reveal format, theme, or collaboration signals.",
    },
    {
      title: "IP / Collaboration signal",
      body:
        "A detected reference to a recognizable franchise, brand, or collaboration theme in labels, titles, or descriptions.",
    },
    {
      title: "Directional research map",
      body:
        "A visual research aid that compares categories across interpreted market signals. It is not a prediction or recommendation guarantee.",
    },
    {
      title: "Demand",
      body:
        "An interpreted measure of player activity or audience concentration in a category based on available snapshot data.",
    },
    {
      title: "Saturation",
      body:
        "An interpreted measure of how many imported games or islands occupy a similar category or format.",
    },
    {
      title: "Estimated game format complexity",
      body:
        "A directional estimate of how complex a category or format appears from its genre, subgenre, labels, and observed design pattern. It is not an engineering cost estimate.",
    },
    {
      title: "Prediction market signals",
      body:
        "Research-oriented signals that may help observe momentum, volatility, category concentration, and outlier behavior. They are informational only.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[86vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-emerald-700">
              Reference
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              Glossary
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Short definitions for dashboard terms used across Roblox and
              Fortnite views.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-500 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {terms.map((term) => (
            <div key={term.title} className="rounded-2xl bg-slate-50 p-4">
              <h3 className="text-sm font-black text-slate-800">
                {term.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {term.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
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

function TrendChartFrame({ note, children }: any) {
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">{children}</div>
      {note && (
        <p className="mt-2 text-[11px] font-semibold leading-4 text-amber-600">
          {note}
        </p>
      )}
    </div>
  );
}

function TopGamesTrend({ games, percentile = 100, timeWindow = "7d" }: any) {
  const visibleGames = applyPercentileBand(games, percentile);
  const trendWindow = applyTrendTimeWindow(mergeGameTrends(visibleGames), timeWindow);
  const data = trendWindow.data;
  const domain = getLineChartDomain(data, visibleGames.map((game: any) => game.title));
  const colors = ["#0d69ac", "#7c3aed", "#d6a06d", "#5b5d78", "#16a34a"];

  if (!data.length) return <Unavailable text="No game snapshots available." />;

  return (
    <TrendChartFrame note={trendWindow.note}>
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
    </TrendChartFrame>
	  );
}

function FortniteIslandsTrend({ islands, percentile = 100, timeWindow = "7d" }: any) {
  const visibleIslands = applyPercentileBand(islands, percentile);
  const trendWindow = applyTrendTimeWindow(
    mergeFortniteIslandTrends(visibleIslands),
    timeWindow
  );
  const data = trendWindow.data;
  const domain = getLineChartDomain(
    data,
    visibleIslands.map((island: any) => island.title)
  );
  const colors = ["#7c3aed", "#0d69ac", "#d6a06d", "#16a34a", "#ef4444"];

  if (!data.length) {
    return (
      <Unavailable text="No Fortnite activity snapshots available yet. Run the Fortnite refresh after deploying the updated importer." />
    );
  }

  return (
    <TrendChartFrame note={trendWindow.note}>
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
    </TrendChartFrame>
  );
}

function FortniteGenreTrend({ islands, percentile = 100, timeWindow = "7d" }: any) {
  const visibleIslands = applyPercentileBand(islands, percentile);
  const merged = mergeFortniteGenreTrends(visibleIslands);
  const trendWindow = applyTrendTimeWindow(merged.data, timeWindow);
  const data = trendWindow.data;
  const genres = merged.genres;
  const domain = getLineChartDomain(data, genres);
  const colors = ["#7c3aed", "#0d69ac", "#d6a06d", "#16a34a", "#ef4444"];

  if (!data.length) {
    return (
      <Unavailable text="No Fortnite genre activity snapshots available yet. Run the Fortnite refresh after deploying the updated importer." />
    );
  }

  return (
    <TrendChartFrame note={trendWindow.note}>
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
    </TrendChartFrame>
  );
}

function FortniteFeaturedIslandsBar({ islands, limit, accent }: any) {
  const [page, setPage] = useState(0);
  const rows = useMemo(
    () => buildFortniteFeaturedIslandRows(islands, limit).slice(0, limit),
    [islands, limit]
  );
  const hasOnlySingleDayRows = rows.every(
    (row: any) => (row.topScopeDays ?? 1) <= 1
  );
  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visibleRows = rows.slice(safePage * pageSize, safePage * pageSize + pageSize);

  useEffect(() => {
    setPage(0);
  }, [limit]);

  if (!rows.length) {
    return <Unavailable text="No Fortnite visibility snapshots available yet." />;
  }

  return (
    <div className="flex min-h-[30rem] flex-col">
      <div className="space-y-4 pb-5">
        {visibleRows.map((row: any) => {
          const maxScore = Math.max(
            ...rows.map((item: any) => item.topScopeDays ?? 1),
            1
          );
          const score = row.topScopeDays ?? 1;

          return (
            <div key={row.id ?? row.title}>
              <div className="mb-1 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black leading-snug text-slate-800">
                    {row.title}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-400">
                    Longest Top {limit} streak: {row.streakFirstSeenLabel} -{" "}
                    {row.streakLatestSeenLabel} · {formatNumber(row.featuredCount)} captured
                    appearances
                  </p>
                </div>
                <span className="flex-none text-sm font-black" style={{ color: accent }}>
                  {score}d
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(8, (score / maxScore) * 100)}%`,
                    backgroundColor: accent,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-auto border-t border-slate-100 pt-4">
        {hasOnlySingleDayRows && (
          <p className="mb-3 rounded-2xl bg-slate-50 px-3 py-2 text-[11px] font-semibold leading-snug text-slate-400">
            Multi-day Top {limit} streaks are not available yet from rank-captured snapshots.
          </p>
        )}
        <PagedChartFooter
          page={safePage}
          pageCount={pageCount}
          start={safePage * pageSize + 1}
          end={Math.min((safePage + 1) * pageSize, rows.length)}
          total={rows.length}
          onPrevious={() => setPage((value) => Math.max(0, value - 1))}
          onNext={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
        />
      </div>
    </div>
  );
}

function FortniteGenrePresenceTrend({ islands, timeWindow = "7d" }: any) {
  const merged = mergeFortniteGenrePresenceTrends(islands);
  const trendWindow = applyTrendTimeWindow(merged.data, timeWindow);
  const data = trendWindow.data;
  const genres = merged.genres;
  const domain = getLineChartDomain(data, genres);
  const colors = ["#7c3aed", "#0d69ac", "#d6a06d", "#16a34a", "#ef4444", "#0f766e"];

  if (!data.length) {
    return <Unavailable text="No Fortnite genre presence snapshots available yet." />;
  }

  return (
    <TrendChartFrame note={trendWindow.note}>
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
              strokeWidth={index < 5 ? 2.5 : 1.4}
              strokeOpacity={index < 5 ? 0.95 : 0.42}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </TrendChartFrame>
  );
}

function FortniteIslandLifecycleRankings({ islands, limit, accent }: any) {
  const { newest, longest } = useMemo(
    () => buildFortniteIslandLifecycleRows(islands, limit),
    [islands, limit]
  );

  if (!newest.length && !longest.length) {
    return <Unavailable text="No Fortnite visibility history available yet." />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FortniteLifecycleList
        title="Newest in scope"
        rows={newest}
        metricLabel="First seen"
        metricKey="firstSeenLabel"
        accent={accent}
      />
      <FortniteLifecycleList
        title="Longest standing"
        rows={longest}
        metricLabel="Top snapshots"
        metricKey="featuredCountLabel"
        accent={accent}
      />
    </div>
  );
}

function FortniteLabelUsageTrend({ islands, limit, timeWindow = "7d" }: any) {
  const merged = mergeFortniteLabelUsageTrends(islands, limit);
  const trendWindow = applyTrendTimeWindow(merged.data, timeWindow);
  const data = trendWindow.data;
  const labels = merged.labels;
  const domain = getLineChartDomain(data, labels);
  const colors = [
    "#7c3aed",
    "#0d69ac",
    "#d6a06d",
    "#16a34a",
    "#ef4444",
    "#0f766e",
    "#f59e0b",
    "#2563eb",
  ];

  if (!data.length) {
    return <Unavailable text="No Fortnite label snapshots available yet." />;
  }

  return (
    <TrendChartFrame note={trendWindow.note}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="4 4" stroke="#d9dde5" />
          <XAxis dataKey="date" fontSize={11} />
          <YAxis fontSize={11} domain={domain} />
          <Tooltip content={<TopGamesTooltip />} />
          {labels.map((label: string, index: number) => (
            <Line
              key={label}
              type="monotone"
              dataKey={label}
              stroke={colors[index % colors.length]}
              strokeWidth={index < 5 ? 2.5 : index < 10 ? 1.5 : 0.8}
              strokeOpacity={index < 5 ? 0.95 : index < 10 ? 0.58 : 0.25}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </TrendChartFrame>
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
            <span className="flex min-w-0 items-center gap-2 text-slate-600">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor:
                    item.color ?? item.stroke ?? item.payload?.stroke ?? "#94a3b8",
                }}
              />
              <span className="min-w-0 truncate">{item.dataKey}</span>
            </span>
            <span className="font-black text-slate-900">
              {formatNumber(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturedIslandTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="max-w-xs rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <p className="font-black text-slate-700">{row.title}</p>
      <p className="mt-2 text-slate-500">
        Featured snapshots: <strong>{formatNumber(row.featuredCount)}</strong>
      </p>
      <p className="text-slate-500">
        First seen: <strong>{row.firstSeenLabel}</strong>
      </p>
      <p className="text-slate-500">
        Latest seen: <strong>{row.latestSeenLabel}</strong>
      </p>
    </div>
  );
}

function PagedChartFooter({
  page,
  pageCount,
  start,
  end,
  total,
  onPrevious,
  onNext,
}: any) {
  return (
    <div className="mt-2 flex items-center justify-between gap-3">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
        {start}-{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous set"
          disabled={page === 0}
          onClick={onPrevious}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
        >
          {"<"}
        </button>
        <button
          type="button"
          aria-label="Next set"
          disabled={page >= pageCount - 1}
          onClick={onNext}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
        >
          {">"}
        </button>
      </div>
    </div>
  );
}

function FortniteLifecycleList({ title, rows, metricLabel, metricKey, accent }: any) {
  return (
    <div className="min-h-0 rounded-2xl bg-slate-50 p-4">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
        {title}
      </p>
      <div className="mt-3 max-h-[44rem] space-y-2 overflow-y-auto pr-1">
        {rows.map((row: any, index: number) => (
          <div key={row.id ?? row.title} className="flex items-start gap-3">
            <span
              className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-[10px] font-black text-white"
              style={{ backgroundColor: accent }}
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p className="line-clamp-1 min-w-0 text-sm font-black">
                  {row.title}
                </p>
                {row.ipSignal?.label && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                    {row.ipSignal.label}
                  </span>
                )}
              </div>
              <p className="text-[11px] font-semibold text-slate-400">
                {metricLabel}: {row[metricKey]} · Latest rank #{row.latestRank ?? "N/A"}
              </p>
              <p className="text-[11px] font-semibold text-slate-400">
                {row.daysInChartLabel} in Top {row.rankLimit} charts
              </p>
            </div>
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

function applyTrendTimeWindow(rows: any[], timeWindow: TrendTimeWindow) {
  const sortedRows = sortChartRowsByDate([...rows]);
  if (!sortedRows.length) return { data: sortedRows, note: "" };

  const latestDate = parseDateKey(sortedRows[sortedRows.length - 1]?.dateKey);
  const earliestDate = parseDateKey(sortedRows[0]?.dateKey);
  const targetDays = getTrendWindowDays(timeWindow);

  if (!latestDate || !earliestDate) return { data: sortedRows, note: "" };

  const startDate = new Date(latestDate);
  startDate.setUTCDate(startDate.getUTCDate() - targetDays + 1);

  const data = sortedRows.filter((row) => {
    const rowDate = parseDateKey(row.dateKey);
    return rowDate ? rowDate >= startDate && rowDate <= latestDate : true;
  });
  const availableDays =
    Math.floor((latestDate.getTime() - earliestDate.getTime()) / 86400000) + 1;
  const note =
    availableDays < targetDays
      ? `Showing all available history: ${availableDays} ${availableDays === 1 ? "day" : "days"} captured so far. The ${getTrendWindowLabel(timeWindow)} view will expand as new daily snapshots are collected.`
      : "";

  return { data, note };
}

function getTrendWindowDays(timeWindow: TrendTimeWindow) {
  if (timeWindow === "7d") return 7;
  if (timeWindow === "30d") return 30;
  return 92;
}

function getTrendWindowLabel(timeWindow: TrendTimeWindow) {
  if (timeWindow === "7d") return "past 7 days";
  if (timeWindow === "30d") return "past month";
  return "past 3 months";
}

function parseDateKey(dateKey: string | undefined) {
  if (!dateKey) return null;
  const date = new Date(`${dateKey}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
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

function GenreLinesTrend({ games, limit = 3, timeWindow = "7d" }: any) {
  const merged = mergeGenreTrends(games, limit);
  const trendWindow = applyTrendTimeWindow(merged.data, timeWindow);
  const data = trendWindow.data;
  const genres = merged.genres;
  const domain = getLineChartDomain(data, genres);
  const colors = ["#0d69ac", "#7c3aed", "#d6a06d", "#5b5d78", "#16a34a", "#ef4444"];

  if (!data.length) return <Unavailable text="No genre snapshots available." />;

  return (
    <TrendChartFrame note={trendWindow.note}>
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
    </TrendChartFrame>
  );
}

function mergeGameTrends(games: any[]) {
  const byDate: Record<string, any> = {};

  games.forEach((game) => {
    (game.snapshots ?? []).forEach((s: any) => {
      const dateKey = getSnapshotDateKey(s.created_at);
      if (!dateKey) return;
      if (!byDate[dateKey]) {
        byDate[dateKey] = { date: formatShortDate(s.created_at), dateKey };
      }
      byDate[dateKey][game.title] = s.current_players ?? 0;
    });
  });

  return sortChartRowsByDate(Object.values(byDate));
}

function mergeFortniteIslandTrends(islands: any[]) {
  const byDate: Record<string, any> = {};

  islands.forEach((island) => {
    (island.snapshots ?? []).forEach((snapshot: any) => {
      const value = getFortniteSnapshotValue(snapshot);
      if (typeof value !== "number") return;

      const dateKey = getSnapshotDateKey(snapshot.created_at);
      if (!dateKey) return;
      if (!byDate[dateKey]) {
        byDate[dateKey] = { date: formatShortDate(snapshot.created_at), dateKey };
      }
      byDate[dateKey][island.title] = value;
    });
  });

  return sortChartRowsByDate(Object.values(byDate));
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

        const dateKey = getSnapshotDateKey(snapshot.created_at);
        if (!dateKey) return;
        const genre = island.inferred_genre ?? "Other";
        if (!byDate[dateKey]) {
          byDate[dateKey] = {
            date: formatShortDate(snapshot.created_at),
            dateKey,
          };
        }
        byDate[dateKey][genre] = (byDate[dateKey][genre] ?? 0) + value;
      });
    });

  return { data: sortChartRowsByDate(Object.values(byDate)), genres };
}

function mergeFortniteVisibilityTrends(islands: any[]) {
  const byDate: Record<string, any> = {};

  islands.forEach((island) => {
    (island.snapshots ?? []).forEach((snapshot: any) => {
      const dateKey = getSnapshotDateKey(snapshot.created_at);
      if (!dateKey) return;

      if (!byDate[dateKey]) {
        byDate[dateKey] = {
          date: formatShortDate(snapshot.created_at),
          dateKey,
          "Visible islands": 0,
          "Ranked islands": 0,
        };
      }

      byDate[dateKey]["Visible islands"] += 1;
      if (typeof snapshot.rank === "number") {
        byDate[dateKey]["Ranked islands"] += 1;
      }
    });
  });

  return sortChartRowsByDate(Object.values(byDate));
}

function buildFortniteFeaturedIslandRows(islands: any[], limit: number) {
  const rankedRowsByDate = buildFortniteRankedRowsByDate(islands);
  const sourceDateKeys = Object.keys(rankedRowsByDate)
    .filter((dateKey) => rankedRowsByDate[dateKey].length >= limit)
    .sort();
  const scopedSnapshotsByIsland = new Map<string, any[]>();

  sourceDateKeys.forEach((dateKey) => {
    rankedRowsByDate[dateKey].slice(0, limit).forEach((row: any) => {
      const islandKey = getFortniteIslandKey(row);
      const existing = scopedSnapshotsByIsland.get(islandKey) ?? [];
      existing.push({
        ...row.snapshot,
        rank: row.rank,
      });
      scopedSnapshotsByIsland.set(islandKey, existing);
    });
  });

  return islands
    .map((island) => {
      const islandKey = getFortniteIslandKey(island);
      const qualifyingSnapshots = scopedSnapshotsByIsland.get(islandKey) ?? [];
      const dateKeys = Array.from(
        new Set(
          qualifyingSnapshots
            .map((snapshot: any) => getSnapshotDateKey(snapshot.created_at))
            .filter(Boolean)
        )
      ).sort() as string[];
      const allSeenDateKeys = Array.from(
        new Set(
          (island.snapshots ?? [])
            .map((snapshot: any) => getSnapshotDateKey(snapshot.created_at))
            .filter(Boolean)
        )
      ).sort() as string[];
      const latestSnapshot = qualifyingSnapshots
        .filter((snapshot: any) => snapshot.created_at)
        .sort(
          (a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

      if (!dateKeys.length) return null;

      const topScopeStreak = getLongestDateStreak(dateKeys, sourceDateKeys);

      return {
        id: island.id,
        title: island.title ?? "Untitled Fortnite Island",
        shortTitle: truncateLabel(island.title ?? "Untitled", 18),
        featuredCount: dateKeys.length,
        daysInChart: dateKeys.length,
        daysInChartLabel: `${formatNumber(dateKeys.length)} ${
          dateKeys.length === 1 ? "day" : "days"
        }`,
        rankLimit: limit,
        firstSeen: dateKeys[0],
        latestSeen: dateKeys.at(-1),
        allFirstSeen: allSeenDateKeys[0] ?? dateKeys[0],
        allLatestSeen: allSeenDateKeys.at(-1) ?? dateKeys.at(-1),
        firstSeenLabel: formatDateKey(dateKeys[0]),
        latestSeenLabel: formatDateKey(dateKeys.at(-1)),
        topScopeDays: topScopeStreak.days,
        streakFirstSeen: topScopeStreak.firstSeen,
        streakLatestSeen: topScopeStreak.latestSeen,
        streakFirstSeenLabel: formatDateKey(topScopeStreak.firstSeen),
        streakLatestSeenLabel: formatDateKey(topScopeStreak.latestSeen),
        allFirstSeenLabel: formatDateKey(allSeenDateKeys[0] ?? dateKeys[0]),
        allLatestSeenLabel: formatDateKey(allSeenDateKeys.at(-1) ?? dateKeys.at(-1)),
        latestRank: getFortniteSnapshotRank(latestSnapshot) ?? island.latestRank ?? null,
        bestRank: Math.min(
          ...qualifyingSnapshots
            .map((snapshot: any) => getFortniteSnapshotRank(snapshot))
            .filter((rank: any) => typeof rank === "number")
        ),
        ipSignal: getFortniteIpSignal(island),
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => {
      if ((b.topScopeDays ?? 0) !== (a.topScopeDays ?? 0)) {
        return (b.topScopeDays ?? 0) - (a.topScopeDays ?? 0);
      }
      if (b.featuredCount !== a.featuredCount) return b.featuredCount - a.featuredCount;
      if ((a.bestRank ?? 999999) !== (b.bestRank ?? 999999)) {
        return (a.bestRank ?? 999999) - (b.bestRank ?? 999999);
      }
      return String(a.firstSeen).localeCompare(String(b.firstSeen));
    });
}

function buildFortniteRankedRowsByDate(islands: any[]) {
  const rowsByDate: Record<string, Map<string, any>> = {};

  islands.forEach((island) => {
    (island.snapshots ?? []).forEach((snapshot: any) => {
      const dateKey = getSnapshotDateKey(snapshot.created_at);
      const rank = getFortniteSnapshotRank(snapshot);

      if (!dateKey || typeof rank !== "number") return;

      const islandKey = getFortniteIslandKey(island);
      if (!rowsByDate[dateKey]) rowsByDate[dateKey] = new Map();

      const existing = rowsByDate[dateKey].get(islandKey);
      if (existing && existing.rank <= rank) return;

      rowsByDate[dateKey].set(islandKey, {
        ...island,
        snapshot,
        rank,
      });
    });
  });

  const sortedRowsByDate: Record<string, any[]> = {};

  Object.keys(rowsByDate).forEach((dateKey) => {
    sortedRowsByDate[dateKey] = Array.from(rowsByDate[dateKey].values()).sort((a: any, b: any) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return String(a.title ?? "").localeCompare(String(b.title ?? ""));
    });
  });

  return sortedRowsByDate;
}

function getLongestDateStreak(dateKeys: string[], sourceDateKeys: string[]) {
  const topDates = new Set(dateKeys);
  const orderedDates = (sourceDateKeys.length ? sourceDateKeys : dateKeys).filter(Boolean);
  let currentStart: string | null = null;
  let currentEnd: string | null = null;
  let bestStart = dateKeys[0];
  let bestEnd = dateKeys[0];
  let bestDays = 1;

  orderedDates.forEach((dateKey) => {
    if (topDates.has(dateKey)) {
      currentStart = currentStart ?? dateKey;
      currentEnd = dateKey;
      return;
    }

    if (currentStart && currentEnd) {
      const days = getElapsedDateDays(currentStart, currentEnd);
      if (days > bestDays) {
        bestDays = days;
        bestStart = currentStart;
        bestEnd = currentEnd;
      }
    }

    currentStart = null;
    currentEnd = null;
  });

  if (currentStart && currentEnd) {
    const days = getElapsedDateDays(currentStart, currentEnd);
    if (days > bestDays) {
      bestDays = days;
      bestStart = currentStart;
      bestEnd = currentEnd;
    }
  }

  return {
    days: bestDays,
    firstSeen: bestStart,
    latestSeen: bestEnd,
  };
}

function getElapsedDateDays(startDateKey?: string, endDateKey?: string) {
  const start = parseDateKey(startDateKey);
  const end = parseDateKey(endDateKey);

  if (!start || !end) return 1;

  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
}

function buildFortniteIslandLifecycleRows(islands: any[], limit: number) {
  const rows = buildFortniteFeaturedIslandRows(islands, limit).map((row: any) => ({
    ...row,
    featuredCountLabel: formatNumber(row.featuredCount),
  }));

  return {
    newest: [...rows]
      .sort((a, b) => String(b.firstSeen).localeCompare(String(a.firstSeen)))
      .slice(0, limit),
    longest: [...rows]
      .sort((a, b) => {
        if (b.featuredCount !== a.featuredCount) return b.featuredCount - a.featuredCount;
        return String(a.firstSeen).localeCompare(String(b.firstSeen));
      })
      .slice(0, limit),
  };
}

function getFortniteSnapshotRank(snapshot: any) {
  return parseFiniteNumber(
    snapshot?.rank ??
      snapshot?.source_order ??
      snapshot?.position ??
      snapshot?.order ??
      snapshot?.source_rank ??
      snapshot?.raw_payload?.source_order ??
      snapshot?.raw_payload?.rank ??
      snapshot?.raw_payload?.position ??
      snapshot?.raw_payload?.order
  );
}

function getFortniteIslandKey(island: any) {
  return String(island.island_code ?? island.title ?? island.id ?? "")
    .trim()
    .toLowerCase();
}

function parseFiniteNumber(value: any) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function truncateLabel(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function formatDateKey(dateKey: string | undefined) {
  if (!dateKey) return "N/A";

  return formatShortDate(`${dateKey}T00:00:00.000Z`);
}

function mergeFortniteGenrePresenceTrends(islands: any[]) {
  const byGenreTotals: Record<string, number> = {};
  const substantialDateKeys = getFortniteSubstantialSnapshotDateKeys(islands);
  const allowedDateKeys = new Set(
    substantialDateKeys.length
      ? substantialDateKeys
      : getAvailableFortniteSnapshotDateKeys(islands)
  );

  islands.forEach((island) => {
    const genre = island.inferred_genre ?? "Other";
    const seenDateKeys = new Set<string>();

    (island.snapshots ?? []).forEach((snapshot: any) => {
      const dateKey = getSnapshotDateKey(snapshot.created_at);
      if (!dateKey || !allowedDateKeys.has(dateKey) || seenDateKeys.has(dateKey)) {
        return;
      }

      seenDateKeys.add(dateKey);
      byGenreTotals[genre] = (byGenreTotals[genre] ?? 0) + 1;
    });
  });

  const genres = Object.entries(byGenreTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([genre]) => genre);
  const byDate: Record<string, any> = {};

  islands
    .filter((island) => genres.includes(island.inferred_genre ?? "Other"))
    .forEach((island) => {
      const seenDateKeys = new Set<string>();

      (island.snapshots ?? []).forEach((snapshot: any) => {
        const dateKey = getSnapshotDateKey(snapshot.created_at);
        if (!dateKey || !allowedDateKeys.has(dateKey) || seenDateKeys.has(dateKey)) {
          return;
        }

        seenDateKeys.add(dateKey);

        const genre = island.inferred_genre ?? "Other";
        if (!byDate[dateKey]) {
          byDate[dateKey] = {
            date: formatShortDate(snapshot.created_at),
            dateKey,
          };
        }

        byDate[dateKey][genre] = (byDate[dateKey][genre] ?? 0) + 1;
      });
    });

  return { data: sortChartRowsByDate(Object.values(byDate)), genres };
}

function mergeFortniteNewReturningTrends(islands: any[]) {
  const firstDateByIsland = new Map<string, string>();
  const byDate: Record<string, any> = {};

  islands.forEach((island) => {
    const dateKeys = (island.snapshots ?? [])
      .map((snapshot: any) => getSnapshotDateKey(snapshot.created_at))
      .filter(Boolean)
      .sort();
    const islandKey = String(island.id ?? island.island_code ?? island.title);
    const firstDate = dateKeys[0];

    if (firstDate) firstDateByIsland.set(islandKey, firstDate);
  });

  islands.forEach((island) => {
    const islandKey = String(island.id ?? island.island_code ?? island.title);
    const firstDate = firstDateByIsland.get(islandKey);

    (island.snapshots ?? []).forEach((snapshot: any) => {
      const dateKey = getSnapshotDateKey(snapshot.created_at);
      if (!dateKey) return;

      if (!byDate[dateKey]) {
        byDate[dateKey] = {
          date: formatShortDate(snapshot.created_at),
          dateKey,
          "New islands": 0,
          "Returning islands": 0,
        };
      }

      if (dateKey === firstDate) {
        byDate[dateKey]["New islands"] += 1;
      } else {
        byDate[dateKey]["Returning islands"] += 1;
      }
    });
  });

  return sortChartRowsByDate(Object.values(byDate));
}

function mergeGenreTrends(games: any[], limit = 10) {
  const byGenreTotals: Record<string, number> = {};

  games.forEach((game) => {
    const genre = getDisplayGenre(game, "roblox");

    byGenreTotals[genre] =
      (byGenreTotals[genre] ?? 0) +
      (game.latestPlayers ?? 0);
  });

  const genres = Object.entries(byGenreTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([genre]) => genre);

  const byDate: Record<string, any> = {};

  games
    .filter((game) => genres.includes(getDisplayGenre(game, "roblox")))
    .forEach((game) => {
      (game.snapshots ?? []).forEach((s: any) => {
        const dateKey = getSnapshotDateKey(s.created_at);
        if (!dateKey) return;
        const genre = getDisplayGenre(game, "roblox");
        if (!byDate[dateKey]) {
          byDate[dateKey] = { date: formatShortDate(s.created_at), dateKey };
        }
        byDate[dateKey][genre] =
          (byDate[dateKey][genre] ?? 0) + (s.current_players ?? 0);
      });
    });

  return { data: sortChartRowsByDate(Object.values(byDate)), genres };
}

function mergeFortniteLabelUsageTrends(islands: any[], limit: number) {
  const latestRankings = buildFortniteLabelRankings(islands);
  const labels = latestRankings.slice(0, limit).map((row: any) => row.label);
  const byDate: Record<string, any> = {};

  islands.forEach((island) => {
    const primaryLabel = getFortnitePrimaryLabel(island);
    const islandLabels =
      primaryLabel && labels.includes(primaryLabel) ? [primaryLabel] : [];

    if (!islandLabels.length) return;

    (island.snapshots ?? []).forEach((snapshot: any) => {
      const dateKey = getSnapshotDateKey(snapshot.created_at);
      if (!dateKey) return;
      if (!byDate[dateKey]) {
        byDate[dateKey] = {
          date: formatShortDate(snapshot.created_at),
          dateKey,
        };
      }

      islandLabels.forEach((label) => {
        byDate[dateKey][label] = (byDate[dateKey][label] ?? 0) + 1;
      });
    });
  });

  return {
    data: sortChartRowsByDate(Object.values(byDate)),
    labels,
  };
}

function getSnapshotDateKey(value: string | undefined) {
  return String(value ?? "").slice(0, 10);
}

function sortChartRowsByDate(rows: any[]) {
  return rows.sort((a: any, b: any) =>
    String(a.dateKey ?? "").localeCompare(String(b.dateKey ?? ""))
  );
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
    primary: { hex: "#0d69ac", rgb: "RGB 13, 105, 172" },
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
    secondary: { hex: "#0d69ac", rgb: "RGB 13, 105, 172" },
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
    timeZone: "UTC",
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
