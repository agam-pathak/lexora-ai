import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  clearSessionCookie,
  getSession,
  shouldUseSecureCookies,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ session: null }, { status: 401 });
  }

  return NextResponse.json({ session });
}

export async function DELETE(request: Request) {
  const cookieStore = await cookies();
  cookieStore.set(clearSessionCookie(shouldUseSecureCookies(request)));

  return NextResponse.json({ message: "Signed out successfully." });
}
