/**
 * Embedding Tool for ActionExecutor
 *
 * Generates and stores embeddings for semantic search.
 */

import {
  generateEmbedding,
  extractEmbeddableContent,
} from "@/lib/services/ai/embeddings";
import { getServiceClient } from "@/lib/core/database";
import {
  createTrace,
  flushLangfuse,
} from "@/lib/services/ai/observability/langfuse";

/**
 * Embedding generation parameters
 */
export interface GenerateEmbeddingParams {
  userId: string;
  itemId: string;
  title: string;
  content?: string;
  summary?: string;
  category?: string;
  contentType?: string;
}

/**
 * Result from embedding generation
 */
export interface GenerateEmbeddingResult {
  success: boolean;
  embeddingCount?: number;
  error?: string;
}

/**
 * Generate and store embeddings for an item
 */
export async function generateAndStoreEmbedding(
  params: GenerateEmbeddingParams,
): Promise<GenerateEmbeddingResult> {
  const startTime = Date.now();

  console.log(`\n[EmbeddingTool] ────────────────────────────────────────`);
  console.log(`[EmbeddingTool] 🧮 GENERATING EMBEDDINGS`);
  console.log(`[EmbeddingTool] ────────────────────────────────────────`);
  console.log(`[EmbeddingTool] ▶ Input:`);
  console.log(`[EmbeddingTool]   └─ userId: ${params.userId}`);
  console.log(`[EmbeddingTool]   └─ itemId: ${params.itemId}`);
  console.log(`[EmbeddingTool]   └─ title: ${params.title}`);
  console.log(
    `[EmbeddingTool]   └─ category: ${params.category || "(not provided)"}`,
  );
  console.log(
    `[EmbeddingTool]   └─ contentType: ${params.contentType || "(not provided)"}`,
  );
  console.log(
    `[EmbeddingTool]   └─ content_length: ${params.content?.length || 0} chars`,
  );
  console.log(
    `[EmbeddingTool]   └─ summary_length: ${params.summary?.length || 0} chars`,
  );

  // Create Langfuse trace (using gpt-4o-mini as placeholder - actual model is text-embedding-3-small)
  const trace = createTrace("embedding_tool", {
    userId: params.userId,
    itemId: params.itemId,
    requestType: "perception",
    model: "gpt-4o-mini",
  });
  const span = trace.span("generate_embedding");

  try {
    // Prepare embeddable content
    console.log(`[EmbeddingTool] ▶ Extracting embeddable content...`);
    const embeddableContent = extractEmbeddableContent("item", {
      title: params.title,
      description: params.summary || params.content || "",
      extractedText: params.content,
    });

    console.log(
      `[EmbeddingTool]   └─ embeddable_content_length: ${embeddableContent?.length || 0} chars`,
    );

    if (!embeddableContent || embeddableContent.trim().length < 10) {
      console.log(
        `[EmbeddingTool] ⚠️ Content too short for embedding (min 10 chars)`,
      );
      console.log(
        `[EmbeddingTool]   └─ actual_length: ${embeddableContent?.trim().length || 0}`,
      );
      span.end({ output: { skipped: true, reason: "content too short" } });
      await flushLangfuse();
      return {
        success: true,
        embeddingCount: 0,
      };
    }

    // Generate embeddings
    console.log(`[EmbeddingTool] ▶ Calling OpenAI embedding API...`);
    console.log(`[EmbeddingTool]   └─ model: text-embedding-3-small`);
    const embeddings = await generateEmbedding({
      content: embeddableContent,
      sourceType: "item",
      sourceId: params.itemId,
      userId: params.userId,
      metadata: {
        title: params.title,
        contentType: params.contentType,
        category: params.category,
      },
    });

    console.log(
      `[EmbeddingTool]   └─ embeddings_generated: ${embeddings.length}`,
    );

    if (embeddings.length === 0) {
      console.log(`[EmbeddingTool] ⚠️ No embeddings generated`);
      span.end({ output: { generated: 0 } });
      await flushLangfuse();
      return {
        success: true,
        embeddingCount: 0,
      };
    }

    // Store embeddings in database
    console.log(`[EmbeddingTool] ▶ Storing embeddings in database...`);
    console.log(`[EmbeddingTool]   └─ table: embeddings`);
    console.log(
      `[EmbeddingTool]   └─ operation: UPSERT (onConflict: content_hash)`,
    );
    const supabase = getServiceClient();
    const embeddingRecords = embeddings.map((emb) => ({
      user_id: params.userId,
      source_type: emb.sourceType,
      source_id: emb.sourceId,
      content: emb.content,
      content_hash: emb.contentHash,
      embedding: emb.embedding,
      metadata: emb.metadata,
      chunk_index: emb.chunkIndex,
      total_chunks: emb.totalChunks,
    }));

    console.log(
      `[EmbeddingTool]   └─ records_to_upsert: ${embeddingRecords.length}`,
    );
    if (embeddings[0]) {
      console.log(
        `[EmbeddingTool]   └─ embedding_dimensions: ${embeddings[0].embedding?.length || "unknown"}`,
      );
      console.log(
        `[EmbeddingTool]   └─ total_chunks: ${embeddings[0].totalChunks || 1}`,
      );
    }

    const { error } = await supabase
      .from("embeddings")
      .upsert(embeddingRecords, {
        onConflict: "content_hash",
        ignoreDuplicates: true,
      });

    if (error) {
      throw error;
    }

    const durationMs = Date.now() - startTime;
    console.log(`[EmbeddingTool] ✅ Embeddings stored successfully`);
    console.log(`[EmbeddingTool]   └─ durationMs: ${durationMs}`);
    console.log(`[EmbeddingTool]   └─ embeddings_stored: ${embeddings.length}`);

    span.end({ output: { generated: embeddings.length } });
    await flushLangfuse();

    return {
      success: true,
      embeddingCount: embeddings.length,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.log(`[EmbeddingTool] ❌ Embedding generation failed`);
    console.log(`[EmbeddingTool]   └─ durationMs: ${durationMs}`);
    console.log(`[EmbeddingTool]   └─ error: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      const stackLines = error.stack.split("\n").slice(1, 3).join("\n       ");
      console.log(`[EmbeddingTool]   └─ stack: ${stackLines}`);
    }

    span.error(error instanceof Error ? error : new Error(errorMessage));
    await flushLangfuse();

    return {
      success: false,
      error: errorMessage,
    };
  }
}
