/**
 * Model Routing Strategy
 *
 * Routes requests to the appropriate model based on task type,
 * confidence level, and complexity.
 */

import type { LLMModel, TaskType } from '@/types/llm'
import { LLM_CONFIG } from './config'

export interface RoutingDecision {
  model: LLMModel
  reason: string
}

export interface RoutingParams {
  taskType: TaskType
  confidence?: number
  stepCount?: number
  isRetry?: boolean
  contentLength?: number
}

/**
 * Route a request to the appropriate model
 *
 * Routing rules:
 * - Perception: Always GPT-4o-mini (fast, good enough for analysis)
 * - Execution: Always GPT-4o-mini (tool calls don't need GPT-4o)
 * - Summarization: Always GPT-4o-mini (fast memory compression)
 * - Reasoning: GPT-4o for complex decisions, mini for simple ones
 */
export function routeRequest(params: RoutingParams): RoutingDecision {
  const { taskType, confidence, stepCount, isRetry, contentLength } = params

  // Perception: Always GPT-4o-mini
  if (taskType === 'perception') {
    return {
      model: LLM_CONFIG.models.perception,
      reason: 'Perception task - GPT-4o-mini sufficient for content analysis',
    }
  }

  // Execution: Always GPT-4o-mini
  if (taskType === 'execution') {
    return {
      model: LLM_CONFIG.models.execution,
      reason: 'Execution step - GPT-4o-mini for tool calls',
    }
  }

  // Summarization: Always GPT-4o-mini
  if (taskType === 'summarization') {
    return {
      model: LLM_CONFIG.models.summarization,
      reason: 'Summarization - GPT-4o-mini for memory compression',
    }
  }

  // Reasoning: Model selection based on complexity
  if (taskType === 'reasoning') {
    // Fallback to GPT-4o-mini if GPT-4o rate-limited
    if (isRetry) {
      return {
        model: 'gpt-4o-mini',
        reason: 'GPT-4o fallback - using GPT-4o-mini with chain-of-thought',
      }
    }

    // Complex reasoning conditions that warrant GPT-4o
    const isLowConfidence = confidence !== undefined && confidence < 0.6
    const isMultiStep = stepCount !== undefined && stepCount > 3
    const isLongContent = contentLength !== undefined && contentLength > 5000

    if (isLowConfidence || isMultiStep || isLongContent) {
      return {
        model: 'gpt-4o',
        reason: `Complex reasoning: confidence=${confidence?.toFixed(2)}, steps=${stepCount}, contentLength=${contentLength}`,
      }
    }

    // Simple reasoning can use GPT-4o-mini
    return {
      model: 'gpt-4o-mini',
      reason: 'Simple reasoning - GPT-4o-mini sufficient',
    }
  }

  // Default fallback
  return {
    model: 'gpt-4o-mini',
    reason: 'Default fallback to GPT-4o-mini',
  }
}

/**
 * Estimate the cost of a task based on typical token usage
 */
export interface CostEstimate {
  minCost: number
  maxCost: number
  avgCost: number
  model: LLMModel
}

const TYPICAL_USAGE: Record<TaskType, { inputTokens: number; outputTokens: number }> = {
  perception: { inputTokens: 500, outputTokens: 300 },
  reasoning: { inputTokens: 2000, outputTokens: 500 },
  execution: { inputTokens: 1000, outputTokens: 500 },
  summarization: { inputTokens: 2000, outputTokens: 200 },
}

export function estimateCost(taskType: TaskType, params?: RoutingParams): CostEstimate {
  const routing = routeRequest({ taskType, ...params })
  const usage = TYPICAL_USAGE[taskType]

  // Pricing per 1M tokens
  const pricing =
    routing.model === 'gpt-4o' ? { input: 2.5, output: 10.0 } : { input: 0.15, output: 0.6 }

  const inputCost = (usage.inputTokens / 1_000_000) * pricing.input
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.output
  const avgCost = inputCost + outputCost

  return {
    minCost: avgCost * 0.5,
    maxCost: avgCost * 2,
    avgCost,
    model: routing.model,
  }
}

/**
 * Estimate total cost for a job based on its steps
 */
export function estimateJobCost(steps: Array<{ action: string }>): CostEstimate {
  const taskTypes: TaskType[] = [
    'perception', // Initial analysis
    'reasoning', // Planning
    ...steps.map(() => 'execution' as TaskType), // Each step
    'summarization', // Final synthesis
  ]

  let totalMin = 0
  let totalMax = 0
  let totalAvg = 0

  for (const taskType of taskTypes) {
    const estimate = estimateCost(taskType)
    totalMin += estimate.minCost
    totalMax += estimate.maxCost
    totalAvg += estimate.avgCost
  }

  return {
    minCost: totalMin,
    maxCost: totalMax,
    avgCost: totalAvg,
    model: 'gpt-4o-mini', // Primary model for most steps
  }
}
