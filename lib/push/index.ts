/**
 * Push Notifications Module
 *
 * Re-exports all push notification utilities and hooks
 */

// Server-side (for API routes)
export {
  sendPushNotification,
  sendPushToUser,
  sendJobCompletionNotification,
  sendConversationNotification,
  getVapidPublicKey,
  type PushSubscriptionData,
  type NotificationPayload,
} from './send'

// Client-side utilities
export {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getExistingSubscription,
  getDeviceInfo,
  registerPushSubscription,
  unregisterPushSubscription,
} from './client'

// React hooks
export { usePushNotifications, useIsInstalledPWA, usePWAInstallPrompt } from './hooks'
