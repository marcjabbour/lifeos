/**
 * Nova Activity Tracking
 *
 * Tracks Nova's actions for the activity feed widget.
 * Activities are displayed in the sidebar to show users what Nova is doing.
 */

import { getServiceClient } from "@/lib/core/database";

/**
 * Dot colors for different activity types
 */
export type NovaActivityDotColor =
  | "purple" // Tech/AI content
  | "amber" // Work/productivity
  | "green" // Fitness/health
  | "cyan" // Music/audio
  | "pink" // Entertainment
  | "blue" // Travel/places
  | "coral" // Food/restaurants
  | "gray"; // General/default

/**
 * Common activity types
 */
export type NovaActivityType =
  | "enriched" // Enriched content with AI analysis
  | "categorized" // Auto-categorized content
  | "connected" // Found connections to other items
  | "organized" // Organized or grouped content
  | "processed" // Basic processing completed
  | "analyzed" // Analyzed image/audio
  | "reminded" // Created a reminder
  | "saved"; // Saved new content

/**
 * Map content type to dot color
 */
function getColorForContentType(contentType: string): NovaActivityDotColor {
  const colorMap: Record<string, NovaActivityDotColor> = {
    // Food & Dining
    restaurant: "coral",
    food: "coral",
    recipe: "coral",
    // Tech & Learning
    article: "purple",
    tech: "purple",
    code: "purple",
    repository: "purple",
    tutorial: "purple",
    // Music & Audio
    music: "cyan",
    audio: "cyan",
    podcast: "cyan",
    // Entertainment
    video: "pink",
    movie: "pink",
    entertainment: "pink",
    // Travel & Places
    travel: "blue",
    place: "blue",
    // Fitness & Health
    fitness: "green",
    health: "green",
    workout: "green",
    // Work & Productivity
    work: "amber",
    task: "amber",
    reminder: "amber",
    note: "amber",
  };

  return colorMap[contentType.toLowerCase()] || "gray";
}

/**
 * Track a Nova activity
 */
export async function trackNovaActivity({
  userId,
  actionType,
  actionSummary,
  rationale,
  itemId,
  contentType,
  dotColor,
}: {
  userId: string;
  actionType: NovaActivityType;
  actionSummary: string;
  rationale?: string;
  itemId?: string;
  contentType?: string;
  dotColor?: NovaActivityDotColor;
}): Promise<{ success: boolean; activityId?: string; error?: string }> {
  try {
    const supabase = getServiceClient();

    // Determine dot color based on content type if not provided
    const color =
      dotColor ||
      (contentType ? getColorForContentType(contentType) : "purple");

    const { data, error } = await supabase
      .from("nova_activity")
      .insert({
        user_id: userId,
        action_type: actionType,
        action_summary: actionSummary,
        rationale: rationale || null,
        item_id: itemId || null,
        dot_color: color,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[NovaActivity] Failed to track activity:", error);
      return { success: false, error: error.message };
    }

    console.log(`[NovaActivity] Tracked: ${actionType} - ${actionSummary}`);
    return { success: true, activityId: data.id };
  } catch (error) {
    console.error("[NovaActivity] Error tracking activity:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Track item enrichment activity
 */
export async function trackEnrichment({
  userId,
  itemId,
  title,
  contentType,
  summary,
  topics,
}: {
  userId: string;
  itemId: string;
  title?: string;
  contentType: string;
  summary?: string;
  topics?: string[];
}): Promise<void> {
  const itemTitle = title || "content";
  const topicText = topics?.length
    ? ` about ${topics.slice(0, 2).join(" and ")}`
    : "";

  await trackNovaActivity({
    userId,
    actionType: "enriched",
    actionSummary: `Enriched ${contentType}${topicText}`,
    rationale: summary
      ? `You shared "${itemTitle}". ${summary.slice(0, 200)}${summary.length > 200 ? "..." : ""}`
      : `You shared "${itemTitle}". I analyzed it and extracted key information for you.`,
    itemId,
    contentType,
  });
}

/**
 * Track new item saved activity
 */
export async function trackItemSaved({
  userId,
  itemId,
  title,
  contentType,
  source,
}: {
  userId: string;
  itemId: string;
  title?: string;
  contentType: string;
  source?: string;
}): Promise<void> {
  const itemTitle = title || "item";
  const sourceText = source ? ` from ${source}` : "";

  await trackNovaActivity({
    userId,
    actionType: "saved",
    actionSummary: `Saved new ${contentType}${sourceText}`,
    rationale: `You shared "${itemTitle}"${sourceText}. I've saved it to your collection and will process it shortly.`,
    itemId,
    contentType,
  });
}

/**
 * Track image analysis activity
 */
export async function trackImageAnalysis({
  userId,
  itemId,
  title,
  description,
}: {
  userId: string;
  itemId: string;
  title?: string;
  description?: string;
}): Promise<void> {
  await trackNovaActivity({
    userId,
    actionType: "analyzed",
    actionSummary: `Analyzed image: ${title || "Screenshot"}`,
    rationale: description
      ? `You shared an image. ${description.slice(0, 200)}${description.length > 200 ? "..." : ""}`
      : `You shared an image. I analyzed it to understand what it contains.`,
    itemId,
    contentType: "image",
    dotColor: "purple",
  });
}

/**
 * Track connections found activity
 */
export async function trackConnectionsFound({
  userId,
  itemId,
  title,
  connectionCount,
  relatedTopics,
}: {
  userId: string;
  itemId: string;
  title?: string;
  connectionCount: number;
  relatedTopics?: string[];
}): Promise<void> {
  const topicText = relatedTopics?.length
    ? ` related to ${relatedTopics.slice(0, 2).join(" and ")}`
    : "";

  await trackNovaActivity({
    userId,
    actionType: "connected",
    actionSummary: `Found ${connectionCount} connection${connectionCount > 1 ? "s" : ""} to existing items`,
    rationale: `While processing "${title || "your content"}", I noticed it connects to ${connectionCount} item${connectionCount > 1 ? "s" : ""} you've saved before${topicText}.`,
    itemId,
    dotColor: "amber",
  });
}

/**
 * Track categorization activity
 */
export async function trackCategorization({
  userId,
  itemId,
  title,
  category,
  tags,
}: {
  userId: string;
  itemId: string;
  title?: string;
  category: string;
  tags?: string[];
}): Promise<void> {
  const tagText = tags?.length
    ? ` and tagged with ${tags.slice(0, 3).join(", ")}`
    : "";

  await trackNovaActivity({
    userId,
    actionType: "categorized",
    actionSummary: `Categorized as ${category}${tagText}`,
    rationale: `I categorized "${title || "your content"}" as ${category}${tagText} based on its content.`,
    itemId,
    contentType: category,
  });
}
