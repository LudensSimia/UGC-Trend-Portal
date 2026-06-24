"use client";

import { useEffect, useMemo, useState } from "react";

type Platform = "roblox" | "fortnite";

function formatNumber(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return new Intl.NumberFormat("en-US", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: value >= 10000 ? 1 : 0,
  }).format(value);
}

function getRobloxPlayers(item: any) {
  return (
    item?.roblox_chart_snapshots?.[0]?.current_players ??
    item?.game_metrics?.[0]?.current_players ??
    0
  );
}

function getGenre(item: any) {
  return item?.genre || item?.inferred_genre || "Estimated / Unclassified";
}

function getSubgenre(item: any) {
  return item?.inferred_subgenre || "Estimated";
}

function getFortniteLabels(item: any) {
  if (Array.isArray(item?.extracted_tags)) return item.extracted_tags;
  if (typeof item?.extracted_tags === "string") {
    return item.extracted_tags
      .split(",")
      .map((tag: string) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

function MobileLoadingCard({ progress, message }: { progress: number; message: string }) {
  const safeProgress = Math.max(5, Math.min(100, Math.round(progress)));

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
        Loading platform data
      </p>
      <h2 className="mt-2 text-2xl font-black text-slate-950">
        Preparing the mobile dashboard
      </h2>
      <div className="mt-5 flex items-end justify-between gap-3">
        <p className="text-sm font-bold text-slate-600">{message}</p>
        <p className="text-2xl font-black text-[#0d69ac]">{safeProgress}%</p>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[#0d69ac] transition-all duration-500"
          style={{ width: `${safeProgress}%` }}
        />
      </div>
    </section>
  );
}

function MobileMetricCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function MobileDashboardClient() {
  const [platform, setPlatform] = useState<Platform>("roblox");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(12);
  const [message, setMessage] = useState("Requesting compact mobile data...");
  const [roblox, setRoblox] = useState<any[]>([]);
  const [fortnite, setFortnite] = useState<any[]>([]);
  const [quality, setQuality] = useState<any[]>([]);

  useEffect(() => {
    let timer: number | null = window.setInterval(() => {
      setProgress((current) => Math.min(88, current + 6));
    }, 650);

    async function load() {
      try {
        setProgress(24);
        setMessage("Fetching compact dashboard payload...");
        const response = await fetch("/api/dashboard/data?compact=1");

        if (!response.ok) {
          throw new Error(`Dashboard data request failed with ${response.status}`);
        }

        setProgress(70);
        setMessage("Preparing mobile cards...");
        const payload = await response.json();
        setRoblox(payload.roblox ?? []);
        setFortnite(payload.fortnite ?? []);
        setQuality(payload.dataQualitySnapshots ?? []);
        setProgress(100);
      } catch (error) {
        console.error("Mobile dashboard data error:", error);
        setMessage("Mobile data could not load. Try refreshing the page.");
      } finally {
        if (timer) {
          window.clearInterval(timer);
          timer = null;
        }
        setLoading(false);
      }
    }

    load();

    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, []);

  const topRoblox = useMemo(() => {
    return [...roblox].sort((a, b) => getRobloxPlayers(b) - getRobloxPlayers(a)).slice(0, 5);
  }, [roblox]);

  const robloxGenres = useMemo(() => {
    const counts = new Map<string, number>();
    roblox.forEach((item) => {
      const players = getRobloxPlayers(item);
      const label = getGenre(item);
      counts.set(label, (counts.get(label) ?? 0) + players);
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [roblox]);

  const fortniteLabels = useMemo(() => {
    const counts = new Map<string, number>();
    fortnite.forEach((item) => {
      getFortniteLabels(item).slice(0, 3).forEach((label: string) => {
        counts.set(label, (counts.get(label) ?? 0) + 1);
      });
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [fortnite]);

  const activeQuality = quality.find((item) => item.platform === platform);
  const activeCount = platform === "roblox" ? roblox.length : fortnite.length;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 text-slate-900">
      <div className="mx-auto max-w-md rounded-[32px] border border-slate-200 bg-white/80 p-5">
        <header className="flex items-center gap-3">
          <img
            src="/LogoSnoutBoard.svg"
            alt=""
            aria-hidden="true"
            className="h-11 w-11 object-contain"
          />
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-emerald-700">
              Beta mobile view
            </p>
            <h1 className="text-xl font-black leading-tight">
              Snoutboard - UGC Research Dashboard
            </h1>
          </div>
        </header>

        <section className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          Snoutboard is an independent research tool. Data is processed for creative
          research and may be partial, estimated, or delayed. It is not affiliated
          with Roblox, Epic Games, or Fortnite, and it does not guarantee outcomes.
        </section>

        <div className="mt-5 flex rounded-full bg-slate-100 p-1">
          {(["roblox", "fortnite"] as Platform[]).map((option) => {
            const active = platform === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setPlatform(option)}
                className={`flex-1 rounded-full px-4 py-3 text-sm font-black capitalize transition ${
                  active ? "text-white" : "text-slate-500"
                }`}
                style={{
                  backgroundColor: active
                    ? option === "roblox"
                      ? "#0d69ac"
                      : "#7c3aed"
                    : "transparent",
                }}
              >
                {option}
              </button>
            );
          })}
        </div>

        <div className="mt-5 space-y-4">
          {loading ? (
            <MobileLoadingCard progress={progress} message={message} />
          ) : (
            <>
              <MobileMetricCard
                title="Data Source & Health"
                subtitle="Compact mobile payload"
              >
                <ul className="space-y-3 text-sm leading-6 text-slate-600">
                  <li>
                    <strong className="text-slate-900">{formatNumber(activeCount)}</strong>{" "}
                    records loaded for this mobile view.
                  </li>
                  <li>
                    Data capture coverage:{" "}
                    <strong className="text-slate-900">
                      {activeQuality?.classification_coverage_percent ?? "N/A"}%
                    </strong>
                  </li>
                  <li>
                    Source data is processed into dashboard research signals.
                  </li>
                </ul>
              </MobileMetricCard>

              {platform === "roblox" ? (
                <>
                  <MobileMetricCard
                    title="Top Roblox Experiences"
                    subtitle="Current compact snapshot"
                  >
                    <div className="space-y-3">
                      {topRoblox.map((game, index) => (
                        <div
                          key={game.id ?? game.title}
                          className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-black text-slate-400">
                                #{index + 1}
                              </p>
                              <h3 className="mt-1 text-base font-black text-slate-900">
                                {game.title}
                              </h3>
                            </div>
                            <p className="text-sm font-black text-[#0d69ac]">
                              {formatNumber(getRobloxPlayers(game))}
                            </p>
                          </div>
                          <p className="mt-2 text-xs font-bold text-slate-500">
                            {getGenre(game)} / {getSubgenre(game)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </MobileMetricCard>

                  <MobileMetricCard
                    title="Estimated Genre Mix"
                    subtitle="Largest player concentrations in the compact view"
                  >
                    <div className="space-y-3">
                      {robloxGenres.map(([genre, players]) => (
                        <div key={genre}>
                          <div className="flex justify-between gap-3 text-sm font-black">
                            <span>{genre}</span>
                            <span className="text-[#0d69ac]">{formatNumber(players)}</span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-[#0d69ac]"
                              style={{
                                width: `${Math.max(
                                  8,
                                  (players / Math.max(robloxGenres[0]?.[1] ?? 1, 1)) * 100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </MobileMetricCard>
                </>
              ) : (
                <>
                  <MobileMetricCard
                    title="Imported Fortnite Islands"
                    subtitle="Compact metadata view"
                  >
                    <div className="space-y-3">
                      {fortnite.slice(0, 10).map((island) => (
                        <div
                          key={island.id ?? island.island_code}
                          className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
                        >
                          <h3 className="text-base font-black text-slate-900">
                            {island.title}
                          </h3>
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {island.inferred_genre || "Estimated format"} /{" "}
                            {island.inferred_subgenre || "Estimated subformat"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </MobileMetricCard>

                  <MobileMetricCard
                    title="Primary Label Signals"
                    subtitle="Deduplicated compact metadata terms"
                  >
                    <div className="flex flex-wrap gap-2">
                      {fortniteLabels.map(([label, count]) => (
                        <span
                          key={label}
                          className="rounded-full bg-violet-50 px-3 py-2 text-xs font-black text-violet-700"
                        >
                          {label} · {count}
                        </span>
                      ))}
                    </div>
                  </MobileMetricCard>
                </>
              )}
            </>
          )}
        </div>

        <footer className="mt-6 border-t border-slate-200 pt-4 text-center text-xs leading-5 text-slate-400">
          <p>
            SnoutBoard is a trademark product of Forgotten Diamond Software, LLC.
          </p>
          <p className="mt-2 font-bold">V0.01</p>
        </footer>
      </div>
    </main>
  );
}
