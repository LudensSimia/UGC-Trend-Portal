import { NextResponse } from "next/server";
import {
  DASHBOARD_AUTH_COOKIE,
  DASHBOARD_TIER_COOKIE,
} from "@/lib/dashboardAuth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };

  response.cookies.set(DASHBOARD_AUTH_COOKIE, "", cookieOptions);
  response.cookies.set(DASHBOARD_TIER_COOKIE, "", cookieOptions);

  return response;
}
