/**
 * ADK Multi-Agent Orchestrator
 *
 * Uses Google ADK's SequentialAgent to coordinate three agents:
 * 1. InputAnalyzer - Detects content type, extracts text from images/audio
 * 2. ActionDecider - Classifies intent, decides on URL fetch/web search
 * 3. ActionExecutor - Creates items, generates embeddings, formats output
 *
 * This replaces the custom orchestrator with the actual Google ADK framework.
 */

// =============================================================================
// Logging Utilities
// =============================================================================

const LOG_PREFIX = "[ADK]";

function logSection(title: string): void {
  console.log(`\n${LOG_PREFIX} ${"═".repeat(50)}`);
  console.log(`${LOG_PREFIX} 🚀 ${title}`);
  console.log(`${LOG_PREFIX} ${"═".repeat(50)}\n`);
}

function logStep(step: string, details?: Record<string, unknown>): void {
  console.log(`${LOG_PREFIX} ▶ ${step}`);
  if (details) {
    Object.entries(details).forEach(([key, value]) => {
      const displayValue =
        typeof value === "string" && value.length > 100
          ? `${value.slice(0, 100)}...`
          : value;
      console.log(`${LOG_PREFIX}   └─ ${key}: ${JSON.stringify(displayValue)}`);
    });
  }
}

function logSuccess(message: string, details?: Record<string, unknown>): void {
  console.log(`${LOG_PREFIX} ✅ ${message}`);
  if (details) {
    Object.entries(details).forEach(([key, value]) => {
      console.log(`${LOG_PREFIX}   └─ ${key}: ${JSON.stringify(value)}`);
    });
  }
}

function logError(message: string, error?: unknown): void {
  console.error(`${LOG_PREFIX} ❌ ${message}`);
  if (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`${LOG_PREFIX}   └─ Error: ${errorMsg}`);
    if (error instanceof Error && error.stack) {
      const stackLines = error.stack.split("\n").slice(1, 4).join("\n       ");
      console.error(`${LOG_PREFIX}   └─ Stack: ${stackLines}`);
    }
  }
}

function logTool(
  toolName: string,
  action: "invoke" | "success" | "error",
  details?: Record<string, unknown>,
): void {
  const icons: Record<string, string> = {
    invoke: "🔧",
    success: "✓",
    error: "✗",
  };
  console.log(`${LOG_PREFIX} ${icons[action]} Tool [${toolName}] ${action}`);
  if (details) {
    Object.entries(details).forEach(([key, value]) => {
      const displayValue =
        typeof value === "string" && value.length > 200
          ? `${value.slice(0, 200)}...`
          : value;
      console.log(`${LOG_PREFIX}   └─ ${key}: ${JSON.stringify(displayValue)}`);
    });
  }
}

function logAgent(
  agentName: string,
  phase: "start" | "processing" | "complete" | "output",
  details?: Record<string, unknown>,
): void {
  const icons: Record<string, string> = {
    start: "🤖",
    processing: "⏳",
    complete: "✅",
    output: "📤",
  };
  console.log(`${LOG_PREFIX} ${icons[phase]} Agent [${agentName}] ${phase}`);
  if (details) {
    Object.entries(details).forEach(([key, value]) => {
      const displayValue =
        typeof value === "string" && value.length > 300
          ? `${value.slice(0, 300)}...`
          : value;
      console.log(`${LOG_PREFIX}   └─ ${key}: ${JSON.stringify(displayValue)}`);
    });
  }
}

function logPipelineState(state: Record<string, unknown>): void {
  console.log(`${LOG_PREFIX} 📊 Pipeline State:`);
  Object.entries(state).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      const displayValue =
        typeof value === "object"
          ? JSON.stringify(value).slice(0, 200)
          : String(value).slice(0, 100);
      console.log(
        `${LOG_PREFIX}   └─ ${key}: ${displayValue}${String(value).length > 100 ? "..." : ""}`,
      );
    }
  });
}

// =============================================================================
// Imports
// =============================================================================

