/**
 * WhatsApp Webhook API Route
 *
 * POST /api/whatsapp/webhook - Receives incoming WhatsApp messages from Twilio
 *
 * Flow:
 * 1. Validate Twilio signature
 * 2. Parse incoming message (text, image, link)
 * 3. Look up LifeOS user by phone number
 * 4. Process the message based on intent
 * 5. Send response back via Twilio API
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/core/database";
import {
  getTwilioConfig,
  validateTwilioSignature,
  sendWhatsAppMessage,
  parseWebhookPayload,
  detectIntent,
  isClarificationResponse,
  isDeleteConfirmationResponse,
  parseDeleteConfirmation,
  formatSearchResults,
  formatNovaAnswer,
  formatVerificationPrompt,
  formatWelcomeMessage,
  formatErrorMessage,
  formatHelpMessage,
  formatDeleteConfirmation,
  formatDeleteSuccess,
  formatDeleteCancelled,
  formatDeleteNoItems,
  formatDeleteInvalidSelection,
  type TwilioWebhookPayload,
  type FeedItemSummary,
} from "@/lib/services/whatsapp";
import { triggerContentProcessing } from "@/lib/services/jobs";
import { parseFilterIntent } from "@/lib/services/ai/voice/filter-intent";
import { perceive, type ContentType } from "@/lib/services/ai/nova/perception";
import { enrichContent, formatEnrichedResponse } from "@/lib/services/search";

// Twilio sends form-urlencoded data
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * POST /api/whatsapp/webhook
 * Handle incoming WhatsApp messages
 */
