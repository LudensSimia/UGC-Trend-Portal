import { NextRequest } from "next/server";
import {
  DASHBOARD_AUTH_COOKIE,
  verifyDashboardSessionToken,
} from "@/lib/dashboardAuth";
import { normalizeAccessTier, type AccessTier } from "@/lib/entitlements";
import { getProfileById, resolveProfileAccessTier } from "@/lib/authProfiles";

export type DashboardSession = {
  authenticated: boolean;
  tier: AccessTier;
  email?: string | null;
};

export async function getDashboardSession(req: NextRequest): Promise<DashboardSession> {
  const devTier = process.env.DASHBOARD_DEV_TIER;

  if (process.env.NODE_ENV !== "production" && devTier) {
    return {
      authenticated: true,
      tier: normalizeAccessTier(devTier),
      email: null,
    };
  }

  const authPayload = await verifyDashboardSessionToken(
    req.cookies.get(DASHBOARD_AUTH_COOKIE)?.value
  );

  if (!authPayload) {
    return { authenticated: false, tier: "free" };
  }

  const profile = await getProfileById(authPayload.userId);
  const tier = resolveProfileAccessTier(profile);

  return {
    authenticated: true,
    tier,
    email: profile?.email ?? authPayload.email ?? null,
  };
}

export function hasFullDashboardDataAccess(tier: AccessTier) {
  return tier === "scout" || tier === "paid" || tier === "pro" || tier === "admin";
}
