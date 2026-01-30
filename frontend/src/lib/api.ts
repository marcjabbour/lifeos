import { getSupabase } from "@/lib/core/database/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface ApiClientOptions extends RequestInit {
  skipAuth?: boolean;
}

export interface ApiError {
  error: string;
  status: number;
}

export async function apiClient<T = unknown>(
  path: string,
  options: ApiClientOptions = {},
): Promise<T> {
  const {
    skipAuth = false,
    headers: customHeaders,
    ...requestOptions
  } = options;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...customHeaders,
  };

  if (!skipAuth) {
    const supabase = getSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      (headers as Record<string, string>)["Authorization"] =
        `Bearer ${session.access_token}`;
    }
  }

  const url = path.startsWith("http") ? path : `${API_URL}${path}`;

  const response = await fetch(url, {
    ...requestOptions,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: ApiError = {
      error: errorData.error ?? `Request failed: ${response.status}`,
      status: response.status,
    };
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T = unknown>(path: string, options?: ApiClientOptions) =>
    apiClient<T>(path, { ...options, method: "GET" }),

  post: <T = unknown>(
    path: string,
    body?: unknown,
    options?: ApiClientOptions,
  ) =>
    apiClient<T>(path, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = unknown>(
    path: string,
    body?: unknown,
    options?: ApiClientOptions,
  ) =>
    apiClient<T>(path, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T = unknown>(
    path: string,
    body?: unknown,
    options?: ApiClientOptions,
  ) =>
    apiClient<T>(path, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = unknown>(path: string, options?: ApiClientOptions) =>
    apiClient<T>(path, { ...options, method: "DELETE" }),
};
