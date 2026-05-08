import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const supabase = createSupabaseServerClient();

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Unsubscribe token is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("newsletter_subscribers")
    .update({
      status: "unsubscribed",
      unsubscribed_at: new Date().toISOString(),
    })
    .eq("unsubscribe_token", token);

  if (error) {
    return NextResponse.json(
      { error: "Unsubscribe failed", details: error.message },
      { status: 500 }
    );
  }

  return new Response("You have been unsubscribed from Snout newsletter emails.", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
