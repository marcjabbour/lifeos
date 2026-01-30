/**
 * Authentication Module
 *
 * Exports all auth-related functionality for the application.
 */

// Server-side middleware
export {
  authenticate,
  withAuth,
  withScopes,
  hasScope,
  type AuthContext,
  type AuthResult,
  type AuthError,
} from './middleware'

// Rate limiting
export { withRateLimit, checkRateLimit, RATE_LIMITS, type RateLimitConfig } from './rate-limit'

// Client-side hooks (will be imported with 'use client')
export { useAuth, useIsAuthenticated, useUserId, type AuthState } from './hooks'
