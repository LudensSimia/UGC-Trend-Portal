import type { WidgetKey } from "@/lib/entitlements";

export type PlatformKey = "roblox" | "fortnite";
export type NewsletterEditionKey = "daily_creator_digest" | "weekly_market_brief";
export type NewsletterFrequency = "daily" | "weekly";

export type NewsletterEdition = {
  key: NewsletterEditionKey | string;
  name: string;
  frequency: NewsletterFrequency;
  widgetKeys: WidgetKey[];
  platforms: PlatformKey[];
};

export type DashboardSnapshotRecord = {
  platform: PlatformKey;
  snapshot_date?: string;
  created_at?: string;
  data: DashboardSnapshotData;
};

type DashboardSnapshotData = {
  generated_at?: string;
  platform?: PlatformKey;
  data_health?: {
    total_records?: number;
    audit?: {
      confidence_percent?: number;
      created_at?: string;
    } | null;
  };
  top_games?: Array<{
    rank?: number;
    title?: string;
    url?: string;
    current_players?: number;
    inferred_genre?: string | null;
    inferred_subgenre?: string | null;
    latest_rank?: number | null;
    player_gain_percent?: number;
  }>;
  top_genres?: Array<{
    label?: string;
    count?: number;
    players?: number;
    metric?: number;
  }>;
  keyword_cloud?: Array<{
    word?: string;
    count?: number;
  }>;
  common_structure?: {
    pattern?: string;
    count?: number;
    steps?: string[];
  };
  opportunity_readout?: {
    strongest?: {
      label?: string;
      lens?: string;
      score?: number;
      count?: number;
      players?: number;
      velocity?: number;
    } | null;
  };
};

export type NewsletterBlock = {
  widgetKey: WidgetKey;
  title: string;
  summary: string;
  bullets: string[];
  ctaLabel?: string;
  ctaUrl?: string;
};

export type NewsletterIssuePayload = {
  generatedAt: string;
  editionKey: string;
  editionName: string;
  subject: string;
  previewText: string;
  platforms: PlatformKey[];
  widgetKeys: WidgetKey[];
  blocks: NewsletterBlock[];
  disclaimer: string;
};

export const DEFAULT_NEWSLETTER_EDITIONS: Record<NewsletterEditionKey, NewsletterEdition> = {
  daily_creator_digest: {
    key: "daily_creator_digest",
    name: "Daily Creator Digest",
    frequency: "daily",
    widgetKeys: [
      "data_source_health",
      "top_games",
      "top_genres",
      "trending_games",
      "directional_research_maps",
    ],
    platforms: ["roblox", "fortnite"],
  },
  weekly_market_brief: {
    key: "weekly_market_brief",
    name: "Weekly Market Brief",
    frequency: "weekly",
    widgetKeys: [
      "top_genres",
      "keyword_cloud",
      "directional_research_maps",
      "forecasting_signal_inputs",
    ],
    platforms: ["roblox", "fortnite"],
  },
};

const DISCLAIMER =
  "Informational market intelligence only. Not business, legal, financial, investment, or professional advice. No revenue, growth, discoverability, platform placement, or creator outcome is guaranteed.";

export function getDefaultNewsletterEdition(key?: string | null): NewsletterEdition {
  if (key && key in DEFAULT_NEWSLETTER_EDITIONS) {
    return DEFAULT_NEWSLETTER_EDITIONS[key as NewsletterEditionKey];
  }

  return DEFAULT_NEWSLETTER_EDITIONS.daily_creator_digest;
}

export function buildNewsletterIssue({
  edition,
  snapshots,
  appUrl,
}: {
  edition: NewsletterEdition;
  snapshots: DashboardSnapshotRecord[];
  appUrl?: string | null;
}): NewsletterIssuePayload {
  const snapshotMap = new Map(snapshots.map((snapshot) => [snapshot.platform, snapshot]));
  const blocks = edition.platforms.flatMap((platform) => {
    const snapshot = snapshotMap.get(platform);

    return edition.widgetKeys
      .map((widgetKey) => buildBlock(widgetKey, platform, snapshot, appUrl))
      .filter(Boolean) as NewsletterBlock[];
  });
  const subject = `${edition.name}: Roblox and Fortnite UGC signals`;
  const previewText =
    blocks[0]?.summary ??
    "A compact creator digest generated from the latest Snout UGC intelligence snapshots.";

  return {
    generatedAt: new Date().toISOString(),
    editionKey: edition.key,
    editionName: edition.name,
    subject,
    previewText,
    platforms: edition.platforms,
    widgetKeys: edition.widgetKeys,
    blocks,
    disclaimer: DISCLAIMER,
  };
}

