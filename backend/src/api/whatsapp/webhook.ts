import { Hono } from "hono";
import { createServiceClient } from "@lifeos/db";
import {
  getTwilioConfig,
  validateTwilioSignature,
  parseFormData,
  parseWebhookPayload,
  detectIntent,
  isDeleteConfirmationResponse,
  parseDeleteConfirmation,
  isClarificationResponse,
  sendWhatsAppMessage,
  formatWelcomeMessage,
  formatErrorMessage,
  formatVerificationPrompt,
  formatSearchResults,
  formatNovaAnswer,
  formatHelpMessage,
  formatDeleteConfirmation,
  formatDeleteSuccess,
  formatDeleteCancelled,
  formatDeleteNoItems,
  formatDeleteInvalidSelection,
  formatProcessingAck,
  formatAudioReceived,
  type FeedItemSummary,
} from "../../services/whatsapp";
import { logger } from "../../utils/logger";

const app = new Hono();

function createTwiMLResponse(): Response {
  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    },
  );
}

app.post("/", async (c) => {
  const startTime = Date.now();
  let twilioConfig;

  try {
    twilioConfig = getTwilioConfig();
  } catch {
    logger.error("Twilio not configured");
    return c.text("Service not configured", 503);
  }

  try {
    const formData = await c.req.formData();
    const payload = parseFormData(formData);

    if (process.env.NODE_ENV === "production") {
      const signature = c.req.header("x-twilio-signature");
      const url = c.req.url;

      if (!signature) {
        logger.warn("Missing Twilio signature");
        return c.text("Unauthorized", 401);
      }

      const params: Record<string, string> = {};
      formData.forEach((value, key) => {
        params[key] = value.toString();
      });

      if (
        !validateTwilioSignature(signature, url, params, twilioConfig.authToken)
      ) {
        logger.warn("Invalid Twilio signature");
        return c.text("Unauthorized", 401);
      }
    }

    const message = parseWebhookPayload(payload);
    logger.info(
      {
        from: message.from,
        messageType: message.messageType,
        bodyPreview: message.body.slice(0, 50),
      },
      "WhatsApp message received",
    );

    const supabase = createServiceClient();

    const { data: userData } = await supabase.rpc("get_user_by_phone", {
      phone: message.from,
    });

    const whatsappUser = userData?.[0];

    if (!whatsappUser) {
      const responseText = await handleUnknownUser(message, supabase);
      await sendWhatsAppMessage(twilioConfig, {
        to: message.from,
        body: responseText,
      });
      return createTwiMLResponse();
    }

    await supabase.from("whatsapp_messages").insert({
      whatsapp_user_id: whatsappUser.whatsapp_user_id,
      message_sid: message.messageSid,
      direction: "inbound",
      message_type: message.messageType,
      content: message.body,
      media_url: message.mediaUrl,
      media_content_type: message.mediaContentType,
    });

    await supabase
      .from("whatsapp_users")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", whatsappUser.whatsapp_user_id);

    const body = message.body.trim();
    if (isDeleteConfirmationResponse(body)) {
      const deleteResponse = await handleDeleteConfirmation(
        supabase,
        whatsappUser.whatsapp_user_id,
        whatsappUser.user_id,
        parseDeleteConfirmation(body),
      );
      if (deleteResponse) {
        const outboundMessage = await sendWhatsAppMessage(twilioConfig, {
          to: message.from,
          body: deleteResponse,
        });
        await logOutboundMessage(
          supabase,
          whatsappUser.whatsapp_user_id,
          outboundMessage.sid,
          deleteResponse,
        );
        return createTwiMLResponse();
      }
    }

    if (isClarificationResponse(body)) {
      const clarificationResponse = await handleClarificationResponse(
        supabase,
        whatsappUser.whatsapp_user_id,
        whatsappUser.user_id,
        parseInt(body, 10),
      );
      if (clarificationResponse) {
        const outboundMessage = await sendWhatsAppMessage(twilioConfig, {
          to: message.from,
          body: clarificationResponse,
        });
        await logOutboundMessage(
          supabase,
          whatsappUser.whatsapp_user_id,
          outboundMessage.sid,
          clarificationResponse,
        );
        return createTwiMLResponse();
      }
    }

    const intent = detectIntent(message);
    let responseText: string;

    try {
      switch (intent.type) {
        case "save_link":
        case "save_image":
        case "save_text":
          responseText = formatProcessingAck();
          // TODO: Trigger Inngest job for async processing
          break;

        case "save_audio":
          responseText = formatAudioReceived();
          // TODO: Trigger Inngest job for transcription
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
      logger.error({ error }, "Error processing message");
      responseText = formatErrorMessage(
        "Something went wrong. Please try again.",
      );
    }

    const outboundMessage = await sendWhatsAppMessage(twilioConfig, {
      to: message.from,
      body: responseText,
    });

    await logOutboundMessage(
      supabase,
      whatsappUser.whatsapp_user_id,
      outboundMessage.sid,
      responseText,
    );

    logger.info(
      { userId: whatsappUser.user_id, durationMs: Date.now() - startTime },
      "WhatsApp webhook complete",
    );

    return createTwiMLResponse();
  } catch (error) {
    logger.error({ error }, "Webhook error");
    return c.text("Internal error", 500);
  }
});

async function logOutboundMessage(
  supabase: ReturnType<typeof createServiceClient>,
  whatsappUserId: string,
  messageSid: string,
  content: string,
) {
  await supabase.from("whatsapp_messages").insert({
    whatsapp_user_id: whatsappUserId,
    message_sid: messageSid,
    direction: "outbound",
    message_type: "text",
    content,
  });
}

async function handleUnknownUser(
  message: ReturnType<typeof parseWebhookPayload>,
  supabase: ReturnType<typeof createServiceClient>,
): Promise<string> {
  const body = message.body.trim();

  if (/^\d{6}$/.test(body)) {
    const { data } = await supabase.rpc("verify_whatsapp_link_code", {
      link_code: body,
      phone: message.from,
      name: message.profileName,
    });

    const result = data?.[0];

    if (result?.success) {
      logger.info({ phone: message.from }, "WhatsApp linked successfully");
      return formatWelcomeMessage(message.profileName);
    } else {
      return formatErrorMessage(
        result?.error_message || "Invalid code. Please try again.",
      );
    }
  }

  return formatVerificationPrompt();
}

async function handleQuery(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  question: string,
): Promise<string> {
  let query = supabase
    .from("items")
    .select("id, title, category, url, source_type, created_at")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false })
    .limit(10);

  const searchMatch = question.toLowerCase();
  if (searchMatch.includes("food") || searchMatch.includes("restaurant")) {
    query = query.eq("category", "food");
  } else if (searchMatch.includes("tech") || searchMatch.includes("article")) {
    query = query.eq("category", "tech");
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

  if (formattedItems.length === 0) {
    return formatNovaAnswer(
      "I can help you find items. Try asking about specific categories (food, tech, music, etc.) or search for keywords.",
    );
  }

  return formatSearchResults(question, formattedItems, formattedItems.length);
}

