/**
 * Nova Command API Route
 *
 * POST /api/nova/command - Process natural language commands for Nova UI
 *
 * Unified endpoint for Nova UI interactions:
 * - Filter commands: "show me food items" -> applies filter
 * - Query commands: "what was the last movie I saved?" -> returns answer with items
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthContext } from "@/lib/auth";
import {
  parseFilterIntent,
  type FilterIntent,
} from "@/lib/services/ai/voice/filter-intent";
import { answerQuestion } from "@/lib/services/ai/voice/question-answering";

export interface NovaCommandRequest {
  command: string;
}

export interface NovaFilterResponse {
  type: "filter";
  filter: {
    categories: string[];
    searchQuery?: string;
  };
  message: string;
  confidence: number;
}

export interface NovaQueryResponse {
  type: "query";
  answer: string;
  items: Array<{
    id: string;
    title: string;
    category: string;
    url?: string;
    source_type: string;
    created_at: string;
  }>;
}

export interface NovaClearResponse {
  type: "clear";
  message: string;
}

export type NovaCommandResponse =
  | NovaFilterResponse
  | NovaQueryResponse
  | NovaClearResponse;

/**
 * POST /api/nova/command
 * Process a natural language command from the Nova UI
 */
async function handleCommand(
  request: NextRequest,
  context: AuthContext,
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { command } = body as NovaCommandRequest;

    if (!command || typeof command !== "string") {
      return NextResponse.json(
        { error: "Command is required" },
        { status: 400 },
      );
    }

    // Parse the command using the filter intent service
    const intent = await parseFilterIntent(command);

    // Handle clear commands
    if (intent.action === "clear") {
      const response: NovaClearResponse = {
        type: "clear",
        message: "Filters cleared! Showing all items.",
      };
      return NextResponse.json(response);
    }

    // Handle question commands with semantic search
    if (intent.action === "question") {
      const questionResult = await answerQuestion(
        command,
        context.userId,
        context.supabase,
      );

      const response: NovaQueryResponse = {
        type: "query",
        answer: questionResult.answer,
        items: questionResult.items.map((item) => ({
          id: item.id,
          title: item.title,
          category: item.category,
          url: item.url,
          source_type: item.source_type,
          created_at: item.created_at,
        })),
      };
      return NextResponse.json(response);
    }

    // Handle filter commands
    if (intent.action === "filter" && intent.categories.length > 0) {
      const response: NovaFilterResponse = {
        type: "filter",
        filter: {
          categories: intent.categories,
          searchQuery: intent.searchQuery,
        },
        message: buildFilterMessage(intent),
        confidence: intent.confidence,
      };
      return NextResponse.json(response);
    }

    // Handle search commands
    if (intent.action === "search" || intent.searchQuery) {
      // If we have both categories and search query, treat as filter
      if (intent.categories.length > 0) {
        const response: NovaFilterResponse = {
          type: "filter",
          filter: {
            categories: intent.categories,
            searchQuery: intent.searchQuery,
          },
          message: buildFilterMessage(intent),
          confidence: intent.confidence,
        };
        return NextResponse.json(response);
      }

      // Otherwise, perform a search and return results
      const items = await searchItems(context, intent.searchQuery || command);
      const response: NovaQueryResponse = {
        type: "query",
        answer:
          items.length > 0
            ? `Found ${items.length} item${items.length === 1 ? "" : "s"} matching "${intent.searchQuery || command}".`
            : `No items found for "${intent.searchQuery || command}".`,
        items,
      };
      return NextResponse.json(response);
    }

    // For complex queries that don't match filter patterns
    // Return as a query response with searched items
    const items = await searchItems(context, command);
    const response: NovaQueryResponse = {
      type: "query",
      answer:
        items.length > 0
          ? `Here's what I found related to your question.`
          : `I couldn't find specific items matching your query. Try being more specific or use category filters.`,
      items,
    };
    return NextResponse.json(response);
  } catch (err) {
    console.error("Error processing Nova command:", err);
    return NextResponse.json(
      { error: "Failed to process command" },
      { status: 500 },
    );
  }
}

/**
 * Build a user-friendly message for filter actions
 */
function buildFilterMessage(intent: FilterIntent): string {
  const parts: string[] = [];

  if (intent.categories.length > 0) {
    const categoryList = intent.categories.join(", ");
    parts.push(`Filtering by ${categoryList}`);
  }

  if (intent.searchQuery) {
    parts.push(`searching for "${intent.searchQuery}"`);
  }

  return parts.join(" and ") + ".";
}

/**
 * Search for items matching a query
 */
async function searchItems(
  context: AuthContext,
  query: string,
): Promise<
  Array<{
    id: string;
    title: string;
    category: string;
    url?: string;
    source_type: string;
    created_at: string;
  }>
> {
  const { data: items, error } = await context.supabase
    .from("items")
    .select("id, title, category, url, source_type, created_at")
    .eq("user_id", context.userId)
    .eq("is_archived", false)
    .ilike("title", `%${query}%`)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error searching items:", error);
    return [];
  }

  return items || [];
}

// Export handler with auth middleware
export const POST = withAuth(handleCommand);
