/**
 * Items API Routes
 *
 * GET /api/items - List items with pagination and filters
 * POST /api/items - Create a new item (internal use, called from /api/share)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRateLimit, type AuthContext } from '@/lib/auth'
import type { Item, ItemsResponse } from '@/types/database'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

/**
 * GET /api/items
 * List user items with cursor-based pagination and filters
 */
async function getItems(request: NextRequest, context: AuthContext): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)

  // Parse query parameters
  const search = searchParams.get('search')
  const hasEnrichment = searchParams.get('has_enrichment')
  const isArchived = searchParams.get('is_archived')
  const contentType = searchParams.get('content_type')
  const limit = Math.min(parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT)), MAX_LIMIT)
  const cursor = searchParams.get('cursor')

  try {
    // Build query
    let query = context.supabase
      .from('items')
      .select('*')
      .eq('user_id', context.userId)
      .order('created_at', { ascending: false })
      .limit(limit + 1) // Fetch one extra to check if there are more

    // Apply filters
    if (hasEnrichment !== null) {
      query = query.eq('has_enrichment', hasEnrichment === 'true')
    }

    if (isArchived !== null) {
      query = query.eq('is_archived', isArchived === 'true')
    } else {
      // By default, don't show archived items
      query = query.eq('is_archived', false)
    }

    if (contentType) {
      query = query.eq('content_type', contentType)
    }

    if (search) {
      // Full-text search on title and content
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
    }

    // Apply cursor for pagination
    if (cursor) {
      // Cursor is the created_at timestamp of the last item
      query = query.lt('created_at', cursor)
    }

    const { data: items, error } = await query

    if (error) {
      console.error('Error fetching items:', error)
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    // Check if there are more items
    const hasMore = items.length > limit
    const resultItems = hasMore ? items.slice(0, limit) : items

    // Generate next cursor
    const nextCursor = hasMore ? resultItems[resultItems.length - 1]?.created_at : null

    const response: ItemsResponse = {
      items: resultItems as Item[],
      next_cursor: nextCursor,
      has_more: hasMore,
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('Unexpected error fetching items:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/items
 * Create a new item (typically called internally from /api/share)
 */
async function createItem(request: NextRequest, context: AuthContext): Promise<NextResponse> {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.title || !body.source_type) {
      return NextResponse.json(
        { error: 'Missing required fields: title, source_type' },
        { status: 400 }
      )
    }

    // Validate content_type if provided
    if (body.content_type && !['url', 'text', 'image'].includes(body.content_type)) {
      return NextResponse.json(
        { error: 'Invalid content_type. Must be url, text, or image' },
        { status: 400 }
      )
    }

    // Prepare item data
    const itemData = {
      user_id: context.userId,
      title: body.title,
      content: body.content || null,
      url: body.url || null,
      thumbnail_url: body.thumbnail_url || null,
      content_type: body.content_type || null,
      category: body.category || 'uncategorized',
      tags: body.tags || [],
      source_type: body.source_type,
      source_id: body.source_id || null,
      metadata: body.metadata || {},
      enrichment: body.enrichment || {},
      has_enrichment: !!body.enrichment && Object.keys(body.enrichment).length > 0,
      is_archived: false,
      is_completed: false,
    }

    const { data: item, error } = await context.supabase
      .from('items')
      .insert(itemData)
      .select()
      .single()

    if (error) {
      console.error('Error creating item:', error)
      return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
    }

    return NextResponse.json(item, { status: 201 })
  } catch (err) {
    console.error('Unexpected error creating item:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Apply middleware and export handlers
export const GET = withAuth((request, context) => withRateLimit(getItems)(request, context))

export const POST = withAuth((request, context) => withRateLimit(createItem)(request, context))
