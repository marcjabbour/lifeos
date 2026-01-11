import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Client-side Supabase client (uses anon key, respects RLS)
// Using untyped client for flexibility - types are applied at usage point
export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
);

// Server-side Supabase client factory
// For API routes that need to bypass RLS, pass the service role key
export function createServerClient(useServiceRole = false): SupabaseClient {
  const key = useServiceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY!
    : supabaseAnonKey;

  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
