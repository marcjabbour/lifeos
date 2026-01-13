/**
 * Tool Definitions for Nova Job Execution
 *
 * Defines available tools and their execution framework.
 * Tools are executed as durable steps in Inngest/Trigger.dev.
 */

import { createLLMClient } from "@/lib/llm";
import { createTrace, flushLangfuse } from "@/lib/observability/langfuse";

// Tool interface
export interface Tool {
  name: string;
  description: string;
  timeout: number; // ms
  execute: (
    params: Record<string, unknown>,
    context: ToolContext,
  ) => Promise<unknown>;
}

export interface ToolContext {
  userId: string;
  jobId?: string;
  itemId?: string;
  traceId?: string;
}

export interface ToolResult {
  success: boolean;
  output: unknown;
  error?: string;
  duration: number;
}

// Available tools
export const AVAILABLE_TOOLS: Record<string, Tool> = {
  fetch_content: {
    name: "fetch_content",
    description: "Retrieve content from a URL (web page, PDF, etc.)",
    timeout: 15000,
    execute: fetchContent,
  },

  summarize: {
    name: "summarize",
    description: "Generate a summary of provided content",
    timeout: 30000,
    execute: summarizeContent,
  },

  web_search: {
    name: "web_search",
    description: "Search the web for information",
    timeout: 10000,
    execute: webSearch,
  },

  analyze_image: {
    name: "analyze_image",
    description: "Analyze an image using vision model",
    timeout: 20000,
    execute: analyzeImage,
  },

  extract_metadata: {
    name: "extract_metadata",
    description: "Extract structured metadata from content",
    timeout: 10000,
    execute: extractMetadata,
  },

  synthesize: {
    name: "synthesize",
    description: "Combine multiple results into final output",
    timeout: 30000,
    execute: synthesizeResults,
  },
};

// Action allowlist for plan validation
export const ALLOWED_ACTIONS = Object.keys(AVAILABLE_TOOLS);

/**
 * Execute a tool with tracking and error handling
 */
