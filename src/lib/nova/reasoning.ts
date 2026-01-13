/**
 * Nova Reasoning Engine
 *
 * REASON stage: Complex decision-making about what to do using GPT-4o.
 *
 * Model: GPT-4o
 * Token budget: 2000
 * Latency target: <5s
 */

import { createLLMClient } from '@/lib/llm'
import { assembleContext, type ContextAssembly } from '@/lib/rag/context'
import type { PerceptionResult, ReasoningResult, LLMResponse } from '@/types/llm'
import { getConfidenceLevel, type ConfidenceLevel } from '@/types/llm'

export interface ReasonInput {
  perception: PerceptionResult
  userMessage?: string
  userId: string
  conversationId?: string
  itemId?: string
  includeContext?: boolean
}

export interface ReasonOutput extends ReasoningResult {
  confidenceLevel: ConfidenceLevel
  contextUsed: boolean
  shouldAct: boolean
  responseType: 'act' | 'ask' | 'clarify'
}

/**
 * Reason about what action to take
 *
 * This is the core reasoning function that decides:
 * - What would be most helpful for the user
 * - How confident we are in that decision
 * - Whether to act directly, ask conversationally, or request clarification
 */
export async function reason(input: ReasonInput): Promise<LLMResponse<ReasonOutput>> {
  const client = createLLMClient({
    userId: input.userId,
    conversationId: input.conversationId,
    itemId: input.itemId,
  })

  // Assemble context if requested
  let context: ContextAssembly | undefined
  if (input.includeContext !== false) {
    context = await assembleContext({
      query: input.perception.summary,
      userId: input.userId,
      conversationId: input.conversationId,
      includeRag: true,
    })
  }

  const response = await client.reason({
    perception: input.perception,
    context: context?.formatted ?? '',
    userMessage: input.userMessage,
  })

  const confidenceLevel = getConfidenceLevel(response.result.confidence)
  const responseType = determineResponseType(confidenceLevel, input.perception)

  const output: ReasonOutput = {
    ...response.result,
    confidenceLevel,
    contextUsed: !!context,
    shouldAct: confidenceLevel === 'HIGH',
    responseType,
  }

  return {
    result: output,
    usage: response.usage,
    model: response.model,
    latencyMs: response.latencyMs,
  }
}

/**
 * Determine how Nova should respond based on confidence
 */
function determineResponseType(
  confidenceLevel: ConfidenceLevel,
  perception: PerceptionResult
): 'act' | 'ask' | 'clarify' {
  switch (confidenceLevel) {
    case 'HIGH':
      // High confidence - act directly
      return 'act'
    case 'MEDIUM':
      // Medium confidence - ask conversationally
      // "This looks like X. Want me to Y?"
      return 'ask'
    case 'LOW':
    default:
      // Low confidence - request clarification
      // "I'm not sure what would be helpful. What would you like me to do?"
      return 'clarify'
  }
}

/**
 * Generate a natural response based on reasoning output
 */
export function generateResponse(output: ReasonOutput): string {
  switch (output.responseType) {
    case 'act':
      // High confidence - explain what we're doing
      const action = output.suggestedActions[0]
      if (action) {
        return `I'll ${formatActionDescription(action.action)}. ${action.reasoning}`
      }
      return `I'll help with that.`

    case 'ask':
      // Medium confidence - ask conversationally
      return generateConversationalAsk(output)

    case 'clarify':
      // Low confidence - ask for clarification
      return `I've saved this, but I'm not sure what would be most helpful. What would you like me to do with it?`
  }
}

/**
 * Generate a conversational ask based on the reasoning
 */
function generateConversationalAsk(output: ReasonOutput): string {
  const suggestedAction = output.suggestedActions[0]
  if (!suggestedAction) {
    return `I see you've shared something. What would you like me to do with it?`
  }

  const actionDesc = formatActionDescription(suggestedAction.action)
  const confidence = Math.round(output.confidence * 100)

  // Pattern: "This looks like [X]. Want me to [Y]?"
  if (output.reasoning) {
    return `${output.reasoning.slice(0, 100)}${output.reasoning.length > 100 ? '...' : ''} Want me to ${actionDesc}?`
  }

  return `I can ${actionDesc} for you. Would that be helpful?`
}

/**
 * Format action name into human-readable description
 */
function formatActionDescription(action: string): string {
  const actionDescriptions: Record<string, string> = {
    fetch_content: 'fetch the full content',
    summarize: 'create a summary',
    web_search: 'search for related information',
    analyze_image: 'analyze this image',
    extract_metadata: 'extract the key details',
    synthesize: 'put together an analysis',
    save: 'save this for later',
    find_related: 'find related content',
    translate: 'translate this',
    explain: 'explain this in simpler terms',
  }

  return actionDescriptions[action] || action.replace(/_/g, ' ')
}

/**
 * Combine multiple reasoning outputs (for complex multi-step decisions)
 */
export function combineReasoningOutputs(outputs: ReasonOutput[]): ReasonOutput {
  if (outputs.length === 0) {
    throw new Error('No reasoning outputs to combine')
  }

  if (outputs.length === 1) {
    return outputs[0]
  }

  // Take the lowest confidence
  const minConfidence = Math.min(...outputs.map((o) => o.confidence))
  const confidenceLevel = getConfidenceLevel(minConfidence)

  // Combine suggested actions
  const allActions = outputs.flatMap((o) => o.suggestedActions)

  // Combine reasoning
  const combinedReasoning = outputs.map((o) => o.reasoning).join('\n\n')

  return {
    reasoning: combinedReasoning,
    confidence: minConfidence,
    confidenceLevel,
    suggestedActions: allActions,
    estimatedDuration: outputs[0].estimatedDuration,
    contextUsed: outputs.some((o) => o.contextUsed),
    shouldAct: confidenceLevel === 'HIGH',
    responseType: determineResponseType(confidenceLevel, {
      contentType: 'mixed',
      summary: '',
      confidence: minConfidence,
      suggestedActions: [],
    }),
  }
}

/**
 * Validate a suggested action against the allowlist
 */
export function validateAction(action: string): boolean {
  const allowedActions = [
    'fetch_content',
    'summarize',
    'web_search',
    'analyze_image',
    'extract_metadata',
    'synthesize',
    'save',
    'find_related',
    'translate',
    'explain',
  ]

  return allowedActions.includes(action)
}

/**
 * Filter reasoning output to only include valid actions
 */
export function filterValidActions(output: ReasonOutput): ReasonOutput {
  return {
    ...output,
    suggestedActions: output.suggestedActions.filter((a) => validateAction(a.action)),
  }
}
