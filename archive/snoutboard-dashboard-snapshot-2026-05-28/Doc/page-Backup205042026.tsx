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
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Platform = "roblox" | "fortnite";
type TrendMode = "game" | "genre" | "emerging";

export default function Home() {
  const [activePlatform, setActivePlatform] = useState<Platform>("roblox");
  const [trendMode, setTrendMode] = useState<TrendMode>("game");
  const [darkMode, setDarkMode] = useState(false);

  const [robloxGames, setRobloxGames] = useState<any[]>([]);
  const [fortniteIslands, setFortniteIslands] = useState<any[]>([]);

  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedSubgenre, setSelectedSubgenre] = useState("");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: robloxData } = await supabase.from("games").select(`
        id,title,url,thumbnail_url,inferred_genre,inferred_subgenre,
        game_metrics(date,current_players,visits,favorites)
      `);

      const formatted = (robloxData ?? []).map((g: any) => {
        const latest = (g.game_metrics ?? []).sort(
          (a: any, b: any) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0];
        return { ...g, latestMetric: latest };
      });

      formatted.sort(
        (a: any, b: any) =>
          (b.latestMetric?.current_players ?? 0) -
          (a.latestMetric?.current_players ?? 0)
      );

      setRobloxGames(formatted);

      const { data: fortniteData } = await supabase
        .from("fortnite_islands")
        .select(`id,title,island_code,raw_latest`);

      setFortniteIslands(fortniteData ?? []);

      setLoading(false);
    }

    fetchData();
  }, []);

  const bg = darkMode ? "bg-[#0f1115] text-white" : "bg-[#eef0f4] text-[#1e293b]";
  const card = darkMode ? "bg-[#1a1d24] border-[#2a2f3a]" : "bg-white border-slate-200";

  // ---------------- KPI DATA ----------------

  const todayCount = robloxGames.length;
  const last5 = [60, 70, 75, 80, todayCount];

  const topGames = robloxGames.slice(0, 3);
  const topGenres = Object.values(
    robloxGames.reduce((acc: any, g) => {
      const key = g.inferred_genre || "Other";
      acc[key] = (acc[key] || 0) + (g.latestMetric?.current_players ?? 0);
      return acc;
    }, {})
  ).slice(0, 3);

  const trendingGame = robloxGames[0];

  // ---------------- TREND DATA ----------------

  const trendData = useMemo(() => {
    return robloxGames
      .flatMap((g) =>
        (g.game_metrics ?? []).map((m: any) => ({
          date: m.date,
          players: m.current_players,
        }))
      )
      .slice(-20);
  }, [robloxGames]);

  // ---------------- SEARCH ENGINE ----------------

  const filtered = robloxGames.filter(
    (g) =>
      (!selectedGenre || g.inferred_genre === selectedGenre) &&
      (!selectedSubgenre || g.inferred_subgenre === selectedSubgenre)
  );

  const totalPlayers = filtered.reduce(
    (sum, g) => sum + (g.latestMetric?.current_players ?? 0),
    0
  );

  const percent = Math.round(
    (filtered.length / Math.max(robloxGames.length, 1)) * 100
  );

  const top3 = filtered.slice(0, 3);

  // ---------------- UI ----------------

  return (
    <main className={`min-h-screen p-6 ${bg}`}>
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Creator Trend Intelligence</h1>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="px-4 py-2 rounded-xl border text-sm"
          >
            {darkMode ? "Light" : "Dark"}
          </button>
        </div>

        {/* KPI ROW */}
        <div className="grid grid-cols-4 gap-4 mb-6">

          {/* KPI 1 */}
          <div className={`p-4 rounded-2xl border ${card}`}>
            <p className="text-sm">Games Queried</p>
            <h2 className="text-2xl font-bold">{todayCount}</h2>

            <div className="flex gap-1 mt-3">
              {last5.map((v, i) => (
                <div
                  key={i}
                  className="w-2 bg-blue-400"
                  style={{ height: v / 2 }}
                />
              ))}
            </div>
          </div>

          {/* KPI 2 */}
          <div className={`p-4 rounded-2xl border ${card}`}>
            <p className="text-sm">Top Games</p>
            {topGames.map((g: any) => (
              <div key={g.id} className="text-sm mt-1">
                {g.title}
              </div>
            ))}
          </div>

          {/* KPI 3 */}
          <div className={`p-4 rounded-2xl border ${card}`}>
            <p className="text-sm">Top Genres</p>
            {topGenres.map((v: any, i) => (
              <div key={i} className="text-sm mt-1">
                {v}
              </div>
            ))}
          </div>

          {/* KPI 4 */}
          <div className={`p-4 rounded-2xl border ${card}`}>
            <p className="text-sm">Trending Game</p>
            <h2 className="text-lg font-bold">
              {trendingGame?.title}
            </h2>
            <p className="text-green-500 text-sm">+12% ▲</p>
          </div>
        </div>

        {/* TREND BLOCK */}
        <div className={`p-6 rounded-2xl border ${card} mb-6`}>
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-bold">Trends Over Time</h2>

            <div className="flex gap-2">
              {["game", "genre", "emerging"].map((m) => (
                <button
                  key={m}
                  onClick={() => setTrendMode(m as any)}
                  className={`px-3 py-1 rounded ${
                    trendMode === m ? "bg-blue-500 text-white" : ""
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area dataKey="players" stroke="#4F8DFD" fill="#4F8DFD" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* HEAT MAP + SEARCH */}
        <div className="grid grid-cols-2 gap-6 mb-6">

          {/* HEAT MAP */}
          <div className={`p-6 rounded-2xl border ${card}`}>
            <h2 className="text-xl font-bold mb-4">Opportunity Map</h2>

            <div className="grid grid-cols-4 gap-1">
              {[...Array(16)].map((_, i) => (
                <div
                  key={i}
                  className="h-16"
                  style={{
                    background:
                      i < 4
                        ? "#34d399"
                        : i < 8
                        ? "#facc15"
                        : i < 12
                        ? "#fb923c"
                        : "#f87171",
                  }}
                />
              ))}
            </div>

            <p className="text-xs mt-3">
              Opportunity proxy combines player concentration and repeatability.
            </p>
          </div>

          {/* SEARCH */}
          <div className={`p-6 rounded-2xl border ${card}`}>
            <h2 className="text-xl font-bold">My game idea is</h2>

            <select
              className="w-full mt-3 p-2 border rounded"
              onChange={(e) => setSelectedGenre(e.target.value)}
            >
              <option>Select genre</option>
              {[...new Set(robloxGames.map((g) => g.inferred_genre))].map(
                (g: any) => (
                  <option key={g}>{g}</option>
                )
              )}
            </select>

            <select
              className="w-full mt-3 p-2 border rounded"
              onChange={(e) => setSelectedSubgenre(e.target.value)}
            >
              <option>Select subgenre</option>
              {[...new Set(robloxGames.map((g) => g.inferred_subgenre))].map(
                (g: any) => (
                  <option key={g}>{g}</option>
                )
              )}
            </select>

            <div className="mt-4 text-sm">
              This combination makes {percent}% of experiences and represents a
              pool of {totalPlayers.toLocaleString()} players.
            </div>

            <div className="mt-3">
              Top similar games:{" "}
              {top3.map((g) => g.title).join(", ")}
            </div>
          </div>
        </div>

        {/* RECOMMENDATIONS */}
        <div className="grid grid-cols-3 gap-4 mb-6">

          <div className={`p-4 rounded-2xl border ${card}`}>
            <h3 className="font-bold">Opportunity</h3>
            <p className="text-sm">
              +12% growth vs last week. Consider exploring similar subgenres.
            </p>
          </div>

          <div className={`p-4 rounded-2xl border ${card}`}>
            <h3 className="font-bold">Design Cues</h3>
            <PieChart width={150} height={150}>
              <Pie
                data={[{ value: 40 }, { value: 30 }, { value: 30 }]}
                dataKey="value"
              >
                <Cell fill="#4F8DFD" />
                <Cell fill="#22c55e" />
                <Cell fill="#f97316" />
              </Pie>
            </PieChart>
          </div>

          <div className={`p-4 rounded-2xl border ${card}`}>
            <h3 className="font-bold">Warnings</h3>
            <p className="text-sm">
              This type of game is played by less than 10% of players.
            </p>
          </div>
        </div>

        {/* TOP GAMES STOCK STYLE */}
        <div className="grid grid-cols-5 gap-4 mb-10">
          {robloxGames.slice(0, 10).map((g) => (
            <div key={g.id} className={`p-4 rounded-2xl border ${card}`}>
              <h3 className="font-bold text-sm">{g.title}</h3>

              {g.thumbnail_url && (
                <img src={g.thumbnail_url} className="mt-2 rounded" />
              )}

              <p className="text-green-500 mt-2">+5.2%</p>
              <p className="text-xs">52W H 120K</p>
              <p className="text-xs">#1 Trending</p>
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <div className="h-20" />
      </div>
    </main>
  );
}