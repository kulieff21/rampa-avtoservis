// Runs before routing (Next.js 16 renamed "middleware" to "proxy").
//  - "/" goes to /az or /en, chosen from the browser's Accept-Language header.
//  - /admin/* without a valid session cookie goes to the login page. This is a fast
//    first filter only; admin pages and actions check the session again themselves.

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    // Only the browser's first choice counts: "az-AZ,az;q=0.9,en;q=0.8" -> az
    const first = (request.headers.get("accept-language") ?? "").split(",")[0].trim().toLowerCase();
    const locale = first.startsWith("az") ? "az" : "en";
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const ok = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
    if (!ok) return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin/:path*"],
};
