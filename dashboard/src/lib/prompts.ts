import { AI_CATEGORIES, type AICategory } from "@/types";

/**
 * System prompt for content categorization.
 * Designed to be concise and focused for cost efficiency.
 */
export const CATEGORIZATION_SYSTEM_PROMPT = `You are a personal content organizer. Categorize shared content into the most appropriate category.

Categories:
- reading: Articles, blog posts, documentation, newsletters
- watch: Videos, movies, TV shows, livestreams
- listen: Podcasts, music, audiobooks, audio content
- research: Academic papers, studies, technical deep-dives, reference material
- social: Social media posts, profiles, community content
- tasks: Action items, reminders, things to do
- ideas: Thoughts, inspiration, brainstorming, creative concepts
- uncategorized: Content that doesn't fit other categories

Respond with JSON only.`;

/**
 * User prompt template for categorization.
 */
export function buildCategorizationPrompt(
  type: "url" | "image" | "text",
  content: string,
  parsedContent?: { title?: string; description?: string },
): string {
  let contentDescription = "";

  if (type === "url") {
    contentDescription = `URL: ${content}`;
    if (parsedContent?.title) {
      contentDescription += `\nTitle: ${parsedContent.title}`;
    }
    if (parsedContent?.description) {
      contentDescription += `\nDescription: ${parsedContent.description}`;
    }
  } else if (type === "text") {
    contentDescription = `Text: ${content}`;
  } else {
    contentDescription = "See attached image.";
  }

  return `Categorize this content:

${contentDescription}

Respond with JSON:
{
  "category": "one of: ${AI_CATEGORIES.join(", ")}",
  "tags": ["2-5 relevant tags"],
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;
}

/**
 * System prompt for URL content parsing.
 */
export const URL_PARSING_SYSTEM_PROMPT = `Extract key information from webpage content. Be concise and accurate.

Respond with JSON only.`;

/**
 * User prompt template for URL content parsing.
 */
export function buildUrlParsingPrompt(url: string, rawContent: string): string {
  // Truncate content if too long (cost-conscious)
  const maxLength = 4000;
  const truncatedContent =
    rawContent.length > maxLength
      ? rawContent.substring(0, maxLength) + "...[truncated]"
      : rawContent;

  return `Extract title and description from this webpage:

URL: ${url}

Page content:
${truncatedContent}

Respond with JSON:
{
  "title": "page title or best summary",
  "description": "1-2 sentence description of the content"
}`;
}

/**
 * System prompt for image analysis and categorization.
 */
export const IMAGE_ANALYSIS_SYSTEM_PROMPT = `Analyze the image to understand its content and purpose. Categorize it appropriately.

Categories:
- reading: Screenshots of articles, documentation, text content
- watch: Video thumbnails, movie posters, TV show images
- listen: Podcast artwork, album covers, audio-related images
- research: Charts, diagrams, academic content, data visualizations
- social: Social media screenshots, profiles, memes
- tasks: Task lists, reminders, calendar screenshots
- ideas: Inspiration images, mood boards, creative references
- uncategorized: Unclear or doesn't fit other categories

Respond with JSON only.`;

/**
 * User prompt for image categorization.
 */
export const IMAGE_CATEGORIZATION_PROMPT = `Analyze this image and categorize it.

Respond with JSON:
{
  "title": "brief descriptive title",
  "description": "what the image shows",
  "category": "one of: ${AI_CATEGORIES.join(", ")}",
  "tags": ["2-5 relevant tags"],
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

/**
 * System prompt for generating clarification questions.
 */
export const CLARIFICATION_SYSTEM_PROMPT = `You help users organize their saved content. When the content category is unclear, ask a brief, friendly clarifying question to understand their intent.

Keep questions:
- Short (1-2 sentences)
- Specific to the content
- Easy to answer quickly

Examples:
- "Is this for reading later or research?"
- "Want me to save this as a task or just an idea?"
- "Is this a video to watch or reference material?"`;

/**
 * Build clarification prompt based on the uncertain categorization.
 */
export function buildClarificationPrompt(
  type: "url" | "image" | "text",
  content: string,
  currentGuess: {
    category: AICategory;
    confidence: number;
    reasoning?: string;
  },
  parsedContent?: { title?: string; description?: string },
): string {
  let contentSummary = "";

  if (type === "url") {
    contentSummary = parsedContent?.title || content;
  } else if (type === "text") {
    contentSummary =
      content.length > 100 ? content.substring(0, 100) + "..." : content;
  } else {
    contentSummary = parsedContent?.description || "an image";
  }

  return `The user shared: "${contentSummary}"

My best guess is "${currentGuess.category}" (${Math.round(currentGuess.confidence * 100)}% confident).
${currentGuess.reasoning ? `Reasoning: ${currentGuess.reasoning}` : ""}

Generate a brief, friendly clarifying question to confirm the right category. The question should be natural for a mobile notification - something the user can quickly reply to.`;
}

/**
 * System prompt for processing user replies in clarification flow.
 */
export const REPLY_PROCESSING_SYSTEM_PROMPT = `You're helping a user categorize content they've saved. Based on their reply, determine the final category and tags.

Categories:
- reading: Articles, blog posts, documentation, newsletters
- watch: Videos, movies, TV shows, livestreams
- listen: Podcasts, music, audiobooks, audio content
- research: Academic papers, studies, technical deep-dives, reference material
- social: Social media posts, profiles, community content
- tasks: Action items, reminders, things to do
- ideas: Thoughts, inspiration, brainstorming, creative concepts
- uncategorized: Content that doesn't fit other categories

If the user's reply clearly indicates a category, use it. If still unclear, ask ONE more follow-up question.

Respond with JSON only.`;

/**
 * Build prompt for processing user's reply.
 */
export function buildReplyProcessingPrompt(
  originalContent: {
    type: "url" | "image" | "text";
    content: string;
    title?: string;
    description?: string;
  },
  conversationHistory: Array<{ role: "assistant" | "user"; content: string }>,
  userReply: string,
): string {
  const historyText = conversationHistory
    .map(
      (m) => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`,
    )
    .join("\n");

  return `Original content:
Type: ${originalContent.type}
${originalContent.title ? `Title: ${originalContent.title}` : ""}
${originalContent.description ? `Description: ${originalContent.description}` : ""}
${originalContent.type === "url" || originalContent.type === "text" ? `Content: ${originalContent.content.substring(0, 200)}...` : "An image was shared"}

Conversation so far:
${historyText}
User: ${userReply}

Determine if we can now categorize this content confidently.

Respond with JSON:
{
  "resolved": true/false,
  "category": "category if resolved",
  "tags": ["tags if resolved"],
  "followUp": "follow-up question if not resolved (null if resolved)"
}`;
}
