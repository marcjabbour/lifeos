/**
 * ADK Multi-Agent Orchestrator
 *
 * Uses Google ADK's SequentialAgent to coordinate three agents:
 * 1. InputAnalyzer - Detects content type, extracts text from images/audio
 * 2. ActionDecider - Classifies intent, decides on URL fetch/web search
 * 3. ActionExecutor - Creates items, generates embeddings, formats output
 */

import {
  LlmAgent,
  SequentialAgent,
  FunctionTool,
  InMemoryRunner,
  isFinalResponse,
} from "@google/adk";
import { createUserContent, Type } from "@google/genai";
import type { Schema } from "@google/genai";
import { createTrace, flushLangfuse } from "./observability/index.js";
import {
  AGENT_CONFIGS,
  isOrchestratorEnabled,
  type OrchestratorInput,
  type OrchestratorResult,
  type ContentType,
} from "./config.js";
import { fetchUrlContent } from "./tools/web-fetch.js";
import { searchWeb } from "./tools/web-search.js";
import { createOrUpdateItem } from "./tools/item-creator.js";
import { generateAndStoreEmbedding } from "./tools/embedding.js";
import { logger } from "./utils/index.js";

const log = logger.child({ module: "orchestrator" });

export { isOrchestratorEnabled };
export type { ContentType };

export function shouldUseOrchestrator(contentType: string): boolean {
  if (!isOrchestratorEnabled()) return false;
  const supportedTypes = ["url", "text", "image", "audio"];
  return supportedTypes.includes(contentType.toLowerCase());
}

// Tool Parameter Schemas
const webFetchSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    url: { type: Type.STRING, description: "The URL to fetch" },
  },
  required: ["url"],
};

const webSearchSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    query: { type: Type.STRING, description: "The search query" },
    contentType: {
      type: Type.STRING,
      description: "The type of content being searched for",
    },
  },
  required: ["query", "contentType"],
};

const createItemSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    userId: { type: Type.STRING, description: "The user ID" },
    title: { type: Type.STRING, description: "The title of the item" },
    summary: { type: Type.STRING, description: "A brief summary of the item" },
    category: { type: Type.STRING, description: "The category for the item" },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Tags for the item",
    },
    contentType: { type: Type.STRING, description: "The content type" },
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
    userId: { type: Type.STRING, description: "The user ID" },
    itemId: {
      type: Type.STRING,
      description: "The item ID to generate embeddings for",
    },
    title: { type: Type.STRING, description: "The title of the item" },
    content: { type: Type.STRING, description: "The content to embed" },
    summary: { type: Type.STRING, description: "A summary to embed" },
    category: { type: Type.STRING, description: "The category" },
    contentType: { type: Type.STRING, description: "The content type" },
  },
  required: ["userId", "itemId", "title"],
};

// Tool Input Types
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

// Tool Definitions
const webFetchTool = new FunctionTool({
  name: "fetch_url_content",
  description:
    "Fetches a URL and extracts metadata including title, description, and content.",
  parameters: webFetchSchema,
  execute: async (input: unknown) => {
    const { url } = input as WebFetchInput;
    log.info({ tool: "fetch_url_content", url }, "Tool invoked");
    const result = await fetchUrlContent(url, {});
    return JSON.stringify(result);
  },
});

const webSearchTool = new FunctionTool({
  name: "search_web",
  description:
    "Searches the web for information about a topic like restaurants, places, books, movies, or products.",
  parameters: webSearchSchema,
  execute: async (input: unknown) => {
    const { query, contentType } = input as WebSearchInput;
    log.info({ tool: "search_web", query, contentType }, "Tool invoked");
    const result = await searchWeb(query, contentType, {});
    return JSON.stringify(result);
  },
});

const createItemTool = new FunctionTool({
  name: "create_item",
  description: "Creates or updates an item in the database.",
  parameters: createItemSchema,
  execute: async (input: unknown) => {
    const params = input as CreateItemInput;
    log.info(
      { tool: "create_item", title: params.title, category: params.category },
      "Tool invoked",
    );
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
    return JSON.stringify(result);
  },
});

const generateEmbeddingTool = new FunctionTool({
  name: "generate_embedding",
  description:
    "Generates and stores embeddings for an item to enable semantic search.",
  parameters: generateEmbeddingSchema,
  execute: async (input: unknown) => {
    const params = input as GenerateEmbeddingInput;
    log.info(
      { tool: "generate_embedding", itemId: params.itemId },
      "Tool invoked",
    );
    const result = await generateAndStoreEmbedding(params);
    return JSON.stringify(result);
  },
});

// Agent Instructions
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

// Agent Factory Functions
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

// Main Orchestrator Function
export async function runOrchestratorPipeline(
  input: OrchestratorInput,
): Promise<OrchestratorResult> {
  const startTime = Date.now();

  log.info(
    {
      contentType: input.contentType,
      userId: input.userId,
      itemId: input.itemId,
      jobId: input.jobId,
    },
    "ADK pipeline starting",
  );

  const trace = createTrace("adk_orchestrator_pipeline", {
    userId: input.userId,
    jobId: input.jobId,
    itemId: input.itemId,
    requestType: "perception",
    model: "gpt-4o-mini",
  });

  const actions: OrchestratorResult["actions"] = [];

  try {
    const pipelineAgent = createPipelineAgent();

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
    }

    const userMessage = buildUserMessage(input);
    const pipelineSpan = trace.span("adk_pipeline_execution");

    let finalResponse = "";
    for await (const event of runner.runAsync({
      userId: input.userId,
      sessionId,
      newMessage: createUserContent(userMessage),
    })) {
      if (event.author) {
        log.debug({ agent: event.author }, "Agent processing");
      }

      if (isFinalResponse(event) && event.content?.parts?.length) {
        finalResponse = event.content.parts
          .map((part) => ("text" in part ? part.text : ""))
          .join("");
      }
    }

    pipelineSpan.end({ output: { response: finalResponse.slice(0, 500) } });

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
    }

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

    const durationMs = Date.now() - startTime;
    const itemId = (executionResult?.itemId as string) || itemIdFromState;

    log.info({ durationMs, itemId }, "ADK pipeline complete");

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
    const durationMs = Date.now() - startTime;
    const errMsg =
      error instanceof Error ? error.message : "Pipeline failed unexpectedly";

    log.error({ durationMs, error: errMsg }, "ADK pipeline failed");

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
