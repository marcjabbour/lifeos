/**
 * User Profile Learning & Summarization
 *
 * Extracts preferences from user interactions and generates
 * compact summaries for context injection.
 *
 * Model: GPT-4o-mini
 * Target summary: ~300 tokens
 */

import { createLLMClient } from '@/lib/services/ai/llm'
import { PROFILE_EXTRACTION_PROMPT } from '@/lib/services/ai/llm/prompts'
import { createTrace, flushLangfuse } from '@/lib/services/ai/observability/langfuse'

// Profile update threshold
const UPDATE_THRESHOLD = 25 // Update profile every 25 interactions

export interface UserPreferences {
  prefers_deep_analysis?: boolean
  typical_response_style?: 'casual' | 'formal' | 'technical'
  common_topics?: string[]
  interaction_patterns?: {
    usually_wants_action?: boolean
    asks_followups?: 'often' | 'sometimes' | 'rarely'
  }
}

export interface UserProfile {
  userId: string
  preferences: UserPreferences
  summary: string
  totalInteractions: number
  lastProfileUpdate?: Date
  createdAt: Date
  updatedAt: Date
}

export interface InteractionRecord {
  contentType: string
  topics?: string[]
  userAction?: string
  novaAction?: string
  timestamp: Date
}

// In-memory profile cache (should be replaced with database)
const profileCache = new Map<string, UserProfile>()
const interactionCache = new Map<string, InteractionRecord[]>()

/**
 * Get or create a user profile
 */
export async function getProfile(userId: string): Promise<UserProfile | undefined> {
  // Try cache first
  if (profileCache.has(userId)) {
    return profileCache.get(userId)
  }

  // TODO: Fetch from database
  // const { data } = await supabase
  //   .from('user_profile')
  //   .select('*')
  //   .eq('user_id', userId)
  //   .single()

  return undefined
}

/**
 * Load user profile summary for context injection
 */
export async function loadUserProfileSummary(userId: string): Promise<string | undefined> {
  const profile = await getProfile(userId)
  return profile?.summary
}

/**
 * Record a user interaction
 */
export async function recordInteraction(
  userId: string,
  interaction: InteractionRecord
): Promise<void> {
  if (!interactionCache.has(userId)) {
    interactionCache.set(userId, [])
  }

  const interactions = interactionCache.get(userId)!
  interactions.push(interaction)

  // Update profile in cache
  let profile = profileCache.get(userId)
  if (!profile) {
    profile = createNewProfile(userId)
    profileCache.set(userId, profile)
  }

  profile.totalInteractions++
  profile.updatedAt = new Date()

  // Check if profile needs update
  if (shouldUpdateProfile(profile)) {
    await updateProfile(userId, interactions)
  }

  // TODO: Persist interaction to database
}

/**
 * Check if profile should be updated
 */
function shouldUpdateProfile(profile: UserProfile): boolean {
  return profile.totalInteractions % UPDATE_THRESHOLD === 0
}

/**
 * Update user profile based on recent interactions
 */
async function updateProfile(
  userId: string,
  interactions: InteractionRecord[]
): Promise<UserProfile> {
  const trace = createTrace('update_profile', {
    userId,
    requestType: 'summarization',
    model: 'gpt-4o-mini',
  })

  const span = trace.span('profile_extraction')

  try {
    const client = createLLMClient({ userId })

    // Get last 50 interactions for analysis
    const recentInteractions = interactions.slice(-50)

    // Format interactions for analysis
    const interactionSummary = recentInteractions
      .map(
        (i) =>
          `[${i.timestamp.toISOString()}] ${i.contentType}: ${i.topics?.join(', ') || 'no topics'} - User: ${i.userAction || 'none'}, Nova: ${i.novaAction || 'none'}`
      )
      .join('\n')

    // Extract preferences using LLM
    const response = await client.execute({
      action: 'extract_profile',
      params: { interactions: interactionSummary },
      context: PROFILE_EXTRACTION_PROMPT,
    })

    const extracted = response.result.output as {
      preferences: UserPreferences
      summary: string
    }

    // Update profile
    const profile = profileCache.get(userId) || createNewProfile(userId)
    profile.preferences = extracted.preferences || {}
    profile.summary = extracted.summary || generateDefaultSummary(profile)
    profile.lastProfileUpdate = new Date()
    profile.updatedAt = new Date()

    profileCache.set(userId, profile)

    span.end({
      output: {
        preferencesExtracted: Object.keys(extracted.preferences || {}).length,
        summaryLength: profile.summary.length,
      },
    })

    // TODO: Persist to database
    // await supabase
    //   .from('user_profile')
    //   .upsert({
    //     user_id: userId,
    //     preferences: profile.preferences,
    //     summary: profile.summary,
    //     total_interactions: profile.totalInteractions,
    //     last_profile_update: profile.lastProfileUpdate,
    //     updated_at: profile.updatedAt,
    //   })

    return profile
  } catch (error) {
    span.error(error instanceof Error ? error : new Error(String(error)))
    throw error
  } finally {
    await flushLangfuse()
  }
}

