'use client'

/**
 * React Hooks for Push Notifications
 *
 * Provides easy-to-use hooks for managing push notification subscriptions.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPush,
  getExistingSubscription,
  registerPushSubscription,
  unregisterPushSubscription,
} from './client'

type PushPermissionStatus = NotificationPermission | 'unsupported' | 'loading'

interface UsePushNotificationsResult {
  isSupported: boolean
  permission: PushPermissionStatus
  isSubscribed: boolean
  isLoading: boolean
  error: string | null
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
}

/**
 * Hook for managing push notification subscriptions
 */
export function usePushNotifications(): UsePushNotificationsResult {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<PushPermissionStatus>('loading')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check initial state
  useEffect(() => {
    async function checkPushState() {
      setIsLoading(true)
      setError(null)

      const supported = isPushSupported()
      setIsSupported(supported)

      if (!supported) {
        setPermission('unsupported')
        setIsLoading(false)
        return
      }

      const currentPermission = getNotificationPermission()
      setPermission(currentPermission as NotificationPermission)

      // Check existing subscription
      const subscription = await getExistingSubscription()
      setIsSubscribed(!!subscription)

      setIsLoading(false)
    }

    checkPushState()
  }, [])

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Get VAPID public key from environment
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        throw new Error('VAPID public key not configured')
      }

      // Subscribe to push
      const subscription = await subscribeToPush(vapidKey)

      // Register with server
      const result = await registerPushSubscription(subscription)
      if (!result.success) {
        throw new Error(result.error || 'Failed to register subscription')
      }

      setIsSubscribed(true)
      setPermission('granted')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to subscribe'
      setError(message)

      // Update permission status
      const currentPermission = getNotificationPermission()
      setPermission(currentPermission as PushPermissionStatus)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await unregisterPushSubscription()
      if (!result.success) {
        throw new Error(result.error || 'Failed to unsubscribe')
      }

      setIsSubscribed(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unsubscribe'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  }
}

/**
 * Hook to detect if app is running as installed PWA
 */
export function useIsInstalledPWA(): boolean {
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check display-mode media query
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches

    // Check iOS standalone mode
    const isIOSStandalone = (window.navigator as { standalone?: boolean }).standalone === true

    setIsInstalled(isStandalone || isIOSStandalone)
  }, [])

  return isInstalled
}

/**
 * Hook to prompt PWA installation
 */
export function usePWAInstallPrompt(): {
  canPrompt: boolean
  prompt: () => Promise<void>
} {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const prompt = useCallback(async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }, [deferredPrompt])

  return {
    canPrompt: !!deferredPrompt,
    prompt,
  }
}

// Type for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

// Extend Window interface
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}
