/**
 * Embedding Generation for Nova
 *
 * Generates embeddings using text-embedding-3-small for semantic search.
 * Handles chunking, deduplication, and batch processing.
 */

import { createLLMClient } from '@/lib/services/ai/llm'
import { createTrace, flushLangfuse } from '@/lib/services/ai/observability/langfuse'
import CryptoJS from 'crypto-js'

// Embedding configuration
const EMBEDDING_CONFIG = {
  model: 'text-embedding-3-small',
  dimensions: 1536,
  maxChunkSize: 1000, // characters
  chunkOverlap: 200, // characters
  maxInputLength: 8000, // characters before chunking
} as const

export type SourceType = 'item' | 'conversation' | 'enrichment'

export interface EmbeddingInput {
  content: string
  sourceType: SourceType
  sourceId: string
  userId: string
  metadata?: Record<string, unknown>
}

export interface GeneratedEmbedding {
  embedding: number[]
  content: string
  contentHash: string
  sourceType: SourceType
  sourceId: string
  userId: string
  metadata?: Record<string, unknown>
  chunkIndex?: number
  totalChunks?: number
}

export interface BatchEmbeddingResult {
  embeddings: GeneratedEmbedding[]
  totalInputTokens: number
  skippedDuplicates: number
}

/**
 * Generate content hash for deduplication
 */
export function generateContentHash(content: string): string {
  return CryptoJS.SHA256(content).toString()
}

/**
 * Check if content needs chunking
 */
export function needsChunking(content: string): boolean {
  return content.length > EMBEDDING_CONFIG.maxInputLength
}

/**
 * Chunk content for embedding generation
 *
 * Uses sliding window with overlap for context preservation.
 */
export function chunkContent(content: string): string[] {
  if (!needsChunking(content)) {
    return [content]
  }

  const chunks: string[] = []
  const { maxChunkSize, chunkOverlap } = EMBEDDING_CONFIG
  let start = 0

  while (start < content.length) {
    const end = Math.min(start + maxChunkSize, content.length)
    const chunk = content.slice(start, end)

    // Try to break at sentence boundaries
    const trimmedChunk = trimToSentence(chunk)
    chunks.push(trimmedChunk)

    // Move start forward, accounting for overlap
    start = start + maxChunkSize - chunkOverlap

    // Ensure we don't go backwards
    if (start <= 0 && chunks.length > 1) {
      break
    }
  }

  return chunks
}

/**
 * Trim chunk to the nearest sentence boundary
 */
function trimToSentence(chunk: string): string {
  const sentenceEnds = ['. ', '! ', '? ', '.\n', '!\n', '?\n']

  // Find the last sentence end
  let lastEnd = -1
  for (const end of sentenceEnds) {
    const idx = chunk.lastIndexOf(end)
    if (idx > lastEnd) {
      lastEnd = idx + end.length - 1
    }
  }

  // If we found a sentence boundary in the last third of the chunk, use it
  if (lastEnd > chunk.length * 0.66) {
    return chunk.slice(0, lastEnd + 1).trim()
  }

  return chunk.trim()
}

/**
 * Generate embedding for a single piece of content
 */
export async function generateEmbedding(input: EmbeddingInput): Promise<GeneratedEmbedding[]> {
  const trace = createTrace('generate_embedding', {
    userId: input.userId,
    requestType: 'execution',
    model: 'gpt-4o-mini', // Placeholder for trace
  })

  const span = trace.span('embedding_generation')

  try {
    const client = createLLMClient({ userId: input.userId })
    const chunks = chunkContent(input.content)
    const embeddings: GeneratedEmbedding[] = []

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const contentHash = generateContentHash(chunk)

      const result = await client.embed({ content: chunk })

      embeddings.push({
        embedding: result.embedding,
        content: chunk,
        contentHash,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        userId: input.userId,
        metadata: input.metadata,
        chunkIndex: chunks.length > 1 ? i : undefined,
        totalChunks: chunks.length > 1 ? chunks.length : undefined,
      })
    }

    span.end({
      output: {
        chunkCount: chunks.length,
        embeddingDimensions: EMBEDDING_CONFIG.dimensions,
      },
    })

    return embeddings
  } catch (error) {
    span.error(error instanceof Error ? error : new Error(String(error)))
    throw error
  } finally {
    await flushLangfuse()
  }
}

/**
 * Generate embeddings for multiple items in batch
 */
export async function generateBatchEmbeddings(
  inputs: EmbeddingInput[],
  existingHashes?: Set<string>
): Promise<BatchEmbeddingResult> {
  const trace = createTrace('batch_embeddings', {
    userId: inputs[0]?.userId,
    requestType: 'execution',
    model: 'gpt-4o-mini',
  })

  const span = trace.span('batch_embedding_generation')

  try {
    const embeddings: GeneratedEmbedding[] = []
    let totalInputTokens = 0
    let skippedDuplicates = 0

    for (const input of inputs) {
      // Check for duplicates
      const contentHash = generateContentHash(input.content)
      if (existingHashes?.has(contentHash)) {
        skippedDuplicates++
        continue
      }

      const generated = await generateEmbedding(input)
      embeddings.push(...generated)

      // Rough token estimate for tracking
      totalInputTokens += Math.ceil(input.content.length / 4)
    }

    span.end({
      output: {
        totalEmbeddings: embeddings.length,
        skippedDuplicates,
        totalInputTokens,
      },
    })

    return {
      embeddings,
      totalInputTokens,
      skippedDuplicates,
    }
  } catch (error) {
    span.error(error instanceof Error ? error : new Error(String(error)))
    throw error
  } finally {
    await flushLangfuse()
  }
}

/**
 * Extract embeddable content from different source types
 */
export function extractEmbeddableContent(
  sourceType: SourceType,
  data: Record<string, unknown>
): string {
  switch (sourceType) {
    case 'item':
      // Items: title + description + extracted text
      const itemParts = [
        data.title as string,
        data.description as string,
        data.extractedText as string,
      ].filter(Boolean)
      return itemParts.join('\n\n')

    case 'conversation':
      // Conversations: session summary
      return (data.summary as string) || ''

    case 'enrichment':
      // Enrichments: summary + key insights
      const enrichmentParts = [
        data.summary as string,
        Array.isArray(data.keyInsights) ? (data.keyInsights as string[]).join('\n') : '',
      ].filter(Boolean)
      return enrichmentParts.join('\n\n')

    default:
      return ''
  }
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same dimensions')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Find similar embeddings (for local testing without database)
 */
export function findSimilar(
  queryEmbedding: number[],
  embeddings: GeneratedEmbedding[],
  threshold: number = 0.7,
  limit: number = 5
): Array<GeneratedEmbedding & { similarity: number }> {
  const scored = embeddings
    .map((e) => ({
      ...e,
      similarity: cosineSimilarity(queryEmbedding, e.embedding),
    }))
    .filter((e) => e.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)

  return scored
}
