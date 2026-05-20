import { NextRequest, NextResponse } from "next/server";
import {
  DASHBOARD_AUTH_COOKIE,
  DASHBOARD_TIER_COOKIE,
  getDashboardAuthToken,
} from "../../../../lib/dashboardAuth";
import { normalizeAccessTier } from "../../../../lib/entitlements";

export async function GET(req: NextRequest) {
  const devTier = process.env.DASHBOARD_DEV_TIER;

  if (process.env.NODE_ENV !== "production" && devTier) {
    return NextResponse.json({
      authenticated: true,
      tier: normalizeAccessTier(devTier),
    });
  }

  const password = process.env.DASHBOARD_PASSWORD;
  const adminPassword = process.env.DASHBOARD_ADMIN_PASSWORD ?? password;
  const authToken = req.cookies.get(DASHBOARD_AUTH_COOKIE)?.value;

  if (!password || !authToken) {
    return NextResponse.json({ authenticated: false, tier: "free" });
  }

  const adminToken = adminPassword
    ? await getDashboardAuthToken(adminPassword)
    : null;
  const userToken = await getDashboardAuthToken(password);

  if (adminToken && authToken === adminToken) {
    return NextResponse.json({ authenticated: true, tier: "admin" });
  }

  if (authToken === userToken) {
    return NextResponse.json({
      authenticated: true,
      tier: normalizeAccessTier(
        req.cookies.get(DASHBOARD_TIER_COOKIE)?.value ??
          process.env.DASHBOARD_DEFAULT_TIER ??
          "scout"
      ),
    });
  }

  return NextResponse.json({ authenticated: false, tier: "free" });
}
