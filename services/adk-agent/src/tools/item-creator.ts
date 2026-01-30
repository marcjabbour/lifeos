/**
 * Item Creator Tool
 *
 * Creates or updates items in the database.
 */

import { createTrace, flushLangfuse } from "../observability/index.js";
import { getServiceClient, logger } from "../utils/index.js";

const log = logger.child({ tool: "item-creator" });

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

export interface CreateItemResult {
  success: boolean;
  itemId?: string;
  error?: string;
}

export async function createOrUpdateItem(
  params: CreateItemParams,
): Promise<CreateItemResult> {
  const startTime = Date.now();
  const isUpdate = !!params.existingItemId;

  log.info(
    {
      userId: params.userId,
      operation: isUpdate ? "UPDATE" : "CREATE",
      title: params.title,
      category: params.category,
    },
    isUpdate ? "Updating item" : "Creating item",
  );

  const trace = createTrace("item_creator_tool", {
    userId: params.userId,
    itemId: params.existingItemId,
    requestType: "perception",
    model: "gpt-4o-mini",
  });
  const span = trace.span("create_item");

  try {
    const supabase = getServiceClient();

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
    log.info(
      { durationMs, itemId: result.id },
      isUpdate ? "Item updated" : "Item created",
    );

    span.end({ output: { itemId: result.id } });
    await flushLangfuse();

    return { success: true, itemId: result.id };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    log.error(
      { durationMs, error: errorMessage },
      isUpdate ? "Item update failed" : "Item creation failed",
    );

    span.error(error instanceof Error ? error : new Error(errorMessage));
    await flushLangfuse();

    return { success: false, error: errorMessage };
  }
}
