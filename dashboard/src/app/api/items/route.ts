import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type {
  ItemRow,
  ItemInsert,
  ItemCategory,
  SourceType,
  PaginatedResponse,
  ApiError,
} from "@/types/database";

// Valid categories and source types for validation
const VALID_CATEGORIES: ItemCategory[] = [
  "uncategorized",
  "watch",
  "read",
  "listen",
  "research",
  "todo",
  "buy",
  "social",
  "inspiration",
];

const VALID_SOURCE_TYPES: SourceType[] = [
  "ios_share",
  "voice",
  "data_source",
  "manual",
  "slack",
];

// GET /api/items - List items with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const category = searchParams.get("category") as ItemCategory | null;
    const sourceType = searchParams.get("source_type") as SourceType | null;
    const isCompleted = searchParams.get("is_completed");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)),
    );
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? true : false;

    // Validate category if provided
    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json<ApiError>(
        {
          error: "Invalid category",
          details: `Valid categories: ${VALID_CATEGORIES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Validate source_type if provided
    if (sourceType && !VALID_SOURCE_TYPES.includes(sourceType)) {
      return NextResponse.json<ApiError>(
        {
          error: "Invalid source_type",
          details: `Valid types: ${VALID_SOURCE_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Build query
    let query = supabase.from("items").select("*", { count: "exact" });

    // Apply filters
    if (category) {
      query = query.eq("category", category);
    }
    if (sourceType) {
      query = query.eq("source_type", sourceType);
    }
    if (isCompleted !== null) {
      query = query.eq("is_completed", isCompleted === "true");
    }

    // Apply sorting and pagination
    query = query
      .order(sortBy, { ascending: sortOrder })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json<ApiError>(
        { error: "Failed to fetch items", details: error.message },
        { status: 500 },
      );
    }

    const response: PaginatedResponse<ItemRow> = {
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

// POST /api/items - Create a new item
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    // Validate required fields
    if (
      !body.title ||
      typeof body.title !== "string" ||
      body.title.trim() === ""
    ) {
      return NextResponse.json<ApiError>(
        {
          error: "Validation failed",
          details: "title is required and must be a non-empty string",
        },
        { status: 400 },
      );
    }

    if (!body.source_type || !VALID_SOURCE_TYPES.includes(body.source_type)) {
      return NextResponse.json<ApiError>(
        {
          error: "Validation failed",
          details: `source_type is required. Valid types: ${VALID_SOURCE_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Validate category if provided
    const category = body.category || "uncategorized";
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json<ApiError>(
        {
          error: "Validation failed",
          details: `Invalid category. Valid categories: ${VALID_CATEGORIES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Validate tags if provided
    const tags = body.tags || [];
    if (
      !Array.isArray(tags) ||
      !tags.every((t: unknown) => typeof t === "string")
    ) {
      return NextResponse.json<ApiError>(
        {
          error: "Validation failed",
          details: "tags must be an array of strings",
        },
        { status: 400 },
      );
    }

    // Build insert object
    const insertData: ItemInsert = {
      title: body.title.trim(),
      content: body.content || null,
      url: body.url || null,
      thumbnail_url: body.thumbnail_url || null,
      category,
      tags,
      source_type: body.source_type,
      source_id: body.source_id || null,
      metadata: body.metadata || {},
      is_completed: body.is_completed || false,
    };

    const { data, error } = await supabase
      .from("items")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json<ApiError>(
        { error: "Failed to create item", details: error.message },
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
