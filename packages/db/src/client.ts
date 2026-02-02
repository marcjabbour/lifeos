import { createClient, SupabaseClient } from "@supabase/supabase-js";

export type { SupabaseClient };

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceKey?: string;
}

export interface ClientOptions {
  persistSession?: boolean;
  autoRefreshToken?: boolean;
}

let _browserClient: SupabaseClient | null = null;
let _serviceClient: SupabaseClient | null = null;

function getEnvConfig(requireAnonKey = true): SupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "Missing SUPABASE_URL environment variable (or NEXT_PUBLIC_SUPABASE_URL).",
    );
  }

  if (requireAnonKey && !anonKey) {
    throw new Error(
      "Missing SUPABASE_ANON_KEY environment variable (or NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }

  return { url, anonKey: anonKey ?? "", serviceKey };
}

export function createBrowserClient(
  config?: Partial<SupabaseConfig>,
): SupabaseClient {
  if (_browserClient) {
    return _browserClient;
  }

  const { url, anonKey } = { ...getEnvConfig(), ...config };

  _browserClient = createClient(url, anonKey, {
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

  return _browserClient;
}

export function createServiceClient(
  config?: Partial<SupabaseConfig>,
): SupabaseClient {
  if (_serviceClient) {
    return _serviceClient;
  }

  const envConfig = getEnvConfig(false);
  const { url, serviceKey } = { ...envConfig, ...config };

  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for server-side operations",
    );
  }

  _serviceClient = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return _serviceClient;
}

export function createAuthenticatedClient(
  accessToken: string,
  config?: Partial<SupabaseConfig>,
): SupabaseClient {
  const { url, anonKey } = { ...getEnvConfig(), ...config };

  return createClient(url, anonKey, {
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

export function resetClients(): void {
  _browserClient = null;
  _serviceClient = null;
}