export function renderNewsletterText(issue: NewsletterIssuePayload) {
  const blocks = issue.blocks
    .map((block) => {
      const bullets = block.bullets.map((bullet) => `- ${bullet}`).join("\n");
      const cta = block.ctaUrl ? `\n${block.ctaLabel ?? "Open dashboard"}: ${block.ctaUrl}` : "";

      return `${block.title}\n${block.summary}\n${bullets}${cta}`;
    })
    .join("\n\n");

  return `${issue.subject}\nGenerated ${issue.generatedAt}\n\n${blocks}\n\n${issue.disclaimer}`;
}

export function renderNewsletterHtml(issue: NewsletterIssuePayload) {
  const blockHtml = issue.blocks
    .map(
      (block) => `
        <section style="border:1px solid #d9dee8;border-radius:14px;padding:18px;margin:0 0 16px;background:#ffffff;">
          <h2 style="font-size:18px;margin:0 0 8px;color:#20232d;">${escapeHtml(block.title)}</h2>
          <p style="margin:0 0 12px;color:#596274;line-height:1.5;">${escapeHtml(block.summary)}</p>
          <ul style="margin:0;padding-left:20px;color:#20232d;line-height:1.55;">
            ${block.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}
          </ul>
          ${
            block.ctaUrl
              ? `<p style="margin:14px 0 0;"><a href="${escapeAttribute(block.ctaUrl)}" style="color:#2f7d5c;font-weight:700;">${escapeHtml(block.ctaLabel ?? "Open dashboard")}</a></p>`
              : ""
          }
        </section>
      `
    )
    .join("");

  return `
    <!doctype html>
    <html>
      <body style="margin:0;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;">
        <main style="max-width:680px;margin:0 auto;padding:28px 18px;">
          <h1 style="font-size:24px;margin:0 0 6px;color:#20232d;">${escapeHtml(issue.subject)}</h1>
          <p style="margin:0 0 20px;color:#7a8496;">Generated ${escapeHtml(formatDate(issue.generatedAt))}</p>
          ${blockHtml}
          <p style="font-size:12px;color:#7a8496;line-height:1.5;margin-top:22px;">${escapeHtml(issue.disclaimer)}</p>
        </main>
      </body>
    </html>
  `;
}

