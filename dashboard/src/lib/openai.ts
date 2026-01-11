import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function isRetryableError(error: unknown): boolean {
  if (error instanceof OpenAI.APIError) {
    return (
      error.status === 429 || // Rate limit
      error.status === 500 || // Server error
      error.status === 503 || // Service unavailable
      error.status === 504 // Gateway timeout
    );
  }
  return false;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | OpenAI.Chat.Completions.ChatCompletionContentPart[];
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

/**
 * Convert our ChatMessage type to OpenAI's expected format.
 */
function toOpenAIMessages(
  messages: ChatMessage[],
): ChatCompletionMessageParam[] {
  return messages.map((m): ChatCompletionMessageParam => {
    if (m.role === "system") {
      return { role: "system", content: m.content as string };
    } else if (m.role === "assistant") {
      return { role: "assistant", content: m.content as string };
    } else {
      // user messages can have content parts for vision
      return { role: "user", content: m.content };
    }
  });
}

/**
 * Wrapper function for OpenAI chat completions with error handling and retries.
 * Returns the parsed response content.
 */
export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<string> {
  const {
    model = "gpt-4o",
    temperature = 0.3,
    maxTokens = 1000,
    jsonMode = false,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model,
        messages: toOpenAIMessages(messages),
        temperature,
        max_tokens: maxTokens,
        response_format: jsonMode ? { type: "json_object" } : undefined,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }

      return content;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (isRetryableError(error) && attempt < MAX_RETRIES) {
        // Exponential backoff
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(
          `OpenAI API error (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms:`,
          error,
        );
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

/**
 * Chat with vision support (for image analysis).
 * Uses GPT-4o which supports both text and vision.
 */
export async function chatWithVision(
  systemPrompt: string,
  userPrompt: string,
  imageBase64: string,
  options: Omit<ChatOptions, "model"> = {},
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        { type: "text", text: userPrompt },
        {
          type: "image_url",
          image_url: {
            url: imageBase64.startsWith("data:")
              ? imageBase64
              : `data:image/jpeg;base64,${imageBase64}`,
            detail: "low", // Cost-conscious: use low detail unless needed
          },
        },
      ],
    },
  ];

  return chat(messages, { ...options, model: "gpt-4o" });
}

/**
 * Parse JSON response from OpenAI.
 * Handles both clean JSON and JSON wrapped in markdown code blocks.
 */
export function parseJsonResponse<T>(response: string): T {
  // Try parsing directly first
  try {
    return JSON.parse(response);
  } catch {
    // Try extracting from markdown code block
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }

    // Try finding JSON object/array in the response
    const objectMatch = response.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }

    throw new Error("Could not parse JSON from response");
  }
}

export { openai };
