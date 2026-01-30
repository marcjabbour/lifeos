/**
 * Agent Configuration
 *
 * Configuration for the multi-agent orchestrator pipeline using Google ADK.
 * Defines models, token budgets, and timeouts for each agent.
 */

/**
 * Gemini model identifiers for ADK
 */
export type GeminiModel =
  | "gemini-2.0-flash"
  | "gemini-1.5-flash"
  | "gemini-1.5-pro";

/**
 * Agent type identifiers
 */
export type AgentType = "input-analyzer" | "action-decider" | "action-executor";

/**
 * Configuration for a single agent
 */
export interface AgentConfig {
  name: string;
  description: string;
  model: GeminiModel;
  maxTokens: number;
  timeoutMs: number;
  temperature: number;
}

/**
 * Agent configurations using Gemini models
 */
export const AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
  "input-analyzer": {
    name: "InputAnalyzer",
    description:
      "Analyzes input content to detect type and extract information. " +
      "Uses vision and transcription tools for images and audio.",
    model: "gemini-2.0-flash",
    maxTokens: 1000,
    timeoutMs: 30000, // 30s for vision/transcription
    temperature: 0.1,
  },
  "action-decider": {
    name: "ActionDecider",
    description:
      "Classifies intent and decides what actions to take. " +
      "Can fetch URLs and perform web searches for enrichment.",
    model: "gemini-1.5-pro",
    maxTokens: 2000,
    timeoutMs: 30000, // 30s for web fetch/search
    temperature: 0.3,
  },
  "action-executor": {
    name: "ActionExecutor",
    description:
      "Executes decided actions - creates items, generates embeddings, " +
      "and performs final output formatting.",
    model: "gemini-2.0-flash",
    maxTokens: 1000,
    timeoutMs: 20000, // 20s for DB/embedding ops
    temperature: 0.1,
  },
};

/**
 * Content types that can be processed
 */
export type ContentType =
  | "url"
  | "text"
  | "image"
  | "audio"
  | "document"
  | "unknown";

/**
 * Input to the orchestrator pipeline
 */
export interface OrchestratorInput {
  content: string;
  contentType: ContentType;
  contentUrl?: string;
  userId: string;
  itemId?: string;
  jobId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Result from the orchestrator pipeline
 */
export interface OrchestratorResult {
  success: boolean;
  itemId?: string;
  embeddingId?: string;
  analysis: {
    title?: string;
    summary: string;
    contentType: string;
    confidence: number;
    topics?: string[];
    entities?: string[];
    sentiment?: string;
  };
  actions: {
    type: string;
    status: "completed" | "skipped" | "failed";
    result?: unknown;
    error?: string;
  }[];
  durationMs: number;
  error?: string;
}

/**
 * State passed between agents in the pipeline (stored in ADK session state)
 */
export interface PipelineState {
  // Original input
  input: OrchestratorInput;

  // InputAnalyzer output
  analyzedContent?: {
    normalizedContent: string;
    detectedType: string;
    extractedText?: string;
    transcription?: string;
    visionAnalysis?: {
      title?: string;
      description: string;
      topics?: string[];
      entities?: string[];
    };
    confidence: number;
  };

  // ActionDecider output
  decision?: {
    intent: string;
    classification: string;
    shouldFetchUrl: boolean;
    shouldWebSearch: boolean;
    suggestedCategory: string;
    suggestedTags: string[];
    webSearchQuery?: string;
    fetchedContent?: {
      title?: string;
      description?: string;
      content?: string;
      metadata?: Record<string, unknown>;
    };
    searchResults?: {
      name?: string;
      description?: string;
      details?: string[];
      source?: string;
    };
    confidence: number;
  };

  // ActionExecutor output
  execution?: {
    itemCreated: boolean;
    itemId?: string;
    embeddingGenerated: boolean;
    embeddingId?: string;
    finalTitle: string;
    finalSummary: string;
    finalCategory: string;
    finalTags: string[];
  };

  // Tracking
  errors: string[];
  startTime: number;
}

/**
 * Feature flag for enabling the ADK orchestrator
 */
export function isOrchestratorEnabled(): boolean {
  return process.env.USE_ADK_ORCHESTRATOR === "true";
}

/**
 * Get the model to use for a specific agent
 */
export function getAgentModel(agentType: AgentType): GeminiModel {
  return AGENT_CONFIGS[agentType].model;
}

/**
 * Get the timeout for a specific agent
 */
export function getAgentTimeout(agentType: AgentType): number {
  return AGENT_CONFIGS[agentType].timeoutMs;
}
