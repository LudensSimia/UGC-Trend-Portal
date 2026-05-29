import { NextResponse } from "next/server";

export function requireCronSecret(req: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  const headerSecret = req.headers.get("x-cron-secret");
  const querySecret = new URL(req.url).searchParams.get("secret");
  const providedSecret = bearerSecret ?? headerSecret ?? querySecret;

  if (!expectedSecret) {
    return NextResponse.json(
      { error: "Server is missing CRON_SECRET" },
      { status: 500 }
    );
  }

  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
