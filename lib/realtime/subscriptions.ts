/**
 * Supabase Realtime Subscriptions
 *
 * Provides hooks and utilities for subscribing to real-time database changes
 * for items, jobs, and conversations tables.
 */

import { supabase } from '@/lib/db/supabase'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// Database types (will be generated from schema)
export interface Item {
  id: string
  user_id: string
  content: string
  content_type: 'url' | 'text' | 'image'
  metadata: Record<string, unknown>
  enrichment: Record<string, unknown> | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface Job {
  id: string
  user_id: string
  item_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  plan: Record<string, unknown>
  results: Record<string, unknown> | null
  current_step: number
  total_steps: number
  error: string | null
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  user_id: string
  item_id: string | null
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: string
  }>
  summary: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

// Callback types
type ItemCallback = (payload: RealtimePostgresChangesPayload<Item>) => void
type JobCallback = (payload: RealtimePostgresChangesPayload<Job>) => void
type ConversationCallback = (payload: RealtimePostgresChangesPayload<Conversation>) => void

// Connection state
type ConnectionStatus = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR'

interface SubscriptionState {
  channel: RealtimeChannel | null
  status: ConnectionStatus | null
  retryCount: number
  maxRetries: number
}

/**
 * Real-time subscription manager
 * Handles connection lifecycle and automatic reconnection
 */
class RealtimeSubscriptionManager {
  private subscriptions: Map<string, SubscriptionState> = new Map()
  private isOnline: boolean = true

  constructor() {
    // Track online/offline status
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline())
      window.addEventListener('offline', () => this.handleOffline())
      this.isOnline = navigator.onLine
    }
  }

  private handleOnline(): void {
    this.isOnline = true
    // Reconnect all subscriptions
    this.subscriptions.forEach((state, channelName) => {
      if (state.status !== 'SUBSCRIBED') {
        this.reconnect(channelName)
      }
    })
  }

  private handleOffline(): void {
    this.isOnline = false
  }

  private reconnect(channelName: string): void {
    const state = this.subscriptions.get(channelName)
    if (!state || !this.isOnline) return

    if (state.retryCount < state.maxRetries) {
      state.retryCount++
      const delay = Math.min(1000 * Math.pow(2, state.retryCount), 30000)

      setTimeout(() => {
        state.channel?.subscribe()
      }, delay)
    }
  }

  /**
   * Subscribe to items table changes for a user
   */
  subscribeToItems(
    userId: string,
    callbacks: {
      onInsert?: ItemCallback
      onUpdate?: ItemCallback
      onDelete?: ItemCallback
    }
  ): () => void {
    const channelName = `items:${userId}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'items',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => callbacks.onInsert?.(payload as RealtimePostgresChangesPayload<Item>)
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'items',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => callbacks.onUpdate?.(payload as RealtimePostgresChangesPayload<Item>)
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'items',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => callbacks.onDelete?.(payload as RealtimePostgresChangesPayload<Item>)
      )
      .subscribe((status) => {
        const state = this.subscriptions.get(channelName)
        if (state) {
          state.status = status
          if (status === 'SUBSCRIBED') {
            state.retryCount = 0
          } else if (status !== 'CLOSED') {
            this.reconnect(channelName)
          }
        }
      })

    this.subscriptions.set(channelName, {
      channel,
      status: null,
      retryCount: 0,
      maxRetries: 5,
    })

    // Return cleanup function
    return () => {
      channel.unsubscribe()
      this.subscriptions.delete(channelName)
    }
  }

  /**
   * Subscribe to job status updates
   */
  subscribeToJobs(
    userId: string,
    callbacks: {
      onInsert?: JobCallback
      onUpdate?: JobCallback
    }
  ): () => void {
    const channelName = `jobs:${userId}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'jobs',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => callbacks.onInsert?.(payload as RealtimePostgresChangesPayload<Job>)
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => callbacks.onUpdate?.(payload as RealtimePostgresChangesPayload<Job>)
      )
      .subscribe((status) => {
        const state = this.subscriptions.get(channelName)
        if (state) {
          state.status = status
          if (status === 'SUBSCRIBED') {
            state.retryCount = 0
          } else if (status !== 'CLOSED') {
            this.reconnect(channelName)
          }
        }
      })

    this.subscriptions.set(channelName, {
      channel,
      status: null,
      retryCount: 0,
      maxRetries: 5,
    })

    return () => {
      channel.unsubscribe()
      this.subscriptions.delete(channelName)
    }
  }

  /**
   * Subscribe to conversation updates
   */
  subscribeToConversations(
    userId: string,
    callbacks: {
      onInsert?: ConversationCallback
      onUpdate?: ConversationCallback
    }
  ): () => void {
    const channelName = `conversations:${userId}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => callbacks.onInsert?.(payload as RealtimePostgresChangesPayload<Conversation>)
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => callbacks.onUpdate?.(payload as RealtimePostgresChangesPayload<Conversation>)
      )
      .subscribe((status) => {
        const state = this.subscriptions.get(channelName)
        if (state) {
          state.status = status
          if (status === 'SUBSCRIBED') {
            state.retryCount = 0
          } else if (status !== 'CLOSED') {
            this.reconnect(channelName)
          }
        }
      })

    this.subscriptions.set(channelName, {
      channel,
      status: null,
      retryCount: 0,
      maxRetries: 5,
    })

    return () => {
      channel.unsubscribe()
      this.subscriptions.delete(channelName)
    }
  }

  /**
   * Subscribe to a specific job by ID
   */
  subscribeToJob(jobId: string, onUpdate: (job: Job) => void): () => void {
    const channelName = `job:${jobId}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          onUpdate(payload.new as Job)
        }
      )
      .subscribe()

    this.subscriptions.set(channelName, {
      channel,
      status: null,
      retryCount: 0,
      maxRetries: 5,
    })

    return () => {
      channel.unsubscribe()
      this.subscriptions.delete(channelName)
    }
  }

  /**
   * Get current subscription status
   */
  getStatus(channelName: string): ConnectionStatus | null {
    return this.subscriptions.get(channelName)?.status ?? null
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup(): void {
    this.subscriptions.forEach((state) => {
      state.channel?.unsubscribe()
    })
    this.subscriptions.clear()
  }
}

// Singleton instance
export const realtimeManager = new RealtimeSubscriptionManager()

// Export for direct use
export { RealtimeSubscriptionManager }
