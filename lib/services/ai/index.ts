/**
 * AI Services Module
 *
 * Central export point for all AI/LLM related services.
 *
 * Note: To avoid naming conflicts, some exports are namespaced.
 * Use specific imports when you need both:
 *   import { TOKEN_BUDGETS as LLM_TOKEN_BUDGETS } from '@/lib/services/ai/llm'
 *   import { TOKEN_BUDGETS as USER_TOKEN_BUDGETS } from '@/lib/services/ai/cost-control'
 */

// Nova AI cognitive engine - main Nova exports
export {
  perceive,
  quickPerceive,
  validatePerceptionInput,
  type PerceiveInput,
  type PerceiveOutput,
  type ContentType,
} from "./nova/perception";

export {
  reason,
  generateResponse,
  combineReasoningOutputs,
  validateAction,
  filterValidActions,
  type ReasonInput,
  type ReasonOutput,
} from "./nova/reasoning";

export {
  decideAction,
  planJob,
  validatePlan,
  estimatePlanCost,
  createSimplePlan,
  ALLOWED_ACTIONS,
  TOOL_TIMEOUTS,
  type JobPlan as NovaJobPlan,
  type PlanStep,
  type PlanValidation,
  type DecisionResult,
  type AllowedAction,
} from "./nova/planning";

export {
  createStreamingResponse,
  streamLLMResponse,
  streamThinking,
  streamCognitiveLoop,
  statusEvent,
  doneEvent,
  errorEvent,
  acceptsStreaming,
  type StreamEvent,
  type StreamEventType,
  type ProcessingPhase,
  type StatusEvent,
  type MessageEvent,
  type DoneEvent,
  type ErrorEvent,
} from "./nova/streaming";

// LLM client and configuration
export {
  NovaLLMClient,
  createLLMClient,
  type ClientContext,
} from "./llm/client";
export {
  LLM_CONFIG,
  TOKEN_BUDGETS,
  LATENCY_TARGETS,
  RETRY_CONFIG,
} from "./llm/config";
export {
  routeRequest,
  estimateCost,
  estimateJobCost,
  type RoutingDecision,
} from "./llm/router";
export {
  PERCEPTION_SYSTEM_PROMPT,
  REASONING_SYSTEM_PROMPT,
  PLANNING_SYSTEM_PROMPT,
  SUMMARIZATION_PROMPT,
  PROFILE_EXTRACTION_PROMPT,
  DECISION_PROMPT_TEMPLATES,
  ERROR_RESPONSES,
} from "./llm/prompts";

// Embeddings
export * from "./embeddings";

// RAG (Retrieval-Augmented Generation)
export {
  assembleContext,
  trimContextToFit,
  buildWorkingMemory,
  needsSummarization,
  summarizeMessages,
  type ConversationMessage,
  type RetrievalResult,
  type UserProfile,
  type ContextAssemblyInput,
  type ContextAssembly,
} from "./rag/context";

// Cost control - rename TOKEN_BUDGETS to avoid conflict
export {
  TOKEN_BUDGETS as USER_TOKEN_LIMITS,
  COST_LIMITS,
  checkBudget,
  checkRequestBudget,
  trackUsage,
  calculateCost as calculateUsageCost,
  costToCents,
  estimateTokens,
  estimateTaskCost,
  getBudgetStatusMessage,
  cleanupOldRecords,
  type BudgetStatus,
  type UsageRecord,
} from "./cost-control";

// Observability
export * from "./observability";

// User profile extraction
export * from "./user-profile";

// Tools
export {
  executeTool,
  getTool,
  isAllowedAction,
  AVAILABLE_TOOLS,
  ALLOWED_ACTIONS as TOOL_ALLOWED_ACTIONS,
  type Tool,
  type ToolResult,
  type ToolContext,
} from "./tools";
