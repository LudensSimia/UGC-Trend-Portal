import { readFileSync } from "node:fs";
import { join } from "node:path";

const page = readFileSync(join(process.cwd(), "src/app/page.tsx"), "utf8");

const requiredMarkers = [
  "function FortniteDashboardView",
  "buildOpportunityMap(filteredItems, \"demand-saturation\"",
  "buildOpportunityMap(filteredItems, \"velocity-saturation\"",
  "buildOpportunityMap(filteredItems, \"demand-complexity\"",
  "function PredictionMarketSignalsCard",
  "Forecasting Signal Inputs",
  "function GameMarketCard",
  "Avg player gain/loss, past 7 days",
  "function PlayerActivityLandscape",
  "Top 25 Keyword Cloud",
  "Common Description Structure",
  "Top Tile Colors",
];

const missing = requiredMarkers.filter((marker) => !page.includes(marker));

if (missing.length) {
  console.error("Dashboard guardrail failed. Missing markers:");
  for (const marker of missing) {
    console.error(`- ${marker}`);
  }
  process.exit(1);
}

console.log("Dashboard guardrail passed.");
