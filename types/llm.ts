/**
 * LLM-related types and utilities
 */

// Confidence levels for planning decisions
export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

/**
 * Get confidence level from a numeric confidence value
 */
export function getConfidenceLevel(confidence?: number): ConfidenceLevel {
  if (confidence === undefined) return "MEDIUM";
  if (confidence >= 0.8) return "HIGH";
  if (confidence >= 0.5) return "MEDIUM";
  return "LOW";
}

// Supported LLM models
export type LLMModel =
  | "gpt-4o"
  | "gpt-4o-mini"
  | "gpt-4-turbo"
  | "gpt-3.5-turbo"
  | "claude-3-opus"
  | "claude-3-sonnet"
  | "claude-3-haiku";

// Token usage tracking
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

// Model pricing per 1M tokens (in USD)
export const MODEL_PRICING: Record<
  LLMModel,
  { input: number; output: number }
> = {
  "gpt-4o": { input: 5.0, output: 15.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4-turbo": { input: 10.0, output: 30.0 },
  "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
  "claude-3-opus": { input: 15.0, output: 75.0 },
  "claude-3-sonnet": { input: 3.0, output: 15.0 },
  "claude-3-haiku": { input: 0.25, output: 1.25 },
};

/**
 * Calculate cost for a given model and token usage
 * @returns Cost in USD
 */
export function calculateCost(model: LLMModel, usage: TokenUsage): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;

  const inputCost = (usage.inputTokens / 1_000_000) * pricing.input;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}

// LLM response types
export interface LLMResponse<T = string> {
  content?: string;
  result: T;
  model: LLMModel;
  usage: TokenUsage;
  finishReason?: "stop" | "length" | "content_filter" | "tool_calls";
  latencyMs?: number;
}

// Streaming chunk
export interface LLMStreamChunk {
  delta: string;
  finishReason?: LLMResponse["finishReason"];
}

// Task types for Nova cognitive loop
export type TaskType =
  | "perception"
  | "reasoning"
  | "execution"
  | "embedding"
  | "summarization";

// Perception params and result
export interface PerceiveParams {
  content: string;
  contentType: "url" | "text" | "image";
  context?: string;
}

export interface PerceptionResult {
  summary: string;
  contentType: string;
  entities?: string[];
  topics?: string[];
  sentiment?: "positive" | "negative" | "neutral" | "mixed";
  confidence: number;
  suggestedActions?: string[];
  metadata?: Record<string, unknown>;
}

// Reasoning params and result
export interface ReasonParams {
  perception: PerceptionResult;
  userProfile?: Record<string, unknown>;
  context?: string;
  userMessage?: string;
}

export interface ReasoningResult {
  reasoning?: string;
  insights?: string[];
  connections?: Array<{ sourceId: string; reason: string }>;
  suggestedActions?: Array<{
    action: string;
    reasoning: string;
    params?: Record<string, unknown>;
  }>;
  priority?: "high" | "medium" | "low";
  confidence?: number;
  estimatedDuration?: number;
}

// Execution params and result
export interface ExecuteParams {
  action: string;
  params: Record<string, unknown>;
  context?: string;
}

export interface ExecutionResult {
  success: boolean;
  output: unknown;
  error?: string;
}

// Embedding params and result
export interface EmbedParams {
  text?: string;
  content?: string; // Alias for text
  model?: "text-embedding-3-small" | "text-embedding-3-large";
}

export interface EmbeddingResult {
  embedding: number[];
  model?: string;
  dimensions?: number;
  inputTokens?: number;
}

// LLM Configuration types
export interface LLMConfig {
  provider: "openai" | "anthropic";
  models: {
    perception: LLMModel;
    reasoning: LLMModel;
    execution: LLMModel;
    summarization: LLMModel;
  };
  embeddings: {
    model: "text-embedding-3-small" | "text-embedding-3-large";
    dimensions: number;
  };
}
