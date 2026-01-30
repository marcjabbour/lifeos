/**
 * AI Agents Module
 *
 * Multi-agent orchestrator for intelligent content processing using Google ADK.
 *
 * Pipeline (SequentialAgent):
 * 1. InputAnalyzer - Detects content type, extracts text from images/audio
 * 2. ActionDecider - Classifies intent, decides actions, enriches with web data
 * 3. ActionExecutor - Creates items, generates embeddings, formats output
 *
 * Uses Gemini models via @google/adk package.
 */

// Configuration
export {
  AGENT_CONFIGS,
  isOrchestratorEnabled,
  getAgentModel,
  getAgentTimeout,
  type AgentType,
  type AgentConfig,
  type GeminiModel,
  type ContentType,
  type OrchestratorInput,
  type OrchestratorResult,
  type PipelineState,
} from "./config";

// Main ADK orchestrator
export { runOrchestratorPipeline, shouldUseOrchestrator } from "./orchestrator";

// Tools (can be used independently or for testing)
export { fetchUrlContent } from "./action-decider/tools/web-fetch";
export { searchWeb } from "./action-decider/tools/web-search";
export { createOrUpdateItem } from "./action-executor/tools/item-creator";
export { generateAndStoreEmbedding } from "./action-executor/tools/embedding";
