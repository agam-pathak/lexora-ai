import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  authenticateUser,
  createSessionCookie,
  shouldUseSecureCookies,
} from "@/lib/auth";
import { migrateLegacyConversationsToUser } from "@/lib/conversations";
import { AUTH_RATE_LIMIT, checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { migrateLegacyDocumentsToUser } from "@/lib/vectorStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`signin:${ip}`, AUTH_RATE_LIMIT.maxRequests, AUTH_RATE_LIMIT.windowMs);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many sign-in attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rateCheck.retryAfterMs / 1000)) } },
      );
    }
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password =
      typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    const user = await authenticateUser(email, password);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    await migrateLegacyDocumentsToUser(user.id);
    await migrateLegacyConversationsToUser(user.id);

    const { session, cookie } = createSessionCookie(
      user,
      shouldUseSecureCookies(request),
    );
    const cookieStore = await cookies();
    cookieStore.set(cookie);

    return NextResponse.json({
      message: "Signed in successfully.",
      session,
    });
  } catch (error) {
    console.error("Sign in route error:", error);

    return NextResponse.json(
      { error: "Unable to sign in." },
      { status: 500 },
    );
  }
}
