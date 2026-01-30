/**
 * Embedding Tool
 *
 * Generates and stores embeddings for semantic search.
 */

import OpenAI from "openai";
import { createTrace, flushLangfuse } from "../observability/index.js";
import { getServiceClient, logger } from "../utils/index.js";
import crypto from "crypto";

const log = logger.child({ tool: "embedding" });

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const MIN_CONTENT_LENGTH = 10;

export interface GenerateEmbeddingParams {
  userId: string;
  itemId: string;
  title: string;
  content?: string;
  summary?: string;
  category?: string;
  contentType?: string;
}

export interface GenerateEmbeddingResult {
  success: boolean;
  embeddingCount?: number;
  error?: string;
}

interface EmbeddingRecord {
  content: string;
  embedding: number[];
  contentHash: string;
  sourceType: string;
  sourceId: string;
  chunkIndex: number;
  totalChunks: number;
  metadata: Record<string, unknown>;
}

export async function generateAndStoreEmbedding(
  params: GenerateEmbeddingParams,
): Promise<GenerateEmbeddingResult> {
  const startTime = Date.now();

  log.info(
    { userId: params.userId, itemId: params.itemId, title: params.title },
    "Generating embeddings",
  );

  const trace = createTrace("embedding_tool", {
    userId: params.userId,
    itemId: params.itemId,
    requestType: "perception",
    model: "gpt-4o-mini",
  });
  const span = trace.span("generate_embedding");

  try {
    const embeddableContent = extractEmbeddableContent({
      title: params.title,
      description: params.summary || params.content || "",
      extractedText: params.content,
    });

    if (
      !embeddableContent ||
      embeddableContent.trim().length < MIN_CONTENT_LENGTH
    ) {
      log.info("Content too short for embedding");
      span.end({ output: { skipped: true, reason: "content too short" } });
      await flushLangfuse();
      return { success: true, embeddingCount: 0 };
    }

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

    if (embeddings.length === 0) {
      log.info("No embeddings generated");
      span.end({ output: { generated: 0 } });
      await flushLangfuse();
      return { success: true, embeddingCount: 0 };
    }

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

    const { error } = await supabase
      .from("embeddings")
      .upsert(embeddingRecords, {
        onConflict: "content_hash",
        ignoreDuplicates: true,
      });

    if (error) throw error;

    const durationMs = Date.now() - startTime;
    log.info(
      { durationMs, embeddingCount: embeddings.length },
      "Embeddings stored",
    );

    span.end({ output: { generated: embeddings.length } });
    await flushLangfuse();

    return { success: true, embeddingCount: embeddings.length };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    log.error(
      { durationMs, error: errorMessage },
      "Embedding generation failed",
    );

    span.error(error instanceof Error ? error : new Error(errorMessage));
    await flushLangfuse();

    return { success: false, error: errorMessage };
  }
}

function extractEmbeddableContent(data: {
  title: string;
  description: string;
  extractedText?: string;
}): string {
  const parts: string[] = [];

  if (data.title) {
    parts.push(`Title: ${data.title}`);
  }

  if (data.description) {
    parts.push(`Description: ${data.description}`);
  }

  if (data.extractedText) {
    parts.push(`Content: ${data.extractedText}`);
  }

  return parts.join("\n\n");
}

async function generateEmbedding(params: {
  content: string;
  sourceType: string;
  sourceId: string;
  userId: string;
  metadata: Record<string, unknown>;
}): Promise<EmbeddingRecord[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const chunks = chunkContent(params.content);
  const records: EmbeddingRecord[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const contentHash = crypto
      .createHash("sha256")
      .update(chunk)
      .digest("hex")
      .slice(0, 32);

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: chunk,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    const embedding = response.data[0]?.embedding;
    if (!embedding) continue;

    records.push({
      content: chunk,
      embedding,
      contentHash,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      chunkIndex: i,
      totalChunks: chunks.length,
      metadata: params.metadata,
    });
  }

  return records;
}

function chunkContent(content: string, maxChunkSize = 8000): string[] {
  if (content.length <= maxChunkSize) {
    return [content];
  }

  const chunks: string[] = [];
  const sentences = content.split(/(?<=[.!?])\s+/);
  let currentChunk = "";

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
