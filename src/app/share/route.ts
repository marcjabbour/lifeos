/**
 * POST /share
 *
 * Web Share Target handler for PWA.
 * Receives form data from share_target and redirects to share page with params.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const title = formData.get('title') as string | null
    const text = formData.get('text') as string | null
    const url = formData.get('url') as string | null

    // Build redirect URL with query params
    const redirectUrl = new URL('/share', request.url)

    if (title) redirectUrl.searchParams.set('title', title)
    if (text) redirectUrl.searchParams.set('text', text)
    if (url) redirectUrl.searchParams.set('url', url)

    // Redirect to share page
    return NextResponse.redirect(redirectUrl.toString())
  } catch (error) {
    console.error('Share target error:', error)

    // Redirect to share page with error
    const redirectUrl = new URL('/share', request.url)
    redirectUrl.searchParams.set('error', 'Failed to process shared content')

    return NextResponse.redirect(redirectUrl.toString())
  }
}

// Also handle GET for testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // If already has params, render the page
  if (searchParams.has('url') || searchParams.has('text') || searchParams.has('title')) {
    // Forward to the page component
    return NextResponse.next()
  }

  // Otherwise redirect to dashboard
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
