import { NextResponse } from "next/server";
import {
  DASHBOARD_AUTH_COOKIE,
  DASHBOARD_TIER_COOKIE,
  createDashboardSessionToken,
} from "@/lib/dashboardAuth";

export async function POST() {
  const token = await createDashboardSessionToken(
    {
      userId: "00000000-0000-0000-0000-000000000000",
      email: "free-preview@snoutboard.local",
      role: "user",
      tier: "free",
    },
    60 * 60 * 24
  );
  const response = NextResponse.json({ ok: true });
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  };

  response.cookies.set(DASHBOARD_AUTH_COOKIE, token, cookieOptions);
  response.cookies.set(DASHBOARD_TIER_COOKIE, "", {
    ...cookieOptions,
    maxAge: 0,
  });

  return response;
}
