/**
 * Tag Embedding Service
 *
 * Generates embeddings for tags and infers categories using AI.
 * Enables semantic filtering of items by tag similarity.
 */

import OpenAI from "openai";
import { createLLMClient } from "@/lib/services/ai/llm";
import {
  createTrace,
  flushLangfuse,
} from "@/lib/services/ai/observability/langfuse";
import { generateContentHash } from "./generate";

let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    openaiInstance = new OpenAI({ apiKey });
  }
  return openaiInstance;
}

// Category types for tag classification
export type TagCategory =
  | "food"
  | "tech"
  | "music"
  | "entertainment"
  | "fitness"
  | "travel"
  | "work"
  | "learning"
  | "finance"
  | "social"
  | "uncategorized";

// Map of category to neon glow class
export const CATEGORY_GLOW_MAP: Record<TagCategory, string> = {
  food: "shadow-glow-food",
  tech: "shadow-glow-tech",
  music: "shadow-glow-music",
  entertainment: "shadow-glow-entertainment",
  fitness: "shadow-glow-fitness",
  travel: "shadow-glow-travel",
  work: "shadow-glow-work",
  learning: "shadow-glow-learning",
  finance: "shadow-glow-finance",
  social: "shadow-glow-social",
  uncategorized: "shadow-glow-default",
};

// Map of category to border glow class
export const CATEGORY_BORDER_MAP: Record<TagCategory, string> = {
  food: "border-glow-food",
  tech: "border-glow-tech",
  music: "border-glow-music",
  entertainment: "border-glow-entertainment",
  fitness: "border-glow-fitness",
  travel: "border-glow-travel",
  work: "border-glow-work",
  learning: "border-glow-learning",
  finance: "border-glow-finance",
  social: "border-glow-social",
  uncategorized: "border-glow-default",
};

// Map of category to neon dot class (for activity widget)
export const CATEGORY_DOT_MAP: Record<TagCategory, string> = {
  food: "neon-dot-food",
  tech: "neon-dot-tech",
  music: "neon-dot-music",
  entertainment: "neon-dot-entertainment",
  fitness: "neon-dot-fitness",
  travel: "neon-dot-travel",
  work: "neon-dot-work",
  learning: "neon-dot-learning",
  finance: "neon-dot-finance",
  social: "neon-dot-social",
  uncategorized: "neon-dot-default",
};

export interface TagEmbeddingInput {
  tagName: string;
  userId: string;
  context?: string; // Optional context to improve embedding quality
}

export interface TagWithCategory {
  tagName: string;
  normalizedName: string;
  category: TagCategory;
  embedding: number[];
  contentHash: string;
}

export interface TagEmbeddingResult {
  tags: TagWithCategory[];
  cached: number;
  generated: number;
}

// Category inference prompt
const CATEGORY_INFERENCE_PROMPT = `You are a category classifier. Classify the given tag into exactly ONE of these categories:

Categories:
- food: restaurants, recipes, ingredients, cuisines, dining, cooking, meals, groceries
- tech: AI, software, hardware, programming, apps, gadgets, startups, coding, APIs
- music: artists, albums, songs, instruments, concerts, genres, playlists, podcasts about music
- entertainment: movies, TV shows, games, streaming, celebrities, anime, books, comics
- fitness: exercise, sports, health, wellness, nutrition, workouts, gym, running
- travel: destinations, hotels, flights, experiences, tourism, vacations, places, landmarks
- work: productivity, meetings, projects, career, business, office, management
- learning: education, courses, tutorials, research, articles, documentation, study
- finance: investing, budgeting, crypto, banking, money, stocks, trading
- social: people, events, relationships, networking, parties, gatherings, friends

Respond with ONLY the category name, nothing else.

Tag: "{tag}"
Category:`;

/**
 * Normalize a tag for deduplication
 */
