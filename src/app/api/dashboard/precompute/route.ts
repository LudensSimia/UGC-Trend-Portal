import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/serverAuth";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PLATFORMS = ["roblox", "fortnite"] as const;
const SCOPES = ["core", "full"] as const;

export async function GET(req: Request) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const supabase = createSupabaseServerClient();
  const origin = new URL(req.url).origin;
  const authorization = req.headers.get("authorization") ?? "";
  const generatedAt = new Date().toISOString();
  const sourceSnapshotDate = generatedAt.slice(0, 10);
  const summaries: Array<Record<string, unknown>> = [];

  try {
    for (const platform of PLATFORMS) {
      for (const scope of SCOPES) {
        const response = await fetch(
          `${origin}/api/dashboard/data?platform=${platform}&scope=${scope}&fresh=1`,
          { headers: { authorization }, cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error(
            `${platform} ${scope} payload generation failed with ${response.status}`
          );
        }

        const payload = await response.json();
        const serialized = JSON.stringify(payload);
        const payloadBytes = Buffer.byteLength(serialized);
        const payloadSha256 = createHash("sha256").update(serialized).digest("hex");
        const { error } = await supabase.from("dashboard_public_payloads").upsert(
          {
            platform,
            scope,
            generated_at: generatedAt,
            source_snapshot_date: sourceSnapshotDate,
            payload,
            payload_bytes: payloadBytes,
            payload_sha256: payloadSha256,
          },
          { onConflict: "platform,scope" }
        );

        if (error) {
          throw new Error(`${platform} ${scope} payload save failed: ${error.message}`);
        }

        summaries.push({ platform, scope, payloadBytes, payloadSha256 });
      }
    }

    return NextResponse.json(
      { ok: true, generatedAt, payloads: summaries },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error: any) {
    console.error("Dashboard payload precompute failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Dashboard payload precompute failed",
        details: error?.message ?? "Unknown precompute error",
        completedPayloads: summaries,
      },
      { status: 500, headers: { "Cache-Control": "private, no-store" } }
    );
  }
}
