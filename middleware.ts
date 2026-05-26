import { NextResponse, type NextRequest } from "next/server";
import {
  DASHBOARD_AUTH_COOKIE,
  verifyDashboardSessionToken,
} from "./src/lib/dashboardAuth";

const PUBLIC_FILE = /\.(.*)$/;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (pathname === "/login") {
    return NextResponse.next();
  }

  const session = await verifyDashboardSessionToken(
    req.cookies.get(DASHBOARD_AUTH_COOKIE)?.value
  );

  if (session) {
    return NextResponse.next();
  }

  return redirectToLogin(req);
}

function redirectToLogin(req: NextRequest) {
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", req.nextUrl.pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
