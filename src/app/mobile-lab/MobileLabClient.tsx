"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  FortniteMobileLabPayload,
  MobileLabFortniteIsland,
  MobileLabGame,
  MobileLabPayload,
  MobileLabSeries,
  RobloxMobileLabPayload,
} from "@/lib/mobileLabTypes";

type Platform = "roblox" | "fortnite";

const ROBLOX_BLUE = "#0d69ac";
const FORTNITE_PURPLE = "#7c3aed";
const ROBLOX_SERIES_COLORS = ["#0d69ac", "#7c3aed", "#dc6b32", "#16845b", "#b34d70"];
const DISCLAIMER_STORAGE_KEY = "snoutboard-mobile-disclaimer";
const DASHBOARD_COPY_STORAGE_KEY = "snout-internal-dashboard-copy";

type MobileDisclaimerCopy = {
  mobileDisclaimerVersion: string;
  mobileDisclaimerTitle: string;
  mobileDisclaimerIndependence: string;
  mobileDisclaimerDataLimits: string;
  mobileDisclaimerOutcomes: string;
  mobileDisclaimerAcknowledgement: string;
  mobileDisclaimerRobloxButton: string;
  mobileDisclaimerFortniteButton: string;
  mobileDisclaimerStorageNote: string;
};

const DEFAULT_MOBILE_DISCLAIMER_COPY: MobileDisclaimerCopy = {
  mobileDisclaimerVersion: "2026-06-22-v1",
  mobileDisclaimerTitle: "Snoutboard Disclaimer",
  mobileDisclaimerIndependence:
    "Snoutboard is an independent research tool and is not affiliated with, endorsed by, sponsored by, or operated by Roblox, Epic Games, or Fortnite.",
  mobileDisclaimerDataLimits:
    "Displayed information is processed from captured public-source data and may be incomplete, delayed, estimated, or automatically classified. It is provided for creative research, not as legal, financial, investment, business, or professional advice.",
  mobileDisclaimerOutcomes:
    "Snoutboard does not guarantee player growth, discoverability, revenue, platform placement, or creator success. Independently verify information before relying on it.",
  mobileDisclaimerAcknowledgement:
    "By continuing, you acknowledge that you have read and understood this notice. Choose the platform you want to load.",
  mobileDisclaimerRobloxButton: "Acknowledge & Open Roblox",
  mobileDisclaimerFortniteButton: "Acknowledge & Open Fortnite",
  mobileDisclaimerStorageNote:
    "This acknowledgement is stored on this device and will be requested again if the notice is revised.",
};

function mergeMobileDisclaimerCopy(value: unknown): MobileDisclaimerCopy {
  if (!value || typeof value !== "object") return DEFAULT_MOBILE_DISCLAIMER_COPY;
  const source = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(DEFAULT_MOBILE_DISCLAIMER_COPY).map(([key, fallback]) => [
      key,
      typeof source[key] === "string" ? source[key] : fallback,
    ])
  ) as MobileDisclaimerCopy;
}

