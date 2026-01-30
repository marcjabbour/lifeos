/**
 * Realtime Module
 *
 * Re-exports all realtime subscriptions and hooks
 */

// Core subscription manager
export { realtimeManager, RealtimeSubscriptionManager } from './subscriptions'

// Types
export type { Item, Job, Conversation } from './subscriptions'

// React hooks
export {
  useItemsSubscription,
  useJobsSubscription,
  useConversationsSubscription,
  useJobSubscription,
  useOnlineStatus,
  useOptimisticItems,
} from './hooks'
