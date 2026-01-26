/**
 * Nova AI Module - Cognitive Loop Engine
 *
 * This module exports all Nova functionality:
 * - Perception: Quick content analysis
 * - Reasoning: Complex decision-making
 * - Planning: Job plan generation
 * - Streaming: Real-time response streaming
 */

// Perception
export {
  perceive,
  quickPerceive,
  validatePerceptionInput,
  type PerceiveInput,
  type PerceiveOutput,
  type ContentType,
} from './perception'

// Reasoning
export {
  reason,
  generateResponse,
  combineReasoningOutputs,
  validateAction,
  filterValidActions,
  type ReasonInput,
  type ReasonOutput,
} from './reasoning'

// Planning
export {
  decideAction,
  planJob,
  validatePlan,
  estimatePlanCost,
  createSimplePlan,
  ALLOWED_ACTIONS,
  TOOL_TIMEOUTS,
  type JobPlan,
  type PlanStep,
  type PlanValidation,
  type DecisionResult,
  type AllowedAction,
} from './planning'

// Streaming
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
} from './streaming'
