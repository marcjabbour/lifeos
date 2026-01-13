/**
 * Context Assembly for Nova
 *
 * Assembles context from memory tiers:
 * - Working memory (last 10-15 conversation messages)
 * - Session summaries
 * - Vector search (RAG)
 * - User profile
 */

import { createLLMClient } from '@/lib/llm'
import { createTrace, flushLangfuse } from '@/lib/observability/langfuse'

// Token budgets for each context component
const CONTEXT_TOKEN_BUDGETS = {
  systemPrompt: 800,
  userProfile: 300,
  sessionSummary: 500,
  workingMemory: 2000,
  ragContext: 1000,
  totalHardLimit: 6600,
} as const

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface RetrievalResult {
  sourceType: 'item' | 'enrichment' | 'conversation'
  sourceId: string
  content: string
  similarity: number
  metadata?: Record<string, unknown>
}

export interface UserProfile {
  summary?: string
  preferences?: Record<string, unknown>
  totalInteractions?: number
}

export interface ContextAssemblyInput {
  query: string
  userId: string
  conversationId?: string
  workingMemory?: ConversationMessage[]
  sessionSummary?: string
  includeRag?: boolean
}

export interface ContextAssembly {
  // Raw retrieved data
  workingMemory: ConversationMessage[]
  sessionSummary?: string
  ragResults: RetrievalResult[]
  userProfile?: UserProfile

  // Formatted context string ready for prompt injection
  formatted: string

  // Token usage estimate
  estimatedTokens: number
}

/**
 * Assemble context from all memory tiers
 *
 * This is the core function that gathers context for Nova's reasoning.
 */
export async function assembleContext(input: ContextAssemblyInput): Promise<ContextAssembly> {
  const trace = createTrace('assemble_context', {
    userId: input.userId,
    conversationId: input.conversationId,
    requestType: 'execution',
    model: 'gpt-4o-mini',
  })

  const span = trace.span('context_assembly')

  try {
    // Parallel fetches for all context sources
    const [userProfile, ragResults] = await Promise.all([
      loadUserProfile(input.userId),
      input.includeRag !== false
        ? retrieveSimilarContent(input.query, input.userId)
        : Promise.resolve([]),
    ])

    // Use provided working memory or empty array
    const workingMemory = input.workingMemory ?? []

    // Format the context for prompt injection
    const formatted = formatContext({
      workingMemory,
      sessionSummary: input.sessionSummary,
      ragResults,
      userProfile,
    })

    // Estimate token count (rough: 4 chars per token)
    const estimatedTokens = Math.ceil(formatted.length / 4)

    const result: ContextAssembly = {
      workingMemory,
      sessionSummary: input.sessionSummary,
      ragResults,
      userProfile,
      formatted,
      estimatedTokens,
    }

    span.end({
      output: {
        memoryMessages: workingMemory.length,
        ragResults: ragResults.length,
        hasProfile: !!userProfile,
        estimatedTokens,
      },
    })

    return result
  } catch (error) {
    span.error(error instanceof Error ? error : new Error(String(error)))
    throw error
  } finally {
    await flushLangfuse()
  }
}

/**
 * Load user profile from database
 */
async function loadUserProfile(userId: string): Promise<UserProfile | undefined> {
  // TODO: Implement actual database fetch when backend is ready
  // For now, return undefined as we don't have persistent profiles yet
  return undefined
}

/**
 * Retrieve similar content via vector search
 */
async function retrieveSimilarContent(query: string, userId: string): Promise<RetrievalResult[]> {
  // TODO: Implement actual vector search when embeddings are ready
  // This will call the match_embeddings Supabase function
  return []
}

/**
 * Format context for prompt injection
 */
function formatContext(parts: {
  workingMemory: ConversationMessage[]
  sessionSummary?: string
  ragResults: RetrievalResult[]
  userProfile?: UserProfile
}): string {
  const sections: string[] = []

  // User profile section
  if (parts.userProfile?.summary) {
    sections.push(`## About this user\n${parts.userProfile.summary}`)
  }

  // Session summary section
  if (parts.sessionSummary) {
    sections.push(`## Earlier in this conversation\n${parts.sessionSummary}`)
  }

  // RAG results section
  if (parts.ragResults.length > 0) {
    const ragSection = parts.ragResults
      .map((r) => `- ${r.content} (similarity: ${r.similarity.toFixed(2)})`)
      .join('\n')
    sections.push(`## Related context\n${ragSection}`)
  }

  // Working memory section (recent messages)
  if (parts.workingMemory.length > 0) {
    const memorySection = parts.workingMemory
      .map((m) => `${m.role === 'user' ? 'User' : 'Nova'}: ${m.content}`)
      .join('\n\n')
    sections.push(`## Recent conversation\n${memorySection}`)
  }

  return sections.join('\n\n---\n\n')
}

/**
 * Trim context to fit within token budget
 *
 * Prioritizes:
 * 1. User profile (always kept)
 * 2. Recent working memory
 * 3. Session summary
 * 4. RAG results (trimmed first)
 */
export function trimContextToFit(
  context: ContextAssembly,
  maxTokens: number = CONTEXT_TOKEN_BUDGETS.totalHardLimit
): ContextAssembly {
  // If already within budget, return as-is
  if (context.estimatedTokens <= maxTokens) {
    return context
  }

  const trimmed = { ...context }
  let currentTokens = context.estimatedTokens

  // First, trim RAG results (lowest priority)
  while (trimmed.ragResults.length > 0 && currentTokens > maxTokens) {
    trimmed.ragResults = trimmed.ragResults.slice(0, -1)
    currentTokens = estimateTokens(trimmed)
  }

  // Then, trim older messages from working memory
  while (trimmed.workingMemory.length > 3 && currentTokens > maxTokens) {
    trimmed.workingMemory = trimmed.workingMemory.slice(1)
    currentTokens = estimateTokens(trimmed)
  }

  // Re-format the context
  trimmed.formatted = formatContext(trimmed)
  trimmed.estimatedTokens = currentTokens

  return trimmed
}

/**
 * Estimate token count for a context assembly
 */
function estimateTokens(context: ContextAssembly): number {
  const formatted = formatContext(context)
  return Math.ceil(formatted.length / 4)
}

/**
 * Build working memory from conversation messages
 *
 * Keeps the most recent messages within the token budget.
 */
export function buildWorkingMemory(
  messages: ConversationMessage[],
  maxMessages: number = 15,
  maxTokens: number = CONTEXT_TOKEN_BUDGETS.workingMemory
): ConversationMessage[] {
  // Take the most recent messages
  let memory = messages.slice(-maxMessages)

  // Estimate and trim if needed
  let estimatedTokens = memory.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0)

  while (memory.length > 3 && estimatedTokens > maxTokens) {
    memory = memory.slice(1)
    estimatedTokens = memory.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0)
  }

  return memory
}

/**
 * Check if conversation needs summarization
 *
 * Triggers when working memory exceeds threshold.
 */
export function needsSummarization(messageCount: number, threshold: number = 15): boolean {
  return messageCount > threshold
}

/**
 * Summarize older messages for session summary
 */
export async function summarizeMessages(
  messages: ConversationMessage[],
  userId?: string
): Promise<string> {
  if (messages.length === 0) {
    return ''
  }

  const client = createLLMClient({ userId })

  const content = messages.map((m) => `${m.role}: ${m.content}`).join('\n')

  const response = await client.summarize(content, 200)
  return response.result
}
