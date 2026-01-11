import { chat, parseJsonResponse } from "@/lib/openai";
import {
  CATEGORIZATION_SYSTEM_PROMPT,
  buildCategorizationPrompt,
} from "@/lib/prompts";
import type { CategorizationResult, ParsedContent } from "@/types";

/**
 * Extract a title from plain text content.
 * Uses the first line/sentence or truncates if too long.
 */
function extractTitle(text: string): string {
  // Try first line
  const firstLine = text.split("\n")[0].trim();
  if (firstLine.length > 0 && firstLine.length <= 100) {
    return firstLine;
  }

  // Try first sentence
  const firstSentence = text.match(/^[^.!?]+[.!?]/)?.[0]?.trim();
  if (firstSentence && firstSentence.length <= 100) {
    return firstSentence;
  }

  // Truncate
  return text.substring(0, 50).trim() + "...";
}

/**
 * Process plain text: extract title and categorize.
 */
export async function processText(text: string): Promise<{
  parsedContent: ParsedContent;
  categorization: CategorizationResult;
}> {
  // Extract basic parsed content (no API call needed)
  const parsedContent: ParsedContent = {
    title: extractTitle(text),
    description: text.length > 200 ? text.substring(0, 200) + "..." : text,
  };

  // Categorize the text content
  const response = await chat(
    [
      { role: "system", content: CATEGORIZATION_SYSTEM_PROMPT },
      { role: "user", content: buildCategorizationPrompt("text", text) },
    ],
    { jsonMode: true, maxTokens: 200 },
  );

  const categorization = parseJsonResponse<CategorizationResult>(response);

  return { parsedContent, categorization };
}
