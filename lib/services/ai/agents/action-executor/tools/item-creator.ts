/**
 * Item Creator Tool for ActionExecutor
 *
 * Creates or updates items in the database.
 */

import { getServiceClient } from "@/lib/core/database";
import {
  createTrace,
  flushLangfuse,
} from "@/lib/services/ai/observability/langfuse";

/**
 * Item creation parameters
 */
export interface CreateItemParams {
  userId: string;
  existingItemId?: string;
  title: string;
  content?: string;
  url?: string;
  thumbnailUrl?: string;
  category: string;
  tags?: string[];
  contentType: string;
  enrichment?: {
    summary: string;
    insights?: string[];
    topics?: string[];
    confidence: number;
    processedAt: string;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Result from item creation
 */
export interface CreateItemResult {
  success: boolean;
  itemId?: string;
  error?: string;
}

/**
 * Create or update an item in the database
 */
export async function createOrUpdateItem(
  params: CreateItemParams,
): Promise<CreateItemResult> {
  const startTime = Date.now();
  const isUpdate = !!params.existingItemId;

  console.log(`\n[ItemCreator] ────────────────────────────────────────`);
  console.log(`[ItemCreator] 📝 ${isUpdate ? "UPDATING" : "CREATING"} ITEM`);
  console.log(`[ItemCreator] ────────────────────────────────────────`);
  console.log(`[ItemCreator] ▶ Input:`);
  console.log(`[ItemCreator]   └─ userId: ${params.userId}`);
  console.log(
    `[ItemCreator]   └─ operation: ${isUpdate ? "UPDATE" : "CREATE"}`,
  );
  console.log(
    `[ItemCreator]   └─ existingItemId: ${params.existingItemId || "(new item)"}`,
  );
  console.log(`[ItemCreator]   └─ title: ${params.title}`);
  console.log(`[ItemCreator]   └─ category: ${params.category}`);
  console.log(`[ItemCreator]   └─ contentType: ${params.contentType}`);
  console.log(
    `[ItemCreator]   └─ tags: ${params.tags?.join(", ") || "(none)"}`,
  );
  console.log(`[ItemCreator]   └─ url: ${params.url || "(none)"}`);
  console.log(`[ItemCreator]   └─ hasEnrichment: ${!!params.enrichment}`);
  if (params.enrichment) {
    console.log(
      `[ItemCreator]   └─ enrichment.summary_length: ${params.enrichment.summary?.length || 0} chars`,
    );
    console.log(
      `[ItemCreator]   └─ enrichment.confidence: ${params.enrichment.confidence}`,
    );
  }

  // Create Langfuse trace
  const trace = createTrace("item_creator_tool", {
    userId: params.userId,
    itemId: params.existingItemId,
    requestType: "perception",
    model: "gpt-4o-mini",
  });
  const span = trace.span("create_item");

  try {
    console.log(`[ItemCreator] ▶ Connecting to database...`);
    const supabase = getServiceClient();

    // Build the item data
    const itemData = {
      user_id: params.userId,
      title: params.title,
      content: params.content,
      url: params.url,
      thumbnail_url: params.thumbnailUrl,
      category: params.category,
      tags: params.tags || [],
      content_type: params.contentType,
      enrichment: params.enrichment,
      metadata: params.metadata,
      has_enrichment: !!params.enrichment,
      updated_at: new Date().toISOString(),
    };

    let result;

    if (isUpdate) {
      // Update existing item
      console.log(`[ItemCreator] ▶ Executing UPDATE query...`);
      console.log(`[ItemCreator]   └─ table: items`);
      console.log(
        `[ItemCreator]   └─ where: id = ${params.existingItemId} AND user_id = ${params.userId}`,
      );
      const { data, error } = await supabase
        .from("items")
        .update(itemData)
        .eq("id", params.existingItemId)
        .eq("user_id", params.userId)
        .select("id")
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new item
      console.log(`[ItemCreator] ▶ Executing INSERT query...`);
      console.log(`[ItemCreator]   └─ table: items`);
      const { data, error } = await supabase
        .from("items")
        .insert({
          ...itemData,
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) throw error;
      result = data;
    }

    const durationMs = Date.now() - startTime;
    console.log(
      `[ItemCreator] ✅ Item ${isUpdate ? "updated" : "created"} successfully`,
    );
    console.log(`[ItemCreator]   └─ durationMs: ${durationMs}`);
    console.log(`[ItemCreator]   └─ itemId: ${result.id}`);

    span.end({ output: { itemId: result.id } });
    await flushLangfuse();

    return {
      success: true,
      itemId: result.id,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.log(
      `[ItemCreator] ❌ Item ${isUpdate ? "update" : "creation"} failed`,
    );
    console.log(`[ItemCreator]   └─ durationMs: ${durationMs}`);
    console.log(`[ItemCreator]   └─ error: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      const stackLines = error.stack.split("\n").slice(1, 3).join("\n       ");
      console.log(`[ItemCreator]   └─ stack: ${stackLines}`);
    }

    span.error(error instanceof Error ? error : new Error(errorMessage));
    await flushLangfuse();

    return {
      success: false,
      error: errorMessage,
    };
  }
}