export function normalizeTagName(tag: string): string {
  return tag.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Infer category for a tag using AI
 */
export async function inferCategoryFromTag(
  tagName: string,
  userId: string,
): Promise<TagCategory> {
  const trace = createTrace("infer_tag_category", {
    userId,
    requestType: "execution",
    model: "gpt-4o-mini",
  });

  const span = trace.span("category_inference");

  try {
    const openai = getOpenAI();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 20,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: CATEGORY_INFERENCE_PROMPT.replace("{tag}", tagName),
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "uncategorized";
    const inferredCategory = content.toLowerCase().trim() as TagCategory;

    // Validate the category
    const validCategories: TagCategory[] = [
      "food",
      "tech",
      "music",
      "entertainment",
      "fitness",
      "travel",
      "work",
      "learning",
      "finance",
      "social",
      "uncategorized",
    ];

    const category = validCategories.includes(inferredCategory)
      ? inferredCategory
      : "uncategorized";

    span.end({ output: { tag: tagName, category } });
    return category;
  } catch (error) {
    span.error(error instanceof Error ? error : new Error(String(error)));
    return "uncategorized";
  } finally {
    await flushLangfuse();
  }
}

/**
 * Generate embedding for a single tag
 */
export async function generateTagEmbedding(
  input: TagEmbeddingInput,
): Promise<TagWithCategory> {
  const trace = createTrace("generate_tag_embedding", {
    userId: input.userId,
    requestType: "execution",
    model: "gpt-4o-mini", // Placeholder for tracing (actual embedding model is text-embedding-3-small)
  });

  const span = trace.span("tag_embedding");

  try {
    const client = createLLMClient({ userId: input.userId });
    const normalizedName = normalizeTagName(input.tagName);

    // Create embedding content with optional context
    const embeddingContent = input.context
      ? `${input.tagName}: ${input.context}`
      : input.tagName;

    // Generate embedding
    const embeddingResult = await client.embed({ content: embeddingContent });

    // Infer category
    const category = await inferCategoryFromTag(input.tagName, input.userId);

    const result: TagWithCategory = {
      tagName: input.tagName,
      normalizedName,
      category,
      embedding: embeddingResult.embedding,
      contentHash: generateContentHash(normalizedName),
    };

    span.end({
      output: {
        tag: input.tagName,
        category,
        embeddingDimensions: embeddingResult.embedding.length,
      },
    });

    return result;
  } catch (error) {
    span.error(error instanceof Error ? error : new Error(String(error)));
    throw error;
  } finally {
    await flushLangfuse();
  }
}

/**
 * Generate embeddings for multiple tags in batch
 */
export async function batchGenerateTagEmbeddings(
  tags: string[],
  userId: string,
  existingNormalizedNames?: Set<string>,
): Promise<TagEmbeddingResult> {
  const trace = createTrace("batch_tag_embeddings", {
    userId,
    requestType: "execution",
    model: "gpt-4o-mini", // Placeholder for tracing (actual embedding model is text-embedding-3-small)
  });

  const span = trace.span("batch_tag_embedding");

  try {
    const results: TagWithCategory[] = [];
    let cached = 0;
    let generated = 0;

    for (const tag of tags) {
      const normalizedName = normalizeTagName(tag);

      // Skip if already exists
      if (existingNormalizedNames?.has(normalizedName)) {
        cached++;
        continue;
      }

      const embedding = await generateTagEmbedding({ tagName: tag, userId });
      results.push(embedding);
      generated++;
    }

    span.end({
      output: {
        totalTags: tags.length,
        generated,
        cached,
      },
    });

    return { tags: results, cached, generated };
  } catch (error) {
    span.error(error instanceof Error ? error : new Error(String(error)));
    throw error;
  } finally {
    await flushLangfuse();
  }
}

/**
 * Infer the dominant category from a list of tags
 * Used to determine card glow color
 */
export async function inferDominantCategory(
  tags: string[],
  userId: string,
): Promise<TagCategory> {
  if (tags.length === 0) {
    return "uncategorized";
  }

  // Get categories for all tags
  const categories = await Promise.all(
    tags.map((tag) => inferCategoryFromTag(tag, userId)),
  );

  // Count occurrences
  const counts: Record<TagCategory, number> = {
    food: 0,
    tech: 0,
    music: 0,
    entertainment: 0,
    fitness: 0,
    travel: 0,
    work: 0,
    learning: 0,
    finance: 0,
    social: 0,
    uncategorized: 0,
  };

  for (const category of categories) {
    counts[category]++;
  }

  // Find the dominant category (excluding uncategorized unless it's the only one)
  let dominant: TagCategory = "uncategorized";
  let maxCount = 0;

  for (const [category, count] of Object.entries(counts) as [
    TagCategory,
    number,
  ][]) {
    if (category !== "uncategorized" && count > maxCount) {
      maxCount = count;
      dominant = category;
    }
  }

  // If all tags are uncategorized, return uncategorized
  if (maxCount === 0) {
    dominant = "uncategorized";
  }

  return dominant;
}

/**
 * Get glow class for a category
 */
export function getGlowClassForCategory(category: TagCategory): string {
  return CATEGORY_GLOW_MAP[category] || CATEGORY_GLOW_MAP.uncategorized;
}

/**
 * Get border class for a category
 */
export function getBorderClassForCategory(category: TagCategory): string {
  return CATEGORY_BORDER_MAP[category] || CATEGORY_BORDER_MAP.uncategorized;
}

/**
 * Get dot class for a category (activity widget)
 */
export function getDotClassForCategory(category: TagCategory): string {
  return CATEGORY_DOT_MAP[category] || CATEGORY_DOT_MAP.uncategorized;
}
