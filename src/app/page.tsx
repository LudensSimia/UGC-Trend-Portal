"use client";

import { useEffect, useMemo, useState } from "react";
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

const SHOW_ARCHIVED_FORTNITE_VISIBILITY_WIDGETS = false;

type Platform = "roblox" | "fortnite";
type TrendTimeWindow = "7d" | "30d" | "3m";
type LandscapeTimeWindow = "today" | "7d" | "30d";
type TrendRankBand = "top" | "mid" | "bottom";
type UserTier = "free" | "scout" | "pro" | "admin";
type TierAssignable = Exclude<UserTier, "admin">;

type AccessOption = {
  key: string;
  label: string;
  description: string;
};

type AccessItem = {
  key: string;
  label: string;
  platform: Platform | "global";
  description: string;
  options?: AccessOption[];
};

type TierVisibilitySettings = Record<TierAssignable, Record<string, boolean>>;

type DataQualitySnapshot = {
  platform: Platform;
  total_records: number;
  classified_records: number;
  classification_coverage_percent: number;
  confidence_percent: number;
  created_at: string;
};

const USER_TIERS: UserTier[] = ["free", "scout", "pro", "admin"];
const CONFIGURABLE_TIERS: TierAssignable[] = ["free", "scout", "pro"];
const TIME_WINDOW_OPTIONS: AccessOption[] = [
  { key: "time_7d", label: "7D", description: "Allow the 7-day view." },
  { key: "time_30d", label: "Month", description: "Allow the rolling 30-day view." },
  { key: "time_3m", label: "3M", description: "Allow the rolling 3-month view." },
];
const TWO_TIME_WINDOW_OPTIONS = TIME_WINDOW_OPTIONS.slice(0, 2);
const LANDSCAPE_TIME_WINDOW_OPTIONS: AccessOption[] = [
  { key: "time_today", label: "Today", description: "Allow the latest snapshot view." },
  ...TWO_TIME_WINDOW_OPTIONS,
];
const LIMIT_25_50_OPTIONS: AccessOption[] = [
  { key: "limit_25", label: "25 records", description: "Allow the smaller source set." },
  { key: "limit_50", label: "50 records", description: "Allow the larger source set." },
];
const LABEL_10_25_OPTIONS: AccessOption[] = [
  { key: "limit_10", label: "10 labels", description: "Allow the compact label set." },
  { key: "limit_25", label: "25 labels", description: "Allow the expanded label set." },
];
const TOP_3_10_OPTIONS: AccessOption[] = [
  { key: "limit_3", label: "3 lines", description: "Allow the compact view." },
  { key: "limit_10", label: "10 lines", description: "Allow the expanded view." },
];
const PERCENTILE_OPTIONS: AccessOption[] = [
  { key: "percentiles", label: "Rank band selector", description: "Allow Top 10, Mid 10, and Bottom 10 views." },
];
const TEMPLATE_OPTIONS: AccessOption[] = [
  { key: "template_mainstream", label: "Mainstream", description: "Allow mainstream template generation." },
  { key: "template_uncommon", label: "Uncommon", description: "Allow uncommon template generation." },
  { key: "template_source", label: "Source set", description: "Allow source-set template generation." },
  { key: "template_reroll", label: "Reroll", description: "Allow rerolling generated templates." },
];
const ROBLOX_ARCHETYPE_OPTIONS: AccessOption[] = [
  { key: "archetype_median", label: "Median", description: "Show the middle player-count profile." },
  { key: "archetype_average", label: "Average", description: "Show the composite average profile." },
  { key: "archetype_unique", label: "Outlier", description: "Show the rarest detected profile." },
  ...TIME_WINDOW_OPTIONS,
];

const ACCESS_ITEMS: AccessItem[] = [
  { key: "global_platform_toggle", label: "Platform selector", platform: "global", description: "Switch between Roblox and Fortnite views." },
  { key: "roblox_data_source_health", label: "Data Source & Health", platform: "roblox", description: "Source, capture coverage, query count, and last snapshot." },
  { key: "roblox_top_games", label: "Top 5 Most Played Games", platform: "roblox", description: "Current player leaderboard summary." },
  { key: "roblox_trending_games", label: "Trending Games", platform: "roblox", description: "Player gain, position movement, and player loss signals." },
  { key: "roblox_genre_mix", label: "Most Played Genre Mix Estimated", platform: "roblox", description: "Estimated player-weighted genre pie chart.", options: LIMIT_25_50_OPTIONS },
  { key: "roblox_subgenre_mix", label: "Most Played Subgenre Mix Estimated", platform: "roblox", description: "Estimated player-weighted subgenre pie chart.", options: LIMIT_25_50_OPTIONS },
  { key: "roblox_games_trend", label: "Most Played Games Over Time", platform: "roblox", description: "Game activity lines across stored snapshots.", options: [...TIME_WINDOW_OPTIONS, ...LIMIT_25_50_OPTIONS, ...PERCENTILE_OPTIONS] },
  { key: "roblox_genres_trend", label: "Most Played Genres Over Time", platform: "roblox", description: "Genre activity lines across stored snapshots.", options: [...TIME_WINDOW_OPTIONS, ...TOP_3_10_OPTIONS] },
  { key: "roblox_keyword_cloud", label: "Top 25 Keyword Cloud", platform: "roblox", description: "Frequent words from title and description text." },
  { key: "roblox_common_structure", label: "Common Description Structure", platform: "roblox", description: "Description pattern summary." },
  { key: "roblox_tile_colors", label: "Top Tile Colors", platform: "roblox", description: "Primary and secondary thumbnail colors." },
  { key: "roblox_archetypes", label: "Fictional Experience Archetypes", platform: "roblox", description: "Median, average, and outlier fictional profiles.", options: ROBLOX_ARCHETYPE_OPTIONS },
  { key: "roblox_template_generator", label: "Game Template Generator", platform: "roblox", description: "Synthetic concept generator.", options: TEMPLATE_OPTIONS },
  { key: "roblox_correlation", label: "Metric Correlation Analysis", platform: "roblox", description: "Metric comparison by genre.", options: TWO_TIME_WINDOW_OPTIONS },
  { key: "roblox_directional_map", label: "Directional Research Map", platform: "roblox", description: "Demand, velocity, saturation, and estimated format complexity maps.", options: TWO_TIME_WINDOW_OPTIONS },
  { key: "roblox_idea_card", label: "My Game Idea Is", platform: "roblox", description: "Genre/subgenre positioning tool.", options: TWO_TIME_WINDOW_OPTIONS },
  { key: "roblox_research_cards", label: "Research / Design / Warning Cards", platform: "roblox", description: "Research readout blocks for the selected idea." },
  { key: "roblox_activity_landscape", label: "Player Activity Landscape", platform: "roblox", description: "Player activity treemap.", options: LANDSCAPE_TIME_WINDOW_OPTIONS },
  { key: "roblox_experience_cards", label: "Top 25 Roblox Experiences", platform: "roblox", description: "Detailed experience cards or list view.", options: [
    { key: "view_cards", label: "Card view", description: "Allow the card layout." },
    { key: "view_list", label: "List view", description: "Allow the compact list layout." },
  ] },
  { key: "roblox_forecasting_inputs", label: "Forecasting Signal Inputs", platform: "roblox", description: "Prediction-market style research inputs.", options: [
    { key: "search", label: "Search", description: "Allow searching for a specific game." },
  ] },
  { key: "fortnite_data_source_health", label: "Data Source & Health", platform: "fortnite", description: "Source, capture coverage, query count, and last snapshot." },
  { key: "fortnite_genre_mix", label: "Estimated Genre Mix", platform: "fortnite", description: "Estimated genre appearances.", options: TIME_WINDOW_OPTIONS },
  { key: "fortnite_subgenre_mix", label: "Estimated Subgenre Mix", platform: "fortnite", description: "Estimated subgenre appearances.", options: TIME_WINDOW_OPTIONS },
  { key: "fortnite_primary_labels", label: "Primary Label Usage", platform: "fortnite", description: "First surfaced label usage." },
  { key: "fortnite_label_trend", label: "Primary Label Usage Over Time", platform: "fortnite", description: "Label usage over stored snapshots.", options: [...TIME_WINDOW_OPTIONS, ...LABEL_10_25_OPTIONS] },
  { key: "fortnite_genre_presence", label: "Estimated Genre / Format Presence", platform: "fortnite", description: "Estimated Fortnite genre or format presence.", options: TIME_WINDOW_OPTIONS },
  { key: "fortnite_keyword_cloud", label: "Fortnite Island Keyword Cloud", platform: "fortnite", description: "Title and label keyword signals." },
  { key: "fortnite_ip_signals", label: "IP / Collaboration Signals", platform: "fortnite", description: "Brand, IP, and collaboration cues." },
  { key: "fortnite_tile_colors", label: "Island Tile Colors", platform: "fortnite", description: "Primary and secondary island tile colors." },
  { key: "fortnite_archetypes", label: "Fictional Island Archetypes", platform: "fortnite", description: "Synthetic profiles from Fortnite metadata.", options: TIME_WINDOW_OPTIONS },
  { key: "fortnite_template_generator", label: "Game Template Generator", platform: "fortnite", description: "Synthetic island concept generator.", options: TEMPLATE_OPTIONS },
  { key: "fortnite_directional_map", label: "Directional Research Map", platform: "fortnite", description: "Research map based on Fortnite metadata.", options: TWO_TIME_WINDOW_OPTIONS },
  { key: "fortnite_idea_card", label: "My Fortnite Island Idea Is", platform: "fortnite", description: "Estimated genre/subgenre positioning tool.", options: TWO_TIME_WINDOW_OPTIONS },
  { key: "fortnite_research_cards", label: "Research / Design / Warning Cards", platform: "fortnite", description: "Research readout blocks for the selected idea." },
  { key: "fortnite_island_cards", label: "Latest Imported Fortnite Islands", platform: "fortnite", description: "Detailed Fortnite island metadata cards." },
  { key: "fortnite_forecasting_inputs", label: "Forecasting Signal Inputs", platform: "fortnite", description: "Forecasting research inputs for islands.", options: [
    { key: "search", label: "Search", description: "Allow searching for a specific island." },
  ] },
];

const DEFAULT_TIER_VISIBILITY: TierVisibilitySettings = buildDefaultTierVisibility();

function buildDefaultTierVisibility(): TierVisibilitySettings {
  const allKeys = getAccessSettingKeys();
  const settings = {
    free: Object.fromEntries(allKeys.map((key) => [key, false])),
    scout: Object.fromEntries(allKeys.map((key) => [key, false])),
    pro: Object.fromEntries(allKeys.map((key) => [key, false])),
  } as TierVisibilitySettings;

  [
    "global_platform_toggle",
    "roblox_data_source_health",
    "roblox_top_games",
    "roblox_trending_games",
    "roblox_genre_mix",
    "roblox_subgenre_mix",
    "fortnite_data_source_health",
    "fortnite_genre_mix",
    "fortnite_subgenre_mix",
    "fortnite_primary_labels",
  ].forEach((key) => {
    settings.free[key] = true;
  });

  ACCESS_ITEMS.forEach((item) => {
    if (item.key !== "roblox_forecasting_inputs" && item.key !== "fortnite_forecasting_inputs") {
      settings.scout[item.key] = true;
      item.options?.forEach((option) => {
        settings.scout[getAccessOptionKey(item.key, option.key)] =
          option.key === "time_7d" ||
          option.key === "time_today" ||
          option.key === "limit_25" ||
          option.key === "limit_3" ||
          option.key === "limit_10" ||
          option.key === "archetype_median" ||
          option.key === "archetype_average" ||
          option.key === "view_cards" ||
          option.key === "template_mainstream";
      });
    }
    settings.pro[item.key] = true;
    item.options?.forEach((option) => {
      settings.pro[getAccessOptionKey(item.key, option.key)] = true;
    });
  });

  return settings;
}

function getAccessOptionKey(itemKey: string, optionKey: string) {
  return `${itemKey}:${optionKey}`;
}

function getAccessSettingKeys() {
  return ACCESS_ITEMS.flatMap((item) => [
    item.key,
    ...(item.options ?? []).map((option) => getAccessOptionKey(item.key, option.key)),
  ]);
}

function normalizeDashboardTier(value: unknown): UserTier {
  if (value === "paid" || value === "trial") return "scout";
  if (value === "newsletter") return "free";
  return USER_TIERS.includes(value as UserTier) ? (value as UserTier) : "free";
}

function mergeTierVisibility(value: any): TierVisibilitySettings {
  const merged = structuredClone(DEFAULT_TIER_VISIBILITY) as TierVisibilitySettings;

  CONFIGURABLE_TIERS.forEach((tier) => {
    getAccessSettingKeys().forEach((key) => {
      if (typeof value?.[tier]?.[key] === "boolean") {
        merged[tier][key] = value[tier][key];
      }
    });
  });

  return merged;
}

function canSeeAccessOption(
  tier: UserTier,
  settings: TierVisibilitySettings,
  itemKey: string,
  optionKey: string
) {
  if (tier === "admin") return true;
  return Boolean(settings[tier]?.[getAccessOptionKey(itemKey, optionKey)]);
}

function canSeeAccessItem(
  tier: UserTier,
  settings: TierVisibilitySettings,
  key: string
) {
  if (tier === "admin") return true;
  return Boolean(settings[tier]?.[key]);
}

function tierLabel(tier: UserTier) {
  const labels: Record<UserTier, string> = {
    free: "Free",
    scout: "Explorer",
    pro: "Researcher",
    admin: "Admin",
  };

  return labels[tier];
}

