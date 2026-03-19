import { NextResponse } from "next/server";

import { createPasswordReset, isLocalAuthHost } from "@/lib/auth";
import { AUTH_RATE_LIMIT, checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`forgot:${ip}`, AUTH_RATE_LIMIT.maxRequests, AUTH_RATE_LIMIT.windowMs);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rateCheck.retryAfterMs / 1000)) } },
      );
    }
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 },
      );
    }

    const resetRequest = await createPasswordReset(email);
    const canExposeResetPreview =
      resetRequest !== null &&
      (process.env.NODE_ENV !== "production" || isLocalAuthHost(request));

    return NextResponse.json({
      message:
        "If the account exists, a recovery link has been prepared for this workspace.",
      resetPath: canExposeResetPreview
        ? `/auth?mode=reset&token=${encodeURIComponent(resetRequest.token)}`
        : null,
      expiresAt: canExposeResetPreview ? resetRequest.expiresAt : null,
    });
  } catch (error) {
    console.error("Forgot password route error:", error);

    return NextResponse.json(
      { error: "Unable to process the recovery request." },
      { status: 500 },
    );
  }
}
