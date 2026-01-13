/**
 * Nova LLM Client
 *
 * Unified interface for all LLM operations with automatic tracing,
 * token budget enforcement, and cost tracking.
 */

import OpenAI from "openai";
import {
  LLM_CONFIG,
  TOKEN_BUDGETS,
  RETRY_CONFIG,
  MODEL_FALLBACK,
} from "./config";
import { createTrace, flushLangfuse } from "@/lib/observability/langfuse";
import type {
  LLMModel,
  LLMResponse,
  PerceiveParams,
  PerceptionResult,
  ReasonParams,
  ReasoningResult,
  ExecuteParams,
  ExecutionResult,
  EmbedParams,
  EmbeddingResult,
  TokenUsage,
  TaskType,
} from "@/types/llm";
import { PERCEPTION_SYSTEM_PROMPT, REASONING_SYSTEM_PROMPT } from "./prompts";

let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    openaiInstance = new OpenAI({ apiKey });
  }
  return openaiInstance;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    return RETRY_CONFIG.retryableErrors.some(
      (e) =>
        error.message.includes(e) ||
        (error as NodeJS.ErrnoException).code === e,
    );
  }
  return false;
}

/**
 * Execute an operation with retry logic
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!isRetryableError(error) || attempt === RETRY_CONFIG.maxAttempts) {
        throw lastError;
      }

      const delay = Math.min(
        RETRY_CONFIG.baseDelayMs *
          Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1),
        RETRY_CONFIG.maxDelayMs,
      );

      console.log(
        `[${operationName}] Attempt ${attempt} failed, retrying in ${delay}ms`,
      );
      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Extract token usage from OpenAI response
 */
function extractUsage(response: OpenAI.ChatCompletion): TokenUsage {
  return {
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
    totalTokens: response.usage?.total_tokens ?? 0,
  };
}

export interface ClientContext {
  userId?: string;
  jobId?: string;
  itemId?: string;
  conversationId?: string;
}

/**
 * Nova LLM Client class
 *
 * Provides methods for perception, reasoning, execution, and embedding generation.
 */
export class NovaLLMClient {
  private openai: OpenAI;
  private context: ClientContext;

  constructor(context: ClientContext = {}) {
    this.openai = getOpenAI();
    this.context = context;
  }

  /**
   * PERCEIVE - Quick content analysis
   *
   * Model: GPT-4o-mini
   * Token budget: 1000
   * Latency target: <2s
   */
  async perceive(
    params: PerceiveParams,
  ): Promise<LLMResponse<PerceptionResult>> {
    const model = LLM_CONFIG.models.perception;
    const trace = createTrace("perceive", {
      ...this.context,
      requestType: "perception" as TaskType,
      model,
    });

    const gen = trace.generation("perception_call", {
      content: params.content,
      contentType: params.contentType,
    });

    try {
      const response = await withRetry(
        () =>
          this.openai.chat.completions.create({
            model,
            max_tokens: TOKEN_BUDGETS.perception,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: PERCEPTION_SYSTEM_PROMPT },
              {
                role: "user",
                content: this.buildPerceptionPrompt(params),
              },
            ],
          }),
        "perceive",
      );

      const usage = extractUsage(response);
      const content = response.choices[0]?.message?.content ?? "{}";
      const result = this.parsePerceptionResponse(content);

      const { latencyMs } = gen.end({ output: result, usage });
      await flushLangfuse();

