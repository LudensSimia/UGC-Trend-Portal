import { NextResponse } from "next/server";
import {
  DASHBOARD_AUTH_COOKIE,
  DASHBOARD_TIER_COOKIE,
  getDashboardAuthToken,
} from "../../../../lib/dashboardAuth";

export async function POST(req: Request) {
  const configuredPassword = process.env.DASHBOARD_PASSWORD;
  const configuredAdminPassword =
    process.env.DASHBOARD_ADMIN_PASSWORD ?? configuredPassword;

  if (!configuredPassword) {
    return NextResponse.json(
      { error: "Dashboard password is not configured" },
      { status: 500 }
    );
  }

  const { password } = await req.json();
  const isAdmin = Boolean(configuredAdminPassword && password === configuredAdminPassword);

  if (password !== configuredPassword && !isAdmin) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await getDashboardAuthToken(
    isAdmin && configuredAdminPassword ? configuredAdminPassword : configuredPassword
  );
  const response = NextResponse.json({ ok: true });

  response.cookies.set(DASHBOARD_AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  response.cookies.set(DASHBOARD_TIER_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
