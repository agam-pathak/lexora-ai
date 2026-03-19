import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { ALL_DOCUMENTS_SCOPE_ID } from "@/lib/chat-constants";
import {
  createConversation,
  getConversationSummaries,
  summarizeConversation,
} from "@/lib/conversations";
import { getDocument } from "@/lib/vectorStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Authentication is required." },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId")?.trim();
    const conversations = await getConversationSummaries(
      session.userId,
      documentId,
    );

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Conversations route error:", error);

    return NextResponse.json(
      { error: "Unable to load conversations." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Authentication is required." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const documentId =
      typeof body.documentId === "string" ? body.documentId.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";

    if (!documentId) {
      return NextResponse.json(
        { error: "A document is required to create a conversation." },
        { status: 400 },
      );
    }

    const document =
      documentId === ALL_DOCUMENTS_SCOPE_ID
        ? null
        : await getDocument(session.userId, documentId);

    if (!document && documentId !== ALL_DOCUMENTS_SCOPE_ID) {
      return NextResponse.json(
        { error: "The selected document could not be found." },
        { status: 404 },
      );
    }

    const conversation = await createConversation({
      userId: session.userId,
      documentId,
      title,
    });

    return NextResponse.json({
      conversation: summarizeConversation(conversation),
      document,
    });
  } catch (error) {
    console.error("Create conversation route error:", error);

    return NextResponse.json(
      { error: "The conversation could not be created." },
      { status: 500 },
    );
  }
}
