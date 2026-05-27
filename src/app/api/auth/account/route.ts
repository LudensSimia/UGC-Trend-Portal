import { NextRequest, NextResponse } from "next/server";
import {
  DASHBOARD_AUTH_COOKIE,
  DASHBOARD_TIER_COOKIE,
  verifyDashboardSessionToken,
} from "@/lib/dashboardAuth";
import { getProfileById } from "@/lib/authProfiles";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function DELETE(req: NextRequest) {
  const authPayload = await verifyDashboardSessionToken(
    req.cookies.get(DASHBOARD_AUTH_COOKIE)?.value
  );

  if (!authPayload) {
    return NextResponse.json(
      { error: "A signed-in account is required to erase account data." },
      { status: 401 }
    );
  }

  const profile = await getProfileById(authPayload.userId);

  if (profile?.role === "admin" || profile?.subscription_tier === "admin") {
    return NextResponse.json(
      { error: "Admin accounts must be removed manually for safety." },
      { status: 403 }
    );
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.admin.deleteUser(authPayload.userId);

  if (error) {
    return NextResponse.json(
      { error: "Unable to erase account right now." },
      { status: 500 }
    );
  }

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
