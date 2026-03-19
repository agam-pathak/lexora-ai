import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getDocuments } from "@/lib/vectorStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Authentication is required." },
        { status: 401 },
      );
    }

    const files = await getDocuments(session.userId);
    return NextResponse.json({ files });
  } catch (error) {
    console.error("Files route error:", error);

    return NextResponse.json(
      { error: "Unable to load indexed documents." },
      { status: 500 },
    );
  }
}
