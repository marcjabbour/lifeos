/**
 * Web Search Tool
 *
 * Uses Tavily API for web search, falls back to GPT-4o knowledge.
 */

import OpenAI from "openai";
import { createTrace, flushLangfuse } from "../observability/index.js";
import { logger } from "../utils/index.js";

const log = logger.child({ tool: "web-search" });

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

export async function searchWeb(
  query: string,
  contentType: string,
  options?: { userId?: string; timeoutMs?: number },
): Promise<WebSearchResult> {
  const startTime = Date.now();

  log.info({ query, contentType }, "Searching web");

  const trace = createTrace("web_search_tool", {
    userId: options?.userId,
    requestType: "perception",
    model: "gpt-4o",
  });
  const span = trace.span("web_search");

  try {
    let result: WebSearchResult;

    if (process.env.TAVILY_API_KEY) {
      result = await searchWithTavily(query, contentType);
    } else {
      result = await searchWithGpt(query, contentType);
    }

    const durationMs = Date.now() - startTime;
    log.info(
      { durationMs, name: result.name, source: result.source },
      "Search complete",
    );

    span.end({ output: result });
    await flushLangfuse();

    return result;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    log.error({ durationMs, error: errorMessage }, "Search failed");

    span.error(error instanceof Error ? error : new Error(errorMessage));
    await flushLangfuse();

    return { error: errorMessage };
  }
}

async function searchWithTavily(
  query: string,
  contentType: string,
): Promise<WebSearchResult> {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

  const data = (await response.json()) as {
    answer?: string;
    results?: Array<{ content: string; url: string }>;
  };

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

async function searchWithGpt(
  query: string,
  contentType: string,
): Promise<WebSearchResult> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
      { role: "user", content: searchPrompt },
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
