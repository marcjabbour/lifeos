/**
 * Web Push Notification Service
 *
 * Server-side utilities for sending push notifications via Web Push API.
 * Uses VAPID for authentication.
 */

import webpush from 'web-push'
import { getServiceClient } from '@/lib/core/database'

// VAPID configuration
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!
const vapidSubject = process.env.NEXT_PUBLIC_APP_URL || 'mailto:admin@lifeos.app'

// Validate VAPID keys
if (!vapidPublicKey || !vapidPrivateKey) {
  console.warn(
    'VAPID keys not configured. Push notifications will not work. ' +
      'Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.'
  )
}

// Configure web-push with VAPID keys
if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
}

// Push subscription type (from browser's PushSubscription)
export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

// Notification payload types
export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, unknown>
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
  requireInteraction?: boolean
  silent?: boolean
}

// Database push subscription record
interface PushSubscriptionRecord {
  id: string
  user_id: string
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  device_info: Record<string, unknown> | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Send a push notification to a specific subscription
 */
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    return { success: false, error: 'VAPID keys not configured' }
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      JSON.stringify(payload),
      {
        TTL: 60 * 60 * 24, // 24 hours
        urgency: 'normal',
      }
    )

    return { success: true }
  } catch (error) {
    const err = error as { statusCode?: number; body?: string }

    // Handle specific error codes
    if (err.statusCode === 410 || err.statusCode === 404) {
      // Subscription expired or not found
      return { success: false, error: 'subscription_expired' }
    }

    if (err.statusCode === 413) {
      return { success: false, error: 'payload_too_large' }
    }

    return { success: false, error: err.body || 'Unknown error' }
  }
}

/**
 * Send push notification to all active subscriptions for a user
 */
export async function sendPushToUser(
  userId: string,
  payload: NotificationPayload
): Promise<{
  sent: number
  failed: number
  expiredSubscriptions: string[]
}> {
  const supabase = getServiceClient()

  // Fetch all active subscriptions for user
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching push subscriptions:', error)
    return { sent: 0, failed: 0, expiredSubscriptions: [] }
  }

  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0, expiredSubscriptions: [] }
  }

  let sent = 0
  let failed = 0
  const expiredSubscriptions: string[] = []

  // Send to all subscriptions in parallel
  const results = await Promise.allSettled(
    subscriptions.map(async (sub: PushSubscriptionRecord) => {
      const result = await sendPushNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload)

      if (result.success) {
        sent++
      } else {
        failed++

        // Mark expired subscriptions as inactive
        if (result.error === 'subscription_expired') {
          expiredSubscriptions.push(sub.id)
        }
      }

      return result
    })
  )

  // Deactivate expired subscriptions
  if (expiredSubscriptions.length > 0) {
    await supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .in('id', expiredSubscriptions)
  }

  return { sent, failed, expiredSubscriptions }
}

/**
 * Send a job completion notification
 */
export async function sendJobCompletionNotification(
  userId: string,
  job: {
    id: string
    status: 'completed' | 'failed'
    result?: Record<string, unknown>
    error_message?: string | null
  },
  item?: {
    id: string
    title: string
  }
): Promise<void> {
  const isSuccess = job.status === 'completed'

  const payload: NotificationPayload = {
    title: isSuccess ? 'Nova completed your request' : 'Nova encountered an issue',
    body: isSuccess
      ? item?.title
        ? `Finished processing: ${item.title}`
        : 'Your content has been processed successfully'
      : job.error_message || 'Something went wrong processing your content',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: `job-${job.id}`,
    data: {
      type: 'job_completion',
      job_id: job.id,
      item_id: item?.id,
      status: job.status,
      url: item?.id ? `/items/${item.id}` : '/dashboard',
    },
    actions: [
      {
        action: 'view',
        title: 'View Details',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
    requireInteraction: !isSuccess, // Require interaction for errors
  }

  await sendPushToUser(userId, payload)
}

/**
 * Send a new message notification for conversations
 */
export async function sendConversationNotification(
  userId: string,
  conversation: {
    id: string
    title?: string | null
  },
  message: {
    role: 'assistant'
    content: string
  }
): Promise<void> {
  // Truncate message for notification
  const truncatedContent =
    message.content.length > 100 ? message.content.substring(0, 97) + '...' : message.content

  const payload: NotificationPayload = {
    title: conversation.title || 'Nova',
    body: truncatedContent,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: `conversation-${conversation.id}`,
    data: {
      type: 'conversation_message',
      conversation_id: conversation.id,
      url: `/conversations/${conversation.id}`,
    },
    actions: [
      {
        action: 'reply',
        title: 'Reply',
      },
      {
        action: 'view',
        title: 'View',
      },
    ],
  }

  await sendPushToUser(userId, payload)
}

/**
 * Get VAPID public key for client-side subscription
 */
export function getVapidPublicKey(): string | null {
  return vapidPublicKey || null
}
