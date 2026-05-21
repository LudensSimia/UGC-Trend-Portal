import { NextRequest, NextResponse } from "next/server";
import { getDashboardSession } from "@/lib/dashboardSession";

export async function GET(req: NextRequest) {
  return NextResponse.json(await getDashboardSession(req));
}
