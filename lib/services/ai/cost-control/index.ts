/**
 * Cost Control & Token Budgets for Nova
 *
 * Implements token budgets, cost tracking, and spending limits
 * per user/request to prevent runaway costs.
 */

import type { LLMModel, TokenUsage } from '@/types/llm'
import { MODEL_PRICING, calculateCost as calcCost } from '@/types/llm'

// Token budget constants
export const TOKEN_BUDGETS = {
  per_request: 8_000, // ~$0.10 max per request (GPT-4o)
  per_job: 50_000, // ~$0.50 max per job
  per_user_daily: 200_000, // ~$2.00 daily limit
  per_user_monthly: 2_000_000, // ~$20 monthly limit
} as const

// Cost estimates in cents
export const COST_LIMITS = {
  per_request_cents: 10, // $0.10
  per_job_cents: 50, // $0.50
  per_user_daily_cents: 200, // $2.00
  per_user_monthly_cents: 2000, // $20.00
} as const

export interface BudgetStatus {
  allowed: boolean
  remaining_daily: number
  remaining_monthly: number
  reason?: string
  reset_time?: Date
}

export interface UsageRecord {
  userId: string
  model: LLMModel
  requestType: string
  inputTokens: number
  outputTokens: number
  estimatedCostCents: number
  timestamp: Date
  traceId?: string
  jobId?: string
}

// In-memory usage tracking (should be replaced with database)
const usageCache = new Map<string, UsageRecord[]>()

/**
 * Check if user has budget available
 */
export async function checkBudget(userId: string): Promise<BudgetStatus> {
  const usage = await getUserUsage(userId)

  // Check daily limit
  if (usage.dailyTokens >= TOKEN_BUDGETS.per_user_daily) {
    const resetTime = getNextMidnightUTC()
    return {
      allowed: false,
      remaining_daily: 0,
      remaining_monthly: Math.max(0, TOKEN_BUDGETS.per_user_monthly - usage.monthlyTokens),
      reason: 'Daily token limit reached. Resets at midnight UTC.',
      reset_time: resetTime,
    }
  }

  // Check monthly limit
  if (usage.monthlyTokens >= TOKEN_BUDGETS.per_user_monthly) {
    const resetTime = getFirstOfNextMonth()
    return {
      allowed: false,
      remaining_daily: 0,
      remaining_monthly: 0,
      reason: 'Monthly token limit reached.',
      reset_time: resetTime,
    }
  }

  return {
    allowed: true,
    remaining_daily: TOKEN_BUDGETS.per_user_daily - usage.dailyTokens,
    remaining_monthly: TOKEN_BUDGETS.per_user_monthly - usage.monthlyTokens,
  }
}

/**
 * Check if a specific request is within budget
 */
export async function checkRequestBudget(
  userId: string,
  estimatedTokens: number
): Promise<BudgetStatus> {
  // First check overall budget
  const overallBudget = await checkBudget(userId)
  if (!overallBudget.allowed) {
    return overallBudget
  }

  // Check if this request fits within remaining budget
  if (estimatedTokens > overallBudget.remaining_daily) {
    return {
      allowed: false,
      remaining_daily: overallBudget.remaining_daily,
      remaining_monthly: overallBudget.remaining_monthly,
      reason: `Request (${estimatedTokens} tokens) exceeds remaining daily budget (${overallBudget.remaining_daily} tokens)`,
    }
  }

  // Check per-request limit
  if (estimatedTokens > TOKEN_BUDGETS.per_request) {
    return {
      allowed: false,
      remaining_daily: overallBudget.remaining_daily,
      remaining_monthly: overallBudget.remaining_monthly,
      reason: `Request (${estimatedTokens} tokens) exceeds per-request limit (${TOKEN_BUDGETS.per_request} tokens)`,
    }
  }

  return overallBudget
}

/**
 * Track usage for a completed request
 */
export async function trackUsage(record: UsageRecord): Promise<void> {
  const key = record.userId

  if (!usageCache.has(key)) {
    usageCache.set(key, [])
  }

  usageCache.get(key)!.push(record)

  // TODO: Persist to database
  // await supabase.from('usage_tracking').insert({
  //   user_id: record.userId,
  //   model: record.model,
  //   request_type: record.requestType,
  //   input_tokens: record.inputTokens,
  //   output_tokens: record.outputTokens,
  //   estimated_cost_cents: record.estimatedCostCents,
  //   trace_id: record.traceId,
  //   job_id: record.jobId,
  //   created_at: record.timestamp,
  // })
}

