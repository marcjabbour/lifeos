/**
 * LifeOS Ingestion Tools
 *
 * MCP tools for saving content to LifeOS.
 * Used by WhatsApp bot to ingest URLs, text, and images.
 */

import { z } from "zod";
import type { LifeOSApiClient, ShareResponse } from "../adapters/lifeos-api.js";

// Tool schemas
export const ingestContentSchema = z.object({
  content: z
    .string()
    .describe("The content to save - can be a URL, text note, or any content"),
  content_type: z.enum(["url", "text"]).describe("Type of content being saved"),
  source: z
    .string()
    .optional()
    .describe("Source of the content (e.g., 'whatsapp', 'siri')"),
});

export const ingestImageSchema = z.object({
  image_url: z
    .string()
    .url()
    .describe("URL of the image to save (from WhatsApp media)"),
  caption: z
    .string()
    .optional()
    .describe("Optional caption or description for the image"),
  source: z
    .string()
    .optional()
    .describe("Source of the image (e.g., 'whatsapp')"),
});

export type IngestContentInput = z.infer<typeof ingestContentSchema>;
export type IngestImageInput = z.infer<typeof ingestImageSchema>;

/**
 * Save URL or text content to LifeOS
 */
export async function ingestContent(
  client: LifeOSApiClient,
  input: IngestContentInput,
): Promise<ShareResponse> {
  return client.shareContent({
    content: input.content,
    content_type: input.content_type,
    source: input.source || "mcp",
  });
}

/**
 * Save an image to LifeOS with OCR processing
 */
export async function ingestImage(
  client: LifeOSApiClient,
  input: IngestImageInput,
): Promise<ShareResponse> {
  // For images, we send the URL as content with type 'image'
  // The LifeOS backend will download, process OCR, and enrich
  return client.shareContent({
    content: input.image_url,
    content_type: "image",
    source: input.source || "mcp",
  });
}

// Tool definitions for MCP registration
export const ingestionTools = [
  {
    name: "lifeos_ingest_content",
    description:
      "Save a URL or text note to LifeOS. Use this when the user shares a link, article, or writes a note they want to remember.",
    inputSchema: {
      type: "object" as const,
      properties: {
        content: {
          type: "string",
          description: "The content to save - can be a URL or text note",
        },
        content_type: {
          type: "string",
          enum: ["url", "text"],
          description: "Type of content: 'url' for links, 'text' for notes",
        },
        source: {
          type: "string",
          description: "Source of the content (e.g., 'whatsapp')",
        },
      },
      required: ["content", "content_type"],
    },
  },
  {
    name: "lifeos_ingest_image",
    description:
      "Save a screenshot or photo to LifeOS with automatic OCR. Use this when the user sends an image they want to save and process.",
    inputSchema: {
      type: "object" as const,
      properties: {
        image_url: {
          type: "string",
          description: "URL of the image to save",
        },
        caption: {
          type: "string",
          description: "Optional caption or description for the image",
        },
        source: {
          type: "string",
          description: "Source of the image (e.g., 'whatsapp')",
        },
      },
      required: ["image_url"],
    },
  },
];
