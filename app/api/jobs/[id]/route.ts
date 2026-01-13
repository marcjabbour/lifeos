/**
 * Job Status API Route
 *
 * GET /api/jobs/:id - Get job status and details
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRateLimit, type AuthContext } from '@/lib/auth'
import type { JobStatusResponse } from '@/types/database'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/jobs/:id
 * Get job status, optionally including the associated item
 */
async function getJobStatus(
  request: NextRequest,
  context: AuthContext,
  params: { id: string }
): Promise<NextResponse> {
  const { id } = params
  const { searchParams } = new URL(request.url)
  const includeItem = searchParams.get('include_item') === 'true'

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid job ID format' }, { status: 400 })
  }

  try {
    // Fetch job
    const { data: job, error: jobError } = await context.supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .eq('user_id', context.userId)
      .single()

    if (jobError) {
      if (jobError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }
      console.error('Error fetching job:', jobError)
      return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 })
    }

    const response: JobStatusResponse = { job }

    // Optionally include associated item
    if (includeItem && job.item_id) {
      const { data: item, error: itemError } = await context.supabase
        .from('items')
        .select('*')
        .eq('id', job.item_id)
        .eq('user_id', context.userId)
        .single()

      if (!itemError && item) {
        response.item = item
      }
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('Unexpected error fetching job:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Apply middleware and export handler
export async function GET(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params
  return withAuth((req, ctx) =>
    withRateLimit((r, c) => getJobStatus(r, c, resolvedParams))(req, ctx)
  )(request)
}
