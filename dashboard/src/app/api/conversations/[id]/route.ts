import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type {
  Json,
  ConversationRow,
  ConversationUpdate,
  ConversationStatus,
  ConversationMessage,
  ApiError,
} from "@/types/database";

const VALID_STATUSES: ConversationStatus[] = [
  "pending",
  "awaiting_reply",
  "resolved",
];

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/conversations/[id] - Update a conversation
// Supports: adding messages, changing status, linking to item
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json<ApiError>(
        { error: "Invalid conversation ID format" },
        { status: 400 },
      );
    }

    const body = await request.json();

    // First, fetch the existing conversation
    const { data: existingData, error: findError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .single();

    if (findError || !existingData) {
      return NextResponse.json<ApiError>(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    // Cast to our known type after null check
    const existing = existingData as ConversationRow;

    // Validate status if provided
    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json<ApiError>(
        {
          error: "Validation failed",
          details: `Invalid status. Valid statuses: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Build update object
    const updateData: ConversationUpdate = {};

    // Handle status update
    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    // Handle item_id update
    if (body.item_id !== undefined) {
      updateData.item_id = body.item_id;
    }

    // Handle adding new messages
    if (body.add_message) {
      const newMsg = body.add_message;

      // Validate message structure
      if (!newMsg.role || !["user", "assistant"].includes(newMsg.role)) {
        return NextResponse.json<ApiError>(
          {
            error: "Validation failed",
            details: 'add_message.role must be "user" or "assistant"',
          },
          { status: 400 },
        );
      }
      if (!newMsg.content || typeof newMsg.content !== "string") {
        return NextResponse.json<ApiError>(
          {
            error: "Validation failed",
            details: "add_message.content must be a non-empty string",
          },
          { status: 400 },
        );
      }

      const messageWithTimestamp: ConversationMessage = {
        role: newMsg.role,
        content: newMsg.content,
        timestamp: newMsg.timestamp || new Date().toISOString(),
        quick_replies: newMsg.quick_replies,
      };

      // Cast existing.messages since Supabase returns Json type
      const existingMessages = (existing.messages ||
        []) as unknown as ConversationMessage[];
      updateData.messages = [
        ...existingMessages,
        messageWithTimestamp,
      ] as unknown as Json;
    }

    // Handle replacing all messages
    if (body.messages !== undefined) {
      if (!Array.isArray(body.messages)) {
        return NextResponse.json<ApiError>(
          { error: "Validation failed", details: "messages must be an array" },
          { status: 400 },
        );
      }

      // Validate each message
      for (const msg of body.messages) {
        if (!msg.role || !["user", "assistant"].includes(msg.role)) {
          return NextResponse.json<ApiError>(
            {
              error: "Validation failed",
              details: 'Each message must have a role of "user" or "assistant"',
            },
            { status: 400 },
          );
        }
        if (!msg.content || typeof msg.content !== "string") {
          return NextResponse.json<ApiError>(
            {
              error: "Validation failed",
              details: "Each message must have a content string",
            },
            { status: 400 },
          );
        }
      }

      updateData.messages = body.messages.map((msg: ConversationMessage) => ({
        ...msg,
        timestamp: msg.timestamp || new Date().toISOString(),
      })) as unknown as Json;
    }

    // Always update timestamp
    updateData.updated_at = new Date().toISOString();

    // Check if there's anything to update besides timestamp
    if (Object.keys(updateData).length === 1) {
      return NextResponse.json<ApiError>(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("conversations")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Supabase error:", updateError);
      return NextResponse.json<ApiError>(
        {
          error: "Failed to update conversation",
          details: updateError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Unexpected error:", err);
    if (err instanceof SyntaxError) {
      return NextResponse.json<ApiError>(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }
    return NextResponse.json<ApiError>(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
