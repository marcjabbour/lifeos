/**
 * LifeOS API Adapter
 *
 * HTTP client for communicating with LifeOS Next.js API endpoints.
 * Used by MCP tools to perform operations on the LifeOS backend.
 */

export interface LifeOSConfig {
  apiUrl: string;
  apiKey: string;
}

export interface ShareRequest {
  content: string;
  content_type: "url" | "text" | "image";
  source?: string;
}

export interface ShareResponse {
  success: boolean;
  action: string;
  item_id: string;
  job_id?: string;
  message: string;
}

export interface FeedItem {
  id: string;
  title: string;
  description?: string;
  content?: string;
  url?: string;
  content_type: string;
  category: string;
  tags: string[];
  source_type: string;
  created_at: string;
  metadata?: Record<string, unknown>;
  enrichment?: Record<string, unknown>;
}

export interface SearchResult {
  items: FeedItem[];
  total: number;
}

export interface FilterParams {
  categories?: string[];
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export interface NovaCommandResponse {
  type: "filter" | "query" | "action";
  filter?: {
    categories: string[];
    searchQuery?: string;
  };
  answer?: string;
  items?: FeedItem[];
}

export interface CategoryCount {
  category: string;
  count: number;
}

export class LifeOSApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: LifeOSConfig) {
    this.baseUrl = config.apiUrl.replace(/\/$/, ""); // Remove trailing slash
    this.apiKey = config.apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LifeOS API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * Share/ingest content (URL, text, or image)
   */
  async shareContent(request: ShareRequest): Promise<ShareResponse> {
    return this.request<ShareResponse>("/api/share", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  /**
   * Get recent items with optional filtering
   */
  async getItems(params: FilterParams = {}): Promise<SearchResult> {
    const searchParams = new URLSearchParams();

    if (params.categories?.length) {
      searchParams.set("categories", params.categories.join(","));
    }
    if (params.searchQuery) {
      searchParams.set("q", params.searchQuery);
    }
    if (params.limit) {
      searchParams.set("limit", params.limit.toString());
    }
    if (params.offset) {
      searchParams.set("offset", params.offset.toString());
    }

    const query = searchParams.toString();
    const endpoint = `/api/items${query ? `?${query}` : ""}`;

    return this.request<SearchResult>(endpoint, { method: "GET" });
  }

  /**
   * Search items using semantic and text search
   */
  async searchItems(
    query: string,
    categories?: string[],
    limit = 10,
  ): Promise<SearchResult> {
    const searchParams = new URLSearchParams();
    searchParams.set("q", query);
    if (categories?.length) {
      searchParams.set("categories", categories.join(","));
    }
    searchParams.set("limit", limit.toString());

    return this.request<SearchResult>(`/api/items?${searchParams.toString()}`, {
      method: "GET",
    });
  }

  /**
   * Send a natural language command to Nova
   */
  async sendNovaCommand(command: string): Promise<NovaCommandResponse> {
    return this.request<NovaCommandResponse>("/api/nova/command", {
      method: "POST",
      body: JSON.stringify({ command }),
    });
  }

  /**
   * Get category counts for the current user
   */
  async getCategories(): Promise<CategoryCount[]> {
    return this.request<CategoryCount[]>("/api/feed/filter", {
      method: "GET",
    });
  }

  /**
   * Apply a filter to the UI (used for UI control tools)
   */
  async applyFilter(filter: {
    categories?: string[];
    searchQuery?: string;
  }): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>("/api/feed/filter", {
      method: "POST",
      body: JSON.stringify(filter),
    });
  }
}

/**
 * Create a LifeOS API client from environment variables
 */
export function createClientFromEnv(): LifeOSApiClient {
  const apiUrl = process.env.LIFEOS_API_URL;
  const apiKey = process.env.LIFEOS_API_KEY;

  if (!apiUrl) {
    throw new Error("LIFEOS_API_URL environment variable is required");
  }
  if (!apiKey) {
    throw new Error("LIFEOS_API_KEY environment variable is required");
  }

  return new LifeOSApiClient({ apiUrl, apiKey });
}
