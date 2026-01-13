/**
 * Authentication Middleware for API Routes
 *
 * Supports both:
 * - Supabase session auth (JWT in cookie)
 * - API key auth (Bearer token in Authorization header)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getServiceClient, getAuthenticatedClient } from '@/lib/db/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface AuthContext {
  userId: string
  supabase: SupabaseClient
  authType: 'session' | 'api_key'
  apiKeyId?: string
  scopes?: string[]
}

export interface AuthResult {
  success: true
  context: AuthContext
}

export interface AuthError {
  success: false
  error: string
  status: 401 | 403
}

type AuthResponse = AuthResult | AuthError

/**
 * Hash an API key for comparison
 */
function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/**
 * Validate a Supabase session from the request
 */
async function validateSession(request: NextRequest): Promise<AuthResponse> {
  // Get the access token from cookies
  const accessToken = request.cookies.get('sb-access-token')?.value

  if (!accessToken) {
    return { success: false, error: 'No session found', status: 401 }
  }

  try {
    // Create an authenticated client and verify the user
    const supabase = getAuthenticatedClient(accessToken)
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return { success: false, error: 'Invalid session', status: 401 }
    }

    return {
      success: true,
      context: {
        userId: user.id,
        supabase,
        authType: 'session',
      },
    }
  } catch {
    return { success: false, error: 'Session validation failed', status: 401 }
  }
}

/**
 * Validate an API key from the Authorization header
 */
async function validateApiKey(request: NextRequest): Promise<AuthResponse> {
  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'Invalid Authorization header', status: 401 }
  }

  const apiKey = authHeader.slice(7) // Remove 'Bearer ' prefix

  // Validate key format (should start with 'lifeos_')
  if (!apiKey.startsWith('lifeos_')) {
    return { success: false, error: 'Invalid API key format', status: 401 }
  }

  const keyHash = hashApiKey(apiKey)
  const keyPrefix = apiKey.slice(0, 15) // 'lifeos_' + first 8 chars

  try {
    const adminClient = getServiceClient()

    // Look up the API key
    const { data: apiKeyRecord, error } = await adminClient
      .from('api_keys')
      .select('id, user_id, scopes, rate_limit, is_active, expires_at')
      .eq('key_hash', keyHash)
      .eq('key_prefix', keyPrefix)
      .single()

    if (error || !apiKeyRecord) {
      return { success: false, error: 'Invalid API key', status: 401 }
    }

    // Check if key is active
    if (!apiKeyRecord.is_active) {
      return { success: false, error: 'API key is disabled', status: 403 }
    }

    // Check expiration
    if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
      return { success: false, error: 'API key has expired', status: 403 }
    }

    // Update last_used_at
    await adminClient
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyRecord.id)

    // Create a client with the user's context for RLS
    const supabase = getAuthenticatedClient(
      // Generate a minimal JWT for RLS (this is a simplified approach)
      // In production, you might want to use Supabase's service role for API key auth
      apiKey
    )

    return {
      success: true,
      context: {
        userId: apiKeyRecord.user_id,
        supabase: adminClient, // Use admin client for API key auth (RLS bypassed)
        authType: 'api_key',
        apiKeyId: apiKeyRecord.id,
        scopes: apiKeyRecord.scopes,
      },
    }
  } catch {
    return { success: false, error: 'API key validation failed', status: 401 }
  }
}

/**
 * Main authentication function
 * Tries session auth first, then API key auth
 */
export async function authenticate(request: NextRequest): Promise<AuthResponse> {
  // Check for API key in Authorization header first
  const authHeader = request.headers.get('authorization')

  if (authHeader?.startsWith('Bearer lifeos_')) {
    return validateApiKey(request)
  }

  // Fall back to session auth
  return validateSession(request)
}

/**
 * Middleware wrapper for protected API routes
 */
export function withAuth(
  handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await authenticate(request)

    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    return handler(request, authResult.context)
  }
}

/**
 * Check if the authenticated user has a specific scope (for API key auth)
 */
export function hasScope(context: AuthContext, scope: string): boolean {
  if (context.authType === 'session') {
    return true // Session auth has all scopes
  }
  return context.scopes?.includes(scope) ?? false
}

/**
 * Middleware for routes that require specific scopes
 */
export function withScopes(scopes: string[]) {
  return function (handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>) {
    return withAuth(async (request: NextRequest, context: AuthContext) => {
      for (const scope of scopes) {
        if (!hasScope(context, scope)) {
          return NextResponse.json({ error: `Missing required scope: ${scope}` }, { status: 403 })
        }
      }
      return handler(request, context)
    })
  }
}
