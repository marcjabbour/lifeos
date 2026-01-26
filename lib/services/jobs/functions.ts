/**
 * Inngest Functions for LifeOS
 *
 * Durable background job functions with step-level persistence
 */

import { inngest, type JobCreatedEvent } from "./inngest";
import { getServiceClient } from "@/lib/core/database";
import {
  perceive,
  type ContentType,
  type PerceiveOutput,
  type AmbiguityInfo,
} from "@/lib/services/ai/nova/perception";
import {
  generateEmbedding,
  extractEmbeddableContent,
} from "@/lib/services/ai/embeddings";
import {
  getTwilioConfig,
  sendWhatsAppMessage,
  formatClarificationRequest,
  type ClarificationOption,
} from "@/lib/services/whatsapp";

interface ItemEnrichment {
  summary: string;
  key_insights: string[];
  topics: string[];
  sentiment?: "positive" | "negative" | "neutral" | "mixed";
  content_type_detected: string;
  confidence: number;
  suggested_actions: string[];
  processed_at: string;
  title?: string;
  author?: string;
  source?: string;
}

/**
 * Process content job
 *
 * This function handles the async processing of shared content:
 * 1. Fetch/process content
 * 2. Enrich with Nova perception (AI analysis)
 * 3. Generate embeddings for semantic search
 * 4. Update item and send notifications
 */
