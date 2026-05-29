import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { NewsletterFrequency, PlatformKey } from "@/lib/newsletter";

export const dynamic = "force-dynamic";

const supabase = createSupabaseServerClient();
const VALID_PLATFORMS = new Set(["roblox", "fortnite"]);
const VALID_FREQUENCIES = new Set(["daily", "weekly"]);

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    email?: string;
    frequency?: NewsletterFrequency;
    interests?: PlatformKey[];
  } | null;
  const email = body?.email?.trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const frequency = VALID_FREQUENCIES.has(body?.frequency ?? "")
    ? body?.frequency
    : "daily";
  const interests = (body?.interests ?? ["roblox", "fortnite"]).filter((platform) =>
    VALID_PLATFORMS.has(platform)
  );
  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .upsert(
      {
        email,
        frequency,
        interests: interests.length ? interests : ["roblox", "fortnite"],
        tier: "newsletter",
        status: "active",
        unsubscribed_at: null,
      },
      { onConflict: "email" }
    )
    .select("id, email, frequency, interests, status")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Newsletter subscription failed", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, subscriber: data });
}
