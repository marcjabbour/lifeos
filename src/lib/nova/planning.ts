/**
 * Nova Planning Engine
 *
 * DECIDE and PLAN stages: Choose action confidence level
 * and generate durable step plans for job execution.
 *
 * Model: GPT-4o (for planning)
 * Token budget: 1500
 */

import OpenAI from "openai";
import { LLM_CONFIG, TOKEN_BUDGETS } from "@/lib/llm/config";
import { PLANNING_SYSTEM_PROMPT } from "@/lib/llm/prompts";
import { createTrace, flushLangfuse } from "@/lib/observability/langfuse";
import type { ReasoningResult, ConfidenceLevel, TokenUsage } from "@/types/llm";
import { getConfidenceLevel } from "@/types/llm";

// Available tools for job execution
export const ALLOWED_ACTIONS = [
  "fetch_content",
  "summarize",
  "web_search",
  "analyze_image",
  "extract_metadata",
  "synthesize",
] as const;

export type AllowedAction = (typeof ALLOWED_ACTIONS)[number];

// Tool timeouts in milliseconds
export const TOOL_TIMEOUTS: Record<AllowedAction, number> = {
  fetch_content: 15000,
  summarize: 30000,
  web_search: 10000,
  analyze_image: 20000,
  extract_metadata: 10000,
  synthesize: 30000,
};

export interface PlanStep {
  action: AllowedAction;
  why: string;
  params?: Record<string, unknown>;
  timeout: number;
  fallback?: string;
}

export interface JobPlan {
  reasoning: string;
  steps: PlanStep[];
  estimatedTokens: number;
  estimatedDuration: string;
}

export interface PlanValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DecisionResult {
  shouldProceed: boolean;
  confidenceLevel: ConfidenceLevel;
  plan?: JobPlan;
  question?: string;
  fallbackMessage?: string;
}

/**
 * Make a decision based on reasoning output
 *
 * Returns:
 * - HIGH confidence: Proceed with plan
 * - MEDIUM confidence: Ask a conversational question
 * - LOW confidence: Return generic fallback
 */
export function decideAction(
  reasoning: ReasoningResult,
  contentSummary: string,
): DecisionResult {
  const confidenceLevel = getConfidenceLevel(reasoning.confidence);

  switch (confidenceLevel) {
    case "HIGH":
      return {
        shouldProceed: true,
        confidenceLevel,
      };

    case "MEDIUM":
      // Generate a natural question
      const suggestedAction = reasoning.suggestedActions?.[0];
      const actionDesc =
        suggestedAction?.action.replace(/_/g, " ") || "help with this";
      return {
        shouldProceed: false,
        confidenceLevel,
        question: `This looks like ${contentSummary}. Want me to ${actionDesc}?`,
      };

    case "LOW":
    default:
      return {
        shouldProceed: false,
        confidenceLevel,
        fallbackMessage: `I've saved this, but I'm not sure what would be most helpful. What would you like me to do with it?`,
      };
  }
}

/**
 * Generate a job plan for HIGH confidence actions
 */
export async function planJob(
  reasoning: ReasoningResult,
  context: {
    contentType: string;
    contentSummary: string;
    userId: string;
    itemId?: string;
  },
): Promise<JobPlan> {
  const trace = createTrace("plan_job", {
    userId: context.userId,
    itemId: context.itemId,
    requestType: "reasoning",
    model: "gpt-4o",
  });

  const span = trace.span("job_planning");

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: LLM_CONFIG.models.reasoning,
      max_tokens: TOKEN_BUDGETS.reasoning,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PLANNING_SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            goal: reasoning.reasoning,
            suggestedActions: reasoning.suggestedActions,
            contentType: context.contentType,
            contentSummary: context.contentSummary,
          }),
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const plan = parsePlanResponse(content);

    // Validate the plan
    const validation = validatePlan(plan);
    if (!validation.valid) {
      throw new Error(`Invalid plan: ${validation.errors.join(", ")}`);
    }

    const usage: TokenUsage = {
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0,
    };

    span.end({ output: plan, usage });

    return plan;
  } catch (error) {
    span.error(error instanceof Error ? error : new Error(String(error)));
    throw error;
  } finally {
    await flushLangfuse();
  }
}

/**
 * Parse the plan response from GPT
 */