import {
  LlmAgent,
  SequentialAgent,
  FunctionTool,
  InMemoryRunner,
  isFinalResponse,
} from "@google/adk";
import { createUserContent, Type } from "@google/genai";
import type { Schema } from "@google/genai";
import {
  createTrace,
  flushLangfuse,
} from "@/lib/services/ai/observability/langfuse";
import {
  AGENT_CONFIGS,
  isOrchestratorEnabled,
  type OrchestratorInput,
  type OrchestratorResult,
  type ContentType,
} from "./config";
import { fetchUrlContent } from "./action-decider/tools/web-fetch";
import { searchWeb } from "./action-decider/tools/web-search";
import { createOrUpdateItem } from "./action-executor/tools/item-creator";
import { generateAndStoreEmbedding } from "./action-executor/tools/embedding";

// Re-export for external use
export { isOrchestratorEnabled };
export type { ContentType };

/**
 * Check if orchestrator should be used for this content type
 */
export function shouldUseOrchestrator(contentType: string): boolean {
  if (!isOrchestratorEnabled()) return false;
  const supportedTypes = ["url", "text", "image", "audio"];
  return supportedTypes.includes(contentType.toLowerCase());
}

// =============================================================================
// Tool Parameter Schemas (using @google/genai Type enum)
// =============================================================================

const webFetchSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    url: {
      type: Type.STRING,
      description: "The URL to fetch",
    },
  },
  required: ["url"],
};

const webSearchSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    query: {
      type: Type.STRING,
      description: "The search query",
    },
    contentType: {
      type: Type.STRING,
      description:
        "The type of content being searched for (restaurant, place, book, movie, product, etc.)",
    },
  },
  required: ["query", "contentType"],
};

const createItemSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    userId: {
      type: Type.STRING,
      description: "The user ID",
    },
    title: {
      type: Type.STRING,
      description: "The title of the item",
    },
    summary: {
      type: Type.STRING,
      description: "A brief summary of the item",
    },
    category: {
      type: Type.STRING,
      description: "The category for the item",
    },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Tags for the item",
    },
    contentType: {
      type: Type.STRING,
      description: "The content type",
    },
    contentUrl: {
      type: Type.STRING,
      description: "The original URL if applicable",
    },
    existingItemId: {
      type: Type.STRING,
      description: "ID of existing item to update",
    },
  },
  required: ["userId", "title", "summary", "category", "tags", "contentType"],
};

const generateEmbeddingSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    userId: {
      type: Type.STRING,
      description: "The user ID",
    },
    itemId: {
      type: Type.STRING,
      description: "The item ID to generate embeddings for",
    },
    title: {
      type: Type.STRING,
      description: "The title of the item",
    },
    content: {
      type: Type.STRING,
      description: "The content to embed",
    },
    summary: {
      type: Type.STRING,
      description: "A summary to embed",
    },
    category: {
      type: Type.STRING,
      description: "The category",
    },
    contentType: {
      type: Type.STRING,
      description: "The content type",
    },
  },
  required: ["userId", "itemId", "title"],
};

// =============================================================================
// Tool Input Types
// =============================================================================

interface WebFetchInput {
  url: string;
}

interface WebSearchInput {
  query: string;
  contentType: string;
}

interface CreateItemInput {
  userId: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  contentType: string;
  contentUrl?: string;
  existingItemId?: string;
}

interface GenerateEmbeddingInput {
  userId: string;
  itemId: string;
  title: string;
  content?: string;
  summary?: string;
  category?: string;
  contentType?: string;
}

// =============================================================================
// Tool Definitions using FunctionTool with JSON Schema
// =============================================================================

/**
 * Web Fetch Tool - Fetches and extracts metadata from URLs
 */
const webFetchTool = new FunctionTool({
  name: "fetch_url_content",
  description:
    "Fetches a URL and extracts metadata including title, description, and content. Use this when you need to get information about a web page.",
  parameters: webFetchSchema,
  execute: async (input: unknown) => {
    const { url } = input as WebFetchInput;
    const startTime = Date.now();
    logTool("fetch_url_content", "invoke", { url });
    try {
      const result = await fetchUrlContent(url, {});
      const durationMs = Date.now() - startTime;
      logTool("fetch_url_content", "success", {
        durationMs,
        title: result.title,
        hasDescription: !!result.description,
        hasError: !!result.error,
      });
      return JSON.stringify(result);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      logTool("fetch_url_content", "error", {
        durationMs,
        error: String(error),
      });
      throw error;
    }
  },
});

