"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Platform = "roblox" | "fortnite";

export default function Home() {
  const [activePlatform, setActivePlatform] = useState<Platform>("roblox");
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [robloxGames, setRobloxGames] = useState<any[]>([]);
  const [fortniteIslands, setFortniteIslands] = useState<any[]>([]);
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedSubgenre, setSelectedSubgenre] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: robloxData } = await supabase.from("games").select(`
        id,
        title,
        url,
        thumbnail_url,
        description,
        inferred_genre,
        inferred_subgenre,
        core_loop,
        monetization_style,
        session_type,
        build_complexity,
        game_metrics (
          date,
          current_players,
          visits,
          favorites
        )
      `);

      const formattedRoblox = (robloxData ?? []).map((game: any) => {
        const metrics = game.game_metrics ?? [];
        const latestMetric = metrics.sort(
          (a: any, b: any) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0];

        return { ...game, latestMetric };
      });

      formattedRoblox.sort(
        (a: any, b: any) =>
          (b.latestMetric?.current_players ?? 0) -
          (a.latestMetric?.current_players ?? 0)
      );

      const { data: fortniteData } = await supabase
        .from("fortnite_islands")
        .select(`
          id,
          island_code,
          title,
          creator_name,
          url,
          raw_latest,
          fortnite_island_snapshots (
            created_at,
            raw_payload
          )
        `);

      const formattedFortnite = (fortniteData ?? []).map((island: any) => {
        const snapshots = island.fortnite_island_snapshots ?? [];
        const latestSnapshot = snapshots.sort(
          (a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        return {
          ...island,
          raw: island.raw_latest ?? latestSnapshot?.raw_payload ?? {},
        };
      });

      setRobloxGames(formattedRoblox);
      setFortniteIslands(formattedFortnite);
      setLoading(false);
    }

    fetchData();
  }, []);

  const activeColor = activePlatform === "roblox" ? "#4F8DFD" : "#7C3AED";

  const robloxGenres = useMemo(() => {
    return Array.from(
      new Set(robloxGames.map((g) => g.inferred_genre ?? "Unclassified"))
    ).sort();
  }, [robloxGames]);

  const robloxSubgenres = useMemo(() => {
    return Array.from(
      new Set(
        robloxGames
          .filter((g) => !selectedGenre || g.inferred_genre === selectedGenre)
          .map((g) => g.inferred_subgenre ?? "General")
      )
    ).sort();
  }, [robloxGames, selectedGenre]);

  const robloxTrendData = useMemo(() => {
    const byDate: Record<string, number> = {};

    robloxGames.forEach((game) => {
      (game.game_metrics ?? []).forEach((m: any) => {
        const date = m.date ?? "Unknown";
        byDate[date] = (byDate[date] ?? 0) + (m.current_players ?? 0);
      });
    });

    return Object.entries(byDate)
      .map(([date, players]) => ({ date, players }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-12);
  }, [robloxGames]);

  const robloxHeatItems = useMemo(() => {
    const map: Record<string, { players: number; count: number }> = {};

    robloxGames.forEach((game) => {
      const key = game.inferred_genre ?? "Unclassified";
      if (!map[key]) map[key] = { players: 0, count: 0 };
      map[key].players += game.latestMetric?.current_players ?? 0;
      map[key].count += 1;
    });

    return Object.entries(map).map(([label, value]) => ({
      label,
      x: Math.min(90, 15 + value.players / 500),
      y: Math.min(90, 20 + value.count * 8),
      note: `${value.players.toLocaleString()} players across ${
        value.count
      } games`,
      selected: label === selectedGenre,
    }));
  }, [robloxGames, selectedGenre]);

  const fortniteTags = useMemo(() => {
    const counts: Record<string, number> = {};
    fortniteIslands.forEach((island) => {
      (island.raw?.tags ?? []).forEach((tag: string) => {
        counts[tag] = (counts[tag] ?? 0) + 1;
      });
    });

    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [fortniteIslands]);

  const fortniteCategories = useMemo(() => {
    return Array.from(
      new Set(fortniteIslands.map((i) => i.raw?.category ?? "Unclassified"))
    ).sort();
  }, [fortniteIslands]);

  const fortniteHeatItems = useMemo(() => {
    return fortniteTags.slice(0, 12).map((item, index) => ({
      label: item.tag,
      x: 12 + index * 7,
      y: Math.min(90, 20 + item.count * 12),
      note: `${item.count} appearances`,
      selected: item.tag === selectedSubgenre,
    }));
  }, [fortniteTags, selectedSubgenre]);

  const selectedRobloxGames = robloxGames.filter((game) => {
    const genreMatch = !selectedGenre || game.inferred_genre === selectedGenre;
    const subMatch =
      !selectedSubgenre || game.inferred_subgenre === selectedSubgenre;
    return genreMatch && subMatch;
  });

  const selectedFortniteIslands = fortniteIslands.filter((island) => {
    const categoryMatch =
      !selectedGenre || island.raw?.category === selectedGenre;
    const tagMatch =
      !selectedSubgenre || island.raw?.tags?.includes(selectedSubgenre);
    return categoryMatch && tagMatch;
  });

  const currentSelection =
    activePlatform === "roblox" ? selectedRobloxGames : selectedFortniteIslands;

  const recommendations = buildRecommendations(
    activePlatform,
    selectedGenre,
    selectedSubgenre,
    currentSelection
  );

  return (
    <main className="min-h-screen bg-[#eef0f4] p-6 text-[#242832]">
      <div className="mx-auto max-w-7xl rounded-[32px] bg-white p-8 shadow-sm">
        {showDisclaimer && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p>
              <strong>Informational use only.</strong> UGC Intel provides
              directional market signals and does not guarantee creator,
              business, revenue, discovery, or engagement outcomes.
            </p>
            <button
              onClick={() => setShowDisclaimer(false)}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold hover:bg-white"
            >
              Dismiss
            </button>
          </div>
        )}

        <header className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              UGC Intel — Beta
            </p>
            <h1 className="mt-1 text-4xl font-bold tracking-tight">
              Creator Trend Intelligence
            </h1>
            <p className="mt-2 max-w-3xl text-slate-500">
              Compare platform-specific signals, explore opportunity zones, and
              test game ideas using live imported marketplace data.
            </p>
          </div>

          <div className="flex rounded-full bg-slate-100 p-1">
            <button
              onClick={() => {
                setActivePlatform("roblox");
                setSelectedGenre("");
                setSelectedSubgenre("");
              }}
              className={`rounded-full px-5 py-2 text-sm font-bold ${
                activePlatform === "roblox"
                  ? "bg-[#4F8DFD] text-white"
                  : "text-slate-500"
              }`}
            >
              Roblox
            </button>
            <button
              onClick={() => {
                setActivePlatform("fortnite");
                setSelectedGenre("");
                setSelectedSubgenre("");
              }}
              className={`rounded-full px-5 py-2 text-sm font-bold ${
                activePlatform === "fortnite"
                  ? "bg-[#7C3AED] text-white"
                  : "text-slate-500"
              }`}
            >
              Fortnite
            </button>
          </div>
        </header>

        {loading ? (
          <p className="text-slate-500">Loading data...</p>
        ) : (
          <>
            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <KpiCard
                label={
                  activePlatform === "roblox"
                    ? "Experiences Imported"
                    : "Islands Imported"
                }
                value={
                  activePlatform === "roblox"
                    ? robloxGames.length
                    : fortniteIslands.length
                }
              />
              <KpiCard
                label="Primary Signal"
                value={
                  activePlatform === "roblox"
                    ? "Current Players"
                    : "Tags + Categories"
                }
              />
              <KpiCard
                label="Analysis Mode"
                value={
                  activePlatform === "roblox"
                    ? "Performance"
                    : "Metadata"
                }
              />
            </div>

            <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6">
              <div className="mb-4">
                <h2 className="text-2xl font-bold">Trends Over Time</h2>
                <p className="text-sm text-slate-500">
                  {activePlatform === "roblox"
                    ? "Roblox trend movement is based on player-count snapshots stored over time."
                    : "Fortnite time-series performance is pending. Current imported endpoint provides island metadata, not engagement history."}
                </p>
              </div>

              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={
                      activePlatform === "roblox"
                        ? robloxTrendData
                        : mockFortniteTrend()
                    }
                  >
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={activeColor} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={activeColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey={activePlatform === "roblox" ? "players" : "items"}
                      stroke={activeColor}
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="mb-6 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-6">
                <h2 className="text-2xl font-bold">Opportunity Heat Map</h2>
                <p className="mt-1 text-sm text-slate-500">
                  The map is directional. It shows where demand or visibility
                  appears concentrated, not guaranteed success.
                </p>

                <HeatMap
                  color={activeColor}
                  items={
                    activePlatform === "roblox"
                      ? robloxHeatItems
                      : fortniteHeatItems
                  }
                />
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6">
                <h2 className="text-2xl font-bold">My game is...</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Select a category and subcategory to position your concept on
                  the current landscape.
                </p>

                <div className="mt-6 space-y-4">
                  <select
                    value={selectedGenre}
                    onChange={(e) => {
                      setSelectedGenre(e.target.value);
                      setSelectedSubgenre("");
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
                  >
                    <option value="">
                      {activePlatform === "roblox"
                        ? "Select genre"
                        : "Select category"}
                    </option>
                    {(activePlatform === "roblox"
                      ? robloxGenres
                      : fortniteCategories
                    ).map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedSubgenre}
                    onChange={(e) => setSelectedSubgenre(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
                  >
                    <option value="">
                      {activePlatform === "roblox"
                        ? "Select subgenre"
                        : "Select tag"}
                    </option>
                    {(activePlatform === "roblox"
                      ? robloxSubgenres
                      : fortniteTags.map((t) => t.tag)
                    ).map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-500">
                    Current readout
                  </p>
                  <p className="mt-2 text-lg font-bold">
                    {selectedGenre || selectedSubgenre
                      ? `${currentSelection.length} matching ${
                          activePlatform === "roblox" ? "experiences" : "islands"
                        }`
                      : "Select an idea profile"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {explainSelection(
                      activePlatform,
                      selectedGenre,
                      selectedSubgenre,
                      currentSelection
                    )}
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="text-2xl font-bold">Recommendations</h2>
              <p className="mt-1 text-sm text-slate-500">
                These recommendations are derived from current imported signals
                and should be treated as directional prompts, not predictions.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {recommendations.map((rec) => (
                  <div
                    key={rec.title}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <p
                      className="text-sm font-bold uppercase"
                      style={{ color: activeColor }}
                    >
                      {rec.level}
                    </p>
                    <h3 className="mt-2 text-lg font-bold">{rec.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {rec.text}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="text-2xl font-bold">
                {activePlatform === "roblox"
                  ? "Top Roblox Experiences"
                  : "Fortnite Islands"}
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {(activePlatform === "roblox"
                  ? robloxGames
                  : fortniteIslands
                )
                  .slice(0, 9)
                  .map((item: any) => (
                    <a
                      key={item.id}
                      href={
                        item.url ??
                        `https://fortnite.gg/island?code=${item.island_code}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <h3 className="font-bold">{item.title ?? "Untitled"}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {activePlatform === "roblox"
                          ? `${item.inferred_genre ?? "Unclassified"} · ${
                              item.inferred_subgenre ?? "General"
                            }`
                          : item.raw?.creatorCode ?? "Unknown creator"}
                      </p>
                    </a>
                  ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function KpiCard({ label, value }: any) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function HeatMap({ items, color }: any) {
  return (
    <div className="relative mt-6 h-[420px] rounded-2xl border border-slate-200 bg-slate-50">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#dfe3ea_1px,transparent_1px),linear-gradient(to_bottom,#dfe3ea_1px,transparent_1px)] bg-[size:25%_25%]" />

      <div className="absolute left-4 top-4 text-xs font-semibold text-slate-400">
        Higher opportunity proxy
      </div>
      <div className="absolute bottom-4 right-4 text-xs font-semibold text-slate-400">
        Higher demand / visibility
      </div>

      <div className="absolute left-1/2 top-0 h-full border-l border-dashed border-slate-300" />
      <div className="absolute top-1/2 left-0 w-full border-t border-dashed border-slate-300" />

      {items.map((item: any) => (
        <div
          key={item.label}
          className={`absolute rounded-full border-4 text-center text-[11px] font-bold shadow-md ${
            item.selected ? "border-slate-900" : "border-white"
          }`}
          style={{
            left: `${item.x}%`,
            bottom: `${item.y}%`,
            width: item.selected ? 72 : 58,
            height: item.selected ? 72 : 58,
            backgroundColor: color,
            color: "white",
            transform: "translate(-50%, 50%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 6,
          }}
          title={item.note}
        >
          {item.label.slice(0, 12)}
        </div>
      ))}
    </div>
  );
}

function buildRecommendations(
  platform: Platform,
  genre: string,
  subgenre: string,
  matches: any[]
) {
  const label = genre || subgenre || "this area";

  if (!genre && !subgenre) {
    return [
      {
        level: "Start here",
        title: "Pick a category",
        text: "Choose a genre and subgenre to generate recommendations from the current platform landscape.",
      },
      {
        level: "Data note",
        title: "Signals differ by platform",
        text: "Roblox uses player and classification signals. Fortnite currently uses metadata, category, and tag signals.",
      },
      {
        level: "Next action",
        title: "Compare examples",
        text: "Use the matching games or islands as reference points for format, theme, and audience positioning.",
      },
    ];
  }

  return [
    {
      level: matches.length > 5 ? "High signal" : "Emerging signal",
      title: `Explore ${label}`,
      text: `${matches.length} matching records were found. This suggests the area has visible platform activity and enough reference points to study.`,
    },
    {
      level: "Design cue",
      title: "Study repeatable patterns",
      text:
        platform === "roblox"
          ? "Look for repeated loops, monetization styles, and session formats across the matching Roblox games."
          : "Look for repeated tags, categories, and creator positioning across the matching Fortnite islands.",
    },
    {
      level: "Caution",
      title: "Watch saturation",
      text: "If many similar records exist, the opportunity may require a sharper twist, stronger theme, or clearer audience promise.",
    },
  ];
}

function explainSelection(
  platform: Platform,
  genre: string,
  subgenre: string,
  matches: any[]
) {
  if (!genre && !subgenre) {
    return "Use the dropdowns to test how a game concept fits into the current imported platform data.";
  }

  if (platform === "roblox") {
    const players = matches.reduce(
      (sum, g) => sum + (g.latestMetric?.current_players ?? 0),
      0
    );

    return `${genre || "Selected genre"} ${
      subgenre ? `/${subgenre}` : ""
    } currently maps to ${matches.length} imported Roblox experiences with roughly ${players.toLocaleString()} current players across the matched set.`;
  }

  return `${genre || "Selected category"} ${
    subgenre ? `/${subgenre}` : ""
  } currently maps to ${matches.length} imported Fortnite islands. This is a visibility and positioning signal, not a player-performance signal.`;
}

function mockFortniteTrend() {
  return [
    { date: "Batch 1", items: 20 },
    { date: "Batch 2", items: 40 },
    { date: "Batch 3", items: 60 },
    { date: "Batch 4", items: 80 },
    { date: "Batch 5", items: 100 },
  ];
}