export const processContentJob = inngest.createFunction(
  {
    id: "process-content-job",
    retries: 3,
  },
  { event: "lifeos/job.created" },
  async ({ event, step }) => {
    const { job_id, user_id, item_id, content_type } =
      event.data as JobCreatedEvent["data"];
    const supabase = getServiceClient();

    // Step 1: Update job status to running
    await step.run("update-job-running", async () => {
      await supabase
        .from("jobs")
        .update({
          status: "running",
          started_at: new Date().toISOString(),
          current_step: 1,
        })
        .eq("id", job_id);

      return { status: "running" };
    });

    // Step 2: Fetch item data
    const item = await step.run("fetch-item", async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("id", item_id)
        .single();

      if (error) throw new Error(`Failed to fetch item: ${error.message}`);
      return data;
    });

    // Step 3: Process content with Nova AI perception
    const perception = await step.run("perceive-content", async () => {
      const startTime = Date.now();

      try {
        // Call the actual Nova perception engine
        const perceptionResult = await perceive({
          content: item.content || item.url || "",
          contentType: content_type as ContentType,
          context: item.title ? `Title: ${item.title}` : undefined,
          userId: user_id,
          itemId: item_id,
        });

        const result: PerceiveOutput = perceptionResult.result;
        const duration_ms = Date.now() - startTime;

        // Record step result
        await supabase
          .from("jobs")
          .update({
            current_step: 2,
            step_results: [
              {
                step: 1,
                action: "perceive",
                status: "completed",
                result: {
                  summary: result.summary,
                  contentType: result.contentType,
                  confidence: result.confidence,
                  topics: result.topics,
                },
                duration_ms,
                tokens_used: perceptionResult.usage?.totalTokens || 0,
              },
            ],
          })
          .eq("id", job_id);

        return result;
      } catch (error) {
        console.error("Perception failed:", error);
        // Return a basic fallback if AI fails
        return {
          summary: item.title || `${content_type} content`,
          contentType: content_type,
          confidence: 0.5,
          suggestedActions: ["save"],
          entities: [],
          topics: [],
          metadata: {},
        } as PerceiveOutput;
      }
    });

    // Step 3.5: Check for ambiguity and send clarification if needed
    const needsClarification = await step.run("check-ambiguity", async () => {
      // Check if perception detected ambiguity
      const ambiguity = perception.ambiguity as AmbiguityInfo | undefined;

      // Determine if we need clarification based on:
      // 1. Explicit ambiguity flag with interpretations
      // 2. Low confidence (< 0.5) with "clarify" in suggested actions
      // 3. Very low confidence (< 0.4) for short text content
      const hasExplicitAmbiguity =
        ambiguity?.isAmbiguous &&
        ambiguity.possibleInterpretations &&
        ambiguity.possibleInterpretations.length >= 2;

      const hasLowConfidenceWithClarify =
        (perception.confidence || 1) <= 0.5 &&
        perception.suggestedActions?.includes("clarify");

      const isShortTextWithVeryLowConfidence =
        content_type === "text" &&
        (item.content?.length || 0) < 50 &&
        (perception.confidence || 1) < 0.4;

      const shouldAskForClarification =
        hasExplicitAmbiguity ||
        hasLowConfidenceWithClarify ||
        isShortTextWithVeryLowConfidence;

      if (!shouldAskForClarification) {
        return { needsClarification: false };
      }

      // Only send clarification for WhatsApp items
      if (item.source_type !== "whatsapp") {
        return { needsClarification: false };
      }

      // Look up the WhatsApp user for this item
      const { data: whatsappUser } = await supabase
        .from("whatsapp_users")
        .select("id, phone_number")
        .eq("user_id", user_id)
        .single();

      if (!whatsappUser) {
        console.log("No WhatsApp user found for clarification");
        return { needsClarification: false };
      }

      // Create interpretations - use LLM's if available, otherwise generate defaults
      let interpretations: ClarificationOption[];
      let clarificationReason: string | undefined;

      if (hasExplicitAmbiguity && ambiguity?.possibleInterpretations) {
        interpretations = ambiguity.possibleInterpretations.map((interp) => ({
          type: interp.type,
          label: interp.label,
          confidence: interp.confidence,
        }));
        clarificationReason = ambiguity.reason;
      } else {
        // Generate default interpretations for common ambiguous cases
        const content = item.content || item.title || "";
        interpretations = generateDefaultInterpretations(content);
        clarificationReason = `I'm not confident what "${content}" refers to.`;
      }

      // If we couldn't generate meaningful interpretations, skip clarification
      if (interpretations.length < 2) {
        console.log(
          "Could not generate meaningful interpretations, skipping clarification",
        );
        return { needsClarification: false };
      }

      await supabase.from("pending_clarifications").insert({
        user_id: user_id,
        item_id: item_id,
        whatsapp_user_id: whatsappUser.id,
        original_content: item.content || item.title || "",
        interpretations,
        reason: clarificationReason,
        status: "pending",
      });

      // Send clarification message via WhatsApp
      try {
        const twilioConfig = getTwilioConfig();
        const clarificationMessage = formatClarificationRequest(
          item.content || item.title || "",
          interpretations,
          clarificationReason,
        );

        await sendWhatsAppMessage(twilioConfig, {
          to: whatsappUser.phone_number,
          body: clarificationMessage,
        });

        // Log the outbound message
        await supabase.from("whatsapp_messages").insert({
          whatsapp_user_id: whatsappUser.id,
          message_sid: `clarification-${job_id}`,
          direction: "outbound",
          message_type: "text",
          content: clarificationMessage,
          item_id: item_id,
        });

        console.log(
          `Sent clarification request to ${whatsappUser.phone_number}`,
        );
        return { needsClarification: true, clarificationSent: true };
      } catch (error) {
        console.error("Failed to send clarification message:", error);
        // Continue without clarification if sending fails
        return { needsClarification: false };
      }
    });

    // If clarification is needed, pause the job and wait for user response
    if (needsClarification.needsClarification) {
      await step.run("mark-awaiting-clarification", async () => {
        await supabase
          .from("jobs")
          .update({
            status: "completed",
            result: {
              awaiting_clarification: true,
              perception: {
                summary: perception.summary,
                contentType: perception.contentType,
                confidence: perception.confidence,
                ambiguity: perception.ambiguity,
              },
            },
            completed_at: new Date().toISOString(),
          })
          .eq("id", job_id);

        return { status: "awaiting_clarification" };
      });

      return {
        job_id,
        item_id,
        status: "awaiting_clarification",
        message:
          "Clarification request sent to user. Item will be updated when user responds.",
      };
    }

    // Step 4: Generate enrichment from perception
    const enrichment = await step.run("generate-enrichment", async () => {
      const result: ItemEnrichment = {
        summary: perception.summary || item.title || "No summary available",
        key_insights: extractKeyInsights(perception),
        topics: perception.topics || [],
        sentiment: perception.sentiment,
        content_type_detected: perception.contentType || content_type,
        confidence: perception.confidence || 0.5,
        suggested_actions: perception.suggestedActions || ["save"],
        processed_at: new Date().toISOString(),
        title: perception.title,
        author: perception.author,
        source: perception.source,
      };

      return result;
    });

    // Step 5: Update item with enrichment
    await step.run("update-item-enrichment", async () => {
      // Also update category if we have a good confidence and detected type
      const updates: Record<string, unknown> = {
        enrichment,
        has_enrichment: true,
        updated_at: new Date().toISOString(),
      };

      // Auto-categorize based on content type detection
      if (perception.confidence && perception.confidence > 0.7) {
        const category = mapContentTypeToCategory(
          perception.contentType || content_type,
        );
        if (category && item.category === "uncategorized") {
          updates.category = category;
        }
      }

      // Add suggested tags if we don't have any
      if (
        enrichment.topics.length > 0 &&
        (!item.tags || item.tags.length === 0)
      ) {
        updates.tags = enrichment.topics.slice(0, 5); // Max 5 tags
      }

      await supabase.from("items").update(updates).eq("id", item_id);

      return { updated: true };
    });

    // Step 6: Generate and store embedding
    const embeddingResult = await step.run("generate-embedding", async () => {
      try {
        // Prepare content for embedding
        const embeddableContent = extractEmbeddableContent("item", {
          title: item.title || enrichment.summary,
          description: enrichment.summary,
          extractedText: item.content,
        });

        if (!embeddableContent || embeddableContent.trim().length < 10) {
          return {
            embedding_generated: false,
            reason: "Content too short for embedding",
          };
        }

        // Generate embedding
        const embeddings = await generateEmbedding({
          content: embeddableContent,
          sourceType: "item",
          sourceId: item_id,
          userId: user_id,
          metadata: {
            title: item.title,
            contentType: content_type,
            category: item.category,
          },
        });

        // Store embeddings in the database
        if (embeddings.length > 0) {
          const embeddingRecords = embeddings.map((emb) => ({
            user_id: user_id,
            source_type: emb.sourceType,
            source_id: emb.sourceId,
            content: emb.content,
            content_hash: emb.contentHash,
            embedding: emb.embedding,
            metadata: emb.metadata,
            chunk_index: emb.chunkIndex,
            total_chunks: emb.totalChunks,
          }));

          const { error } = await supabase
            .from("embeddings")
            .upsert(embeddingRecords, {
              onConflict: "content_hash",
              ignoreDuplicates: true,
            });

          if (error) {
            console.error("Failed to store embeddings:", error);
            return {
              embedding_generated: true,
              stored: false,
              error: error.message,
            };
          }

          return {
            embedding_generated: true,
            stored: true,
            count: embeddings.length,
          };
        }

        return {
          embedding_generated: false,
          reason: "No embeddings generated",
        };
      } catch (error) {
        console.error("Embedding generation failed:", error);
        return {
          embedding_generated: false,
          reason:
            error instanceof Error
              ? error.message
              : "Embedding generation failed",
        };
      }
    });

    // Step 7: Complete job
    const finalResult = await step.run("complete-job", async () => {
      const result = {
        perception: {
          summary: perception.summary,
          contentType: perception.contentType,
          confidence: perception.confidence,
          topics: perception.topics,
        },
        enrichment,
        embedding: embeddingResult,
        completed_at: new Date().toISOString(),
      };

      await supabase
        .from("jobs")
        .update({
          status: "completed",
          result,
          completed_at: new Date().toISOString(),
          current_step: 6,
          step_results: [
            { step: 1, action: "perceive", status: "completed" },
            { step: 2, action: "enrich", status: "completed" },
            { step: 3, action: "update_item", status: "completed" },
            {
              step: 4,
              action: "generate_embedding",
              status: embeddingResult.embedding_generated
                ? "completed"
                : "skipped",
            },
            { step: 5, action: "complete", status: "completed" },
          ],
        })
        .eq("id", job_id);

      return result;
    });

    // Step 8: Send push notification (if subscriptions exist)
    await step.run("send-notification", async () => {
      // Check if user has push subscriptions
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", user_id)
        .limit(1);

      if (!subscriptions || subscriptions.length === 0) {
        return { notification_sent: false, reason: "No push subscriptions" };
      }

      // TODO: Implement actual push notification sending
      console.log(`Job ${job_id} completed for user ${user_id}`);
      return {
        notification_sent: false,
        reason: "Push sending not implemented",
      };
    });

    return {
      job_id,
      item_id,
      status: "completed",
      result: finalResult,
    };
  },
);

