import { chatWithVision, parseJsonResponse } from "@/lib/openai";
import {
  IMAGE_ANALYSIS_SYSTEM_PROMPT,
  IMAGE_CATEGORIZATION_PROMPT,
} from "@/lib/prompts";
import type { CategorizationResult, ParsedContent } from "@/types";

interface ImageAnalysisResult extends CategorizationResult {
  title: string;
  description: string;
}

/**
 * Process an image using GPT-4o Vision.
 * Extracts content description and categorizes in a single API call (cost-efficient).
 */
export async function processImage(imageBase64: string): Promise<{
  parsedContent: ParsedContent;
  categorization: CategorizationResult;
}> {
  // Single API call to analyze and categorize the image
  const response = await chatWithVision(
    IMAGE_ANALYSIS_SYSTEM_PROMPT,
    IMAGE_CATEGORIZATION_PROMPT,
    imageBase64,
    { jsonMode: true, maxTokens: 300 },
  );

  const result = parseJsonResponse<ImageAnalysisResult>(response);

  const parsedContent: ParsedContent = {
    title: result.title,
    description: result.description,
  };

  const categorization: CategorizationResult = {
    category: result.category,
    tags: result.tags,
    confidence: result.confidence,
    reasoning: result.reasoning,
  };

  return { parsedContent, categorization };
}
