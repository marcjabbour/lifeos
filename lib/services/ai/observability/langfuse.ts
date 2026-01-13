/**
 * Langfuse Integration for LLM Observability
 *
 * Provides tracing, cost tracking, and monitoring for all LLM calls.
 */

import { Langfuse } from 'langfuse'
import type { LLMModel, TokenUsage, TaskType } from '@/types/llm'
import { calculateCost } from '@/types/llm'

let langfuseInstance: Langfuse | null = null

/**
 * Get or create the Langfuse singleton instance
 */
export function getLangfuse(): Langfuse {
  if (!langfuseInstance) {
    const publicKey = process.env.LANGFUSE_PUBLIC_KEY
    const secretKey = process.env.LANGFUSE_SECRET_KEY
    const host = process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com'

    if (!publicKey || !secretKey) {
      // Return a no-op instance for development without Langfuse
      console.warn('[Langfuse] Missing API keys - tracing disabled')
      return createNoOpLangfuse()
    }

    langfuseInstance = new Langfuse({
      publicKey,
      secretKey,
      baseUrl: host,
    })
  }

  return langfuseInstance
}

/**
 * Create a no-op Langfuse instance for development
 */
function createNoOpLangfuse(): Langfuse {
  // Return a mock that won't throw but also won't send data
  return {
    trace: () => ({
      id: 'noop',
      span: () => ({
        id: 'noop',
        end: () => {},
        update: () => {},
      }),
      generation: () => ({
        id: 'noop',
        end: () => {},
        update: () => {},
      }),
      update: () => {},
    }),
    flush: async () => {},
    shutdownAsync: async () => {},
  } as unknown as Langfuse
}

/**
 * Trace metadata for LLM calls
 */
export interface TraceMetadata {
  userId?: string
  jobId?: string
  itemId?: string
  conversationId?: string
  requestType: TaskType
  model: LLMModel
}

/**
 * Create a traced LLM call wrapper
 */
export function createTrace(name: string, metadata: TraceMetadata) {
  const langfuse = getLangfuse()

  const trace = langfuse.trace({
    name,
    userId: metadata.userId,
    metadata: {
      jobId: metadata.jobId,
      itemId: metadata.itemId,
      conversationId: metadata.conversationId,
      requestType: metadata.requestType,
      model: metadata.model,
    },
  })

  return {
    trace,
    /**
     * Create a span for a specific operation within the trace
     */
    span(spanName: string) {
      const startTime = Date.now()
      const span = trace.span({
        name: spanName,
        metadata: { model: metadata.model },
      })

      return {
        span,
        /**
         * End the span with success
         */
        end(result: { output?: unknown; usage?: TokenUsage; cacheHit?: boolean }) {
          const latencyMs = Date.now() - startTime
          const cost = result.usage ? calculateCost(metadata.model, result.usage) : undefined

          span.end({
            output: result.output,
            metadata: {
              latencyMs,
              inputTokens: result.usage?.inputTokens,
              outputTokens: result.usage?.outputTokens,
              costUsd: cost,
              cacheHit: result.cacheHit,
            },
          })

          return { latencyMs, cost }
        },
        /**
         * End the span with an error
         */
        error(error: Error) {
          const latencyMs = Date.now() - startTime
          span.end({
            level: 'ERROR',
            statusMessage: error.message,
            metadata: { latencyMs },
          })
          return { latencyMs }
        },
      }
    },
    /**
     * Create a generation span for LLM calls (preferred for chat completions)
     */
    generation(generationName: string, input: unknown) {
      const startTime = Date.now()
      const generation = trace.generation({
        name: generationName,
        model: metadata.model,
        input,
      })

      return {
        generation,
        /**
         * End the generation with success
         */
        end(result: { output: unknown; usage: TokenUsage }) {
          const latencyMs = Date.now() - startTime
          const cost = calculateCost(metadata.model, result.usage)

          generation.end({
            output: result.output,
            usage: {
              input: result.usage.inputTokens,
              output: result.usage.outputTokens,
              total: result.usage.totalTokens,
            },
            metadata: {
              latencyMs,
              costUsd: cost,
            },
          })

          return { latencyMs, cost }
        },
        /**
         * End the generation with an error
         */
        error(error: Error) {
          const latencyMs = Date.now() - startTime
          generation.end({
            level: 'ERROR',
            statusMessage: error.message,
            metadata: { latencyMs },
          })
          return { latencyMs }
        },
      }
    },
  }
}

/**
 * Flush all pending Langfuse events
 * Call this at the end of request handlers
 */
export async function flushLangfuse(): Promise<void> {
  const langfuse = getLangfuse()
  await langfuse.flush()
}

/**
 * Shutdown Langfuse gracefully
 * Call this when the application is shutting down
 */
export async function shutdownLangfuse(): Promise<void> {
  if (langfuseInstance) {
    await langfuseInstance.shutdownAsync()
    langfuseInstance = null
  }
}