/**
 * Extract key insights from perception result
 */
function extractKeyInsights(perception: PerceiveOutput): string[] {
  const insights: string[] = [];

  // Add content type insight
  if (perception.contentType) {
    insights.push(`Content type: ${perception.contentType}`);
  }

  // Add sentiment if available
  if (perception.sentiment && perception.sentiment !== "neutral") {
    insights.push(`Sentiment: ${perception.sentiment}`);
  }

  // Add time sensitivity
  if (perception.isTimeSensitive) {
    insights.push("This content may be time-sensitive");
  }

  // Add source/author info
  if (perception.author) {
    insights.push(`Author: ${perception.author}`);
  }

  // Extract from entities if available
  if (perception.entities && perception.entities.length > 0) {
    insights.push(
      `Key entities: ${perception.entities.slice(0, 3).join(", ")}`,
    );
  }

  return insights;
}

/**
 * Generate default interpretations for ambiguous short text
 *
 * Used when the LLM detects ambiguity but doesn't provide explicit interpretations
 */
function generateDefaultInterpretations(
  content: string,
): ClarificationOption[] {
  const lowerContent = content.toLowerCase().trim();
  const interpretations: ClarificationOption[] = [];

  // Common patterns for short ambiguous text
  // Check for potential restaurant/place names
  if (lowerContent.length < 50) {
    // Could be a place/restaurant
    interpretations.push({
      type: "restaurant",
      label: `Restaurant - "${content}"`,
      confidence: 0.3,
    });

    // Could be a brand/company
    interpretations.push({
      type: "product",
      label: `Brand/Company - "${content}"`,
      confidence: 0.3,
    });

    // Could be a book/movie/show
    interpretations.push({
      type: "book",
      label: `Book/Movie/Show - "${content}"`,
      confidence: 0.2,
    });

    // Could be just a note to remember
    interpretations.push({
      type: "note",
      label: `Note - just remember "${content}"`,
      confidence: 0.2,
    });
  }

  return interpretations;
}

