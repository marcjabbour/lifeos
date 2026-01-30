/**
 * Voice Question Answering Service
 *
 * Handles voice questions like "What restaurants have I saved?" by:
 * 1. Generating an embedding for the question
 * 2. Performing semantic search against user's items via tag similarity
 * 3. Generating a natural language answer summarizing results
 *
 * Part of TASK-802: Voice Q&A with semantic search
 */

import OpenAI from "openai";
import { createLLMClient } from "@/lib/services/ai/llm";
import {
  createTrace,
  flushLangfuse,
} from "@/lib/services/ai/observability/langfuse";
import type { SupabaseClient } from "@supabase/supabase-js";

let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    openaiInstance = new OpenAI({ apiKey });
  }
  return openaiInstance;
}

export interface QuestionResult {
  answer: string;
  items: Array<{
    id: string;
    title: string;
    category: string;
    url?: string;
    source_type: string;
    created_at: string;
    similarity?: number;
  }>;
  isQuestion: boolean;
  confidence: number;
}

export interface SemanticSearchResult {
  item_id: string;
  tag_name: string;
  category: string;
  similarity: number;
}

/**
 * Detect if a voice command is a question (vs a filter command)
 *
 * Questions typically:
 * - Start with question words (what, which, how many, etc.)
 * - Ask about specific information
 * - End with a question mark
 */
export function isQuestion(command: string): boolean {
  const normalizedCommand = command.toLowerCase().trim();

  // Question word patterns
  const questionPatterns = [
    /^what\b/,
    /^which\b/,
    /^how many\b/,
    /^how much\b/,
    /^when\b/,
    /^where\b/,
    /^who\b/,
    /^do i have\b/,
    /^have i\b/,
    /^did i\b/,
    /^can you (tell|show|find|list)/,
    /^tell me\b/,
    /^list\b/,
    /\?$/,
  ];

  return questionPatterns.some((pattern) => pattern.test(normalizedCommand));
}

/**
 * Extract search terms from a question for semantic search
 */
export function extractSearchTerms(question: string): string {
  // Remove common question words and filler
  const cleanedQuestion = question
    .toLowerCase()
    .replace(
      /^(what|which|how many|how much|when|where|who|do i have|have i|did i|can you (tell|show|find|list)|tell me|list)\s*/i,
      "",
    )
    .replace(
      /\b(the|a|an|my|i|me|any|all|about|related to|saved|have|had)\b/gi,
      "",
    )
    .replace(/\?$/g, "")
    .trim();

  return cleanedQuestion || question;
}

/**
 * Perform semantic search using embeddings
 */
export async function semanticSearch(
  query: string,
  userId: string,
  supabase: SupabaseClient,
  options: {
    matchThreshold?: number;
    matchCount?: number;
    categories?: string[];
  } = {},
): Promise<SemanticSearchResult[]> {
  const { matchThreshold = 0.5, matchCount = 20, categories = null } = options;

  const trace = createTrace("semantic_search", {
    userId,
    requestType: "execution",
    model: "gpt-4o-mini",
  });

  const span = trace.span("vector_search");

  try {
    // Generate embedding for the search query
    const client = createLLMClient({ userId });
    const { embedding } = await client.embed({ content: query });

    // Call the match_items_by_tag_similarity function
    const { data, error } = await supabase.rpc(
      "match_items_by_tag_similarity",
      {
        query_embedding: embedding,
        match_threshold: matchThreshold,
        match_count: matchCount,
        filter_user_id: userId,
        filter_categories: categories,
      },
    );

    if (error) {
      console.error("Semantic search error:", error);
      span.error(new Error(error.message));
      return [];
    }

    span.end({
      output: {
        resultCount: data?.length ?? 0,
        query,
      },
    });

    return data || [];
  } catch (error) {
    span.error(error instanceof Error ? error : new Error(String(error)));
    throw error;
  } finally {
    await flushLangfuse();
  }
}

/**
 * Fetch full item details for search results
 */
async function fetchItemDetails(
  itemIds: string[],
  userId: string,
  supabase: SupabaseClient,
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
  if (itemIds.length === 0) return [];

  const { data, error } = await supabase
    .from("items")
    .select("id, title, category, url, source_type, created_at")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .in("id", itemIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching item details:", error);
    return [];
  }

  return data || [];
}

/**
 * Generate a natural language answer for a question
 */
