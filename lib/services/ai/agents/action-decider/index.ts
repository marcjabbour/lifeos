/**
 * ActionDecider Agent
 *
 * Second stage of the orchestrator pipeline.
 * Classifies intent, decides actions, and enriches with web data.
 *
 * Capabilities:
 * - Intent classification
 * - Category suggestion
 * - URL content fetching
 * - Web search for enrichment
 */

import OpenAI from "openai";
import type { PipelineState } from "../config";
import { AGENT_CONFIGS } from "../config";
import {
  ACTION_DECIDER_SYSTEM_PROMPT,
  type ActionDeciderOutput,
} from "./prompts";
import { fetchUrlContent, type WebFetchResult } from "./tools/web-fetch";
import { searchWeb, type WebSearchResult } from "./tools/web-search";

/**
 * Result from the ActionDecider
 */
export interface ActionDeciderResult {
  intent: string;
  classification: string;
  shouldFetchUrl: boolean;
  shouldWebSearch: boolean;
  suggestedCategory: string;
  suggestedTags: string[];
  webSearchQuery?: string;
  fetchedContent?: WebFetchResult;
  searchResults?: WebSearchResult;
  confidence: number;
}

/**
 * Run the ActionDecider agent
 */
export async function runActionDecider(
  state: PipelineState,
): Promise<ActionDeciderResult> {
  const { input, analyzedContent } = state;
  const config = AGENT_CONFIGS["action-decider"];

  console.log(`[ActionDecider] Starting decision process...`);
  console.log(
    `[ActionDecider] Detected type: ${analyzedContent?.detectedType || "unknown"}`,
  );

  // Get the content to analyze
  const contentForAnalysis =
    analyzedContent?.normalizedContent || input.content;

  // Step 1: Run LLM to decide actions
  console.log("[ActionDecider] Running LLM for intent classification...");

  let decision: ActionDeciderOutput;
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const contextParts = [];
    if (analyzedContent?.visionAnalysis) {
      contextParts.push(
        `Vision analysis: ${analyzedContent.visionAnalysis.title} - ${analyzedContent.visionAnalysis.description?.slice(0, 200)}`,
      );
    }
    if (analyzedContent?.transcription) {
      contextParts.push(`Transcribed audio content`);
    }
    if (input.contentUrl) {
      contextParts.push(`URL: ${input.contentUrl}`);
    }

    const userPrompt = `Analyze this content and decide what actions to take:

Content type detected: ${analyzedContent?.detectedType || input.contentType}
Confidence in detection: ${analyzedContent?.confidence?.toFixed(2) || "unknown"}

Content:
${contentForAnalysis.slice(0, 2000)}

${contextParts.length > 0 ? `Additional context:\n${contextParts.join("\n")}` : ""}

Decide on the intent, category, and whether enrichment would help.`;

    const response = await openai.chat.completions.create({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: ACTION_DECIDER_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from LLM");
    }

    decision = JSON.parse(responseContent) as ActionDeciderOutput;
    console.log(
      `[ActionDecider] LLM decision: ${decision.intent} / ${decision.classification}`,
    );
    console.log(`[ActionDecider] Should fetch URL: ${decision.shouldFetchUrl}`);
    console.log(
      `[ActionDecider] Should web search: ${decision.shouldWebSearch}`,
    );
  } catch (error) {
    console.error("[ActionDecider] LLM decision failed:", error);

    // Default decision
    decision = {
      intent: "save",
      classification: "uncategorized",
      shouldFetchUrl: input.contentType === "url",
      shouldWebSearch: false,
      suggestedTags: [],
      confidence: 0.3,
    };
  }

  // Step 2: Fetch URL content if decided
  let fetchedContent: WebFetchResult | undefined;
  if (decision.shouldFetchUrl && input.contentUrl) {
    console.log("[ActionDecider] Fetching URL content...");
    try {
      fetchedContent = await fetchUrlContent(input.contentUrl, {
        userId: input.userId,
      });
      console.log(
        `[ActionDecider] URL fetch result: ${fetchedContent.title || "no title"}`,
      );
    } catch (error) {
      console.error("[ActionDecider] URL fetch failed:", error);
      state.errors.push(
        `URL fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Step 3: Web search if decided
  let searchResults: WebSearchResult | undefined;
  if (decision.shouldWebSearch && decision.webSearchQuery) {
    console.log(
      `[ActionDecider] Running web search for: ${decision.webSearchQuery}`,
    );
    try {
      searchResults = await searchWeb(
        decision.webSearchQuery,
        decision.classification,
        { userId: input.userId },
      );
      console.log(
        `[ActionDecider] Search result: ${searchResults.name || "no name"}`,
      );
    } catch (error) {
      console.error("[ActionDecider] Web search failed:", error);
      state.errors.push(
        `Web search failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Map classification to category
  const suggestedCategory = mapClassificationToCategory(
    decision.classification,
  );

  return {
    intent: decision.intent,
    classification: decision.classification,
    shouldFetchUrl: decision.shouldFetchUrl,
    shouldWebSearch: decision.shouldWebSearch,
    suggestedCategory,
    suggestedTags: decision.suggestedTags || [],
    webSearchQuery: decision.webSearchQuery,
    fetchedContent,
    searchResults,
    confidence: decision.confidence || 0.5,
  };
}

/**
 * Map decision classification to database category
 */
function mapClassificationToCategory(classification: string): string {
  const categoryMap: Record<string, string> = {
    // Direct mappings
    food: "food",
    tech: "tech",
    music: "music",
    entertainment: "entertainment",
    fitness: "fitness",
    travel: "travel",
    work: "work",
    learning: "learning",
    finance: "finance",
    social: "social",
    uncategorized: "uncategorized",

    // Aliases
    restaurant: "food",
    recipe: "food",
    dining: "food",
    technology: "tech",
    programming: "tech",
    code: "tech",
    movie: "entertainment",
    video: "entertainment",
    game: "entertainment",
    book: "learning",
    article: "learning",
    education: "learning",
    health: "fitness",
    sports: "fitness",
    exercise: "fitness",
    trip: "travel",
    place: "travel",
    destination: "travel",
    professional: "work",
    career: "work",
    money: "finance",
    investment: "finance",
    budget: "finance",
  };

  return categoryMap[classification.toLowerCase()] || "uncategorized";
}

// Re-export tools
export { fetchUrlContent } from "./tools/web-fetch";
export { searchWeb } from "./tools/web-search";
