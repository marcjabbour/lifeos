"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangleIcon, RefreshIcon } from "@/components/icons";

export type APIErrorType =
  | "network"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "rate_limit"
  | "budget_exceeded"
  | "server"
  | "validation"
  | "unknown";

interface APIErrorProps {
  type: APIErrorType;
  message?: string;
  onRetry?: () => void;
  resetTime?: Date;
  className?: string;
}

const errorMessages: Record<
  APIErrorType,
  { title: string; description: string }
> = {
  network: {
    title: "Connection Error",
    description:
      "Unable to connect to the server. Please check your internet connection.",
  },
  unauthorized: {
    title: "Session Expired",
    description: "Your session has expired. Please sign in again.",
  },
  forbidden: {
    title: "Access Denied",
    description: "You don't have permission to access this resource.",
  },
  not_found: {
    title: "Not Found",
    description: "The requested resource could not be found.",
  },
  rate_limit: {
    title: "Nova is Busy",
    description: "Too many requests. Please wait a moment before trying again.",
  },
  budget_exceeded: {
    title: "Usage Limit Reached",
    description: "You've reached your usage limit for this period.",
  },
  server: {
    title: "Server Error",
    description: "Something went wrong on our end. Please try again later.",
  },
  validation: {
    title: "Invalid Request",
    description: "Please check your input and try again.",
  },
  unknown: {
    title: "Error",
    description: "An unexpected error occurred. Please try again.",
  },
};

export function APIError({
  type,
  message,
  onRetry,
  resetTime,
  className = "",
}: APIErrorProps) {
  const { title, description } = errorMessages[type];

  return (
    <div
      className={`flex flex-col items-center justify-center p-6 text-center ${className}`}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
        <AlertTriangleIcon className="h-6 w-6 text-red-500" />
      </div>

      <h3 className="mb-2 text-lg font-semibold text-text-primary">{title}</h3>

      <p className="mb-4 max-w-sm text-sm text-text-secondary">
        {message || description}
      </p>

      {resetTime && (
        <p className="mb-4 text-xs text-text-muted">
          Resets at{" "}
          {resetTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}

      {onRetry && (
        <Button onClick={onRetry} variant="secondary" size="sm">
          <RefreshIcon className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  );
}

/**
 * Parse HTTP status code to APIErrorType
 */
export function getErrorTypeFromStatus(status: number): APIErrorType {
  switch (status) {
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "not_found";
    case 429:
      return "rate_limit";
    case 400:
      return "validation";
    case 402:
      return "budget_exceeded";
    case 500:
    case 502:
    case 503:
    case 504:
      return "server";
    default:
      return "unknown";
  }
}

/**
 * Parse error response to user-friendly message
 */
export function parseAPIError(error: unknown): {
  type: APIErrorType;
  message?: string;
} {
  // Network error
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return { type: "network" };
  }

  // Response error with status
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status: number }).status;
    const type = getErrorTypeFromStatus(status);

    // Extract message if available
    const message =
      "message" in error
        ? String((error as { message: string }).message)
        : undefined;

    return { type, message };
  }

  return { type: "unknown" };
}

export default APIError;
