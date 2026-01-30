/**
 * Web Fetch Tool for ActionDecider
 *
 * Fetches content from URLs to enrich saved items.
 */

import {
  createTrace,
  flushLangfuse,
} from "@/lib/services/ai/observability/langfuse";

/**
 * Result from URL fetching
 */
export interface WebFetchResult {
  title?: string;
  description?: string;
  content?: string;
  author?: string;
  publishDate?: string;
  imageUrl?: string;
  siteName?: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

/**
 * Fetch content from a URL
 */
export async function fetchUrlContent(
  url: string,
  options?: {
    userId?: string;
    timeoutMs?: number;
  },
): Promise<WebFetchResult> {
  const startTime = Date.now();
  const timeoutMs = options?.timeoutMs || 15000;

  console.log(`\n[WebFetch] ────────────────────────────────────────`);
  console.log(`[WebFetch] 🌐 FETCHING URL CONTENT`);
  console.log(`[WebFetch] ────────────────────────────────────────`);
  console.log(`[WebFetch] ▶ Input:`);
  console.log(`[WebFetch]   └─ url: ${url}`);
  console.log(`[WebFetch]   └─ timeoutMs: ${timeoutMs}`);
  console.log(`[WebFetch]   └─ userId: ${options?.userId || "(not provided)"}`);

  // Create Langfuse trace
  const trace = createTrace("web_fetch_tool", {
    userId: options?.userId,
    requestType: "perception",
    model: "gpt-4o-mini",
  });
  const span = trace.span("fetch_url");

  try {
    // Validate URL
    console.log(`[WebFetch] ▶ Validating URL...`);
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error("Invalid URL protocol - only HTTP/HTTPS allowed");
    }
    console.log(`[WebFetch]   └─ domain: ${parsedUrl.hostname}`);
    console.log(`[WebFetch]   └─ protocol: ${parsedUrl.protocol}`);
    console.log(`[WebFetch]   └─ path: ${parsedUrl.pathname}`);

    // Fetch with timeout
    console.log(`[WebFetch] ▶ Sending HTTP request...`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "LifeOS/1.0 (Content Aggregator Bot)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    clearTimeout(timeoutId);

    console.log(
      `[WebFetch]   └─ status: ${response.status} ${response.statusText}`,
    );
    console.log(
      `[WebFetch]   └─ content-type: ${response.headers.get("content-type") || "(not set)"}`,
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`[WebFetch]   └─ html_length: ${html.length} chars`);

    // Extract metadata from HTML
    console.log(`[WebFetch] ▶ Extracting metadata from HTML...`);
    const result = extractMetadataFromHtml(html, url);

    const durationMs = Date.now() - startTime;
    console.log(`[WebFetch] ✅ Fetch complete`);
    console.log(`[WebFetch]   └─ durationMs: ${durationMs}`);
    console.log(`[WebFetch]   └─ title: ${result.title || "(not found)"}`);
    console.log(
      `[WebFetch]   └─ description: ${result.description?.slice(0, 100) || "(not found)"}${result.description && result.description.length > 100 ? "..." : ""}`,
    );
    console.log(
      `[WebFetch]   └─ siteName: ${result.siteName || "(not found)"}`,
    );
    console.log(`[WebFetch]   └─ author: ${result.author || "(not found)"}`);
    console.log(
      `[WebFetch]   └─ imageUrl: ${result.imageUrl || "(not found)"}`,
    );
    console.log(
      `[WebFetch]   └─ publishDate: ${result.publishDate || "(not found)"}`,
    );

    span.end({ output: result });
    await flushLangfuse();

    return result;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.log(`[WebFetch] ❌ Fetch failed`);
    console.log(`[WebFetch]   └─ durationMs: ${durationMs}`);
    console.log(`[WebFetch]   └─ error: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      const stackLines = error.stack.split("\n").slice(1, 3).join("\n       ");
      console.log(`[WebFetch]   └─ stack: ${stackLines}`);
    }

    span.error(error instanceof Error ? error : new Error(errorMessage));
    await flushLangfuse();

    return {
      error: errorMessage,
    };
  }
}

/**
 * Extract metadata from HTML content
 */
function extractMetadataFromHtml(html: string, url: string): WebFetchResult {
  const result: WebFetchResult = {};

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    result.title = decodeHtmlEntities(titleMatch[1].trim());
  }

  // Extract meta description
  const descMatch =
    html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i,
    ) ||
    html.match(
      /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["'][^>]*>/i,
    );
  if (descMatch) {
    result.description = decodeHtmlEntities(descMatch[1].trim());
  }

  // Extract Open Graph metadata
  const ogTitle = extractMetaContent(html, "og:title");
  if (ogTitle && !result.title) result.title = ogTitle;

  const ogDesc = extractMetaContent(html, "og:description");
  if (ogDesc && !result.description) result.description = ogDesc;

  const ogImage = extractMetaContent(html, "og:image");
  if (ogImage) result.imageUrl = resolveUrl(ogImage, url);

  const ogSiteName = extractMetaContent(html, "og:site_name");
  if (ogSiteName) result.siteName = ogSiteName;

  // Extract author
  const authorMatch = html.match(
    /<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["'][^>]*>/i,
  );
  if (authorMatch) {
    result.author = decodeHtmlEntities(authorMatch[1].trim());
  }

  // Extract publish date
  const dateMatch = html.match(
    /<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["'][^>]*>/i,
  );
  if (dateMatch) {
    result.publishDate = dateMatch[1].trim();
  }

  // Extract some content (first paragraph)
  const paragraphMatch = html.match(/<p[^>]*>([^<]{50,500})/i);
  if (paragraphMatch) {
    result.content = decodeHtmlEntities(paragraphMatch[1].trim());
  }

  return result;
}

/**
 * Extract content from a meta tag by property name
 */
function extractMetaContent(
  html: string,
  property: string,
): string | undefined {
  const pattern = new RegExp(
    `<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const match = html.match(pattern);
  if (match) {
    return decodeHtmlEntities(match[1].trim());
  }

  // Try alternate format
  const altPattern = new RegExp(
    `<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["'][^>]*>`,
    "i",
  );
  const altMatch = html.match(altPattern);
  if (altMatch) {
    return decodeHtmlEntities(altMatch[1].trim());
  }

  return undefined;
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

/**
 * Resolve a potentially relative URL to absolute
 */
function resolveUrl(maybeRelative: string, base: string): string {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return maybeRelative;
  }
}
