import webPush from "web-push";
import type { PushPayload, PushSubscriptionData } from "@/types";

// Configure web-push with VAPID keys
// These should be generated once and stored in environment variables
// Generate with: npx web-push generate-vapid-keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:hello@lifeos.app";

if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

/**
 * Send a push notification to a subscribed client.
 */
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushPayload,
): Promise<boolean> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn("VAPID keys not configured. Push notifications are disabled.");
    return false;
  }

  try {
    const pushSubscription: webPush.PushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    };

    await webPush.sendNotification(pushSubscription, JSON.stringify(payload), {
      TTL: 60 * 60, // 1 hour
      urgency: "normal",
    });

    return true;
  } catch (error) {
    console.error("Failed to send push notification:", error);

    // Handle specific error cases
    if (error instanceof webPush.WebPushError) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        // Subscription is no longer valid - should be removed from database
        console.warn("Push subscription is no longer valid");
      }
    }

    return false;
  }
}

/**
 * Send a clarification question as a push notification.
 */
export async function sendClarificationNotification(
  subscription: PushSubscriptionData,
  question: string,
  conversationId: string,
  _itemTitle: string, // Reserved for future use in notification customization
): Promise<boolean> {
  return sendPushNotification(subscription, {
    title: "Quick question about your save",
    body: question,
    data: {
      conversationId,
      action: "clarify",
    },
  });
}

/**
 * Send a confirmation notification when an item is saved.
 */
export async function sendConfirmationNotification(
  subscription: PushSubscriptionData,
  itemTitle: string,
  category: string,
  itemId: string,
): Promise<boolean> {
  return sendPushNotification(subscription, {
    title: "Saved!",
    body: `"${itemTitle}" added to ${category}`,
    data: {
      itemId,
      action: "view",
    },
  });
}

/**
 * Get the public VAPID key for client-side subscription.
 */
export function getVapidPublicKey(): string | undefined {
  return vapidPublicKey;
}
