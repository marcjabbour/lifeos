import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

interface HealthResponse {
  status: "ok" | "error";
  timestamp: string;
  supabase: boolean;
  error?: string;
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const timestamp = new Date().toISOString();

  // Check Supabase connection
  let supabaseOk = false;
  let errorMessage: string | undefined;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase environment variables not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Simple query to verify connection
    const { error } = await supabase.from("_health_check").select("*").limit(1);

    // Table doesn't need to exist - we just need to verify the connection works
    // A "relation does not exist" error means the connection succeeded
    if (error && !error.message.includes("does not exist")) {
      throw error;
    }

    supabaseOk = true;
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Unknown error";
    // Still consider it "ok" if connection works but table doesn't exist
    if (errorMessage.includes("does not exist")) {
      supabaseOk = true;
      errorMessage = undefined;
    }
  }

  const response: HealthResponse = {
    status: supabaseOk ? "ok" : "error",
    timestamp,
    supabase: supabaseOk,
    ...(errorMessage && { error: errorMessage }),
  };

  return NextResponse.json(response, {
    status: supabaseOk ? 200 : 503,
  });
}