async function generateAnswer(
  question: string,
  items: Array<{
    id: string;
    title: string;
    category: string;
    url?: string;
    source_type: string;
    created_at: string;
    similarity?: number;
  }>,
  userId: string,
): Promise<string> {
  const trace = createTrace("generate_answer", {
    userId,
    requestType: "execution",
    model: "gpt-4o-mini",
  });

  const span = trace.span("answer_generation");

  try {
    const openai = getOpenAI();

    // Build context from items
    const itemContext =
      items.length > 0
        ? items
            .slice(0, 10)
            .map(
              (item, i) =>
                `${i + 1}. "${item.title}" (${item.category}, saved ${formatRelativeDate(item.created_at)})`,
            )
            .join("\n")
        : "No matching items found.";

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 200,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `You are Nova, an intelligent assistant helping users explore their saved content. Answer the user's question based on their saved items. Be conversational, helpful, and concise. If items were found, summarize them naturally. If no items match, suggest what they might search for instead.`,
        },
        {
          role: "user",
          content: `Question: "${question}"

Matching items:
${itemContext}

Please answer the question based on these items.`,
        },
      ],
    });

    const answer =
      response.choices[0]?.message?.content ||
      (items.length > 0
        ? `I found ${items.length} item${items.length === 1 ? "" : "s"} matching your query.`
        : "I couldn't find any items matching your question. Try asking about something else or use filters to browse your content.");

    span.end({ output: { answer, itemCount: items.length } });
    return answer;
  } catch (error) {
    span.error(error instanceof Error ? error : new Error(String(error)));

    // Return a fallback answer
    if (items.length > 0) {
      return `I found ${items.length} item${items.length === 1 ? "" : "s"} that might match your question.`;
    }
    return "I couldn't find any items matching your question. Try asking about something else!";
  } finally {
    await flushLangfuse();
  }
}

/**
 * Format a date as a relative string
 */
function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Main function to answer a voice question
 */
export async function answerQuestion(
  question: string,
  userId: string,
  supabase: SupabaseClient,
): Promise<QuestionResult> {
  const trace = createTrace("answer_question", {
    userId,
    requestType: "execution",
    model: "gpt-4o-mini",
  });

  const span = trace.span("question_answering");

  try {
    // Check if this is actually a question
    const questionDetected = isQuestion(question);

    if (!questionDetected) {
      span.end({ output: { isQuestion: false } });
      return {
        answer: "",
        items: [],
        isQuestion: false,
        confidence: 0.9,
      };
    }

    // Extract search terms from the question
    const searchTerms = extractSearchTerms(question);

    // Perform semantic search
    const searchResults = await semanticSearch(searchTerms, userId, supabase, {
      matchThreshold: 0.4, // Lower threshold for questions
      matchCount: 20,
    });

    // Get unique item IDs from search results
    const itemIds = [...new Set(searchResults.map((r) => r.item_id))];

    // Fetch full item details
    const items = await fetchItemDetails(itemIds, userId, supabase);

    // Add similarity scores to items
    const itemsWithSimilarity = items.map((item) => {
      const searchResult = searchResults.find((r) => r.item_id === item.id);
      return {
        ...item,
        similarity: searchResult?.similarity,
      };
    });

    // Sort by similarity (highest first)
    itemsWithSimilarity.sort(
      (a, b) => (b.similarity ?? 0) - (a.similarity ?? 0),
    );

    // If semantic search found nothing, try a fallback text search
    let finalItems: Array<{
      id: string;
      title: string;
      category: string;
      url?: string;
      source_type: string;
      created_at: string;
      similarity?: number;
    }> = itemsWithSimilarity;
    if (finalItems.length === 0) {
      const { data: textSearchItems } = await supabase
        .from("items")
        .select("id, title, category, url, source_type, created_at")
        .eq("user_id", userId)
        .eq("is_archived", false)
        .or(`title.ilike.%${searchTerms}%,content.ilike.%${searchTerms}%`)
        .order("created_at", { ascending: false })
        .limit(10);

      finalItems = (textSearchItems || []).map((item) => ({
        ...item,
        similarity: undefined,
      }));
    }

    // Generate a natural language answer
    const answer = await generateAnswer(question, finalItems, userId);

    span.end({
      output: {
        isQuestion: true,
        itemCount: finalItems.length,
        searchTerms,
      },
    });

    return {
      answer,
      items: finalItems,
      isQuestion: true,
      confidence: finalItems.length > 0 ? 0.85 : 0.6,
    };
  } catch (error) {
    span.error(error instanceof Error ? error : new Error(String(error)));

    return {
      answer:
        "Sorry, I had trouble processing your question. Please try again.",
      items: [],
      isQuestion: true,
      confidence: 0.3,
    };
  } finally {
    await flushLangfuse();
  }
}