async function handleCommand(
  supabase: ReturnType<typeof createServiceClient>,
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
      const arg = args.trim().toLowerCase();
      let itemToDelete: {
        id: string;
        title: string;
        category?: string;
      } | null = null;

      if (!arg || arg === "last") {
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
        const index = parseInt(arg, 10);

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
      const { error } = await supabase
        .from("whatsapp_users")
        .delete()
        .eq("id", whatsappUserId);

      if (error) {
        logger.error({ error }, "Error unlinking WhatsApp");
        return "❌ Failed to unlink your account. Please try again.";
      }

      logger.info({ whatsappUserId }, "WhatsApp unlinked");
      return `✅ Your WhatsApp has been unlinked from LifeOS.

To link again, generate a new code from the LifeOS dashboard and send it here.`;
    }

    default:
      return `Unknown command: /${command}. Try /help for available commands.`;
  }
}

async function handleDeleteConfirmation(
  supabase: ReturnType<typeof createServiceClient>,
  whatsappUserId: string,
  userId: string,
  confirmed: boolean,
): Promise<string | null> {
  const { data: pendingDelete, error } = await supabase
    .from("pending_deletes")
    .select("*")
    .eq("whatsapp_user_id", whatsappUserId)
    .eq("awaiting_confirmation", true)
    .single();

  if (error || !pendingDelete || !pendingDelete.item_to_delete) {
    return null;
  }

  const itemToDelete = pendingDelete.item_to_delete as {
    id: string;
    title: string;
    category?: string;
  };

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

  const { error: deleteError } = await supabase
    .from("items")
    .update({
      is_archived: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemToDelete.id)
    .eq("user_id", userId);

  if (deleteError) {
    logger.error({ deleteError }, "Error deleting item");
    return formatErrorMessage("Failed to delete the item. Please try again.");
  }

  logger.info({ itemId: itemToDelete.id, userId }, "Item deleted via WhatsApp");
  return formatDeleteSuccess(itemToDelete.title);
}

async function handleClarificationResponse(
  supabase: ReturnType<typeof createServiceClient>,
  whatsappUserId: string,
  userId: string,
  selection: number,
): Promise<string | null> {
  const { data: clarification, error } = await supabase
    .from("pending_clarifications")
    .select("*")
    .eq("whatsapp_user_id", whatsappUserId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !clarification) {
    return null;
  }

  const interpretations = clarification.interpretations as Array<{
    type: string;
    label: string;
    confidence: number;
  }>;

  if (selection < 1 || selection > interpretations.length) {
    return `Please reply with a number between 1 and ${interpretations.length}.`;
  }

  const selectedInterpretation = interpretations[selection - 1];

  await supabase
    .from("pending_clarifications")
    .update({
      status: "resolved",
      resolved_interpretation: selectedInterpretation,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", clarification.id);

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

  if (clarification.item_id) {
    const { data: existingItem } = await supabase
      .from("items")
      .select("enrichment")
      .eq("id", clarification.item_id)
      .single();

    await supabase
      .from("items")
      .update({
        category,
        enrichment: {
          ...(existingItem?.enrichment || {}),
          content_type_detected: selectedInterpretation.type,
          user_clarified: true,
          clarification_label: selectedInterpretation.label,
        },
        has_enrichment: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", clarification.item_id);
  }

  return `✅ Got it! Saved as: ${selectedInterpretation.label}

📁 Category: ${category}`;
}

export default app;
