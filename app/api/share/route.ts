/**
 * Content Share API Route
 *
 * POST /api/share - Main content ingestion endpoint
 *
 * Accepts content from iOS Share Sheet, Siri Shortcuts, and PWA direct input.
 * Performs quick perception and queues for async processing.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRateLimit, type AuthContext } from '@/lib/auth'
import { validateShareRequest } from '@/lib/validation/share'
import { triggerContentProcessing } from '@/lib/jobs'
import type { ShareRequest, ShareResponse, ContentType } from '@/types/database'

/**
 * Extract title from URL (basic extraction)
 * In production, this would be enhanced with actual page fetching
 */
function extractTitleFromUrl(url: string): string {
  try {
    const parsed = new URL(url)
    // Use pathname or hostname as fallback title
    const pathParts = parsed.pathname.split('/').filter(Boolean)
    if (pathParts.length > 0) {
      return pathParts[pathParts.length - 1].replace(/[-_]/g, ' ')
    }
    return parsed.hostname
  } catch {
    return 'Shared URL'
  }
}

/**
 * Extract title from text content
 */
function extractTitleFromText(text: string): string {
  // Use first line or first 50 characters
  const firstLine = text.split('\n')[0].trim()
  if (firstLine.length <= 50) {
    return firstLine
  }
  return firstLine.substring(0, 47) + '...'
}

/**
 * Generate a title based on content type
 */
function generateTitle(content: string, contentType: ContentType): string {
  switch (contentType) {
    case 'url':
      return extractTitleFromUrl(content)
    case 'text':
      return extractTitleFromText(content)
    case 'image':
      return 'Shared Image'
    default:
      return 'Shared Content'
  }
}

/**
 * Create initial metadata based on content type
 */
function createInitialMetadata(
  content: string,
  contentType: ContentType,
  source?: string
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    source: source || 'direct',
    shared_at: new Date().toISOString(),
  }

  if (contentType === 'url') {
    try {
      const parsed = new URL(content)
      metadata.domain = parsed.hostname
      metadata.protocol = parsed.protocol
    } catch {
      // Invalid URL, skip metadata
    }
  }

  if (contentType === 'text') {
    metadata.char_count = content.length
    metadata.word_count = content.split(/\s+/).filter(Boolean).length
  }

  if (contentType === 'image') {
    // Extract image info from base64 data URL
    const match = content.match(/^data:(image\/[a-z+]+);base64,/i)
    if (match) {
      metadata.mime_type = match[1]
    }
  }

  return metadata
}

/**
 * POST /api/share
 * Main content ingestion endpoint
 */
async function handleShare(request: NextRequest, context: AuthContext): Promise<NextResponse> {
  try {
    const body = await request.json()

    // Validate request
    const validation = validateShareRequest(body)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const shareRequest = validation.sanitized as ShareRequest
    const { content, content_type, source } = shareRequest

    // Generate title and metadata
    const title = generateTitle(content, content_type)
    const metadata = createInitialMetadata(content, content_type, source)

    // Create item in database
    const itemData = {
      user_id: context.userId,
      title,
      content: content_type === 'text' ? content : null,
      url: content_type === 'url' ? content : null,
      content_type,
      source_type: source || 'share',
      metadata,
      category: 'uncategorized',
      tags: [],
      enrichment: {},
      has_enrichment: false,
      is_archived: false,
      is_completed: false,
    }

    const { data: item, error: itemError } = await context.supabase
      .from('items')
      .insert(itemData)
      .select()
      .single()

    if (itemError) {
      console.error('Error creating item:', itemError)
      return NextResponse.json({ error: 'Failed to save content' }, { status: 500 })
    }

    // Create job for async processing
    const jobData = {
      user_id: context.userId,
      item_id: item.id,
      status: 'pending',
      plan: {
        reasoning: 'Initial content processing',
        steps: [
          { action: 'perceive', why: 'Understand what the content is about' },
          { action: 'enrich', why: 'Add useful metadata and insights' },
        ],
      },
      current_step: 0,
      step_results: [],
      result: {},
    }

    const { data: job, error: jobError } = await context.supabase
      .from('jobs')
      .insert(jobData)
      .select()
      .single()

    if (jobError) {
      console.error('Error creating job:', jobError)
      // Item was created, but job failed - still return success with warning
      const response: ShareResponse = {
        success: true,
        action: 'saved',
        item_id: item.id,
        message: `Saved "${title}". Processing may be delayed.`,
      }
      return NextResponse.json(response, { status: 201 })
    }

    // Enqueue job to Inngest for async processing
    const triggerResult = await triggerContentProcessing({
      job_id: job.id,
      user_id: context.userId,
      item_id: item.id,
      content_type,
    })

    if (!triggerResult.success) {
      console.warn('Failed to trigger job processing:', triggerResult.error)
      // Job was created but not queued - processing will be delayed
    }

    // Return success response
    const response: ShareResponse = {
      success: true,
      action: 'working',
      item_id: item.id,
      job_id: job.id,
      message: `Got it! I'm looking at "${title}" now.`,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (err) {
    console.error('Unexpected error in share endpoint:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Apply middleware and export handler
export const POST = withAuth((request, context) => withRateLimit(handleShare)(request, context))
