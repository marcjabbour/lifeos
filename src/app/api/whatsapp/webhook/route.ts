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
  formatSaveConfirmation,
  formatSearchResults,
  formatNovaAnswer,
  formatVerificationPrompt,
  formatWelcomeMessage,
  formatErrorMessage,
  formatHelpMessage,
  type TwilioWebhookPayload,
  type FeedItemSummary,
} from "@/lib/services/whatsapp";
import { triggerContentProcessing } from "@/lib/services/jobs";
import { generateTitle, createInitialMetadata } from "@/lib/services/items";
import { parseFilterIntent } from "@/lib/services/ai/voice/filter-intent";

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

    // Check for pending clarifications first
    const body = message.body.trim();
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
          responseText = await handleSaveLink(
            supabase,
            whatsappUser.user_id,
            intent.url,
            intent.note,
          );
          break;

        case "save_image":
          responseText = await handleSaveImage(
            supabase,
            whatsappUser.user_id,
            intent.mediaUrl,
            intent.caption,
          );
          break;

        case "save_text":
          responseText = await handleSaveText(
            supabase,
            whatsappUser.user_id,
            intent.text,
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
 * Save a URL/link to LifeOS
 */
async function handleSaveLink(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string,
  url: string,
  note?: string,
): Promise<string> {
  const title = generateTitle(url, "url");
  const metadata = createInitialMetadata(url, "url", "whatsapp");
  if (note) {
    metadata.user_note = note;
  }

  const { data: item, error } = await supabase
    .from("items")
    .insert({
      user_id: userId,
      title,
      url,
      content_type: "url",
      source_type: "whatsapp",
      metadata,
      category: "uncategorized",
      tags: [],
      enrichment: {},
      has_enrichment: false,
      is_archived: false,
      is_completed: false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save: ${error.message}`);
  }

  // Create job for async processing
  const { data: job } = await supabase
    .from("jobs")
    .insert({
      user_id: userId,
      item_id: item.id,
      status: "pending",
      plan: {
        reasoning: "Process URL from WhatsApp",
        steps: [
          { action: "perceive", why: "Understand the content" },
          { action: "enrich", why: "Add metadata and insights" },
        ],
      },
      current_step: 0,
      step_results: [],
      result: {},
    })
    .select()
    .single();

  if (job) {
    await triggerContentProcessing({
      job_id: job.id,
      user_id: userId,
      item_id: item.id,
      content_type: "url",
    });
  }

  return formatSaveConfirmation(title, undefined, job?.id);
}

/**
 * Save an image to LifeOS
 */
async function handleSaveImage(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string,
  mediaUrl: string,
  caption?: string,
): Promise<string> {
  const title = caption || "Screenshot from WhatsApp";
  const metadata = createInitialMetadata(mediaUrl, "image", "whatsapp");
  if (caption) {
    metadata.caption = caption;
  }

  const { data: item, error } = await supabase
    .from("items")
    .insert({
      user_id: userId,
      title,
      url: mediaUrl,
      content_type: "image",
      source_type: "whatsapp",
      metadata,
      category: "uncategorized",
      tags: [],
      enrichment: {},
      has_enrichment: false,
      is_archived: false,
      is_completed: false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save: ${error.message}`);
  }

  // Create job for OCR and enrichment
  const { data: job } = await supabase
    .from("jobs")
    .insert({
      user_id: userId,
      item_id: item.id,
      status: "pending",
      plan: {
        reasoning: "Process image from WhatsApp with OCR",
        steps: [
          { action: "ocr", why: "Extract text from image" },
          { action: "perceive", why: "Understand the content" },
          { action: "enrich", why: "Add metadata and insights" },
        ],
      },
      current_step: 0,
      step_results: [],
      result: {},
    })
    .select()
    .single();

  if (job) {
    await triggerContentProcessing({
      job_id: job.id,
      user_id: userId,
      item_id: item.id,
      content_type: "image",
    });
  }

  return formatSaveConfirmation(title, undefined, job?.id);
}

/**
 * Save text as a note to LifeOS
 */
async function handleSaveText(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string,
  text: string,
): Promise<string> {
  const title = generateTitle(text, "text");
  const metadata = createInitialMetadata(text, "text", "whatsapp");

  const { data: item, error } = await supabase
    .from("items")
    .insert({
      user_id: userId,
      title,
      content: text,
      content_type: "text",
      source_type: "whatsapp",
      metadata,
      category: "uncategorized",
      tags: [],
      enrichment: {},
      has_enrichment: false,
      is_archived: false,
      is_completed: false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save: ${error.message}`);
  }

  // Create job for enrichment
  const { data: job } = await supabase
    .from("jobs")
    .insert({
      user_id: userId,
      item_id: item.id,
      status: "pending",
      plan: {
        reasoning: "Process text note from WhatsApp",
        steps: [
          { action: "perceive", why: "Understand the content" },
          { action: "enrich", why: "Add metadata and insights" },
        ],
      },
      current_step: 0,
      step_results: [],
      result: {},
    })
    .select()
    .single();

  if (job) {
    await triggerContentProcessing({
      job_id: job.id,
      user_id: userId,
      item_id: item.id,
      content_type: "text",
    });
  }

  return formatSaveConfirmation(title, undefined, job?.id);
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

      return formatSearchResults(
        "recent items",
        formattedItems,
        formattedItems.length,
      );
    }

    case "search":
      if (!args) {
        return "Please provide a search term. Example: /search restaurants";
      }
      return handleQuery(supabase, userId, args);

    default:
      return `Unknown command: /${command}. Try /help for available commands.`;
  }
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
