/**
 * Nova Voice Filter API
 *
 * Parses voice commands into filter intents for the Intelligence Feed.
 * POST /api/nova/voice-filter
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  parseFilterIntent,
  getSuggestedCommands,
} from "@/lib/services/ai/voice/filter-intent";
import { answerQuestion } from "@/lib/services/ai/voice/question-answering";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface VoiceFilterRequest {
  command: string;
  handleQuestions?: boolean; // If true, process questions and return answers directly
}

export async function POST(request: NextRequest) {
  try {
    // Get auth token from cookies
    const authHeader = request.headers.get("authorization");
    const cookieHeader = request.headers.get("cookie");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          ...(authHeader ? { Authorization: authHeader } : {}),
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
      },
    });

    // Check auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body: VoiceFilterRequest = await request.json();
    const { command } = body;

    if (!command || typeof command !== "string") {
      return NextResponse.json(
        { error: "Command string is required" },
        { status: 400 },
      );
    }

    // Limit command length
    if (command.length > 500) {
      return NextResponse.json(
        { error: "Command too long (max 500 characters)" },
        { status: 400 },
      );
    }

    // Parse the voice command into filter intent
    const intent = await parseFilterIntent(command);

    // If this is a question and handleQuestions is enabled, process it with semantic search
    if (intent.action === "question" && body.handleQuestions) {
      const questionResult = await answerQuestion(command, user.id, supabase);

      return NextResponse.json({
        success: true,
        intent,
        originalCommand: command,
        questionResult: {
          answer: questionResult.answer,
          items: questionResult.items,
          confidence: questionResult.confidence,
        },
      });
    }

    return NextResponse.json({
      success: true,
      intent,
      originalCommand: command,
    });
  } catch (error) {
    console.error("Voice filter parsing error:", error);
    return NextResponse.json(
      { error: "Failed to parse voice command" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/nova/voice-filter
 *
 * Get suggested voice commands
 */
export async function GET() {
  try {
    const suggestions = getSuggestedCommands();

    return NextResponse.json({
      suggestions,
    });
  } catch (error) {
    console.error("Voice filter suggestions error:", error);
    return NextResponse.json(
      { error: "Failed to get suggestions" },
      { status: 500 },
    );
  }
}
