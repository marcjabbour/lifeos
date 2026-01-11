import { chat, parseJsonResponse } from "@/lib/openai";
import {
  CATEGORIZATION_SYSTEM_PROMPT,
  URL_PARSING_SYSTEM_PROMPT,
  buildCategorizationPrompt,
  buildUrlParsingPrompt,
} from "@/lib/prompts";
import type { CategorizationResult, ParsedContent } from "@/types";

/**
 * Fetch and extract metadata from a URL.
 * Falls back to basic URL info if fetching fails.
 */
async function fetchUrlContent(url: string): Promise<{
  rawContent: string;
  title?: string;
  description?: string;
  imageUrl?: string;
}> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LifeOS/1.0; +https://lifeos.app)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // Extract basic metadata from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descriptionMatch = html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    );
    const ogDescriptionMatch = html.match(
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    );
    const ogImageMatch = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    );

    // Strip HTML tags for raw content (cost-conscious: limit to first 10KB)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 10000);

    return {
      rawContent: textContent,
      title: titleMatch?.[1]?.trim(),
      description:
        ogDescriptionMatch?.[1]?.trim() || descriptionMatch?.[1]?.trim(),
      imageUrl: ogImageMatch?.[1]?.trim(),
    };
  } catch (error) {
    console.warn("Failed to fetch URL content:", error);
    // Return minimal info if fetch fails
    return {
      rawContent: "",
      title: undefined,
      description: undefined,
      imageUrl: undefined,
    };
  }
}

/**
 * Parse URL content using GPT-4o to extract title and description.
 * Only used when HTML metadata is insufficient.
 */
async function parseUrlWithAI(
  url: string,
  rawContent: string,
): Promise<{ title: string; description: string }> {
  const response = await chat(
    [
      { role: "system", content: URL_PARSING_SYSTEM_PROMPT },
      { role: "user", content: buildUrlParsingPrompt(url, rawContent) },
    ],
    { jsonMode: true, maxTokens: 200 },
  );

  return parseJsonResponse<{ title: string; description: string }>(response);
}

/**
 * Process a URL: fetch content, parse metadata, and categorize.
 */
export async function processUrl(url: string): Promise<{
  parsedContent: ParsedContent;
  categorization: CategorizationResult;
}> {
  // Step 1: Fetch URL content
  const fetched = await fetchUrlContent(url);

  // Step 2: Determine if we need AI parsing
  let parsedContent: ParsedContent;

  if (fetched.title && fetched.description) {
    // We have enough metadata from HTML
    parsedContent = {
      title: fetched.title,
      description: fetched.description,
      url,
      imageUrl: fetched.imageUrl,
    };
  } else if (fetched.rawContent) {
    // Need AI to parse the content
    const aiParsed = await parseUrlWithAI(url, fetched.rawContent);
    parsedContent = {
      title: aiParsed.title || fetched.title || new URL(url).hostname,
      description: aiParsed.description || fetched.description || "",
      url,
      imageUrl: fetched.imageUrl,
    };
  } else {
    // Minimal fallback
    parsedContent = {
      title: new URL(url).hostname,
      description: url,
      url,
    };
  }

  // Step 3: Categorize the content
  const categorizationResponse = await chat(
    [
      { role: "system", content: CATEGORIZATION_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildCategorizationPrompt("url", url, {
          title: parsedContent.title,
          description: parsedContent.description,
        }),
      },
    ],
    { jsonMode: true, maxTokens: 200 },
  );

  const categorization = parseJsonResponse<CategorizationResult>(
    categorizationResponse,
  );

  return { parsedContent, categorization };
}
