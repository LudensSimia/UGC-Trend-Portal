import { createHash } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  getFortniteMobileLabData,
  getRobloxMobileLabData,
} from "@/lib/mobileLabData";
import type { MobilePublicPayload } from "@/lib/mobileLabTypes";

const MOBILE_PAYLOAD_PLATFORM = "mobile";
const MOBILE_PAYLOAD_SCOPE = "core";

export async function buildMobilePublicPayload(): Promise<MobilePublicPayload> {
  const [roblox, fortnite] = await Promise.all([
    getRobloxMobileLabData(),
    getFortniteMobileLabData(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    roblox,
    fortnite,
  };
}

export async function loadPrecomputedMobilePayload() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("dashboard_public_payloads")
    .select("generated_at,payload")
    .eq("platform", MOBILE_PAYLOAD_PLATFORM)
    .eq("scope", MOBILE_PAYLOAD_SCOPE)
    .maybeSingle();

  if (error) {
    if (error.code !== "42P01" && error.code !== "PGRST205") {
      console.warn("Precomputed mobile payload read failed:", error.message);
    }
    return null;
  }

  if (!data?.payload) return null;

  return {
    ...(data.payload as MobilePublicPayload),
    precomputed: true,
    payloadGeneratedAt: data.generated_at,
  };
}

export async function getMobilePublicPayload() {
  return (await loadPrecomputedMobilePayload()) ?? buildMobilePublicPayload();
}

export async function saveMobilePublicPayload(payload: MobilePublicPayload) {
  const supabase = createSupabaseServerClient();
  const serialized = JSON.stringify(payload);
  const payloadBytes = Buffer.byteLength(serialized);
  const payloadSha256 = createHash("sha256").update(serialized).digest("hex");
  const generatedAt = payload.generatedAt;
  const sourceSnapshotDate =
    payload.roblox.latestDate ?? payload.fortnite.latestDate ?? generatedAt.slice(0, 10);

  const { error } = await supabase.from("dashboard_public_payloads").upsert(
    {
      platform: MOBILE_PAYLOAD_PLATFORM,
      scope: MOBILE_PAYLOAD_SCOPE,
      generated_at: generatedAt,
      source_snapshot_date: sourceSnapshotDate,
      payload,
      payload_bytes: payloadBytes,
      payload_sha256: payloadSha256,
    },
    { onConflict: "platform,scope" }
  );

  if (error) {
    throw new Error(`Mobile payload save failed: ${error.message}`);
  }

  return { payloadBytes, payloadSha256 };
}
