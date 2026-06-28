import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/serverAuth";
import {
  buildMobilePublicPayload,
  saveMobilePublicPayload,
} from "@/lib/mobilePublicPayload";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function GET(req: Request) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  try {
    const payload = await buildMobilePublicPayload();
    const saved = await saveMobilePublicPayload(payload);

    return NextResponse.json(
      {
        ok: true,
        generatedAt: payload.generatedAt,
        ...saved,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error: any) {
    console.error("Mobile payload precompute failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Mobile payload precompute failed",
        details: error?.message ?? "Unknown precompute error",
      },
      { status: 500, headers: { "Cache-Control": "private, no-store" } }
    );
  }
}
