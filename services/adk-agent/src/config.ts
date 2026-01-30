/**
 * Agent Configuration
 *
 * Configuration for the multi-agent orchestrator pipeline using Google ADK.
 */

export type GeminiModel =
  | "gemini-2.0-flash"
  | "gemini-1.5-flash"
  | "gemini-1.5-pro";

export type AgentType = "input-analyzer" | "action-decider" | "action-executor";

export type ContentType =
  | "url"
  | "text"
  | "image"
  | "audio"
  | "document"
  | "unknown";

export interface AgentConfig {
  name: string;
  description: string;
  model: GeminiModel;
  maxTokens: number;
  timeoutMs: number;
  temperature: number;
}

export const AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
  "input-analyzer": {
    name: "InputAnalyzer",
    description:
      "Analyzes input content to detect type and extract information. " +
      "Uses vision and transcription tools for images and audio.",
    model: "gemini-2.0-flash",
    maxTokens: 1000,
    timeoutMs: 30000,
    temperature: 0.1,
  },
  "action-decider": {
    name: "ActionDecider",
    description:
      "Classifies intent and decides what actions to take. " +
      "Can fetch URLs and perform web searches for enrichment.",
    model: "gemini-1.5-pro",
    maxTokens: 2000,
    timeoutMs: 30000,
    temperature: 0.3,
  },
  "action-executor": {
    name: "ActionExecutor",
    description:
      "Executes decided actions - creates items, generates embeddings, " +
      "and performs final output formatting.",
    model: "gemini-2.0-flash",
    maxTokens: 1000,
    timeoutMs: 20000,
    temperature: 0.1,
  },
};

export interface OrchestratorInput {
  content: string;
  contentType: ContentType;
  contentUrl?: string;
  userId: string;
  itemId?: string;
  jobId?: string;
  metadata?: Record<string, unknown>;
}

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

export interface PipelineState {
  input: OrchestratorInput;
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
  errors: string[];
  startTime: number;
}

export function isOrchestratorEnabled(): boolean {
  return process.env.USE_ADK_ORCHESTRATOR === "true";
}

export function getAgentModel(agentType: AgentType): GeminiModel {
  return AGENT_CONFIGS[agentType].model;
}

export function getAgentTimeout(agentType: AgentType): number {
  return AGENT_CONFIGS[agentType].timeoutMs;
}
