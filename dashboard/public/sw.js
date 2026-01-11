/**
 * LifeOS Service Worker
 *
 * Handles:
 * - Push notifications
 * - Offline caching
 * - Background sync
 */

const CACHE_NAME = "lifeos-v1";
const STATIC_CACHE = "lifeos-static-v1";
const DYNAMIC_CACHE = "lifeos-dynamic-v1";

// Assets to cache on install
const STATIC_ASSETS = ["/", "/offline.html", "/manifest.json"];

// =============================================================================
// INSTALL
// =============================================================================

self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("[SW] Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Take over immediately, don't wait for old SW to die
        return self.skipWaiting();
      }),
  );
});

// =============================================================================
// ACTIVATE
// =============================================================================

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
            .map((name) => {
              console.log("[SW] Deleting old cache:", name);
              return caches.delete(name);
            }),
        );
      })
      .then(() => {
        // Claim all clients immediately
        return self.clients.claim();
      }),
  );
});

// =============================================================================
// FETCH - Network-first with fallback to cache
// =============================================================================

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip API requests - always go to network
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // For navigation requests, try network first, fallback to cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Try cache, then offline page
          return caches
            .match(request)
            .then((cached) => cached || caches.match("/offline.html"));
        }),
    );
    return;
  }

  // For other requests, use stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          // Update cache with fresh response
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => cached);

      // Return cached immediately, update in background
      return cached || fetchPromise;
    }),
  );
});

// =============================================================================
// PUSH NOTIFICATIONS
// =============================================================================

self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received");

  let data = {
    title: "LifeOS",
    body: "You have a new notification",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    tag: "lifeos-notification",
    data: {},
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    vibrate: [100, 50, 100],
    actions: data.actions || [
      { action: "view", title: "View" },
      { action: "dismiss", title: "Dismiss" },
    ],
    requireInteraction: data.requireInteraction || false,
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// =============================================================================
// NOTIFICATION CLICK
// =============================================================================

self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.action);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  if (event.action === "dismiss") {
    return;
  }

  // Focus existing window or open new one
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus an existing window
        for (const client of clientList) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        // Open new window if none found
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }),
  );
});

// =============================================================================
// NOTIFICATION CLOSE
// =============================================================================

self.addEventListener("notificationclose", (event) => {
  console.log("[SW] Notification closed");

  // Track notification dismissal for analytics
  const data = event.notification.data;
  if (data?.trackDismissal) {
    // Could send to analytics endpoint
  }
});

// =============================================================================
// BACKGROUND SYNC
// =============================================================================

self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync:", event.tag);

  if (event.tag === "sync-items") {
    event.waitUntil(syncItems());
  }

  if (event.tag === "sync-captures") {
    event.waitUntil(syncCaptures());
  }
});

async function syncItems() {
  // Get queued items from IndexedDB and sync to server
  console.log("[SW] Syncing items...");
  // Implementation would go here
}

async function syncCaptures() {
  // Get queued captures from IndexedDB and sync to server
  console.log("[SW] Syncing captures...");
  // Implementation would go here
}

// =============================================================================
// MESSAGE HANDLING (from main thread)
// =============================================================================

self.addEventListener("message", (event) => {
  console.log("[SW] Message received:", event.data);

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data.type === "CACHE_URLS") {
    caches.open(DYNAMIC_CACHE).then((cache) => {
      cache.addAll(event.data.urls);
    });
  }

  if (event.data.type === "CLEAR_CACHE") {
    caches.delete(DYNAMIC_CACHE);
  }
});

// =============================================================================
// PERIODIC BACKGROUND SYNC (if supported)
// =============================================================================

self.addEventListener("periodicsync", (event) => {
  console.log("[SW] Periodic sync:", event.tag);

  if (event.tag === "refresh-feed") {
    event.waitUntil(refreshFeed());
  }
});

async function refreshFeed() {
  // Fetch latest items in background
  console.log("[SW] Refreshing feed in background...");
  // Implementation would go here
}
