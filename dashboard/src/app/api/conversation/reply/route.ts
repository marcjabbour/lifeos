import { NextRequest, NextResponse } from "next/server";
import { chat, parseJsonResponse } from "@/lib/openai";
import {
  REPLY_PROCESSING_SYSTEM_PROMPT,
  buildReplyProcessingPrompt,
} from "@/lib/prompts";
import {
  getConversation,
  addMessageToConversation,
  updateConversation,
  saveItem,
  getPushSubscription,
  getPendingItem,
  deletePendingItem,
} from "@/lib/storage";
import { sendConfirmationNotification } from "@/lib/push";
import {
  toDbCategory,
  type ConversationReplyRequest,
  type ConversationReplyResponse,
  type AICategory,
} from "@/types";
// ConversationMessage type is used indirectly via storage functions

interface ReplyProcessingResult {
  resolved: boolean;
  category?: AICategory;
  tags?: string[];
  followUp?: string | null;
}

/**
 * POST /api/conversation/reply
 *
 * Handle user replies in the clarification flow.
 * Continues the conversation until the content can be categorized confidently.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as ConversationReplyRequest;

    // Validate request
    if (!body.conversationId || !body.message) {
      return NextResponse.json(
        { resolved: false, error: "Missing conversationId or message" },
        { status: 400 },
      );
    }

    // Get conversation
    const conversation = await getConversation(body.conversationId);
    if (!conversation) {
      return NextResponse.json(
        { resolved: false, error: "Conversation not found" },
        { status: 404 },
      );
    }

    if (conversation.status !== "pending") {
      return NextResponse.json(
        { resolved: false, error: "Conversation is no longer active" },
        { status: 400 },
      );
    }

    // Get pending item
    const pendingItem = getPendingItem(body.conversationId);
    if (!pendingItem) {
      return NextResponse.json(
        { resolved: false, error: "Pending item not found" },
        { status: 404 },
      );
    }

    // Add user message to conversation
    const now = new Date().toISOString();
    await addMessageToConversation(body.conversationId, {
      role: "user",
      content: body.message,
      timestamp: now,
    });

    // Process the reply with AI
    const processingResult = await processReply(
      {
        type: pendingItem.type,
        content: pendingItem.content,
        title: pendingItem.title,
        description: pendingItem.description,
      },
      conversation.messages.map((m) => ({ role: m.role, content: m.content })),
      body.message,
    );

    if (processingResult.resolved && processingResult.category) {
      // Save the item with the resolved category
      const savedItem = await saveItem({
        title: pendingItem.title,
        content: pendingItem.description,
        url: pendingItem.url,
        thumbnailUrl: pendingItem.thumbnailUrl,
        category: toDbCategory(processingResult.category),
        tags: processingResult.tags || pendingItem.tags || [],
        sourceType: "ios_share",
        metadata: {
          originalContent: pendingItem.content,
          contentType: pendingItem.type,
          resolvedViaConversation: true,
        },
      });

      // Mark conversation as resolved
      await updateConversation(body.conversationId, {
        status: "resolved",
        itemId: savedItem.id,
      });

      // Clean up pending item
      deletePendingItem(body.conversationId);

      // Send confirmation notification
      const userId = "default";
      const subscription = await getPushSubscription(userId);
      if (subscription) {
        await sendConfirmationNotification(
          subscription,
          savedItem.title,
          savedItem.category,
          savedItem.id,
        );
      }

      const response: ConversationReplyResponse = {
        resolved: true,
        item: savedItem,
      };

      return NextResponse.json(response);
    }

    // Not resolved - add follow-up question
    if (processingResult.followUp) {
      await addMessageToConversation(body.conversationId, {
        role: "assistant",
        content: processingResult.followUp,
        timestamp: new Date().toISOString(),
      });
    }

    const response: ConversationReplyResponse = {
      resolved: false,
      followUp: processingResult.followUp || undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Conversation reply error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { resolved: false, error: errorMessage },
      { status: 500 },
    );
  }
}

/**
 * Process user's reply to determine category or generate follow-up.
 */
async function processReply(
  originalContent: {
    type: "url" | "image" | "text";
    content: string;
    title?: string;
    description?: string;
  },
  conversationHistory: Array<{ role: "assistant" | "user"; content: string }>,
  userReply: string,
): Promise<ReplyProcessingResult> {
  const response = await chat(
    [
      { role: "system", content: REPLY_PROCESSING_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildReplyProcessingPrompt(
          originalContent,
          conversationHistory,
          userReply,
        ),
      },
    ],
    { jsonMode: true, maxTokens: 200 },
  );

  return parseJsonResponse<ReplyProcessingResult>(response);
}
