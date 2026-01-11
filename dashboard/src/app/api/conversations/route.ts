import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type {
  ConversationRow,
  ConversationInsert,
  ConversationStatus,
  ConversationMessage,
  PaginatedResponse,
  ApiError,
} from "@/types/database";

const VALID_STATUSES: ConversationStatus[] = [
  "pending",
  "awaiting_reply",
  "resolved",
];

// GET /api/conversations - List conversations with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const status = searchParams.get("status") as ConversationStatus | null;
    const itemId = searchParams.get("item_id");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)),
    );

    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json<ApiError>(
        {
          error: "Invalid status",
          details: `Valid statuses: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Build query
    let query = supabase.from("conversations").select("*", { count: "exact" });

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }
    if (itemId) {
      query = query.eq("item_id", itemId);
    }

    // Apply sorting and pagination
    query = query
      .order("updated_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json<ApiError>(
        { error: "Failed to fetch conversations", details: error.message },
        { status: 500 },
      );
    }

    const response: PaginatedResponse<ConversationRow> = {
      data: data || [],
      count: count || 0,
      page,
      pageSize,
      hasMore: (count || 0) > page * pageSize,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json<ApiError>(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    // Validate status if provided
    const status = body.status || "pending";
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json<ApiError>(
        {
          error: "Validation failed",
          details: `Invalid status. Valid statuses: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Validate messages if provided
    const messages: ConversationMessage[] = body.messages || [];
    if (!Array.isArray(messages)) {
      return NextResponse.json<ApiError>(
        { error: "Validation failed", details: "messages must be an array" },
        { status: 400 },
      );
    }

    // Validate each message structure
    for (const msg of messages) {
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

    // Add timestamps to messages if not present
    const messagesWithTimestamps = messages.map((msg) => ({
      ...msg,
      timestamp: msg.timestamp || new Date().toISOString(),
    }));

    // Build insert object
    const insertData: ConversationInsert = {
      item_id: body.item_id || null,
      status,
      messages: messagesWithTimestamps,
    };

    const { data, error } = await supabase
      .from("conversations")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json<ApiError>(
        { error: "Failed to create conversation", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
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