/**
 * Map detected content type to item category
 */
function mapContentTypeToCategory(contentType: string): string | null {
  const categoryMap: Record<string, string> = {
    article: "reading",
    blog: "reading",
    news: "reading",
    video: "video",
    youtube: "video",
    tweet: "social",
    social: "social",
    repository: "development",
    code: "development",
    research: "reading",
    paper: "reading",
    recipe: "food",
    product: "shopping",
    podcast: "audio",
    music: "audio",
    // New content types
    restaurant: "food",
    place: "places",
    book: "reading",
    movie: "entertainment",
    reminder: "tasks",
    note: "notes",
  };

  const normalizedType = contentType.toLowerCase();
  return categoryMap[normalizedType] || null;
}

/**
 * Handle job failure
 *
 * Updates job status and optionally notifies user
 */
export const handleJobFailure = inngest.createFunction(
  {
    id: "handle-job-failure",
  },
  { event: "lifeos/job.failed" },
  async ({ event, step }) => {
    const { job_id, user_id, error } = event.data;
    const supabase = getServiceClient();

    await step.run("update-job-failed", async () => {
      await supabase
        .from("jobs")
        .update({
          status: "failed",
          error_message: error,
          completed_at: new Date().toISOString(),
        })
        .eq("id", job_id);

      return { updated: true };
    });

    // TODO: Send failure notification to user
    console.error(`Job ${job_id} failed for user ${user_id}: ${error}`);

    return { job_id, status: "failed", error };
  },
);

// Export all functions for registration
export const functions = [processContentJob, handleJobFailure];
