import { NextRequest, NextResponse } from "next/server";

const MOBILE_USER_AGENT_PATTERN =
  /Android|BlackBerry|iPhone|iPad|iPod|IEMobile|Opera Mini/i;

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname.startsWith("/mobile")) {
    const response = NextResponse.next();
    const acknowledged = searchParams.get("ack") === "1";
    response.headers.set(
      "Cache-Control",
      acknowledged
        ? "public, max-age=60, stale-while-revalidate=300"
        : "public, max-age=3600, stale-while-revalidate=86400"
    );
    response.headers.set(
      "Vercel-CDN-Cache-Control",
      acknowledged
        ? "public, max-age=300, stale-while-revalidate=86400"
        : "public, max-age=3600, stale-while-revalidate=86400"
    );
    return response;
  }

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/mobile") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (searchParams.get("desktop") === "1") {
    return NextResponse.next();
  }

  const userAgent = request.headers.get("user-agent") ?? "";

  if (MOBILE_USER_AGENT_PATTERN.test(userAgent)) {
    const url = request.nextUrl.clone();
    url.pathname = "/mobile";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