function compactNumber(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return new Intl.NumberFormat("en-US", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function shortDate(value: string | null) {
  if (!value) return "No snapshot date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(`${value}T12:00:00Z`)
  );
}

function latestPlayers(game: MobileLabGame) {
  return game.history.at(-1)?.players ?? 0;
}

function sevenDayDates(games: MobileLabGame[]) {
  return [...new Set(games.flatMap((game) => game.history.map((point) => point.date)))].sort().slice(-7);
}

function buildGameSeries(games: MobileLabGame[]): MobileLabSeries[] {
  const dates = sevenDayDates(games);
  return games.slice(0, 5).map((game, index) => {
    const byDate = new Map(game.history.map((point) => [point.date, point.players]));
    return {
      key: game.id,
      label: game.title,
      color: ROBLOX_SERIES_COLORS[index],
      points: dates.map((date) => ({ date, value: byDate.get(date) ?? 0 })),
    };
  });
}

function buildGenreSeries(games: MobileLabGame[]): MobileLabSeries[] {
  const dates = sevenDayDates(games);
  const totalsByGenre = new Map<string, number>();
  const dailyByGenre = new Map<string, Map<string, number>>();

  for (const game of games) {
    const byDate = new Map(game.history.map((point) => [point.date, point.players]));
    for (const date of dates) {
      const value = byDate.get(date) ?? 0;
      if (!value) continue;
      const daily = dailyByGenre.get(game.genre) ?? new Map<string, number>();
      daily.set(date, (daily.get(date) ?? 0) + value);
      dailyByGenre.set(game.genre, daily);
      totalsByGenre.set(game.genre, (totalsByGenre.get(game.genre) ?? 0) + value);
    }
  }

  return [...totalsByGenre.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre], index) => ({
      key: `genre-${genre}`,
      label: genre,
      color: ROBLOX_SERIES_COLORS[index],
      points: dates.map((date) => ({ date, value: dailyByGenre.get(genre)?.get(date) ?? 0 })),
    }));
}