/**
 * Get user's current usage
 */
async function getUserUsage(userId: string): Promise<{
  dailyTokens: number
  monthlyTokens: number
  dailyCostCents: number
  monthlyCostCents: number
}> {
  const records = usageCache.get(userId) || []

  const now = new Date()
  const startOfDay = getStartOfDayUTC(now)
  const startOfMonth = getStartOfMonthUTC(now)

  let dailyTokens = 0
  let monthlyTokens = 0
  let dailyCostCents = 0
  let monthlyCostCents = 0

  for (const record of records) {
    const totalTokens = record.inputTokens + record.outputTokens

    // Monthly totals
    if (record.timestamp >= startOfMonth) {
      monthlyTokens += totalTokens
      monthlyCostCents += record.estimatedCostCents
    }

    // Daily totals
    if (record.timestamp >= startOfDay) {
      dailyTokens += totalTokens
      dailyCostCents += record.estimatedCostCents
    }
  }

  // TODO: Fetch from database for persistence
  // const { data } = await supabase.rpc('get_user_usage', { user_id: userId })

  return {
    dailyTokens,
    monthlyTokens,
    dailyCostCents,
    monthlyCostCents,
  }
}

/**
 * Calculate cost for a model and usage
 */
export function calculateCost(model: LLMModel, usage: TokenUsage): number {
  return calcCost(model, usage)
}

/**
 * Convert cost to cents
 */
export function costToCents(costUsd: number): number {
  return Math.ceil(costUsd * 100)
}

/**
 * Estimate tokens from text length
 * Rough estimate: 1 token ≈ 4 characters
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Estimate cost for a task type
 */
export function estimateTaskCost(
  taskType: 'perception' | 'reasoning' | 'execution' | 'summarization',
  inputLength: number
): { tokens: number; costUsd: number; costCents: number } {
  const typicalUsage: Record<string, { input: number; output: number; model: LLMModel }> = {
    perception: { input: 500, output: 300, model: 'gpt-4o-mini' },
    reasoning: { input: 2000, output: 500, model: 'gpt-4o' },
    execution: { input: 1000, output: 500, model: 'gpt-4o-mini' },
    summarization: { input: 2000, output: 200, model: 'gpt-4o-mini' },
  }

  const typical = typicalUsage[taskType] || typicalUsage.perception

  // Adjust input based on actual content length
  const inputTokens = Math.max(typical.input, estimateTokens(String(inputLength)))
  const outputTokens = typical.output

  const usage: TokenUsage = {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
  }

  const costUsd = calculateCost(typical.model, usage)

  return {
    tokens: usage.totalTokens,
    costUsd,
    costCents: costToCents(costUsd),
  }
}

/**
 * Get user-friendly budget status message
 */
export function getBudgetStatusMessage(status: BudgetStatus): string {
  if (status.allowed) {
    const dailyPercent = Math.round(
      ((TOKEN_BUDGETS.per_user_daily - status.remaining_daily) / TOKEN_BUDGETS.per_user_daily) * 100
    )
    return `Budget: ${dailyPercent}% of daily limit used`
  }

  if (status.reset_time) {
    const resetIn = getTimeUntil(status.reset_time)
    return `${status.reason} Resets in ${resetIn}.`
  }

  return status.reason || 'Budget limit reached'
}

// Date utilities

function getStartOfDayUTC(date: Date): Date {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function getStartOfMonthUTC(date: Date): Date {
  const d = new Date(date)
  d.setUTCDate(1)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function getNextMidnightUTC(): Date {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(0, 0, 0, 0)
  return tomorrow
}

function getFirstOfNextMonth(): Date {
  const now = new Date()
  const nextMonth = new Date(now)
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1)
  nextMonth.setUTCDate(1)
  nextMonth.setUTCHours(0, 0, 0, 0)
  return nextMonth
}

function getTimeUntil(date: Date): string {
  const now = new Date()
  const diff = date.getTime() - now.getTime()

  if (diff <= 0) return 'now'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days} day${days > 1 ? 's' : ''}`
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes}m`
}

/**
 * Clean up old usage records (for in-memory cache)
 */
export function cleanupOldRecords(): void {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  for (const [userId, records] of usageCache.entries()) {
    const filtered = records.filter((r) => r.timestamp >= thirtyDaysAgo)
    if (filtered.length === 0) {
      usageCache.delete(userId)
    } else {
      usageCache.set(userId, filtered)
    }
  }
}
