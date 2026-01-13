/**
 * Single Item API Routes
 *
 * GET /api/items/:id - Get a single item
 * PATCH /api/items/:id - Update an item
 * DELETE /api/items/:id - Archive (soft delete) an item
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRateLimit, type AuthContext } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/items/:id
 * Get a single item by ID
 */
async function getItem(
  request: NextRequest,
  context: AuthContext,
  params: { id: string }
): Promise<NextResponse> {
  const { id } = params

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid item ID format' }, { status: 400 })
  }

  try {
    const { data: item, error } = await context.supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .eq('user_id', context.userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }
      console.error('Error fetching item:', error)
      return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 })
    }

    return NextResponse.json(item)
  } catch (err) {
    console.error('Unexpected error fetching item:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/items/:id
 * Update an item
 */
async function updateItem(
  request: NextRequest,
  context: AuthContext,
  params: { id: string }
): Promise<NextResponse> {
  const { id } = params

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid item ID format' }, { status: 400 })
  }

  try {
    const body = await request.json()

    // Only allow updating specific fields
    const allowedFields = [
      'title',
      'content',
      'url',
      'thumbnail_url',
      'category',
      'tags',
      'metadata',
      'enrichment',
      'has_enrichment',
      'is_archived',
      'is_completed',
    ]

    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // If enrichment is being updated, also update has_enrichment
    if (updateData.enrichment !== undefined) {
      updateData.has_enrichment =
        !!updateData.enrichment && Object.keys(updateData.enrichment as object).length > 0
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: item, error } = await context.supabase
      .from('items')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', context.userId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }
      console.error('Error updating item:', error)
      return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
    }

    return NextResponse.json(item)
  } catch (err) {
    console.error('Unexpected error updating item:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/items/:id
 * Archive (soft delete) an item
 */
async function deleteItem(
  request: NextRequest,
  context: AuthContext,
  params: { id: string }
): Promise<NextResponse> {
  const { id } = params

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid item ID format' }, { status: 400 })
  }

  try {
    // Soft delete by setting is_archived = true
    const { data: item, error } = await context.supabase
      .from('items')
      .update({ is_archived: true })
      .eq('id', id)
      .eq('user_id', context.userId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }
      console.error('Error archiving item:', error)
      return NextResponse.json({ error: 'Failed to archive item' }, { status: 500 })
    }

    return NextResponse.json({ success: true, item })
  } catch (err) {
    console.error('Unexpected error archiving item:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Apply middleware and export handlers
export async function GET(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params
  return withAuth((req, ctx) => withRateLimit((r, c) => getItem(r, c, resolvedParams))(req, ctx))(
    request
  )
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params
  return withAuth((req, ctx) =>
    withRateLimit((r, c) => updateItem(r, c, resolvedParams))(req, ctx)
  )(request)
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params
  return withAuth((req, ctx) =>
    withRateLimit((r, c) => deleteItem(r, c, resolvedParams))(req, ctx)
  )(request)
}
