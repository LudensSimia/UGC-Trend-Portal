import { NextRequest, NextResponse } from "next/server";
import {
  getFortniteMobileLabData,
  getRobloxMobileLabData,
} from "@/lib/mobileLabData";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const platform = request.nextUrl.searchParams.get("platform");
  if (platform !== "roblox" && platform !== "fortnite") {
    return NextResponse.json({ error: "A valid platform is required" }, { status: 400 });
  }

  try {
    const payload =
      platform === "roblox"
        ? await getRobloxMobileLabData()
        : await getFortniteMobileLabData();
    const response = NextResponse.json(payload);
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=900"
    );
    return response;
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Mobile research data could not be loaded",
        details: error?.message ?? "Unknown mobile data error",
      },
      { status: 500 }
    );
  }
}
