/**
 * Content Share API Route
 *
 * POST /api/share - Main content ingestion endpoint
 *
 * Accepts content from iOS Share Sheet, Siri Shortcuts, and PWA direct input.
 * Performs quick perception and queues for async processing.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, withRateLimit, type AuthContext } from "@/lib/auth";
import { validateShareRequest } from "@/lib/core/validation";
import { triggerContentProcessing } from "@/lib/services/jobs";
import { generateTitle, createInitialMetadata } from "@/lib/services/items";
import type { ShareRequest, ShareResponse } from "@/types/database";

/**
 * POST /api/share
 * Main content ingestion endpoint
 */
async function handleShare(
  request: NextRequest,
  context: AuthContext,
): Promise<NextResponse> {
  try {
    const body = await request.json();

    // Validate request
    const validation = validateShareRequest(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const shareRequest = validation.sanitized as ShareRequest;
    const { content, content_type, source } = shareRequest;

    // Content and content_type are guaranteed by validation
    if (!content || !content_type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Generate title and metadata using service helpers
    const title = generateTitle(content, content_type);
    const metadata = createInitialMetadata(content, content_type, source);

    // Create item in database
    const itemData = {
      user_id: context.userId,
      title,
      content: content_type === "text" ? content : null,
      url: content_type === "url" ? content : null,
      content_type,
      source_type: source || "share",
      metadata,
      category: "uncategorized",
      tags: [],
      enrichment: {},
      has_enrichment: false,
      is_archived: false,
      is_completed: false,
    };

    const { data: item, error: itemError } = await context.supabase
      .from("items")
      .insert(itemData)
      .select()
      .single();

    if (itemError) {
      console.error("Error creating item:", itemError);
      return NextResponse.json(
        { error: "Failed to save content" },
        { status: 500 },
      );
    }

    // Create job for async processing
    const jobData = {
      user_id: context.userId,
      item_id: item.id,
      status: "pending",
      plan: {
        reasoning: "Initial content processing",
        steps: [
          { action: "perceive", why: "Understand what the content is about" },
          { action: "enrich", why: "Add useful metadata and insights" },
        ],
      },
      current_step: 0,
      step_results: [],
      result: {},
    };

    const { data: job, error: jobError } = await context.supabase
      .from("jobs")
      .insert(jobData)
      .select()
      .single();

    if (jobError) {
      console.error("Error creating job:", jobError);
      // Item was created, but job failed - still return success with warning
      const response: ShareResponse = {
        success: true,
        action: "saved",
        item_id: item.id,
        message: `Saved "${title}". Processing may be delayed.`,
      };
      return NextResponse.json(response, { status: 201 });
    }

    // Enqueue job to Inngest for async processing
    const triggerResult = await triggerContentProcessing({
      job_id: job.id,
      user_id: context.userId,
      item_id: item.id,
      content_type,
    });

    if (!triggerResult.success) {
      console.warn("Failed to trigger job processing:", triggerResult.error);
      // Job was created but not queued - processing will be delayed
    }

    // Return success response
    const response: ShareResponse = {
      success: true,
      action: "working",
      item_id: item.id,
      job_id: job.id,
      message: `Got it! I'm looking at "${title}" now.`,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    console.error("Unexpected error in share endpoint:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Apply middleware and export handler
export const POST = withAuth((request, context) =>
  withRateLimit(handleShare)(request, context),
);
