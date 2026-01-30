/**
 * Rate Limiting Middleware
 *
 * Implements sliding window rate limiting using in-memory storage.
 * For production, consider using Redis or Upstash for distributed rate limiting.
 */

import { NextRequest, NextResponse } from 'next/server'
import type { AuthContext } from './middleware'

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store (use Redis in production for distributed systems)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Rate limit configurations per endpoint
export interface RateLimitConfig {
  limit: number // Max requests
  windowMs: number // Time window in milliseconds
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/share': { limit: 30, windowMs: 60000 }, // 30/min - main intake, LLM calls
  '/api/conversation': { limit: 60, windowMs: 60000 }, // 60/min - chat interactions
  '/api/items': { limit: 100, windowMs: 60000 }, // 100/min - read-only, cacheable
  '/api/jobs': { limit: 120, windowMs: 60000 }, // 120/min - polling for status
  default: { limit: 60, windowMs: 60000 }, // Default: 60/min
}

/**
 * Get rate limit config for a path
 */
function getRateLimitConfig(pathname: string): RateLimitConfig {
  // Match exact paths or prefixes
  for (const [path, config] of Object.entries(RATE_LIMITS)) {
    if (path !== 'default' && pathname.startsWith(path)) {
      return config
    }
  }
  return RATE_LIMITS.default
}

/**
 * Generate a rate limit key
 */
function getRateLimitKey(userId: string, pathname: string): string {
  // Use the base path for rate limiting (e.g., /api/items, not /api/items/123)
  const basePath = pathname.split('/').slice(0, 3).join('/')
  return `${userId}:${basePath}`
}

/**
 * Clean up expired entries periodically
 */
function cleanupExpiredEntries(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000)

/**
 * Check rate limit for a request
 */
export function checkRateLimit(
  userId: string,
  pathname: string,
  customLimit?: number
): {
  allowed: boolean
  remaining: number
  resetAt: number
  limit: number
} {
  const config = getRateLimitConfig(pathname)
  const limit = customLimit ?? config.limit
  const key = getRateLimitKey(userId, pathname)
  const now = Date.now()

  let entry = rateLimitStore.get(key)

  // Create new entry if doesn't exist or expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    }
  }

  // Check if rate limited
  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      limit,
    }
  }

  // Increment count
  entry.count++
  rateLimitStore.set(key, entry)

  return {
    allowed: true,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
    limit,
  }
}

/**
 * Rate limit middleware wrapper
 */
export function withRateLimit(
  handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: AuthContext): Promise<NextResponse> => {
    const pathname = new URL(request.url).pathname

    // Use API key's custom rate limit if available
    const customLimit = context.authType === 'api_key' ? undefined : undefined // Could use apiKeyRecord.rate_limit

    const result = checkRateLimit(context.userId, pathname, customLimit)

    // Add rate limit headers to response
    const addRateLimitHeaders = (response: NextResponse): NextResponse => {
      response.headers.set('X-RateLimit-Limit', result.limit.toString())
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
      response.headers.set('X-RateLimit-Reset', result.resetAt.toString())
      return response
    }

    if (!result.allowed) {
      const response = NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retry_after: Math.ceil((result.resetAt - Date.now()) / 1000),
        },
        { status: 429 }
      )
      return addRateLimitHeaders(response)
    }

    const response = await handler(request, context)
    return addRateLimitHeaders(response)
  }
}

/**
 * Combined auth + rate limit middleware
 */
export { withAuth } from './middleware'