function Card({ id, title, subtitle, children }: {
  id?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      <p className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SeriesChart({ series, valueSuffix = "" }: { series: MobileLabSeries[]; valueSuffix?: string }) {
  const dates = [...new Set(series.flatMap((item) => item.points.map((point) => point.date)))].sort();
  const allValues = series.flatMap((item) => item.points.map((point) => point.value));
  const max = Math.max(...allValues, 1);
  const width = 360;
  const height = 210;
  const left = 8;
  const top = 12;
  const plotWidth = width - 16;
  const plotHeight = height - 34;

  const pointFor = (date: string, value: number) => {
    const index = Math.max(0, dates.indexOf(date));
    const x = left + (dates.length <= 1 ? plotWidth / 2 : (index / (dates.length - 1)) * plotWidth);
    const y = top + plotHeight - (value / max) * plotHeight;
    return `${x},${y}`;
  };

  if (!series.length || !dates.length) {
    return <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">No seven-day series is available yet.</div>;
  }

  return (
    <div>
      <div className="overflow-hidden rounded-2xl bg-slate-50 p-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Seven-day trend lines">
          {[0, 1, 2, 3].map((line) => {
            const y = top + (line / 3) * plotHeight;
            return <line key={line} x1={left} x2={width - left} y1={y} y2={y} stroke="#d9e2ec" strokeDasharray="4 5" />;
          })}
          {series.map((item) => {
            const points = item.points.map((point) => pointFor(point.date, point.value));
            return <polyline key={item.key} points={points.join(" ")} fill="none" stroke={item.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />;
          })}
          <text x={left} y={height - 5} fill="#94a3b8" fontSize="10">{shortDate(dates[0] ?? null)}</text>
          <text x={width - left} y={height - 5} fill="#94a3b8" fontSize="10" textAnchor="end">{shortDate(dates.at(-1) ?? null)}</text>
        </svg>
      </div>
      <div className="mt-4 grid gap-2">
        {series.map((item) => (
          <div key={item.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-2 overflow-hidden font-bold text-slate-700">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="block min-w-0 truncate">{item.label}</span>
            </span>
            <span className="shrink-0 font-black text-slate-900">
              {compactNumber(item.points.at(-1)?.value)}{valueSuffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RobloxIdeaTool({ games }: { games: MobileLabGame[] }) {
  const eligibleGames = useMemo(() => games.filter((game) => latestPlayers(game) >= 100000), [games]);
  const [genre, setGenre] = useState("");
  const [subgenre, setSubgenre] = useState("");
  const genres = useMemo(
    () => [...new Set(eligibleGames.map((game) => game.genre))].filter((label) => !label.startsWith("Estimated ")).sort(),
    [eligibleGames]
  );
  const subgenres = useMemo(
    () => [...new Set(eligibleGames.filter((game) => !genre || game.genre === genre).map((game) => game.subgenre))]
      .filter((label) => !label.startsWith("Estimated ")).sort(),
    [eligibleGames, genre]
  );
  const matches = useMemo(
    () => eligibleGames
      .filter((game) => (!genre || game.genre === genre) && (!subgenre || game.subgenre === subgenre))
      .sort((a, b) => latestPlayers(b) - latestPlayers(a)),
    [eligibleGames, genre, subgenre]
  );

  return (
    <Card id="mobile-idea" title="My Game Idea Is" subtitle="Only genres represented by an experience with at least 100K captured players are included.">
      <div className="grid gap-3">
        <select
          value={genre}
          onChange={(event) => { setGenre(event.target.value); setSubgenre(""); }}
          className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800"
        >
          <option value="">Select a genre</option>
          {genres.map((option) => <option key={option}>{option}</option>)}
        </select>
        <select
          value={subgenre}
          onChange={(event) => setSubgenre(event.target.value)}
          className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800"
        >
          <option value="">Select a subgenre</option>
          {subgenres.map((option) => <option key={option}>{option}</option>)}
        </select>
      </div>

      {genre ? (
        <div className="mt-4 rounded-2xl bg-[#0d69ac]/8 p-4">
          <p className="text-xs font-black uppercase text-[#0d69ac]">Research signal</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {matches.length} experience{matches.length === 1 ? "" : "s"} above the 100K threshold match {genre}{subgenre ? ` / ${subgenre}` : ""}.
          </p>
          <div className="mt-4 space-y-2">
            {matches.slice(0, 3).map((game) => (
              <div key={game.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900">{game.title}</p>
                  <p className="mt-1 truncate text-xs font-bold text-slate-500">{game.genre} / {game.subgenre}</p>
                </div>
                <span className="shrink-0 text-xs font-black text-[#0d69ac]">{compactNumber(latestPlayers(game))}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-5 text-sm leading-6 text-slate-500">
          Choose a qualifying genre to reveal comparable high-activity experiences.
        </div>
      )}
    </Card>
  );
}

function RobloxCards({ games }: { games: MobileLabGame[] }) {
  return (
    <Card id="mobile-records" title="Top 10 Roblox Experiences" subtitle="Ranked by the latest stored current-player snapshot.">
      <div className="grid gap-3">
        {games.slice(0, 10).map((game, index) => (
          <a key={game.id} href={game.url || undefined} target={game.url ? "_blank" : undefined} rel={game.url ? "noreferrer" : undefined} className="grid grid-cols-[5.25rem_1fr] gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-inherit no-underline">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-200">
              {game.thumbnailUrl ? <img src={game.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}
              <span className="absolute left-1.5 top-1.5 rounded-full bg-white/90 px-2 py-1 text-[10px] font-black text-slate-700">#{index + 1}</span>
            </div>
            <div className="min-w-0 self-center">
              <h3 className="line-clamp-2 text-sm font-black leading-tight text-slate-900">{game.title}</h3>
              <p className="mt-2 truncate text-xs font-bold text-slate-500">{game.genre} / {game.subgenre}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span><b className="text-slate-900">{compactNumber(latestPlayers(game))}</b> players</span>
                <span><b className="text-slate-900">{game.likeRatio == null ? "N/A" : `${Math.round(game.likeRatio * (game.likeRatio <= 1 ? 100 : 1))}%`}</b> likes</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </Card>
  );
}

function FortniteCards({ islands }: { islands: MobileLabFortniteIsland[] }) {
  return (
    <Card id="mobile-records" title="10 Latest Imported Fortnite Islands" subtitle="A metadata sample from the latest captured source collection; this is not a popularity ranking.">
      <div className="grid gap-3">
        {islands.slice(0, 10).map((island) => (
          <a key={island.id} href={island.url || undefined} target={island.url ? "_blank" : undefined} rel={island.url ? "noreferrer" : undefined} className="grid grid-cols-[5.25rem_1fr] gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-inherit no-underline">
            <div className="aspect-[4/3] overflow-hidden rounded-xl bg-slate-200">
              {island.thumbnailUrl ? <img src={island.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}
            </div>
            <div className="min-w-0 self-center">
              <h3 className="line-clamp-2 text-sm font-black leading-tight text-slate-900">{island.title}</h3>
              <p className="mt-2 truncate text-xs font-bold text-slate-500">{island.genre} / {island.subgenre}</p>
              <p className="mt-2 truncate text-xs font-black text-violet-700">{island.labels.slice(0, 3).join(" · ") || "No labels captured"}</p>
            </div>
          </a>
        ))}
      </div>
    </Card>
  );
}

function DisclaimerText({ copy }: { copy: MobileDisclaimerCopy }) {
  return (
    <div className="space-y-3 text-sm leading-6 text-slate-600">
      <p>{copy.mobileDisclaimerIndependence}</p>
      <p>{copy.mobileDisclaimerDataLimits}</p>
      <p>{copy.mobileDisclaimerOutcomes}</p>
    </div>
  );
}

function EntryDisclaimer({ copy, onAccept }: { copy: MobileDisclaimerCopy; onAccept: (platform: Platform) => void }) {
  return (
    <main className="min-h-screen bg-slate-100 px-3 py-6 text-slate-900">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/LogoSnoutBoard.svg" alt="Snoutboard" className="h-12 w-12 object-contain" />
          <div>
            <p className="text-[11px] font-black uppercase text-emerald-700">Mobile research brief</p>
            <h1 className="mt-1 text-xl font-black leading-tight">{copy.mobileDisclaimerTitle}</h1>
          </div>
        </div>
        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <DisclaimerText copy={copy} />
        </div>
        <p className="mt-5 text-sm font-bold leading-6 text-slate-700">
          {copy.mobileDisclaimerAcknowledgement}
        </p>
        <div className="mt-5 grid gap-3">
          <button type="button" onClick={() => onAccept("roblox")} className="min-h-12 rounded-xl bg-[#0d69ac] px-4 text-sm font-black text-white">
            {copy.mobileDisclaimerRobloxButton}
          </button>
          <button type="button" onClick={() => onAccept("fortnite")} className="min-h-12 rounded-xl bg-[#7c3aed] px-4 text-sm font-black text-white">
            {copy.mobileDisclaimerFortniteButton}
          </button>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-400">
          {copy.mobileDisclaimerStorageNote}
        </p>
      </div>
    </main>
  );
}

function LoadingBrief({ platform }: { platform: Platform }) {
  const color = platform === "roblox" ? ROBLOX_BLUE : FORTNITE_PURPLE;
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-black uppercase" style={{ color }}>Loading {platform} research data</p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-2/3 animate-pulse rounded-full" style={{ backgroundColor: color }} />
      </div>
      <p className="mt-4 text-sm text-slate-500">Preparing the seven-day mobile brief...</p>
    </section>
  );
}

export default function MobileLabClient() {
  const [platform, setPlatform] = useState<Platform>("roblox");
  const [acknowledged, setAcknowledged] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [mobileCopy, setMobileCopy] = useState<MobileDisclaimerCopy>(
    DEFAULT_MOBILE_DISCLAIMER_COPY
  );
  const [payloads, setPayloads] = useState<Partial<Record<Platform, MobileLabPayload>>>({});
  const [loadingPlatform, setLoadingPlatform] = useState<Platform | null>(null);
  const [loadError, setLoadError] = useState("");
  const robloxPayload = payloads.roblox as RobloxMobileLabPayload | undefined;
  const fortnitePayload = payloads.fortnite as FortniteMobileLabPayload | undefined;
  const games = robloxPayload?.games ?? [];
  const gameSeries = useMemo(() => buildGameSeries(games), [games]);
  const genreSeries = useMemo(() => buildGenreSeries(games), [games]);

  async function requestPlatform(nextPlatform: Platform) {
    setPlatform(nextPlatform);
    setLoadError("");
    if (payloads[nextPlatform]) return;

    setLoadingPlatform(nextPlatform);
    try {
      const response = await fetch(`/api/mobile-lab/data?platform=${nextPlatform}`);
      if (!response.ok) throw new Error(`Data request failed with ${response.status}`);
      const payload = (await response.json()) as MobileLabPayload;
      setPayloads((current) => ({ ...current, [nextPlatform]: payload }));
    } catch (error: any) {
      setLoadError(error?.message ?? "Mobile research data could not load");
    } finally {
      setLoadingPlatform(null);
    }
  }

  useEffect(() => {
    let resolvedCopy = DEFAULT_MOBILE_DISCLAIMER_COPY;
    try {
      const storedCopy = window.localStorage.getItem(DASHBOARD_COPY_STORAGE_KEY);
      if (storedCopy) {
        resolvedCopy = mergeMobileDisclaimerCopy(JSON.parse(storedCopy));
        setMobileCopy(resolvedCopy);
      }

      const stored = window.localStorage.getItem(DISCLAIMER_STORAGE_KEY);
      if (stored) {
        const acknowledgement = JSON.parse(stored);
        if (acknowledgement.version === resolvedCopy.mobileDisclaimerVersion) {
          const savedPlatform: Platform = acknowledgement.platform === "fortnite" ? "fortnite" : "roblox";
          setAcknowledged(true);
          setPlatform(savedPlatform);
          void requestPlatform(savedPlatform);
        }
      }
    } catch {
      window.localStorage.removeItem(DISCLAIMER_STORAGE_KEY);
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== DASHBOARD_COPY_STORAGE_KEY || !event.newValue) return;
      try {
        const nextCopy = mergeMobileDisclaimerCopy(JSON.parse(event.newValue));
        setMobileCopy(nextCopy);
        const acknowledgement = window.localStorage.getItem(DISCLAIMER_STORAGE_KEY);
        if (!acknowledgement || JSON.parse(acknowledgement)?.version !== nextCopy.mobileDisclaimerVersion) {
          setAcknowledged(false);
          setPayloads({});
        }
      } catch {
        setMobileCopy(DEFAULT_MOBILE_DISCLAIMER_COPY);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  function acceptDisclaimer(nextPlatform: Platform) {
    window.localStorage.setItem(
      DISCLAIMER_STORAGE_KEY,
      JSON.stringify({
        version: mobileCopy.mobileDisclaimerVersion,
        platform: nextPlatform,
        acknowledgedAt: new Date().toISOString(),
      })
    );
    setAcknowledged(true);
    setShowDisclaimer(false);
    void requestPlatform(nextPlatform);
  }

  function changePlatform(nextPlatform: Platform) {
    try {
      const stored = window.localStorage.getItem(DISCLAIMER_STORAGE_KEY);
      const acknowledgement = stored ? JSON.parse(stored) : {};
      window.localStorage.setItem(
        DISCLAIMER_STORAGE_KEY,
        JSON.stringify({ ...acknowledgement, version: mobileCopy.mobileDisclaimerVersion, platform: nextPlatform })
      );
    } catch {
      // Platform switching still works if local storage is unavailable.
    }
    void requestPlatform(nextPlatform);
  }

  if (!acknowledged) return <EntryDisclaimer copy={mobileCopy} onAccept={acceptDisclaimer} />;

  const accent = platform === "roblox" ? ROBLOX_BLUE : FORTNITE_PURPLE;
  const latestDate =
    (platform === "roblox" ? robloxPayload?.latestDate : fortnitePayload?.latestDate) ?? null;

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 text-slate-900">
      <div className="mx-auto max-w-md">
        <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <img src="/LogoSnoutBoard.svg" alt="Snoutboard" className="h-12 w-12 object-contain" />
            <div>
              <p className="text-[11px] font-black uppercase text-emerald-700">Experimental mobile server</p>
              <h1 className="mt-1 text-xl font-black leading-tight">Snoutboard Mobile Lab</h1>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 rounded-full bg-slate-100 p-1">
            {(["roblox", "fortnite"] as Platform[]).map((option) => {
              const active = platform === option;
              const color = option === "roblox" ? ROBLOX_BLUE : FORTNITE_PURPLE;
              return (
                <button key={option} type="button" onClick={() => changePlatform(option)} className="min-h-11 rounded-full text-sm font-black capitalize transition" style={{ backgroundColor: active ? color : "transparent", color: active ? "white" : "#64748b" }}>
                  {option}
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-600">
            A focused seven-day mobile brief. Latest {platform === "roblox" ? "player" : "metadata"} snapshot: <b>{shortDate(latestDate)}</b>.
          </p>
          <button type="button" onClick={() => setShowDisclaimer((current) => !current)} className="mt-3 text-xs font-black text-slate-500 underline decoration-slate-300 underline-offset-4">
            {showDisclaimer ? "Close disclaimer" : "Review disclaimer"}
          </button>
          <nav className={`mt-4 grid gap-2 text-xs font-black ${platform === "roblox" ? "grid-cols-3" : "grid-cols-2"}`}>
            <a href="#mobile-over-time" className="rounded-xl px-2 py-3 text-center" style={{ backgroundColor: `${accent}14`, color: accent }}>Over time</a>
            {platform === "roblox" ? <a href="#mobile-idea" className="rounded-xl px-2 py-3 text-center" style={{ backgroundColor: `${accent}14`, color: accent }}>My game idea</a> : null}
            <a href="#mobile-records" className="rounded-xl px-2 py-3 text-center" style={{ backgroundColor: `${accent}14`, color: accent }}>Latest 10</a>
          </nav>
        </header>

        {showDisclaimer ? (
          <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">Disclaimer &amp; Acknowledgement</h2>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4"><DisclaimerText copy={mobileCopy} /></div>
          </section>
        ) : null}

        <div className="mt-4 space-y-4">
          {loadingPlatform === platform && !payloads[platform] ? (
            <LoadingBrief platform={platform} />
          ) : loadError && !payloads[platform] ? (
            <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">Data could not load</h2>
              <p className="mt-2 text-sm text-slate-500">{loadError}</p>
              <button type="button" onClick={() => requestPlatform(platform)} className="mt-4 min-h-11 rounded-xl px-4 text-sm font-black text-white" style={{ backgroundColor: accent }}>Try again</button>
            </section>
          ) : platform === "roblox" && robloxPayload ? (
            <>
              <Card id="mobile-over-time" title="Most Played Games Over Time" subtitle="Five leading experiences across the latest seven captured days.">
                <SeriesChart series={gameSeries} />
              </Card>
              <Card title="Most Played Genres Over Time" subtitle="Genre-level player curves across the latest seven captured days.">
                <SeriesChart series={genreSeries} />
              </Card>
              <RobloxIdeaTool games={games} />
              <RobloxCards games={games} />
            </>
          ) : platform === "fortnite" && fortnitePayload ? (
            <>
              <Card id="mobile-over-time" title="Primary Label Usage Over Time" subtitle="Unique imported islands carrying each primary label across seven captured days.">
                <SeriesChart series={fortnitePayload.labelSeries} valueSuffix=" islands" />
              </Card>
              <Card title="Estimated Genre Presence Over Time" subtitle="Unique imported islands grouped by estimated format across seven captured days.">
                <SeriesChart series={fortnitePayload.genreSeries} valueSuffix=" islands" />
              </Card>
              <FortniteCards islands={fortnitePayload.islands} />
            </>
          ) : null}
        </div>

        <footer className="py-8 text-center text-xs leading-5 text-slate-500">
          Experimental route only. The existing dashboard and mobile printout are unchanged.
        </footer>
      </div>
    </main>
  );
}