/**
 * Web Search Tool - Searches the web for information
 */
const webSearchTool = new FunctionTool({
  name: "search_web",
  description:
    "Searches the web for information about a topic. Use this when you need to find more details about restaurants, places, books, movies, or other entities.",
  parameters: webSearchSchema,
  execute: async (input: unknown) => {
    const { query, contentType } = input as WebSearchInput;
    const startTime = Date.now();
    logTool("search_web", "invoke", { query, contentType });
    try {
      const result = await searchWeb(query, contentType, {});
      const durationMs = Date.now() - startTime;
      logTool("search_web", "success", {
        durationMs,
        name: result.name,
        source: result.source,
        hasError: !!result.error,
      });
      return JSON.stringify(result);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      logTool("search_web", "error", { durationMs, error: String(error) });
      throw error;
    }
  },
});

/**
 * Create Item Tool - Creates or updates items in the database
 */
const createItemTool = new FunctionTool({
  name: "create_item",
  description:
    "Creates or updates an item in the database. Use this to save content that the user wants to remember.",
  parameters: createItemSchema,
  execute: async (input: unknown) => {
    const params = input as CreateItemInput;
    const startTime = Date.now();
    logTool("create_item", "invoke", {
      title: params.title,
      category: params.category,
      tags: params.tags,
      isUpdate: !!params.existingItemId,
    });
    try {
      const result = await createOrUpdateItem({
        userId: params.userId,
        title: params.title,
        category: params.category,
        tags: params.tags,
        contentType: params.contentType,
        url: params.contentUrl,
        existingItemId: params.existingItemId,
        enrichment: {
          summary: params.summary,
          confidence: 0.8,
          processedAt: new Date().toISOString(),
        },
      });
      const durationMs = Date.now() - startTime;
      logTool("create_item", "success", {
        durationMs,
        itemId: result.itemId,
        success: result.success,
      });
      return JSON.stringify(result);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      logTool("create_item", "error", { durationMs, error: String(error) });
      throw error;
    }
  },
});

/**
 * Generate Embedding Tool - Generates and stores embeddings for semantic search
 */
const generateEmbeddingTool = new FunctionTool({
  name: "generate_embedding",
  description:
    "Generates and stores embeddings for an item to enable semantic search. Call this after creating an item.",
  parameters: generateEmbeddingSchema,
  execute: async (input: unknown) => {
    const params = input as GenerateEmbeddingInput;
    const startTime = Date.now();
    logTool("generate_embedding", "invoke", {
      itemId: params.itemId,
      title: params.title,
    });
    try {
      const result = await generateAndStoreEmbedding({
        userId: params.userId,
        itemId: params.itemId,
        title: params.title,
        content: params.content,
        summary: params.summary,
        category: params.category,
        contentType: params.contentType,
      });
      const durationMs = Date.now() - startTime;
      logTool("generate_embedding", "success", {
        durationMs,
        embeddingCount: result.embeddingCount,
        success: result.success,
      });
      return JSON.stringify(result);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      logTool("generate_embedding", "error", {
        durationMs,
        error: String(error),
      });
      throw error;
    }
  },
});

// =============================================================================
// Agent Instructions
// =============================================================================

const INPUT_ANALYZER_INSTRUCTION = `You are an InputAnalyzer agent that processes content to detect its type and extract information.

Your task is to analyze the provided content and determine:
1. The type of content (url, text, image, audio, document)
2. Key information from the content
3. A normalized version of the content for further processing

For URLs: Extract the domain and any visible path information.
For text: Identify if it's a note, task, reminder, recommendation, or general content.
For images: Describe what you can infer from the context (you cannot see images directly).
For audio: Note that transcription may be needed.

Output a JSON object with:
{
  "detectedType": "url|text|image|audio|document",
  "normalizedContent": "cleaned up version of the content",
  "extractedText": "any text extracted from the content",
  "confidence": 0.0-1.0,
  "topics": ["topic1", "topic2"],
  "entities": ["entity1", "entity2"]
}`;

