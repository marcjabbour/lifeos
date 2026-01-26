'use client'

/**
 * React Hooks for Supabase Realtime Subscriptions
 *
 * Provides easy-to-use hooks for subscribing to real-time updates
 * with automatic cleanup on component unmount.
 */

import { useEffect, useCallback, useState, useRef } from 'react'
import { realtimeManager, type Item, type Job, type Conversation } from './subscriptions'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

/**
 * Hook to subscribe to items feed updates
 */
export function useItemsSubscription(
  userId: string | null,
  callbacks: {
    onInsert?: (item: Item) => void
    onUpdate?: (item: Item) => void
    onDelete?: (itemId: string) => void
  }
) {
  const [isConnected, setIsConnected] = useState(false)
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  useEffect(() => {
    if (!userId) return

    const unsubscribe = realtimeManager.subscribeToItems(userId, {
      onInsert: (payload: RealtimePostgresChangesPayload<Item>) => {
        if (payload.new) {
          callbacksRef.current.onInsert?.(payload.new as Item)
        }
      },
      onUpdate: (payload: RealtimePostgresChangesPayload<Item>) => {
        if (payload.new) {
          callbacksRef.current.onUpdate?.(payload.new as Item)
        }
      },
      onDelete: (payload: RealtimePostgresChangesPayload<Item>) => {
        if (payload.old && 'id' in payload.old) {
          callbacksRef.current.onDelete?.(payload.old.id as string)
        }
      },
    })

    setIsConnected(true)

    return () => {
      unsubscribe()
      setIsConnected(false)
    }
  }, [userId])

  return { isConnected }
}

/**
 * Hook to subscribe to job status updates
 */
export function useJobsSubscription(
  userId: string | null,
  callbacks: {
    onInsert?: (job: Job) => void
    onUpdate?: (job: Job) => void
  }
) {
  const [isConnected, setIsConnected] = useState(false)
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  useEffect(() => {
    if (!userId) return

    const unsubscribe = realtimeManager.subscribeToJobs(userId, {
      onInsert: (payload: RealtimePostgresChangesPayload<Job>) => {
        if (payload.new) {
          callbacksRef.current.onInsert?.(payload.new as Job)
        }
      },
      onUpdate: (payload: RealtimePostgresChangesPayload<Job>) => {
        if (payload.new) {
          callbacksRef.current.onUpdate?.(payload.new as Job)
        }
      },
    })

    setIsConnected(true)

    return () => {
      unsubscribe()
      setIsConnected(false)
    }
  }, [userId])

  return { isConnected }
}

/**
 * Hook to subscribe to conversation updates
 */
export function useConversationsSubscription(
  userId: string | null,
  callbacks: {
    onInsert?: (conversation: Conversation) => void
    onUpdate?: (conversation: Conversation) => void
  }
) {
  const [isConnected, setIsConnected] = useState(false)
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  useEffect(() => {
    if (!userId) return

    const unsubscribe = realtimeManager.subscribeToConversations(userId, {
      onInsert: (payload: RealtimePostgresChangesPayload<Conversation>) => {
        if (payload.new) {
          callbacksRef.current.onInsert?.(payload.new as Conversation)
        }
      },
      onUpdate: (payload: RealtimePostgresChangesPayload<Conversation>) => {
        if (payload.new) {
          callbacksRef.current.onUpdate?.(payload.new as Conversation)
        }
      },
    })

    setIsConnected(true)

    return () => {
      unsubscribe()
      setIsConnected(false)
    }
  }, [userId])

  return { isConnected }
}

/**
 * Hook to subscribe to a specific job's updates
 */
export function useJobSubscription(jobId: string | null, onUpdate: (job: Job) => void) {
  const [isConnected, setIsConnected] = useState(false)
  const [job, setJob] = useState<Job | null>(null)
  const callbackRef = useRef(onUpdate)
  callbackRef.current = onUpdate

  useEffect(() => {
    if (!jobId) return

    const unsubscribe = realtimeManager.subscribeToJob(jobId, (updatedJob) => {
      setJob(updatedJob)
      callbackRef.current(updatedJob)
    })

    setIsConnected(true)

    return () => {
      unsubscribe()
      setIsConnected(false)
    }
  }, [jobId])

  return { isConnected, job }
}

/**
 * Hook to track online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

/**
 * Hook for optimistic updates with real-time sync
 */
export function useOptimisticItems<T extends Item>(initialItems: T[]) {
  const [items, setItems] = useState<T[]>(initialItems)
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, Partial<T>>>(new Map())

  // Sync with initial items on prop change
  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  // Apply optimistic update
  const optimisticUpdate = useCallback((id: string, update: Partial<T>) => {
    setPendingUpdates((prev) => new Map(prev).set(id, update))
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...update } : item)))
  }, [])

  // Confirm update (remove from pending)
  const confirmUpdate = useCallback((id: string) => {
    setPendingUpdates((prev) => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  // Revert optimistic update
  const revertUpdate = useCallback((id: string, originalItem: T) => {
    setPendingUpdates((prev) => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
    setItems((prev) => prev.map((item) => (item.id === id ? originalItem : item)))
  }, [])

  // Add new item
  const addItem = useCallback((item: T) => {
    setItems((prev) => [item, ...prev])
  }, [])

  // Update item from realtime
  const updateItem = useCallback(
    (updatedItem: T) => {
      // Only update if not in pending
      if (!pendingUpdates.has(updatedItem.id)) {
        setItems((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)))
      }
    },
    [pendingUpdates]
  )

  // Remove item
  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
    setPendingUpdates((prev) => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  return {
    items,
    pendingUpdates,
    optimisticUpdate,
    confirmUpdate,
    revertUpdate,
    addItem,
    updateItem,
    removeItem,
  }
}
