/**
 * Web Search Tool for ActionDecider
 *
 * Uses Tavily API for intelligent web search to enrich content.
 * Falls back to GPT-4o knowledge if Tavily is not configured.
 */

import OpenAI from "openai";
import {
  createTrace,
  flushLangfuse,
} from "@/lib/services/ai/observability/langfuse";

/**
 * Result from web search
 */
export interface WebSearchResult {
  name?: string;
  description?: string;
  address?: string;
  website?: string;
  phone?: string;
  rating?: number;
  priceRange?: string;
  details?: string[];
  source?: string;
  error?: string;
}

/**
 * Search for information about a topic
 */
export async function searchWeb(
  query: string,
  contentType: string,
  options?: {
    userId?: string;
    timeoutMs?: number;
  },
): Promise<WebSearchResult> {
  const startTime = Date.now();

  console.log(`\n[WebSearch] ────────────────────────────────────────`);
  console.log(`[WebSearch] 🔍 SEARCHING WEB`);
  console.log(`[WebSearch] ────────────────────────────────────────`);
  console.log(`[WebSearch] ▶ Input:`);
  console.log(`[WebSearch]   └─ query: ${query}`);
  console.log(`[WebSearch]   └─ contentType: ${contentType}`);
  console.log(
    `[WebSearch]   └─ userId: ${options?.userId || "(not provided)"}`,
  );
  console.log(
    `[WebSearch]   └─ tavilyConfigured: ${!!process.env.TAVILY_API_KEY}`,
  );

  // Create Langfuse trace
  const trace = createTrace("web_search_tool", {
    userId: options?.userId,
    requestType: "perception",
    model: "gpt-4o",
  });
  const span = trace.span("web_search");

  try {
    let result: WebSearchResult;

    // Check if Tavily is configured
    if (process.env.TAVILY_API_KEY) {
      console.log(`[WebSearch] ▶ Using Tavily API for search...`);
      result = await searchWithTavily(query, contentType);
      console.log(`[WebSearch]   └─ source: Tavily Search`);
    } else {
      // Fall back to GPT-4o knowledge
      console.log(
        `[WebSearch] ▶ Tavily not configured, using GPT-4o knowledge...`,
      );
      result = await searchWithGpt(query, contentType);
      console.log(`[WebSearch]   └─ source: AI knowledge`);
    }

    const durationMs = Date.now() - startTime;
    console.log(`[WebSearch] ✅ Search complete`);
    console.log(`[WebSearch]   └─ durationMs: ${durationMs}`);
    console.log(`[WebSearch]   └─ name: ${result.name || "(not found)"}`);
    console.log(
      `[WebSearch]   └─ description: ${result.description?.slice(0, 100) || "(not found)"}${result.description && result.description.length > 100 ? "..." : ""}`,
    );
    console.log(`[WebSearch]   └─ website: ${result.website || "(not found)"}`);
    console.log(`[WebSearch]   └─ rating: ${result.rating || "(not found)"}`);
    console.log(
      `[WebSearch]   └─ priceRange: ${result.priceRange || "(not found)"}`,
    );
    console.log(
      `[WebSearch]   └─ detailsCount: ${result.details?.length || 0}`,
    );
    if (result.error) {
      console.log(`[WebSearch]   └─ error: ${result.error}`);
    }

    span.end({ output: result });
    await flushLangfuse();

    return result;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.log(`[WebSearch] ❌ Search failed`);
    console.log(`[WebSearch]   └─ durationMs: ${durationMs}`);
    console.log(`[WebSearch]   └─ error: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      const stackLines = error.stack.split("\n").slice(1, 3).join("\n       ");
      console.log(`[WebSearch]   └─ stack: ${stackLines}`);
    }

    span.error(error instanceof Error ? error : new Error(errorMessage));
    await flushLangfuse();

    return {
      error: errorMessage,
    };
  }
}

/**
 * Search using Tavily API
 */
async function searchWithTavily(
  query: string,
  contentType: string,
): Promise<WebSearchResult> {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query: `${query} ${contentType}`,
      search_depth: "basic",
      max_results: 3,
      include_answer: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily API error: ${response.status}`);
  }

  const data = await response.json();

  return {
    name: query,
    description: data.answer || data.results?.[0]?.content,
    website: data.results?.[0]?.url,
    details: data.results
      ?.slice(0, 3)
      .map((r: { content: string }) => r.content),
    source: "Tavily Search",
  };
}

/**
 * Search using GPT-4o knowledge base
 */
async function searchWithGpt(
  query: string,
  contentType: string,
): Promise<WebSearchResult> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Build search prompt based on content type
  const searchPrompt = buildSearchPrompt(query, contentType);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1000,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a helpful assistant that provides accurate information from your knowledge.
Return a JSON object with any relevant information you know.
If you don't have reliable information, return an empty object {}.
Be accurate - only include what you're confident about.`,
      },
      {
        role: "user",
        content: searchPrompt,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return { source: "AI knowledge" };
  }

  const result = JSON.parse(content) as WebSearchResult;
  result.source = "AI knowledge";

  return result;
}

/**
 * Build a search prompt based on content type
 */
function buildSearchPrompt(query: string, contentType: string): string {
  const prompts: Record<string, string> = {
    restaurant: `Search for information about the restaurant "${query}".
Return a JSON object with:
{
  "name": "Official restaurant name",
  "description": "Brief description, cuisine type, atmosphere",
  "address": "Full address if known",
  "website": "Official website URL",
  "phone": "Phone number",
  "rating": "Average rating (number)",
  "priceRange": "$ to $$$$",
  "details": ["Notable dishes", "Hours", "Reservations info"]
}`,

    place: `Search for information about "${query}" as a place/location.
Return a JSON object with:
{
  "name": "Official name",
  "description": "What this place is and why people visit",
  "address": "Full address",
  "website": "Official website",
  "details": ["Key attractions", "Hours", "Tips"]
}`,

    book: `Search for information about the book "${query}".
Return a JSON object with:
{
  "name": "Full book title",
  "description": "Synopsis without spoilers",
  "details": ["Author", "Publication year", "Genre", "Awards"]
}`,

    movie: `Search for information about the movie "${query}".
Return a JSON object with:
{
  "name": "Full movie title",
  "description": "Plot synopsis without major spoilers",
  "rating": "IMDB or Rotten Tomatoes rating",
  "details": ["Director", "Cast", "Release year", "Runtime"]
}`,

    product: `Search for information about "${query}" as a product or brand.
Return a JSON object with:
{
  "name": "Official product/brand name",
  "description": "What it is and key features",
  "website": "Official website",
  "priceRange": "Price range if applicable",
  "details": ["Key features", "Pros", "Common uses"]
}`,
  };

  return (
    prompts[contentType] ||
    `Search for information about "${query}".
Return a JSON object with:
{
  "name": "Name/title",
  "description": "Brief description",
  "details": ["Any relevant information"]
}`
  );
}