export default function Home() {
  const [activePlatform, setActivePlatform] = useState<Platform>("roblox");
  const [darkMode, setDarkMode] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [showTerms, setShowTerms] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [userTier, setUserTier] = useState<UserTier>(
    process.env.NODE_ENV !== "production" ? "admin" : "free"
  );
  const [adminPreviewTier, setAdminPreviewTier] = useState<UserTier>("admin");
  const [tierVisibility, setTierVisibility] = useState<TierVisibilitySettings>(
    DEFAULT_TIER_VISIBILITY
  );
  const [tierVisibilityReady, setTierVisibilityReady] = useState(false);
  const [robloxGames, setRobloxGames] = useState<any[]>([]);
  const [fortniteIslands, setFortniteIslands] = useState<any[]>([]);
  const [dataQualitySnapshots, setDataQualitySnapshots] = useState<
    DataQualitySnapshot[]
  >([]);
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedSubgenre, setSelectedSubgenre] = useState("");
  const [topGamesTrendLimit, setTopGamesTrendLimit] = useState<25 | 50>(25);
  const [mostPlayedMixLimit, setMostPlayedMixLimit] = useState<25 | 50>(25);
  const [topGamesTrendBand, setTopGamesTrendBand] =
    useState<TrendRankBand>("top");
  const [topGamesTrendWindow, setTopGamesTrendWindow] =
    useState<TrendTimeWindow>("7d");
  const [genreTrendLimit, setGenreTrendLimit] = useState<3 | 10>(3);
  const [genreTrendPercentile, setGenreTrendPercentile] =
    useState<25 | 50 | 75 | 100>(100);
  const [genreTrendWindow, setGenreTrendWindow] =
    useState<TrendTimeWindow>("7d");
  const [robloxArchetypeWindow, setRobloxArchetypeWindow] =
    useState<TrendTimeWindow>("7d");
  const [ideaTimeWindow, setIdeaTimeWindow] =
    useState<"7d" | "30d">("7d");
  const [landscapeTimeWindow, setLandscapeTimeWindow] =
    useState<LandscapeTimeWindow>("today");
  const [robloxExperienceView, setRobloxExperienceView] =
    useState<"cards" | "list">("cards");
  const [fortniteLabelTrendLimit, setFortniteLabelTrendLimit] =
    useState<10 | 25>(10);
  const [fortniteLifecycleLimit, setFortniteLifecycleLimit] =
    useState<10 | 25>(25);
  const [fortniteLabelTrendWindow, setFortniteLabelTrendWindow] =
    useState<TrendTimeWindow>("7d");
  const [fortniteGenreScoreboardWindow, setFortniteGenreScoreboardWindow] =
    useState<TrendTimeWindow>("7d");
  const [fortniteArchetypeWindow, setFortniteArchetypeWindow] =
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
    const stored = window.localStorage.getItem("snout-tier-visibility");

    if (stored) {
      try {
        setTierVisibility(mergeTierVisibility(JSON.parse(stored)));
      } catch (error) {
        console.warn("Tier visibility settings could not be loaded:", error);
      }
    }
    setTierVisibilityReady(true);

    async function fetchSession() {
      try {
        const response = await fetch("/api/auth/session");
        const session = await response.json();
        setUserTier(
          process.env.NODE_ENV !== "production"
            ? "admin"
            : normalizeDashboardTier(session?.tier)
        );
      } catch (error) {
        console.warn("Dashboard session could not be loaded:", error);
      }
    }

    fetchSession();
  }, []);

  useEffect(() => {
    if (tierVisibilityReady) {
      window.localStorage.setItem(
        "snout-tier-visibility",
        JSON.stringify(tierVisibility)
      );
    }
  }, [tierVisibility, tierVisibilityReady]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      try {
        const response = await fetch("/api/dashboard/data");

        if (!response.ok) {
          throw new Error(`Dashboard data request failed with ${response.status}`);
        }

        const payload = await response.json();

        setRobloxGames((payload.roblox ?? []).map(withLatestRobloxSnapshot));
        setFortniteIslands((payload.fortnite ?? []).map(withLatestFortniteSnapshot));
        setDataQualitySnapshots((payload.dataQualitySnapshots ?? []) as DataQualitySnapshot[]);
      } catch (error) {
        console.error("Dashboard data fetch error:", error);
        setRobloxGames([]);
        setFortniteIslands([]);
        setDataQualitySnapshots([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    window.location.href = "/login";
  }

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

  const effectiveUserTier = userTier === "admin" ? adminPreviewTier : userTier;
  const canAccess = (key: string) =>
    canSeeAccessItem(effectiveUserTier, tierVisibility, key);
  const canAccessOption = (itemKey: string, optionKey: string) =>
    canSeeAccessOption(effectiveUserTier, tierVisibility, itemKey, optionKey);
  const effectiveTimeWindow = (
    itemKey: string,
    requested: TrendTimeWindow
  ): TrendTimeWindow => {
    if (requested === "3m" && canAccessOption(itemKey, "time_3m")) return "3m";
    if (requested === "30d" && canAccessOption(itemKey, "time_30d")) return "30d";
    return "7d";
  };
  const allowedTimeWindows = (itemKey: string, include3m = true) => {
    const windows: TrendTimeWindow[] = ["7d"];
    if (canAccessOption(itemKey, "time_30d")) windows.push("30d");
    if (include3m && canAccessOption(itemKey, "time_3m")) windows.push("3m");
    return windows;
  };
  const effectiveLandscapeTimeWindow = (
    requested: LandscapeTimeWindow
  ): LandscapeTimeWindow => {
    if (requested === "today" && canAccessOption("roblox_activity_landscape", "time_today")) {
      return "today";
    }
    if (requested === "30d" && canAccessOption("roblox_activity_landscape", "time_30d")) {
      return "30d";
    }
    return "7d";
  };
  const allowedLandscapeTimeWindows = () => {
    const windows: LandscapeTimeWindow[] = [];
    if (canAccessOption("roblox_activity_landscape", "time_today")) windows.push("today");
    if (canAccessOption("roblox_activity_landscape", "time_7d")) windows.push("7d");
    if (canAccessOption("roblox_activity_landscape", "time_30d")) windows.push("30d");
    return windows.length ? windows : (["7d"] as LandscapeTimeWindow[]);
  };
  const activeIdeaWindow =
    activePlatform === "roblox"
      ? effectiveTimeWindow("roblox_idea_card", ideaTimeWindow)
      : effectiveTimeWindow("fortnite_idea_card", ideaTimeWindow);
  const activeLandscapeWindow = effectiveLandscapeTimeWindow(landscapeTimeWindow);
  const activeTwoOptionIdeaWindow = activeIdeaWindow as "7d" | "30d";

  const activeIdeaAnalysisItems = useMemo(() => {
    return activePlatform === "roblox"
      ? buildCorrelationWindowGames(activeGenreAnalysisItems, activeTwoOptionIdeaWindow)
      : getFortniteIslandsInWindow(activeGenreAnalysisItems, activeTwoOptionIdeaWindow);
  }, [activeGenreAnalysisItems, activePlatform, activeTwoOptionIdeaWindow]);

  const filteredIdeaItems = activeIdeaAnalysisItems.filter((item) => {
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
  const landscapeRobloxGames = useMemo(() => {
    return buildLandscapeWindowGames(robloxGames, activeLandscapeWindow);
  }, [robloxGames, activeLandscapeWindow]);

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
    activeIdeaAnalysisItems.length > 0
      ? Math.round((filteredIdeaItems.length / activeIdeaAnalysisItems.length) * 100)
      : 0;

  const topSimilar = buildIdeaSuggestions(
    activeIdeaAnalysisItems,
    activePlatform,
    selectedGenre,
    selectedSubgenre
  );

  const mostPlayedClassificationPies =
    buildRobloxMostPlayedClassificationPies(topRobloxGames, mostPlayedMixLimit);
  const topGameScoreboard = topRobloxGames.slice(0, 5);
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
    activeIdeaAnalysisItems,
    dataSourceHealth,
    activeGenreAnalysisItems,
    robloxGenreAnalysisGames,
    topRobloxGenreAnalysisGames,
    ideaTimeWindow,
    setIdeaTimeWindow,
    landscapeTimeWindow,
    setLandscapeTimeWindow,
    landscapeRobloxGames,
    panel,
    accent,
    topFortniteIslands,
    fortniteIslands,
    trendingHighlights,
    topGamesTrendLimit,
    topGamesTrendBand,
    topGamesTrendWindow,
    setTopGamesTrendLimit,
    setTopGamesTrendBand,
    setTopGamesTrendWindow,
    genreTrendLimit,
    genreTrendPercentile,
    genreTrendWindow,
    robloxArchetypeWindow,
    setGenreTrendLimit,
    setGenreTrendPercentile,
    setGenreTrendWindow,
    setRobloxArchetypeWindow,
    fortniteLabelTrendLimit,
    fortniteLifecycleLimit,
    fortniteLabelTrendWindow,
    fortniteGenreScoreboardWindow,
    fortniteArchetypeWindow,
    setFortniteLabelTrendLimit,
    setFortniteLifecycleLimit,
    setFortniteLabelTrendWindow,
    setFortniteGenreScoreboardWindow,
    setFortniteArchetypeWindow,
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
    userTier,
    effectiveUserTier,
    tierVisibility,
    canAccess,
    canAccessOption,
    effectiveTimeWindow,
    allowedTimeWindows,
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
                  Snoutboard - UGC Research Dashboard
                </h1>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                  Beta
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <UserTierBadge tier={effectiveUserTier} actualTier={userTier} />
            {userTier === "admin" && (
              <AdminTierPreviewSelect
                value={adminPreviewTier}
                onChange={setAdminPreviewTier}
              />
            )}
            {canAccess("global_platform_toggle") && (
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
            )}

            <DatePill date={currentDateLabel} accent={accent} />

            <ThemeModeButton
              darkMode={darkMode}
              onClick={() => setDarkMode((value) => !value)}
              accent={accent}
            />
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-500 transition hover:bg-slate-200"
            >
              Log out
            </button>
          </div>
        </header>

        {showDisclaimer && (
          <div className="mb-8 flex items-start justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p>
              <span>
                <strong>Informational use only.</strong> Snoutboard provides
                independent market-intelligence summaries and research signals
                for creative exploration. Data may be incomplete, delayed,
                inferred, or automatically classified, and should be
                independently reviewed before use. Snoutboard does not provide
                legal, financial, investment, business, or professional advice
                and does not guarantee revenue, player growth, discoverability,
                platform placement, or creator success.
              </span>
              <span className="mt-2 block">
                Snoutboard is not affiliated with, endorsed by, or sponsored by
                Roblox, Epic Games, Fortnite, or any platform owner. Video games
                are a form of art; use these signals to support your creativity
                and build experiences that are fun.
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

        {activePlatform === "roblox" || activePlatform === "fortnite" ? (
          <nav
            aria-label={`${activePlatform === "roblox" ? "Roblox" : "Fortnite"} dashboard shortcuts`}
            className="mb-4 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex flex-wrap gap-2">
              {(activePlatform === "roblox"
                ? [
                    [
                      "#most-played-games-over-time",
                      "See what's popular",
                      "Most Played Games Over Time",
                    ],
                    ["#my-game-idea-is", "Start a new project", "My Game Idea Is"],
                    [
                      "#player-activity-landscape",
                      "Track what's rising or falling",
                      "Player Activity Landscape",
                    ],
                  ]
                : [
                    [
                      "#primary-label-usage-over-time",
                      "See repeated format signals",
                      "Primary Label Usage Over Time",
                    ],
                    [
                      "#my-fortnite-island-idea-is",
                      "Start a new island concept",
                      "My Fortnite Island Idea Is",
                    ],
                    [
                      "#latest-imported-fortnite-islands",
                      "Review imported island metadata",
                      "Latest Imported Fortnite Islands",
                    ],
                  ]
              ).map(([href, prompt, label]) => (
                <a
                  key={href}
                  href={href}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-[#0d69ac]/40 hover:bg-[#0d69ac]/10"
                >
                  <span className="block text-[11px] font-bold normal-case tracking-normal text-slate-400">
                    {prompt}
                  </span>
                  <span className="mt-0.5 block text-xs font-black uppercase tracking-wide text-slate-500">
                    {label}
                  </span>
                </a>
              ))}
            </div>
            <div className="flex items-center gap-2" aria-label="Social media links">
              {[
                ["YouTube", "/youtube-logo.png", "h-4 w-6"],
                ["TikTok", "/tiktok-logo.png", "h-5 w-5"],
                ["Twitter / X", "/twitter-logo-black.png", "h-5 w-5"],
              ].map(([label, src, size]) => (
                <a
                  key={label}
                  href="#"
                  aria-label={`${label} link coming soon`}
                  title={`${label} link coming soon`}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 transition hover:border-[#0d69ac]/40 hover:bg-[#0d69ac]/10"
                >
                  <img
                    src={src}
                    alt=""
                    aria-hidden="true"
                    className={`${size} object-contain opacity-75 transition hover:opacity-100`}
                  />
                </a>
              ))}
            </div>
          </nav>
        ) : null}

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
            <section className="mb-6 grid gap-4 lg:grid-cols-3">
              {canAccess("roblox_data_source_health") ? (
                <DataSourceHealthCard
                  title="Data Source & Health"
                  items={[
                    `The data is pulled from: ${dataSourceHealth.source}.`,
                    `API metadata is partial by nature; data capture coverage is ${dataSourceHealth.captureCoverage}%.`,
                    `Latest non-empty snapshot coverage: ${formatNumber(
                      dataSourceHealth.queriedToday
                    )} games${dataSourceHealth.snapshotDateLabel ? ` (${dataSourceHealth.snapshotDateLabel})` : ""}.`,
                  ]}
                  lastRunLabel={dataSourceHealth.lastRunLabel}
                  panel={panel}
                  accent={accent}
                />
              ) : (
                <LockedAccessCard itemKey="roblox_data_source_health" panel={panel} />
              )}

              {canAccess("roblox_top_games") ? (
                <ScoreboardCard
                  title="Top 5 Most Played Games"
                  subtitle="By current players"
                  items={topGameScoreboard.map((g) => ({
                    label: g.title,
                    value: formatNumber(g.latestPlayers),
                    href: g.url,
                  }))}
                  references={[
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
                  ]}
                  panel={panel}
                  accent={accent}
                />
              ) : (
                <LockedAccessCard itemKey="roblox_top_games" panel={panel} />
              )}

              {canAccess("roblox_trending_games") ? (
                <TrendingCard
                  title="Trending Games"
                  items={trendingHighlights}
                  panel={panel}
                  accent={accent}
                  platform={activePlatform}
                />
              ) : (
                <LockedAccessCard itemKey="roblox_trending_games" panel={panel} />
              )}
            </section>

            {canAccess("roblox_genre_mix") || canAccess("roblox_subgenre_mix") ? (
              <MostPlayedGenrePieRow
                data={mostPlayedClassificationPies}
                limit={mostPlayedMixLimit}
                onLimitChange={setMostPlayedMixLimit}
                panel={panel}
                accent={accent}
                showGenre={canAccess("roblox_genre_mix")}
                showSubgenre={canAccess("roblox_subgenre_mix")}
                showControls={
                  canAccessOption("roblox_genre_mix", "limit_25") ||
                  canAccessOption("roblox_genre_mix", "limit_50") ||
                  canAccessOption("roblox_subgenre_mix", "limit_25") ||
                  canAccessOption("roblox_subgenre_mix", "limit_50")
                }
                allowedLimits={[
                  canAccessOption("roblox_genre_mix", "limit_25") ||
                  canAccessOption("roblox_subgenre_mix", "limit_25")
                    ? 25
                    : null,
                  canAccessOption("roblox_genre_mix", "limit_50") ||
                  canAccessOption("roblox_subgenre_mix", "limit_50")
                    ? 50
                    : null,
                ].filter(Boolean)}
              />
            ) : (
              <section className="mb-6 grid gap-4 lg:grid-cols-2">
                <LockedAccessCard itemKey="roblox_genre_mix" panel={panel} />
                <LockedAccessCard itemKey="roblox_subgenre_mix" panel={panel} />
              </section>
            )}

            <section
              id="most-played-games-over-time"
              className="mb-6 grid scroll-mt-6 gap-6 lg:grid-cols-2"
            >
              {canAccess("roblox_games_trend") ? (
                <ChartCard
                  title="Most Played Games Over Time"
                  subtitle={`Top ${topGamesTrendLimit} experiences by current players, tracked across stored snapshot dates.`}
                  panel={panel}
                  action={
                    true ? (
                      <TrendControls
                        limit={topGamesTrendLimit}
                        rankBand={topGamesTrendBand}
                        onLimitChange={setTopGamesTrendLimit}
                        onRankBandChange={setTopGamesTrendBand}
                        accent={accent}
                        showLimit={true}
                        showRankBand={true}
                        allowedLimits={[
                          canAccessOption("roblox_games_trend", "limit_25") ? 25 : null,
                          canAccessOption("roblox_games_trend", "limit_50") ? 50 : null,
                        ].filter(Boolean)}
                      />
                    ) : null
                  }
                  footerAction={
                    (
                      <TimeWindowControls
                        timeWindow={effectiveTimeWindow("roblox_games_trend", topGamesTrendWindow)}
                        onTimeWindowChange={setTopGamesTrendWindow}
                        accent={accent}
                        allowedValues={allowedTimeWindows("roblox_games_trend")}
                      />
                    )
                  }
                >
                  <TopGamesTrend
                    games={topRobloxGames.slice(0, topGamesTrendLimit)}
                    rankBand={topGamesTrendBand}
                    timeWindow={effectiveTimeWindow("roblox_games_trend", topGamesTrendWindow)}
                  />
                </ChartCard>
              ) : (
                <LockedAccessCard itemKey="roblox_games_trend" panel={panel} />
              )}

              {canAccess("roblox_genres_trend") ? (
                <ChartCard
                  title="Most Played Genres Over Time"
                  subtitle="Genre-level player curves using stored Roblox snapshot dates."
                  panel={panel}
                  action={
                    true ? (
                      <GenreTrendControls
                        limit={genreTrendLimit}
                        onLimitChange={setGenreTrendLimit}
                        accent={accent}
                        allowedLimits={[
                          canAccessOption("roblox_genres_trend", "limit_3") ? 3 : null,
                          canAccessOption("roblox_genres_trend", "limit_10") ? 10 : null,
                        ].filter(Boolean)}
                      />
                    ) : null
                  }
                  footerAction={
                    (
                      <TimeWindowControls
                        timeWindow={effectiveTimeWindow("roblox_genres_trend", genreTrendWindow)}
                        onTimeWindowChange={setGenreTrendWindow}
                        accent={accent}
                        allowedValues={allowedTimeWindows("roblox_genres_trend")}
                      />
                    )
                  }
                >
                  <GenreLinesTrend
                    games={topRobloxGenreAnalysisGames}
                    limit={genreTrendLimit}
                    timeWindow={effectiveTimeWindow("roblox_genres_trend", genreTrendWindow)}
                  />
                </ChartCard>
              ) : (
                <LockedAccessCard itemKey="roblox_genres_trend" panel={panel} />
              )}
            </section>

            <section className="mb-6 grid gap-6 lg:grid-cols-3">
              {canAccess("roblox_keyword_cloud") ? (
	              <KeywordCloudCard
	                title="Top 25 Keyword Cloud"
	                subtitle="Common title and description signals across the top 25 experiences"
	                games={
                  activePlatform === "roblox"
                    ? topRobloxGames.slice(0, 25)
                    : topFortniteIslands.slice(0, 25)
                }
	                panel={panel}
	                accent={accent}
	              />
              ) : (
                <LockedAccessCard itemKey="roblox_keyword_cloud" panel={panel} />
              )}

              {canAccess("roblox_common_structure") ? (
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
              ) : (
                <LockedAccessCard itemKey="roblox_common_structure" panel={panel} />
              )}

              {canAccess("roblox_tile_colors") ? (
	              <ColorBreakdownCard
	                title="Top Tile Colors"
	                subtitle="Primary and secondary RGB colors across the top 25 experiences"
	                games={
                  activePlatform === "roblox"
                    ? topRobloxGames.slice(0, 25)
                    : topFortniteIslands.slice(0, 25)
                }
                panel={panel}
                accent={accent}
              />
              ) : (
                <LockedAccessCard itemKey="roblox_tile_colors" panel={panel} />
              )}
            </section>

            {canAccess("roblox_archetypes") ? (
              <section className="mb-6">
              <div className={`rounded-3xl border p-6 ${panel}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">Fictional Roblox Experience Archetypes</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Synthetic profiles built only from captured Roblox metrics and metadata in the selected window.
                    </p>
                  </div>
                  {
                    <TimeWindowControls
                      timeWindow={effectiveTimeWindow("roblox_archetypes", robloxArchetypeWindow)}
                      onTimeWindowChange={setRobloxArchetypeWindow}
                      accent={accent}
                      allowedValues={allowedTimeWindows("roblox_archetypes")}
                    />
                  }
                </div>

                <RobloxArchetypeRow
                  games={topRobloxGames}
                  timeWindow={effectiveTimeWindow("roblox_archetypes", robloxArchetypeWindow)}
                  panel={panel}
                  allowedKinds={{
                    median: canAccessOption("roblox_archetypes", "archetype_median"),
                    average: canAccessOption("roblox_archetypes", "archetype_average"),
                    unique: canAccessOption("roblox_archetypes", "archetype_unique"),
                  }}
                />
              </div>
              </section>
            ) : (
              <LockedAccessSection itemKey="roblox_archetypes" panel={panel} />
            )}

            {canAccess("roblox_template_generator") ? (
              <GameTemplateGeneratorRow
                items={topRobloxGames}
                platform="roblox"
                timeWindow={robloxArchetypeWindow}
                panel={panel}
                accent={accent}
                allowedTemplateOptions={{
                  mainstream: canAccessOption("roblox_template_generator", "template_mainstream"),
                  uncommon: canAccessOption("roblox_template_generator", "template_uncommon"),
                  top10: canAccessOption("roblox_template_generator", "template_source"),
                  reroll: canAccessOption("roblox_template_generator", "template_reroll"),
                }}
              />
            ) : (
              <LockedAccessSection itemKey="roblox_template_generator" panel={panel} />
            )}

            {canAccess("roblox_idea_card") ? (
              <section id="my-game-idea-is" className="mb-6 scroll-mt-6">
              <div className={`rounded-3xl border p-6 ${panel}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">My Game Idea Is</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Use this as a reflection tool to position your concept.
                    </p>
                  </div>
                  {
                    <TwoOptionTimeWindowControls
                      timeWindow={effectiveTimeWindow("roblox_idea_card", ideaTimeWindow)}
                      onTimeWindowChange={setIdeaTimeWindow}
                      accent={accent}
                      allowedValues={allowedTimeWindows("roblox_idea_card", false)}
                    />
                  }
                </div>

                <div className="mt-5 space-y-3">
                  <select
                    className="w-full rounded-xl border p-3 text-sm text-slate-800"
                    value={selectedGenre}
                    onChange={(e) => {
                      setSelectedGenre(e.target.value);
                      setSelectedSubgenre("");
                    }}
                  >
                    <option value="">
                      {activePlatform === "roblox" ? "Select Genre" : "Select Estimated Genre"}
                    </option>
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
                    <option value="">
                      {activePlatform === "roblox" ? "Select Subgenre" : "Select Estimated Subgenre"}
                    </option>
                    {subgenres.map((subgenre) => (
                      <option key={subgenre} value={subgenre}>
                        {subgenre}
                      </option>
                    ))}
                  </select>
                </div>

	                <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    <div className="grid gap-4 lg:grid-cols-[24rem_1fr] lg:items-stretch">
                      <IdeaSunburst
                        items={activeIdeaAnalysisItems}
                        platform={activePlatform}
                        selectedGenre={selectedGenre}
                        selectedSubgenre={selectedSubgenre}
                        accent={accent}
                      />
                      <IdeaPositionReadout
                        platform={activePlatform}
                        selectedGenre={selectedGenre}
                        selectedSubgenre={selectedSubgenre}
                        ideaPercent={ideaPercent}
                        totalPlayersInIdea={totalPlayersInIdea}
                        items={activeIdeaAnalysisItems}
                      />
                    </div>
                    <div className="mt-5 border-t border-slate-200 pt-4">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                        Source-confirmed similar games
                      </p>
                      {topSimilar.length ? (
                        <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                          <p className="sr-only">
                            Roblox suggestions use source-confirmed genre and subgenre matches.
                          </p>
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
                          {getIdeaSuggestionEmptyText(
                            activePlatform,
                            selectedGenre,
                            selectedSubgenre
                          )}
                        </p>
                      )}
                    </div>
	                </div>
	              </div>
              </section>
            ) : (
              <section id="my-game-idea-is" className="mb-6 scroll-mt-6">
                <LockedAccessCard itemKey="roblox_idea_card" panel={panel} />
              </section>
            )}

            {canAccess("roblox_research_cards") ? (
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
            ) : (
              <LockedAccessSection itemKey="roblox_research_cards" panel={panel} />
            )}

            {canAccess("roblox_correlation") ? (
              <section className="mb-6">
              <CorrelationAnalysisCard
                title="Metric Correlation Analysis"
                subtitle="Compare Roblox metrics by genre to see where engagement or player-pool signals concentrate."
                games={topRobloxGames}
                panel={panel}
                accent={accent}
                categoricalY
                enableTimeWindow
                defaultYMetricKey="genre"
              />
              </section>
            ) : (
              <LockedAccessSection itemKey="roblox_correlation" panel={panel} />
            )}

            {canAccess("roblox_directional_map") ? (
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
                  accent={accent}
                  allowedTimeWindowValues={allowedTimeWindows("roblox_directional_map", false)}
                />
              </div>
              </section>
            ) : (
              <LockedAccessSection itemKey="roblox_directional_map" panel={panel} />
            )}

            {canAccess("roblox_activity_landscape") ? (
              <section
                id="player-activity-landscape"
                className={`mb-6 scroll-mt-6 rounded-3xl border p-6 ${panel}`}
              >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">Player Activity Landscape</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Rectangle size reflects today&apos;s activity or the stored peak activity in the selected window. Color reflects stored player gain or loss.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  {
                    <LandscapeTimeWindowControls
                      timeWindow={activeLandscapeWindow}
                      onTimeWindowChange={setLandscapeTimeWindow}
                      accent={accent}
                      allowedValues={allowedLandscapeTimeWindows()}
                    />
                  }
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-400">
                    <span className="h-3 w-3 rounded-sm bg-[#f4a6a6]" />
                    Loss
                    <span className="h-3 w-3 rounded-sm bg-[#5b6472]" />
                    Flat
                    <span className="h-3 w-3 rounded-sm bg-[#a7e3b6]" />
                    Gain
                  </div>
                </div>
              </div>

              {activePlatform === "roblox" ? (
                <PlayerActivityLandscape games={landscapeRobloxGames.slice(0, 80)} />
              ) : (
                <Unavailable text="Player activity landscape requires current-player data, which is not available from the current Fortnite source." />
              )}
              </section>
            ) : (
              <section id="player-activity-landscape" className="mb-6 scroll-mt-6">
                <LockedAccessCard itemKey="roblox_activity_landscape" panel={panel} />
              </section>
            )}

            {canAccess("roblox_experience_cards") ? (
              <section className={`rounded-3xl border p-6 ${panel}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
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
                </div>
                {activePlatform === "roblox" &&
                  (canAccessOption("roblox_experience_cards", "view_cards") ||
                    canAccessOption("roblox_experience_cards", "view_list")) && (
                  <ToggleGroup>
                    <ToggleButton
                      active={robloxExperienceView === "cards"}
                      onClick={() => setRobloxExperienceView("cards")}
                      activeColor={accent}
                      disabled={!canAccessOption("roblox_experience_cards", "view_cards")}
                    >
                      Cards
                    </ToggleButton>
                    <ToggleButton
                      active={robloxExperienceView === "list"}
                      onClick={() => setRobloxExperienceView("list")}
                      activeColor={accent}
                      disabled={!canAccessOption("roblox_experience_cards", "view_list")}
                    >
                      List
                    </ToggleButton>
                  </ToggleGroup>
                )}
              </div>

              {activePlatform === "roblox" &&
              robloxExperienceView === "list" &&
              canAccessOption("roblox_experience_cards", "view_list") ? (
                <RobloxExperienceList
                  games={topRobloxGames.slice(0, 25)}
                  panel={panel}
                />
              ) : (
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
              )}
              </section>
            ) : (
              <LockedAccessSection itemKey="roblox_experience_cards" panel={panel} />
            )}

            {canAccess("roblox_forecasting_inputs") ? (
	            <PredictionMarketSignalsCard
	              panel={panel}
	              accent={accent}
	              search={predictionSearch}
	              onSearchChange={setPredictionSearch}
	              target={predictionTarget}
	              signals={predictionSignals}
	              platform={activePlatform}
                showSearch={canAccessOption("roblox_forecasting_inputs", "search")}
	            />
            ) : (
              <LockedAccessSection itemKey="roblox_forecasting_inputs" panel={panel} />
            )}
	          </>
        ) : (
          <FortniteDashboardView context={dashboardContext} />
        )}

        <footer className="mt-12 min-h-20 border-t border-slate-200 pt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
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
              {userTier === "admin" && (
                <button
                  type="button"
                  onClick={() => setShowAdminPanel(true)}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-emerald-700 transition hover:bg-emerald-100"
                >
                  Admin access
                </button>
              )}
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <p className="text-xs font-semibold text-slate-400">
                SnoutBoard is a trademark product of Forgotten Diamond Software, LLC.
              </p>
              <p className="rounded-full bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-400">
                v0.01
              </p>
            </div>
          </div>
          <div className="mt-8 flex justify-center">
            <p className="max-w-4xl text-center text-xs font-semibold leading-5 text-slate-400">
              Snoutboard is independent and is not affiliated with, endorsed by,
              sponsored by, certified by, approved by, or operated by Roblox,
              Epic Games, Fortnite, or any related platform owner.
            </p>
          </div>
        </footer>
        {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
        {showGlossary && <GlossaryModal onClose={() => setShowGlossary(false)} />}
        {showAdminPanel && userTier === "admin" && (
          <AdminAccessModal
            settings={tierVisibility}
            onChange={setTierVisibility}
            onClose={() => setShowAdminPanel(false)}
          />
        )}
      </div>
    </main>
  );
}

function FortniteDashboardView({ context }: any) {
  const {
    activePlatform,
    activeItems,
    activeIdeaAnalysisItems,
    dataSourceHealth,
    panel,
    accent,
    topFortniteIslands,
    fortniteIslands,
    trendingHighlights,
    topGamesTrendLimit,
    topGamesTrendBand,
    topGamesTrendWindow,
    setTopGamesTrendLimit,
    setTopGamesTrendBand,
    setTopGamesTrendWindow,
    genreTrendLimit,
    genreTrendPercentile,
    genreTrendWindow,
    ideaTimeWindow,
    setIdeaTimeWindow,
    setGenreTrendLimit,
    setGenreTrendPercentile,
    setGenreTrendWindow,
    fortniteLabelTrendLimit,
    fortniteLifecycleLimit,
    fortniteLabelTrendWindow,
    fortniteGenreScoreboardWindow,
    fortniteArchetypeWindow,
    setFortniteLabelTrendLimit,
    setFortniteLifecycleLimit,
    setFortniteLabelTrendWindow,
    setFortniteGenreScoreboardWindow,
    setFortniteArchetypeWindow,
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
    canAccess,
    canAccessOption,
    effectiveTimeWindow,
    allowedTimeWindows,
  } = context;
  const currentTopFortniteIslands = getFortniteIslandsBySnapshotRank(
    fortniteIslands,
    0
  );

  return (
    <>
      <section className="mb-6 grid gap-4 lg:grid-cols-4">
        {canAccess("fortnite_data_source_health") ? (
          <DataSourceHealthCard
            title="Data Source & Health"
            items={[
              `The data is pulled from: ${dataSourceHealth.source}.`,
              `API metadata is partial by nature; data capture coverage is ${dataSourceHealth.captureCoverage}%.`,
              `Latest non-empty snapshot coverage: ${formatNumber(
                dataSourceHealth.queriedToday
              )} islands${dataSourceHealth.snapshotDateLabel ? ` (${dataSourceHealth.snapshotDateLabel})` : ""}.`,
            ]}
            lastRunLabel={dataSourceHealth.lastRunLabel}
            panel={panel}
            accent={accent}
          />
        ) : (
          <LockedAccessCard itemKey="fortnite_data_source_health" panel={panel} />
        )}

        {SHOW_ARCHIVED_FORTNITE_VISIBILITY_WIDGETS && (
          <ScoreboardCard
            title="Imported Fortnite Islands"
            subtitle="Latest imported source collection"
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
        )}

        {canAccess("fortnite_genre_mix") ? (
          <GenreShareCard
          title="Estimated Genre Mix"
          subtitle={`By imported island appearances across ${getTrendWindowLabel(fortniteGenreScoreboardWindow)}`}
          items={buildFortniteCategoryScoreboard(
            fortniteIslands,
            "inferred_genre",
            fortniteGenreScoreboardWindow
          )}
          footerAction={
            (
              <TimeWindowControls
                timeWindow={effectiveTimeWindow("fortnite_genre_mix", fortniteGenreScoreboardWindow)}
                onTimeWindowChange={setFortniteGenreScoreboardWindow}
                accent={accent}
                allowedValues={allowedTimeWindows("fortnite_genre_mix")}
              />
            )
          }
          panel={panel}
          accent={accent}
          />
        ) : (
          <LockedAccessCard itemKey="fortnite_genre_mix" panel={panel} />
        )}

        {canAccess("fortnite_subgenre_mix") ? (
          <GenreShareCard
          title="Estimated Subgenre Mix"
          subtitle={`By imported island appearances across ${getTrendWindowLabel(fortniteGenreScoreboardWindow)}`}
          items={buildFortniteCategoryScoreboard(
            fortniteIslands,
            "inferred_subgenre",
            fortniteGenreScoreboardWindow
          )}
          footerAction={
            (
              <TimeWindowControls
                timeWindow={effectiveTimeWindow("fortnite_subgenre_mix", fortniteGenreScoreboardWindow)}
                onTimeWindowChange={setFortniteGenreScoreboardWindow}
                accent={accent}
                allowedValues={allowedTimeWindows("fortnite_subgenre_mix")}
              />
            )
          }
          panel={panel}
          accent={accent}
          />
        ) : (
          <LockedAccessCard itemKey="fortnite_subgenre_mix" panel={panel} />
        )}

        {canAccess("fortnite_primary_labels") ? (
          <FortniteLabelRankingsCard
            title="Primary Label Usage"
            subtitle="First surfaced label across imported islands"
            items={buildFortniteLabelRankings(fortniteIslands)}
            panel={panel}
            accent={accent}
          />
        ) : (
          <LockedAccessCard itemKey="fortnite_primary_labels" panel={panel} />
        )}
      </section>

      {canAccess("fortnite_label_trend") ? (
        <section id="primary-label-usage-over-time" className="mb-6 scroll-mt-6">
        <ChartCard
          title="Primary Label Usage Over Time"
          subtitle={`${fortniteLabelTrendLimit} first-surfaced labels by island usage across stored snapshots.`}
          panel={panel}
          action={
            true ? (
              <FortniteLabelTrendControls
                limit={fortniteLabelTrendLimit}
                onLimitChange={setFortniteLabelTrendLimit}
                accent={accent}
                allowedLimits={[
                  canAccessOption("fortnite_label_trend", "limit_10") ? 10 : null,
                  canAccessOption("fortnite_label_trend", "limit_25") ? 25 : null,
                ].filter(Boolean)}
              />
            ) : null
          }
          footerAction={
            (
              <TimeWindowControls
                timeWindow={effectiveTimeWindow("fortnite_label_trend", fortniteLabelTrendWindow)}
                onTimeWindowChange={setFortniteLabelTrendWindow}
                accent={accent}
                allowedValues={allowedTimeWindows("fortnite_label_trend")}
              />
            )
          }
        >
          <FortniteLabelUsageTrend
            islands={fortniteIslands}
            limit={fortniteLabelTrendLimit}
            timeWindow={effectiveTimeWindow("fortnite_label_trend", fortniteLabelTrendWindow)}
          />
        </ChartCard>
        </section>
      ) : (
        <LockedAccessSection itemKey="fortnite_label_trend" panel={panel} />
      )}

      {SHOW_ARCHIVED_FORTNITE_VISIBILITY_WIDGETS && (
        <section className="mb-6">
          <ChartCard
            title="Most Captured Islands"
            subtitle="Islands with the most captured days in the imported source collection."
            panel={panel}
            contentClassName="min-h-[30rem]"
          >
            <FortniteFeaturedIslandsBar
              islands={fortniteIslands}
              limit={25}
              accent={accent}
            />
          </ChartCard>
        </section>
      )}

      {canAccess("fortnite_genre_presence") ? (
        <section className="mb-6">
        <ChartCard
          title="Estimated Genre / Format Presence Over Time"
          subtitle="Count of tracked islands by estimated Fortnite genre or format."
          panel={panel}
          footerAction={
            (
              <TimeWindowControls
                timeWindow={effectiveTimeWindow("fortnite_genre_presence", genreTrendWindow)}
                onTimeWindowChange={setGenreTrendWindow}
                accent={accent}
                allowedValues={allowedTimeWindows("fortnite_genre_presence")}
              />
            )
          }
        >
          <FortniteGenrePresenceTrend
            islands={fortniteIslands}
            timeWindow={effectiveTimeWindow("fortnite_genre_presence", genreTrendWindow)}
          />
        </ChartCard>
        </section>
      ) : (
        <LockedAccessSection itemKey="fortnite_genre_presence" panel={panel} />
      )}

      {SHOW_ARCHIVED_FORTNITE_VISIBILITY_WIDGETS && (
        <section className="mb-6">
          <ChartCard
            title="New vs Returning Islands"
            subtitle={`Newest and longest-standing islands in the ${fortniteLifecycleLimit}-item source collection.`}
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
      )}

      <section className="mb-6 grid gap-6 lg:grid-cols-3">
        {canAccess("fortnite_keyword_cloud") ? (
          <KeywordCloudCard
            title="Fortnite Island Keyword Cloud"
            subtitle="Common title and label signals across the latest imported island collection"
            games={buildFortniteKeywordSignalItems(topFortniteIslands.slice(0, 25))}
            panel={panel}
            accent={accent}
            combinedCloud={true}
          />
        ) : (
          <LockedAccessCard itemKey="fortnite_keyword_cloud" panel={panel} />
        )}

        {canAccess("fortnite_ip_signals") ? (
          <FortniteIpSignalsCard
            title="IP / Collaboration Signals"
            subtitle="Primary labels and description cues in the latest substantial island collection"
            islands={getFortniteIslandsByLatestSubstantialSnapshot(fortniteIslands)}
            panel={panel}
            accent={accent}
          />
        ) : (
          <LockedAccessCard itemKey="fortnite_ip_signals" panel={panel} />
        )}

        {canAccess("fortnite_tile_colors") ? (
          <ColorBreakdownCard
            title="Island Tile Colors"
            subtitle="Primary and secondary RGB colors from the latest imported island collection"
            games={currentTopFortniteIslands.slice(0, 25)}
            panel={panel}
            accent={accent}
          />
        ) : (
          <LockedAccessCard itemKey="fortnite_tile_colors" panel={panel} />
        )}
      </section>

      {canAccess("fortnite_archetypes") ? (
        <section className="mb-6">
        <div className={`rounded-3xl border p-6 ${panel}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Fictional Island Archetypes</h2>
              <p className="mt-1 text-sm text-slate-500">
                Synthetic profiles built only from Fortnite source metadata and estimated fields derived from that metadata.
              </p>
            </div>
            {
              <TimeWindowControls
                timeWindow={effectiveTimeWindow("fortnite_archetypes", fortniteArchetypeWindow)}
                onTimeWindowChange={setFortniteArchetypeWindow}
                accent={accent}
                allowedValues={allowedTimeWindows("fortnite_archetypes")}
              />
            }
          </div>

          <FortniteArchetypeRow
            islands={fortniteIslands}
            timeWindow={effectiveTimeWindow("fortnite_archetypes", fortniteArchetypeWindow)}
            panel={panel}
          />
        </div>
        </section>
      ) : (
        <LockedAccessSection itemKey="fortnite_archetypes" panel={panel} />
      )}

      {canAccess("fortnite_template_generator") ? (
        <GameTemplateGeneratorRow
          items={fortniteIslands}
          platform="fortnite"
          timeWindow={fortniteArchetypeWindow}
          panel={panel}
          accent={accent}
          allowedTemplateOptions={{
            mainstream: canAccessOption("fortnite_template_generator", "template_mainstream"),
            uncommon: canAccessOption("fortnite_template_generator", "template_uncommon"),
            top10: canAccessOption("fortnite_template_generator", "template_source"),
            reroll: canAccessOption("fortnite_template_generator", "template_reroll"),
          }}
        />
      ) : (
        <LockedAccessSection itemKey="fortnite_template_generator" panel={panel} />
      )}

      {SHOW_ARCHIVED_FORTNITE_VISIBILITY_WIDGETS && (
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
      )}

      {canAccess("fortnite_idea_card") ? (
        <section id="my-fortnite-island-idea-is" className="mb-6 scroll-mt-6">
        <div className={`rounded-3xl border p-6 ${panel}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">My Fortnite Island Idea Is</h2>
              <p className="mt-1 text-sm text-slate-500">
                Use this as a reflection tool to position your island concept.
              </p>
            </div>
            {
              <TwoOptionTimeWindowControls
                timeWindow={effectiveTimeWindow("fortnite_idea_card", ideaTimeWindow)}
                onTimeWindowChange={setIdeaTimeWindow}
                accent={accent}
                allowedValues={allowedTimeWindows("fortnite_idea_card", false)}
              />
            }
          </div>

          <div className="mt-5 space-y-3">
            <select
              className="w-full rounded-xl border p-3 text-sm text-slate-800"
              value={selectedGenre}
              onChange={(event) => {
                setSelectedGenre(event.target.value);
                setSelectedSubgenre("");
              }}
            >
              <option value="">Select Estimated Genre</option>
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
              <option value="">Select Estimated Subgenre</option>
              {subgenres.map((subgenre: string) => (
                <option key={subgenre} value={subgenre}>
                  {subgenre}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            <div className="grid gap-4 lg:grid-cols-[24rem_1fr] lg:items-stretch">
              <IdeaSunburst
                items={activeIdeaAnalysisItems}
                platform={activePlatform}
                selectedGenre={selectedGenre}
                selectedSubgenre={selectedSubgenre}
                accent={accent}
              />
              <IdeaPositionReadout
                platform={activePlatform}
                selectedGenre={selectedGenre}
                selectedSubgenre={selectedSubgenre}
                ideaPercent={ideaPercent}
                totalPlayersInIdea={0}
                items={activeIdeaAnalysisItems}
              />
            </div>
            {topSimilar.length ? (
              <div className="mt-5 border-t border-slate-200 pt-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Similar imported islands
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
            ) : (
              <p className="mt-5 border-t border-slate-200 pt-4 text-sm text-slate-500">
                {getIdeaSuggestionEmptyText(
                  activePlatform,
                  selectedGenre,
                  selectedSubgenre
                )}
              </p>
            )}
          </div>
        </div>
        </section>
      ) : (
        <section id="my-fortnite-island-idea-is" className="mb-6 scroll-mt-6">
          <LockedAccessCard itemKey="fortnite_idea_card" panel={panel} />
        </section>
      )}

      {canAccess("fortnite_research_cards") ? (
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
            "Fortnite signals use source-provided activity fields when available; missing fields should be treated as coverage gaps.",
            "Use this as informational market intelligence, not as business advice or a prediction of creator outcome.",
          ]}
        />
        </section>
      ) : (
        <LockedAccessSection itemKey="fortnite_research_cards" panel={panel} />
      )}

      {canAccess("fortnite_directional_map") ? (
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
            accent={accent}
            allowedTimeWindowValues={allowedTimeWindows("fortnite_directional_map", false)}
          />
        </div>
        </section>
      ) : (
        <LockedAccessSection itemKey="fortnite_directional_map" panel={panel} />
      )}

      {canAccess("fortnite_island_cards") ? (
        <section id="latest-imported-fortnite-islands" className={`scroll-mt-6 rounded-3xl border p-6 ${panel}`}>
        <h2 className="text-2xl font-bold">Latest Imported Fortnite Islands</h2>
        <p className="mt-1 text-sm text-slate-500">
          Metadata cards from the latest imported source collection.
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
      ) : (
        <section id="latest-imported-fortnite-islands" className="scroll-mt-6">
          <LockedAccessCard itemKey="fortnite_island_cards" panel={panel} />
        </section>
      )}

      {canAccess("fortnite_forecasting_inputs") ? (
      <PredictionMarketSignalsCard
        panel={panel}
        accent={accent}
        search={predictionSearch}
        onSearchChange={setPredictionSearch}
        target={predictionTarget}
        signals={predictionSignals}
        platform={activePlatform}
        showSearch={canAccessOption("fortnite_forecasting_inputs", "search")}
      />
      ) : (
        <LockedAccessSection itemKey="fortnite_forecasting_inputs" panel={panel} />
      )}
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

  return "Source metrics pending";
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
  const sevenDayHighlights = buildPeriodTrendingHighlights(items, 7);
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
      secondSubline: `Past 7 days: ${sevenDayHighlights.playerGain?.title ?? "placeholder"}`,
    },
    {
      label: "Most position gain",
      title: rankGain?.rankGain ? rankGain.title : "placeholder",
      metric: rankGain?.rankGain ? `+${rankGain.rankGain} spots` : "N/A",
      direction: "up",
      href: rankGain?.url,
      subline: `Yesterday: ${yesterdayHighlights.rankGain?.title ?? "placeholder"}`,
      secondSubline: `Past 7 days: ${sevenDayHighlights.rankGain?.title ?? "placeholder"}`,
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
      secondSubline: `Past 7 days: ${sevenDayHighlights.playerLoss?.title ?? "placeholder"}`,
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

function buildPeriodTrendingHighlights(games: any[], days: number) {
  const latestKey = getLatestSnapshotDateKey(games);
  const latestDate = parseDateKey(latestKey);
  const startDate = latestDate ? new Date(latestDate) : null;

  if (!latestDate || !startDate) {
    return { playerGain: null, rankGain: null, playerLoss: null };
  }

  startDate.setUTCDate(startDate.getUTCDate() - days + 1);

  const periodRows = games
    .map((game) => {
      const snapshots = [...(game.snapshots ?? [])]
        .filter((snapshot: any) => snapshot.created_at)
        .sort(
          (a: any, b: any) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      const latestSnapshot = snapshots
        .filter((snapshot: any) => {
          const dateKey = getSnapshotDateKey(snapshot.created_at);
          return dateKey && dateKey <= latestKey;
        })
        .at(-1);
      const startSnapshot =
        snapshots.find((snapshot: any) => {
          const dateKey = getSnapshotDateKey(snapshot.created_at);
          const snapshotDate = parseDateKey(dateKey);
          return snapshotDate && snapshotDate >= startDate && snapshotDate <= latestDate;
        }) ?? snapshots[0];

      if (!latestSnapshot || !startSnapshot || latestSnapshot === startSnapshot) {
        return null;
      }

      const playerDeltaPercent =
        startSnapshot.current_players && latestSnapshot.current_players
          ? ((latestSnapshot.current_players - startSnapshot.current_players) /
              Math.max(startSnapshot.current_players, 1)) *
            100
          : 0;
      const rankGain =
        startSnapshot.chart_rank && latestSnapshot.chart_rank
          ? startSnapshot.chart_rank - latestSnapshot.chart_rank
          : 0;

      return {
        title: game.title,
        playerDeltaPercent,
        rankGain,
      };
    })
    .filter(Boolean);

  return {
    playerGain: [...periodRows].sort(
      (a: any, b: any) => b.playerDeltaPercent - a.playerDeltaPercent
    )[0],
    rankGain: [...periodRows].sort(
      (a: any, b: any) => b.rankGain - a.rankGain
    )[0],
    playerLoss: [...periodRows].sort(
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

function buildRobloxMostPlayedClassificationPies(games: any[], limit = 25) {
  const scopedGames = games.slice(0, limit);
  const genreMap: Record<string, number> = {};
  const subgenreMap: Record<string, number> = {};
  let estimatedRecords = 0;
  let pendingRecords = 0;
  let totalPlayers = 0;

  scopedGames.forEach((game) => {
    const players = game.latestPlayers ?? 0;
    const genre = getDisplayGenre(game, "roblox");
    const subgenre = getDisplaySubgenre(game, "roblox");
    const confidence = getClassificationConfidence(game, "roblox");

    genreMap[genre] = (genreMap[genre] ?? 0) + players;
    subgenreMap[subgenre] = (subgenreMap[subgenre] ?? 0) + players;
    totalPlayers += players;

    if (confidence === "estimated") estimatedRecords += 1;
    if (confidence === "pending") pendingRecords += 1;
  });

  return {
    genres: toPieRows(genreMap, totalPlayers),
    subgenres: toPieRows(subgenreMap, totalPlayers),
    recordCount: scopedGames.length,
    totalPlayers,
    estimatedRecords,
    pendingRecords,
  };
}

function toPieRows(map: Record<string, number>, total: number) {
  return Object.entries(map)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([name, value]) => ({
      name,
      value,
      share: total ? Math.round((value / total) * 100) : 0,
    }));
}

function buildFortniteCategoryScoreboard(
  islands: any[],
  field: "inferred_genre" | "inferred_subgenre",
  timeWindow: TrendTimeWindow = "7d"
) {
  const map: Record<string, { label: string; count: number }> = {};
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
    const label = island[field] ?? (field === "inferred_subgenre" ? "General" : "Other");
    const seenDateKeys = new Set<string>();

    if (!map[label]) {
      map[label] = { label, count: 0 };
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

      if (!dateKey || !inWindow || seenDateKeys.has(dateKey)) {
        return;
      }

      seenDateKeys.add(dateKey);
      map[label].count += 1;
      total += 1;
    });
  });

  if (!total) {
    islands.forEach((island) => {
      const label = island[field] ?? (field === "inferred_subgenre" ? "General" : "Other");

      if (!map[label]) {
        map[label] = { label, count: 0 };
      }

      map[label].count += 1;
      total += 1;
    });
  }

  return Object.values(map)
    .filter((item) => item.count > 0)
    .map((item) => ({
      label: item.label,
      value: `${formatNumber(item.count)} appearances`,
      rawValue: item.count,
      share: total ? Math.round((item.count / total) * 100) : 0,
    }))
    .sort((a, b) => b.rawValue - a.rawValue)
    .slice(0, 3);
}

function buildFortniteGenreScoreboard(islands: any[]) {
  return buildFortniteCategoryScoreboard(islands, "inferred_genre", "7d");
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

function buildFortniteKeywordSignalItems(islands: any[]) {
  return islands.map((island) => ({
    ...island,
    description: getFortniteGameplayLabels(island).join(" "),
  }));
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

  const latestCoverage = getLatestNonEmptySnapshotCoverage(platform, items);
  const queriedToday = latestCoverage.count || items.length;

  const captureCoverage = calculateDataCaptureCoverage(platform, items);
  const genreEligibleCount = getGenreAnalysisItems(items, platform).length;

  return {
    totalRecords: items.length,
    queriedToday,
    snapshotDateLabel: latestCoverage.dateKey
      ? formatShortDate(`${latestCoverage.dateKey}T00:00:00.000Z`)
      : "",
    source,
    captureCoverage,
    genreEligibleCount,
    genreExcludedCount: Math.max(0, items.length - genreEligibleCount),
    lastRunLabel: formatUtcTimestamp(
      auditSnapshot?.created_at ?? getLatestSourceTimestamp(platform, items)
    ),
  };
}

function getLatestNonEmptySnapshotCoverage(platform: Platform, items: any[]) {
  const countsByDate = new Map<string, Set<string>>();

  items.forEach((item, index) => {
    const itemKey = String(
      platform === "roblox"
        ? item.id ?? item.game_id ?? item.universe_id ?? index
        : item.id ?? item.island_code ?? index
    );
    const snapshots = item.snapshots ?? [];

    snapshots.forEach((snapshot: any) => {
      const dateKey = getDateKey(snapshot.snapshot_date ?? snapshot.created_at);
      if (!dateKey) return;
      if (!countsByDate.has(dateKey)) countsByDate.set(dateKey, new Set());
      countsByDate.get(dateKey)?.add(itemKey);
    });
  });

  const latest = [...countsByDate.entries()]
    .map(([dateKey, itemKeys]) => ({ dateKey, count: itemKeys.size }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))[0];

  return latest ?? { dateKey: "", count: 0 };
}

function calculateDataCaptureCoverage(platform: Platform, items: any[]) {
  if (!items.length) return 0;

  const expectedFields =
    platform === "roblox" ? getRobloxCaptureFieldChecks() : getFortniteCaptureFieldChecks();
  const totalExpectedFields = items.length * expectedFields.length;
  const capturedFields = items.reduce((total, item) => {
    return (
      total +
      expectedFields.filter((field) => field.isCaptured(item)).length
    );
  }, 0);

  return Math.round((capturedFields / Math.max(1, totalExpectedFields)) * 100);
}

function getRobloxCaptureFieldChecks() {
  return [
    { key: "id", isCaptured: (item: any) => hasUsableValue(item.id) },
    { key: "title", isCaptured: (item: any) => hasUsableValue(item.title) },
    { key: "url", isCaptured: (item: any) => hasUsableValue(item.url) },
    {
      key: "thumbnail_url",
      isCaptured: (item: any) => hasUsableValue(item.thumbnail_url),
    },
    {
      key: "description",
      isCaptured: (item: any) => hasUsableValue(item.description),
    },
    {
      key: "source_or_estimated_genre",
      isCaptured: (item: any) =>
        hasUsableValue(item.genre) || hasUsableValue(item.inferred_genre),
    },
    {
      key: "source_or_estimated_subgenre",
      isCaptured: (item: any) => hasUsableValue(item.inferred_subgenre),
    },
    {
      key: "core_loop",
      isCaptured: (item: any) => hasUsableValue(item.core_loop),
    },
    {
      key: "tags",
      isCaptured: (item: any) => hasUsableArray(item.extracted_tags),
    },
    {
      key: "chart_snapshot",
      isCaptured: (item: any) => hasUsableArray(item.snapshots),
    },
    {
      key: "snapshot_date",
      isCaptured: (item: any) =>
        (item.snapshots ?? []).some((snapshot: any) =>
          hasUsableValue(snapshot.created_at)
        ),
    },
    {
      key: "current_players",
      isCaptured: (item: any) =>
        typeof item.latestPlayers === "number" && item.latestPlayers > 0,
    },
    {
      key: "source_rank_or_sort",
      isCaptured: (item: any) =>
        hasUsableValue(item.latestRank) || hasUsableValue(item.latestSort),
    },
    {
      key: "engagement_metric",
      isCaptured: (item: any) =>
        hasUsableValue(item.visits) ||
        hasUsableValue(item.favorites) ||
        hasUsableValue(item.upVotes) ||
        hasUsableValue(item.likeRatio),
    },
  ];
}

function getFortniteCaptureFieldChecks() {
  return [
    {
      key: "island_code",
      isCaptured: (item: any) => hasUsableValue(item.island_code),
    },
    { key: "title", isCaptured: (item: any) => hasUsableValue(item.title) },
    { key: "url", isCaptured: (item: any) => hasUsableValue(item.url) },
    {
      key: "thumbnail_url",
      isCaptured: (item: any) => hasUsableValue(item.thumbnail_url),
    },
    {
      key: "description",
      isCaptured: (item: any) => hasUsableValue(item.description),
    },
    {
      key: "labels",
      isCaptured: (item: any) => hasUsableArray(item.extracted_tags),
    },
    {
      key: "raw_payload",
      isCaptured: (item: any) =>
        hasUsableObject(item.raw_latest) || hasUsableObject(item.raw),
    },
    {
      key: "snapshot",
      isCaptured: (item: any) => hasUsableArray(item.snapshots),
    },
    {
      key: "snapshot_date",
      isCaptured: (item: any) =>
        (item.snapshots ?? []).some((snapshot: any) =>
          hasUsableValue(snapshot.created_at)
        ),
    },
    {
      key: "source_order_or_rank",
      isCaptured: (item: any) =>
        (item.snapshots ?? []).some(
          (snapshot: any) =>
            hasUsableValue(snapshot.source_order) ||
            hasUsableValue(snapshot.rank)
        ),
    },
    {
      key: "estimated_genre",
      isCaptured: (item: any) => hasUsableValue(item.inferred_genre),
    },
    {
      key: "estimated_subgenre",
      isCaptured: (item: any) => hasUsableValue(item.inferred_subgenre),
    },
    {
      key: "estimated_core_loop",
      isCaptured: (item: any) => hasUsableValue(item.core_loop),
    },
    {
      key: "estimated_player_intent",
      isCaptured: (item: any) => hasUsableValue(item.player_intent),
    },
  ];
}

function hasUsableValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") {
    return Boolean(value.trim()) && !/^unknown|general|n\/a|null$/i.test(value.trim());
  }
  return Boolean(value);
}

function hasUsableArray(value: unknown) {
  return Array.isArray(value) && value.some((item) => hasUsableValue(item));
}

function hasUsableObject(value: unknown) {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length
  );
}

function getGenreAnalysisItems(items: any[], platform: Platform) {
  if (platform !== "roblox") return items;

  return items.filter((item) => getClassificationConfidence(item, platform) !== "pending");
}

function getClassificationConfidence(item: any, platform: Platform) {
  if (platform !== "roblox") return "medium";

  const sourceGenre = getRobloxSourceGenre(item);
  const sourceSubgenre = getRobloxSourceSubgenre(item);
  const hasEstimatedGenre =
    Boolean(cleanClassificationLabel(item.inferred_genre));
  const hasEstimatedSubgenre =
    Boolean(cleanClassificationLabel(item.inferred_subgenre));

  if (sourceGenre || sourceSubgenre) return "source";
  if (hasEstimatedGenre && hasEstimatedSubgenre) return "estimated";
  return "pending";
}

function getRobloxSourceGenre(item: any) {
  return pickCleanClassificationLabel(
    item.raw_game_details?.page_taxonomy?.genre,
    item.raw_game_details?.genre,
    item.raw_game_details?.genreName,
    item.raw_game_details?.genre_l1,
    item.raw_game_details?.genreL1,
    item.genre
  );
}

function getRobloxSourceSubgenre(item: any) {
  return pickCleanClassificationLabel(
    item.raw_game_details?.page_taxonomy?.subgenre,
    item.raw_game_details?.subgenre,
    item.raw_game_details?.subGenre,
    item.raw_game_details?.subgenreName,
    item.raw_game_details?.genre_l2,
    item.raw_game_details?.genreL2
  );
}

function getDisplayGenre(item: any, platform: Platform) {
  if (getClassificationConfidence(item, platform) === "pending") {
    return "Classification pending";
  }

  if (platform === "roblox") {
    return refineRobloxDisplayTaxonomy(item).genre;
  }

  return cleanClassificationLabel(item.inferred_genre) ?? "Other";
}

function getDisplaySubgenre(item: any, platform: Platform) {
  if (getClassificationConfidence(item, platform) === "pending") {
    return "Classification pending";
  }

  if (platform === "roblox") {
    return refineRobloxDisplayTaxonomy(item).subgenre;
  }

  return cleanClassificationLabel(item.inferred_subgenre) ?? "General";
}

function cleanClassificationLabel(value: unknown) {
  if (typeof value !== "string") return null;

  const text = value.trim();
  return text && !/^(all|all genres|classification pending|general|n\/a|none|other|unknown)$/i.test(text)
    ? text
    : null;
}

function pickCleanClassificationLabel(...values: unknown[]) {
  for (const value of values) {
    const label = cleanClassificationLabel(value);
    if (label) return label;
  }

  return null;
}

function refineRobloxDisplayTaxonomy(item: any) {
  const sourceGenre = getRobloxSourceGenre(item);
  const sourceSubgenre = getRobloxSourceSubgenre(item);
  const baseGenre = cleanClassificationLabel(item.inferred_genre);
  const baseSubgenre = cleanClassificationLabel(item.inferred_subgenre);
  const text = `${item.title ?? ""} ${item.description ?? ""}`.toLowerCase();
  const refined = getObviousRobloxTaxonomy(text);

  return {
    genre: sourceGenre ?? baseGenre ?? refined?.genre ?? "Classification pending",
    subgenre: sourceSubgenre ?? baseSubgenre ?? refined?.subgenre ?? "Classification pending",
  };
}

function getObviousRobloxTaxonomy(text: string) {
  if (/\b(adopt me|pet care|raise.*pet|care.*pet|pet shop|pets?|baby|family)\b/.test(text)) {
    return { genre: "Roleplay & Avatar Sim", subgenre: "Pet Care" };
  }
  if (/\b(dress up|avatar|outfit|fashion|makeover|catalog|ugc outfit|dress to impress)\b/.test(text)) {
    return { genre: "Roleplay & Avatar Sim", subgenre: "Dress Up" };
  }
  if (/\b(roleplay|role play|rp|life|city|town|brookhaven|bloxburg|school|hospital|police|jobs?|house|home|apartment)\b/.test(text)) {
    return { genre: "Roleplay & Avatar Sim", subgenre: "Life" };
  }
  if (/\b(blue lock|chigiri|soccer|football|basketball|baseball|tennis|golf|sports|volleyball|hockey)\b/.test(text)) {
    return { genre: "Sports & Racing", subgenre: "Sports" };
  }
  if (/\b(race|racing|drive|driving|car|cars|vehicle|bike|motorcycle|drift|speed|kart)\b/.test(text)) {
    return { genre: "Sports & Racing", subgenre: "Racing" };
  }
  if (/\b(anime|manga|naruto|one piece|dragon ball|titan|demon slayer|jujutsu|bleach|pokemon|pokémon|shinobi|ninja|saiyan|blox fruit)\b/.test(text)) {
    return { genre: "RPG", subgenre: "Action RPG" };
  }
  if (/\b(gun|guns|shooter|shoot|fps|sniper|laser|weapon|weapons|rivals)\b/.test(text)) {
    return { genre: "Shooter", subgenre: "Deathmatch Shooter" };
  }
  if (/\b(fight|fighting|battle|battleground|pvp|duel|arena|sword|combat|war|military|boxing|boss fight)\b/.test(text)) {
    return { genre: "Action", subgenre: "Battlegrounds & Fighting" };
  }
  if (/\b(survive|survival|hide|killer|escape|hunt|horror|scary|monster|zombie|ghost|nightmare|doors|murder|mystery|infected|infection|forest)\b/.test(text)) {
    return { genre: "Survival", subgenre: /\bescape\b/.test(text) ? "Escape" : "1 vs All" };
  }
  if (/\b(obby|parkour|obstacle|tower of|climb|jump|platformer|floor is lava)\b/.test(text)) {
    return { genre: "Obby & Platformer", subgenre: /\b(tower of|climb)\b/.test(text) ? "Tower Obby" : "Classic Obby" };
  }
  if (/\b(guess|quiz|trivia|puzzle|word|tiles|mahjong|memory|answer|brain|logic)\b/.test(text)) {
    return /\b(quiz|trivia)\b/.test(text)
      ? { genre: "Party & Casual", subgenre: "Quiz" }
      : { genre: "Puzzle", subgenre: "Word" };
  }
  if (/\b(party|minigame|mini game|mini-game|rounds|round-based|quick game|challenge|challenges)\b/.test(text)) {
    return { genre: "Party & Casual", subgenre: "Minigame" };
  }
  if (/\b(fish|fishing|angler|aquarium|catch fish|catching fish|fisch)\b/.test(text)) {
    return { genre: "Simulation", subgenre: "Fishing / Collection" };
  }
  if (/\b(rng|spin|roll|luck|random|crate|case opening|gacha|summon|draw)\b/.test(text)) {
    return { genre: "Simulation", subgenre: "RNG / Collection" };
  }

  return null;
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

function getDateKey(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
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

function MostPlayedGenrePieRow({
  data,
  limit,
  onLimitChange,
  panel,
  accent,
  showControls = true,
  allowedLimits,
  showGenre = true,
  showSubgenre = true,
}: any) {
  const colors = [accent, "#d6a06d", "#5b5d78", "#94a3b8", "#cbd5e1"];
  const note =
    data.estimatedRecords || data.pendingRecords
      ? `Genres are often missing from the source API and therefore estimated when needed. ${formatNumber(
          data.estimatedRecords
        )} of ${formatNumber(data.recordCount)} records use estimated classification.`
      : "Genres are often missing from the source API and therefore estimated when needed.";

  return (
    <section className="mb-6 grid gap-4 lg:grid-cols-2">
      {showGenre ? (
        <MostPlayedClassificationPieCard
          title="Most Played Genre Mix Estimated"
          subtitle={`Player-weighted genre share across the current Top ${limit} most played Roblox experiences.`}
          note={note}
          panel={panel}
          action={
            showControls ? (
            <MostPlayedMixControls
              limit={limit}
              onLimitChange={onLimitChange}
              accent={accent}
              allowedLimits={allowedLimits}
            />
            ) : null
          }
        >
          <ClassificationPie
            title="Genre"
            rows={data.genres}
            colors={colors}
            emptyText="No genre data available."
          />
        </MostPlayedClassificationPieCard>
      ) : (
        <LockedAccessCard itemKey="roblox_genre_mix" panel={panel} />
      )}

      {showSubgenre ? (
        <MostPlayedClassificationPieCard
          title="Most Played Subgenre Mix Estimated"
          subtitle={`Player-weighted subgenre share across the current Top ${limit} most played Roblox experiences.`}
          note={note}
          panel={panel}
          action={
            showControls ? (
            <MostPlayedMixControls
              limit={limit}
              onLimitChange={onLimitChange}
              accent={accent}
              allowedLimits={allowedLimits}
            />
            ) : null
          }
        >
          <ClassificationPie
            title="Subgenre"
            rows={data.subgenres}
            colors={colors}
            emptyText="No subgenre data available."
          />
        </MostPlayedClassificationPieCard>
      ) : (
        <LockedAccessCard itemKey="roblox_subgenre_mix" panel={panel} />
      )}
    </section>
  );
}

function MostPlayedMixControls({ limit, onLimitChange, accent, allowedLimits }: any) {
  const limits = allowedLimits ?? [25, 50];
  return (
    <ToggleGroup>
      {[25, 50].map((value: number) => (
        <ToggleButton
          key={value}
          active={limit === value}
          onClick={() => onLimitChange(value)}
          activeColor={accent}
          disabled={!limits.includes(value)}
        >
          Top {value}
        </ToggleButton>
      ))}
    </ToggleGroup>
  );
}

function MostPlayedClassificationPieCard({ title, subtitle, note, panel, action, children }: any) {
  return (
    <div className={`rounded-3xl border p-5 ${panel}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
      <p className="mt-4 rounded-2xl bg-slate-50 px-3 py-2 text-[11px] font-semibold leading-5 text-slate-500">
        {note}
      </p>
    </div>
  );
}

function ClassificationPie({ title, rows, colors, emptyText }: any) {
  if (!rows.length) {
    return (
      <div className="rounded-2xl bg-slate-50 p-3">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
          {title}
        </p>
        <p className="mt-3 text-sm text-slate-500">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
        {title}
      </p>
      <div className="mt-2 grid grid-cols-[104px_1fr] items-center gap-3">
        <PieChart width={104} height={104}>
          <Pie
            data={rows}
            dataKey="value"
            nameKey="name"
            innerRadius={32}
            outerRadius={50}
            paddingAngle={2}
          >
            {rows.map((_: any, index: number) => (
              <Cell key={index} fill={colors[index % colors.length]} />
            ))}
          </Pie>
        </PieChart>

        <div className="min-w-0 space-y-1.5">
          {rows.map((row: any, index: number) => (
            <div key={row.name} className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 flex-none rounded-full"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-600">
                {row.name}
              </span>
              <span className="flex-none text-xs font-black text-slate-500">
                {row.share}%
              </span>
            </div>
          ))}
        </div>
      </div>
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
            of {islands.length} imported islands
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
                {item.secondSubline && (
                  <p className="mt-0.5 text-xs font-medium leading-snug text-slate-400">
                    {item.secondSubline}
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
  rankBand,
  onLimitChange,
  onRankBandChange,
  accent,
  showLimit = true,
  showRankBand = true,
  allowedLimits,
}: any) {
  const limits = allowedLimits ?? [25, 50];
  const rankBands: Array<{ value: TrendRankBand; label: string }> = [
    { value: "top", label: "Top 10" },
    { value: "mid", label: "Mid 10" },
    { value: "bottom", label: "Bottom 10" },
  ];
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {showLimit && (
        <ToggleGroup>
          {[25, 50].map((value: number) => (
            <ToggleButton
              key={value}
              active={limit === value}
              onClick={() => onLimitChange(value)}
              activeColor={accent}
              disabled={!limits.includes(value)}
            >
              Top {value}
            </ToggleButton>
          ))}
        </ToggleGroup>
      )}
      {showRankBand && (
        <ToggleGroup>
          {rankBands.map(({ value, label }) => (
            <ToggleButton
              key={value}
              active={rankBand === value}
              onClick={() => onRankBandChange(value)}
              activeColor={accent}
            >
              {label}
            </ToggleButton>
          ))}
        </ToggleGroup>
      )}
    </div>
  );
}

function GenreTrendControls({ limit, onLimitChange, accent, allowedLimits }: any) {
  const limits = allowedLimits ?? [3, 10];
  return (
    <ToggleGroup>
      {[3, 10].map((value: number) => (
        <ToggleButton
          key={value}
          active={limit === value}
          onClick={() => onLimitChange(value)}
          activeColor={accent}
          disabled={!limits.includes(value)}
        >
          Top {value}
        </ToggleButton>
      ))}
    </ToggleGroup>
  );
}

function TimeWindowControls({ timeWindow, onTimeWindowChange, accent, allowedValues }: any) {
  const allowed = allowedValues ?? ["7d", "30d", "3m"];
  return (
    <ToggleGroup>
      {[
        ["7d", "7D"],
        ["30d", "Month"],
        ["3m", "3M"],
      ]
        .map(([value, label]) => (
          <ToggleButton
            key={value}
            active={timeWindow === value}
            onClick={() => onTimeWindowChange(value)}
            activeColor={accent}
            disabled={!allowed.includes(value)}
          >
            {label}
          </ToggleButton>
        ))}
    </ToggleGroup>
  );
}

function TwoOptionTimeWindowControls({ timeWindow, onTimeWindowChange, accent, allowedValues }: any) {
  const allowed = allowedValues ?? ["7d", "30d"];
  return (
    <ToggleGroup>
      {[
        ["7d", "7D"],
        ["30d", "Month"],
      ]
        .map(([value, label]) => (
          <ToggleButton
            key={value}
            active={timeWindow === value}
            onClick={() => onTimeWindowChange(value)}
            activeColor={accent}
            disabled={!allowed.includes(value)}
          >
            {label}
          </ToggleButton>
        ))}
    </ToggleGroup>
  );
}

function LandscapeTimeWindowControls({ timeWindow, onTimeWindowChange, accent, allowedValues }: any) {
  const allowed = allowedValues ?? ["today", "7d", "30d"];
  return (
    <ToggleGroup>
      {[
        ["today", "Today"],
        ["7d", "7D"],
        ["30d", "Month"],
      ].map(([value, label]) => (
        <ToggleButton
          key={value}
          active={timeWindow === value}
          onClick={() => onTimeWindowChange(value)}
          activeColor={accent}
          disabled={!allowed.includes(value)}
        >
          {label}
        </ToggleButton>
      ))}
    </ToggleGroup>
  );
}

function FortniteLabelTrendControls({ limit, onLimitChange, accent, allowedLimits }: any) {
  const limits = allowedLimits ?? [10, 25];
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <ToggleGroup>
        {[10, 25].map((value: number) => (
          <ToggleButton
            key={value}
            active={limit === value}
            onClick={() => onLimitChange(value)}
            activeColor={accent}
            disabled={!limits.includes(value)}
          >
            {value} labels
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
  panel,
  accent,
  combinedCloud = false,
}: any) {
  const selectedGames = games;
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
  panel,
  accent,
}: any) {
  const [colors, setColors] = useState<any[]>([]);
  const [colorPage, setColorPage] = useState(0);
  const selectedGames = games;
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
  }, [games]);

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

function IdeaSunburst({
  items,
  platform,
  selectedGenre,
  selectedSubgenre,
  accent,
}: any) {
  const data = buildIdeaSunburstData(items, platform, selectedGenre, selectedSubgenre);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
            Dataset position
          </p>
          <p className="mt-1 text-xs font-bold leading-4 text-slate-500">
            Inner ring: genre share. Outer ring: selected genre split by subgenre.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">
          {formatNumber(items.length)}
        </span>
      </div>

      <div className="mt-4 flex justify-center">
        <svg viewBox="0 0 180 180" className="h-48 w-48">
          <circle cx="90" cy="90" r="64" fill="#f1f5f9" />
          {data.genreSegments.map((segment: any) => (
            <path
              key={segment.key}
              d={describeDonutSegment(90, 90, 38, 66, segment.start, segment.end)}
              fill={segment.selected ? accent : segment.color}
              opacity={segment.selected ? 1 : 0.58}
              stroke="#ffffff"
              strokeWidth="2"
            >
              <title>
                {segment.label}: {segment.percent}% of imported records
              </title>
            </path>
          ))}
          {data.subgenreSegments.map((segment: any) => (
            <path
              key={segment.key}
              d={describeDonutSegment(90, 90, 70, 84, segment.start, segment.end)}
              fill={segment.selected ? accent : segment.color}
              opacity={segment.selected ? 0.95 : 0.42}
              stroke="#ffffff"
              strokeWidth="2"
            >
              <title>
                {segment.label}: {segment.percent}% of {selectedGenre}
              </title>
            </path>
          ))}
          <circle cx="90" cy="90" r="30" fill="white" />
          <text
            x="90"
            y="86"
            textAnchor="middle"
            className="fill-slate-700 text-[13px] font-black"
          >
            {data.selectedGenrePercent}%
          </text>
          <text
            x="90"
            y="101"
            textAnchor="middle"
            className="fill-slate-400 text-[8px] font-bold uppercase"
          >
            Genre
          </text>
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {data.legend.map((item: any) => (
          <span
            key={item.label}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function IdeaPositionReadout({
  platform,
  selectedGenre,
  selectedSubgenre,
  ideaPercent,
  totalPlayersInIdea,
  items,
}: any) {
  const data = buildIdeaSunburstData(items, platform, selectedGenre, selectedSubgenre);
  const noun = platform === "roblox" ? "experiences" : "islands";
  const selectedGenreItems = selectedGenre
    ? items.filter((item: any) => getDisplayGenre(item, platform) === selectedGenre)
    : items;
  const selectedSubgenreItems =
    selectedGenre && selectedSubgenre
      ? selectedGenreItems.filter(
          (item: any) => getDisplaySubgenre(item, platform) === selectedSubgenre
        )
      : selectedGenreItems;
  const segmentItems = selectedSubgenre ? selectedSubgenreItems : selectedGenreItems;
  const totalPlayers = items.reduce(
    (sum: number, item: any) => sum + (item.latestPlayers ?? 0),
    0
  );
  const segmentPlayers =
    platform === "roblox"
      ? segmentItems.reduce(
          (sum: number, item: any) => sum + (item.latestPlayers ?? 0),
          0
        )
      : totalPlayersInIdea;
  const playerShare =
    platform === "roblox" && totalPlayers
      ? Math.round((segmentPlayers / Math.max(1, totalPlayers)) * 100)
      : 0;
  const topExample = [...segmentItems].sort(
    (a: any, b: any) => (b.latestPlayers ?? 0) - (a.latestPlayers ?? 0)
  )[0];
  const averageGain = getAverageMetric(
    segmentItems
      .map((item: any) => item.averagePlayerGain7Days)
      .filter((value: any) => typeof value === "number")
  );
  const subgenreEntries = selectedGenre
    ? countEntries(
        selectedGenreItems.map(
          (item: any) => getDisplaySubgenre(item, platform) || "Unclassified"
        )
      ).filter((entry) => !/classification pending|unclassified/i.test(entry.label))
    : [];
  const dominantSubgenre = subgenreEntries[0];
  const dominantSubgenreShare =
    dominantSubgenre && selectedGenreItems.length
      ? Math.round((dominantSubgenre.count / selectedGenreItems.length) * 100)
      : 0;
  const estimatedClassifications = segmentItems.filter(
    (item: any) => getClassificationConfidence(item, platform) === "estimated"
  ).length;
  const estimatedShare = segmentItems.length
    ? Math.round((estimatedClassifications / segmentItems.length) * 100)
    : 0;
  const sourceConfirmedMatches =
    platform === "roblox" && selectedGenre
      ? getSourceConfirmedIdeaMatches(items, selectedGenre, selectedSubgenre).length
      : 0;
  const averageGainText =
    averageGain == null
      ? "movement is not available yet"
      : `${averageGain > 0 ? "+" : ""}${formatNumber(Math.round(averageGain))} players/day average movement`;

  return (
    <div className="rounded-2xl border border-[#9fc7e4] bg-[#e8f2fa] p-4 text-sm leading-6 text-slate-700">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
        Readout
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>
          This segment represents <strong>{formatNumber(segmentItems.length)}</strong>{" "}
          {noun} ({ideaPercent}% of the selected window)
          {platform === "roblox"
            ? ` and ${formatNumber(segmentPlayers)} tracked players (${playerShare}% of the player pool).`
            : "."}
        </li>
        {platform === "roblox" ? (
          <li>
            Comparable high-activity example:{" "}
            <strong>{topExample?.title ?? "not enough matching data yet"}</strong>
            {topExample
              ? `, with ${formatNumber(topExample.latestPlayers)} players and ${averageGainText}.`
              : "."}
          </li>
        ) : (
          <li>
            This represents <strong>{formatNumber(data.selectedGenreCount)}</strong> imported islands in the selected genre.
          </li>
        )}
      </ul>
      <div className="mt-4 space-y-2 border-t border-[#9fc7e4] pt-3 text-xs font-semibold text-slate-600">
        <p>
          {selectedGenre
            ? `${selectedGenre} is ${data.selectedGenrePercent}% of the dataset.`
            : "Select a genre to highlight its place in the dataset."}
        </p>
        <p>
          {selectedGenre && selectedSubgenre
            ? `${selectedSubgenre} is ${data.selectedSubgenrePercent}% of ${selectedGenre}.`
            : selectedGenre
              ? "Select a subgenre to highlight the outer ring."
              : "The outer ring appears after a genre is selected."}
        </p>
        {selectedGenre && (
          <p>
            Subgenre depth: {subgenreEntries.length || 0} detected under {selectedGenre}
            {dominantSubgenre
              ? `; ${dominantSubgenre.label} currently covers ${dominantSubgenreShare}% of that genre.`
              : ". More source taxonomy is needed before this genre can be broken down cleanly."}
          </p>
        )}
        {platform === "roblox" && segmentItems.length > 0 && (
          <p>
            Classification note: {sourceConfirmedMatches} source-confirmed matches; {estimatedShare}% of this segment uses estimated taxonomy.
          </p>
        )}
      </div>
    </div>
  );
}

function getSourceConfirmedIdeaMatches(
  items: any[],
  selectedGenre: string,
  selectedSubgenre: string
) {
  return items.filter((item) => {
    const sourceGenre = getRobloxSourceGenre(item);
    const sourceSubgenre = getRobloxSourceSubgenre(item);
    const genreMatch = sourceGenre === selectedGenre;
    const subgenreMatch = selectedSubgenre
      ? sourceSubgenre === selectedSubgenre
      : true;

    return genreMatch && subgenreMatch;
  });
}

function buildIdeaSuggestions(
  items: any[],
  platform: Platform,
  selectedGenre: string,
  selectedSubgenre: string
) {
  if (!selectedGenre) return [];

  if (platform === "roblox") {
    return getSourceConfirmedIdeaMatches(items, selectedGenre, selectedSubgenre)
      .sort(compareIdeaSuggestionStrength)
      .slice(0, 5);
  }

  return items
    .filter((item) => {
      const genreMatch = getDisplayGenre(item, platform) === selectedGenre;
      const subgenreMatch = selectedSubgenre
        ? getDisplaySubgenre(item, platform) === selectedSubgenre
        : true;
      return genreMatch && subgenreMatch;
    })
    .sort(compareIdeaSuggestionStrength)
    .slice(0, 5);
}

function compareIdeaSuggestionStrength(a: any, b: any) {
  return (
    (b.latestPlayers ?? 0) - (a.latestPlayers ?? 0) ||
    (b.periodHigh ?? 0) - (a.periodHigh ?? 0) ||
    String(a.title ?? "").localeCompare(String(b.title ?? ""))
  );
}

function getIdeaSuggestionEmptyText(
  platform: Platform,
  selectedGenre: string,
  selectedSubgenre: string
) {
  if (!selectedGenre) return "Select a genre to populate suggestions.";

  if (platform === "roblox") {
    const label = selectedSubgenre
      ? `${selectedGenre} / ${selectedSubgenre}`
      : selectedGenre;
    return `Not enough source-confirmed Roblox examples for ${label} in this window. Try the Month view or a broader genre.`;
  }

  return "Not enough matching imported islands in this window.";
}

function buildIdeaSunburstData(
  items: any[],
  platform: Platform,
  selectedGenre: string,
  selectedSubgenre: string
) {
  const colors = ["#0d69ac", "#33a3a9", "#7c3aed", "#16a34a", "#f59e0b", "#ef4444", "#64748b"];
  const total = Math.max(items.length, 1);
  const genreEntries = countEntries(
    items.map((item) => getDisplayGenre(item, platform) || "Unclassified")
  );
  const visibleGenres = keepTopEntriesWithSelection(genreEntries, selectedGenre, 7);
  const genreSegments = createSunburstSegments(visibleGenres, 0, 360, colors).map(
    (segment: any) => ({
      ...segment,
      selected: segment.label === selectedGenre,
      percent: Math.round((segment.count / total) * 100),
    })
  );
  const selectedGenreSegment =
    genreSegments.find((segment: any) => segment.label === selectedGenre) ??
    genreSegments[0] ?? { start: 0, end: 360, count: 0 };
  const selectedGenreItems = selectedGenre
    ? items.filter((item) => getDisplayGenre(item, platform) === selectedGenre)
    : [];
  const subgenreEntries = countEntries(
    selectedGenreItems.map((item) => getDisplaySubgenre(item, platform) || "Unclassified")
  );
  const visibleSubgenres = keepTopEntriesWithSelection(subgenreEntries, selectedSubgenre, 6);
  const subgenreSegments = selectedGenre
    ? createSunburstSegments(
        visibleSubgenres,
        selectedGenreSegment.start,
        selectedGenreSegment.end,
        colors
      ).map((segment: any) => ({
        ...segment,
        selected: segment.label === selectedSubgenre,
        percent: selectedGenreItems.length
          ? Math.round((segment.count / selectedGenreItems.length) * 100)
          : 0,
      }))
    : [];
  const selectedSubgenreCount = selectedSubgenre
    ? selectedGenreItems.filter(
        (item) => getDisplaySubgenre(item, platform) === selectedSubgenre
      ).length
    : 0;

  return {
    genreSegments,
    subgenreSegments,
    selectedGenreCount: selectedGenreItems.length,
    selectedGenrePercent: selectedGenre
      ? Math.round((selectedGenreItems.length / total) * 100)
      : 0,
    selectedSubgenrePercent:
      selectedGenre && selectedSubgenre && selectedGenreItems.length
        ? Math.round((selectedSubgenreCount / selectedGenreItems.length) * 100)
        : 0,
    legend: [
      ...genreSegments
        .filter((segment: any) => segment.selected)
        .map((segment: any) => ({ label: "Selected genre", color: segment.color })),
      ...subgenreSegments
        .filter((segment: any) => segment.selected)
        .map((segment: any) => ({ label: "Selected subgenre", color: segment.color })),
    ],
  };
}

function countEntries(values: string[]) {
  const counts = values.reduce((map: Record<string, number>, value) => {
    map[value] = (map[value] ?? 0) + 1;
    return map;
  }, {});

  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function getAverageMetric(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function keepTopEntriesWithSelection(entries: any[], selected: string, limit: number) {
  const top = entries.slice(0, limit);
  const selectedEntry = selected
    ? entries.find((entry) => entry.label === selected)
    : null;
  const merged = selectedEntry && !top.some((entry) => entry.label === selected)
    ? [...top.slice(0, Math.max(limit - 1, 0)), selectedEntry]
    : top;
  const represented = new Set(merged.map((entry) => entry.label));
  const otherCount = entries
    .filter((entry) => !represented.has(entry.label))
    .reduce((sum, entry) => sum + entry.count, 0);

  return otherCount > 0 ? [...merged, { label: "Other", count: otherCount }] : merged;
}

function createSunburstSegments(entries: any[], startAngle: number, endAngle: number, colors: string[]) {
  const total = entries.reduce((sum, entry) => sum + entry.count, 0);
  const span = endAngle - startAngle;
  let cursor = startAngle;

  if (!total) return [];

  return entries.map((entry, index) => {
    const segmentSpan = (entry.count / total) * span;
    const segment = {
      ...entry,
      key: `${entry.label}-${index}`,
      start: cursor,
      end: Math.min(cursor + segmentSpan, endAngle - 0.01),
      color: colors[index % colors.length],
    };
    cursor += segmentSpan;
    return segment;
  });
}

function describeDonutSegment(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
) {
  const outerStart = polarToCartesian(cx, cy, outerRadius, endAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M",
    outerStart.x,
    outerStart.y,
    "A",
    outerRadius,
    outerRadius,
    0,
    largeArcFlag,
    0,
    outerEnd.x,
    outerEnd.y,
    "L",
    innerStart.x,
    innerStart.y,
    "A",
    innerRadius,
    innerRadius,
    0,
    largeArcFlag,
    1,
    innerEnd.x,
    innerEnd.y,
    "Z",
  ].join(" ");
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function BlockHeatMap({
  items,
  selectedGenre,
  selectedSubgenre,
  platform,
  panel,
  accent,
  allowedTimeWindowValues,
}: any) {
  const [timeWindow, setTimeWindow] = useState<"7d" | "30d">("7d");
  const effectiveWindow = allowedTimeWindowValues?.includes(timeWindow)
    ? timeWindow
    : "7d";
  const filteredItems =
    platform === "roblox"
      ? buildCorrelationWindowGames(items, effectiveWindow)
      : getFortniteIslandsInWindow(items, effectiveWindow);
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
          {platform === "roblox" ? "Roblox records" : "imported Fortnite islands"} from the{" "}
          {getTrendWindowLabel(effectiveWindow)}.
        </p>
        {
          <TwoOptionTimeWindowControls
            timeWindow={effectiveWindow}
            onTimeWindowChange={setTimeWindow}
            accent={accent}
            allowedValues={allowedTimeWindowValues}
          />
        }
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
          platform={platform}
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

function buildGenreCorrelationMetricOptions(games: any[]) {
  const genres = Array.from(
    new Set(
      games
        .map((game) => sanitizeClassificationLabel(getDisplayGenre(game, "roblox"), ""))
        .filter(Boolean)
    )
  ).sort();

  return genres.map((genre) => ({
    key: `genre:${genre}`,
    label: genre,
    genreLabel: genre,
    binaryGenre: true,
    categories: [`Not ${genre}`, genre],
    value: (game: any) =>
      sanitizeClassificationLabel(getDisplayGenre(game, "roblox"), "") === genre
        ? 1
        : 0,
    format: (value: number) => (value ? genre : `Not ${genre}`),
  }));
}

function buildCorrelationWindowGames(games: any[], windowKey: "today" | "7d" | "30d") {
  const latestDateKey = getLatestSnapshotDateKey(games);
  const latestDate = parseDateKey(latestDateKey);
  const startDate = latestDate ? new Date(latestDate) : null;
  const windowDays = windowKey === "today" ? 1 : windowKey === "7d" ? 7 : 30;

  if (!latestDate || !startDate) return games;

  startDate.setUTCDate(startDate.getUTCDate() - windowDays + 1);

  return games
    .map((game) => {
      const snapshots = (game.snapshots ?? []).filter((snapshot: any) => {
        const dateKey = getSnapshotDateKey(snapshot.created_at);
        const snapshotDate = parseDateKey(dateKey);
        return snapshotDate && snapshotDate >= startDate && snapshotDate <= latestDate;
      });
      const metrics = (game.game_metrics ?? []).filter((metric: any) => {
        const metricDate = parseDateKey(String(metric.date ?? "").slice(0, 10));
        return metricDate && metricDate >= startDate && metricDate <= latestDate;
      });
      const sortedSnapshots = [...snapshots].sort(
        (a: any, b: any) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const sortedMetrics = [...metrics].sort(
        (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const earliest = sortedSnapshots[0];
      const latest = sortedSnapshots.at(-1);
      const bestRankSnapshot = sortedSnapshots
        .filter((snapshot: any) => snapshot.chart_rank)
        .sort((a: any, b: any) => (a.chart_rank ?? 9999) - (b.chart_rank ?? 9999))[0];
      const latestMetric = sortedMetrics.at(-1);
      const latestEngagementMetric =
        [...sortedMetrics]
          .reverse()
          .find(
            (metric: any) =>
              typeof metric.visits === "number" ||
              typeof metric.favorites === "number" ||
              typeof metric.up_votes === "number" ||
              typeof metric.like_ratio === "number"
          ) ?? latestMetric;
      const elapsedDays =
        earliest && latest
          ? Math.max(
              1,
              (new Date(latest.created_at).getTime() -
                new Date(earliest.created_at).getTime()) /
                86400000
            )
          : 1;
      const playerGain =
        earliest?.current_players && latest?.current_players
          ? ((latest.current_players - earliest.current_players) /
              Math.max(earliest.current_players, 1)) *
            100
          : 0;

      return {
        ...game,
        snapshots: sortedSnapshots,
        latestPlayers: latest?.current_players ?? null,
        playerGainPercent: playerGain,
        periodHigh: Math.max(
          ...sortedSnapshots.map((snapshot: any) => snapshot.current_players ?? 0),
          0
        ),
        latestRank: latest?.chart_rank ?? null,
        latestSort: latest?.sort_name ?? null,
        bestRank: bestRankSnapshot?.chart_rank ?? null,
        bestRankSort: bestRankSnapshot?.sort_name ?? null,
        averagePlayerGain7Days:
          earliest && latest
            ? Math.round(
                ((latest.current_players ?? 0) - (earliest.current_players ?? 0)) /
                  elapsedDays
              )
            : null,
        visits: latestEngagementMetric?.visits ?? null,
        favorites: latestEngagementMetric?.favorites ?? null,
        upVotes: latestEngagementMetric?.up_votes ?? null,
        downVotes: latestEngagementMetric?.down_votes ?? null,
        likeRatio: latestEngagementMetric?.like_ratio ?? null,
      };
    })
    .filter((game) => (game.snapshots ?? []).length);
}

function buildLandscapeWindowGames(
  games: any[],
  windowKey: LandscapeTimeWindow
) {
  return buildCorrelationWindowGames(games, windowKey)
    .map((game: any) => {
      const windowActivity =
        windowKey === "today"
          ? game.latestPlayers ?? 0
          : Math.max(game.periodHigh ?? 0, game.latestPlayers ?? 0);

      return {
        ...game,
        landscapePlayers: windowActivity,
      };
    })
    .filter((game: any) => (game.landscapePlayers ?? 0) > 0)
    .sort(
      (a: any, b: any) =>
        (b.landscapePlayers ?? 0) - (a.landscapePlayers ?? 0)
    );
}

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
    label: "Estimated core loop reach",
    value: (island: any) => island.coreLoopReach,
    format: formatNumber,
  },
  {
    key: "genreFormatReach",
    label: "Estimated genre / format reach",
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
    label: "Captured source-set days",
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
  categoricalY = false,
  enableTimeWindow = false,
}: any) {
  const [xMetricKey, setXMetricKey] = useState(defaultXMetricKey);
  const [yMetricKey, setYMetricKey] = useState(defaultYMetricKey);
  const [correlationWindow, setCorrelationWindow] =
    useState<"7d" | "30d">("7d");
  const scopedGames = useMemo(
    () =>
      enableTimeWindow
        ? buildCorrelationWindowGames(games, correlationWindow)
        : games,
    [games, correlationWindow, enableTimeWindow]
  );
  const xMetric =
    metrics.find((metric: any) => metric.key === xMetricKey) ?? metrics[0];
  const yMetrics = useMemo(
    () => (categoricalY ? buildGenreCorrelationMetricOptions(scopedGames) : metrics),
    [categoricalY, scopedGames, metrics]
  );
  const yMetric =
    yMetrics.find((metric: any) => metric.key === yMetricKey) ?? yMetrics[0];
  useEffect(() => {
    if (yMetrics.length && !yMetrics.some((metric: any) => metric.key === yMetricKey)) {
      setYMetricKey(yMetrics[0].key);
    }
  }, [yMetrics, yMetricKey]);
  const analysis = useMemo(
    () => buildCorrelationAnalysis(scopedGames, xMetric, yMetric),
    [scopedGames, xMetric, yMetric, categoricalY]
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

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
            Axes
          </p>
          {enableTimeWindow ? (
            <ToggleGroup>
              {[
                ["7d", "7D"],
                ["30d", "Month"],
              ].map(([value, label]) => (
                <ToggleButton
                  key={value}
                  active={correlationWindow === value}
                  onClick={() => setCorrelationWindow(value as "7d" | "30d")}
                  activeColor={accent}
                >
                  {label}
                </ToggleButton>
              ))}
            </ToggleGroup>
          ) : null}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
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
            metrics={yMetrics}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <div className="rounded-2xl bg-slate-50 p-2">
          <CorrelationScatterPlot
            analysis={analysis}
            xMetric={xMetric}
            yMetric={yMetric}
            lineColor={lineColor}
            accent={accent}
            categoricalY={categoricalY}
          />
        </div>

        <CorrelationReadout
          analysis={analysis}
          xMetric={xMetric}
          yMetric={yMetric}
          lineColor={lineColor}
          caveat={caveat}
          categoricalY={categoricalY}
        />
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
  categoricalY = false,
}: any) {
  if (analysis.points.length < 3) {
    return (
      <Unavailable text="Not enough complete rows for this metric pair yet." />
    );
  }

  if (categoricalY && yMetric.binaryGenre) {
    return (
      <BinaryGenreComparisonPlot
        analysis={analysis}
        xMetric={xMetric}
        yMetric={yMetric}
        accent={accent}
      />
    );
  }

  const width = 640;
  const height = 520;
  const margin = { top: 18, right: 24, bottom: 24, left: categoricalY ? 116 : 58 };
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
  const yCategoryScale = (value: number) =>
    analysis.yCategories?.length > 1
      ? margin.top +
        plotHeight -
        (value / Math.max(analysis.yCategories.length - 1, 1)) * plotHeight
      : margin.top + plotHeight / 2;
  const yPointPosition = (point: any) => {
    if (!categoricalY) return yScale(point.y);

    const base = yCategoryScale(point.y);
    const jitter = getStablePointJitter(point.id ?? point.title, plotHeight * 0.055);
    return Math.max(margin.top + 8, Math.min(margin.top + plotHeight - 8, base + jitter));
  };
  const lineStart = {
    x: xScale(analysis.xMin),
    y: yScale(analysis.slope * analysis.xMin + analysis.intercept),
  };
  const lineEnd = {
    x: xScale(analysis.xMax),
    y: yScale(analysis.slope * analysis.xMax + analysis.intercept),
  };

  return (
    <div className="mx-auto flex aspect-square w-full max-w-[38rem] flex-col">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-h-0 flex-1 overflow-hidden"
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

        {(!categoricalY || yMetric.binaryGenre) && (
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
        )}

        {analysis.points.map((point: any) => (
          <circle
            key={point.id}
            cx={xScale(point.x)}
            cy={yPointPosition(point)}
            r="5"
            fill={accent}
            opacity="0.62"
          >
            <title>
              {point.title}: {xMetric.label} {xMetric.format(point.x)},{" "}
              {yMetric.label} {point.yLabel ?? yMetric.format(point.y)}
            </title>
          </circle>
        ))}

        {categoricalY &&
          analysis.yCategories?.map((category: string, index: number) => (
            <text
              key={category}
              x={margin.left - 10}
              y={yCategoryScale(index) + 4}
              textAnchor="end"
              className="fill-slate-500 text-[11px] font-bold"
            >
              {truncateAxisLabel(category)}
            </text>
          ))}
      </svg>
      <div className="mt-2 grid gap-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
        <p>X-axis: {xMetric.label}</p>
        <p>Y-axis: {categoricalY ? yMetric.label : yMetric.label}</p>
      </div>
    </div>
  );
}

function truncateAxisLabel(value: string) {
  return value.length > 22 ? `${value.slice(0, 19)}...` : value;
}

function BinaryGenreComparisonPlot({ analysis, xMetric, yMetric, accent }: any) {
  const inValues = analysis.inGroupValues ?? [];
  const outValues = analysis.outGroupValues ?? [];
  const allValues = [...inValues, ...outValues];
  const minValue = Math.min(...allValues, 0);
  const maxValue = Math.max(...allValues, 1);
  const selectedLabel = yMetric.label;
  const otherLabel = `Not ${yMetric.label}`;
  const selectedMean = analysis.inGroupMean ?? 0;
  const otherMean = analysis.outGroupMean ?? 0;
  const difference =
    otherMean > 0 ? Math.round(((selectedMean - otherMean) / otherMean) * 100) : null;
  const comparisonColor =
    difference == null ? "#64748b" : difference >= 0 ? "#16a34a" : "#ef4444";
  const maxAbsMean = Math.max(Math.abs(selectedMean), Math.abs(otherMean), 1);

  return (
    <div className="mx-auto grid aspect-square w-full max-w-[38rem] grid-rows-[auto_1fr_auto] gap-3">
      <div className="rounded-2xl bg-white/70 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
              Bar comparison
            </p>
            <p className="mt-1 text-xs font-bold text-slate-500">
              Metric: {xMetric.label} · Groups: {selectedLabel} vs other genres
            </p>
          </div>
        </div>
        <div className="mt-3 space-y-3">
          {[
            {
              label: selectedLabel,
              values: inValues,
              mean: selectedMean,
              color: accent,
            },
            {
              label: otherLabel,
              values: outValues,
              mean: otherMean,
              color: "#94a3b8",
            },
          ].map((group) => (
            <div key={group.label} className="grid grid-cols-[7rem_1fr_4rem] items-center gap-3">
              <p className="truncate text-xs font-black text-slate-700">
                {group.label}
              </p>
              <div className="h-4 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(4, (Math.abs(group.mean) / maxAbsMean) * 100)}%`,
                    backgroundColor: group.color,
                  }}
                />
              </div>
              <p className="text-right text-xs font-black text-slate-600">
                {xMetric.format(group.mean)} avg
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-xs font-black uppercase tracking-wide text-slate-500">
          {difference == null
            ? "Difference pending"
            : `${selectedLabel} ${difference >= 0 ? "+" : ""}${difference}% vs other genres`}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          {
            label: selectedLabel,
            values: inValues,
            mean: selectedMean,
            color: accent,
          },
          {
            label: otherLabel,
            values: outValues,
            mean: otherMean,
            color: "#94a3b8",
          },
        ].map((group) => (
          <JitteredGroupPanel
            key={group.label}
            group={group}
            minValue={minValue}
            maxValue={maxValue}
            xMetric={xMetric}
            lineColor={comparisonColor}
          />
        ))}
      </div>

      <div className="rounded-2xl bg-white/70 p-4">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
          Box plot
        </p>
        <p className="mt-1 text-xs font-bold text-slate-500">
          Distribution of {xMetric.label.toLowerCase()} inside each genre group.
        </p>
        <div className="mt-3 grid gap-3">
          <BoxPlotRow
            label={selectedLabel}
            values={inValues}
            minValue={minValue}
            maxValue={maxValue}
            color={accent}
            metric={xMetric}
          />
          <BoxPlotRow
            label={otherLabel}
            values={outValues}
            minValue={minValue}
            maxValue={maxValue}
            color="#94a3b8"
            metric={xMetric}
          />
        </div>
      </div>
    </div>
  );
}

function JitteredGroupPanel({ group, minValue, maxValue, xMetric, lineColor }: any) {
  const range = Math.max(maxValue - minValue, 1);
  const valuePercent = (value: number) => ((value - minValue) / range) * 100;
  const meanPercent = valuePercent(group.mean);

  return (
    <div className="rounded-2xl bg-white/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-black text-slate-700">{group.label}</p>
        <p className="text-[11px] font-bold text-slate-400">
          Avg {xMetric.label.toLowerCase()}: {xMetric.format(group.mean)} · {formatNumber(group.values.length)} games
        </p>
      </div>
      <div className="relative h-48 overflow-hidden rounded-2xl bg-slate-100">
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
          <div
            key={tick}
            className="absolute inset-x-0 border-t border-dashed border-slate-300/75"
            style={{ bottom: `${tick * 100}%` }}
          />
        ))}
        <div
          className="absolute inset-x-3 border-t-4"
          style={{
            bottom: `${meanPercent}%`,
            borderColor: lineColor,
          }}
          title={`${group.label} average ${xMetric.label.toLowerCase()}: ${xMetric.format(group.mean)}`}
        />
        {group.values.map((value: number, index: number) => (
          <span
            key={`${group.label}-${index}`}
            className="absolute h-2.5 w-2.5 rounded-full bg-slate-700/35"
            style={{
              bottom: `${valuePercent(value)}%`,
              left: `${14 + ((index * 17) % 72)}%`,
            }}
            title={`${group.label} ${xMetric.label.toLowerCase()}: ${xMetric.format(value)}`}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-wide text-slate-400">
        <span>Min {xMetric.label.toLowerCase()}: {xMetric.format(minValue)}</span>
        <span>Max {xMetric.label.toLowerCase()}: {xMetric.format(maxValue)}</span>
      </div>
    </div>
  );
}

function BoxPlotRow({ label, values, minValue, maxValue, color, metric }: any) {
  const stats = getBoxPlotStats(values);
  const range = Math.max(maxValue - minValue, 1);
  const position = (value: number) => `${((value - minValue) / range) * 100}%`;
  const metricLabel = metric.label.toLowerCase();

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
        <span className="font-black text-slate-600">{label}</span>
        <span className="font-semibold text-slate-400">
          {stats ? `Median ${metricLabel}: ${metric.format(stats.median)}` : "No data"}
        </span>
      </div>
      <div className="relative h-14 rounded-xl bg-slate-100 px-3">
        {stats ? (
          <>
            <div
              className="absolute top-1/2 h-0.5 -translate-y-1/2"
              style={{
                left: position(stats.min),
                right: `${100 - Number.parseFloat(position(stats.max))}%`,
                backgroundColor: "#94a3b8",
              }}
            />
            <div
              className="absolute top-1/2 h-8 -translate-y-1/2 rounded-lg border border-black/10"
              style={{
                left: position(stats.q1),
                width: `calc(${position(stats.q3)} - ${position(stats.q1)})`,
                minWidth: "0.5rem",
                backgroundColor: color,
                opacity: 0.82,
              }}
            />
            {[stats.min, stats.median, stats.max].map((value, index) => (
              <div
                key={`${label}-${index}`}
                className="absolute top-1/2 h-9 w-0.5 -translate-y-1/2 bg-slate-700"
                style={{ left: position(value) }}
                title={`${metric.label}: ${metric.format(value)}`}
              />
            ))}
          </>
        ) : null}
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-bold uppercase tracking-wide text-slate-400">
        <span>Min {metricLabel}: {metric.format(minValue)}</span>
        <span>Max {metricLabel}: {metric.format(maxValue)}</span>
      </div>
    </div>
  );
}

function getBoxPlotStats(values: number[]) {
  if (!values.length) return null;

  const sorted = [...values].sort((a, b) => a - b);

  return {
    min: sorted[0],
    q1: getQuantile(sorted, 0.25),
    median: getQuantile(sorted, 0.5),
    q3: getQuantile(sorted, 0.75),
    max: sorted[sorted.length - 1],
  };
}

function getQuantile(sortedValues: number[], quantile: number) {
  if (!sortedValues.length) return 0;

  const index = (sortedValues.length - 1) * quantile;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function getStablePointJitter(value: unknown, range: number) {
  const text = String(value ?? "");
  const hash = Array.from(text).reduce(
    (sum, character) => sum + character.charCodeAt(0),
    0
  );

  return ((hash % 100) / 100 - 0.5) * range * 2;
}

function CorrelationReadout({
  analysis,
  xMetric,
  yMetric,
  lineColor,
  caveat,
  categoricalY = false,
}: any) {
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
    <div className="rounded-2xl border border-[#9fc7e4] bg-[#e8f2fa] p-5">
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
        {categoricalY ? (
          <>
            <MetricStat
              label={`${yMetric.label} avg`}
              value={
                analysis.inGroupMean != null
                  ? xMetric.format(analysis.inGroupMean)
                  : "Pending"
              }
            />
            <MetricStat
              label={`Other genres avg`}
              value={
                analysis.outGroupMean != null
                  ? xMetric.format(analysis.outGroupMean)
                  : "Pending"
              }
            />
          </>
        ) : (
          <>
            <MetricStat
              label={`${yMetric.label} mean`}
              value={yMetric.format(analysis.yMean)}
            />
            <MetricStat
              label={`${yMetric.label} std dev`}
              value={yMetric.format(analysis.yStdDev)}
            />
          </>
        )}
      </div>

      <div className="mt-5 rounded-2xl bg-white/70 p-4">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
          Correlation
        </p>
        <p className="mt-1 text-2xl font-black" style={{ color: lineColor }}>
          {correlationLabel}
        </p>
        {categoricalY ? (
          <p className="mt-2 text-sm leading-6 text-slate-600">
            There is a {strength} {direction} link between being classified as{" "}
            <strong>{yMetric.label}</strong> and higher{" "}
            <strong>{xMetric.label}</strong> in the rows with complete data.
          </p>
        ) : (
          <p className="mt-2 text-sm leading-6 text-slate-600">
            There is a {strength} {direction} link between{" "}
            <strong>{xMetric.label}</strong> and{" "}
            <strong>{yMetric.label}</strong> in the rows with complete data.
          </p>
        )}
      </div>

      <p className="mt-4 text-xs font-semibold leading-5 text-slate-500">
        {caveat}
      </p>
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
        Mean is the average value; standard deviation shows how spread out the values are from that average.
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
      yLabel: yMetric.binaryGenre
        ? yMetric.format(toFiniteMetricValue(yMetric.value(game)) ?? 0)
        : null,
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
  const inGroupValues = yMetric.binaryGenre
    ? points.filter((point) => point.y === 1).map((point) => point.x)
    : [];
  const outGroupValues = yMetric.binaryGenre
    ? points.filter((point) => point.y === 0).map((point) => point.x)
    : [];

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
    yCategories: yMetric.categories,
    inGroupMean: inGroupValues.length ? mean(inGroupValues) : null,
    outGroupMean: outGroupValues.length ? mean(outGroupValues) : null,
    inGroupValues,
    outGroupValues,
  };
}

function buildCategoricalCorrelationAnalysis(games: any[], xMetric: any, yMetric: any) {
  const rawPoints = games
    .map((game) => ({
      id: game.id,
      title: game.title,
      x: toFiniteMetricValue(xMetric.value(game)),
      yLabel: sanitizeClassificationLabel(yMetric.value(game), ""),
    }))
    .filter((point) => point.x != null && point.yLabel) as Array<{
      id: string;
      title: string;
      x: number;
      yLabel: string;
    }>;
  const categoryStats = Object.values(
    rawPoints.reduce(
      (
        map: Record<string, { label: string; values: number[]; count: number; average: number }>,
        point
      ) => {
        if (!map[point.yLabel]) {
          map[point.yLabel] = {
            label: point.yLabel,
            values: [],
            count: 0,
            average: 0,
          };
        }

        map[point.yLabel].values.push(point.x);
        map[point.yLabel].count += 1;
        return map;
      },
      {}
    )
  )
    .map((category) => ({
      ...category,
      average: mean(category.values),
    }))
    .sort((a, b) => b.average - a.average || b.count - a.count || a.label.localeCompare(b.label));
  const yCategories = categoryStats.map((category) => category.label).reverse();
  const categoryIndex = new Map(
    yCategories.map((category, index) => [category, index])
  );
  const points = rawPoints.map((point) => ({
    ...point,
    y: categoryIndex.get(point.yLabel) ?? 0,
  }));
  const xValues = points.map((point) => point.x);
  const xMean = mean(xValues);
  const xStdDev = standardDeviation(xValues, xMean);
  const topCategory = categoryStats[0];

  return {
    points,
    correlation: null,
    slope: 0,
    intercept: 0,
    xMean,
    yMean: 0,
    xStdDev,
    yStdDev: 0,
    xMin: Math.min(...xValues, 0),
    xMax: Math.max(...xValues, 1),
    yMin: 0,
    yMax: Math.max(yCategories.length - 1, 1),
    yCategories,
    topCategoryLabel: topCategory
      ? `${topCategory.label} (${xMetric.format(topCategory.average)} avg)`
      : null,
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
  if (!island) return [];

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

function ReadOutCard({ maps, panel, platform }: any) {
  const leaders = maps
    .map((map: any) => map.items[0] ? { ...map.items[0], lens: map.title } : null)
    .filter(Boolean);
  const strongest = leaders.sort((a: any, b: any) => b.score - a.score)[0];
  const strongestExample = strongest?.examples?.[0];
  const allGenreNote = getAllGenreOpportunityNote(maps);

  return (
    <div className="rounded-3xl border border-[#9fc7e4] bg-[#e8f2fa] p-6">
      <h2 className="text-2xl font-bold">Research Readout</h2>
      <p className="mt-1 text-sm text-slate-500">
        Synthesis across demand, saturation, velocity, and estimated game format complexity.
      </p>
      <p className="mt-4 rounded-2xl bg-white/70 px-4 py-3 text-sm font-semibold leading-6 text-slate-700">
        Use the darker blue areas as starting points for research: they point to formats with stronger player activity signals and less obvious crowding.
      </p>

      {strongest ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl bg-white/70 p-4">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
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

          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
            {leaders.map((leader: any) => (
              <li key={leader.lens}>
                <strong>{leader.lens}:</strong> {leader.label}
              </li>
            ))}
          </ul>

          {allGenreNote ? (
            <div className="rounded-2xl border border-[#9fc7e4] bg-white/50 p-4 text-sm leading-6 text-slate-600">
              <strong>Note about "All":</strong> {allGenreNote}
            </div>
          ) : null}

          <div className="rounded-2xl border border-[#9fc7e4] bg-white/50 p-4 text-sm leading-6 text-slate-600">
            <strong>Research interpretation:</strong>{" "}
            consider investigating segments that appear as deeper blue in more
            than one lens; treat lighter areas as potentially crowded,
            slow-moving, uncertain, or expensive to build.
          </div>

          {strongestExample ? (
            <div className="border-t border-[#9fc7e4] pt-4">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                Example game
              </p>
              <div className="mt-3">
                <ResearchExampleSuggestion
                  item={strongestExample}
                  platform={platform}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <Unavailable text="Not enough classified records to generate a read out." />
      )}
    </div>
  );
}

function getAllGenreOpportunityNote(maps: any[]) {
  const mapsWithAllGenre = maps
    .map((map: any) => {
      const allGenreItems = (map.items ?? []).filter(
        (item: any) =>
          isAllGenreLabel(item.genre) &&
          !isAllGenreLabel(item.subgenre) &&
          !isGenericOpportunityLabel(item.subgenre)
      );

      return allGenreItems.length
        ? {
            title: map.title,
            subgenres: allGenreItems
              .slice(0, 3)
              .map((item: any) => item.subgenre),
          }
        : null;
    })
    .filter(Boolean);

  if (!mapsWithAllGenre.length) return "";

  const lenses = mapsWithAllGenre.map((map: any) => map.title).join(", ");
  const subgenres = Array.from(
    new Set(mapsWithAllGenre.flatMap((map: any) => map.subgenres))
  ).slice(0, 4);

  return `While a broad genre does not rank high in ${lenses}, ${subgenres.join(
    ", "
  )} still surfaces as a subgenre-level opportunity. Consider borrowing mechanics from these subgenres instead of treating "All" as a meaningful genre.`;
}

function isAllGenreLabel(value: unknown) {
  return typeof value === "string" && /^all(?: genres)?$/i.test(value.trim());
}

function isGenericOpportunityLabel(value: unknown) {
  return (
    typeof value === "string" &&
    /^(general|other|unknown|classification pending|n\/a|none)$/i.test(value.trim())
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

function GameTemplateGeneratorRow({
  items,
  platform,
  timeWindow,
  panel,
  accent,
  allowedTemplateOptions,
}: any) {
  const templateOptions = allowedTemplateOptions ?? {
    mainstream: true,
    uncommon: true,
    top10: true,
    reroll: true,
  };
  const visibleTemplateOptions = [
    { value: "mainstream", label: "Mainstream type", enabled: templateOptions.mainstream },
    { value: "uncommon", label: "Uncommon type", enabled: templateOptions.uncommon },
    {
      value: "top10",
      label: platform === "roblox" ? "Leading set type" : "Source set type",
      enabled: templateOptions.top10,
    },
  ];
  const [templateType, setTemplateType] = useState<
    "mainstream" | "uncommon" | "top10" | null
  >(null);
  const [rerollIndex, setRerollIndex] = useState(0);
  const template = useMemo(
    () =>
      templateType
        ? buildGameTemplate(items, platform, timeWindow, templateType, rerollIndex)
        : null,
    [items, platform, timeWindow, templateType, rerollIndex]
  );

  return (
    <section className="mb-6">
      <div className={`rounded-3xl border p-6 ${panel}`}>
        <div className="mb-5">
          <h2 className="text-2xl font-bold">Game Template Generator</h2>
          <p className="mt-1 text-sm text-slate-500">
            Synthetic concept templates built only from the active platform dataset.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className={`rounded-3xl border p-5 ${panel}`}>
            <p className="text-sm font-semibold text-slate-500">Template type</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Choose whether the template should follow the common pattern or a rarer visible pattern.
            </p>
            {visibleTemplateOptions.length ? (
              <div className="mt-5 grid gap-2">
                {visibleTemplateOptions.map(({ value, label, enabled }) => (
                  <button
                    key={value}
                    type="button"
                    disabled={!enabled}
                    onClick={() => {
                      setTemplateType(value as "mainstream" | "uncommon" | "top10");
                      setRerollIndex(0);
                    }}
                    className="rounded-2xl border border-[#9fc7e4] bg-[#e8f2fa] px-4 py-3 text-left text-sm font-black text-[#0d69ac] shadow-sm transition hover:border-[#0d69ac] hover:bg-[#dcecf7] disabled:cursor-not-allowed disabled:opacity-40"
                    style={{
                      borderColor: templateType === value && enabled ? accent : undefined,
                      color: templateType === value && enabled ? accent : undefined,
                      backgroundColor:
                        templateType === value && enabled ? `${accent}1f` : undefined,
                    }}
                  >
                    {label}
                  </button>
                ))}
                  <button
                    type="button"
                    disabled={!templateType || !templateOptions.reroll}
                    onClick={() => setRerollIndex((value) => value + 1)}
                    className="rounded-2xl border border-[#9fc7e4] bg-[#e8f2fa] px-4 py-3 text-left text-sm font-black text-[#0d69ac] shadow-sm transition hover:border-[#0d69ac] hover:bg-[#dcecf7] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Reroll
                  </button>
              </div>
            ) : (
              <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-500">
                Template controls are not enabled for this tier.
              </p>
            )}
          </div>

          <div className={`rounded-3xl border p-5 ${panel}`}>
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
              Fictional {platform === "roblox" ? "experience" : "island"} card
            </p>
            {template ? (
              <>
                <h3 className="mt-2 text-lg font-black leading-tight">
                  {template.title}
                </h3>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-400">
                      {platform === "roblox" ? "Genre" : "Estimated genre"}
                    </p>
                    <p className="line-clamp-1 font-black">{template.genre}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">
                      {platform === "roblox" ? "Subgenre" : "Estimated subgenre"}
                    </p>
                    <p className="line-clamp-1 font-black">{template.subgenre}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-400">Suggested thumbnail colors</p>
                    <div className="mt-1 grid grid-cols-[2.75rem_1fr] items-center gap-3 rounded-2xl bg-slate-50 p-3">
                      <div className="overflow-hidden rounded-lg border border-black/10">
                        <div
                          className="h-7 w-11"
                          style={{ backgroundColor: template.color.primary.hex }}
                        />
                        <div
                          className="h-3 w-11"
                          style={{ backgroundColor: template.color.secondary.hex }}
                        />
                      </div>
                      <div className="space-y-1">
                        <p
                          className="inline-flex rounded-full px-2 py-1 text-[10px] font-black"
                          style={{
                            backgroundColor: `${accent}1f`,
                            color: accent,
                          }}
                        >
                          {template.color.primary.rgb}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400">
                          Secondary: {template.color.secondary.rgb}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-400">Description</p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-sm font-semibold leading-5 text-slate-700">
                      {template.description.map((line: string) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-500">
                {platform === "roblox"
                  ? "Select Mainstream type, Uncommon type, or Leading set type to generate a fictional template."
                  : "Select Mainstream type, Uncommon type, or Source set type to generate a fictional template."}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-[#9fc7e4] bg-[#e8f2fa] p-5">
            <p className="text-sm font-semibold text-slate-500">Readout</p>
            {template ? (
              <>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {template.readout}
                </p>
                {template.exampleTitle ? (
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Similar source example:{" "}
                    {template.exampleUrl ? (
                      <a
                        href={template.exampleUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-black underline"
                      >
                        {template.exampleTitle}
                      </a>
                    ) : (
                      <strong>{template.exampleTitle}</strong>
                    )}
                  </p>
                ) : null}
                <p className="mt-4 rounded-2xl bg-white/70 px-3 py-2 text-xs font-semibold leading-5 text-slate-500">
                  {template.caveat}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-500">
                The readout will appear after a template type is selected.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function buildGameTemplate(
  items: any[],
  platform: Platform,
  timeWindow: TrendTimeWindow,
  templateType: "mainstream" | "uncommon" | "top10",
  rerollIndex = 0
) {
  const windowed =
    platform === "roblox"
      ? getRobloxGamesInWindow(items, timeWindow)
      : getFortniteIslandsInWindow(items, timeWindow);
  const baseRecords = (windowed.length ? windowed : items).filter((item) =>
    String(item.title ?? "").trim()
  );
  const records = templateType === "top10" ? baseRecords.slice(0, 10) : baseRecords;
  const windowLabel = getTrendWindowLabel(timeWindow);

  if (!records.length) {
    return {
      title: "Template pending",
      genre: "N/A",
      subgenre: "N/A",
      color: fallbackTileColorPairs[0],
      description: [
        "Not enough captured records are available to generate a platform-specific template yet.",
      ],
      readout:
        "The generator needs captured source records before it can synthesize a useful fictional pattern.",
      caveat:
        "This is a research template, not a recommendation, forecast, or guarantee of performance.",
    };
  }

  const profile =
    templateType === "mainstream"
      ? getMainstreamTemplateProfile(records, platform, rerollIndex)
      : templateType === "top10"
        ? getTopTenTemplateProfile(records, platform, rerollIndex)
      : getUncommonTemplateProfile(records, platform, rerollIndex);
  const primaryCue = getTemplatePrimaryCue(profile.source, platform);
  const title = buildTemplateTitle(profile, primaryCue, platform, templateType);
  const description = buildTemplateDescription(
    profile,
    primaryCue,
    platform,
    templateType,
    records
  );

  return {
    title,
    genre: profile.genre,
    subgenre: profile.subgenre,
    color: getTemplateColorPair(profile),
    description,
    exampleTitle: profile.source?.title,
    exampleUrl: profile.source?.url,
    readout:
      templateType === "mainstream"
        ? `This generated template is similar to the most common ${platform === "roblox" ? "Roblox" : "Fortnite"} genre and subgenre pattern captured in the ${windowLabel} window. Treat it as a baseline brief, not proof of demand.`
        : templateType === "top10"
          ? platform === "roblox"
            ? "This generated template is similar to the genre and subgenre patterns visible in the current leading Roblox records. Treat it as a source-set reference, not proof of demand."
            : "This generated template is similar to the genre and subgenre patterns visible in the latest imported Fortnite records. Treat it as a source-set reference, not proof of demand."
        : `This generated template is similar to a less common ${platform === "roblox" ? "Roblox" : "Fortnite"} genre and subgenre pattern captured in the ${windowLabel} window. Treat it as a whitespace prompt, not proof that the uncommon format will convert.`,
    caveat:
      platform === "roblox"
        ? "Generated only from captured Roblox API records and displayed dashboard metadata."
        : "Generated only from captured Fortnite API records and estimated fields derived from those records.",
  };
}

function getMainstreamTemplateProfile(
  records: any[],
  platform: Platform,
  rerollIndex = 0
) {
  const profiles = buildTemplateProfiles(records, platform).sort(
    (a, b) => b.count - a.count || b.players - a.players || a.genre.localeCompare(b.genre)
  );

  return profiles[rerollIndex % Math.max(1, profiles.length)] ?? getEmptyTemplateProfile(records);
}

function getUncommonTemplateProfile(
  records: any[],
  platform: Platform,
  rerollIndex = 0
) {
  const profiles = buildTemplateProfiles(records, platform).sort(
    (a, b) => a.count - b.count || b.players - a.players || a.genre.localeCompare(b.genre)
  );

  return profiles[rerollIndex % Math.max(1, profiles.length)] ?? getEmptyTemplateProfile(records);
}

function getTopTenTemplateProfile(
  records: any[],
  platform: Platform,
  rerollIndex = 0
) {
  const profiles = buildTemplateProfiles(records, platform).sort(
    (a, b) => b.players - a.players || b.count - a.count || a.genre.localeCompare(b.genre)
  );

  return profiles[rerollIndex % Math.max(1, profiles.length)] ?? getEmptyTemplateProfile(records);
}

function buildTemplateProfiles(records: any[], platform: Platform) {
  const map: Record<
    string,
    { genre: string; subgenre: string; source: any; count: number; players: number }
  > = {};

  records.forEach((item) => {
    const genre = getTemplateSourceGenre(item, platform);
    const subgenre = getTemplateSourceSubgenre(item, platform);

    if (!genre || !subgenre) return;

    const key = `${genre}|||${subgenre}`;
    if (!map[key]) {
      map[key] = { genre, subgenre, source: item, count: 0, players: 0 };
    }

    map[key].count += 1;
    map[key].players += item.latestPlayers ?? item.latestActivityValue ?? 0;
  });

  return Object.values(map);
}

function getEmptyTemplateProfile(records: any[]) {
  return {
    genre: "Metadata unavailable",
    subgenre: "Metadata unavailable",
    source: records[0] ?? {},
    count: 0,
    players: 0,
  };
}

function getTemplateColorPair(profile: any) {
  const key = `${profile.genre ?? ""}|${profile.subgenre ?? ""}`;
  const index =
    Array.from(key).reduce((sum, character) => sum + character.charCodeAt(0), 0) %
    fallbackTileColorPairs.length;

  return fallbackTileColorPairs[index];
}

function getMostCommonTemplateLabel(
  records: any[],
  platform: Platform,
  field: "genre" | "subgenre"
) {
  const fallback = field === "genre" ? "Popular" : "General Play";
  const counts = countBy(records, (item) => {
    const value =
      field === "genre"
        ? getDisplayGenre(item, platform)
        : getDisplaySubgenre(item, platform);
    return sanitizeClassificationLabel(value, "");
  });

  const cleanCounts = Object.fromEntries(
    Object.entries(counts).filter(([key]) => Boolean(key))
  );
  const label = topEntries(cleanCounts, 1)[0]?.[0];

  return label || fallback;
}

function getTemplateGenre(item: any, platform: Platform, fallback: string) {
  return sanitizeClassificationLabel(getDisplayGenre(item, platform), fallback);
}

function getTemplateSubgenre(item: any, platform: Platform, fallback: string) {
  return sanitizeClassificationLabel(getDisplaySubgenre(item, platform), fallback);
}

function getTemplateSourceGenre(item: any, platform: Platform) {
  return sanitizeClassificationLabel(getDisplayGenre(item, platform), "");
}

function getTemplateSourceSubgenre(item: any, platform: Platform) {
  return sanitizeClassificationLabel(getDisplaySubgenre(item, platform), "");
}

function getTemplatePrimaryCue(source: any, platform: Platform) {
  const labels =
    platform === "fortnite"
      ? getFortniteTopLabels(source, 3)
      : (source.extracted_tags ?? []).filter(Boolean);
  const firstLabel = labels[0];
  const loop = cleanTemplatePhrase(source.core_loop);
  const intent = cleanTemplatePhrase(source.player_intent);

  return cleanTemplatePhrase(firstLabel) ?? loop ?? intent ?? "replayable sessions";
}

function buildTemplateTitle(
  profile: any,
  primaryCue: string,
  platform: Platform,
  templateType: "mainstream" | "uncommon" | "top10"
) {
  const genreToken = cleanTitleToken(profile.genre);
  const subgenreToken = cleanTitleToken(profile.subgenre);
  const cueToken = cleanTitleToken(primaryCue);

  if (platform === "fortnite") {
    return templateType === "mainstream"
      ? buildUniqueTemplateTitle(["cue", cueToken], ["subgenre", subgenreToken], ["suffix", "Island"])
      : templateType === "top10"
        ? buildUniqueTemplateTitle(["prefix", "Source"], ["cue", cueToken], ["genre", genreToken])
        : buildUniqueTemplateTitle(["prefix", "Hidden"], ["cue", cueToken], ["genre", genreToken]);
  }

  return templateType === "mainstream"
    ? buildUniqueTemplateTitle(["prefix", "Ultimate"], ["subgenre", subgenreToken], ["genre", genreToken])
    : templateType === "top10"
      ? buildUniqueTemplateTitle(["prefix", "Top"], ["cue", cueToken], ["subgenre", subgenreToken])
      : buildUniqueTemplateTitle(["prefix", "Hidden"], ["cue", cueToken], ["subgenre", subgenreToken]);
}

function buildUniqueTemplateTitle(...parts: Array<[string, string]>) {
  const used = new Set<string>();
  const words: string[] = [];

  parts.forEach(([, part]) => {
    part
      .split(/\s+/)
      .filter(Boolean)
      .forEach((word) => {
        const key = word.toLowerCase();
        if (used.has(key)) return;
        used.add(key);
        words.push(word);
      });
  });

  return words.join(" ") || "Fictional Template";
}

function buildTemplateDescription(
  profile: any,
  primaryCue: string,
  platform: Platform,
  templateType: "mainstream" | "uncommon" | "top10",
  records?: any[]
) {
  const genre = cleanTemplatePhrase(profile.genre) ?? "genre";
  const subgenre = cleanTemplatePhrase(profile.subgenre) ?? "subgenre";
  const cue = cleanTemplatePhrase(primaryCue) ?? "repeatable play";
  const commonTemplate = buildCommonTemplate(records?.length ? records : [profile.source]);
  const pattern = commonTemplate.pattern.toLowerCase();
  const hasProgression = pattern.includes("progression");
  const hasSocial = pattern.includes("social");
  const hasFreshness = pattern.includes("freshness");
  const hasCta = pattern.includes("cta");
  const progressionLine = hasProgression
    ? "Progress through upgrades, unlocks, or rare rewards."
    : "Keep the goal clear and easy to repeat.";
  const socialLine = hasSocial
    ? "Add a social or competitive reason to return."
    : "Keep the core loop readable for solo play.";
  const freshnessLine = hasFreshness
    ? "Support the concept with updates, events, or limited-time goals."
    : "Use a simple reward loop to create repeat visits.";
  const ctaLine = hasCta
    ? "Close with a clear join, favorite, or invite action."
    : "End with a simple reason to try one more round.";

  if (platform === "fortnite") {
    return templateType === "mainstream"
      ? [
          `Become the player fantasy in a ${genre} / ${subgenre} island centered on ${cue}.`,
          progressionLine,
          socialLine,
          ctaLine,
        ]
      : templateType === "top10"
        ? [
            `Build around a source-set-inspired ${genre} / ${subgenre} island centered on ${cue}.`,
            progressionLine,
            socialLine,
            freshnessLine,
          ]
      : [
          `Explore an uncommon ${genre} / ${subgenre} island centered on ${cue}.`,
          progressionLine,
          freshnessLine,
          ctaLine,
        ];
  }

  return templateType === "mainstream"
    ? [
        `Become the player fantasy in a ${genre} / ${subgenre} experience centered on ${cue}.`,
        progressionLine,
        socialLine,
        ctaLine,
      ]
    : templateType === "top10"
      ? [
          `Build around a leading-set-inspired ${genre} / ${subgenre} experience centered on ${cue}.`,
          progressionLine,
          socialLine,
          freshnessLine,
        ]
    : [
        `Explore an uncommon ${genre} / ${subgenre} experience centered on ${cue}.`,
        progressionLine,
        freshnessLine,
        ctaLine,
      ];
}

function cleanTemplatePhrase(value: unknown) {
  const text = String(value ?? "").trim();
  return text && !/^unknown|general|classification pending|n\/a$/i.test(text)
    ? text
    : null;
}

function cleanTitleToken(value: unknown) {
  const phrase = cleanTemplatePhrase(value) ?? "Concept";
  return phrase
    .replace(/[^\p{L}\p{N}\s&/-]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function RobloxArchetypeRow({ games, timeWindow, panel, allowedKinds }: any) {
  const archetypes = useMemo(
    () => buildRobloxArchetypes(games, timeWindow),
    [games, timeWindow]
  );
  const allowed = allowedKinds ?? { median: true, average: true, unique: true };
  const isAllowed = (kind: string) => {
    if (/median/i.test(kind)) return allowed.median;
    if (/average/i.test(kind)) return allowed.average;
    if (/unique|outlier/i.test(kind)) return allowed.unique;
    return true;
  };

  if (!archetypes.length) {
    return <Unavailable text="Not enough Roblox metrics to build archetypes yet." />;
  }

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-3">
      {archetypes.map((archetype: any, index: number) => (
        <div key={archetype.kind} className="space-y-3">
          {isAllowed(archetype.kind) ? (
            <>
              <RobloxArchetypeCard item={archetype} rank={index + 1} panel={panel} />
              <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-500">
                {archetype.readout}
              </p>
            </>
          ) : (
            <LockedAccessCard
              itemKey="roblox_archetypes"
              panel={panel}
              title={archetype.kind}
              description={archetype.readout}
              previewType="singleArchetype"
            />
          )}
        </div>
      ))}
    </div>
  );
}

function RobloxArchetypeCard({ item, rank, panel }: any) {
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
    <div className={`rounded-3xl border p-4 shadow-sm ${panel}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
            {item.kind}
          </p>
          <h3 className="mt-1 line-clamp-2 text-sm font-black">{item.title}</h3>
        </div>
        <span className="text-xs font-bold text-slate-400">#{rank}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-slate-400">Gain in players</p>
          <p className={positive ? "font-black text-green-600" : "font-black text-red-500"}>
            {Math.round(item.playerGainPercent ?? 0)}% {positive ? "▲" : "▼"}
          </p>
        </div>

        <div>
          <p className="text-slate-400">Stored peak players</p>
          <p className="font-black">{formatNumber(item.periodHigh)}</p>
        </div>

        <div className="col-span-2">
          <p className="text-slate-400">Top measured rank</p>
          <p className="font-black">
            {item.bestRank ? `#${item.bestRank} in ${item.bestRankSort ?? "Chart"}` : "N/A"}
          </p>
        </div>

        <div>
          <p className="text-slate-400">Genre</p>
          <p className="line-clamp-1 font-black">{getDisplayGenre(item, "roblox")}</p>
        </div>

        <div>
          <p className="text-slate-400">Subgenre</p>
          <p className="line-clamp-1 font-black">{getDisplaySubgenre(item, "roblox")}</p>
        </div>

        <div>
          <p className="text-slate-400">Avg player gain/loss, past 7 days</p>
          <p className={averagePositive ? "font-black text-green-600" : "font-black text-red-500"}>
            {typeof averageGain === "number"
              ? `${averageGain > 0 ? "+" : ""}${formatNumber(Math.round(averageGain))} players/day`
              : "N/A"}
          </p>
        </div>

        <div>
          <p className="text-slate-400">Likes</p>
          <p className="font-black">{likesLabel}</p>
        </div>
      </div>
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
        <span className="text-xs font-bold text-slate-400">Item {rank}</span>
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
            {platform === "roblox" ? "Gain in players" : "Estimated genre"}
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
            {platform === "roblox" ? "Stored peak players" : "Estimated intent"}
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
          <p className="text-slate-400">
            {platform === "roblox" ? "Genre" : "Estimated genre"}
          </p>
          <p className="line-clamp-1 font-black">
            {getDisplayGenre(item, platform)}
          </p>
        </div>

        <div>
          <p className="text-slate-400">
            {platform === "roblox" ? "Subgenre" : "Estimated subgenre"}
          </p>
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

function RobloxExperienceList({ games, panel }: any) {
  if (!games.length) {
    return <Unavailable text="No Roblox experiences available yet." />;
  }

  return (
    <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
      <div className="min-w-[92rem] divide-y divide-slate-200">
        <div className="grid grid-cols-[3rem_18rem_8rem_9rem_16rem_10rem_12rem_11rem_10rem_8rem_8rem] gap-3 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-400">
          <span>Rank</span>
          <span>Experience</span>
          <span>Gain</span>
          <span>Peak</span>
          <span>Top measured rank</span>
          <span>Genre</span>
          <span>Subgenre</span>
          <span>Classification</span>
          <span>Avg 7D</span>
          <span>Likes</span>
          <span>Visits</span>
        </div>
        {games.map((item: any, index: number) => (
          <RobloxExperienceListRow
            key={item.id}
            item={item}
            rank={index + 1}
            panel={panel}
          />
        ))}
      </div>
    </div>
  );
}

function RobloxExperienceListRow({ item, rank, panel }: any) {
  const positive = (item.playerGainPercent ?? 0) >= 0;
  const averageGain = item.averagePlayerGain7Days;
  const averagePositive = (averageGain ?? 0) >= 0;
  const classificationConfidence = getClassificationConfidence(item, "roblox");
  const classificationLabel =
    classificationConfidence === "source"
      ? "Roblox source"
      : classificationConfidence === "estimated"
        ? "Heuristic fallback"
        : "Classification pending";
  const likesLabel =
    typeof item.upVotes === "number"
      ? formatNumber(item.upVotes)
      : typeof item.likeRatio === "number"
        ? `${Math.round(item.likeRatio * 100)}% ratio`
        : "N/A";

  return (
    <a
      href={item.url ?? `https://www.roblox.com/games/${item.id}`}
      target="_blank"
      rel="noreferrer"
      className={`grid grid-cols-[3rem_18rem_8rem_9rem_16rem_10rem_12rem_11rem_10rem_8rem_8rem] gap-3 px-4 py-3 text-xs transition hover:bg-slate-50 ${panel}`}
    >
      <span className="whitespace-nowrap font-black text-slate-400">#{rank}</span>
      <span className="truncate whitespace-nowrap font-black text-slate-800">
        {item.title}
      </span>
      <span
        className={`whitespace-nowrap font-black ${
          positive ? "text-green-600" : "text-red-500"
        }`}
      >
        {Math.round(item.playerGainPercent ?? 0)}% {positive ? "▲" : "▼"}
      </span>
      <span className="whitespace-nowrap font-black text-slate-700">
        {formatNumber(item.periodHigh)}
      </span>
      <span className="truncate whitespace-nowrap font-black text-slate-700">
        #{item.bestRank ?? item.latestRank ?? "N/A"} in{" "}
        {item.bestRankSort ?? item.latestSort ?? "Chart"}
      </span>
      <span className="truncate whitespace-nowrap font-black text-slate-700">
        {getDisplayGenre(item, "roblox")}
      </span>
      <span className="truncate whitespace-nowrap font-black text-slate-700">
        {getDisplaySubgenre(item, "roblox")}
      </span>
      <span
        className={`truncate whitespace-nowrap font-black ${
          classificationConfidence === "estimated"
            ? "text-amber-600"
            : classificationConfidence === "source"
              ? "text-green-600"
              : "text-slate-500"
        }`}
      >
        {classificationLabel}
      </span>
      <span
        className={`whitespace-nowrap font-black ${
          averagePositive ? "text-green-600" : "text-red-500"
        }`}
      >
        {typeof averageGain === "number"
          ? `${averageGain > 0 ? "+" : ""}${formatNumber(averageGain)}/day`
          : "N/A"}
      </span>
      <span className="whitespace-nowrap font-black text-slate-700">
        {likesLabel}
      </span>
      <span className="whitespace-nowrap font-black text-slate-700">
        {typeof item.visits === "number" ? formatNumber(item.visits) : "N/A"}
      </span>
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
        <span className="text-xs font-bold text-slate-400">Item {rank}</span>
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
          <p className="text-slate-400">Estimated genre</p>
          <p className="line-clamp-1 font-black">
            {genre}
          </p>
        </div>

        <div>
          <p className="text-slate-400">Estimated subgenre</p>
          <p className="line-clamp-1 font-black">
            {subgenre}
          </p>
        </div>

        <div className="col-span-2">
          <p className="text-slate-400">Estimated player intent</p>
          <p className="line-clamp-2 font-black">
            {intent}
          </p>
        </div>

        <div className="col-span-2">
          <p className="text-slate-400">Estimated core loop</p>
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

function FortniteArchetypeRow({ islands, timeWindow, panel }: any) {
  const archetypes = useMemo(
    () => buildFortniteArchetypes(islands, timeWindow),
    [islands, timeWindow]
  );

  if (!archetypes.length) {
    return <Unavailable text="Not enough Fortnite metadata to build archetypes yet." />;
  }

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-3">
      {archetypes.map((archetype: any, index: number) => (
        <div key={archetype.kind} className="space-y-3">
          <FortniteArchetypeCard item={archetype} rank={index + 1} panel={panel} />
          <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-500">
            {archetype.readout}
          </p>
        </div>
      ))}
    </div>
  );
}

function FortniteArchetypeCard({ item, rank, panel }: any) {
  const genre = item.inferred_genre ?? "Unclassified";
  const subgenre = item.inferred_subgenre ?? "General";
  const intent = item.player_intent ?? item.audience_signal ?? "Not classified yet";
  const loop = item.core_loop ?? item.design_pattern ?? "Not classified yet";
  const labels = getFortniteGameplayLabels(item)
    .filter((label) => label !== genre && label !== subgenre && label !== intent && label !== loop)
    .slice(0, 3);

  return (
    <div className={`rounded-3xl border p-4 shadow-sm ${panel}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
            {item.kind}
          </p>
          <h3 className="mt-1 line-clamp-2 text-sm font-black">{item.title}</h3>
          {item.ipLabel && (
            <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">
              {item.ipLabel}
            </span>
          )}
        </div>
        <span className="text-xs font-bold text-slate-400">#{rank}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-slate-400">Estimated genre</p>
          <p className="line-clamp-1 font-black">{genre}</p>
        </div>

        <div>
          <p className="text-slate-400">Estimated subgenre</p>
          <p className="line-clamp-1 font-black">{subgenre}</p>
        </div>

        <div className="col-span-2">
          <p className="text-slate-400">Estimated player intent</p>
          <p className="line-clamp-2 font-black">{intent}</p>
        </div>

        <div className="col-span-2">
          <p className="text-slate-400">Estimated core loop</p>
          <p className="line-clamp-2 font-black">{loop}</p>
        </div>

        {labels.length ? (
          <div className="col-span-2">
            <p className="text-slate-400">Labels</p>
            <p className="line-clamp-2 font-black">{labels.join(" / ")}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function buildFortniteArchetypes(islands: any[], timeWindow: TrendTimeWindow) {
  const windowed = getFortniteIslandsInWindow(islands, timeWindow);

  if (!windowed.length) return [];

  const genreCounts = countBy(windowed, (island: any) => island.inferred_genre ?? "Other");
  const subgenreCounts = countBy(windowed, (island: any) => island.inferred_subgenre ?? "General");
  const loopCounts = countBy(windowed, (island: any) => island.core_loop ?? "Unknown");
  const intentCounts = countBy(windowed, (island: any) => island.player_intent ?? island.audience_signal ?? "Casual play");
  const labelCounts = countLabels(windowed);
  const combos = windowed.map((island: any) => ({
    island,
    key: [
      island.inferred_genre ?? "Other",
      island.inferred_subgenre ?? "General",
      island.core_loop ?? "Unknown",
    ].join(" / "),
  }));
  const comboCounts = countBy(combos, (entry: any) => entry.key);
  const sortedByTypicality = [...windowed].sort((a: any, b: any) => {
    const aScore = getTypicalityScore(a, genreCounts, subgenreCounts, loopCounts, labelCounts);
    const bScore = getTypicalityScore(b, genreCounts, subgenreCounts, loopCounts, labelCounts);
    return aScore - bScore;
  });
  const medianSource = sortedByTypicality[Math.floor(sortedByTypicality.length / 2)] ?? windowed[0];
  const uniqueEntry = combos
    .map((entry: any) => ({
      ...entry,
      rarity: comboCounts[entry.key] ?? 0,
      labelRarity: getAverageLabelFrequency(entry.island, labelCounts),
    }))
    .sort((a: any, b: any) => {
      if (a.rarity !== b.rarity) return a.rarity - b.rarity;
      return a.labelRarity - b.labelRarity;
    })[0];

  const averageGenre = modeFromCounts(genreCounts);
  const averageSubgenre = modeFromCounts(subgenreCounts);
  const averageLoop = modeFromCounts(loopCounts);
  const averageIntent = modeFromCounts(intentCounts);
  const averageLabels = topEntries(labelCounts, 3).map((entry) => entry[0]);
  const medianLabels = getFortniteTopLabels(medianSource, 3);
  const uniqueLabels = getFortniteTopLabels(uniqueEntry?.island, 3);

  return [
    makeFortniteArchetype({
      kind: "Median game",
      title: `Median ${medianSource.inferred_genre ?? "Fortnite"} Island`,
      source: medianSource,
      labels: medianLabels,
      readout: `Middle-of-the-pack profile from ${formatNumber(windowed.length)} captured islands in the ${getTrendWindowLabel(timeWindow)} window.`,
    }),
    makeFortniteArchetype({
      kind: "Average game",
      title: `Average ${averageGenre} Island`,
      source: {
        inferred_genre: averageGenre,
        inferred_subgenre: averageSubgenre,
        core_loop: averageLoop,
        player_intent: averageIntent,
        extracted_tags: averageLabels,
        build_complexity: modeFromCounts(countBy(windowed, (island: any) => island.build_complexity ?? "Medium")),
      },
      labels: averageLabels,
      readout: `Composite of the most common estimated genre, subgenre, core loop, intent, and labels in this window.`,
    }),
    makeFortniteArchetype({
      kind: "Outlier game",
      title: `Outlier ${uniqueEntry?.island?.inferred_genre ?? "Fortnite"} Concept`,
      source: uniqueEntry?.island ?? windowed[0],
      labels: uniqueLabels,
      readout: `Rarest detected estimated format mix in this window; useful as a novelty reference, not a success signal.`,
    }),
  ];
}

function makeFortniteArchetype({ kind, title, source, labels, readout }: any) {
  return {
    id: `fictional-${kind}`,
    kind,
    title,
    inferred_genre: source.inferred_genre ?? "Other",
    inferred_subgenre: source.inferred_subgenre ?? "General",
    player_intent: source.player_intent ?? source.audience_signal ?? "Not classified yet",
    core_loop: source.core_loop ?? source.design_pattern ?? "Not classified yet",
    design_pattern: source.design_pattern,
    audience_signal: source.audience_signal,
    build_complexity: source.build_complexity,
    extracted_tags: labels?.length ? labels : source.extracted_tags ?? [],
    ipLabel: getFortniteIpSignal(source)?.label,
    readout,
  };
}

function buildRobloxArchetypes(games: any[], timeWindow: TrendTimeWindow) {
  const windowed = getRobloxGamesInWindow(games, timeWindow).filter(
    (game) => typeof game.latestPlayers === "number"
  );

  if (!windowed.length) return [];

  const sortedByPlayers = [...windowed].sort(
    (a, b) => (a.latestPlayers ?? 0) - (b.latestPlayers ?? 0)
  );
  const medianSource = sortedByPlayers[Math.floor(sortedByPlayers.length / 2)] ?? windowed[0];
  const classifiedWindow = windowed.filter(
    (game: any) => getClassificationConfidence(game, "roblox") !== "pending"
  );
  const classificationSource = classifiedWindow.length ? classifiedWindow : windowed;
  const genreCounts = countBy(classificationSource, (game: any) =>
    getSanitizedRobloxGenre(game)
  );
  const subgenreCounts = countBy(classificationSource, (game: any) =>
    getSanitizedRobloxSubgenre(game)
  );
  const loopCounts = countBy(windowed, (game: any) => game.core_loop ?? "Unknown");
  const fallbackGenre = modeFromCounts(genreCounts);
  const fallbackSubgenre = modeFromCounts(subgenreCounts);
  const comboEntries = windowed.map((game: any) => ({
    game,
    key: [
      getSanitizedRobloxGenre(game, fallbackGenre),
      getSanitizedRobloxSubgenre(game, fallbackSubgenre),
      game.core_loop ?? "Unknown",
    ].join(" / "),
  }));
  const comboCounts = countBy(comboEntries, (entry: any) => entry.key);
  const uniqueEntry = comboEntries
    .map((entry: any) => ({
      ...entry,
      rarity: comboCounts[entry.key] ?? 0,
      playerScale: entry.game.latestPlayers ?? 0,
    }))
    .sort((a: any, b: any) => {
      if (a.rarity !== b.rarity) return a.rarity - b.rarity;
      return b.playerScale - a.playerScale;
    })[0];
  const averageSource = {
    title: "Average Popular Type",
    thumbnail_url: medianSource.thumbnail_url,
    inferred_genre: fallbackGenre,
    inferred_subgenre: fallbackSubgenre,
    core_loop: modeFromCounts(loopCounts),
    latestPlayers: mean(windowed.map((game: any) => game.latestPlayers ?? 0)),
    playerGainPercent: mean(windowed.map((game: any) => game.playerGainPercent ?? 0)),
    periodHigh: mean(windowed.map((game: any) => game.periodHigh ?? 0)),
    averagePlayerGain7Days: mean(
      windowed
        .map((game: any) => game.averagePlayerGain7Days)
        .filter((value: any) => typeof value === "number")
    ),
    upVotes: mean(
      windowed
        .map((game: any) => game.upVotes)
        .filter((value: any) => typeof value === "number")
    ),
    likeRatio: mean(
      windowed
        .map((game: any) => game.likeRatio)
        .filter((value: any) => typeof value === "number")
    ),
    bestRank: getMedianNumber(
      windowed
        .map((game: any) => game.bestRank)
        .filter((value: any) => typeof value === "number")
    ),
    bestRankSort: "captured charts",
  };
  const uniqueSource = uniqueEntry?.game ?? windowed[0];

  return [
    makeRobloxArchetype({
      kind: "Median game",
      title: buildShortArchetypeTitle("Median", medianSource, fallbackGenre),
      source: medianSource,
      fallbackGenre,
      fallbackSubgenre,
      readout: `Middle player-count profile from ${formatNumber(windowed.length)} captured Roblox experiences in the ${getTrendWindowLabel(timeWindow)} window.`,
    }),
    makeRobloxArchetype({
      kind: "Average game",
      title: averageSource.title,
      source: averageSource,
      fallbackGenre,
      fallbackSubgenre,
      readout: `Composite of the most common genre, subgenre, core loop, and average player metrics in this window.`,
    }),
    makeRobloxArchetype({
      kind: "Outlier game",
      title: buildShortArchetypeTitle("Outlier", uniqueSource, fallbackGenre),
      source: uniqueSource,
      fallbackGenre,
      fallbackSubgenre,
      readout: `Rarest detected genre/subgenre/core-loop mix in this window; useful as a novelty reference, not a success signal.`,
    }),
  ];
}

function makeRobloxArchetype({ kind, title, source, fallbackGenre, fallbackSubgenre, readout }: any) {
  return {
    ...source,
    inferred_genre: getSanitizedRobloxGenre(source, fallbackGenre),
    inferred_subgenre: getSanitizedRobloxSubgenre(source, fallbackSubgenre),
    id: `fictional-${kind}`,
    kind,
    title,
    readout,
  };
}

function buildShortArchetypeTitle(prefix: string, source: any, fallbackGenre: string) {
  return cleanTitleToken(`${prefix} ${getSanitizedRobloxGenre(source, fallbackGenre)}`);
}

function getSanitizedRobloxGenre(item: any, fallback = "Popular") {
  return sanitizeClassificationLabel(getDisplayGenre(item, "roblox"), fallback);
}

function getSanitizedRobloxSubgenre(item: any, fallback = "General Play") {
  return sanitizeClassificationLabel(getDisplaySubgenre(item, "roblox"), fallback);
}

function sanitizeClassificationLabel(value: unknown, fallback: string) {
  const text = String(value ?? "").trim();
  return text && !/^classification pending|unknown|general|other|n\/a$/i.test(text)
    ? text
    : fallback;
}

function getRobloxGamesInWindow(games: any[], timeWindow: TrendTimeWindow) {
  const latestDateKey = getLatestSnapshotDateKey(games);
  const latestDate = parseDateKey(latestDateKey);
  const startDate = latestDate ? new Date(latestDate) : null;

  if (!latestDate || !startDate) return games;

  startDate.setUTCDate(startDate.getUTCDate() - getTrendWindowDays(timeWindow) + 1);

  return games.filter((game) =>
    (game.snapshots ?? []).some((snapshot: any) => {
      const dateKey = getSnapshotDateKey(snapshot.created_at);
      const snapshotDate = parseDateKey(dateKey);
      return snapshotDate && snapshotDate >= startDate && snapshotDate <= latestDate;
    })
  );
}

function getLatestSnapshotDateKey(items: any[]) {
  return items
    .flatMap((item) =>
      (item.snapshots ?? [])
        .map((snapshot: any) => getSnapshotDateKey(snapshot.created_at))
        .filter(Boolean)
    )
    .sort()
    .at(-1);
}

function getMedianNumber(values: number[]) {
  if (!values.length) return null;

  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function getFortniteIslandsInWindow(islands: any[], timeWindow: TrendTimeWindow) {
  const latestDateKey =
    getFortniteSubstantialSnapshotDateKeys(islands).at(-1) ??
    getAvailableFortniteSnapshotDateKeys(islands).at(-1);
  const latestDate = parseDateKey(latestDateKey);
  const startDate = latestDate ? new Date(latestDate) : null;

  if (!latestDate || !startDate) return islands;

  startDate.setUTCDate(startDate.getUTCDate() - getTrendWindowDays(timeWindow) + 1);

  return islands.filter((island) =>
    (island.snapshots ?? []).some((snapshot: any) => {
      const dateKey = getSnapshotDateKey(snapshot.created_at);
      const snapshotDate = parseDateKey(dateKey);
      return snapshotDate && snapshotDate >= startDate && snapshotDate <= latestDate;
    })
  );
}

function countBy(items: any[], getKey: (item: any) => string) {
  return items.reduce((counts: Record<string, number>, item) => {
    const key = getKey(item) || "Unknown";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function countLabels(islands: any[]) {
  return islands.reduce((counts: Record<string, number>, island) => {
    getFortniteTopLabels(island, 3).forEach((label) => {
      counts[label] = (counts[label] ?? 0) + 1;
    });
    return counts;
  }, {});
}

function modeFromCounts(counts: Record<string, number>) {
  return topEntries(counts, 1)[0]?.[0] ?? "Unknown";
}

function topEntries(counts: Record<string, number>, limit: number) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
}

function getTypicalityScore(
  island: any,
  genreCounts: Record<string, number>,
  subgenreCounts: Record<string, number>,
  loopCounts: Record<string, number>,
  labelCounts: Record<string, number>
) {
  const labels = getFortniteTopLabels(island, 3);
  const labelScore = labels.reduce((sum, label) => sum + (labelCounts[label] ?? 0), 0);

  return (
    (genreCounts[island.inferred_genre ?? "Other"] ?? 0) +
    (subgenreCounts[island.inferred_subgenre ?? "General"] ?? 0) +
    (loopCounts[island.core_loop ?? "Unknown"] ?? 0) +
    labelScore
  );
}

function getAverageLabelFrequency(island: any, labelCounts: Record<string, number>) {
  const labels = getFortniteTopLabels(island, 3);
  if (!labels.length) return 999999;

  return labels.reduce((sum, label) => sum + (labelCounts[label] ?? 0), 0) / labels.length;
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
        <span className="text-[10px] font-bold text-slate-400">
          {platform === "roblox" ? `#${rank}` : `Item ${rank}`}
        </span>
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
          {platform === "roblox" ? "Players" : "Estimated genre"}
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

function ResearchExampleSuggestion({ item, platform }: any) {
  const positive = (item.playerGainPercent ?? 0) >= 0;
  const href = item.url ?? `https://fortnite.gg/island?code=${item.island_code}`;
  const genre = getDisplayGenre(item, platform);
  const subgenre = getDisplaySubgenre(item, platform);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="block rounded-2xl border border-[#9fc7e4] bg-white/80 p-4 transition hover:bg-white"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-black leading-snug text-slate-800">
            {item.title}
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {genre} / {subgenre}
          </p>
        </div>
        {platform === "roblox" ? (
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-black ${
              positive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
            }`}
          >
            {Math.round(item.playerGainPercent ?? 0)}% {positive ? "▲" : "▼"}
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-slate-400">
            {platform === "roblox" ? "Current players" : "Estimated format"}
          </p>
          <p className="font-black text-slate-700">
            {platform === "roblox"
              ? formatNumber(item.latestPlayers)
              : item.core_loop ?? item.design_pattern ?? "N/A"}
          </p>
        </div>
        <div>
          <p className="text-slate-400">
            {platform === "roblox" ? "Stored peak" : "Primary label"}
          </p>
          <p className="font-black text-slate-700">
            {platform === "roblox"
              ? formatNumber(item.periodHigh)
              : getFortnitePrimaryLabel(item) ?? "N/A"}
          </p>
        </div>
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
    <div className="mt-6 overflow-hidden rounded-2xl bg-[#959696] p-1 shadow-inner">
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
            className="relative overflow-hidden rounded-xl border border-dotted border-white/70 bg-[#959696]"
            style={{
              gridColumn: `span ${group.colSpan}`,
              gridRow: `span ${group.rowSpan}`,
              minHeight: 0,
            }}
          >
            <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 bg-[#959696]/85 px-2 py-1 text-white backdrop-blur">
              <p className="truncate text-[11px] font-black uppercase tracking-wide">
                {group.genre}
              </p>
              <p className="shrink-0 text-[10px] font-bold text-white/75">
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
                      getLandscapePlayers(game)
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
                        <span>{formatNumber(getLandscapePlayers(game))}</span>
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
    .filter((game) => getLandscapePlayers(game) > 0)
    .forEach((game) => {
      const genre = game.inferred_genre ?? "Other";
      if (!map[genre]) map[genre] = [];
      map[genre].push(game);
    });

  return Object.entries(map)
    .map(([genre, entries]) => {
      const sortedEntries = [...entries].sort(
        (a, b) => getLandscapePlayers(b) - getLandscapePlayers(a)
      );

      return {
        genre,
        players: sortedEntries.reduce(
          (sum, item) => sum + getLandscapePlayers(item),
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

function getLandscapePlayers(game: any) {
  return game.landscapePlayers ?? game.latestPlayers ?? 0;
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

  if (change >= 20) return "#a7e3b6";
  if (change >= 8) return "#8fd1a7";
  if (change > 0) return "#78b895";
  if (change <= -20) return "#f4a6a6";
  if (change <= -8) return "#dc8e94";
  if (change < 0) return "#be7d88";
  return "#5b6472";
}

function PredictionMarketSignalsCard({
  panel,
  accent,
  search,
  onSearchChange,
  target,
  signals,
  platform,
  showSearch = true,
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

        {showSearch && (
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
        )}
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
        label: "Current source order",
        value:
          typeof target.latestRank === "number"
            ? `Position #${target.latestRank}`
            : "Order unavailable",
        detail: "Position in the imported source payload when available; not an official popularity measure.",
      },
      {
        label: "Source order movement",
        value:
          rankMovement.change === null
            ? "Not enough history"
            : `${rankMovement.change > 0 ? "+" : ""}${rankMovement.change} spots`,
        detail: rankMovement.detail,
      },
      {
        label: "Estimated genre share",
        value: `${genreShare.percent}%`,
        detail: `${genreShare.count} of ${genreShare.total} imported islands are estimated as ${
          target.inferred_genre ?? "Other"
        }.`,
      },
      {
        label: "Estimated subgenre share",
        value: `${subgenreShare.percent}%`,
        detail: `${subgenreShare.count} of ${subgenreShare.total} imported islands are estimated as ${
          target.inferred_subgenre ?? "General"
        }.`,
      },
      {
        label: "Gameplay label cluster",
        value: `${labelSignal.percent}%`,
        detail: labelSignal.detail,
      },
      {
        label: "Estimated competition tier",
        value: target.competition_level ?? "Unclassified",
        detail: "Estimated from the imported labels, category, title, and description cues.",
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
      label: "Daily source-position history",
      value: rankedSnapshots.length
        ? `${rankedSnapshots.length} source-position snapshots`
        : "No source-position snapshots",
      detail: `Latest source position: #${target.latestRank ?? "N/A"} in ${
        target.latestSort ?? "current source set"
      }. Position movement: ${rankGain > 0 ? "+" : ""}${rankGain} spots.`,
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
      detail: "Needs at least two source-order snapshots to compare position movement.",
    };
  }

  const first = rankedSnapshots[0].rank;
  const latest = rankedSnapshots[rankedSnapshots.length - 1].rank;
  const change = first - latest;

  return {
    change,
    detail:
      change === 0
        ? `Source order stayed at #${latest} across stored snapshots.`
        : `Moved from source position #${first} to #${latest}; positive means the island appeared earlier in the source order.`,
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

function ThemeModeButton({ darkMode, onClick, accent }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-600 shadow-sm transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
      style={
        darkMode
          ? {
              backgroundColor: accent,
              borderColor: accent,
              color: "white",
              outlineColor: accent,
            }
          : { outlineColor: accent }
      }
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M8.5 14.5c-1.3-1-2-2.5-2-4.1a5.5 5.5 0 0 1 11 0c0 1.6-.7 3.1-2 4.1-.8.6-1.2 1.5-1.2 2.5H9.7c0-1-.4-1.9-1.2-2.5Z" />
        {!darkMode && <path d="M12 2v1.5" />}
        {!darkMode && <path d="M4.9 4.9 6 6" />}
        {!darkMode && <path d="M19.1 4.9 18 6" />}
      </svg>
    </button>
  );
}

function ModalShell({ children, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-6xl">{children}</div>
    </div>
  );
}

function UserTierBadge({ tier, actualTier }: { tier: UserTier; actualTier?: UserTier }) {
  const styles: Record<UserTier, string> = {
    free: "bg-slate-100 text-slate-600",
    scout: "bg-blue-50 text-blue-700",
    pro: "bg-violet-50 text-violet-700",
    admin: "bg-emerald-50 text-emerald-700",
  };
  const isPreview = actualTier === "admin" && tier !== "admin";

  return (
    <span
      className={`rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-wide ${styles[tier]}`}
    >
      {isPreview ? `Viewing ${tierLabel(tier)}` : tierLabel(tier)}
    </span>
  );
}

function AdminTierPreviewSelect({
  value,
  onChange,
}: {
  value: UserTier;
  onChange: (tier: UserTier) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-emerald-700">
      <span>View as</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as UserTier)}
        className="rounded-full border border-emerald-200 bg-white px-2 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-700 outline-none"
      >
        <option value="admin">Admin</option>
        <option value="free">Free</option>
        <option value="scout">Explorer</option>
        <option value="pro">Researcher</option>
      </select>
    </label>
  );
}

function AdminAccessModal({
  settings,
  onChange,
  onClose,
}: {
  settings: TierVisibilitySettings;
  onChange: (settings: TierVisibilitySettings) => void;
  onClose: () => void;
}) {
  const [selectedTier, setSelectedTier] = useState<TierAssignable>("scout");

  function setAccess(tier: TierAssignable, key: string, value: boolean) {
    onChange({
      ...settings,
      [tier]: {
        ...settings[tier],
        [key]: value,
      },
    });
  }

  function setAll(tier: TierAssignable, value: boolean) {
    onChange({
      ...settings,
      [tier]: Object.fromEntries(getAccessSettingKeys().map((key) => [key, value])),
    } as TierVisibilitySettings);
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="max-h-[85vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-emerald-600">
              Admin only
            </p>
            <h2 className="mt-1 text-2xl font-black">Tier Visibility Panel</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Choose which cards are visible to Free, Explorer, and Researcher
              users. Each card can also expose its own dedicated options, such
              as 7D, Month, 3M, list views, search, or template rerolls. Admin
              always sees every card and option.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-500"
          >
            Close
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <ToggleGroup>
            {CONFIGURABLE_TIERS.map((tier) => (
              <ToggleButton
                key={tier}
                active={selectedTier === tier}
                onClick={() => setSelectedTier(tier)}
                activeColor="#059669"
              >
                {tierLabel(tier)}
              </ToggleButton>
            ))}
          </ToggleGroup>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAll(selectedTier, true)}
              className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-emerald-700"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => setAll(selectedTier, false)}
              className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-500"
            >
              Clear all
            </button>
          </div>
        </div>

        <AdminAccessSection
          title="Cards"
          items={ACCESS_ITEMS}
          selectedTier={selectedTier}
          settings={settings}
          onToggle={setAccess}
        />
      </div>
    </ModalShell>
  );
}

function AdminAccessSection({
  title,
  items,
  selectedTier,
  settings,
  onToggle,
}: {
  title: string;
  items: AccessItem[];
  selectedTier: TierAssignable;
  settings: TierVisibilitySettings;
  onToggle: (tier: TierAssignable, key: string, value: boolean) => void;
}) {
  return (
    <section className="mt-6">
      <h3 className="text-sm font-black uppercase tracking-wide text-slate-400">
        {title}
      </h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <label
            key={item.key}
            className="flex cursor-pointer gap-3 rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50"
          >
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-emerald-600"
              checked={Boolean(settings[selectedTier][item.key])}
              onChange={(event) =>
                onToggle(selectedTier, item.key, event.target.checked)
              }
            />
            <span>
              <span className="flex flex-wrap items-center gap-2 text-sm font-black text-slate-800">
                {item.label}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                  {item.platform}
                </span>
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                {item.description}
              </span>
              {item.options?.length ? (
                <span className="mt-3 grid gap-2">
                  {item.options.map((option) => {
                    const optionSettingKey = getAccessOptionKey(item.key, option.key);
                    return (
                      <span
                        key={option.key}
                        className="flex gap-2 rounded-xl bg-slate-50 px-3 py-2"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 h-3.5 w-3.5 accent-emerald-600"
                          checked={Boolean(settings[selectedTier][optionSettingKey])}
                          disabled={!settings[selectedTier][item.key]}
                          onChange={(event) =>
                            onToggle(selectedTier, optionSettingKey, event.target.checked)
                          }
                        />
                        <span>
                          <span className="block text-xs font-black text-slate-700">
                            {option.label}
                          </span>
                          <span className="block text-[11px] leading-4 text-slate-400">
                            {option.description}
                          </span>
                        </span>
                      </span>
                    );
                  })}
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}

function LockedAccessCard({
  itemKey,
  panel,
  title,
  description,
  previewType,
}: {
  itemKey: string;
  panel: string;
  title?: string;
  description?: string;
  previewType?: LockedPreviewType | "chart";
}) {
  const item = ACCESS_ITEMS.find((entry) => entry.key === itemKey);
  const label = title ?? item?.label ?? "Premium feature";
  const summary =
    description ??
    item?.description ??
    "This widget displays deeper research signals when enabled for your tier.";
  const type =
    previewType ??
    getLockedPreviewType(itemKey, label);

  return (
    <div
      className={`group/locked-card relative rounded-3xl border border-dashed p-5 opacity-75 grayscale ${panel}`}
      title="Upgrade to unlock"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {summary}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
          Upgrade to unlock
        </span>
      </div>
      <span className="pointer-events-none absolute right-4 top-12 z-30 rounded-full bg-slate-900 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white opacity-0 shadow-lg transition group-hover/locked-card:opacity-100">
        Upgrade to unlock
      </span>
      <LockedPreview type={type} />
    </div>
  );
}

type LockedPreviewType =
  | "bar"
  | "cardGrid"
  | "commonStructure"
  | "correlation"
  | "directionalMap"
  | "gameTemplate"
  | "genreTrend"
  | "heatmap"
  | "keyword"
  | "keywordCloud"
  | "line"
  | "pie"
  | "ringPie"
  | "researchCards"
  | "robloxArchetypes"
  | "singleArchetype"
  | "smallHeatmap"
  | "text"
  | "tileColors";

function getLockedPreviewType(itemKey: string, label: string): LockedPreviewType {
  if (/roblox_genres_trend/i.test(itemKey)) return "genreTrend";
  if (/roblox_keyword_cloud/i.test(itemKey)) return "keywordCloud";
  if (/roblox_common_structure/i.test(itemKey)) return "commonStructure";
  if (/roblox_archetypes/i.test(itemKey)) return "robloxArchetypes";
  if (/roblox_template_generator/i.test(itemKey)) return "gameTemplate";
  if (/roblox_correlation/i.test(itemKey)) return "correlation";
  if (/roblox_directional_map/i.test(itemKey)) return "directionalMap";
  if (/research_cards/i.test(itemKey)) return "researchCards";
  if (/roblox_subgenre_mix/i.test(itemKey)) return "ringPie";
  if (/tile_colors/i.test(itemKey)) return "tileColors";
  if (/keyword/i.test(itemKey)) return "keyword";
  if (/genre_mix|subgenre_mix|pie|mix/i.test(itemKey) || /genre mix|subgenre mix/i.test(label)) return "pie";
  if (/trend|over_time|label_trend|genre_presence/i.test(itemKey)) return "line";
  if (/directional_map/i.test(itemKey)) return "smallHeatmap";
  if (/activity_landscape/i.test(itemKey)) return "heatmap";
  if (/experience_cards|island_cards|top_games|trending_games/i.test(itemKey)) return "cardGrid";
  if (/structure|template|idea|signal|archetype|forecasting|data_source/i.test(itemKey)) return "text";
  return "bar";
}

function LockedPreview({ type }: { type: LockedPreviewType | "chart" }) {
  if (type === "genreTrend") {
    return (
      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full bg-slate-200 p-1">
            {["Top 25", "Top 50"].map((label) => (
              <span
                key={label}
                className="rounded-full px-4 py-2 text-xs font-black text-slate-400"
              >
                {label}
              </span>
            ))}
          </div>
          <div className="inline-flex rounded-full bg-slate-200 p-1">
            {["7D", "Month", "3M"].map((label) => (
              <span
                key={label}
                className="rounded-full px-4 py-2 text-xs font-black text-slate-400"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
        <svg className="h-44 w-full" viewBox="0 0 360 170" role="img" aria-label="Locked genre trend preview">
          <line x1="34" x2="344" y1="136" y2="136" stroke="#94a3b8" strokeWidth="2" />
          <line x1="34" x2="34" y1="16" y2="136" stroke="#94a3b8" strokeWidth="2" />
          {[44, 76, 108].map((y) => (
            <line key={y} x1="34" x2="344" y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="5 6" />
          ))}
          {[92, 150, 208, 266, 324].map((x) => (
            <line key={x} x1={x} x2={x} y1="16" y2="136" stroke="#e2e8f0" strokeDasharray="5 6" />
          ))}
          {[
            "42,118 94,96 146,104 198,62 250,78 336,38",
            "42,130 94,124 146,86 198,98 250,58 336,88",
            "42,102 94,112 146,68 198,74 250,112 336,52",
          ].map((points, index) => (
            <polyline
              key={points}
              points={points}
              fill="none"
              stroke={["#94a3b8", "#cbd5e1", "#64748b"][index]}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="6"
              opacity={index === 2 ? 0.45 : 0.8}
            />
          ))}
          <text x="4" y="20" fill="#94a3b8" fontSize="11" fontWeight="800">Y</text>
          <text x="326" y="160" fill="#94a3b8" fontSize="11" fontWeight="800">X</text>
        </svg>
      </div>
    );
  }

  if (type === "keywordCloud") {
    return (
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {["Title", "Description"].map((title) => (
          <div key={title} className="min-h-36 rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              {title}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {[
                ["Example", "text-2xl"],
                ["Signal", "text-xl"],
                ["Theme", "text-lg"],
                ["Keyword", "text-base"],
                ["Example", "text-sm"],
              ].map(([word, size], index) => (
                <span key={`${title}-${word}-${index}`} className={`${size} font-black text-slate-300`}>
                  {word}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "commonStructure") {
    return (
      <div className="mt-5 rounded-2xl bg-slate-50 p-5">
        <p className="text-sm font-bold leading-6 text-slate-400">
          A processed breakdown of captured game descriptions to help you
          structure yours.
        </p>
        <div className="mt-4 space-y-2">
          <div className="h-3 w-5/6 rounded-full bg-slate-200" />
          <div className="h-3 w-2/3 rounded-full bg-slate-100" />
          <div className="h-3 w-3/4 rounded-full bg-slate-100" />
        </div>
      </div>
    );
  }

  if (type === "robloxArchetypes") {
    return (
      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {[
          ["Median game", "Median Popular Type"],
          ["Average game", "Average Popular Type"],
          ["Outlier game", "Outlier Popular Type"],
        ].map(([kind, title]) => (
          <div key={kind} className="rounded-2xl bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
              {kind}
            </p>
            <h3 className="mt-2 text-sm font-black text-slate-400">{title}</h3>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="h-11 rounded-xl bg-slate-100" />
              <div className="h-11 rounded-xl bg-slate-100" />
              <div className="col-span-2 h-9 rounded-xl bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "singleArchetype") {
    return (
      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
        <div className="h-3 w-3/4 rounded-full bg-slate-200" />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="h-11 rounded-xl bg-slate-100" />
          <div className="h-11 rounded-xl bg-slate-100" />
          <div className="col-span-2 h-9 rounded-xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (type === "gameTemplate") {
    return (
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
            Template type
          </p>
          <div className="mt-4 grid gap-2">
            {["Mainstream type", "Uncommon type", "Leading set type", "Reroll"].map((label) => (
              <span key={label} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-400">
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
            Fictional experience card
          </p>
          <div className="mt-3 h-4 w-3/4 rounded-full bg-slate-200" />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="h-10 rounded-xl bg-slate-100" />
            <div className="h-10 rounded-xl bg-slate-100" />
            <div className="col-span-2 rounded-xl bg-slate-100 p-3">
              <div className="h-2.5 w-5/6 rounded-full bg-slate-200" />
              <div className="mt-2 h-2.5 w-2/3 rounded-full bg-slate-200" />
              <div className="mt-2 h-2.5 w-3/4 rounded-full bg-slate-200" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
          <p className="text-xs font-black text-slate-400">Readout</p>
          <div className="mt-4 space-y-2">
            <div className="h-3 w-5/6 rounded-full bg-slate-200" />
            <div className="h-3 w-2/3 rounded-full bg-slate-200" />
            <div className="h-12 rounded-xl bg-white/60" />
          </div>
        </div>
      </div>
    );
  }

  if (type === "correlation") {
    return (
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="h-9 w-32 rounded-full bg-slate-200" />
            <span className="h-9 w-32 rounded-full bg-slate-100" />
            <span className="h-9 w-24 rounded-full bg-slate-200" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {["Example genre", "Other genres"].map((label) => (
              <div key={label} className="rounded-2xl bg-white/70 p-3">
                <div className="mb-2 flex justify-between text-[10px] font-black uppercase tracking-wide text-slate-400">
                  <span>{label}</span>
                  <span>Avg</span>
                </div>
                <div className="relative h-28 rounded-xl bg-slate-100">
                  <div className="absolute inset-x-3 bottom-5 border-t-4 border-slate-300" />
                  {[20, 34, 52, 68, 82].map((left, index) => (
                    <span
                      key={left}
                      className="absolute h-2.5 w-2.5 rounded-full bg-slate-400/50"
                      style={{ left: `${left}%`, bottom: `${18 + index * 9}%` }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
            Readout
          </p>
          <div className="mt-4 space-y-2">
            <div className="h-3 w-5/6 rounded-full bg-slate-200" />
            <div className="h-3 w-2/3 rounded-full bg-slate-200" />
            <div className="h-16 rounded-xl bg-white/60" />
          </div>
        </div>
      </div>
    );
  }

  if (type === "directionalMap") {
    return (
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-3 md:grid-cols-2">
          {["Demand vs Saturation", "Velocity vs Saturation", "Demand vs Format"].map((title) => (
            <div key={title} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                {title}
              </p>
              <div className="mt-3 grid w-[40%] min-w-28 grid-cols-4 gap-1.5">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => (
                  <div
                    key={item}
                    className="aspect-square rounded-lg"
                    style={{ backgroundColor: ["#e2e8f0", "#cbd5e1", "#94a3b8"][item % 3] }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
            Research readout
          </p>
          <div className="mt-4 space-y-2">
            <div className="h-3 w-5/6 rounded-full bg-slate-200" />
            <div className="h-3 w-2/3 rounded-full bg-slate-200" />
            <div className="h-20 rounded-xl bg-white/60" />
          </div>
        </div>
      </div>
    );
  }

  if (type === "researchCards") {
    return (
      <div className="mt-5">
        <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-400">
          Unlock segment-specific research signals, recurring design cues, and
          caution notes for the selected game idea.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-xl font-bold text-slate-400">Research Signal</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-400">
              <li>Example dataset share for this idea profile.</li>
              <li>Example player activity mapped to the segment.</li>
              <li>Example signal strength for repeatable patterns.</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-xl font-bold text-slate-400">Design Cues</h3>
            <p className="mt-2 rounded-2xl bg-white/70 px-3 py-2 text-xs font-semibold leading-5 text-slate-400">
              Example cue readout appears here after unlock.
            </p>
            <div className="mt-4 grid grid-cols-[110px_1fr] items-center gap-4">
              <div className="relative h-24 w-24 rounded-full bg-[conic-gradient(#94a3b8_0_38%,#cbd5e1_38%_66%,#e2e8f0_66%_100%)]">
                <div className="absolute inset-8 rounded-full bg-slate-50" />
              </div>
              <div className="space-y-2">
                {[
                  ["Example", "38%"],
                  ["Signal", "28%"],
                  ["Theme", "34%"],
                ].map(([name, value]) => (
                  <div key={name} className="flex items-center justify-between gap-3 text-sm text-slate-400">
                    <span>{name}</span>
                    <span className="font-bold">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-xl font-bold text-slate-400">Warnings</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-400">
              <li>Example competition or low-signal caution.</li>
              <li>Example data limitation reminder.</li>
              <li>Example informational-use note.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (type === "pie") {
    return (
      <div className="mt-5 flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
        <div className="h-24 w-24 shrink-0 rounded-full bg-[conic-gradient(#94a3b8_0_42%,#cbd5e1_42%_73%,#e2e8f0_73%_100%)]" />
        <div className="flex-1 space-y-2">
          {[
            ["Example A", "42%"],
            ["Example B", "31%"],
            ["Example C", "27%"],
          ].map(([name, value]) => (
            <div key={name} className="flex items-center justify-between gap-3 text-xs font-bold text-slate-400">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                {name}
              </span>
              <span>{value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "ringPie") {
    return (
      <div className="mt-5 flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
        <div className="relative h-28 w-28 shrink-0 rounded-full bg-[conic-gradient(#94a3b8_0_34%,#cbd5e1_34%_58%,#e2e8f0_58%_82%,#f1f5f9_82%_100%)]">
          <div className="absolute inset-6 rounded-full bg-slate-50" />
        </div>
        <div className="flex-1 space-y-2">
          {[
            ["Example A", "34%"],
            ["Example B", "24%"],
            ["Example C", "24%"],
            ["Example D", "18%"],
          ].map(([name, value]) => (
            <div key={name} className="flex items-center justify-between gap-3 text-xs font-bold text-slate-400">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                {name}
              </span>
              <span>{value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "line") {
    return (
      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
        <svg className="h-36 w-full" viewBox="0 0 340 140" role="img" aria-label="Locked trend preview">
          <line x1="34" x2="324" y1="112" y2="112" stroke="#94a3b8" strokeWidth="2" />
          <line x1="34" x2="34" y1="12" y2="112" stroke="#94a3b8" strokeWidth="2" />
          {[24, 48, 72, 96].map((y) => (
            <line key={y} x1="34" x2="324" y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="5 6" />
          ))}
          {[54, 108, 162, 216, 270].map((x) => (
            <line key={x} x1={x + 28} x2={x + 28} y1="12" y2="112" stroke="#e2e8f0" strokeDasharray="5 6" />
          ))}
          <polyline
            points="42,92 96,76 150,84 204,54 258,64 318,34"
            fill="none"
            stroke="#94a3b8"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="7"
          />
          {[42, 96, 150, 204, 258, 318].map((x, index) => {
            const y = [92, 76, 84, 54, 64, 34][index];
            return <circle key={x} cx={x} cy={y} r="5" fill="#cbd5e1" />;
          })}
          <text x="6" y="18" fill="#94a3b8" fontSize="11" fontWeight="800">Y</text>
          <text x="318" y="134" fill="#94a3b8" fontSize="11" fontWeight="800">X</text>
        </svg>
        <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          Example trend unlocked with this tier
        </p>
      </div>
    );
  }

  if (type === "tileColors") {
    return (
      <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="grid grid-cols-[3rem_1fr] items-center gap-3">
            <div className="h-10 overflow-hidden rounded-xl border border-slate-200">
              <div className="h-1/2 bg-slate-400" />
              <div className="h-1/2 bg-slate-300" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400">Example Tile {item}</p>
              <p className="text-[11px] font-bold text-slate-400">Primary RGB 148, 163, 184</p>
              <p className="text-[11px] font-bold text-slate-300">Secondary RGB 203, 213, 225</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "keyword") {
    return (
      <div className="mt-5 flex min-h-32 flex-wrap items-center justify-center gap-3 rounded-2xl bg-slate-50 p-4">
        {[
          ["Example A", "text-2xl"],
          ["Signal", "text-xl"],
          ["Theme", "text-lg"],
          ["Example B", "text-base"],
          ["Format", "text-sm"],
          ["Example C", "text-sm"],
        ].map(([word, size]) => (
          <span key={word} className={`${size} font-black text-slate-300`}>
            {word}
          </span>
        ))}
      </div>
    );
  }

  if (type === "cardGrid") {
    return (
      <div className="mt-5 grid grid-cols-3 gap-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="rounded-2xl bg-slate-50 p-3">
            <div className="h-10 rounded-xl bg-slate-200" />
            <div className="mt-3 h-3 w-4/5 rounded-full bg-slate-200" />
            <div className="mt-2 h-3 w-2/3 rounded-full bg-slate-100" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="h-8 rounded-lg bg-slate-100" />
              <div className="h-8 rounded-lg bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "heatmap") {
    return (
      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((item) => (
            <div
              key={item}
              className="aspect-square rounded-xl"
              style={{ backgroundColor: ["#e2e8f0", "#cbd5e1", "#94a3b8"][item % 3] }}
            />
          ))}
        </div>
        <div className="mt-3 h-3 w-2/3 rounded-full bg-slate-200" />
      </div>
    );
  }

  if (type === "smallHeatmap") {
    return (
      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
        <div className="grid w-[40%] min-w-32 grid-cols-4 gap-1.5">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => (
            <div
              key={item}
              className="aspect-square rounded-lg"
              style={{ backgroundColor: ["#e2e8f0", "#cbd5e1", "#94a3b8"][item % 3] }}
            />
          ))}
        </div>
        <div className="mt-3 h-3 w-2/5 rounded-full bg-slate-200" />
      </div>
    );
  }

  if (type === "text") {
    return (
      <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4">
        <div className="h-3 w-5/6 rounded-full bg-slate-200" />
        <div className="h-3 w-2/3 rounded-full bg-slate-100" />
        <div className="h-3 w-3/4 rounded-full bg-slate-100" />
        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="rounded-xl bg-slate-100 p-3 text-[11px] font-black uppercase tracking-wide text-slate-300">
            Example A
          </div>
          <div className="rounded-xl bg-slate-100 p-3 text-[11px] font-black uppercase tracking-wide text-slate-300">
            Example B
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      <div className="h-3 w-2/3 rounded-full bg-slate-200" />
      <div className="flex h-28 items-end gap-2 rounded-2xl bg-slate-50 p-4">
        {[42, 68, 35, 84, 55, 73].map((height, index) => (
          <div
            key={index}
            className="flex-1 rounded-t bg-slate-200"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function LockedAccessSection({ itemKey, panel }: { itemKey: string; panel: string }) {
  return (
    <section className="mb-6">
      <LockedAccessCard itemKey={itemKey} panel={panel} />
    </section>
  );
}

function TermsModal({ onClose }: any) {
  const sections = [
    {
      title: "Independent research tool",
      body:
        "Snoutboard - UGC Research Dashboard is an independent research product that provides processed data summaries, interpreted signals, automated classifications, and creative research tools. It is not an official product, partner portal, agency service, marketplace, or platform-operated analytics tool.",
    },
    {
      title: "No platform affiliation or endorsement",
      body:
        "Snoutboard is not affiliated with, endorsed by, sponsored by, certified by, approved by, or operated by Roblox, Epic Games, Fortnite, or any related platform owner. Platform names, game names, island names, experience names, thumbnails, labels, and other references are used only to identify the source context of the processed research data.",
    },
    {
      title: "Informational use only",
      body:
        "The dashboard does not provide legal, financial, investment, business, production, publishing, or professional advice. It does not guarantee revenue, profit, player growth, audience retention, discoverability, platform placement, publishing success, or any specific creative or business result. Users are solely responsible for their own creative, production, publishing, investment, and business decisions.",
    },
    {
      title: "Processed and interpreted data",
      body:
        "Displayed information is processed from available source data and may be incomplete, delayed, inferred, automatically classified, experimental, or inaccurate. Scores, maps, labels, source positions, trend lines, and forecasts are Snoutboard research signals only and should be independently reviewed before use.",
    },
    {
      title: "No raw source redistribution",
      body:
        "Snoutboard users may not misuse, scrape, bulk export, resell, redistribute, or present Snoutboard outputs as official platform data, guaranteed business advice, or a substitute for reviewing the original platform source. Access is intended for viewing processed dashboard research, not for obtaining a raw data feed.",
    },
    {
      title: "All access tiers",
      body:
        "These terms apply to all users and access types, including newsletter subscribers, trial users, paid users, Explorer users, Researcher users, and admin/internal users. Newsletter content is also informational and does not provide business advice, official platform guidance, or guaranteed outcomes.",
    },
    {
      title: "Beta product",
      body:
        "Snoutboard is currently in beta. Features, data sources, calculations, labels, pricing, and tier access may change as the product develops. Continued use of the dashboard means you understand these limitations.",
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
        "A processed dashboard field showing the latest stored concurrent player count for a Roblox experience when that metric is available from the captured source data.",
    },
    {
      title: "Source position",
      body:
        "A processed dashboard field showing the position captured from a source list or imported source order. It should not be read as an official popularity ranking unless the source explicitly provides that meaning.",
    },
    {
      title: "Focused source set",
      body:
        "A processed and filtered view of entries selected from imported source data for the active platform. The set is used for research comparisons inside Snoutboard.",
    },
    {
      title: "Data capture coverage",
      body:
        "A processed completeness score: the share of expected source and dashboard fields captured across the current dataset. Missing expected fields reduce the score. This measures field completeness, not whether an interpretation or classification is correct.",
    },
    {
      title: "Heuristic fallback",
      body:
        "A processed classification label shown when source taxonomy is unavailable and Snoutboard estimates classification from title, description, source context, or stored metadata.",
    },
    {
      title: "Primary label",
      body:
        "A processed Fortnite field based on the first surfaced label captured from island metadata. It can suggest format, theme, or collaboration context, but it is not an official endorsement or partnership signal.",
    },
    {
      title: "IP / Collaboration signal",
      body:
        "A processed detection of a recognizable franchise, brand, or collaboration reference in labels, titles, or descriptions. It identifies textual context only and does not imply Snoutboard has any relationship with that rights holder.",
    },
    {
      title: "Directional research map",
      body:
        "A processed visual research aid that compares categories across interpreted signals. It is not an official platform tool, prediction, recommendation guarantee, or business instruction.",
    },
    {
      title: "Demand",
      body:
        "A processed and interpreted measure of player activity or audience concentration in a category based on available snapshot data.",
    },
    {
      title: "Saturation",
      body:
        "A processed and interpreted measure of how many imported games or islands occupy a similar category or format in the captured dataset.",
    },
    {
      title: "Estimated game format complexity",
      body:
        "A processed directional estimate of how complex a category or format appears from genre, subgenre, labels, and observed design patterns. It is not an official platform classification or engineering cost estimate.",
    },
    {
      title: "Prediction market signals",
      body:
        "Processed research-oriented signals that may help observe momentum, volatility, category concentration, and outlier behavior. They are informational only and do not predict or guarantee outcomes.",
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
              Short definitions for processed dashboard terms used across
              Roblox and Fortnite research views.
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

function ToggleButton({ active, onClick, children, activeColor, disabled = false }: any) {
  return (
    <span
      className="group/locked-toggle relative inline-flex"
      title={disabled ? "Upgrade to unlock" : undefined}
    >
      <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        className="rounded-full px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          backgroundColor: active && !disabled ? activeColor : "transparent",
          color: active && !disabled ? "white" : "#64748b",
        }}
      >
        {children}
      </button>
      {disabled ? (
        <span className="pointer-events-none absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white opacity-0 shadow-lg transition group-hover/locked-toggle:opacity-100">
          Upgrade to unlock
        </span>
      ) : null}
    </span>
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

function TopGamesTrend({ games, rankBand = "top", timeWindow = "7d" }: any) {
  const visibleGames = applyRankBand(games, rankBand);
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
                    Longest {limit}-item source-set streak: {row.streakFirstSeenLabel} -{" "}
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
            Multi-day {limit}-item source-set streaks are not available yet from captured source-position snapshots.
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
        metricLabel="Source-set snapshots"
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
    .slice(0, 10);

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
                {row.daysInChartLabel} in {row.rankLimit}-item source sets
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

function applyRankBand(items: any[], band: TrendRankBand) {
  const bandSize = Math.min(10, items.length);
  if (band === "top") return items.slice(0, bandSize);

  const start =
    band === "mid"
      ? Math.max(0, Math.floor((items.length - bandSize) / 2))
      : Math.max(0, items.length - bandSize);

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
        examples: [],
      };
    }

    map[key].count += 1;
    map[key].players += item.latestPlayers ?? 0;
    map[key].velocityTotal += item.playerGainPercent ?? 0;
    map[key].complexityTotal += complexityScore(item.build_complexity ?? "Medium");
    if (item.design_pattern) map[key].patterns.add(item.design_pattern);
    map[key].examples.push(item);
  });

  const values = Object.values(map);

  return values.map((item: any) => {
    return {
      ...item,
      examples: [...item.examples].sort(
        (a: any, b: any) => (b.latestPlayers ?? 0) - (a.latestPlayers ?? 0)
      ),
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
