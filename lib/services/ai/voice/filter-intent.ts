/**
 * Voice Filter Intent Parsing
 *
 * Parses natural language voice commands into filter parameters
 * for the Intelligence Feed.
 *
 * Examples:
 * - "show me all food related items" -> { categories: ['food'] }
 * - "find tech and AI stuff" -> { categories: ['tech'] }
 * - "search for restaurants" -> { searchQuery: 'restaurants', categories: ['food'] }
 */

import OpenAI from "openai";
import { TagCategory } from "@/lib/services/ai/embeddings/tags";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface FilterIntent {
  categories: TagCategory[];
  searchQuery?: string;
  action: "filter" | "search" | "clear" | "unknown";
  confidence: number;
}

// Category keywords for quick matching (fallback if OpenAI unavailable)
const CATEGORY_KEYWORDS: Record<TagCategory, string[]> = {
  food: [
    "food",
    "restaurant",
    "dining",
    "eat",
    "recipe",
    "cooking",
    "meal",
    "cuisine",
    "lunch",
    "dinner",
    "breakfast",
  ],
  tech: [
    "tech",
    "technology",
    "ai",
    "artificial intelligence",
    "software",
    "programming",
    "code",
    "computer",
    "app",
    "digital",
  ],
  music: [
    "music",
    "song",
    "album",
    "artist",
    "playlist",
    "concert",
    "audio",
    "podcast",
    "listen",
  ],
  entertainment: [
    "entertainment",
    "movie",
    "film",
    "tv",
    "show",
    "series",
    "netflix",
    "streaming",
    "video",
    "game",
  ],
  fitness: [
    "fitness",
    "health",
    "workout",
    "exercise",
    "gym",
    "running",
    "yoga",
    "wellness",
    "diet",
  ],
  travel: [
    "travel",
    "trip",
    "vacation",
    "destination",
    "hotel",
    "flight",
    "place",
    "location",
    "visit",
  ],
  work: [
    "work",
    "productivity",
    "business",
    "project",
    "task",
    "meeting",
    "office",
    "professional",
  ],
  learning: [
    "learning",
    "education",
    "study",
    "course",
    "book",
    "reading",
    "article",
    "tutorial",
    "lesson",
  ],
  finance: [
    "finance",
    "money",
    "investment",
    "stock",
    "crypto",
    "budget",
    "banking",
    "saving",
  ],
  social: [
    "social",
    "friend",
    "family",
    "event",
    "party",
    "gathering",
    "people",
    "relationship",
  ],
  uncategorized: ["other", "misc", "general", "everything", "all"],
};

/**
 * Parse a voice command into filter intent using AI
 */
export async function parseFilterIntent(
  voiceCommand: string,
): Promise<FilterIntent> {
  const normalizedCommand = voiceCommand.toLowerCase().trim();

  // Check for clear/reset commands
  if (
    normalizedCommand.includes("clear") ||
    normalizedCommand.includes("reset") ||
    normalizedCommand.includes("show all") ||
    normalizedCommand.includes("show everything")
  ) {
    return {
      categories: [],
      action: "clear",
      confidence: 0.95,
    };
  }

  try {
    // Use GPT-4o-mini for intelligent parsing
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a filter intent parser for an Intelligence Feed app. Parse the user's voice command into structured filter parameters.

Available categories: food, tech, music, entertainment, fitness, travel, work, learning, finance, social, uncategorized

Respond with JSON only:
{
  "categories": ["category1", "category2"],  // Array of matching categories
  "searchQuery": "optional search term",      // If they're searching for something specific
  "action": "filter" | "search" | "clear",   // What they want to do
  "confidence": 0.0-1.0                       // How confident you are
}

Examples:
- "show me food stuff" -> {"categories": ["food"], "action": "filter", "confidence": 0.9}
- "find articles about AI" -> {"categories": ["tech"], "searchQuery": "AI", "action": "search", "confidence": 0.85}
- "tech and music items" -> {"categories": ["tech", "music"], "action": "filter", "confidence": 0.9}
- "search for restaurants in Paris" -> {"categories": ["food", "travel"], "searchQuery": "restaurants Paris", "action": "search", "confidence": 0.8}`,
        },
        {
          role: "user",
          content: voiceCommand,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const parsed = JSON.parse(content) as FilterIntent;

    // Validate categories
    const validCategories = parsed.categories.filter((cat) =>
      Object.keys(CATEGORY_KEYWORDS).includes(cat),
    ) as TagCategory[];

    return {
      categories: validCategories,
      searchQuery: parsed.searchQuery,
      action: parsed.action || "filter",
      confidence: parsed.confidence || 0.7,
    };
  } catch (error) {
    console.warn("OpenAI parsing failed, using keyword fallback:", error);
    return parseWithKeywords(normalizedCommand);
  }
}

/**
 * Fallback keyword-based parsing
 */
function parseWithKeywords(command: string): FilterIntent {
  const matchedCategories: TagCategory[] = [];
  let highestMatch = 0;

  // Check each category's keywords
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (command.includes(keyword)) {
        if (!matchedCategories.includes(category as TagCategory)) {
          matchedCategories.push(category as TagCategory);
        }
        highestMatch = Math.max(highestMatch, 0.7);
      }
    }
  }

  // Extract potential search query (words after "search", "find", "look for")
  let searchQuery: string | undefined;
  const searchPatterns = [
    /(?:search|find|look for|show me)\s+(.+)/i,
    /(.+)\s+(?:items|stuff|things|content)/i,
  ];

  for (const pattern of searchPatterns) {
    const match = command.match(pattern);
    if (match) {
      // Clean up the search query
      let query = match[1]
        .replace(/\b(all|the|my|about|related|items|stuff|things)\b/gi, "")
        .trim();
      if (query.length > 2) {
        searchQuery = query;
      }
      break;
    }
  }

  // Determine action
  let action: FilterIntent["action"] = "unknown";
  if (matchedCategories.length > 0) {
    action = searchQuery ? "search" : "filter";
  } else if (searchQuery) {
    action = "search";
  }

  return {
    categories: matchedCategories.filter((c) => c !== "uncategorized"),
    searchQuery,
    action,
    confidence: highestMatch || 0.5,
  };
}

/**
 * Quick category detection without AI (for real-time suggestions)
 */
export function detectCategoriesFromText(text: string): TagCategory[] {
  const normalizedText = text.toLowerCase();
  const detected: TagCategory[] = [];

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === "uncategorized") continue;

    for (const keyword of keywords) {
      if (normalizedText.includes(keyword)) {
        if (!detected.includes(category as TagCategory)) {
          detected.push(category as TagCategory);
        }
        break;
      }
    }
  }

  return detected;
}

/**
 * Generate suggested voice commands for the UI
 */
export function getSuggestedCommands(): string[] {
  return [
    "Show me all food items",
    "Find tech and AI content",
    "Search for restaurants",
    "Show music stuff",
    "Find travel destinations",
    "Show learning resources",
    "Clear filters",
  ];
}