function parsePlanResponse(content: string): JobPlan {
  try {
    const parsed = JSON.parse(content);

    const steps: PlanStep[] = (parsed.steps || []).map(
      (s: Record<string, unknown>) => ({
        action: s.action as AllowedAction,
        why: String(s.why || ""),
        params: s.params as Record<string, unknown> | undefined,
        timeout: TOOL_TIMEOUTS[s.action as AllowedAction] || 15000,
        fallback: s.fallback as string | undefined,
      }),
    );

    return {
      reasoning: String(parsed.reasoning || ""),
      steps,
      estimatedTokens: Number(parsed.estimatedTokens) || 5000,
      estimatedDuration: String(parsed.estimatedDuration || "1-2 minutes"),
    };
  } catch {
    return {
      reasoning: "Failed to parse plan",
      steps: [],
      estimatedTokens: 0,
      estimatedDuration: "unknown",
    };
  }
}

/**
 * Validate a job plan
 */
export function validatePlan(plan: JobPlan): PlanValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check step count
  if (plan.steps.length > 10) {
    errors.push(`Too many steps: ${plan.steps.length} (max 10)`);
  }

  if (plan.steps.length === 0) {
    errors.push("Plan has no steps");
  }

  // Check each step
  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];

    // Validate action is in allowlist
    if (!ALLOWED_ACTIONS.includes(step.action)) {
      errors.push(`Step ${i + 1}: Invalid action "${step.action}"`);
    }

    // Check for blocked URLs in params
    if (step.params?.url) {
      const urlValidation = validateUrl(step.params.url as string);
      if (!urlValidation.valid) {
        errors.push(`Step ${i + 1}: ${urlValidation.error}`);
      }
    }

    // Check step has a reason
    if (!step.why) {
      warnings.push(`Step ${i + 1}: Missing reason`);
    }
  }

  // Check token budget
  const PER_JOB_BUDGET = 50000;
  if (plan.estimatedTokens > PER_JOB_BUDGET) {
    errors.push(
      `Estimated tokens (${plan.estimatedTokens}) exceeds budget (${PER_JOB_BUDGET})`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a URL for safety
 */
function validateUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);

    // Block localhost and internal IPs
    const blockedHosts = ["localhost", "127.0.0.1", "0.0.0.0"];
    if (blockedHosts.includes(parsed.hostname)) {
      return { valid: false, error: "Localhost URLs not allowed" };
    }

    // Block private IP ranges
    const privateIpPatterns = [
      /^10\./,
      /^192\.168\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    ];
    if (privateIpPatterns.some((p) => p.test(parsed.hostname))) {
      return { valid: false, error: "Private IP addresses not allowed" };
    }

    // Block file:// protocol
    if (parsed.protocol === "file:") {
      return { valid: false, error: "File URLs not allowed" };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}

/**
 * Estimate the cost of a job plan
 */
export function estimatePlanCost(plan: JobPlan): {
  minCost: number;
  maxCost: number;
  breakdown: Array<{ step: number; action: string; estimatedCost: number }>;
} {
  // Cost per action (rough estimates in USD)
  const actionCosts: Record<AllowedAction, number> = {
    fetch_content: 0.0001, // Minimal LLM usage
    summarize: 0.003, // GPT-4o-mini
    web_search: 0.001, // External API + synthesis
    analyze_image: 0.005, // Vision model
    extract_metadata: 0.002, // GPT-4o-mini
    synthesize: 0.003, // GPT-4o-mini
  };

  const breakdown = plan.steps.map((step, i) => ({
    step: i + 1,
    action: step.action,
    estimatedCost: actionCosts[step.action] || 0.001,
  }));

  const totalCost = breakdown.reduce((sum, b) => sum + b.estimatedCost, 0);

  return {
    minCost: totalCost * 0.5,
    maxCost: totalCost * 2,
    breakdown,
  };
}

/**
 * Create a simple plan for common actions
 */
export function createSimplePlan(
  action: AllowedAction,
  params: Record<string, unknown> = {},
): JobPlan {
  return {
    reasoning: `Simple ${action} operation`,
    steps: [
      {
        action,
        why: `User requested ${action}`,
        params,
        timeout: TOOL_TIMEOUTS[action],
      },
    ],
    estimatedTokens: 2000,
    estimatedDuration: "30 seconds - 1 minute",
  };
}
