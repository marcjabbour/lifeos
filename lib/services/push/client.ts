'use client'

/**
 * Client-side Push Notification Utilities
 *
 * Handles browser push subscription and permission management.
 */

// Check if push notifications are supported
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false

  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

// Get current notification permission status
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported')
  }

  return await Notification.requestPermission()
}

// Convert URL-safe base64 to Uint8Array (for VAPID key)
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray.buffer
}

// Get existing push subscription
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null

  try {
    const registration = await navigator.serviceWorker.ready
    return await registration.pushManager.getSubscription()
  } catch {
    return null
  }
}

// Subscribe to push notifications
export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported')
  }

  // Ensure permission is granted
  const permission = await requestNotificationPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission denied')
  }

  // Wait for service worker to be ready
  const registration = await navigator.serviceWorker.ready

  // Check for existing subscription
  let subscription = await registration.pushManager.getSubscription()

  if (subscription) {
    // Return existing subscription
    return subscription
  }

  // Create new subscription
  subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  })

  return subscription
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(): Promise<boolean> {
  const subscription = await getExistingSubscription()

  if (!subscription) {
    return true
  }

  return await subscription.unsubscribe()
}

// Get device info for subscription tracking
export function getDeviceInfo(): Record<string, unknown> {
  if (typeof window === 'undefined') return {}

  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    standalone: (window.navigator as { standalone?: boolean }).standalone || false,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
  }
}

// Register subscription with server
export async function registerPushSubscription(
  subscription: PushSubscription
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        device_info: getDeviceInfo(),
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.message || 'Registration failed' }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

// Unregister subscription from server
export async function unregisterPushSubscription(): Promise<{
  success: boolean
  error?: string
}> {
  const subscription = await getExistingSubscription()

  if (!subscription) {
    return { success: true }
  }

  try {
    const response = await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.message || 'Unregistration failed' }
    }

    // Also unsubscribe locally
    await subscription.unsubscribe()

    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