function buildBlock(
  widgetKey: WidgetKey,
  platform: PlatformKey,
  snapshot?: DashboardSnapshotRecord,
  appUrl?: string | null
): NewsletterBlock | null {
  if (!snapshot) {
    return {
      widgetKey,
      title: `${platformLabel(platform)} snapshot pending`,
      summary: "The latest dashboard snapshot is not available for this platform yet.",
      bullets: ["Run the dashboard snapshot job before generating the newsletter."],
    };
  }

  const data = snapshot.data;
  const ctaUrl = appUrl ? `${appUrl.replace(/\/$/, "")}/` : undefined;

  if (widgetKey === "data_source_health") {
    const records = data.data_health?.total_records ?? 0;
    const confidence = data.data_health?.audit?.confidence_percent;

    return {
      widgetKey,
      title: `${platformLabel(platform)} Data Source & Health`,
      summary: `Latest snapshot includes ${formatNumber(records)} tracked ${platform === "roblox" ? "experiences" : "islands"}.`,
      bullets: [
        `Snapshot date: ${snapshot.snapshot_date ?? formatDate(data.generated_at)}`,
        `Automated classification confidence: ${confidence == null ? "pending" : `${Math.round(confidence)}%`}`,
      ],
      ctaLabel: "Review dashboard",
      ctaUrl,
    };
  }

  if (widgetKey === "top_games") {
    const games = (data.top_games ?? []).slice(0, 3);

    return {
      widgetKey,
      title: `${platformLabel(platform)} Top Games`,
      summary: `Top ${games.length || 0} entries from the latest snapshot.`,
      bullets: games.length
        ? games.map((game, index) => {
            const label = [game.inferred_genre, game.inferred_subgenre].filter(Boolean).join(" / ");
            const metric =
              platform === "roblox"
                ? `${formatNumber(game.current_players ?? 0)} players`
                : `rank ${game.rank ?? index + 1}`;

            return `${index + 1}. ${game.title ?? "Untitled"}${label ? ` (${label})` : ""}: ${metric}`;
          })
        : ["Top games will populate after the next snapshot."],
      ctaLabel: "Open full list",
      ctaUrl,
    };
  }

  if (widgetKey === "top_genres") {
    const genres = (data.top_genres ?? []).slice(0, 3);

    return {
      widgetKey,
      title: `${platformLabel(platform)} Top Genre Signals`,
      summary: "Highest concentration of player activity or island coverage by label.",
      bullets: genres.length
        ? genres.map((genre, index) => {
            const metric = platform === "roblox" ? `${formatNumber(genre.players ?? 0)} players` : `${formatNumber(genre.count ?? 0)} islands`;

            return `${index + 1}. ${genre.label ?? "Unclassified"}: ${metric}`;
          })
        : ["Genre signals will populate after classification data is available."],
    };
  }

  if (widgetKey === "trending_games") {
    const movers = (data.top_games ?? [])
      .filter((game) => typeof game.player_gain_percent === "number")
      .sort((a, b) => (b.player_gain_percent ?? 0) - (a.player_gain_percent ?? 0))
      .slice(0, 3);

    return {
      widgetKey,
      title: `${platformLabel(platform)} Movement Watch`,
      summary: "Short-list of titles with the strongest available movement signal.",
      bullets: movers.length
        ? movers.map((game) => `${game.title ?? "Untitled"}: ${formatPercent(game.player_gain_percent ?? 0)} player movement`)
        : ["Movement signals will populate once multiple comparable snapshots are available."],
    };
  }

  if (widgetKey === "directional_research_maps") {
    const strongest = data.opportunity_readout?.strongest;

    return {
      widgetKey,
      title: `${platformLabel(platform)} Directional Research Map`,
      summary: strongest?.label
        ? `${strongest.label} is the strongest current research signal in the ${strongest.lens ?? "active"} lens.`
        : "Directional research signals will populate as category coverage grows.",
      bullets: strongest?.label
        ? [
            `Signal score: ${formatPercent((strongest.score ?? 0) * 100)}`,
            `Coverage count: ${formatNumber(strongest.count ?? 0)}`,
          ]
        : ["No category-level signal is available yet."],
    };
  }

  if (widgetKey === "keyword_cloud") {
    const words = (data.keyword_cloud ?? []).slice(0, 8);

    return {
      widgetKey,
      title: `${platformLabel(platform)} Keyword Watch`,
      summary: "Most common language detected across top titles and descriptions.",
      bullets: words.length
        ? [words.map((word) => `${word.word} (${word.count})`).join(", ")]
        : ["Keyword cloud will populate after descriptions are available."],
    };
  }

  if (widgetKey === "common_structure") {
    const structure = data.common_structure;

    return {
      widgetKey,
      title: `${platformLabel(platform)} Common Description Structure`,
      summary: structure?.pattern ?? "Common structure is still pending.",
      bullets: structure?.steps?.length
        ? structure.steps.map((step, index) => `${index + 1}. ${step}`)
        : ["More description data is needed to infer a reusable pattern."],
    };
  }

  if (widgetKey === "forecasting_signal_inputs") {
    return {
      widgetKey,
      title: `${platformLabel(platform)} Forecasting Signal Inputs`,
      summary: "A Researcher-level input block reserved for historical and forecasting-oriented views.",
      bullets: ["Use as market context only; this is not a prediction or business recommendation."],
      ctaLabel: "Review Researcher dashboard",
      ctaUrl,
    };
  }

  return null;
}

function platformLabel(platform: PlatformKey) {
  return platform === "roblox" ? "Roblox" : "Fortnite";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${Math.round(value)}%`;
}

function formatDate(value?: string) {
  if (!value) return "pending";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
