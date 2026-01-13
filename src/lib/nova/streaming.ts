/**
 * Nova Streaming Response Handler
 *
 * Implements Server-Sent Events (SSE) for real-time user feedback
 * during Nova's cognitive loop.
 */

import OpenAI from 'openai'
import { LLM_CONFIG, TOKEN_BUDGETS } from '@/lib/llm/config'
import { createTrace, flushLangfuse } from '@/lib/observability/langfuse'

// SSE event types
export type StreamEventType = 'status' | 'thinking' | 'message' | 'done' | 'error'

export type ProcessingPhase = 'perceiving' | 'reasoning' | 'planning' | 'executing' | 'responding'

export interface StreamEvent {
  event: StreamEventType
  data: unknown
}

export interface StatusEvent {
  phase: ProcessingPhase
  message?: string
}

export interface ThinkingEvent {
  content: string
}

export interface MessageEvent {
  delta: string
}

export interface DoneEvent {
  itemId?: string
  jobId?: string
  conversationId?: string
  action?: string
  message?: string
}

export interface ErrorEvent {
  message: string
  code?: string
  retryable?: boolean
}

/**
 * Create a streaming response for SSE
 */
export function createStreamingResponse(streamGenerator: AsyncGenerator<StreamEvent>): Response {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of streamGenerator) {
          const formatted = formatSSEEvent(event)
          controller.enqueue(encoder.encode(formatted))
        }
      } catch (error) {
        const errorEvent = formatSSEEvent({
          event: 'error',
          data: {
            message: error instanceof Error ? error.message : 'Unknown error',
            retryable: true,
          },
        })
        controller.enqueue(encoder.encode(errorEvent))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

/**
 * Format an event for SSE protocol
 */
function formatSSEEvent(event: StreamEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`
}

/**
 * Stream LLM response with SSE events
 */
export async function* streamLLMResponse(params: {
  systemPrompt: string
  userMessage: string
  phase: ProcessingPhase
  userId?: string
  model?: 'gpt-4o-mini' | 'gpt-4o'
}): AsyncGenerator<StreamEvent> {
  const model = params.model || 'gpt-4o-mini'
  const trace = createTrace('stream_response', {
    userId: params.userId,
    requestType: 'execution',
    model,
  })

  const span = trace.span('streaming_generation')

  try {
    // Emit status event
    yield {
      event: 'status',
      data: { phase: params.phase } satisfies StatusEvent,
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const stream = await openai.chat.completions.create({
      model,
      max_tokens: TOKEN_BUDGETS.response,
      stream: true,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userMessage },
      ],
    })

    let fullContent = ''
    let inputTokens = 0
    let outputTokens = 0

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) {
        fullContent += delta

        // Emit message delta
        yield {
          event: 'message',
          data: { delta } satisfies MessageEvent,
        }
      }

      // Track token usage from the final chunk
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens || 0
        outputTokens = chunk.usage.completion_tokens || 0
      }
    }

    span.end({
      output: fullContent,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
    })
  } catch (error) {
    span.error(error instanceof Error ? error : new Error(String(error)))
    throw error
  } finally {
    await flushLangfuse()
  }
}

/**
 * Stream Nova's thinking process
 */
export async function* streamThinking(params: {
  content: string
  contentType: string
  userId?: string
}): AsyncGenerator<StreamEvent> {
  const trace = createTrace('stream_thinking', {
    userId: params.userId,
    requestType: 'perception',
    model: 'gpt-4o-mini',
  })

  const span = trace.span('thinking_stream')

  try {
    // Emit perceiving status
    yield {
      event: 'status',
      data: { phase: 'perceiving' } satisfies StatusEvent,
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const stream = await openai.chat.completions.create({
      model: LLM_CONFIG.models.perception,
      max_tokens: TOKEN_BUDGETS.perception,
      stream: true,
      messages: [
        {
          role: 'system',
          content: `You are Nova's thinking process. As you analyze content, express your thoughts naturally and concisely. Focus on what the content is and what might be helpful to do with it.`,
        },
        {
          role: 'user',
          content: `Analyze this ${params.contentType}: ${params.content}`,
        },
      ],
    })

    let fullThinking = ''

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) {
        fullThinking += delta

        // Emit thinking delta
        yield {
          event: 'thinking',
          data: { content: delta } satisfies ThinkingEvent,
        }
      }
    }

    span.end({ output: fullThinking })
  } catch (error) {
    span.error(error instanceof Error ? error : new Error(String(error)))
    throw error
  } finally {
    await flushLangfuse()
  }
}

/**
 * Combined streaming handler for the full cognitive loop
 */
export async function* streamCognitiveLoop(params: {
  content: string
  contentType: 'url' | 'text' | 'image'
  userId?: string
  conversationId?: string
}): AsyncGenerator<StreamEvent> {
  // Phase 1: Perceiving (with visible thinking)
  yield* streamThinking({
    content: params.content,
    contentType: params.contentType,
    userId: params.userId,
  })

  // Phase 2: Reasoning
  yield {
    event: 'status',
    data: { phase: 'reasoning' } satisfies StatusEvent,
  }

  // Phase 3: Response
  yield* streamLLMResponse({
    systemPrompt: `You are Nova, a helpful AI assistant. Based on your analysis of the shared content, provide a natural, conversational response. Be concise but helpful.`,
    userMessage: `The user shared this ${params.contentType}: ${params.content}\n\nRespond naturally about what you found and what you can help with.`,
    phase: 'responding',
    userId: params.userId,
    model: 'gpt-4o-mini',
  })

  // Done event
  yield {
    event: 'done',
    data: {
      conversationId: params.conversationId,
      action: 'responded',
      message: 'Content analyzed',
    } satisfies DoneEvent,
  }
}

/**
 * Helper to emit a status event
 */
export function statusEvent(phase: ProcessingPhase, message?: string): StreamEvent {
  return {
    event: 'status',
    data: { phase, message } satisfies StatusEvent,
  }
}

/**
 * Helper to emit a done event
 */
export function doneEvent(data: DoneEvent): StreamEvent {
  return {
    event: 'done',
    data,
  }
}

/**
 * Helper to emit an error event
 */
export function errorEvent(message: string, retryable = true): StreamEvent {
  return {
    event: 'error',
    data: { message, retryable } satisfies ErrorEvent,
  }
}

/**
 * Check if a request accepts SSE streaming
 */
export function acceptsStreaming(request: Request): boolean {
  const accept = request.headers.get('Accept')
  return accept?.includes('text/event-stream') ?? false
}
