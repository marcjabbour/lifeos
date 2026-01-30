/**
 * Supabase Client Configuration
 *
 * Provides server and client-side Supabase clients with proper auth handling.
 * Uses lazy initialization to allow builds without environment variables.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Environment variables - defer validation to runtime
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Cached client instances
let _supabase: SupabaseClient | null = null;
let _serviceClient: SupabaseClient | null = null;

/**
 * Validate environment variables at runtime
 */
function validateEnv(): void {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
}

/**
 * Browser/client-side Supabase client (lazy-initialized)
 * Uses anon key with RLS policies
 */
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    validateEnv();
    _supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return _supabase;
}

/**
 * Legacy export for backward compatibility
 * Note: This will only work when environment variables are set
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    return Reflect.get(getSupabase(), prop);
  },
});

/**
 * Server-side Supabase client with service role
 * Bypasses RLS - use only in server/API routes
 */
export function getServiceClient(): SupabaseClient {
  if (!_serviceClient) {
    validateEnv();
    if (!supabaseServiceKey) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is required for server-side operations",
      );
    }
    _serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return _serviceClient;
}

/**
 * Get authenticated client for a specific user
 * Used in API routes after auth validation
 */
export function getAuthenticatedClient(accessToken: string): SupabaseClient {
  validateEnv();
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export type { SupabaseClient };
