/**
 * Nova Perception Engine
 *
 * PERCEIVE stage: Quick content analysis via GPT-4o-mini
 * to understand what the user shared.
 *
 * Model: GPT-4o-mini
 * Token budget: 1000
 * Latency target: <2s
 */

import { createLLMClient } from '@/lib/services/ai/llm'
import { createTrace, flushLangfuse } from '@/lib/services/ai/observability/langfuse'
import type { PerceptionResult, LLMResponse } from '@/types/llm'

export type ContentType = 'url' | 'text' | 'image'

export interface PerceiveInput {
  content: string
  contentType: ContentType
  context?: string
  userId?: string
  itemId?: string
}

export interface PerceiveOutput extends PerceptionResult {
  // Extended metadata from perception
  title?: string
  author?: string
  source?: string
  topics?: string[]
  sentiment?: 'positive' | 'negative' | 'neutral' | 'mixed'
  language?: string
  isTimeSensitive?: boolean
}

/**
 * Perceive content - the first stage of Nova's cognitive loop
 *
 * Analyzes the shared content to understand:
 * - What type of content it is (article, video, tweet, etc.)
 * - A brief summary
 * - Suggested actions
 * - Confidence in the analysis
 */
export async function perceive(input: PerceiveInput): Promise<LLMResponse<PerceiveOutput>> {
  const client = createLLMClient({
    userId: input.userId,
    itemId: input.itemId,
  })

  const response = await client.perceive({
    content: input.content,
    contentType: input.contentType,
    context: input.context,
  })

  // Extract extended metadata from the result
  const output: PerceiveOutput = {
    ...response.result,
    title: response.result.metadata?.title as string | undefined,
    author: response.result.metadata?.author as string | undefined,
    source: response.result.metadata?.source as string | undefined,
    topics: response.result.metadata?.topics as string[] | undefined,
    sentiment: response.result.metadata?.sentiment as PerceiveOutput['sentiment'],
  }

  return {
    result: output,
    usage: response.usage,
    model: response.model,
    latencyMs: response.latencyMs,
  }
}

/**
 * Quick perception for immediate response
 *
 * A lighter version of perceive for Share Sheet interactions
 * that need sub-second response times.
 */
export async function quickPerceive(
  content: string,
  contentType: ContentType,
  userId?: string
): Promise<{
  summary: string
  suggestedAction: string
  confidence: number
}> {
  const trace = createTrace('quick_perceive', {
    userId,
    requestType: 'perception',
    model: 'gpt-4o-mini',
  })

  const span = trace.span('quick_perception')

  try {
    // For URLs, extract key info
    if (contentType === 'url') {
      const urlSummary = extractUrlInfo(content)
      span.end({ output: urlSummary })
      return urlSummary
    }

    // For text, use first few words
    if (contentType === 'text') {
      const textSummary = summarizeText(content)
      span.end({ output: textSummary })
      return textSummary
    }

    // For images, indicate we'll process it
    span.end({ output: { type: 'image' } })
    return {
      summary: 'Image content',
      suggestedAction: 'analyze_image',
      confidence: 0.9,
    }
  } finally {
    await flushLangfuse()
  }
}

/**
 * Extract basic info from a URL without making an LLM call
 */
function extractUrlInfo(url: string): {
  summary: string
  suggestedAction: string
  confidence: number
} {
  try {
    const parsed = new URL(url)
    const domain = parsed.hostname.replace('www.', '')

    // Detect common platforms
    const platformActions: Record<string, { type: string; action: string }> = {
      'twitter.com': { type: 'Tweet', action: 'summarize' },
      'x.com': { type: 'Tweet', action: 'summarize' },
      'youtube.com': { type: 'Video', action: 'summarize' },
      'youtu.be': { type: 'Video', action: 'summarize' },
      'github.com': { type: 'Repository', action: 'extract_metadata' },
      'arxiv.org': { type: 'Research paper', action: 'summarize' },
      'medium.com': { type: 'Article', action: 'summarize' },
      'reddit.com': { type: 'Reddit post', action: 'summarize' },
      'linkedin.com': { type: 'LinkedIn post', action: 'summarize' },
      'news.ycombinator.com': { type: 'HN discussion', action: 'summarize' },
    }

    const platform = Object.keys(platformActions).find((p) => domain.includes(p))

    if (platform) {
      const info = platformActions[platform]
      return {
        summary: `${info.type} from ${domain}`,
        suggestedAction: info.action,
        confidence: 0.85,
      }
    }

    // Generic URL
    return {
      summary: `Link from ${domain}`,
      suggestedAction: 'fetch_content',
      confidence: 0.7,
    }
  } catch {
    return {
      summary: 'Shared link',
      suggestedAction: 'fetch_content',
      confidence: 0.5,
    }
  }
}

/**
 * Create a quick summary of text content
 */
function summarizeText(text: string): {
  summary: string
  suggestedAction: string
  confidence: number
} {
  const trimmed = text.trim()
  const wordCount = trimmed.split(/\s+/).length

  // Very short text - might be a query or quick note
  if (wordCount < 10) {
    return {
      summary: trimmed.slice(0, 50) + (trimmed.length > 50 ? '...' : ''),
      suggestedAction: 'save',
      confidence: 0.6,
    }
  }

  // Medium text - likely a note or excerpt
  if (wordCount < 100) {
    return {
      summary: `Note (${wordCount} words)`,
      suggestedAction: 'save',
      confidence: 0.7,
    }
  }

  // Longer text - might benefit from summarization
  return {
    summary: `Text content (${wordCount} words)`,
    suggestedAction: 'summarize',
    confidence: 0.75,
  }
}

/**
 * Validate input content before perception
 */
export function validatePerceptionInput(
  content: string,
  contentType: ContentType
): { valid: boolean; error?: string } {
  // URL validation
  if (contentType === 'url') {
    if (content.length > 2048) {
      return { valid: false, error: 'URL too long (max 2048 characters)' }
    }

    try {
      const url = new URL(content)

      // Block internal/localhost URLs
      const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0']
      if (blockedHosts.includes(url.hostname)) {
        return { valid: false, error: 'Internal URLs not allowed' }
      }

      // Block private IP ranges
      const privateIpPatterns = [/^10\./, /^192\.168\./, /^172\.(1[6-9]|2[0-9]|3[0-1])\./]
      if (privateIpPatterns.some((p) => p.test(url.hostname))) {
        return { valid: false, error: 'Private IP addresses not allowed' }
      }

      // Block file:// protocol
      if (url.protocol === 'file:') {
        return { valid: false, error: 'File URLs not allowed' }
      }

      return { valid: true }
    } catch {
      return { valid: false, error: 'Invalid URL format' }
    }
  }

  // Text validation
  if (contentType === 'text') {
    if (content.length > 50000) {
      return { valid: false, error: 'Text too long (max 50,000 characters)' }
    }

    // Check for control characters (excluding newlines and tabs)
    // eslint-disable-next-line no-control-regex
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(content)) {
      return { valid: false, error: 'Text contains invalid control characters' }
    }

    return { valid: true }
  }

  // Image validation (basic - actual image validation should happen at upload)
  if (contentType === 'image') {
    // For images, content would typically be a URL or base64
    if (content.length > 10 * 1024 * 1024) {
      // 10MB
      return { valid: false, error: 'Image data too large (max 10MB)' }
    }
    return { valid: true }
  }

  return { valid: false, error: 'Unknown content type' }
}
