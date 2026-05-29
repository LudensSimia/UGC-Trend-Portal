import { NextResponse } from "next/server";
import {
  DASHBOARD_AUTH_COOKIE,
  DASHBOARD_TIER_COOKIE,
  createDashboardSessionToken,
} from "../../../../lib/dashboardAuth";
import { getOrCreateProfile, resolveProfileAccessTier } from "@/lib/authProfiles";
import { createSupabaseAuthClient } from "@/lib/supabaseAuth";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email).trim().toLowerCase(),
    password,
  });

  if (error || !data.user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const profile = await getOrCreateProfile({
    id: data.user.id,
    email: data.user.email,
  });
  const tier = resolveProfileAccessTier(profile);
  const token = await createDashboardSessionToken({
    userId: data.user.id,
    email: data.user.email ?? String(email).trim().toLowerCase(),
    role: tier === "admin" ? "admin" : "user",
    tier,
  });
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
