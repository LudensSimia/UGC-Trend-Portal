import { NextRequest } from "next/server";
import {
  DASHBOARD_AUTH_COOKIE,
  getDashboardAuthToken,
} from "@/lib/dashboardAuth";
import { normalizeAccessTier, type AccessTier } from "@/lib/entitlements";

export type DashboardSession = {
  authenticated: boolean;
  tier: AccessTier;
};

export async function getDashboardSession(req: NextRequest): Promise<DashboardSession> {
  const devTier = process.env.DASHBOARD_DEV_TIER;

  if (process.env.NODE_ENV !== "production" && devTier) {
    return {
      authenticated: true,
      tier: normalizeAccessTier(devTier),
    };
  }

  const password = process.env.DASHBOARD_PASSWORD;
  const adminPassword = process.env.DASHBOARD_ADMIN_PASSWORD ?? password;
  const authToken = req.cookies.get(DASHBOARD_AUTH_COOKIE)?.value;

  if (!password || !authToken) {
    return { authenticated: false, tier: "free" };
  }

  const adminToken = adminPassword
    ? await getDashboardAuthToken(adminPassword)
    : null;
  const userToken = await getDashboardAuthToken(password);

  if (adminToken && authToken === adminToken) {
    return { authenticated: true, tier: "admin" };
  }

  if (authToken === userToken) {
    return {
      authenticated: true,
      tier: normalizeAccessTier(process.env.DASHBOARD_DEFAULT_TIER ?? "free"),
    };
  }

  return { authenticated: false, tier: "free" };
}

export function hasFullDashboardDataAccess(tier: AccessTier) {
  return tier === "scout" || tier === "paid" || tier === "pro" || tier === "admin";
}
