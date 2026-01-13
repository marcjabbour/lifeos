import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client for browser usage (respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Service client for server-side operations (bypasses RLS)
let serviceClient: SupabaseClient | null = null

export function getServiceClient(): SupabaseClient {
  if (!serviceClient) {
    serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return serviceClient
}

// Helper to get the client based on context
export function getClient(useServiceRole: boolean = false): SupabaseClient {
  return useServiceRole ? getServiceClient() : supabase
}
