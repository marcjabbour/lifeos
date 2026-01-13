/**
 * LLM Module - Nova's AI Integration
 *
 * This module provides the core LLM functionality for Nova:
 * - Client for perception, reasoning, execution, and embedding
 * - Model routing strategy
 * - System prompts
 * - Configuration
 */

export { NovaLLMClient, createLLMClient, type ClientContext } from './client'
export { LLM_CONFIG, TOKEN_BUDGETS, LATENCY_TARGETS, RETRY_CONFIG } from './config'
export { routeRequest, estimateCost, estimateJobCost, type RoutingDecision } from './router'
export {
  PERCEPTION_SYSTEM_PROMPT,
  REASONING_SYSTEM_PROMPT,
  PLANNING_SYSTEM_PROMPT,
  SUMMARIZATION_PROMPT,
  PROFILE_EXTRACTION_PROMPT,
  DECISION_PROMPT_TEMPLATES,
  ERROR_RESPONSES,
} from './prompts'
