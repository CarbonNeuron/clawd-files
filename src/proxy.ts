import { NextRequest, NextResponse } from "next/server";

const BYPASS_PREFIXES = [
  "/raw/",
  "/api/",
  "/s/",
  "/admin",
  "/docs",
  "/llms.txt",
  "/_next/",
  "/favicon",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Short URL redirect: /s/<id> → rewrite to API handler
  if (pathname.startsWith("/s/")) {
    const url = request.nextUrl.clone();
    url.pathname = `/api${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Bypass specific paths
  for (const prefix of BYPASS_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      return NextResponse.next();
    }
  }

  // Root path — pass through
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Count path segments (remove leading slash, split)
  const segments = pathname.slice(1).split("/");

  // Single segment — bucket page, pass through
  if (segments.length < 2) {
    return NextResponse.next();
  }

  // Multi-segment: content negotiation
  const accept = request.headers.get("accept") || "";
  if (!accept.includes("text/html")) {
    // Non-browser request — rewrite to raw file route
    const url = request.nextUrl.clone();
    url.pathname = `/raw${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Browser request — pass through for HTML preview page
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