      return { result, usage, model, latencyMs };
    } catch (error) {
      gen.error(error instanceof Error ? error : new Error(String(error)));
      await flushLangfuse();
      throw error;
    }
  }

  /**
   * REASON - Complex decision-making
   *
   * Model: GPT-4o
   * Token budget: 2000
   * Latency target: <5s
   */
  async reason(params: ReasonParams): Promise<LLMResponse<ReasoningResult>> {
    let model = LLM_CONFIG.models.reasoning;
    const trace = createTrace("reason", {
      ...this.context,
      requestType: "reasoning" as TaskType,
      model,
    });

    const gen = trace.generation("reasoning_call", {
      perception: params.perception,
      contextLength: params.context?.length || 0,
    });

    try {
      const response = await withRetry(async () => {
        try {
          return await this.openai.chat.completions.create({
            model,
            max_tokens: TOKEN_BUDGETS.reasoning,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: REASONING_SYSTEM_PROMPT },
              {
                role: "user",
                content: this.buildReasoningPrompt(params),
              },
            ],
          });
        } catch (error) {
          // Fallback to mini if 4o fails
          if (model === "gpt-4o" && isRetryableError(error)) {
            console.log("[reason] Falling back to gpt-4o-mini");
            model = MODEL_FALLBACK["gpt-4o"] as LLMModel;
            return await this.openai.chat.completions.create({
              model,
              max_tokens: TOKEN_BUDGETS.reasoning,
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: REASONING_SYSTEM_PROMPT },
                {
                  role: "user",
                  content: this.buildReasoningPrompt(params),
                },
              ],
            });
          }
          throw error;
        }
      }, "reason");

      const usage = extractUsage(response);
      const content = response.choices[0]?.message?.content ?? "{}";
      const result = this.parseReasoningResponse(content);

      const { latencyMs } = gen.end({ output: result, usage });
      await flushLangfuse();

      return { result, usage, model, latencyMs };
    } catch (error) {
      gen.error(error instanceof Error ? error : new Error(String(error)));
      await flushLangfuse();
      throw error;
    }
  }

  /**
   * EXECUTE - Tool execution
   *
   * Model: GPT-4o-mini
   * Token budget: 2000
   * Latency target: <10s
   */
  async execute(params: ExecuteParams): Promise<LLMResponse<ExecutionResult>> {
    const model = LLM_CONFIG.models.execution;
    const trace = createTrace("execute", {
      ...this.context,
      requestType: "execution" as TaskType,
      model,
    });

    const span = trace.span("execution_call");

    try {
      const response = await withRetry(
        () =>
          this.openai.chat.completions.create({
            model,
            max_tokens: TOKEN_BUDGETS.execution,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: `You are executing a tool action. Respond with JSON containing: { "success": boolean, "output": any, "error": string|null }`,
              },
              {
                role: "user",
                content: JSON.stringify({
                  action: params.action,
                  params: params.params,
                  context: params.context,
                }),
              },
            ],
          }),
        "execute",
      );

      const usage = extractUsage(response);
      const content = response.choices[0]?.message?.content ?? "{}";
      const result = this.parseExecutionResponse(content);

      const { latencyMs } = span.end({ output: result, usage });
      await flushLangfuse();

      return { result, usage, model, latencyMs };
    } catch (error) {
      span.error(error instanceof Error ? error : new Error(String(error)));
      await flushLangfuse();
      throw error;
    }
  }

  /**
   * EMBED - Generate embeddings
   *
   * Model: text-embedding-3-small
   * Dimensions: 1536
   */
  async embed(params: EmbedParams): Promise<EmbeddingResult> {
    const model = LLM_CONFIG.embeddings.model;
    const trace = createTrace("embed", {
      ...this.context,
      requestType: "execution" as TaskType,
      model: "gpt-4o-mini", // Placeholder for tracing
    });

    const span = trace.span("embedding_call");

    try {
      const inputText = params.content || params.text || "";
      const response = await withRetry(
        () =>
          this.openai.embeddings.create({
            model,
            input: inputText,
            dimensions: LLM_CONFIG.embeddings.dimensions,
          }),
        "embed",
      );

      const embedding = response.data[0].embedding;
      const inputTokens = response.usage?.prompt_tokens ?? 0;

      span.end({
        output: { dimensions: embedding.length },
        usage: { inputTokens, outputTokens: 0, totalTokens: inputTokens },
      });
      await flushLangfuse();

      return { embedding, inputTokens };
    } catch (error) {
      span.error(error instanceof Error ? error : new Error(String(error)));
      await flushLangfuse();
      throw error;
    }
  }

  /**
   * SUMMARIZE - Memory compression
   *
   * Model: GPT-4o-mini
   * Token budget: 500
   */
  async summarize(
    content: string,
    targetTokens: number = 200,
  ): Promise<LLMResponse<string>> {
    const model = LLM_CONFIG.models.summarization;
    const trace = createTrace("summarize", {
      ...this.context,
      requestType: "summarization" as TaskType,
      model,
    });

    const span = trace.span("summarization_call");

    try {
      const response = await withRetry(
        () =>
          this.openai.chat.completions.create({
            model,
            max_tokens: TOKEN_BUDGETS.summarization,
            messages: [
              {
                role: "system",
                content: `Summarize the following content concisely. Focus on key decisions, preferences, and important entities. Keep under ${targetTokens} tokens. Write as notes, not prose.`,
              },
              { role: "user", content },
            ],
          }),
        "summarize",
      );

      const usage = extractUsage(response);
      const result = response.choices[0]?.message?.content ?? "";

      const { latencyMs } = span.end({ output: result, usage });
      await flushLangfuse();

      return { result, usage, model, latencyMs };
    } catch (error) {
      span.error(error instanceof Error ? error : new Error(String(error)));
      await flushLangfuse();
      throw error;
    }
  }

  // Private helper methods

  private buildPerceptionPrompt(params: PerceiveParams): string {
    return JSON.stringify({
      content: params.content,
      contentType: params.contentType,
      additionalContext: params.context,
    });
  }

  private buildReasoningPrompt(params: ReasonParams): string {
    return JSON.stringify({
      perception: params.perception,
      context: params.context,
      userMessage: params.userMessage,
    });
  }

  private parsePerceptionResponse(content: string): PerceptionResult {
    try {
      const parsed = JSON.parse(content);
      return {
        contentType: parsed.contentType ?? "unknown",
        summary: parsed.summary ?? "",
        confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.5)),
        suggestedActions: Array.isArray(parsed.suggestedActions)
          ? parsed.suggestedActions
          : [],
        metadata: parsed.metadata,
      };
    } catch {
      return {
        contentType: "unknown",
        summary: "Failed to parse content",
        confidence: 0,
        suggestedActions: [],
      };
    }
  }

  private parseReasoningResponse(content: string): ReasoningResult {
    try {
      const parsed = JSON.parse(content);
      return {
        reasoning: parsed.reasoning ?? "",
        confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.5)),
        suggestedActions: Array.isArray(parsed.suggestedActions)
          ? parsed.suggestedActions.map((a: Record<string, unknown>) => ({
              action: String(a.action ?? ""),
              reasoning: String(a.reasoning ?? ""),
              params: a.params as Record<string, unknown> | undefined,
            }))
          : [],
        estimatedDuration: parsed.estimatedDuration,
      };
    } catch {
      return {
        reasoning: "Failed to parse reasoning",
        confidence: 0,
        suggestedActions: [],
      };
    }
  }

  private parseExecutionResponse(content: string): ExecutionResult {
    try {
      const parsed = JSON.parse(content);
      return {
        success: Boolean(parsed.success),
        output: parsed.output,
        error: parsed.error ?? undefined,
      };
    } catch {
      return {
        success: false,
        output: null,
        error: "Failed to parse execution response",
      };
    }
  }
}

/**
 * Create a new Nova LLM client instance
 */
export function createLLMClient(context?: ClientContext): NovaLLMClient {
  return new NovaLLMClient(context);
}
