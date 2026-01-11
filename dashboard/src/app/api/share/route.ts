import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/openai";
import { processUrl, processImage, processText } from "@/lib/processors";
import {
  CLARIFICATION_SYSTEM_PROMPT,
  buildClarificationPrompt,
} from "@/lib/prompts";
import {
  saveItem,
  createConversation,
  getPushSubscription,
} from "@/lib/storage";
import { sendClarificationNotification } from "@/lib/push";
import {
  toDbCategory,
  type ShareRequest,
  type ShareResponse,
  type CategorizationResult,
  type ParsedContent,
  type PendingItem,
} from "@/types";

// Confidence threshold - below this, we ask for clarification
const CONFIDENCE_THRESHOLD = 0.7;

/**
 * POST /api/share
 *
 * Main entry point for iOS Shortcut or PWA share.
 * Processes content, categorizes with AI, and either saves directly
 * or initiates a clarification conversation.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as ShareRequest;

    // Validate request
    if (!body.type || !body.content) {
      return NextResponse.json(
        { success: false, error: "Missing type or content" },
        { status: 400 },
      );
    }

    if (!["url", "image", "text"].includes(body.type)) {
      return NextResponse.json(
        { success: false, error: "Invalid type. Must be url, image, or text" },
        { status: 400 },
      );
    }

    if (body.type === "image" && !body.imageBase64) {
      return NextResponse.json(
        { success: false, error: "Image type requires imageBase64" },
        { status: 400 },
      );
    }

    // Process based on content type
    let parsedContent: ParsedContent;
    let categorization: CategorizationResult;

    switch (body.type) {
      case "url":
        ({ parsedContent, categorization } = await processUrl(body.content));
        break;

      case "image":
        ({ parsedContent, categorization } = await processImage(
          body.imageBase64!,
        ));
        break;

      case "text":
        ({ parsedContent, categorization } = await processText(body.content));
        break;
    }

    // Check confidence level
    if (categorization.confidence >= CONFIDENCE_THRESHOLD) {
      // High confidence - save directly
      const savedItem = await saveItem({
        title: parsedContent.title,
        content: parsedContent.description,
        url: parsedContent.url,
        thumbnailUrl: parsedContent.imageUrl,
        category: toDbCategory(categorization.category),
        tags: categorization.tags,
        sourceType: "ios_share",
        metadata: {
          originalContent: body.content,
          contentType: body.type,
          aiConfidence: categorization.confidence,
          aiReasoning: categorization.reasoning,
        },
      });

      const response: ShareResponse = {
        success: true,
        item: savedItem,
      };

      return NextResponse.json(response);
    }

    // Low confidence - need clarification
    const clarificationQuestion = await generateClarificationQuestion(
      body.type,
      body.content,
      categorization,
      parsedContent,
    );

    // Create pending item for later saving
    const pendingItem: PendingItem = {
      type: body.type,
      title: parsedContent.title,
      description: parsedContent.description,
      content: body.content,
      url: parsedContent.url,
      thumbnailUrl: parsedContent.imageUrl,
      category: categorization.category,
      tags: categorization.tags,
    };

    // Create conversation for clarification
    const conversation = await createConversation({
      pendingItem,
      initialQuestion: clarificationQuestion,
    });

    // Try to send push notification
    // For now we use a placeholder user ID - in production this would come from auth
    const userId = "default";
    const subscription = await getPushSubscription(userId);
    if (subscription) {
      await sendClarificationNotification(
        subscription,
        clarificationQuestion,
        conversation.id,
        parsedContent.title,
      );
    }

    const response: ShareResponse = {
      success: true,
      needsClarification: true,
      question: clarificationQuestion,
      conversationId: conversation.id,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Share endpoint error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}

/**
 * Generate a natural clarification question using AI.
 */
async function generateClarificationQuestion(
  type: "url" | "image" | "text",
  content: string,
  categorization: CategorizationResult,
  parsedContent: ParsedContent,
): Promise<string> {
  const response = await chat(
    [
      { role: "system", content: CLARIFICATION_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildClarificationPrompt(type, content, categorization, {
          title: parsedContent.title,
          description: parsedContent.description,
        }),
      },
    ],
    { maxTokens: 100 },
  );

  // Clean up the response - just return the question text
  return response.trim().replace(/^["']|["']$/g, "");
}
