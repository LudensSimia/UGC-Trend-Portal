export type BillingTier = "free" | "scout" | "pro";
export type BillingPeriod = "free" | "monthly" | "project_3_month" | "annual";

export type BillingPlan = {
  key: string;
  tier: BillingTier;
  name: string;
  period: BillingPeriod;
  priceCents: number;
  displayPrice: string;
};

export const BILLING_PLANS: BillingPlan[] = [
  {
    key: "free",
    tier: "free",
    name: "Free",
    period: "free",
    priceCents: 0,
    displayPrice: "$0",
  },
  {
    key: "scout_monthly",
    tier: "scout",
    name: "Explorer Monthly",
    period: "monthly",
    priceCents: 1900,
    displayPrice: "$19/mo",
  },
  {
    key: "scout_project_3_month",
    tier: "scout",
    name: "Explorer 3-Month Project Pass",
    period: "project_3_month",
    priceCents: 4900,
    displayPrice: "$49",
  },
  {
    key: "scout_annual",
    tier: "scout",
    name: "Explorer Annual",
    period: "annual",
    priceCents: 19000,
    displayPrice: "$190/yr",
  },
  {
    key: "pro_monthly",
    tier: "pro",
    name: "Researcher Monthly",
    period: "monthly",
    priceCents: 4900,
    displayPrice: "$49/mo",
  },
  {
    key: "pro_project_3_month",
    tier: "pro",
    name: "Researcher 3-Month Project Pass",
    period: "project_3_month",
    priceCents: 12900,
    displayPrice: "$129",
  },
  {
    key: "pro_annual",
    tier: "pro",
    name: "Researcher Annual",
    period: "annual",
    priceCents: 49000,
    displayPrice: "$490/yr",
  },
];

export function getBillingPlan(planKey: string) {
  return BILLING_PLANS.find((plan) => plan.key === planKey) ?? null;
}