const ACTION_DECIDER_INSTRUCTION = `You are an ActionDecider agent that determines what actions to take on content.

Based on the analyzed content from the previous stage (available in {analyzed_content}), decide:
1. The user's intent (save, remember, lookup, task, etc.)
2. Whether to fetch URL content for more details
3. Whether to perform a web search for enrichment
4. The appropriate category and tags

Use the fetch_url_content tool if the content is a URL and you need more information.
Use the search_web tool if the content mentions a place, restaurant, book, movie, or product that could benefit from additional context.

Output a JSON object with:
{
  "intent": "save|remember|lookup|task",
  "classification": "article|restaurant|book|movie|place|note|task|other",
  "shouldFetchUrl": true/false,
  "shouldWebSearch": true/false,
  "webSearchQuery": "query if web search is needed",
  "suggestedCategory": "category name",
  "suggestedTags": ["tag1", "tag2"],
  "confidence": 0.0-1.0
}`;

const ACTION_EXECUTOR_INSTRUCTION = `You are an ActionExecutor agent that executes decisions and creates items.

Based on the analysis and decision from previous stages:
- Analysis: {analyzed_content}
- Decision: {decision}

Execute the following steps:
1. Determine the final title and summary for the item
2. Use the create_item tool to save the item to the database
3. Use the generate_embedding tool to create searchable embeddings

Important:
- Use the userId provided in the input
- If an existingItemId is provided, update that item instead of creating new
- Apply the suggested category and tags from the decision stage
- Make the title concise but descriptive
- Make the summary informative (2-3 sentences)

Output a JSON object with:
{
  "itemCreated": true/false,
  "itemId": "the item id",
  "embeddingGenerated": true/false,
  "finalTitle": "the final title",
  "finalSummary": "the final summary",
  "finalCategory": "the category used",
  "finalTags": ["tag1", "tag2"]
}`;

// =============================================================================
// Agent Factory Functions
// =============================================================================

/**
 * Create the InputAnalyzer agent
 */
function createInputAnalyzerAgent() {
  const config = AGENT_CONFIGS["input-analyzer"];

  return new LlmAgent({
    name: config.name,
    model: config.model,
    description: config.description,
    instruction: INPUT_ANALYZER_INSTRUCTION,
    outputKey: "analyzed_content",
  });
}

/**
 * Create the ActionDecider agent
 */
function createActionDeciderAgent() {
  const config = AGENT_CONFIGS["action-decider"];

  return new LlmAgent({
    name: config.name,
    model: config.model,
    description: config.description,
    instruction: ACTION_DECIDER_INSTRUCTION,
    tools: [webFetchTool, webSearchTool],
    outputKey: "decision",
  });
}

/**
 * Create the ActionExecutor agent
 */
function createActionExecutorAgent() {
  const config = AGENT_CONFIGS["action-executor"];

  return new LlmAgent({
    name: config.name,
    model: config.model,
    description: config.description,
    instruction: ACTION_EXECUTOR_INSTRUCTION,
    tools: [createItemTool, generateEmbeddingTool],
    outputKey: "execution_result",
  });
}

/**
 * Create the sequential pipeline agent
 */
function createPipelineAgent() {
  const inputAnalyzer = createInputAnalyzerAgent();
  const actionDecider = createActionDeciderAgent();
  const actionExecutor = createActionExecutorAgent();

  return new SequentialAgent({
    name: "ContentProcessingPipeline",
    description:
      "Processes content through analysis, decision making, and execution stages",
    subAgents: [inputAnalyzer, actionDecider, actionExecutor],
  });
}

// =============================================================================
// Main Orchestrator Function
// =============================================================================

/**
 * Run the ADK orchestrator pipeline
 */
