import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import {
  deleteConversation,
  getConversation,
  renameConversation,
  summarizeConversation,
} from "@/lib/conversations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    conversationId: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Authentication is required." },
        { status: 401 },
      );
    }

    const { conversationId } = await params;
    const conversation = await getConversation(session.userId, conversationId);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Conversation detail route error:", error);

    return NextResponse.json(
      { error: "Unable to load the conversation." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Authentication is required." },
        { status: 401 },
      );
    }

    const { conversationId } = await params;
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";

    if (!title) {
      return NextResponse.json(
        { error: "A title is required." },
        { status: 400 },
      );
    }

    const conversation = await renameConversation(
      session.userId,
      conversationId,
      title,
    );

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      conversation: summarizeConversation(conversation),
    });
  } catch (error) {
    console.error("Rename conversation route error:", error);

    return NextResponse.json(
      { error: "The conversation could not be renamed." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Authentication is required." },
        { status: 401 },
      );
    }

    const { conversationId } = await params;
    const deleted = await deleteConversation(session.userId, conversationId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Conversation deleted successfully." });
  } catch (error) {
    console.error("Delete conversation route error:", error);

    return NextResponse.json(
      { error: "The conversation could not be deleted." },
      { status: 500 },
    );
  }
}
