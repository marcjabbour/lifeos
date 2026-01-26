/**
 * Tag Embedding API
 *
 * Generates and stores embeddings for tags.
 * POST /api/tags/embed
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { batchGenerateTagEmbeddings } from "@/lib/services/ai/embeddings/tags";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface EmbedTagsRequest {
  tags: string[];
}

export async function POST(request: NextRequest) {
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

    // Parse request body
    const body: EmbedTagsRequest = await request.json();
    const { tags } = body;

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json(
        { error: "Tags array is required" },
        { status: 400 },
      );
    }

    // Limit batch size
    if (tags.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 tags per request" },
        { status: 400 },
      );
    }

    // Get existing tag embeddings for this user
    const { data: existingTags } = await supabase
      .from("tag_embeddings")
      .select("normalized_name")
      .eq("user_id", user.id);

    const existingNormalizedNames = new Set(
      existingTags?.map((t) => t.normalized_name) || [],
    );

    // Generate embeddings for new tags
    const result = await batchGenerateTagEmbeddings(
      tags,
      user.id,
      existingNormalizedNames,
    );

    // Store the new embeddings
    if (result.tags.length > 0) {
      const insertData = result.tags.map((tag) => ({
        user_id: user.id,
        tag_name: tag.tagName,
        normalized_name: tag.normalizedName,
        category: tag.category,
        embedding: JSON.stringify(tag.embedding),
        usage_count: 1,
      }));

      const { error: insertError } = await supabase
        .from("tag_embeddings")
        .insert(insertData);

      if (insertError) {
        console.error("Failed to store tag embeddings:", insertError);
        return NextResponse.json(
          { error: "Failed to store embeddings" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      generated: result.generated,
      cached: result.cached,
      tags: result.tags.map((t) => ({
        name: t.tagName,
        category: t.category,
      })),
    });
  } catch (error) {
    console.error("Tag embedding error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/tags/embed
 *
 * Get all tag embeddings for the current user
 */
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
    const category = searchParams.get("category");

    // Build query
    let query = supabase
      .from("tag_embeddings")
      .select(
        "id, tag_name, normalized_name, category, usage_count, created_at",
      )
      .eq("user_id", user.id)
      .order("usage_count", { ascending: false });

    if (category) {
      query = query.eq("category", category);
    }

    const { data: tags, error } = await query;

    if (error) {
      console.error("Failed to fetch tag embeddings:", error);
      return NextResponse.json(
        { error: "Failed to fetch tags" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      tags: tags || [],
      total: tags?.length || 0,
    });
  } catch (error) {
    console.error("Tag fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
