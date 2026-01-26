/**
 * Tavily Search Client
 *
 * Provides web search functionality using the Tavily API.
 * Used for enriching content with real-time web data.
 */

export interface TavilySearchOptions {
  query: string;
  searchDepth?: "basic" | "advanced";
  includeAnswer?: boolean;
  maxResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
}

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  publishedDate?: string;
}

export interface TavilyResponse {
  answer?: string;
  query: string;
  responseTime: number;
  results: TavilySearchResult[];
}

/**
 * Search the web using Tavily API
 */
export async function searchWithTavily(
  options: TavilySearchOptions,
): Promise<TavilyResponse> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    throw new Error("TAVILY_API_KEY environment variable is not set");
  }

  const {
    query,
    searchDepth = "advanced",
    includeAnswer = true,
    maxResults = 5,
    includeDomains,
    excludeDomains,
  } = options;

  console.log(`[Tavily] Searching for: "${query.slice(0, 100)}..."`);

  const startTime = Date.now();

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: searchDepth,
      include_answer: includeAnswer,
      max_results: maxResults,
      include_domains: includeDomains,
      exclude_domains: excludeDomains,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Tavily] Search failed: ${response.status}`, errorText);
    throw new Error(`Tavily search failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const responseTime = Date.now() - startTime;

  console.log(
    `[Tavily] Found ${data.results?.length || 0} results in ${responseTime}ms`,
  );

  return {
    answer: data.answer,
    query: data.query,
    responseTime,
    results: (data.results || []).map((r: Record<string, unknown>) => ({
      title: r.title as string,
      url: r.url as string,
      content: r.content as string,
      score: r.score as number,
      publishedDate: r.published_date as string | undefined,
    })),
  };
}

/**
 * Check if Tavily API is configured
 */
export function isTavilyConfigured(): boolean {
  return !!process.env.TAVILY_API_KEY;
}
