/**
 * POST /api/conversation/reply
 *
 * Reply to a conversation with Nova.
 * Supports replying from push notifications.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// Request validation schema
const replySchema = z.object({
  conversation_id: z.string().uuid(),
  message_content: z.string().min(1).max(10000),
})

export async function POST(request: NextRequest) {
  try {
    // Get auth token from request
    const authHeader = request.headers.get('authorization')
    const cookieHeader = request.headers.get('cookie')

    // Create Supabase client with auth context
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            ...(authHeader ? { Authorization: authHeader } : {}),
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          },
        },
      }
    )

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const result = replySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', message: result.error.message },
        { status: 400 }
      )
    }

    const { conversation_id, message_content } = result.data

    // Fetch existing conversation (verify ownership)
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversation_id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !conversation) {
      return NextResponse.json(
        { error: 'Not found', message: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Add user message to conversation
    const messages = conversation.messages || []
    const userMessage = {
      role: 'user' as const,
      content: message_content,
      timestamp: new Date().toISOString(),
    }
    messages.push(userMessage)

    // Update conversation with user message
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        messages,
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversation_id)

    if (updateError) {
      console.error('Error updating conversation:', updateError)
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to add message' },
        { status: 500 }
      )
    }

    // TODO: Trigger Nova reasoning
    // This would typically queue a job to process the message
    // For now, we return success and the client can subscribe to realtime updates

    return NextResponse.json({
      success: true,
      message: 'Message sent',
      conversation_id,
      status: 'pending',
    })
  } catch (error) {
    console.error('Conversation reply error:', error)
    return NextResponse.json(
      { error: 'Server error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
