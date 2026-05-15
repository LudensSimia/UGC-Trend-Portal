export const ACCESS_TIERS = [
  "free",
  "newsletter",
  "trial",
  "scout",
  "paid",
  "pro",
  "admin",
] as const;

export type AccessTier = (typeof ACCESS_TIERS)[number];

export const WIDGET_KEYS = [
  "data_source_health",
  "top_games",
  "top_genres",
  "trending_games",
  "game_trends",
  "genre_trends",
  "keyword_cloud",
  "common_structure",
  "top_tile_colors",
  "directional_research_maps",
  "idea_card",
  "research_signal_cards",
  "player_activity_landscape",
  "top_25_cards",
  "forecasting_signal_inputs",
  "historical_snapshots",
  "exports",
  "admin_tools",
] as const;

export type WidgetKey = (typeof WIDGET_KEYS)[number];

const PAID_WIDGETS: WidgetKey[] = [
  "data_source_health",
  "top_games",
  "top_genres",
  "trending_games",
  "game_trends",
  "genre_trends",
  "keyword_cloud",
  "common_structure",
  "top_tile_colors",
  "directional_research_maps",
  "idea_card",
  "research_signal_cards",
  "player_activity_landscape",
  "top_25_cards",
];

export const TIER_WIDGETS: Record<AccessTier, readonly WidgetKey[] | readonly ["*"]> = {
  free: [],
  newsletter: [
    "data_source_health",
    "top_games",
    "top_genres",
    "trending_games",
    "directional_research_maps",
  ],
  trial: PAID_WIDGETS,
  scout: PAID_WIDGETS,
  // Legacy alias kept so existing database rows using "paid" do not lose access.
  paid: PAID_WIDGETS,
  pro: [
    ...PAID_WIDGETS,
    "forecasting_signal_inputs",
    "historical_snapshots",
    "exports",
  ],
  admin: ["*"],
};

export function normalizeAccessTier(value: unknown): AccessTier {
  if (value === "paid") return "scout";

  return ACCESS_TIERS.includes(value as AccessTier)
    ? (value as AccessTier)
    : "free";
}

export function getTierWidgets(tier: AccessTier): readonly WidgetKey[] | readonly ["*"] {
  return TIER_WIDGETS[tier];
}

export function canAccessWidget(tier: AccessTier, widgetKey: WidgetKey) {
  const widgets = getTierWidgets(tier);

  return widgets[0] === "*" || (widgets as readonly string[]).includes(widgetKey);
}

export function canAccessDashboard(tier: AccessTier) {
  return (
    tier === "trial" ||
    tier === "scout" ||
    tier === "paid" ||
    tier === "pro" ||
    tier === "admin"
  );
}

export function canReceiveNewsletter(tier: AccessTier) {
  return tier === "free" || tier === "newsletter" || canAccessDashboard(tier);
}
