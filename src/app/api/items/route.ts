/**
 * Items API Routes
 *
 * GET /api/items - List items with pagination and filters
 * POST /api/items - Create a new item (internal use, called from /api/share)
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, withRateLimit, type AuthContext } from "@/lib/auth";
import { ItemService } from "@/lib/services/items";
import type { ContentType } from "@/types/database";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * GET /api/items
 * List user items with cursor-based pagination and filters
 */
async function getItems(
  request: NextRequest,
  context: AuthContext,
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  // Parse query parameters
  const search = searchParams.get("search") || undefined;
  const hasEnrichment = searchParams.get("has_enrichment");
  const isArchived = searchParams.get("is_archived");
  const contentType = searchParams.get("content_type") as ContentType | null;
  const limit = Math.min(
    parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT)),
    MAX_LIMIT,
  );
  const cursor = searchParams.get("cursor") || undefined;

  try {
    const itemService = new ItemService(context.supabase, context.userId);
    const response = await itemService.list({
      search,
      hasEnrichment:
        hasEnrichment !== null ? hasEnrichment === "true" : undefined,
      isArchived: isArchived !== null ? isArchived === "true" : undefined,
      contentType: contentType || undefined,
      limit,
      cursor,
    });

    return NextResponse.json(response);
  } catch (err) {
    console.error("Unexpected error fetching items:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/items
 * Create a new item (typically called internally from /api/share)
 */
async function createItem(
  request: NextRequest,
  context: AuthContext,
): Promise<NextResponse> {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.source_type) {
      return NextResponse.json(
        { error: "Missing required fields: title, source_type" },
        { status: 400 },
      );
    }

    // Validate content_type if provided
    if (
      body.content_type &&
      !["url", "text", "image"].includes(body.content_type)
    ) {
      return NextResponse.json(
        { error: "Invalid content_type. Must be url, text, or image" },
        { status: 400 },
      );
    }

    const itemService = new ItemService(context.supabase, context.userId);
    const item = await itemService.create({
      title: body.title,
      content: body.content || null,
      url: body.url || null,
      thumbnail_url: body.thumbnail_url || null,
      content_type: body.content_type || null,
      category: body.category || "uncategorized",
      tags: body.tags || [],
      source_type: body.source_type,
      source_id: body.source_id || null,
      metadata: body.metadata || {},
      enrichment: body.enrichment || {},
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error("Unexpected error creating item:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Apply middleware and export handlers
export const GET = withAuth((request, context) =>
  withRateLimit(getItems)(request, context),
);

export const POST = withAuth((request, context) =>
  withRateLimit(createItem)(request, context),
);
