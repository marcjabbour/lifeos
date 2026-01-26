/**
 * Feed Filter API
 *
 * Filters feed items by categories and semantic search.
 * GET /api/feed/filter?categories=food,tech&q=restaurant&cursor=xxx
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { TagCategory } from "@/lib/services/ai/embeddings/tags";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface FilterParams {
  categories?: TagCategory[];
  searchQuery?: string;
  limit?: number;
  cursor?: string;
}

interface FilteredItem {
  id: string;
  title: string;
  description?: string | null;
  url?: string | null;
  thumbnail_url?: string | null;
  category: string;
  tags: string[];
  source_type: string;
  metadata: Record<string, unknown>;
  enrichment: Record<string, unknown>;
  has_enrichment: boolean;
  created_at: string;
  similarity?: number;
}

export async function GET(request: NextRequest) {
  try {
    // Get auth token from cookies
    const authHeader = request.headers.get("authorization");
    const cookieHeader = request.headers.get("cookie");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          ...(authHeader ? { Authorization: authHeader } : {}),
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
      },
    });

    // Check auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const categoriesParam = searchParams.get("categories");
    const searchQuery = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const cursor = searchParams.get("cursor");

    const categories = categoriesParam
      ? (categoriesParam.split(",") as TagCategory[])
      : [];

    // Build the query
    let query = supabase
      .from("items")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Apply cursor-based pagination
    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    // If we have categories, filter by category
    if (categories.length > 0) {
      query = query.in("category", categories);
    }

    // If we have a search query, filter by text match
    // TODO: Replace with semantic search via match_items_by_tag_similarity
    if (searchQuery) {
      // For now, use simple text search
      // In production, this would use the pgvector similarity search
      query = query.or(
        `title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`,
      );
    }

    const { data: items, error } = await query;

    if (error) {
      console.error("Filter query error:", error);
      return NextResponse.json(
        { error: "Failed to filter items" },
        { status: 500 },
      );
    }

    // Also filter by tags on the client side for now
    // (Supabase doesn't support array contains with partial match)
    let filteredItems = items as FilteredItem[];

    if (searchQuery && filteredItems) {
      const lowerQuery = searchQuery.toLowerCase();
      filteredItems = filteredItems.filter(
        (item) =>
          item.title?.toLowerCase().includes(lowerQuery) ||
          item.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery)),
      );
    }

    // Determine next cursor
    const nextCursor =
      filteredItems && filteredItems.length === limit
        ? filteredItems[filteredItems.length - 1]?.created_at
        : null;

    return NextResponse.json({
      items: filteredItems || [],
      next_cursor: nextCursor,
      has_more: nextCursor !== null,
      total_count: filteredItems?.length || 0,
    });
  } catch (error) {
    console.error("Feed filter error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
