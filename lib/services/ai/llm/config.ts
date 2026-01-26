/**
 * LLM Configuration for Nova
 *
 * Model routing strategy:
 * - Perception: gpt-4o-mini (fast, cheap - content analysis)
 * - Reasoning: gpt-4o (powerful - planning, decisions)
 * - Execution: gpt-4o-mini (fast - tool execution)
 * - Summarization: gpt-4o-mini (fast - memory compression)
 */

import type { LLMConfig } from '@/types/llm'

export const LLM_CONFIG: LLMConfig = {
  provider: 'openai',
  models: {
    perception: 'gpt-4o-mini',
    reasoning: 'gpt-4o',
    execution: 'gpt-4o-mini',
    summarization: 'gpt-4o-mini',
  },
  embeddings: {
    model: 'text-embedding-3-small',
    dimensions: 1536,
  },
}

// Token budgets per stage
export const TOKEN_BUDGETS = {
  perception: 1000,
  reasoning: 2000,
  execution: 2000,
  summarization: 500,
  response: 1000,
} as const

// Latency targets (ms)
export const LATENCY_TARGETS = {
  perception: 2000,
  reasoning: 5000,
  execution: 10000,
  summarization: 3000,
} as const

// Retry configuration
export const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableErrors: ['rate_limit_error', 'api_error', 'timeout', 'ECONNRESET'],
} as const

// Model fallback configuration
export const MODEL_FALLBACK = {
  'gpt-4o': 'gpt-4o-mini', // Fallback to mini if 4o fails
} as const
