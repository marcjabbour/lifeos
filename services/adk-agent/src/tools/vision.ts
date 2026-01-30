/**
 * Vision Tool
 *
 * GPT-4o Vision for image analysis.
 */

import OpenAI from "openai";
import { createTrace, flushLangfuse } from "../observability/index.js";
import { logger } from "../utils/index.js";

const log = logger.child({ tool: "vision" });

export interface VisionAnalysisResult {
  title?: string;
  description: string;
  extractedText?: string;
  topics?: string[];
  contentType?:
    | "screenshot"
    | "photo"
    | "document"
    | "menu"
    | "receipt"
    | "ticket"
    | "map"
    | "product"
    | "meme"
    | "other";
  entities?: string[];
  confidence: number;
}

export async function analyzeImageWithVision(
  imageUrl: string,
  options?: { userId?: string; context?: string },
): Promise<VisionAnalysisResult> {
  const startTime = Date.now();

  log.info({ imageUrl: imageUrl.slice(0, 100) }, "Starting image analysis");

  const trace = createTrace("vision_tool", {
    userId: options?.userId,
    requestType: "perception",
    model: "gpt-4o",
  });
  const span = trace.span("analyze_image");

  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `You are an image analysis assistant. Analyze the image and extract useful information.

Return a JSON object with:
{
  "title": "A short, descriptive title for this image",
  "description": "A detailed description of what's in the image",
  "extractedText": "Any text visible in the image (OCR). Include all readable text.",
  "topics": ["relevant", "topics", "for", "categorization"],
  "contentType": "screenshot" | "photo" | "document" | "menu" | "receipt" | "ticket" | "map" | "product" | "meme" | "other",
  "entities": ["Named entities mentioned or shown"],
  "confidence": 0.0-1.0 (how confident you are in your analysis)
}

Be specific and helpful. Extract all relevant details that might help categorize this content.`;

    const userPrompt = options?.context
      ? `Please analyze this image. Context: ${options.context}`
      : "Please analyze this image and extract all useful information:";

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            {
              type: "image_url",
              image_url: { url: imageUrl, detail: "high" },
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from vision API");
    }

    const result = JSON.parse(content) as VisionAnalysisResult;

    if (typeof result.confidence !== "number") {
      result.confidence = 0.8;
    }

    const durationMs = Date.now() - startTime;
    log.info(
      { durationMs, title: result.title, contentType: result.contentType },
      "Analysis complete",
    );

    span.end({
      output: result,
      usage: response.usage
        ? {
            inputTokens: response.usage.prompt_tokens || 0,
            outputTokens: response.usage.completion_tokens || 0,
            totalTokens: response.usage.total_tokens || 0,
          }
        : undefined,
    });
    await flushLangfuse();

    return result;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    log.error({ durationMs, error }, "Image analysis failed");

    span.error(error instanceof Error ? error : new Error(String(error)));
    await flushLangfuse();

    return {
      description: "Image analysis failed",
      confidence: 0,
    };
  }
}
