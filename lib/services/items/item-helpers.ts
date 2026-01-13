/**
 * Item Helpers
 *
 * Utility functions for item title extraction and metadata generation.
 * Extracted from API routes for reusability.
 */

import type { ContentType, ItemMetadata } from "@/types/database";

/**
 * Extract title from URL (basic extraction)
 * In production, this would be enhanced with actual page fetching
 */
export function extractTitleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Use pathname or hostname as fallback title
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts.length > 0) {
      return pathParts[pathParts.length - 1].replace(/[-_]/g, " ");
    }
    return parsed.hostname;
  } catch {
    return "Shared URL";
  }
}

/**
 * Extract title from text content
 */
export function extractTitleFromText(text: string): string {
  // Use first line or first 50 characters
  const firstLine = text.split("\n")[0].trim();
  if (firstLine.length <= 50) {
    return firstLine;
  }
  return firstLine.substring(0, 47) + "...";
}

/**
 * Generate a title based on content type
 */
export function generateTitle(
  content: string,
  contentType: ContentType,
): string {
  switch (contentType) {
    case "url":
      return extractTitleFromUrl(content);
    case "text":
      return extractTitleFromText(content);
    case "image":
      return "Shared Image";
    default:
      return "Shared Content";
  }
}

/**
 * Create initial metadata based on content type
 */
export function createInitialMetadata(
  content: string,
  contentType: ContentType,
  source?: string,
): ItemMetadata {
  const metadata: ItemMetadata = {
    source: source || "direct",
    shared_at: new Date().toISOString(),
  };

  if (contentType === "url") {
    try {
      const parsed = new URL(content);
      metadata.domain = parsed.hostname;
      metadata.protocol = parsed.protocol;
    } catch {
      // Invalid URL, skip metadata
    }
  }

  if (contentType === "text") {
    metadata.char_count = content.length;
    metadata.word_count = content.split(/\s+/).filter(Boolean).length;
  }

  if (contentType === "image") {
    // Extract image info from base64 data URL
    const match = content.match(/^data:(image\/[a-z+]+);base64,/i);
    if (match) {
      metadata.mime_type = match[1];
    }
  }

  return metadata;
}

/**
 * UUID validation regex
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Check if a string is a valid UUID
 */
export function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * Validate a UUID and return an error message if invalid
 */
export function validateUUID(id: string): { valid: boolean; error?: string } {
  if (!isValidUUID(id)) {
    return { valid: false, error: "Invalid ID format" };
  }
  return { valid: true };
}
