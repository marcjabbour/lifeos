"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api, ApiError } from "@/lib/api";

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  error: Error | null;
  permission: NotificationPermission | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  requestPermission: () => Promise<NotificationPermission>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null,
  );

  const mountedRef = useRef(true);
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // Check if push is supported
  useEffect(() => {
    const checkSupport = async () => {
      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission);

        try {
          // Register service worker
          const registration = await navigator.serviceWorker.register("/sw.js");
          swRegistrationRef.current = registration;

          // Check existing subscription
          const subscription = await registration.pushManager.getSubscription();
          if (mountedRef.current) {
            setIsSubscribed(!!subscription);
          }
        } catch {
          console.error("Service worker registration failed");
        }
      }

      if (mountedRef.current) {
        setIsLoading(false);
      }
    };

    checkSupport();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      throw new Error("Push notifications not supported");
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError(new Error("Push notifications not supported"));
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Ensure permission is granted
      let currentPermission = permission;
      if (currentPermission !== "granted") {
        currentPermission = await requestPermission();
        if (currentPermission !== "granted") {
          throw new Error("Notification permission denied");
        }
      }

      // Get service worker registration
      const registration =
        swRegistrationRef.current || (await navigator.serviceWorker.ready);

      // Get VAPID public key from server
      const { publicKey } = await api.push.getVapidKey();

      // Convert VAPID key to Uint8Array
      const vapidKey = urlBase64ToUint8Array(publicKey);

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });

      // Send subscription to server
      const subJson = subscription.toJSON();
      await api.push.subscribe({
        endpoint: subJson.endpoint!,
        keys: {
          p256dh: subJson.keys!.p256dh,
          auth: subJson.keys!.auth,
        },
      });

      if (mountedRef.current) {
        setIsSubscribed(true);
      }

      return true;
    } catch (err) {
      if (mountedRef.current) {
        setError(
          err instanceof ApiError || err instanceof Error
            ? err
            : new Error("Failed to subscribe to push notifications"),
        );
      }
      return false;
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [isSupported, permission, requestPermission]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const registration =
        swRegistrationRef.current || (await navigator.serviceWorker.ready);

      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe locally
        await subscription.unsubscribe();

        // Notify server
        await api.push.unsubscribe(subscription.endpoint);
      }

      if (mountedRef.current) {
        setIsSubscribed(false);
      }

      return true;
    } catch (err) {
      if (mountedRef.current) {
        setError(
          err instanceof ApiError || err instanceof Error
            ? err
            : new Error("Failed to unsubscribe from push notifications"),
        );
      }
      return false;
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [isSupported]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    permission,
    subscribe,
    unsubscribe,
    requestPermission,
  };
}

// ---------------------------------------------------------------------------
// Helper: Convert VAPID key to Uint8Array
// ---------------------------------------------------------------------------

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