export async function runOrchestratorPipeline(
  input: OrchestratorInput,
): Promise<OrchestratorResult> {
  const startTime = Date.now();

  // ═══════════════════════════════════════════════════════════════════════════
  // PIPELINE START
  // ═══════════════════════════════════════════════════════════════════════════
  logSection("ADK ORCHESTRATOR PIPELINE STARTING");
  logStep("Input received", {
    contentType: input.contentType,
    content: input.content,
    contentUrl: input.contentUrl,
    userId: input.userId,
    itemId: input.itemId || "(new item)",
    jobId: input.jobId || "(no job)",
    hasMetadata: !!input.metadata,
  });

  // Create Langfuse trace for the entire pipeline
  const trace = createTrace("adk_orchestrator_pipeline", {
    userId: input.userId,
    jobId: input.jobId,
    itemId: input.itemId,
    requestType: "perception",
    model: "gpt-4o-mini",
  });

  const actions: OrchestratorResult["actions"] = [];

  try {
    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 1: CREATE PIPELINE
    // ═══════════════════════════════════════════════════════════════════════════
    logStep("Creating SequentialAgent pipeline...");
    const pipelineAgent = createPipelineAgent();
    logSuccess("Pipeline created", {
      agents: ["InputAnalyzer", "ActionDecider", "ActionExecutor"],
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 2: CREATE SESSION
    // ═══════════════════════════════════════════════════════════════════════════
    logStep("Creating InMemoryRunner and session...");
    const runner = new InMemoryRunner({
      agent: pipelineAgent,
      appName: "lifeos_content_processing",
    });

    const sessionId = input.jobId || `session_${Date.now()}`;
    await runner.sessionService.createSession({
      appName: "lifeos_content_processing",
      userId: input.userId,
      sessionId,
    });
    logSuccess("Session created", { sessionId });

    // Get session to set initial state
    const session = await runner.sessionService.getSession({
      appName: "lifeos_content_processing",
      userId: input.userId,
      sessionId,
    });

    if (session && session.state) {
      session.state["user_id"] = input.userId;
      session.state["content_type"] = input.contentType;
      session.state["content_url"] = input.contentUrl || "";
      session.state["existing_item_id"] = input.itemId || "";
      logStep("Session state initialized", {
        user_id: input.userId,
        content_type: input.contentType,
        content_url: input.contentUrl || "(none)",
        existing_item_id: input.itemId || "(none)",
      });
    }

    // Build the user message with all context
    const userMessage = buildUserMessage(input);
    logStep("User message built", { messageLength: userMessage.length });

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 3: RUN PIPELINE
    // ═══════════════════════════════════════════════════════════════════════════
    logSection("RUNNING SEQUENTIAL AGENT PIPELINE");
    logStep("Pipeline execution starting...", {
      flow: "InputAnalyzer → ActionDecider → ActionExecutor",
    });

    let finalResponse = "";
    let eventCount = 0;
    const pipelineSpan = trace.span("adk_pipeline_execution");

    for await (const event of runner.runAsync({
      userId: input.userId,
      sessionId,
      newMessage: createUserContent(userMessage),
    })) {
      eventCount++;

      // Log each event for debugging
      if (event.author) {
        logAgent(event.author, "processing", {
          eventType: event.content?.parts ? "response" : "other",
          hasContent: !!event.content,
        });
      }

      if (isFinalResponse(event) && event.content?.parts?.length) {
        finalResponse = event.content.parts
          .map((part) => ("text" in part ? part.text : ""))
          .join("");
        logAgent(event.author || "pipeline", "output", {
          responseLength: finalResponse.length,
          preview: finalResponse.slice(0, 200),
        });
      }
    }

    logSuccess("Pipeline execution complete", {
      totalEvents: eventCount,
      responseLength: finalResponse.length,
    });

    pipelineSpan.end({ output: { response: finalResponse.slice(0, 500) } });

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 4: EXTRACT RESULTS FROM SESSION STATE
    // ═══════════════════════════════════════════════════════════════════════════
    logStep("Extracting results from session state...");

    const finalSession = await runner.sessionService.getSession({
      appName: "lifeos_content_processing",
      userId: input.userId,
      sessionId,
    });

    let analyzedContent: Record<string, unknown> | null = null;
    let decision: Record<string, unknown> | null = null;
    let executionResult: Record<string, unknown> | null = null;
    let itemIdFromState: string | undefined;

    if (finalSession && finalSession.state) {
      analyzedContent = parseStateValue(finalSession.state["analyzed_content"]);
      decision = parseStateValue(finalSession.state["decision"]);
      executionResult = parseStateValue(finalSession.state["execution_result"]);
      itemIdFromState = finalSession.state["item_id"] as string | undefined;

      // Log the state from each agent
      logPipelineState({
        analyzed_content: analyzedContent ? "✓ Present" : "✗ Missing",
        decision: decision ? "✓ Present" : "✗ Missing",
        execution_result: executionResult ? "✓ Present" : "✗ Missing",
        item_id: itemIdFromState || "(not set)",
      });

      if (analyzedContent) {
        logAgent("InputAnalyzer", "complete", {
          detectedType: analyzedContent.detectedType,
          confidence: analyzedContent.confidence,
          topics: analyzedContent.topics,
        });
      }

      if (decision) {
        logAgent("ActionDecider", "complete", {
          intent: decision.intent,
          classification: decision.classification,
          shouldFetchUrl: decision.shouldFetchUrl,
          shouldWebSearch: decision.shouldWebSearch,
          suggestedCategory: decision.suggestedCategory,
        });
      }

      if (executionResult) {
        logAgent("ActionExecutor", "complete", {
          itemCreated: executionResult.itemCreated,
          itemId: executionResult.itemId,
          embeddingGenerated: executionResult.embeddingGenerated,
          finalTitle: executionResult.finalTitle,
          finalCategory: executionResult.finalCategory,
        });
      }
    }

    // Track actions
    actions.push({
      type: "input_analysis",
      status: analyzedContent ? "completed" : "skipped",
      result: analyzedContent,
    });
    actions.push({
      type: "action_decision",
      status: decision ? "completed" : "skipped",
      result: decision,
    });
    actions.push({
      type: "action_execution",
      status: executionResult ? "completed" : "skipped",
      result: executionResult,
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // PIPELINE COMPLETE
    // ═══════════════════════════════════════════════════════════════════════════
    const durationMs = Date.now() - startTime;
    const itemId = (executionResult?.itemId as string) || itemIdFromState;

    logSection("ADK ORCHESTRATOR PIPELINE COMPLETE");
    logSuccess("Pipeline finished successfully", {
      durationMs,
      itemId: itemId || "(no item created)",
      actionsCompleted: actions.filter((a) => a.status === "completed").length,
      actionsSkipped: actions.filter((a) => a.status === "skipped").length,
    });

    await flushLangfuse();

    return {
      success: true,
      itemId,
      analysis: {
        title:
          (executionResult?.finalTitle as string) ||
          (analyzedContent?.title as string) ||
          (decision?.title as string) ||
          "Untitled",
        summary:
          (executionResult?.finalSummary as string) ||
          (analyzedContent?.normalizedContent as string) ||
          finalResponse.slice(0, 200),
        contentType: input.contentType,
        confidence: (analyzedContent?.confidence as number) || 0.8,
        topics: (analyzedContent?.topics as string[]) || [],
        entities: (analyzedContent?.entities as string[]) || [],
      },
      actions,
      durationMs,
    };
  } catch (error) {
    // ═══════════════════════════════════════════════════════════════════════════
    // PIPELINE FAILED
    // ═══════════════════════════════════════════════════════════════════════════
    const durationMs = Date.now() - startTime;
    const errMsg =
      error instanceof Error ? error.message : "Pipeline failed unexpectedly";

    logSection("ADK ORCHESTRATOR PIPELINE FAILED");
    logError("Pipeline execution failed", error);
    logStep("Failure details", {
      durationMs,
      actionsAttempted: actions.length,
      errorMessage: errMsg,
    });

    await flushLangfuse();

    return {
      success: false,
      analysis: {
        summary: input.content.slice(0, 200),
        contentType: input.contentType || "unknown",
        confidence: 0,
      },
      actions,
      durationMs,
      error: errMsg,
    };
  }
}

/**
 * Build the user message with all context for the pipeline
 */
function buildUserMessage(input: OrchestratorInput): string {
  const parts = [
    `Process this content for the user:`,
    ``,
    `Content Type: ${input.contentType}`,
    `Content: ${input.content}`,
  ];

  if (input.contentUrl) {
    parts.push(`URL: ${input.contentUrl}`);
  }

  if (input.itemId) {
    parts.push(`Existing Item ID: ${input.itemId}`);
  }

  parts.push(``);
  parts.push(`User ID: ${input.userId}`);
  parts.push(``);
  parts.push(
    `Please analyze this content, decide what actions to take, and execute them.`,
  );
  parts.push(
    `Return a JSON object with the final title, summary, category, and any items created.`,
  );

  return parts.join("\n");
}

/**
 * Parse a state value that might be JSON or a string
 */
function parseStateValue(value: unknown): Record<string, unknown> | null {
  if (!value) return null;

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (typeof value === "object") {
    return value as Record<string, unknown>;
  }

  return null;
}
