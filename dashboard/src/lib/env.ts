/**
 * Environment variable validation
 * Validates all required environment variables at startup
 */

const requiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

const serverOnlyEnvVars = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
] as const;

interface EnvConfig {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  OPENAI_API_KEY?: string;
}

function getEnvVar(name: string): string | undefined {
  return process.env[name];
}

function validateEnv(): EnvConfig {
  const missingVars: string[] = [];

  // Check required public vars
  for (const envVar of requiredEnvVars) {
    if (!getEnvVar(envVar)) {
      missingVars.push(envVar);
    }
  }

  // Only check server vars on server side
  if (typeof window === "undefined") {
    for (const envVar of serverOnlyEnvVars) {
      if (!getEnvVar(envVar)) {
        // Warn but don't fail - these might not be needed for all operations
        console.warn(`[env] Optional server env var missing: ${envVar}`);
      }
    }
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missingVars.map((v) => `  - ${v}`).join("\n")}\n\n` +
        "Please add these to your .env.local file or deployment environment.",
    );
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: getEnvVar("NEXT_PUBLIC_SUPABASE_URL")!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY")!,
    SUPABASE_SERVICE_ROLE_KEY: getEnvVar("SUPABASE_SERVICE_ROLE_KEY"),
    OPENAI_API_KEY: getEnvVar("OPENAI_API_KEY"),
  };
}

// Validate on import (will throw if missing required vars)
export const env = validateEnv();

// Type-safe accessors
export function getSupabaseUrl(): string {
  return env.NEXT_PUBLIC_SUPABASE_URL;
}

export function getSupabaseAnonKey(): string {
  return env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export function getSupabaseServiceKey(): string {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return env.SUPABASE_SERVICE_ROLE_KEY;
}

export function getOpenAIKey(): string {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return env.OPENAI_API_KEY;
}
