import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  createSessionCookie,
  createUser,
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
    const rateCheck = checkRateLimit(`signup:${ip}`, AUTH_RATE_LIMIT.maxRequests, AUTH_RATE_LIMIT.windowMs);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many sign-up attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rateCheck.retryAfterMs / 1000)) } },
      );
    }
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password =
      typeof body.password === "string" ? body.password : "";

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Use at least 8 characters for the password." },
        { status: 400 },
      );
    }

    const user = await createUser({
      name,
      email,
      password,
    });

    await migrateLegacyDocumentsToUser(user.id);
    await migrateLegacyConversationsToUser(user.id);

    const { session, cookie } = createSessionCookie(
      user,
      shouldUseSecureCookies(request),
    );
    const cookieStore = await cookies();
    cookieStore.set(cookie);

    return NextResponse.json(
      {
        message: "Account created successfully.",
        session,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create the account.",
      },
      { status: 400 },
    );
  }
}
