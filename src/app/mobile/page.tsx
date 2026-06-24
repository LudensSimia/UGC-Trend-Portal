import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type Platform = "roblox" | "fortnite";

type MobileRobloxGame = {
  id: string;
  title: string;
  url?: string | null;
  genre?: string | null;
  inferred_genre?: string | null;
  inferred_subgenre?: string | null;
  latestPlayers: number;
  previousPlayers: number | null;
  playerChange: number | null;
};

type MobileFortniteIsland = {
  id: string;
  island_code?: string | null;
  title: string;
  inferred_genre?: string | null;
  inferred_subgenre?: string | null;
  extracted_tags?: string[] | string | null;
};

function formatNumber(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return new Intl.NumberFormat("en-US", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: value >= 10000 ? 1 : 0,
  }).format(value);
}

function getGenre(item: MobileRobloxGame) {
  return item.genre || item.inferred_genre || "Estimated / Unclassified";
}

function getSubgenre(item: MobileRobloxGame) {
  return item.inferred_subgenre || "Estimated";
}

function getFortniteLabels(item: MobileFortniteIsland) {
  if (Array.isArray(item.extracted_tags)) return item.extracted_tags;
  if (typeof item.extracted_tags === "string") {
    return item.extracted_tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

async function getMobileData() {
  const supabase = createSupabaseServerClient();

  const [gamesResult, snapshotsResult, fortniteResult, qualityResult] =
    await Promise.all([
      supabase
        .from("games")
        .select("id,title,url,genre,inferred_genre,inferred_subgenre")
        .eq("platform", "roblox")
        .range(0, 999),
      supabase
        .from("roblox_chart_snapshots")
        .select("game_id,current_players,created_at,snapshot_date")
        .order("created_at", { ascending: false })
        .range(0, 2999),
      supabase
        .from("fortnite_islands")
        .select("id,island_code,title,inferred_genre,inferred_subgenre,extracted_tags")
        .order("title", { ascending: true })
        .range(0, 999),
      supabase
        .from("data_quality_snapshots")
        .select(
          "platform,total_records,classified_records,classification_coverage_percent,confidence_percent,created_at"
        )
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  if (gamesResult.error) {
    throw new Error(`Roblox mobile games failed: ${gamesResult.error.message}`);
  }
  if (snapshotsResult.error) {
    throw new Error(`Roblox mobile snapshots failed: ${snapshotsResult.error.message}`);
  }
  if (fortniteResult.error) {
    throw new Error(`Fortnite mobile islands failed: ${fortniteResult.error.message}`);
  }
  if (qualityResult.error) {
    throw new Error(`Mobile quality snapshots failed: ${qualityResult.error.message}`);
  }

  const snapshotsByGameId = new Map<string, any[]>();
  (snapshotsResult.data ?? []).forEach((snapshot: any) => {
    if (!snapshot.game_id) return;
    const existing = snapshotsByGameId.get(snapshot.game_id) ?? [];
    existing.push(snapshot);
    snapshotsByGameId.set(snapshot.game_id, existing);
  });

  const roblox = (gamesResult.data ?? [])
    .map((game: any) => {
      const snapshots = snapshotsByGameId.get(game.id) ?? [];
      const latest = snapshots[0];
      const previous = snapshots.find(
        (snapshot) => snapshot.snapshot_date !== latest?.snapshot_date
      );
      const latestPlayers = latest?.current_players ?? 0;
      const previousPlayers =
        typeof previous?.current_players === "number"
          ? previous.current_players
          : null;

      return {
        ...game,
        latestPlayers,
        previousPlayers,
        playerChange:
          previousPlayers === null ? null : latestPlayers - previousPlayers,
      };
    })
    .sort((a, b) => b.latestPlayers - a.latestPlayers);

  return {
    roblox,
    fortnite: (fortniteResult.data ?? []) as MobileFortniteIsland[],
    quality: qualityResult.data ?? [],
  };
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

function PlatformLink({
  platform,
  activePlatform,
  children,
}: {
  platform: Platform;
  activePlatform: Platform;
  children: React.ReactNode;
}) {
  const active = platform === activePlatform;
  return (
    <a
      href={`/mobile?platform=${platform}`}
      className={`flex-1 rounded-full px-4 py-3 text-center text-sm font-black capitalize transition ${
        active ? "text-white" : "text-slate-500"
      }`}
      style={{
        backgroundColor: active
          ? platform === "roblox"
            ? "#0d69ac"
            : "#7c3aed"
          : "transparent",
      }}
    >
      {children}
    </a>
  );
}

export default async function MobileDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const requestedPlatform = params.platform;
  const activePlatform: Platform =
    requestedPlatform === "fortnite" ? "fortnite" : "roblox";
  const { roblox, fortnite, quality } = await getMobileData();

  const robloxQuality = quality.find((item: any) => item.platform === "roblox");
  const fortniteQuality = quality.find((item: any) => item.platform === "fortnite");
  const topRoblox = roblox.slice(0, 5);
  const movementWatch = [...roblox]
    .filter((game) => typeof game.playerChange === "number")
    .sort((a, b) => Math.abs(b.playerChange ?? 0) - Math.abs(a.playerChange ?? 0))
    .slice(0, 3);
  const robloxGenres = [...roblox.reduce((map, item) => {
    const genre = getGenre(item);
    map.set(genre, (map.get(genre) ?? 0) + item.latestPlayers);
    return map;
  }, new Map<string, number>())]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const fortniteLabelCounts = [...fortnite.reduce((map, item) => {
    getFortniteLabels(item)
      .slice(0, 3)
      .forEach((label) => map.set(label, (map.get(label) ?? 0) + 1));
    return map;
  }, new Map<string, number>())]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
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
          <img
            src="/LogoSnoutBoard.svg"
            alt=""
            aria-hidden="true"
            className="h-11 w-11 object-contain"
          />
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-emerald-700">
              Mobile research brief
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

        <section className="mt-5 rounded-[28px] border border-[#0d69ac]/20 bg-[#0d69ac]/5 p-5">
          <p className="text-[11px] font-black uppercase tracking-wide text-[#0d69ac]">
            Daily printout
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            Quick UGC research pulse
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Static mobile summary generated from stored dashboard data. Use the
            desktop dashboard for full interactive analysis.
          </p>
          <p className="mt-3 text-xs font-black uppercase tracking-wide text-slate-400">
            Generated {generatedAt}
          </p>
        </section>

        <div className="mt-5 space-y-4">
          <MobileMetricCard title="Data Source & Health" subtitle="Server-rendered printout">
            <ul className="space-y-3 text-sm leading-6 text-slate-600">
              <li>
                Roblox records loaded:{" "}
                <strong className="text-slate-900">{formatNumber(roblox.length)}</strong>
              </li>
              <li>
                Fortnite records loaded:{" "}
                <strong className="text-slate-900">{formatNumber(fortnite.length)}</strong>
              </li>
              <li>
                Roblox data capture coverage:{" "}
                <strong className="text-slate-900">
                  {robloxQuality?.classification_coverage_percent ?? "N/A"}%
                </strong>
              </li>
              <li>
                Fortnite data capture coverage:{" "}
                <strong className="text-slate-900">
                  {fortniteQuality?.classification_coverage_percent ?? "N/A"}%
                </strong>
              </li>
            </ul>
          </MobileMetricCard>

          <MobileMetricCard
            title="Roblox: Top Experiences"
            subtitle="Latest stored player snapshot"
          >
            <div className="space-y-3">
              {topRoblox.map((game, index) => (
                <div
                  key={game.id}
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
                      {formatNumber(game.latestPlayers)}
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
            title="Roblox: Movement Watch"
            subtitle="Largest latest-vs-previous snapshot moves"
          >
            <div className="space-y-3">
              {movementWatch.map((game) => {
                const change = game.playerChange ?? 0;
                const positive = change >= 0;

                return (
                  <div
                    key={game.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        {game.title}
                      </h3>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {getGenre(game)} / {getSubgenre(game)}
                      </p>
                    </div>
                    <p
                      className={`shrink-0 text-sm font-black ${
                        positive ? "text-emerald-600" : "text-rose-500"
                      }`}
                    >
                      {positive ? "+" : ""}
                      {formatNumber(change)}
                    </p>
                  </div>
                );
              })}
            </div>
          </MobileMetricCard>

          <MobileMetricCard
            title="Roblox: Estimated Genre Mix"
            subtitle="Largest player concentrations in this printout"
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

          <MobileMetricCard
            title="Fortnite: Imported Islands"
            subtitle="Static metadata sample"
          >
            <div className="space-y-3">
              {fortnite.slice(0, 6).map((island) => (
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
            title="Fortnite: Primary Label Signals"
            subtitle="Deduplicated metadata terms"
          >
            <div className="flex flex-wrap gap-2">
              {fortniteLabelCounts.map(([label, count]) => (
                <span
                  key={label}
                  className="rounded-full bg-violet-50 px-3 py-2 text-xs font-black text-violet-700"
                >
                  {label} · {count}
                </span>
              ))}
            </div>
          </MobileMetricCard>

          <MobileMetricCard title="Readout" subtitle="Short interpretation">
            <ul className="space-y-3 text-sm leading-6 text-slate-600">
              <li>
                Roblox activity is concentrated around the top visible
                experiences and estimated genre clusters above.
              </li>
              <li>
                Fortnite mobile output focuses on metadata because the imported
                source should not be treated as a reliable popularity ranking.
              </li>
              <li>
                Use this mobile brief as a quick scan. Use desktop for deeper
                filtering, charts, maps, and idea exploration.
              </li>
            </ul>
          </MobileMetricCard>
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
