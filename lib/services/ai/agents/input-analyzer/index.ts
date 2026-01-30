/**
 * InputAnalyzer Agent
 *
 * First stage of the orchestrator pipeline.
 * Detects content type and extracts/normalizes information.
 *
 * Capabilities:
 * - Vision analysis for images (GPT-4o Vision)
 * - Audio transcription (Whisper API)
 * - Text normalization and type detection
 */

import OpenAI from "openai";
import type { PipelineState } from "../config";
import { AGENT_CONFIGS } from "../config";
import {
  INPUT_ANALYZER_SYSTEM_PROMPT,
  type InputAnalyzerOutput,
} from "./prompts";
import {
  analyzeImageWithVision,
  type VisionAnalysisResult,
} from "./tools/vision-tool";
import { transcribeAudioWithWhisper, isAudioUrl } from "./tools/transcription";

/**
 * Result from the InputAnalyzer
 */
export interface InputAnalyzerResult {
  normalizedContent: string;
  detectedType: string;
  extractedText?: string;
  transcription?: string;
  visionAnalysis?: VisionAnalysisResult;
  confidence: number;
}

/**
 * Run the InputAnalyzer agent
 */
export async function runInputAnalyzer(
  state: PipelineState,
): Promise<InputAnalyzerResult> {
  const { input } = state;
  const config = AGENT_CONFIGS["input-analyzer"];

  console.log(`[InputAnalyzer] Starting analysis...`);
  console.log(`[InputAnalyzer] Input content type: ${input.contentType}`);
  console.log(`[InputAnalyzer] Content length: ${input.content.length} chars`);

  let visionResult: VisionAnalysisResult | undefined;
  let transcriptionText: string | undefined;
  let extractedText: string | undefined;

  // Step 1: Handle special content types (image, audio)
  if (input.contentType === "image" && input.contentUrl) {
    console.log(
      "[InputAnalyzer] Detected image content - running vision analysis",
    );
    try {
      visionResult = await analyzeImageWithVision(input.contentUrl, {
        userId: input.userId,
        context: input.metadata?.caption as string | undefined,
      });
      extractedText = visionResult.extractedText;
    } catch (error) {
      console.error("[InputAnalyzer] Vision analysis failed:", error);
      state.errors.push(
        `Vision analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (input.contentType === "audio" && input.contentUrl) {
    console.log(
      "[InputAnalyzer] Detected audio content - running transcription",
    );
    try {
      const transcription = await transcribeAudioWithWhisper(input.contentUrl, {
        userId: input.userId,
        itemId: input.itemId,
      });
      transcriptionText = transcription.transcript;
    } catch (error) {
      console.error("[InputAnalyzer] Transcription failed:", error);
      state.errors.push(
        `Transcription failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Step 2: Determine content to analyze
  // Priority: transcription > vision description > original content
  const contentToAnalyze =
    transcriptionText || visionResult?.description || input.content;

  // Step 3: Run LLM analysis for type detection and normalization
  console.log("[InputAnalyzer] Running LLM analysis for type detection...");

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const contextInfo = [];
    if (visionResult) {
      contextInfo.push(
        `Image analysis: ${visionResult.title || "Image"} - ${visionResult.description?.slice(0, 200)}`,
      );
      if (visionResult.extractedText) {
        contextInfo.push(
          `Text in image: ${visionResult.extractedText.slice(0, 300)}`,
        );
      }
    }
    if (transcriptionText) {
      contextInfo.push(`This is transcribed audio content.`);
    }
    if (input.contentUrl) {
      contextInfo.push(`Content URL: ${input.contentUrl}`);
    }

    const userPrompt = `Analyze this content:

Content type submitted: ${input.contentType}
Content: ${contentToAnalyze.slice(0, 2000)}

${contextInfo.length > 0 ? `Additional context:\n${contextInfo.join("\n")}` : ""}

Determine the actual content type and normalize it for further processing.`;

    const response = await openai.chat.completions.create({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: INPUT_ANALYZER_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from LLM");
    }

    const llmResult = JSON.parse(responseContent) as InputAnalyzerOutput;

    console.log(`[InputAnalyzer] LLM detected type: ${llmResult.detectedType}`);
    console.log(`[InputAnalyzer] LLM confidence: ${llmResult.confidence}`);

    return {
      normalizedContent: llmResult.normalizedContent || contentToAnalyze,
      detectedType: llmResult.detectedType || input.contentType,
      extractedText,
      transcription: transcriptionText,
      visionAnalysis: visionResult,
      confidence: llmResult.confidence || 0.7,
    };
  } catch (error) {
    console.error("[InputAnalyzer] LLM analysis failed:", error);

    // Return a degraded result based on what we have
    return {
      normalizedContent: contentToAnalyze,
      detectedType: inferTypeFromContent(
        input.contentType,
        contentToAnalyze,
        visionResult,
      ),
      extractedText,
      transcription: transcriptionText,
      visionAnalysis: visionResult,
      confidence: 0.5,
    };
  }
}

/**
 * Infer content type from available information
 * Used as fallback when LLM analysis fails
 */
function inferTypeFromContent(
  originalType: string,
  content: string,
  visionResult?: VisionAnalysisResult,
): string {
  // Use vision result if available
  if (visionResult?.contentType) {
    return visionResult.contentType;
  }

  // Check for URL patterns
  if (content.match(/^https?:\/\//)) {
    const lowerContent = content.toLowerCase();
    if (
      lowerContent.includes("youtube.com") ||
      lowerContent.includes("youtu.be")
    ) {
      return "video";
    }
    if (
      lowerContent.includes("twitter.com") ||
      lowerContent.includes("x.com")
    ) {
      return "tweet";
    }
    if (lowerContent.includes("github.com")) {
      return "repository";
    }
    return "url";
  }

  // Check for common patterns in text
  const lowerContent = content.toLowerCase();
  if (lowerContent.length < 50) {
    // Short text might be a name/title
    if (lowerContent.includes("restaurant") || lowerContent.includes("cafe")) {
      return "restaurant";
    }
    // Could be a simple note
    return "note";
  }

  return originalType || "text";
}

// Re-export tools for direct use
export { analyzeImageWithVision } from "./tools/vision-tool";
export { transcribeAudioWithWhisper, isAudioUrl } from "./tools/transcription";
