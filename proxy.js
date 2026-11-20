import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";
import { PROTECTED_PREFIXES } from "@/lib/auth/routes";
import { isSameOrigin } from "@/lib/security/origin";

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * 1. API requests that change something must come from this site: a browser
 *    always sends Origin on these, and a different one means another site is
 *    trying to act with the visitor's cookies (CSRF). Better Auth checks its own
 *    routes; the cron endpoint is GET with a bearer secret.
 * 2. Optimistic page protection: no session cookie at all → /login. The real
 *    session and role checks happen in server guards and every API route.
 */
export function proxy(request) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    if (UNSAFE.has(request.method) && !pathname.startsWith("/api/auth/") && !isSameOrigin(request)) {
      return NextResponse.json({ error: "Cross-site requests aren't allowed." }, { status: 403 });
    }
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isProtected) return NextResponse.next();

  if (!getSessionCookie(request)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*", "/achievements/:path*", "/applications/:path*", "/assessments/attempt/:path*", "/recruiter/:path*", "/admin/:path*", "/profile/:path*", "/settings/:path*", "/onboarding/:path*", "/continue/:path*"],
};