export async function executeTool(
  toolName: string,
  params: Record<string, unknown>,
  context: ToolContext,
): Promise<ToolResult> {
  const tool = AVAILABLE_TOOLS[toolName];

  if (!tool) {
    return {
      success: false,
      output: null,
      error: `Unknown tool: ${toolName}`,
      duration: 0,
    };
  }

  const trace = createTrace("tool_execution", {
    userId: context.userId,
    jobId: context.jobId,
    itemId: context.itemId,
    requestType: "execution",
    model: "gpt-4o-mini",
  });

  const span = trace.span(`tool_${toolName}`);
  const startTime = Date.now();

  try {
    // Execute with timeout
    const result = await Promise.race([
      tool.execute(params, context),
      timeout(tool.timeout),
    ]);

    const duration = Date.now() - startTime;

    span.end({
      output: result,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    });

    return {
      success: true,
      output: result,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    span.error(error instanceof Error ? error : new Error(errorMessage));

    return {
      success: false,
      output: null,
      error: errorMessage,
      duration,
    };
  } finally {
    await flushLangfuse();
  }
}

/**
 * Timeout helper
 */
function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Tool timeout after ${ms}ms`)), ms);
  });
}

// Tool implementations

/**
 * Fetch content from a URL
 */
async function fetchContent(
  params: Record<string, unknown>,
  context: ToolContext,
): Promise<{ title?: string; content: string; url: string }> {
  const url = params.url as string;

  if (!url) {
    throw new Error("URL is required");
  }

  // Validate URL
  const parsed = new URL(url);
  const blockedHosts = ["localhost", "127.0.0.1", "0.0.0.0"];
  if (blockedHosts.includes(parsed.hostname)) {
    throw new Error("Internal URLs not allowed");
  }

  // Fetch with timeout
  const controller = new AbortController();
  const fetchTimeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "LifeOS/1.0 (https://lifeos.app)",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";
    let content = "";
    let title: string | undefined;

    if (contentType.includes("text/html")) {
      const html = await response.text();
      // Basic HTML parsing - extract title and text
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      title = titleMatch?.[1]?.trim();

      // Strip HTML tags for content
      content = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 10000); // Limit content length
    } else if (contentType.includes("application/json")) {
      const json = await response.json();
      content = JSON.stringify(json, null, 2).slice(0, 10000);
    } else {
      content = (await response.text()).slice(0, 10000);
    }

    return { title, content, url };
  } finally {
    clearTimeout(fetchTimeout);
  }
}

/**
 * Summarize content using LLM
 */
async function summarizeContent(
  params: Record<string, unknown>,
  context: ToolContext,
): Promise<{ summary: string; keyPoints: string[] }> {
  const content = params.content as string;
  const depth = (params.depth as string) || "medium";

  if (!content) {
    throw new Error("Content is required");
  }

  const client = createLLMClient({ userId: context.userId });

  // Determine target length based on depth
  const targetTokens =
    depth === "brief" ? 100 : depth === "detailed" ? 500 : 250;

  const response = await client.summarize(content, targetTokens);

  // Extract key points from summary
  const keyPoints = response.result
    .split(/[.!?]/)
    .filter((s: string) => s.trim().length > 20)
    .slice(0, 5)
    .map((s: string) => s.trim());

  return {
    summary: response.result,
    keyPoints,
  };
}

/**
 * Web search (placeholder - requires external API)
 */
async function webSearch(
  params: Record<string, unknown>,
  context: ToolContext,
): Promise<{
  results: Array<{ title: string; url: string; snippet: string }>;
}> {
  const query = params.query as string;
  const limit = (params.limit as number) || 5;

  if (!query) {
    throw new Error("Query is required");
  }

  // TODO: Implement actual web search via Tavily/Serper API
  // For now, return placeholder
  console.log(`[web_search] Query: ${query}, Limit: ${limit}`);

  return {
    results: [
      {
        title: "Search not implemented",
        url: "https://example.com",
        snippet: "Web search requires Tavily or Serper API integration",
      },
    ],
  };
}

/**
 * Analyze image using vision model
 */
async function analyzeImage(
  params: Record<string, unknown>,
  context: ToolContext,
): Promise<{ description: string; objects: string[]; text?: string }> {
  const imageUrl = params.imageUrl as string;
  const prompt = (params.prompt as string) || "Describe this image in detail.";

  if (!imageUrl) {
    throw new Error("Image URL is required");
  }

  // TODO: Implement vision model call
  // For now, return placeholder
  console.log(`[analyze_image] URL: ${imageUrl}, Prompt: ${prompt}`);

  return {
    description: "Image analysis requires vision model integration",
    objects: [],
  };
}

/**
 * Extract structured metadata from content
 */
async function extractMetadata(
  params: Record<string, unknown>,
  context: ToolContext,
): Promise<Record<string, unknown>> {
  const content = params.content as string;
  const schema = params.schema as Record<string, unknown>;

  if (!content) {
    throw new Error("Content is required");
  }

  const client = createLLMClient({ userId: context.userId });

  const response = await client.execute({
    action: "extract_metadata",
    params: { content, schema },
    context: `Extract structured data from the following content according to the schema.`,
  });

  return response.result.output as Record<string, unknown>;
}

/**
 * Synthesize multiple results into final output
 */
async function synthesizeResults(
  params: Record<string, unknown>,
  context: ToolContext,
): Promise<{ synthesis: string; highlights: string[] }> {
  const results = params.results as Array<Record<string, unknown>>;
  const goal = params.goal as string;

  if (!results || results.length === 0) {
    throw new Error("Results are required");
  }

  const client = createLLMClient({ userId: context.userId });

  const content = results
    .map((r, i) => `Result ${i + 1}:\n${JSON.stringify(r, null, 2)}`)
    .join("\n\n");

  const response = await client.summarize(
    `Goal: ${goal}\n\nResults to synthesize:\n${content}`,
    300,
  );

  // Extract highlights
  const highlights = response.result
    .split(/[.!?]/)
    .filter((s: string) => s.trim().length > 20)
    .slice(0, 3)
    .map((s: string) => s.trim());

  return {
    synthesis: response.result,
    highlights,
  };
}

/**
 * Get tool by name
 */
export function getTool(name: string): Tool | undefined {
  return AVAILABLE_TOOLS[name];
}

/**
 * Check if an action is allowed
 */
export function isAllowedAction(action: string): boolean {
  return ALLOWED_ACTIONS.includes(action);
}
