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
import {
  transcribeAudio,
  type TranscriptionResult,
} from "@/lib/services/ai/audio";
import {
  trackEnrichment,
  trackImageAnalysis,
  trackCategorization,
} from "@/lib/services/ai/nova/activity";
import {
  createTrace,
  flushLangfuse,
} from "@/lib/services/ai/observability/langfuse";
import {
  runOrchestratorPipeline,
  isOrchestratorEnabled,
  shouldUseOrchestrator,
  type OrchestratorInput,
  type ContentType as OrchestratorContentType,
} from "@/lib/services/ai/agents";

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

    // Check if this item was already enriched (from WhatsApp unified processing)
    const jobData = await step.run("check-skip-enrichment", async () => {
      const { data: job } = await supabase
        .from("jobs")
        .select("result")
        .eq("id", job_id)
        .single();
      return job;
    });

    const skipEnrichment =
      (jobData?.result as { skip_enrichment?: boolean })?.skip_enrichment ===
      true;

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

    // FAST PATH: If enrichment was already done (from WhatsApp unified processing),
    // skip straight to embedding generation
    if (skipEnrichment) {
      console.log(
        `[Job ${job_id}] Skipping enrichment - item already enriched`,
      );

      // Generate embeddings for the pre-enriched item
      const embeddingResult = await step.run(
        "generate-embedding-fast",
        async () => {
          try {
            const embeddableContent = extractEmbeddableContent("item", {
              title: item.title || "",
              description:
                item.content ||
                (item.enrichment as { summary?: string })?.summary ||
                "",
              extractedText: item.content,
            });

            if (!embeddableContent || embeddableContent.trim().length < 10) {
              return {
                embedding_generated: false,
                reason: "Content too short for embedding",
              };
            }

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
        },
      );

      // Complete job
      await step.run("complete-job-fast", async () => {
        await supabase
          .from("jobs")
          .update({
            status: "completed",
            result: {
              skip_enrichment: true,
              embedding: embeddingResult,
              completed_at: new Date().toISOString(),
            },
            completed_at: new Date().toISOString(),
            current_step: 2,
            step_results: [
              {
                step: 1,
                action: "skip_enrichment",
                status: "skipped",
                reason: "Item pre-enriched",
              },
              {
                step: 2,
                action: "generate_embedding",
                status: embeddingResult.embedding_generated
                  ? "completed"
                  : "skipped",
              },
            ],
          })
          .eq("id", job_id);
      });

      return {
        job_id,
        item_id,
        status: "completed",
        fast_path: true,
        embedding: embeddingResult,
      };
    }

    // STANDARD PATH: Full enrichment pipeline for items that need it

    // Step 2.5: Analyze image content if this is an image
    const imageAnalysis = await step.run("analyze-image", async () => {
      console.log(
        `[ImageAnalysis] Step started - content_type: "${content_type}", item_id: ${item_id}`,
      );

      if (content_type !== "image") {
        console.log(
          `[ImageAnalysis] Skipping - content_type is "${content_type}", not "image"`,
        );
        return null;
      }

      const imageUrl = item.url;
      console.log(
        `[ImageAnalysis] Image URL from item: ${imageUrl ? imageUrl.slice(0, 100) + "..." : "NONE"}`,
      );

      if (!imageUrl) {
        console.log("[ImageAnalysis] No image URL found in item - skipping");
        return null;
      }

      try {
        console.log(
          `[ImageAnalysis] Calling analyzeImage() with URL: ${imageUrl.slice(0, 100)}...`,
        );
        const analysis = await analyzeImage(imageUrl, user_id);

        if (analysis) {
          console.log(
            `[ImageAnalysis] SUCCESS - Title: "${analysis.title}", Description: ${analysis.description?.slice(0, 100)}...`,
          );
          console.log(
            `[ImageAnalysis] Extracted text: ${analysis.extractedText?.slice(0, 100) || "None"}`,
          );
          console.log(
            `[ImageAnalysis] Topics: ${analysis.topics?.join(", ") || "None"}`,
          );
          console.log(
            `[ImageAnalysis] Content type detected: ${analysis.contentType || "Unknown"}`,
          );
        } else {
          console.log("[ImageAnalysis] analyzeImage() returned null");
        }

        return analysis;
      } catch (error) {
        console.error("[ImageAnalysis] FAILED with error:", error);
        console.error(
          "[ImageAnalysis] Error details:",
          error instanceof Error ? error.message : String(error),
        );
        return null;
      }
    });

    // Step 2.6: Transcribe audio content if this is audio
    const audioTranscription = await step.run(
      "transcribe-audio",
      async (): Promise<TranscriptionResult | null> => {
        if (content_type !== "audio") {
          return null;
        }

        const audioUrl = item.url;
        if (!audioUrl) {
          console.log("[AudioTranscription] No audio URL found for item");
          return null;
        }

        try {
          console.log(
            `[AudioTranscription] Starting transcription for: ${audioUrl.slice(0, 100)}...`,
          );

          const transcription = await transcribeAudio(audioUrl, {
            userId: user_id,
            itemId: item_id,
          });

          console.log(
            `[AudioTranscription] Success: ${transcription.transcript.length} chars, ` +
              `${transcription.duration?.toFixed(1) || "?"}s, lang=${transcription.language}`,
          );

          // Update item with transcription immediately
          await supabase
            .from("items")
            .update({
              content: transcription.transcript,
              metadata: {
                ...((item.metadata as Record<string, unknown>) || {}),
                audio_duration: transcription.duration,
                audio_language: transcription.language,
                transcribed_at: new Date().toISOString(),
              },
            })
            .eq("id", item_id);

          return transcription;
        } catch (error) {
          console.error("[AudioTranscription] Failed:", error);
          // Return null but don't fail the job - we can still process without transcription
          return null;
        }
      },
    );

    // Step 3: Process content with Nova AI perception
    const perception = await step.run("perceive-content", async () => {
      const startTime = Date.now();

      try {
        // For images, use the image analysis as content for perception
        // For audio, use the transcription as content for perception
        let contentForPerception = item.content || item.url || "";
        let contextForPerception = item.title
          ? `Title: ${item.title}`
          : undefined;

        if (content_type === "image" && imageAnalysis) {
          // Use the image analysis as the content to perceive
          contentForPerception = imageAnalysis.description || "";
          contextForPerception = `This is an image analysis. Caption: ${item.metadata?.caption || "None"}. OCR Text: ${imageAnalysis.extractedText || "None"}`;
        } else if (content_type === "audio" && audioTranscription) {
          // Use the audio transcription as the content to perceive
          contentForPerception = audioTranscription.transcript;
          const duration = audioTranscription.duration
            ? `${audioTranscription.duration.toFixed(1)}s`
            : "unknown";
          const language = audioTranscription.language || "unknown";
          contextForPerception = `This is a transcribed voice message. Duration: ${duration}. Language: ${language}.`;
        }

        // Call the actual Nova perception engine
        const perceptionResult = await perceive({
          content: contentForPerception,
          contentType:
            content_type === "image" ? "text" : (content_type as ContentType),
          context: contextForPerception,
          userId: user_id,
          itemId: item_id,
        });

        const result: PerceiveOutput = perceptionResult.result;
        const duration_ms = Date.now() - startTime;

        // If we have image analysis, merge its data into the perception result
        if (imageAnalysis) {
          result.title = imageAnalysis.title || result.title;
          if (imageAnalysis.topics) {
            result.topics = [...(result.topics || []), ...imageAnalysis.topics];
          }
        }

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
        // Use transcription or image analysis if available
        const fallbackSummary =
          audioTranscription?.transcript ||
          imageAnalysis?.description ||
          item.title ||
          `${content_type} content`;
        const fallbackTitle =
          content_type === "audio"
            ? `Voice Message${audioTranscription?.duration ? ` (${Math.round(audioTranscription.duration)}s)` : ""}`
            : imageAnalysis?.title;
        return {
          summary: fallbackSummary,
          contentType: content_type,
          confidence: 0.5,
          suggestedActions: ["save"],
          entities: [],
          topics: [],
          metadata: {},
          title: fallbackTitle,
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

    // Step 4: Web search enrichment (for places, restaurants, etc.)
    const webEnrichment = await step.run("web-search-enrichment", async () => {
      // Only do web search for certain content types that benefit from it
      const searchableTypes = [
        "restaurant",
        "place",
        "product",
        "book",
        "movie",
      ];
      const detectedType = (
        perception.contentType || content_type
      ).toLowerCase();

      if (
        !searchableTypes.includes(detectedType) ||
        !perception.suggestedActions?.includes("web_search")
      ) {
        return null;
      }

      try {
        // Use the original content or perception title for search
        const searchQuery =
          perception.title || item.content || item.title || "";
        if (!searchQuery || searchQuery.length < 3) {
          return null;
        }

        // Call web search via OpenAI with web browsing or use a search API
        const searchResult = await performWebSearch(
          searchQuery,
          detectedType,
          user_id,
        );
        return searchResult;
      } catch (error) {
        console.error("Web search enrichment failed:", error);
        return null;
      }
    });

    // Step 5: Generate enrichment from perception + web search
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

      // Merge web enrichment if available
      if (webEnrichment) {
        result.summary = webEnrichment.description || result.summary;
        result.key_insights = [
          ...result.key_insights,
          ...(webEnrichment.details || []),
        ];
        if (webEnrichment.address) {
          result.key_insights.push(`Address: ${webEnrichment.address}`);
        }
        if (webEnrichment.website) {
          result.key_insights.push(`Website: ${webEnrichment.website}`);
        }
        // Store web enrichment data
        (
          result as ItemEnrichment & { web_enrichment?: WebEnrichmentResult }
        ).web_enrichment = webEnrichment;
      }

      return result;
    });

    // Step 6: Update item with enrichment
    await step.run("update-item-enrichment", async () => {
      // Also update category if we have a good confidence and detected type
      const updates: Record<string, unknown> = {
        enrichment,
        has_enrichment: true,
        updated_at: new Date().toISOString(),
      };

      // Update title from perception if we have a better one
      // Only update if perception provided a title and confidence is decent
      if (
        enrichment.title &&
        perception.confidence &&
        perception.confidence > 0.6
      ) {
        // Don't overwrite if the current title looks intentional (not auto-generated)
        const isAutoGeneratedTitle =
          item.title === item.content?.slice(0, 50) ||
          item.title?.startsWith("Screenshot from") ||
          item.title === "Shared URL" ||
          item.title === "Shared Image" ||
          item.title === "Shared Content";

        if (isAutoGeneratedTitle || !item.title) {
          updates.title = enrichment.title;
        }
      }

      // Also update description from web enrichment if available
      if (webEnrichment?.description) {
        updates.content = webEnrichment.description;
      }

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

      return { updated: true, category: updates.category, tags: updates.tags };
    });

    // Step 6.5: Track Nova activity for the enrichment
    await step.run("track-nova-activity", async () => {
      try {
        // Track the main enrichment activity
        await trackEnrichment({
          userId: user_id,
          itemId: item_id,
          title: enrichment.title || item.title,
          contentType: enrichment.content_type_detected || content_type,
          summary: enrichment.summary,
          topics: enrichment.topics,
        });

        // If we analyzed an image, also track that
        if (content_type === "image" && imageAnalysis) {
          await trackImageAnalysis({
            userId: user_id,
            itemId: item_id,
            title: imageAnalysis.title || "Image",
            description: imageAnalysis.description,
          });
        }

        // If we auto-categorized, track that too
        if (
          perception.confidence &&
          perception.confidence > 0.7 &&
          item.category === "uncategorized"
        ) {
          const newCategory = mapContentTypeToCategory(
            perception.contentType || content_type,
          );
          if (newCategory) {
            await trackCategorization({
              userId: user_id,
              itemId: item_id,
              title: enrichment.title || item.title,
              category: newCategory,
              tags: enrichment.topics?.slice(0, 5),
            });
          }
        }

        return { tracked: true };
      } catch (error) {
        // Don't fail the job if activity tracking fails
        console.error("Failed to track Nova activity:", error);
        return { tracked: false, error: String(error) };
      }
    });

    // Step 7: Generate and store embedding
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

    // Step 8: Complete job
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
          current_step: 7,
          step_results: [
            { step: 1, action: "perceive", status: "completed" },
            { step: 2, action: "enrich", status: "completed" },
            { step: 3, action: "update_item", status: "completed" },
            { step: 4, action: "track_activity", status: "completed" },
            {
              step: 5,
              action: "generate_embedding",
              status: embeddingResult.embedding_generated
                ? "completed"
                : "skipped",
            },
            { step: 6, action: "complete", status: "completed" },
          ],
        })
        .eq("id", job_id);

      return result;
    });

    // Step 9: Send push notification (if subscriptions exist)
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
 * Web enrichment result from search
 */
