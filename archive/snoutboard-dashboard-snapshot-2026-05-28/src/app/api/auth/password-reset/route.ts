import { NextResponse } from "next/server";
import { createSupabaseAuthClient } from "@/lib/supabaseAuth";

export async function POST(req: Request) {
  const { email } = await req.json();
  const normalizedEmail = String(email ?? "").trim().toLowerCase();

  if (!normalizedEmail) {
    return NextResponse.json({ ok: true });
  }

  const origin = new URL(req.url).origin;
  const supabase = createSupabaseAuthClient();

  await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${origin}/login?mode=reset`,
  });

  return NextResponse.json({ ok: true });
}
