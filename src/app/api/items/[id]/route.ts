/**
 * Single Item API Routes
 *
 * GET /api/items/:id - Get a single item
 * PATCH /api/items/:id - Update an item
 * DELETE /api/items/:id - Archive (soft delete) an item
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, withRateLimit, type AuthContext } from "@/lib/auth";
import { ItemService, isValidUUID } from "@/lib/services/items";
import type { UpdateItemRequest } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/items/:id
 * Get a single item by ID
 */
async function getItem(
  request: NextRequest,
  context: AuthContext,
  params: { id: string },
): Promise<NextResponse> {
  const { id } = params;

  // Validate UUID format
  if (!isValidUUID(id)) {
    return NextResponse.json(
      { error: "Invalid item ID format" },
      { status: 400 },
    );
  }

  try {
    const itemService = new ItemService(context.supabase, context.userId);
    const item = await itemService.get(id);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (err) {
    console.error("Error fetching item:", err);
    return NextResponse.json(
      { error: "Failed to fetch item" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/items/:id
 * Update an item
 */
async function updateItem(
  request: NextRequest,
  context: AuthContext,
  params: { id: string },
): Promise<NextResponse> {
  const { id } = params;

  // Validate UUID format
  if (!isValidUUID(id)) {
    return NextResponse.json(
      { error: "Invalid item ID format" },
      { status: 400 },
    );
  }

  try {
    const body = (await request.json()) as UpdateItemRequest;
    const itemService = new ItemService(context.supabase, context.userId);

    const item = await itemService.update(id, body);
    return NextResponse.json(item);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message === "Item not found") {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    if (message === "No valid fields to update") {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error("Error updating item:", err);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/items/:id
 * Archive (soft delete) an item
 */
async function deleteItem(
  request: NextRequest,
  context: AuthContext,
  params: { id: string },
): Promise<NextResponse> {
  const { id } = params;

  // Validate UUID format
  if (!isValidUUID(id)) {
    return NextResponse.json(
      { error: "Invalid item ID format" },
      { status: 400 },
    );
  }

  try {
    const itemService = new ItemService(context.supabase, context.userId);
    const item = await itemService.archive(id);
    return NextResponse.json({ success: true, item });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message === "Item not found") {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    console.error("Error archiving item:", err);
    return NextResponse.json(
      { error: "Failed to archive item" },
      { status: 500 },
    );
  }
}

// Apply middleware and export handlers
export async function GET(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params;
  return withAuth((req, ctx) =>
    withRateLimit((r, c) => getItem(r, c, resolvedParams))(req, ctx),
  )(request);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params;
  return withAuth((req, ctx) =>
    withRateLimit((r, c) => updateItem(r, c, resolvedParams))(req, ctx),
  )(request);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params;
  return withAuth((req, ctx) =>
    withRateLimit((r, c) => deleteItem(r, c, resolvedParams))(req, ctx),
  )(request);
}
