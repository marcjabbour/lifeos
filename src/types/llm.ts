/**
 * LLM Types for Nova AI Integration
 */

// Model routing
export type LLMModel = 'gpt-4o-mini' | 'gpt-4o'
export type EmbeddingModel = 'text-embedding-3-small'

export type TaskType = 'perception' | 'reasoning' | 'execution' | 'summarization'

export interface LLMConfig {
  provider: 'openai'
  models: {
    perception: LLMModel
    reasoning: LLMModel
    execution: LLMModel
    summarization: LLMModel
  }
  embeddings: {
    model: EmbeddingModel
    dimensions: number
  }
}

// Perception types
export interface PerceiveParams {
  content: string
  contentType: 'url' | 'text' | 'image'
  context?: string
}

export interface PerceptionResult {
  contentType: string
  summary: string
  confidence: number
  suggestedActions: string[]
  metadata?: Record<string, unknown>
}

// Reasoning types
export interface ReasonParams {
  perception: PerceptionResult
  context: string
  userMessage?: string
}

export interface ReasoningResult {
  reasoning: string
  confidence: number
  suggestedActions: Array<{
    action: string
    reasoning: string
    params?: Record<string, unknown>
  }>
  estimatedDuration?: string
}

// Execution types
export interface ExecuteParams {
  action: string
  params: Record<string, unknown>
  context?: string
}

export interface ExecutionResult {
  success: boolean
  output: unknown
  error?: string
}

// Embedding types
export interface EmbedParams {
  content: string
  metadata?: Record<string, unknown>
}

export interface EmbeddingResult {
  embedding: number[]
  inputTokens: number
}

// Token usage tracking
export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export interface LLMResponse<T> {
  result: T
  usage: TokenUsage
  model: LLMModel
  latencyMs: number
}

// Confidence levels
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW'

export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence > 0.8) return 'HIGH'
  if (confidence >= 0.5) return 'MEDIUM'
  return 'LOW'
}

// Cost calculation
export interface ModelPricing {
  inputPer1M: number // USD per 1M input tokens
  outputPer1M: number // USD per 1M output tokens
}

export const MODEL_PRICING: Record<LLMModel, ModelPricing> = {
  'gpt-4o-mini': {
    inputPer1M: 0.15,
    outputPer1M: 0.6,
  },
  'gpt-4o': {
    inputPer1M: 2.5,
    outputPer1M: 10.0,
  },
}

export function calculateCost(model: LLMModel, usage: TokenUsage): number {
  const pricing = MODEL_PRICING[model]
  const inputCost = (usage.inputTokens / 1_000_000) * pricing.inputPer1M
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.outputPer1M
  return inputCost + outputCost
}
