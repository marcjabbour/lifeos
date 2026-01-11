import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ItemUpdate, ItemCategory, ApiError } from "@/types/database";

// Valid categories for validation
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

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/items/[id] - Update an item
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json<ApiError>(
        { error: "Invalid item ID format" },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Validate category if provided
    if (body.category && !VALID_CATEGORIES.includes(body.category)) {
      return NextResponse.json<ApiError>(
        {
          error: "Validation failed",
          details: `Invalid category. Valid categories: ${VALID_CATEGORIES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Validate tags if provided
    if (body.tags !== undefined) {
      if (
        !Array.isArray(body.tags) ||
        !body.tags.every((t: unknown) => typeof t === "string")
      ) {
        return NextResponse.json<ApiError>(
          {
            error: "Validation failed",
            details: "tags must be an array of strings",
          },
          { status: 400 },
        );
      }
    }

    // Validate title if provided
    if (
      body.title !== undefined &&
      (typeof body.title !== "string" || body.title.trim() === "")
    ) {
      return NextResponse.json<ApiError>(
        {
          error: "Validation failed",
          details: "title must be a non-empty string",
        },
        { status: 400 },
      );
    }

    // Build update object (only include provided fields)
    const updateData: ItemUpdate = {};
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.content !== undefined) updateData.content = body.content;
    if (body.url !== undefined) updateData.url = body.url;
    if (body.thumbnail_url !== undefined)
      updateData.thumbnail_url = body.thumbnail_url;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;
    if (body.is_completed !== undefined)
      updateData.is_completed = body.is_completed;
    updateData.updated_at = new Date().toISOString();

    // Check if there's anything to update
    if (Object.keys(updateData).length === 1) {
      return NextResponse.json<ApiError>(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("items")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json<ApiError>(
          { error: "Item not found" },
          { status: 404 },
        );
      }
      console.error("Supabase error:", error);
      return NextResponse.json<ApiError>(
        { error: "Failed to update item", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
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

// DELETE /api/items/[id] - Delete an item
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json<ApiError>(
        { error: "Invalid item ID format" },
        { status: 400 },
      );
    }

    // First check if the item exists
    const { data: existing, error: findError } = await supabase
      .from("items")
      .select("id")
      .eq("id", id)
      .single();

    if (findError || !existing) {
      return NextResponse.json<ApiError>(
        { error: "Item not found" },
        { status: 404 },
      );
    }

    const { error } = await supabase.from("items").delete().eq("id", id);

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json<ApiError>(
        { error: "Failed to delete item", details: error.message },
        { status: 500 },
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json<ApiError>(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
