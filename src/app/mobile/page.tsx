import { getMobilePublicPayload } from "@/lib/mobilePublicPayload";
import type { MobileLabGame, MobileLabSeries } from "@/lib/mobileLabTypes";

export const revalidate = 300;

const ROBLOX_BLUE = "#0d69ac";
const FORTNITE_PURPLE = "#7c3aed";

function formatNumber(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  const magnitude = Math.abs(value);
  return new Intl.NumberFormat("en-US", {
    notation: magnitude >= 10000 ? "compact" : "standard",
    maximumFractionDigits: magnitude >= 10000 ? 1 : 0,
  }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "latest snapshot";
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function averagePlayers(game: MobileLabGame) {
  const values = game.history.slice(-7).map((point) => point.players);
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function sevenDayPlayerDelta(game: MobileLabGame) {
  const values = game.history.slice(-7);
  const latest = values.at(-1)?.players;
  const previous = values.at(0)?.players;
  if (typeof latest !== "number" || typeof previous !== "number" || values.length < 2) {
    return null;
  }
  return latest - previous;
}

function Card({
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
      {subtitle ? <p className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DisclaimerGate() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900">
      <div className="mx-auto max-w-md rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <header className="flex items-center gap-3">
          <img src="/LogoSnoutBoard.svg" alt="" aria-hidden="true" className="h-12 w-12 object-contain" />
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-emerald-700">
              Mobile research brief
            </p>
            <h1 className="mt-1 text-xl font-black leading-tight">
              Snoutboard - UGC Research Dashboard
            </h1>
            <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
              Beta
            </span>
          </div>
        </header>

        <section className="mt-5 rounded-3xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          <p>
            Snoutboard is an independent research tool. The dashboard processes
            stored public API data for creative research and market exploration.
          </p>
          <p className="mt-3">
            The information may be partial, estimated, delayed, or interpreted.
            It is not business, financial, legal, or production advice and does
            not guarantee that any game idea will succeed.
          </p>
          <p className="mt-3">
            Snoutboard is not affiliated with, endorsed by, sponsored by,
            certified by, approved by, or operated by Roblox, Epic Games,
            Fortnite, or any related platform owner.
          </p>
        </section>

        <a
          href="/mobile?ack=1"
          className="mt-5 flex min-h-12 items-center justify-center rounded-2xl bg-[#0d69ac] px-4 text-center text-sm font-black uppercase tracking-wide text-white no-underline shadow-sm"
        >
          Acknowledge and check the data
        </a>
      </div>
    </main>
  );
}

function MetricRow({
  label,
  value,
  accent = ROBLOX_BLUE,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50 p-3">
      <span className="text-sm font-bold leading-5 text-slate-600">{label}</span>
      <span className="shrink-0 text-sm font-black" style={{ color: accent }}>
        {value}
      </span>
    </div>
  );
}

function RobloxGameList({ games }: { games: MobileLabGame[] }) {
  return (
    <div className="space-y-3">
      {games.map((game, index) => (
        <div key={game.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black text-slate-400">#{index + 1}</p>
              <h3 className="mt-1 text-base font-black leading-5 text-slate-900">{game.title}</h3>
            </div>
            <p className="shrink-0 text-sm font-black text-[#0d69ac]">
              {formatNumber(averagePlayers(game))}
            </p>
          </div>
          <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
            {game.genre} / {game.subgenre}
          </p>
        </div>
      ))}
    </div>
  );
}

function RobloxTrendingList({ games }: { games: MobileLabGame[] }) {
  return (
    <div className="space-y-3">
      {games.map((game) => {
        const delta = sevenDayPlayerDelta(game) ?? 0;
        const positive = delta >= 0;
        return (
          <div key={game.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div>
              <h3 className="text-sm font-black leading-5 text-slate-900">{game.title}</h3>
              <p className="mt-1 text-xs font-bold text-slate-500">
                Player change across the past 7 captured days
              </p>
            </div>
            <p className={`shrink-0 text-sm font-black ${positive ? "text-emerald-600" : "text-rose-500"}`}>
              {positive ? "+" : ""}
              {formatNumber(delta)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function SeriesLineChart({
  series,
  accent,
}: {
  series: MobileLabSeries[];
  accent: string;
}) {
  const maxValue = Math.max(
    1,
    ...series.flatMap((item) => item.points.map((point) => point.value))
  );

  if (!series.length) {
    return (
      <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
        No seven-day series is available yet.
      </p>
    );
  }

  const width = 320;
  const height = 180;
  const padding = { top: 18, right: 18, bottom: 32, left: 30 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const allDates = [...new Set(series.flatMap((item) => item.points.map((point) => point.date)))]
    .sort()
    .slice(-7);
  const xForDate = (date: string) => {
    const index = Math.max(0, allDates.indexOf(date));
    if (allDates.length <= 1) return padding.left + chartWidth;
    return padding.left + (index / (allDates.length - 1)) * chartWidth;
  };
  const yForValue = (value: number) =>
    padding.top + chartHeight - (value / maxValue) * chartHeight;

  return (
    <div>
      <div className="overflow-hidden rounded-3xl bg-slate-50 p-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Seven-day Fortnite line graph">
          {[0, 0.5, 1].map((step) => {
            const y = padding.top + chartHeight - step * chartHeight;
            return (
              <line
                key={step}
                x1={padding.left}
                x2={padding.left + chartWidth}
                y1={y}
                y2={y}
                stroke="#dbe3ef"
                strokeDasharray="5 5"
                strokeWidth="1"
              />
            );
          })}
          {allDates.map((date) => (
            <line
              key={date}
              x1={xForDate(date)}
              x2={xForDate(date)}
              y1={padding.top}
              y2={padding.top + chartHeight}
              stroke="#eef2f7"
              strokeWidth="1"
            />
          ))}
          <text x={padding.left} y={height - 10} className="fill-slate-400 text-[10px] font-bold">
            {formatDate(allDates[0])}
          </text>
          <text x={padding.left + chartWidth} y={height - 10} textAnchor="end" className="fill-slate-400 text-[10px] font-bold">
            {formatDate(allDates.at(-1))}
          </text>
          <text x={padding.left - 6} y={padding.top + 4} textAnchor="end" className="fill-slate-400 text-[10px] font-bold">
            {formatNumber(maxValue)}
          </text>
          <text x={padding.left - 6} y={padding.top + chartHeight} textAnchor="end" className="fill-slate-400 text-[10px] font-bold">
            0
          </text>
          {series.map((item, index) => {
            const points = item.points
              .filter((point) => allDates.includes(point.date))
              .map((point) => `${xForDate(point.date)},${yForValue(point.value)}`)
              .join(" ");
            return (
              <polyline
                key={item.key}
                points={points}
                fill="none"
                stroke={item.color || accent}
                strokeWidth={index === 0 ? 4 : 3}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={index === 0 ? 1 : 0.72}
              />
            );
          })}
          {series.map((item) =>
            item.points
              .filter((point) => allDates.includes(point.date))
              .map((point) => (
                <circle
                  key={`${item.key}-${point.date}`}
                  cx={xForDate(point.date)}
                  cy={yForValue(point.value)}
                  r="3"
                  fill={item.color || accent}
                  stroke="white"
                  strokeWidth="1.5"
                />
              ))
          )}
        </svg>
      </div>
      <div className="mt-4 space-y-2">
        {series.map((item) => {
          const latest = item.points.at(-1);
          return (
            <div key={item.key} className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color || accent }}
                />
                <span className="truncate text-xs font-black text-slate-700">
                  {item.label}
                </span>
              </div>
              <span className="shrink-0 text-xs font-black text-slate-500">
                {formatNumber(latest?.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BottomButtons() {
  return (
    <section className="mt-5 grid gap-3">
      <a
        href="#"
        className="rounded-2xl bg-[#0d69ac] px-4 py-4 text-center text-white no-underline shadow-sm"
      >
        <span className="block text-[11px] font-bold opacity-75">
          Book time with a data expert
        </span>
        <span className="mt-0.5 block text-sm font-black uppercase tracking-wide">
          Data Strategy Session
        </span>
      </a>
      <a
        href="#"
        className="rounded-2xl bg-[#f96854] px-4 py-4 text-center text-white no-underline shadow-sm"
      >
        <span className="block text-[11px] font-bold opacity-75">
          Support the research
        </span>
        <span className="mt-0.5 block text-sm font-black uppercase tracking-wide">
          Patreon
        </span>
      </a>
    </section>
  );
}

export default async function MobileDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  if (params.ack !== "1") return <DisclaimerGate />;

  const mobilePayload = await getMobilePublicPayload();
  const robloxPayload = mobilePayload.roblox;
  const fortnitePayload = mobilePayload.fortnite;

  const topRoblox = [...robloxPayload.games]
    .sort((a, b) => averagePlayers(b) - averagePlayers(a))
    .slice(0, 5);
  const trendingRoblox = [...robloxPayload.games]
    .filter((game) => sevenDayPlayerDelta(game) !== null)
    .sort((a, b) => Math.abs(sevenDayPlayerDelta(b) ?? 0) - Math.abs(sevenDayPlayerDelta(a) ?? 0))
    .slice(0, 5);
  const generatedAt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 text-slate-900">
      <div className="mx-auto max-w-md rounded-[32px] border border-slate-200 bg-white/80 p-5">
        <header className="flex items-center gap-3">
          <img src="/LogoSnoutBoard.svg" alt="" aria-hidden="true" className="h-11 w-11 object-contain" />
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-emerald-700">
              Mobile research brief
            </p>
            <h1 className="text-xl font-black leading-tight">
              Snoutboard - UGC Research Dashboard
            </h1>
            <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
              Beta
            </span>
          </div>
        </header>

        <section className="mt-5 rounded-[28px] border border-[#0d69ac]/20 bg-[#0d69ac]/5 p-5">
          <p className="text-[11px] font-black uppercase tracking-wide text-[#0d69ac]">
            Daily printout
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            Lightweight mobile data check
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            A simplified seven-day scan: Roblox visibility and movement, plus
            Fortnite metadata signals from the latest imported public API data.
          </p>
          <p className="mt-3 text-xs font-black uppercase tracking-wide text-slate-400">
            Generated {generatedAt}
          </p>
        </section>

        <div className="mt-5 space-y-4">
          <Card
            title="Roblox Top 5 Experiences"
            subtitle="Highest average player activity across the past 7 captured days."
          >
            <RobloxGameList games={topRoblox} />
          </Card>

          <Card
            title="Roblox Trending Games"
            subtitle="Largest gain or loss in player count across the past 7 captured days."
          >
            <RobloxTrendingList games={trendingRoblox} />
          </Card>

          <Card
            title="Fortnite Estimated Genre Mix Over Time"
            subtitle="Seven-day printout of unique imported islands grouped by estimated format."
          >
            <SeriesLineChart series={fortnitePayload.genreSeries} accent={FORTNITE_PURPLE} />
          </Card>

          <Card
            title="Fortnite Primary Label Usage"
            subtitle="Seven-day printout of unique imported islands grouped by first captured label."
          >
            <SeriesLineChart series={fortnitePayload.labelSeries} accent={FORTNITE_PURPLE} />
          </Card>

          <Card title="Readout" subtitle="Mobile interpretation">
            <div className="space-y-3">
              <MetricRow
                label="Roblox experiences shown"
                value={`${topRoblox.length} current leaders`}
              />
              <MetricRow
                label="Roblox movement entries"
                value={`${trendingRoblox.length} signals`}
              />
              <MetricRow
                label="Fortnite window"
                value="Past 7 captured days"
                accent={FORTNITE_PURPLE}
              />
            </div>
          </Card>
        </div>

        <BottomButtons />

        <footer className="mt-6 border-t border-slate-200 pt-4 text-center text-xs leading-5 text-slate-400">
          <p>
            SnoutBoard is a trademark product of Forgotten Diamond Software, LLC.
          </p>
          <p className="mt-2">
            Snoutboard is independent and is not affiliated with Roblox, Epic
            Games, Fortnite, or any related platform owner.
          </p>
          <p className="mt-2 font-bold">V0.01</p>
        </footer>
      </div>
    </main>
  );
}
