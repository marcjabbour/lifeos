/**
 * ActionExecutor Agent
 *
 * Final stage of the orchestrator pipeline.
 * Creates items, generates embeddings, and formats output.
 *
 * Capabilities:
 * - Item creation/update in database
 * - Embedding generation for semantic search
 * - Final content formatting
 */

import OpenAI from "openai";
import type { PipelineState } from "../config";
import { AGENT_CONFIGS } from "../config";
import {
  ACTION_EXECUTOR_SYSTEM_PROMPT,
  type ActionExecutorOutput,
} from "./prompts";
import { createOrUpdateItem } from "./tools/item-creator";
import { generateAndStoreEmbedding } from "./tools/embedding";

/**
 * Result from the ActionExecutor
 */
export interface ActionExecutorResult {
  itemCreated: boolean;
  itemId?: string;
  embeddingGenerated: boolean;
  embeddingId?: string;
  finalTitle: string;
  finalSummary: string;
  finalCategory: string;
  finalTags: string[];
}

/**
 * Run the ActionExecutor agent
 */
export async function runActionExecutor(
  state: PipelineState,
): Promise<ActionExecutorResult> {
  const { input, analyzedContent, decision } = state;
  const config = AGENT_CONFIGS["action-executor"];

  console.log(`[ActionExecutor] Starting execution...`);
  console.log(`[ActionExecutor] Item ID: ${input.itemId || "new item"}`);

  // Step 1: Run LLM to generate final output
  console.log("[ActionExecutor] Running LLM for final formatting...");

  let llmOutput: ActionExecutorOutput;
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build context from previous stages
    const contextParts = [];

    if (analyzedContent) {
      contextParts.push(
        `Detected content type: ${analyzedContent.detectedType}`,
      );
      contextParts.push(
        `Analysis confidence: ${analyzedContent.confidence?.toFixed(2)}`,
      );
      if (analyzedContent.visionAnalysis) {
        contextParts.push(
          `Vision analysis: ${analyzedContent.visionAnalysis.title} - ${analyzedContent.visionAnalysis.description?.slice(0, 200)}`,
        );
      }
      if (analyzedContent.transcription) {
        contextParts.push(
          `Transcription: ${analyzedContent.transcription.slice(0, 200)}...`,
        );
      }
    }

    if (decision) {
      contextParts.push(`Intent: ${decision.intent}`);
      contextParts.push(`Suggested category: ${decision.suggestedCategory}`);
      contextParts.push(
        `Suggested tags: ${decision.suggestedTags?.join(", ") || "none"}`,
      );
      if (decision.fetchedContent) {
        contextParts.push(
          `Fetched URL: ${decision.fetchedContent.title} - ${decision.fetchedContent.description?.slice(0, 100)}`,
        );
      }
      if (decision.searchResults) {
        contextParts.push(
          `Search results: ${decision.searchResults.name} - ${decision.searchResults.description?.slice(0, 100)}`,
        );
      }
    }

    const content =
      analyzedContent?.normalizedContent ||
      decision?.fetchedContent?.description ||
      input.content;

    const userPrompt = `Finalize the processing for this content:

Original content:
${content.slice(0, 1500)}

Context from analysis:
${contextParts.join("\n")}

Generate a final title, summary, category, and tags for this item.`;

    const response = await openai.chat.completions.create({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: ACTION_EXECUTOR_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from LLM");
    }

    llmOutput = JSON.parse(responseContent) as ActionExecutorOutput;
    console.log(`[ActionExecutor] LLM output: ${llmOutput.title}`);
  } catch (error) {
    console.error("[ActionExecutor] LLM formatting failed:", error);

    // Generate fallback output
    llmOutput = {
      title:
        analyzedContent?.visionAnalysis?.title ||
        decision?.fetchedContent?.title ||
        input.content.slice(0, 100),
      summary:
        analyzedContent?.normalizedContent ||
        decision?.fetchedContent?.description ||
        input.content.slice(0, 200),
      category: decision?.suggestedCategory || "uncategorized",
      tags: decision?.suggestedTags || [],
      confidence: 0.3,
    };
  }

  // Step 2: Create or update the item
  let itemCreated = false;
  let itemId = input.itemId;

  console.log("[ActionExecutor] Creating/updating item in database...");
  try {
    const result = await createOrUpdateItem({
      userId: input.userId,
      existingItemId: input.itemId,
      title: llmOutput.title,
      content: analyzedContent?.normalizedContent || input.content,
      url: input.contentUrl,
      category: llmOutput.category,
      tags: llmOutput.tags,
      contentType: analyzedContent?.detectedType || input.contentType,
      enrichment: {
        summary: llmOutput.summary,
        insights: llmOutput.insights,
        topics: llmOutput.tags,
        confidence: llmOutput.confidence,
        processedAt: new Date().toISOString(),
      },
      metadata: {
        ...input.metadata,
        analyzedContentType: analyzedContent?.detectedType,
        visionAnalysis: analyzedContent?.visionAnalysis ? true : undefined,
        transcription: analyzedContent?.transcription ? true : undefined,
      },
    });

    itemCreated = result.success;
    if (result.itemId) {
      itemId = result.itemId;
    }

    if (!result.success) {
      state.errors.push(`Item creation failed: ${result.error}`);
    }
  } catch (error) {
    console.error("[ActionExecutor] Item creation failed:", error);
    state.errors.push(
      `Item creation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Step 3: Generate embedding
  let embeddingGenerated = false;

  if (itemId) {
    console.log("[ActionExecutor] Generating embedding...");
    try {
      const result = await generateAndStoreEmbedding({
        userId: input.userId,
        itemId,
        title: llmOutput.title,
        content: analyzedContent?.normalizedContent || input.content,
        summary: llmOutput.summary,
        category: llmOutput.category,
        contentType: analyzedContent?.detectedType || input.contentType,
      });

      embeddingGenerated = result.success && (result.embeddingCount || 0) > 0;

      if (!result.success) {
        state.errors.push(`Embedding generation failed: ${result.error}`);
      }
    } catch (error) {
      console.error("[ActionExecutor] Embedding generation failed:", error);
      state.errors.push(
        `Embedding failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  console.log(`[ActionExecutor] Execution complete`);
  console.log(
    `[ActionExecutor] Item: ${itemId || "none"} (created: ${itemCreated})`,
  );
  console.log(`[ActionExecutor] Embedding: ${embeddingGenerated}`);

  return {
    itemCreated,
    itemId,
    embeddingGenerated,
    finalTitle: llmOutput.title,
    finalSummary: llmOutput.summary,
    finalCategory: llmOutput.category,
    finalTags: llmOutput.tags,
  };
}

// Re-export tools
export { createOrUpdateItem } from "./tools/item-creator";
export { generateAndStoreEmbedding } from "./tools/embedding";
