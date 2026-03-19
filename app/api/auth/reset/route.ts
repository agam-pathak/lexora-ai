import { NextResponse } from "next/server";

import { resetPasswordWithToken } from "@/lib/auth";
import { AUTH_RATE_LIMIT, checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`reset:${ip}`, AUTH_RATE_LIMIT.maxRequests, AUTH_RATE_LIMIT.windowMs);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rateCheck.retryAfterMs / 1000)) } },
      );
    }
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const password =
      typeof body.password === "string" ? body.password : "";

    if (!token || !password) {
      return NextResponse.json(
        { error: "A reset token and new password are required." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Use at least 8 characters for the new password." },
        { status: 400 },
      );
    }

    const user = await resetPasswordWithToken(token, password);

    if (!user) {
      return NextResponse.json(
        { error: "The recovery link is invalid or has expired." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      message: "Password updated successfully. You can sign in now.",
    });
  } catch (error) {
    console.error("Reset password route error:", error);

    return NextResponse.json(
      { error: "Unable to reset the password." },
      { status: 500 },
    );
  }
}
