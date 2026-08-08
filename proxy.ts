import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "lexora_session";

/**
 * Lightweight cookie-presence check at the edge.
 * Full signature validation still happens in the API route handlers.
 */
function hasSessionCookie(request: NextRequest): boolean {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return typeof token === "string" && token.length > 0;
}

const PROTECTED_PATHS = [
  "/upload",
  "/chat",
  "/api/upload",
  "/api/chat",
  "/api/files",
  "/api/index",
  "/api/conversations",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some(
    (protectedPath) =>
      pathname === protectedPath || pathname.startsWith(`${protectedPath}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  if (hasSessionCookie(request)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Authentication is required." },
      { status: 401 },
    );
  }

  const authUrl = request.nextUrl.clone();
  authUrl.pathname = "/auth";
  authUrl.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(authUrl);
}

export const config = {
  matcher: [
    "/upload/:path*",
    "/chat/:path*",
    "/api/upload/:path*",
    "/api/chat/:path*",
    "/api/files/:path*",
    "/api/index/:path*",
    "/api/conversations/:path*",
  ],
};
