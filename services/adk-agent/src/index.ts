/**
 * ADK Agent Service
 *
 * Google ADK-based AI microservice for content processing.
 */

export {
  runOrchestratorPipeline,
  shouldUseOrchestrator,
  isOrchestratorEnabled,
} from "./orchestrator.js";

export type {
  OrchestratorInput,
  OrchestratorResult,
  ContentType,
  AgentType,
  AgentConfig,
} from "./config.js";

export * from "./tools/index.js";
export * from "./observability/index.js";