interface WebEnrichmentResult {
  name?: string;
  description?: string;
  address?: string;
  website?: string;
  phone?: string;
  rating?: number;
  priceRange?: string;
  cuisine?: string;
  details?: string[];
  source?: string;
}

/**
 * Perform web search to get additional info about content
 */
async function performWebSearch(
  query: string,
  contentType: string,
  userId?: string,
): Promise<WebEnrichmentResult | null> {
  try {
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build a search-optimized prompt based on content type
    let searchPrompt: string;
    switch (contentType) {
      case "restaurant":
        searchPrompt = `Search for information about the restaurant "${query}".
Return a JSON object with:
{
  "name": "Official restaurant name",
  "description": "Brief description of the restaurant, cuisine type, atmosphere",
  "address": "Full address if found",
  "website": "Official website URL",
  "phone": "Phone number",
  "rating": "Average rating if available (number)",
  "priceRange": "$ to $$$$ or similar",
  "cuisine": "Type of cuisine",
  "details": ["Notable dishes", "Opening hours", "Reservations info", "etc"]
}
Only include fields you can find reliable information for.`;
        break;
      case "place":
        searchPrompt = `Search for information about "${query}" as a place/location.
Return a JSON object with:
{
  "name": "Official name",
  "description": "What this place is and why people visit",
  "address": "Full address",
  "website": "Official website URL",
  "details": ["Key attractions", "Hours", "Tips", "etc"]
}`;
        break;
      case "book":
        searchPrompt = `Search for information about the book "${query}".
Return a JSON object with:
{
  "name": "Full book title",
  "description": "Synopsis/summary without spoilers",
  "details": ["Author", "Publication year", "Genre", "Page count", "Awards if any"]
}`;
        break;
      case "movie":
        searchPrompt = `Search for information about the movie "${query}".
Return a JSON object with:
{
  "name": "Full movie title",
  "description": "Plot synopsis without major spoilers",
  "rating": "IMDB or Rotten Tomatoes rating",
  "details": ["Director", "Main cast", "Release year", "Runtime", "Genre"]
}`;
        break;
      case "product":
        searchPrompt = `Search for information about "${query}" as a product or brand.
Return a JSON object with:
{
  "name": "Official product/brand name",
  "description": "What it is and key features",
  "website": "Official website",
  "priceRange": "Approximate price range if applicable",
  "details": ["Key features", "Pros", "Common uses"]
}`;
        break;
      default:
        return null;
    }

    // Use GPT-4o with web search capability via function calling
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that searches for information and returns structured JSON data.
Be accurate and only include information you're confident about.
If you can't find reliable information, return an empty object {}.
Use your knowledge to provide useful, accurate information.`,
        },
        {
          role: "user",
          content: searchPrompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return null;
    }

    const result = JSON.parse(content) as WebEnrichmentResult;

    // Add source attribution
    result.source = "AI knowledge";

    console.log(`[WebSearch] Enriched "${query}" with:`, result);
    return result;
  } catch (error) {
    console.error("[WebSearch] Failed:", error);
    return null;
  }
}

/**
 * Image analysis result
 */
interface ImageAnalysisResult {
  title?: string;
  description: string;
  extractedText?: string;
  topics?: string[];
  contentType?: string;
  entities?: string[];
}

/**
 * Analyze an image using GPT-4o Vision
 */
async function analyzeImage(
  imageUrl: string,
  userId?: string,
): Promise<ImageAnalysisResult | null> {
  const startTime = Date.now();
  console.log(`[ImageAnalysis:analyzeImage] === START ===`);
  console.log(`[ImageAnalysis:analyzeImage] Image URL: ${imageUrl}`);
  console.log(
    `[ImageAnalysis:analyzeImage] User ID: ${userId || "not provided"}`,
  );

  // Create Langfuse trace for observability
  const trace = createTrace("image_analysis", {
    userId,
    requestType: "perception",
    model: "gpt-4o",
  });
  const span = trace.span("analyze_image_vision");

  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error(
        "[ImageAnalysis:analyzeImage] ERROR: OPENAI_API_KEY is not set!",
      );
      span.error(new Error("OPENAI_API_KEY not configured"));
      await flushLangfuse();
      return null;
    }
    console.log(
      `[ImageAnalysis:analyzeImage] OpenAI API key is configured (length: ${process.env.OPENAI_API_KEY.length})`,
    );

    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log(
      "[ImageAnalysis:analyzeImage] OpenAI client created successfully",
    );

    console.log("[ImageAnalysis:analyzeImage] Calling GPT-4o Vision API...");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1000,
      messages: [
        {
          role: "system",
          content: `You are an image analysis assistant. Analyze the image and extract useful information.

Return a JSON object with:
{
  "title": "A short, descriptive title for this image (e.g., 'Restaurant Menu - Italian Cuisine' or 'Screenshot of Concert Tickets')",
  "description": "A detailed description of what's in the image and why someone might have saved it",
  "extractedText": "Any text visible in the image (OCR). Include all readable text.",
  "topics": ["relevant", "topics", "for", "categorization"],
  "contentType": "screenshot" | "photo" | "document" | "menu" | "receipt" | "ticket" | "map" | "product" | "meme" | "other",
  "entities": ["Named entities mentioned or shown", "Restaurant names", "Product names", "etc"]
}

Be specific and helpful. If this looks like a screenshot of something the user wants to remember (restaurant, event, product, etc.), extract all relevant details.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this image and extract all useful information:",
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    const apiDuration = Date.now() - startTime;
    console.log(
      `[ImageAnalysis:analyzeImage] GPT-4o Vision API call completed in ${apiDuration}ms`,
    );
    console.log(
      `[ImageAnalysis:analyzeImage] Response choices: ${response.choices?.length || 0}`,
    );
    console.log(
      `[ImageAnalysis:analyzeImage] Usage: ${JSON.stringify(response.usage || {})}`,
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error(
        "[ImageAnalysis:analyzeImage] ERROR: No content in response",
      );
      console.error(
        `[ImageAnalysis:analyzeImage] Full response: ${JSON.stringify(response.choices[0])}`,
      );
      return null;
    }

    console.log(
      `[ImageAnalysis:analyzeImage] Raw response content (first 500 chars): ${content.slice(0, 500)}`,
    );
    console.log(
      `[ImageAnalysis:analyzeImage] Response content length: ${content.length} chars`,
    );

    // Parse the JSON response
    try {
      // Handle cases where the response might have markdown code blocks
      let jsonContent = content;
      if (content.includes("```json")) {
        console.log(
          "[ImageAnalysis:analyzeImage] Detected ```json code block, stripping...",
        );
        jsonContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      } else if (content.includes("```")) {
        console.log(
          "[ImageAnalysis:analyzeImage] Detected ``` code block, stripping...",
        );
        jsonContent = content.replace(/```\n?/g, "");
      }

      console.log(
        `[ImageAnalysis:analyzeImage] Attempting to parse JSON: ${jsonContent.slice(0, 200)}...`,
      );
      const result = JSON.parse(jsonContent.trim()) as ImageAnalysisResult;

      const totalDuration = Date.now() - startTime;
      console.log(
        `[ImageAnalysis:analyzeImage] === SUCCESS === (total: ${totalDuration}ms)`,
      );
      console.log(
        `[ImageAnalysis:analyzeImage] Result title: "${result.title}"`,
      );
      console.log(
        `[ImageAnalysis:analyzeImage] Result description: ${result.description?.slice(0, 100)}...`,
      );
      console.log(
        `[ImageAnalysis:analyzeImage] Extracted text: ${result.extractedText ? "Yes (" + result.extractedText.length + " chars)" : "No"}`,
      );
      console.log(
        `[ImageAnalysis:analyzeImage] Topics: ${result.topics?.join(", ") || "None"}`,
      );
      console.log(
        `[ImageAnalysis:analyzeImage] Content type: ${result.contentType || "Not specified"}`,
      );
      console.log(
        `[ImageAnalysis:analyzeImage] Entities: ${result.entities?.join(", ") || "None"}`,
      );

      // Track success in Langfuse
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
    } catch (parseError) {
      console.error(
        "[ImageAnalysis:analyzeImage] JSON parse FAILED:",
        parseError,
      );
      console.error(
        `[ImageAnalysis:analyzeImage] Content that failed to parse: ${content}`,
      );
      // Return a basic result with the raw description
      console.log(
        "[ImageAnalysis:analyzeImage] Returning fallback result with raw description",
      );

      // Track partial success (parsed failed but got response)
      const fallbackResult = {
        description: content,
        title: "Analyzed Image",
      };
      span.end({
        output: { ...fallbackResult, parseError: true },
        usage: response.usage
          ? {
              inputTokens: response.usage.prompt_tokens || 0,
              outputTokens: response.usage.completion_tokens || 0,
              totalTokens: response.usage.total_tokens || 0,
            }
          : undefined,
      });
      await flushLangfuse();

      return fallbackResult;
    }
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(
      `[ImageAnalysis:analyzeImage] === FAILED === (after ${totalDuration}ms)`,
    );
    console.error("[ImageAnalysis:analyzeImage] Error:", error);
    if (error instanceof Error) {
      console.error("[ImageAnalysis:analyzeImage] Error name:", error.name);
      console.error(
        "[ImageAnalysis:analyzeImage] Error message:",
        error.message,
      );
      console.error("[ImageAnalysis:analyzeImage] Error stack:", error.stack);

      // Track error in Langfuse
      span.error(error);
    } else {
      span.error(new Error(String(error)));
    }
    await flushLangfuse();

    return null;
  }
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
    // Audio/voice content types
    audio: "audio",
    voice: "audio",
    voice_message: "audio",
    voicenote: "audio",
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
 * Orchestrated Content Processing Job
 *
 * Uses the multi-agent orchestrator pipeline when USE_ADK_ORCHESTRATOR=true.
 * This provides a more modular and maintainable processing flow.
 *
 * Pipeline:
 * 1. InputAnalyzer - Detects type, extracts text from images/audio
 * 2. ActionDecider - Classifies intent, decides actions, enriches with web data
 * 3. ActionExecutor - Creates items, generates embeddings, formats output
 */
export const orchestratedProcessingJob = inngest.createFunction(
  {
    id: "orchestrated-content-processing",
    retries: 3,
  },
  { event: "lifeos/job.orchestrated" },
  async ({ event, step }) => {
    const { job_id, user_id, item_id, content_type } =
      event.data as JobCreatedEvent["data"];
    const supabase = getServiceClient();
    const jobStartTime = Date.now();

    // ═══════════════════════════════════════════════════════════════════════════
    // INNGEST JOB START
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`\n[Inngest] ════════════════════════════════════════════════`);
    console.log(`[Inngest] 🚀 ORCHESTRATED PROCESSING JOB STARTING`);
    console.log(`[Inngest] ════════════════════════════════════════════════\n`);
    console.log(`[Inngest] ▶ Job Details:`);
    console.log(`[Inngest]   └─ job_id: ${job_id}`);
    console.log(`[Inngest]   └─ user_id: ${user_id}`);
    console.log(`[Inngest]   └─ item_id: ${item_id}`);
    console.log(`[Inngest]   └─ content_type: ${content_type}`);
    console.log(`[Inngest]   └─ timestamp: ${new Date().toISOString()}`);

    // Step 1: Update job status to running
    console.log(`\n[Inngest] ▶ Step 1/5: Update job status to "running"...`);
    await step.run("update-job-running", async () => {
      await supabase
        .from("jobs")
        .update({
          status: "running",
          started_at: new Date().toISOString(),
          current_step: 1,
        })
        .eq("id", job_id);

      console.log(`[Inngest] ✅ Job status updated to "running"`);
      return { status: "running" };
    });

    // Step 2: Fetch item data
    console.log(`\n[Inngest] ▶ Step 2/5: Fetching item data...`);
    const item = await step.run("fetch-item", async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("id", item_id)
        .single();

      if (error) {
        console.error(`[Inngest] ❌ Failed to fetch item: ${error.message}`);
        throw new Error(`Failed to fetch item: ${error.message}`);
      }

      console.log(`[Inngest] ✅ Item fetched successfully`);
      console.log(`[Inngest]   └─ title: ${data.title || "(no title)"}`);
      console.log(`[Inngest]   └─ url: ${data.url || "(no url)"}`);
      console.log(
        `[Inngest]   └─ content_length: ${data.content?.length || 0} chars`,
      );
      console.log(`[Inngest]   └─ category: ${data.category || "(none)"}`);
      console.log(`[Inngest]   └─ source_type: ${data.source_type}`);
      return data;
    });

    // Step 3: Run orchestrator pipeline
    console.log(`\n[Inngest] ▶ Step 3/5: Running ADK Orchestrator Pipeline...`);
    console.log(`[Inngest]   └─ This will invoke the multi-agent pipeline`);
    console.log(
      `[Inngest]   └─ Pipeline: InputAnalyzer → ActionDecider → ActionExecutor`,
    );

    const orchestratorResult = await step.run(
      "run-orchestrator-pipeline",
      async () => {
        const input: OrchestratorInput = {
          content: item.content || item.url || "",
          contentType: content_type as OrchestratorContentType,
          contentUrl: item.url,
          userId: user_id,
          itemId: item_id,
          jobId: job_id,
          metadata: item.metadata as Record<string, unknown> | undefined,
        };

        console.log(`[Inngest] 📋 Orchestrator Input:`);
        console.log(
          `[Inngest]   └─ content: ${input.content.slice(0, 100)}${input.content.length > 100 ? "..." : ""}`,
        );
        console.log(`[Inngest]   └─ contentType: ${input.contentType}`);
        console.log(
          `[Inngest]   └─ contentUrl: ${input.contentUrl || "(none)"}`,
        );

        const result = await runOrchestratorPipeline(input);

        console.log(`\n[Inngest] 📋 Orchestrator Result:`);
        console.log(`[Inngest]   └─ success: ${result.success}`);
        console.log(`[Inngest]   └─ durationMs: ${result.durationMs}`);
        console.log(`[Inngest]   └─ itemId: ${result.itemId || "(none)"}`);
        if (result.error) {
          console.log(`[Inngest]   └─ error: ${result.error}`);
        }
        if (result.analysis) {
          console.log(
            `[Inngest]   └─ analysis.title: ${result.analysis.title || "(none)"}`,
          );
          console.log(
            `[Inngest]   └─ analysis.confidence: ${result.analysis.confidence}`,
          );
          console.log(
            `[Inngest]   └─ analysis.topics: ${result.analysis.topics?.join(", ") || "(none)"}`,
          );
        }
        console.log(
          `[Inngest]   └─ actions: ${result.actions?.map((a) => `${a.type}:${a.status}`).join(", ") || "(none)"}`,
        );

        return result;
      },
    );

    // Step 4: Update item with orchestrator results (if not already updated)
    console.log(
      `\n[Inngest] ▶ Step 4/5: Updating item with orchestrator results...`,
    );
    if (orchestratorResult.success) {
      await step.run("update-item-from-orchestrator", async () => {
        const enrichmentData = {
          summary: orchestratorResult.analysis.summary,
          topics: orchestratorResult.analysis.topics || [],
          content_type_detected: orchestratorResult.analysis.contentType,
          confidence: orchestratorResult.analysis.confidence,
          entities: orchestratorResult.analysis.entities,
          processed_at: new Date().toISOString(),
          orchestrator_actions: orchestratorResult.actions,
        };

        await supabase
          .from("items")
          .update({
            enrichment: enrichmentData,
            has_enrichment: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item_id);

        console.log(`[Inngest] ✅ Item enrichment data saved`);
        console.log(
          `[Inngest]   └─ summary_length: ${enrichmentData.summary?.length || 0} chars`,
        );
        console.log(
          `[Inngest]   └─ topics_count: ${enrichmentData.topics.length}`,
        );
        console.log(`[Inngest]   └─ confidence: ${enrichmentData.confidence}`);
        return { updated: true };
      });
    } else {
      console.log(`[Inngest] ⚠️ Skipping item update (orchestrator failed)`);
    }

    // Step 5: Complete job
    console.log(`\n[Inngest] ▶ Step 5/5: Completing job...`);
    const finalResult = await step.run("complete-job", async () => {
      const result = {
        orchestrator: orchestratorResult,
        completed_at: new Date().toISOString(),
      };

      const finalStatus = orchestratorResult.success ? "completed" : "failed";
      await supabase
        .from("jobs")
        .update({
          status: finalStatus,
          result,
          error_message: orchestratorResult.error,
          completed_at: new Date().toISOString(),
          current_step: 5,
          step_results: [
            { step: 1, action: "fetch_item", status: "completed" },
            {
              step: 2,
              action: "orchestrator_pipeline",
              status: orchestratorResult.success ? "completed" : "failed",
              durationMs: orchestratorResult.durationMs,
            },
            {
              step: 3,
              action: "update_item",
              status: orchestratorResult.success ? "completed" : "skipped",
            },
          ],
        })
        .eq("id", job_id);

      console.log(
        `[Inngest] ✅ Job record updated with final status: ${finalStatus}`,
      );
      return result;
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // INNGEST JOB COMPLETE
    // ═══════════════════════════════════════════════════════════════════════════
    const totalDurationMs = Date.now() - jobStartTime;
    console.log(`\n[Inngest] ════════════════════════════════════════════════`);
    console.log(
      `[Inngest] ${orchestratorResult.success ? "✅" : "❌"} ORCHESTRATED PROCESSING JOB ${orchestratorResult.success ? "COMPLETED" : "FAILED"}`,
    );
    console.log(`[Inngest] ════════════════════════════════════════════════`);
    console.log(`[Inngest] 📊 Final Summary:`);
    console.log(`[Inngest]   └─ job_id: ${job_id}`);
    console.log(`[Inngest]   └─ item_id: ${item_id}`);
    console.log(`[Inngest]   └─ success: ${orchestratorResult.success}`);
    console.log(
      `[Inngest]   └─ orchestrator_duration: ${orchestratorResult.durationMs}ms`,
    );
    console.log(`[Inngest]   └─ total_job_duration: ${totalDurationMs}ms`);
    if (orchestratorResult.error) {
      console.log(`[Inngest]   └─ error: ${orchestratorResult.error}`);
    }
    console.log(`\n`);

    return {
      job_id,
      item_id,
      status: orchestratorResult.success ? "completed" : "failed",
      result: finalResult,
    };
  },
);

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
export const functions = [
  processContentJob,
  orchestratedProcessingJob,
  handleJobFailure,
];

/**
 * Get the appropriate processing event based on feature flag
 *
 * @param contentType The type of content being processed
 * @returns The event name to use for job creation
 */
export function getProcessingEventName(contentType: string): string {
  if (isOrchestratorEnabled() && shouldUseOrchestrator(contentType)) {
    return "lifeos/job.orchestrated";
  }
  return "lifeos/job.created";
}
