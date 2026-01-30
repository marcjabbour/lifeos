/**
 * Langfuse Integration for LLM Observability
 */

import { Langfuse } from "langfuse";

let langfuseInstance: Langfuse | null = null;

export type LLMModel =
  | "gpt-4o"
  | "gpt-4o-mini"
  | "gemini-2.0-flash"
  | "gemini-1.5-flash"
  | "gemini-1.5-pro";

export type TaskType = "perception" | "reasoning" | "execution";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens?: number;
}

const MODEL_COSTS: Record<LLMModel, { input: number; output: number }> = {
  "gpt-4o": { input: 2.5 / 1_000_000, output: 10.0 / 1_000_000 },
  "gpt-4o-mini": { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
  "gemini-2.0-flash": { input: 0.1 / 1_000_000, output: 0.4 / 1_000_000 },
  "gemini-1.5-flash": { input: 0.075 / 1_000_000, output: 0.3 / 1_000_000 },
  "gemini-1.5-pro": { input: 1.25 / 1_000_000, output: 5.0 / 1_000_000 },
};

export function calculateCost(model: LLMModel, usage: TokenUsage): number {
  const costs = MODEL_COSTS[model];
  if (!costs) return 0;
  return costs.input * usage.inputTokens + costs.output * usage.outputTokens;
}

export function getLangfuse(): Langfuse {
  if (!langfuseInstance) {
    const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
    const secretKey = process.env.LANGFUSE_SECRET_KEY;
    const host = process.env.LANGFUSE_HOST || "https://cloud.langfuse.com";

    if (!publicKey || !secretKey) {
      console.warn("[Langfuse] Missing API keys - tracing disabled");
      return createNoOpLangfuse();
    }

    langfuseInstance = new Langfuse({
      publicKey,
      secretKey,
      baseUrl: host,
    });
  }

  return langfuseInstance;
}

function createNoOpLangfuse(): Langfuse {
  return {
    trace: () => ({
      id: "noop",
      span: () => ({
        id: "noop",
        end: () => {},
        update: () => {},
      }),
      generation: () => ({
        id: "noop",
        end: () => {},
        update: () => {},
      }),
      update: () => {},
    }),
    flush: async () => {},
    shutdownAsync: async () => {},
  } as unknown as Langfuse;
}

export interface TraceMetadata {
  userId?: string;
  jobId?: string;
  itemId?: string;
  conversationId?: string;
  requestType: TaskType;
  model: LLMModel;
}

export function createTrace(name: string, metadata: TraceMetadata) {
  const langfuse = getLangfuse();

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
  });

  return {
    trace,
    span(spanName: string) {
      const startTime = Date.now();
      const span = trace.span({
        name: spanName,
        metadata: { model: metadata.model },
      });

      return {
        span,
        end(result: {
          output?: unknown;
          usage?: TokenUsage;
          cacheHit?: boolean;
        }) {
          const latencyMs = Date.now() - startTime;
          const cost = result.usage
            ? calculateCost(metadata.model, result.usage)
            : undefined;

          span.end({
            output: result.output,
            metadata: {
              latencyMs,
              inputTokens: result.usage?.inputTokens,
              outputTokens: result.usage?.outputTokens,
              costUsd: cost,
              cacheHit: result.cacheHit,
            },
          });

          return { latencyMs, cost };
        },
        error(error: Error) {
          const latencyMs = Date.now() - startTime;
          span.end({
            level: "ERROR",
            statusMessage: error.message,
            metadata: { latencyMs },
          });
          return { latencyMs };
        },
      };
    },
    generation(generationName: string, input: unknown) {
      const startTime = Date.now();
      const generation = trace.generation({
        name: generationName,
        model: metadata.model,
        input,
      });

      return {
        generation,
        end(result: { output: unknown; usage: TokenUsage }) {
          const latencyMs = Date.now() - startTime;
          const cost = calculateCost(metadata.model, result.usage);

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
          });

          return { latencyMs, cost };
        },
        error(error: Error) {
          const latencyMs = Date.now() - startTime;
          generation.end({
            level: "ERROR",
            statusMessage: error.message,
            metadata: { latencyMs },
          });
          return { latencyMs };
        },
      };
    },
  };
}

export async function flushLangfuse(): Promise<void> {
  const langfuse = getLangfuse();
  await langfuse.flush();
}

export async function shutdownLangfuse(): Promise<void> {
  if (langfuseInstance) {
    await langfuseInstance.shutdownAsync();
    langfuseInstance = null;
  }
}
