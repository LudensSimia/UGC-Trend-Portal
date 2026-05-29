import { NextResponse } from "next/server";
import {
  DASHBOARD_AUTH_COOKIE,
  DASHBOARD_TIER_COOKIE,
  createDashboardSessionToken,
} from "@/lib/dashboardAuth";
import { getOrCreateProfile, resolveProfileAccessTier } from "@/lib/authProfiles";
import { createSupabaseAuthClient } from "@/lib/supabaseAuth";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const normalizedEmail = String(email ?? "").trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  if (String(password).length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const origin = new URL(req.url).origin;
  const supabase = createSupabaseAuthClient();
  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo: `${origin}/login`,
    },
  });

  if (error) {
    return NextResponse.json(
      { error: "Unable to create account" },
      { status: 400 }
    );
  }

  if (!data.user) {
    return NextResponse.json({ ok: true, requiresConfirmation: true });
  }

  const profile = await getOrCreateProfile({
    id: data.user.id,
    email: data.user.email ?? normalizedEmail,
  });
  const tier = resolveProfileAccessTier(profile);
  const response = NextResponse.json({
    ok: true,
    requiresConfirmation: !data.session,
  });

  if (data.session) {
    const token = await createDashboardSessionToken({
      userId: data.user.id,
      email: data.user.email ?? normalizedEmail,
      role: tier === "admin" ? "admin" : "user",
      tier,
    });
    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    };

    response.cookies.set(DASHBOARD_AUTH_COOKIE, token, cookieOptions);
    response.cookies.set(DASHBOARD_TIER_COOKIE, "", {
      ...cookieOptions,
      maxAge: 0,
    });
  }

  return response;
}