/**
 * Create a new profile for a user
 */
function createNewProfile(userId: string): UserProfile {
  return {
    userId,
    preferences: {},
    summary: '',
    totalInteractions: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

/**
 * Generate a default summary when extraction fails
 */
function generateDefaultSummary(profile: UserProfile): string {
  const parts: string[] = []

  if (profile.preferences.prefers_deep_analysis) {
    parts.push('Prefers detailed analysis')
  }

  if (profile.preferences.typical_response_style) {
    parts.push(`${profile.preferences.typical_response_style} communication style`)
  }

  if (profile.preferences.common_topics?.length) {
    parts.push(`Interested in: ${profile.preferences.common_topics.slice(0, 3).join(', ')}`)
  }

  if (profile.preferences.interaction_patterns?.usually_wants_action) {
    parts.push('Usually wants immediate action')
  }

  return parts.length > 0 ? parts.join('. ') + '.' : 'New user, preferences not yet learned.'
}

/**
 * Analyze content patterns from interactions
 */
export function analyzeContentPatterns(interactions: InteractionRecord[]): {
  topics: Map<string, number>
  contentTypes: Map<string, number>
} {
  const topics = new Map<string, number>()
  const contentTypes = new Map<string, number>()

  for (const interaction of interactions) {
    // Count content types
    const currentTypeCount = contentTypes.get(interaction.contentType) || 0
    contentTypes.set(interaction.contentType, currentTypeCount + 1)

    // Count topics
    for (const topic of interaction.topics || []) {
      const currentTopicCount = topics.get(topic) || 0
      topics.set(topic, currentTopicCount + 1)
    }
  }

  return { topics, contentTypes }
}

/**
 * Get top N items from a frequency map
 */
export function getTopItems(map: Map<string, number>, n: number): string[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key]) => key)
}

/**
 * Detect interaction style from patterns
 */
export function detectInteractionStyle(
  interactions: InteractionRecord[]
): UserPreferences['interaction_patterns'] {
  const recentInteractions = interactions.slice(-20)

  if (recentInteractions.length < 5) {
    return {}
  }

  // Count action patterns
  let actionRequests = 0
  let followups = 0
  let totalWithAction = 0

  for (const interaction of recentInteractions) {
    if (interaction.userAction) {
      totalWithAction++
      if (
        interaction.userAction.includes('do') ||
        interaction.userAction.includes('summarize') ||
        interaction.userAction.includes('analyze')
      ) {
        actionRequests++
      }
    }
    if (interaction.novaAction === 'asked_followup') {
      followups++
    }
  }

  const actionRatio = totalWithAction > 0 ? actionRequests / totalWithAction : 0
  const followupRatio = followups / recentInteractions.length

  return {
    usually_wants_action: actionRatio > 0.6,
    asks_followups: followupRatio > 0.3 ? 'often' : followupRatio > 0.1 ? 'sometimes' : 'rarely',
  }
}

/**
 * Merge profile updates (for gradual learning)
 */
export function mergeProfiles(
  existing: UserPreferences,
  newData: UserPreferences
): UserPreferences {
  return {
    prefers_deep_analysis: newData.prefers_deep_analysis ?? existing.prefers_deep_analysis,
    typical_response_style: newData.typical_response_style ?? existing.typical_response_style,
    common_topics: mergeTopics(existing.common_topics || [], newData.common_topics || []),
    interaction_patterns: {
      ...existing.interaction_patterns,
      ...newData.interaction_patterns,
    },
  }
}

/**
 * Merge topic lists, prioritizing newer topics
 */
function mergeTopics(existing: string[], newer: string[]): string[] {
  const combined = new Set([...newer, ...existing])
  return [...combined].slice(0, 10) // Keep top 10 topics
}

/**
 * Reset user profile (for testing or user request)
 */
export async function resetProfile(userId: string): Promise<void> {
  profileCache.delete(userId)
  interactionCache.delete(userId)

  // TODO: Delete from database
  // await supabase
  //   .from('user_profile')
  //   .delete()
  //   .eq('user_id', userId)
}

/**
 * Export profile data (for user data requests)
 */
export async function exportProfileData(userId: string): Promise<{
  profile: UserProfile | undefined
  interactions: InteractionRecord[]
}> {
  return {
    profile: profileCache.get(userId),
    interactions: interactionCache.get(userId) || [],
  }
}
