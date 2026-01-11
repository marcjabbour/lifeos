/**
 * LifeOS API Layer
 *
 * THE BOUNDARY - All backend calls go through this file.
 * Components import from here, never call fetch directly.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

// =============================================================================
// TYPES
// =============================================================================

export interface Item {
  id: string;
  user_id: string;
  type: "article" | "note" | "task" | "link" | "image" | "file";
  title: string;
  content: string | null;
  url: string | null;
  source: string | null;
  metadata: Record<string, unknown>;
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
}

export interface CreateItemInput {
  type: Item["type"];
  title: string;
  content?: string;
  url?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateItemInput {
  title?: string;
  content?: string;
  url?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface ItemsFilter {
  type?: Item["type"];
  source?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
}

export interface ChatResponse {
  response: string;
  sources?: Item[];
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// =============================================================================
// API CLIENT
// =============================================================================

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const config: RequestInit = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      errorData.error || `Request failed: ${response.statusText}`,
      errorData,
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// =============================================================================
// API METHODS
// =============================================================================

export const api = {
  // ---------------------------------------------------------------------------
  // Items
  // ---------------------------------------------------------------------------
  items: {
    list: (filters?: ItemsFilter) => {
      const params = new URLSearchParams();
      if (filters?.type) params.set("type", filters.type);
      if (filters?.source) params.set("source", filters.source);
      if (filters?.search) params.set("search", filters.search);
      if (filters?.limit) params.set("limit", filters.limit.toString());
      if (filters?.offset) params.set("offset", filters.offset.toString());

      const query = params.toString();
      return request<Item[]>(`/api/items${query ? `?${query}` : ""}`);
    },

    get: (id: string) => request<Item>(`/api/items/${id}`),

    create: (data: CreateItemInput) =>
      request<Item>("/api/items", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    update: (id: string, data: UpdateItemInput) =>
      request<Item>(`/api/items/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      request<void>(`/api/items/${id}`, {
        method: "DELETE",
      }),

    search: (query: string, limit = 10) =>
      request<Item[]>(
        `/api/items/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      ),
  },

  // ---------------------------------------------------------------------------
  // Chat
  // ---------------------------------------------------------------------------
  chat: {
    send: (data: ChatRequest) =>
      request<ChatResponse>("/api/chat", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // ---------------------------------------------------------------------------
  // Push Notifications
  // ---------------------------------------------------------------------------
  push: {
    subscribe: (subscription: PushSubscriptionData) =>
      request<{ success: boolean }>("/api/push/subscribe", {
        method: "POST",
        body: JSON.stringify(subscription),
      }),

    unsubscribe: (endpoint: string) =>
      request<{ success: boolean }>("/api/push/unsubscribe", {
        method: "POST",
        body: JSON.stringify({ endpoint }),
      }),

    getVapidKey: () => request<{ publicKey: string }>("/api/push/vapid-key"),
  },

  // ---------------------------------------------------------------------------
  // Share Target (for PWA share sheet)
  // ---------------------------------------------------------------------------
  share: {
    receive: (formData: FormData) =>
      fetch(`${API_BASE}/api/share`, {
        method: "POST",
        body: formData,
      }).then((r) => {
        if (!r.ok) throw new ApiError(r.status, "Share failed");
        return r.json() as Promise<Item>;
      }),
  },
};

// Export error class for catch handling
export { ApiError };