export async function POST(request: NextRequest) {
  try {
    // Get Twilio config
    let twilioConfig;
    try {
      twilioConfig = getTwilioConfig();
    } catch {
      console.error("Twilio not configured");
      return new NextResponse("Service not configured", { status: 503 });
    }

    // Parse form-urlencoded body
    const formData = await request.formData();
    const payload: TwilioWebhookPayload = {} as TwilioWebhookPayload;
    formData.forEach((value, key) => {
      payload[key] = value.toString();
    });

    // Validate Twilio signature in production
    if (process.env.NODE_ENV === "production") {
      const signature = request.headers.get("x-twilio-signature");
      const url = request.url;

      if (!signature) {
        console.error("Missing Twilio signature");
        return new NextResponse("Unauthorized", { status: 401 });
      }

      const params: Record<string, string> = {};
      formData.forEach((value, key) => {
        params[key] = value.toString();
      });

      if (
        !validateTwilioSignature(signature, url, params, twilioConfig.authToken)
      ) {
        console.error("Invalid Twilio signature");
        return new NextResponse("Unauthorized", { status: 401 });
      }
    }

    // Parse the incoming message
    const message = parseWebhookPayload(payload);
    console.log(
      `[WhatsApp] Received message from ${message.from}: ${message.body.slice(0, 50)}`,
    );

    // Get Supabase service client for database operations
    const supabase = getServiceClient();

    // Look up user by phone number
    const { data: userData } = await supabase.rpc("get_user_by_phone", {
      phone: message.from,
    });

    const whatsappUser = userData?.[0];

    // If user not found, prompt for verification
    if (!whatsappUser) {
      const responseText = await handleUnknownUser(message, supabase);
      await sendWhatsAppMessage(twilioConfig, {
        to: message.from,
        body: responseText,
      });
      return createTwiMLResponse();
    }

    // Log the incoming message
    await supabase.from("whatsapp_messages").insert({
      whatsapp_user_id: whatsappUser.whatsapp_user_id,
      message_sid: message.messageSid,
      direction: "inbound",
      message_type: message.messageType,
      content: message.body,
      media_url: message.mediaUrl,
      media_content_type: message.mediaContentType,
    });

    // Update last_message_at
    await supabase
      .from("whatsapp_users")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", whatsappUser.whatsapp_user_id);

    // Check for pending delete confirmation first (YES/NO)
    const body = message.body.trim();
    if (isDeleteConfirmationResponse(body)) {
      const deleteResponse = await handleDeleteConfirmation(
        supabase,
        whatsappUser.whatsapp_user_id,
        whatsappUser.user_id,
        parseDeleteConfirmation(body),
      );
      if (deleteResponse) {
        // Log and send the delete response
        const outboundMessage = await sendWhatsAppMessage(twilioConfig, {
          to: message.from,
          body: deleteResponse,
        });
        await supabase.from("whatsapp_messages").insert({
          whatsapp_user_id: whatsappUser.whatsapp_user_id,
          message_sid: outboundMessage.sid,
          direction: "outbound",
          message_type: "text",
          content: deleteResponse,
        });
        return createTwiMLResponse();
      }
      // No pending delete found, continue with normal intent detection
    }

    // Check for pending clarifications
    if (isClarificationResponse(body)) {
      const clarificationResponse = await handleClarificationResponse(
        supabase,
        whatsappUser.whatsapp_user_id,
        whatsappUser.user_id,
        parseInt(body, 10),
      );
      if (clarificationResponse) {
        // Log and send the clarification response
        const outboundMessage = await sendWhatsAppMessage(twilioConfig, {
          to: message.from,
          body: clarificationResponse,
        });
        await supabase.from("whatsapp_messages").insert({
          whatsapp_user_id: whatsappUser.whatsapp_user_id,
          message_sid: outboundMessage.sid,
          direction: "outbound",
          message_type: "text",
          content: clarificationResponse,
        });
        return createTwiMLResponse();
      }
      // No pending clarification found, continue with normal intent detection
    }

    // Detect intent and process
    const intent = detectIntent(message);
    let responseText: string;

    try {
      switch (intent.type) {
        case "save_link":
          responseText = await processAndCreateItem(
            supabase,
            whatsappUser.user_id,
            {
              type: "url",
              url: intent.url,
              text: intent.note,
            },
          );
          break;

        case "save_image":
          responseText = await processAndCreateItem(
            supabase,
            whatsappUser.user_id,
            {
              type: "image",
              mediaUrl: intent.mediaUrl,
              caption: intent.caption,
            },
          );
          break;

        case "save_audio":
          responseText = await processAndCreateItem(
            supabase,
            whatsappUser.user_id,
            {
              type: "audio",
              mediaUrl: intent.mediaUrl,
              caption: intent.caption,
            },
          );
          break;

        case "save_text":
          responseText = await processAndCreateItem(
            supabase,
            whatsappUser.user_id,
            {
              type: "text",
              text: intent.text,
            },
          );
          break;

        case "query":
          responseText = await handleQuery(
            supabase,
            whatsappUser.user_id,
            intent.question,
          );
          break;

        case "command":
          responseText = await handleCommand(
            supabase,
            whatsappUser.user_id,
            whatsappUser.whatsapp_user_id,
            intent.command,
            intent.args,
          );
          break;

        default:
          responseText = formatErrorMessage(
            "I'm not sure what you want me to do. Try sending a link, image, or ask me a question!",
          );
      }
    } catch (error) {
      console.error("[WhatsApp] Error processing message:", error);
      responseText = formatErrorMessage(
        "Something went wrong. Please try again.",
      );
    }

    // Send response
    const outboundMessage = await sendWhatsAppMessage(twilioConfig, {
      to: message.from,
      body: responseText,
    });

    // Log outbound message
    await supabase.from("whatsapp_messages").insert({
      whatsapp_user_id: whatsappUser.whatsapp_user_id,
      message_sid: outboundMessage.sid,
      direction: "outbound",
      message_type: "text",
      content: responseText,
    });

    return createTwiMLResponse();
  } catch (error) {
    console.error("[WhatsApp] Webhook error:", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

/**
 * Handle messages from unknown (unlinked) users
 */
async function handleUnknownUser(
  message: ReturnType<typeof parseWebhookPayload>,
  supabase: ReturnType<typeof getServiceClient>,
): Promise<string> {
  const body = message.body.trim();

  // Check if they're sending a verification code
  if (/^\d{6}$/.test(body)) {
    const { data } = await supabase.rpc("verify_whatsapp_link_code", {
      link_code: body,
      phone: message.from,
      name: message.profileName,
    });

    const result = data?.[0];

    if (result?.success) {
      return formatWelcomeMessage(message.profileName);
    } else {
      return formatErrorMessage(
        result?.error_message || "Invalid code. Please try again.",
      );
    }
  }

  return formatVerificationPrompt();
}

/**
 * Unified content processing and item creation
 *
 * NEW FLOW:
 * 1. Extract content (for images: analyze with vision)
 * 2. LLM perception (understand what the content is)
 * 3. LLM-driven web search with Tavily
 * 4. LLM synthesizes results into enriched data
 * 5. Create item with full enrichment
 * 6. Trigger job for embeddings only
 * 7. Return LLM-formatted response
 */
async function processAndCreateItem(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string,
  content: {
    type: "text" | "image" | "url" | "audio";
    text?: string;
    mediaUrl?: string;
    url?: string;
    caption?: string;
  },
): Promise<string> {
  console.log(`[WhatsApp] Processing ${content.type} content`);

  // STEP 1: Extract content
  let extractedContent = content.text || content.url || "";
  let imageAnalysis: {
    description?: string;
    extractedText?: string;
    title?: string;
  } | null = null;

  // For audio content, create item immediately and let job handle transcription
  if (content.type === "audio" && content.mediaUrl) {
    console.log(
      `[WhatsApp] Processing audio - will transcribe in background job`,
    );

    // Create a placeholder item for the audio
    const { data: item, error } = await supabase
      .from("items")
      .insert({
        user_id: userId,
        title: content.caption || "Voice Message",
        content: content.caption || "Audio message - transcription pending",
        url: content.mediaUrl,
        content_type: "audio",
        source_type: "whatsapp",
        category: "audio",
        tags: ["voice-message"],
        has_enrichment: false,
        metadata: {
          original_caption: content.caption,
          source: "whatsapp",
          processed_at: new Date().toISOString(),
        },
        is_archived: false,
        is_completed: false,
      })
      .select()
      .single();

    if (error) {
      console.error(`[WhatsApp] Failed to create audio item:`, error);
      throw new Error(`Failed to save: ${error.message}`);
    }

    console.log(`[WhatsApp] Created audio item: ${item.id}`);

    // Trigger job for transcription and enrichment
    const { data: job } = await supabase
      .from("jobs")
      .insert({
        user_id: userId,
        item_id: item.id,
        status: "pending",
        plan: {
          reasoning: "Transcribe audio and enrich content",
          steps: [
            { action: "transcribe", why: "Convert audio to text" },
            { action: "perceive", why: "Understand content" },
            { action: "enrich", why: "Add context" },
            { action: "embed", why: "Enable semantic search" },
          ],
        },
        current_step: 0,
        step_results: [],
      })
      .select()
      .single();

    if (job) {
      await triggerContentProcessing({
        job_id: job.id,
        user_id: userId,
        item_id: item.id,
        content_type: "audio",
      });
    }

    return `🎤 Voice message received!

I'm transcribing your audio now. This usually takes a few seconds.

📝 Check back in your feed shortly to see the full transcription and any insights.`;
  }

  if (content.type === "image" && content.mediaUrl) {
    // Analyze image with GPT-4o Vision
    imageAnalysis = await analyzeImageContent(content.mediaUrl);
    if (imageAnalysis) {
      extractedContent = imageAnalysis.description || "";
      if (imageAnalysis.extractedText) {
        extractedContent += `\n\nText from image: ${imageAnalysis.extractedText}`;
      }
    }
    console.log(
      `[WhatsApp] Image analysis: ${imageAnalysis?.description?.slice(0, 100)}...`,
    );
  }

  // STEP 2: LLM Perception (understand what this is)
  console.log(`[WhatsApp] Running perception on content`);
  const perceptionResult = await perceive({
    content: extractedContent,
    contentType:
      content.type === "image"
        ? ("text" as ContentType)
        : (content.type as ContentType),
    context: content.caption || imageAnalysis?.title,
    userId,
  });
  const perception = perceptionResult.result;
  console.log(
    `[WhatsApp] Perceived as: ${perception.contentType} (${perception.confidence})`,
  );

  // If we have image analysis, merge its title
  if (imageAnalysis?.title) {
    perception.title = imageAnalysis.title;
  }

  // STEP 3-4: LLM-driven web search + synthesis
  console.log(`[WhatsApp] Enriching content with web search`);
  const { enrichedData, searchPerformed, searchQuery } =
    await enrichContent(perception);
  console.log(
    `[WhatsApp] Enrichment complete: ${enrichedData.title} (searched: ${searchPerformed})`,
  );

  // STEP 5: Create fully enriched item
  const { data: item, error } = await supabase
    .from("items")
    .insert({
      user_id: userId,
      title: enrichedData.title,
      content: enrichedData.description,
      url: content.url || content.mediaUrl,
      content_type: content.type,
      source_type: "whatsapp",
      category: enrichedData.category,
      tags: enrichedData.tags,
      enrichment: {
        ...enrichedData.keyFacts,
        summary: enrichedData.description,
        source_url: enrichedData.sourceUrl,
        confidence: enrichedData.confidence,
        perception: {
          contentType: perception.contentType,
          summary: perception.summary,
          confidence: perception.confidence,
        },
        search_query: searchQuery,
        search_performed: searchPerformed,
      },
      has_enrichment: true,
      metadata: {
        original_content: content.text || content.caption,
        image_analysis: imageAnalysis,
        source: "whatsapp",
        processed_at: new Date().toISOString(),
      },
      is_archived: false,
      is_completed: false,
    })
    .select()
    .single();

  if (error) {
    console.error(`[WhatsApp] Failed to create item:`, error);
    throw new Error(`Failed to save: ${error.message}`);
  }

  console.log(`[WhatsApp] Created item: ${item.id}`);

  // STEP 6: Trigger job for embeddings only
  const { data: job } = await supabase
    .from("jobs")
    .insert({
      user_id: userId,
      item_id: item.id,
      status: "pending",
      plan: {
        reasoning: "Generate embeddings for enriched WhatsApp item",
        steps: [{ action: "embed", why: "Enable semantic search" }],
      },
      current_step: 0,
      step_results: [],
      result: { skip_enrichment: true },
    })
    .select()
    .single();

  if (job) {
    await triggerContentProcessing({
      job_id: job.id,
      user_id: userId,
      item_id: item.id,
      content_type: content.type,
    });
  }

  // STEP 7: LLM formats response
  const responseMessage = await formatEnrichedResponse(enrichedData);
  return responseMessage;
}

/**
 * Analyze image content using GPT-4o Vision
 */
async function analyzeImageContent(imageUrl: string): Promise<{
  description?: string;
  extractedText?: string;
  title?: string;
} | null> {
  try {
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log(`[WhatsApp] Analyzing image: ${imageUrl.slice(0, 50)}...`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1000,
      messages: [
        {
          role: "system",
          content: `You are an image analysis assistant. Analyze the image and extract useful information.

Return a JSON object with:
{
  "title": "A short, descriptive title for this image",
  "description": "A detailed description of what's in the image and why someone might have saved it",
  "extractedText": "Any text visible in the image (OCR). Include all readable text."
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

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return null;
    }

    // Parse JSON response
    let jsonContent = content;
    if (content.includes("```json")) {
      jsonContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (content.includes("```")) {
      jsonContent = content.replace(/```\n?/g, "");
    }

    return JSON.parse(jsonContent.trim());
  } catch (error) {
    console.error("[WhatsApp] Image analysis failed:", error);
    return null;
  }
}

/**
 * Handle natural language queries
 */
async function handleQuery(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string,
  question: string,
): Promise<string> {
  // Use the filter intent parser to understand the query
  const intent = await parseFilterIntent(question);

  // If it's a filter/search request, query items
  if (intent.action === "filter" || intent.action === "search") {
    let query = supabase
      .from("items")
      .select("id, title, category, url, source_type, created_at")
      .eq("user_id", userId)
      .eq("is_archived", false)
      .order("created_at", { ascending: false })
      .limit(10);

    if (intent.categories.length > 0) {
      query = query.in("category", intent.categories);
    }

    if (intent.searchQuery) {
      query = query.ilike("title", `%${intent.searchQuery}%`);
    }

    const { data: items, error } = await query;

    if (error) {
      throw new Error(`Search failed: ${error.message}`);
    }

    const formattedItems: FeedItemSummary[] = (items || []).map((item) => ({
      id: item.id,
      title: item.title,
      category: item.category,
      url: item.url,
      source: item.source_type,
      savedAt: item.created_at,
    }));

    return formatSearchResults(
      intent.searchQuery || intent.categories.join(", ") || "your items",
      formattedItems,
      formattedItems.length,
    );
  }

  // For complex questions, provide a basic response
  // In a full implementation, this would use the Nova RAG system
  return formatNovaAnswer(
    "I can help you find items. Try asking about specific categories (food, tech, music, etc.) or search for keywords.",
  );
}

/**
 * Handle slash commands
 */
async function handleCommand(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string,
  whatsappUserId: string,
  command: string,
  args: string,
): Promise<string> {
  switch (command) {
    case "help":
      return formatHelpMessage();

    case "recent": {
      const { data: items } = await supabase
        .from("items")
        .select("id, title, category, url, source_type, created_at")
        .eq("user_id", userId)
        .eq("is_archived", false)
        .order("created_at", { ascending: false })
        .limit(5);

      const formattedItems: FeedItemSummary[] = (items || []).map((item) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        url: item.url,
        source: item.source_type,
        savedAt: item.created_at,
      }));

      // Store recent items for potential delete operation
      if (items && items.length > 0) {
        await supabase.from("pending_deletes").upsert(
          {
            whatsapp_user_id: whatsappUserId,
            user_id: userId,
            recent_items: items.map((i) => ({
              id: i.id,
              title: i.title,
              category: i.category,
            })),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "whatsapp_user_id" },
        );
      }

      return formatSearchResults(
        "recent items",
        formattedItems,
        formattedItems.length,
      );
    }

    case "delete": {
      // Parse the argument - can be empty (last item), a number (from /recent list), or "last"
      const arg = args.trim().toLowerCase();

      // Get the item to delete
      let itemToDelete: {
        id: string;
        title: string;
        category?: string;
      } | null = null;

      if (!arg || arg === "last") {
        // Delete most recent item
        const { data: recentItem } = await supabase
          .from("items")
          .select("id, title, category")
          .eq("user_id", userId)
          .eq("is_archived", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        itemToDelete = recentItem;
      } else if (/^\d+$/.test(arg)) {
        // Delete by index from /recent list
        const index = parseInt(arg, 10);

        // Get cached recent items
        const { data: pendingDelete } = await supabase
          .from("pending_deletes")
          .select("recent_items")
          .eq("whatsapp_user_id", whatsappUserId)
          .single();

        const recentItems = pendingDelete?.recent_items as Array<{
          id: string;
          title: string;
          category?: string;
        }> | null;

        if (!recentItems || recentItems.length === 0) {
          return formatDeleteNoItems();
        }

        if (index < 1 || index > recentItems.length) {
          return formatDeleteInvalidSelection(recentItems.length);
        }

        itemToDelete = recentItems[index - 1];
      }

      if (!itemToDelete) {
        return formatDeleteNoItems();
      }

      // Store pending delete confirmation
      await supabase.from("pending_deletes").upsert(
        {
          whatsapp_user_id: whatsappUserId,
          user_id: userId,
          item_to_delete: itemToDelete,
          awaiting_confirmation: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "whatsapp_user_id" },
      );

      return formatDeleteConfirmation({
        id: itemToDelete.id,
        title: itemToDelete.title,
        category: itemToDelete.category,
      });
    }

    case "search":
      if (!args) {
        return "Please provide a search term. Example: /search restaurants";
      }
      return handleQuery(supabase, userId, args);

    case "unlink": {
      // Unlink WhatsApp from LifeOS account
      const { error } = await supabase
        .from("whatsapp_users")
        .delete()
        .eq("id", whatsappUserId);

      if (error) {
        console.error("[WhatsApp] Error unlinking:", error);
        return "❌ Failed to unlink your account. Please try again.";
      }

      return `✅ Your WhatsApp has been unlinked from LifeOS.

To link again, generate a new code from the LifeOS dashboard and send it here.`;
    }

    default:
      return `Unknown command: /${command}. Try /help for available commands.`;
  }
}

/**
 * Handle delete confirmation response from user (YES/NO)
 *
 * Returns response message if there was a pending delete,
 * or null if no pending delete exists.
 */
async function handleDeleteConfirmation(
  supabase: ReturnType<typeof getServiceClient>,
  whatsappUserId: string,
  userId: string,
  confirmed: boolean,
): Promise<string | null> {
  // Find pending delete for this user
  const { data: pendingDelete, error } = await supabase
    .from("pending_deletes")
    .select("*")
    .eq("whatsapp_user_id", whatsappUserId)
    .eq("awaiting_confirmation", true)
    .single();

  if (error || !pendingDelete || !pendingDelete.item_to_delete) {
    return null; // No pending delete
  }

  const itemToDelete = pendingDelete.item_to_delete as {
    id: string;
    title: string;
    category?: string;
  };

  // Clear the pending delete state
  await supabase
    .from("pending_deletes")
    .update({
      awaiting_confirmation: false,
      item_to_delete: null,
      updated_at: new Date().toISOString(),
    })
    .eq("whatsapp_user_id", whatsappUserId);

  if (!confirmed) {
    return formatDeleteCancelled();
  }

  // Perform the deletion (soft delete by archiving)
  const { error: deleteError } = await supabase
    .from("items")
    .update({
      is_archived: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemToDelete.id)
    .eq("user_id", userId);

  if (deleteError) {
    console.error("[WhatsApp] Error deleting item:", deleteError);
    return formatErrorMessage("Failed to delete the item. Please try again.");
  }

  return formatDeleteSuccess(itemToDelete.title);
}

/**
 * Handle clarification response from user
 *
 * Returns response message if clarification was found and resolved,
 * or null if no pending clarification exists.
 */
async function handleClarificationResponse(
  supabase: ReturnType<typeof getServiceClient>,
  whatsappUserId: string,
  userId: string,
  selection: number,
): Promise<string | null> {
  // Find pending clarification for this user
  const { data: clarification, error } = await supabase
    .from("pending_clarifications")
    .select("*")
    .eq("whatsapp_user_id", whatsappUserId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !clarification) {
    return null; // No pending clarification
  }

  const interpretations = clarification.interpretations as Array<{
    type: string;
    label: string;
    confidence: number;
  }>;

  // Validate selection
  if (selection < 1 || selection > interpretations.length) {
    return `Please reply with a number between 1 and ${interpretations.length}.`;
  }

  const selectedInterpretation = interpretations[selection - 1];

  // Update the clarification as resolved
  await supabase
    .from("pending_clarifications")
    .update({
      status: "resolved",
      resolved_interpretation: selectedInterpretation,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", clarification.id);

  // Update the item with the resolved interpretation
  const categoryMap: Record<string, string> = {
    restaurant: "food",
    place: "places",
    book: "reading",
    movie: "entertainment",
    video: "video",
    article: "reading",
    product: "shopping",
    reminder: "tasks",
    note: "notes",
    music: "audio",
    podcast: "audio",
    recipe: "food",
  };

  const category =
    categoryMap[selectedInterpretation.type.toLowerCase()] || "uncategorized";

  await supabase
    .from("items")
    .update({
      category,
      enrichment: {
        ...(clarification.item_id
          ? (
              await supabase
                .from("items")
                .select("enrichment")
                .eq("id", clarification.item_id)
                .single()
            ).data?.enrichment
          : {}),
        content_type_detected: selectedInterpretation.type,
        user_clarified: true,
        clarification_label: selectedInterpretation.label,
      },
      has_enrichment: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clarification.item_id);

  return `✅ Got it! Saved as: ${selectedInterpretation.label}

📁 Category: ${category}`;
}

/**
 * Create empty TwiML response (Twilio expects this)
 */
function createTwiMLResponse(): NextResponse {
  return new NextResponse(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    },
  );
}
