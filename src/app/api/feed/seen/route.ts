/**
 * Seen Items API Routes
 *
 * GET /api/feed/seen - Check seen status for items
 * POST /api/feed/seen - Mark item as seen
 * DELETE /api/feed/seen - Unmark item as seen
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthContext } from "@/lib/auth";

// GET: Check seen status for items
async function getSeenItems(
  request: NextRequest,
  context: AuthContext,
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids");

  if (!idsParam) {
    return NextResponse.json(
      { error: "Missing ids parameter" },
      { status: 400 },
    );
  }

  const itemIds = idsParam.split(",").filter(Boolean);

  try {
    const { data, error } = await context.supabase.rpc("get_seen_item_ids", {
      filter_user_id: context.userId,
      check_item_ids: itemIds,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ seenItems: data });
  } catch (err) {
    console.error("Error fetching seen items:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST: Mark item as seen
async function markItemSeen(
  request: NextRequest,
  context: AuthContext,
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { itemId } = body;

    if (!itemId) {
      return NextResponse.json(
        { error: "Missing itemId in request body" },
        { status: 400 },
      );
    }

    const { error } = await context.supabase
      .from("seen_items")
      .upsert(
        { user_id: context.userId, item_id: itemId },
        { onConflict: "user_id,item_id" },
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error marking item as seen:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE: Unmark item as seen
async function unmarkItemSeen(
  request: NextRequest,
  context: AuthContext,
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { itemId } = body;

    if (!itemId) {
      return NextResponse.json(
        { error: "Missing itemId in request body" },
        { status: 400 },
      );
    }

    const { error } = await context.supabase
      .from("seen_items")
      .delete()
      .eq("user_id", context.userId)
      .eq("item_id", itemId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error unmarking item as seen:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Apply auth middleware and export handlers
export const GET = withAuth(getSeenItems);
export const POST = withAuth(markItemSeen);
export const DELETE = withAuth(unmarkItemSeen);
