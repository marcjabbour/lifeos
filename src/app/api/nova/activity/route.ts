/**
 * Nova Activity API
 *
 * Fetches Nova's activity log with rationale for tooltips.
 * GET /api/nova/activity?limit=10
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface NovaActivity {
  id: string;
  action_type: string;
  action_summary: string;
  rationale: string | null;
  item_id: string | null;
  dot_color: string;
  created_at: string;
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
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    // Fetch activity using the RPC function
    const { data: activities, error } = await supabase.rpc(
      "get_nova_activity",
      {
        filter_user_id: user.id,
        activity_limit: limit,
      },
    );

    if (error) {
      // If the function doesn't exist yet, return empty
      if (error.message.includes("function") || error.code === "42883") {
        console.log(
          "Nova activity function not yet created, returning mock data",
        );
        return NextResponse.json({
          activities: getMockActivities(),
          total: 4,
        });
      }

      console.error("Failed to fetch Nova activity:", error);
      return NextResponse.json(
        { error: "Failed to fetch activity" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      activities: activities || [],
      total: activities?.length || 0,
    });
  } catch (error) {
    console.error("Nova activity error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Mock activities for demo/development
function getMockActivities(): NovaActivity[] {
  return [
    {
      id: "1",
      action_type: "enriched",
      action_summary: "Enriched video transcript with key insights",
      rationale:
        "You saved a 28-minute video about personal AI assistants. I extracted the key insights and connected them to 3 articles you saved last month about productivity systems.",
      item_id: null,
      dot_color: "purple",
      created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    },
    {
      id: "2",
      action_type: "connected",
      action_summary: "Found 3 connections to existing notes",
      rationale:
        "While processing your new bookmark about second brain concepts, I noticed it relates to your existing notes on knowledge management and PKM workflows.",
      item_id: null,
      dot_color: "amber",
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
    {
      id: "3",
      action_type: "organized",
      action_summary: "Organized meal prep list by store section",
      rationale:
        "You saved several Mediterranean recipes this week. I compiled the ingredients and organized them by grocery store sections to make your shopping trip more efficient.",
      item_id: null,
      dot_color: "coral",
      created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    },
    {
      id: "4",
      action_type: "processed",
      action_summary: "Processed 2 new bookmarks",
      rationale:
        "You shared two articles from your browser. I extracted their content and added them to your reading list with automatic tags.",
      item_id: null,
      dot_color: "gray",
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

/**
 * POST /api/nova/activity
 *
 * Create a new Nova activity entry (used internally by Nova)
 */
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
    const body = await request.json();
    const { action_type, action_summary, rationale, item_id, dot_color } = body;

    if (!action_type || !action_summary) {
      return NextResponse.json(
        { error: "action_type and action_summary are required" },
        { status: 400 },
      );
    }

    // Insert the activity
    const { data, error } = await supabase
      .from("nova_activity")
      .insert({
        user_id: user.id,
        action_type,
        action_summary,
        rationale: rationale || null,
        item_id: item_id || null,
        dot_color: dot_color || "purple",
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create Nova activity:", error);
      return NextResponse.json(
        { error: "Failed to create activity" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      activity: data,
    });
  } catch (error) {
    console.error("Nova activity creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
