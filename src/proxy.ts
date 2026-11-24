import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Optimistic gate for signed-in areas: no session cookie → straight to sign-in, before any
 * rendering. It only checks the cookie exists (no DB lookup, as Proxy runs on prefetches too),
 * so a forged or expired cookie gets through here and is stopped by requireUser/requireAdmin
 * in src/lib/session.ts, which is the real check.
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();

  const signIn = new URL("/sign-in", request.url);
  signIn.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(signIn);
}

export const config = {
  matcher: ["/account/:path*", "/admin/:path*", "/checkout/:path*"],
};
