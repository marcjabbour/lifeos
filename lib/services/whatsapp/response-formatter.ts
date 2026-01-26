/**
 * WhatsApp Response Formatter
 *
 * Formats rich responses for WhatsApp messages.
 * Handles emoji mapping, truncation, and link formatting.
 */

// Category to emoji mapping
const CATEGORY_EMOJIS: Record<string, string> = {
  food: "🍽️",
  tech: "💻",
  music: "🎵",
  entertainment: "🎬",
  fitness: "💪",
  travel: "✈️",
  work: "💼",
  learning: "📚",
  finance: "💰",
  social: "👥",
  uncategorized: "📌",
};

// Maximum items to show in a list
const MAX_LIST_ITEMS = 5;

// Maximum message length for WhatsApp
const MAX_MESSAGE_LENGTH = 1600;

export interface FeedItemSummary {
  id: string;
  title: string;
  category?: string;
  url?: string;
  source?: string;
  savedAt?: string;
}

/**
 * Get emoji for a category
 */
export function getCategoryEmoji(category: string): string {
  return CATEGORY_EMOJIS[category.toLowerCase()] || "📌";
}

/**
 * Format a single item for WhatsApp display
 */
export function formatItem(item: FeedItemSummary, index?: number): string {
  const emoji = getCategoryEmoji(item.category || "uncategorized");
  const prefix = index !== undefined ? `${index + 1}. ` : "";
  const title = truncateText(item.title, 50);
  const source = item.source ? ` (${item.source})` : "";

  return `${prefix}${emoji} ${title}${source}`;
}

/**
 * Format a list of items for WhatsApp display
 */
export function formatItemList(
  items: FeedItemSummary[],
  header?: string,
): string {
  const displayItems = items.slice(0, MAX_LIST_ITEMS);
  const hasMore = items.length > MAX_LIST_ITEMS;

  const lines: string[] = [];

  if (header) {
    lines.push(header);
    lines.push("");
  }

  displayItems.forEach((item, index) => {
    lines.push(formatItem(item, index));
  });

  if (hasMore) {
    lines.push("");
    lines.push(
      `📱 Open LifeOS to see ${items.length - MAX_LIST_ITEMS} more items`,
    );
  }

  return lines.join("\n");
}

/**
 * Format a save confirmation message
 */
export function formatSaveConfirmation(
  title: string,
  category?: string,
  jobId?: string,
): string {
  const emoji = getCategoryEmoji(category || "uncategorized");
  const processing = jobId ? "\n\n⏳ Nova is enriching this item..." : "";

  return `✅ Saved!\n\n${emoji} ${truncateText(title, 60)}${processing}`;
}

/**
 * Format a search results message
 */
export function formatSearchResults(
  query: string,
  items: FeedItemSummary[],
  total: number,
): string {
  if (items.length === 0) {
    return `🔍 No results found for "${query}"`;
  }

  return formatItemList(items, `🔍 Found ${total} items for "${query}":`);
}

/**
 * Format a Nova answer response
 */
export function formatNovaAnswer(
  answer: string,
  items?: FeedItemSummary[],
): string {
  let response = `🤖 ${answer}`;

  if (items && items.length > 0) {
    response += "\n\n";
    response += formatItemList(items, "Related items:");
  }

  return truncateText(response, MAX_MESSAGE_LENGTH);
}

/**
 * Format category counts
 */
export function formatCategories(
  categories: Array<{ category: string; count: number }>,
): string {
  const lines = ["📊 Your saved items by category:", ""];

  for (const { category, count } of categories) {
    const emoji = getCategoryEmoji(category);
    lines.push(`${emoji} ${capitalize(category)}: ${count}`);
  }

  return lines.join("\n");
}

/**
 * Format a welcome message for new users
 */
export function formatWelcomeMessage(displayName?: string): string {
  const greeting = displayName ? `Hi ${displayName}!` : "Welcome!";

  return `${greeting} 🎉

Your WhatsApp is now linked to LifeOS.

Here's what you can do:
📎 Send links to save articles & pages
📷 Send screenshots to capture with OCR
💬 Send text to save as notes
❓ Ask questions about your saved content

Try sending a link to get started!`;
}

/**
 * Format an error message
 */
export function formatErrorMessage(error: string): string {
  return `❌ Sorry, something went wrong.\n\n${error}`;
}

/**
 * Format a verification prompt
 */
export function formatVerificationPrompt(): string {
  return `👋 Welcome to LifeOS!

To link your WhatsApp, please send the 6-digit code shown in LifeOS settings.

Don't have a code? Open LifeOS → Settings → WhatsApp → Generate Code`;
}

/**
 * Format help message
 */
export function formatHelpMessage(): string {
  return `📚 LifeOS WhatsApp Commands

Send content:
• Share a URL to save it
• Send a screenshot to capture with OCR
• Type anything to save as a note

Query your content:
• "What did I save today?"
• "Find my tech articles"
• "Search for restaurants"

Commands:
• /recent - Show recent items
• /search [query] - Search items
• /help - Show this message

Learn more at lifeos.app/whatsapp`;
}

/**
 * Format a clarification request message
 *
 * Used when Nova detects ambiguity in the user's input
 */
export interface ClarificationOption {
  type: string;
  label: string;
  confidence?: number;
}

export function formatClarificationRequest(
  originalContent: string,
  options: ClarificationOption[],
  reason?: string,
): string {
  const lines: string[] = [];

  lines.push(
    `🤔 I'm not sure what "${truncateText(originalContent, 30)}" refers to.`,
  );

  if (reason) {
    lines.push("");
    lines.push(reason);
  }

  lines.push("");
  lines.push("Which did you mean?");
  lines.push("");

  options.forEach((option, index) => {
    const emoji = getTypeEmoji(option.type);
    lines.push(`${index + 1}) ${emoji} ${option.label}`);
  });

  lines.push("");
  lines.push("Reply with a number (1, 2, etc.) or describe what you meant.");

  return lines.join("\n");
}

/**
 * Get emoji for content type
 */
function getTypeEmoji(type: string): string {
  const typeEmojis: Record<string, string> = {
    restaurant: "🍽️",
    place: "📍",
    book: "📚",
    movie: "🎬",
    video: "📺",
    article: "📰",
    product: "🛍️",
    reminder: "⏰",
    note: "📝",
    music: "🎵",
    podcast: "🎙️",
    recipe: "👨‍🍳",
    other: "📌",
  };
  return typeEmojis[type.toLowerCase()] || "📌";
}

/**
 * Truncate text to a maximum length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}
