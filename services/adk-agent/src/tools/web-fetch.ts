/**
 * Web Fetch Tool
 *
 * Fetches content from URLs to enrich saved items.
 */

import { createTrace, flushLangfuse } from "../observability/index.js";
import { logger } from "../utils/index.js";

const log = logger.child({ tool: "web-fetch" });

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

export async function fetchUrlContent(
  url: string,
  options?: { userId?: string; timeoutMs?: number },
): Promise<WebFetchResult> {
  const startTime = Date.now();
  const timeoutMs = options?.timeoutMs || 15000;

  log.info({ url, timeoutMs }, "Fetching URL content");

  const trace = createTrace("web_fetch_tool", {
    userId: options?.userId,
    requestType: "perception",
    model: "gpt-4o-mini",
  });
  const span = trace.span("fetch_url");

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error("Invalid URL protocol - only HTTP/HTTPS allowed");
    }

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

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const result = extractMetadataFromHtml(html, url);

    const durationMs = Date.now() - startTime;
    log.info({ durationMs, title: result.title }, "URL fetch complete");

    span.end({ output: result });
    await flushLangfuse();

    return result;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    log.error({ durationMs, error: errorMessage }, "URL fetch failed");

    span.error(error instanceof Error ? error : new Error(errorMessage));
    await flushLangfuse();

    return { error: errorMessage };
  }
}

function extractMetadataFromHtml(html: string, url: string): WebFetchResult {
  const result: WebFetchResult = {};

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    result.title = decodeHtmlEntities(titleMatch[1].trim());
  }

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

  const ogTitle = extractMetaContent(html, "og:title");
  if (ogTitle && !result.title) result.title = ogTitle;

  const ogDesc = extractMetaContent(html, "og:description");
  if (ogDesc && !result.description) result.description = ogDesc;

  const ogImage = extractMetaContent(html, "og:image");
  if (ogImage) result.imageUrl = resolveUrl(ogImage, url);

  const ogSiteName = extractMetaContent(html, "og:site_name");
  if (ogSiteName) result.siteName = ogSiteName;

  const authorMatch = html.match(
    /<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["'][^>]*>/i,
  );
  if (authorMatch) {
    result.author = decodeHtmlEntities(authorMatch[1].trim());
  }

  const dateMatch = html.match(
    /<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["'][^>]*>/i,
  );
  if (dateMatch) {
    result.publishDate = dateMatch[1].trim();
  }

  const paragraphMatch = html.match(/<p[^>]*>([^<]{50,500})/i);
  if (paragraphMatch) {
    result.content = decodeHtmlEntities(paragraphMatch[1].trim());
  }

  return result;
}

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

function resolveUrl(maybeRelative: string, base: string): string {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return maybeRelative;
  }
}
