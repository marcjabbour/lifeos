"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center">
        <div className="mb-6 text-8xl font-bold text-red-500">500</div>
        <h1 className="mb-2 text-2xl font-semibold text-text-primary">
          Something went wrong
        </h1>
        <p className="mb-8 max-w-md text-text-secondary">
          We encountered an unexpected error. Our team has been notified and is
          working on a fix.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="primary">
            Try Again
          </Button>
          <Button
            onClick={() => (window.location.href = "/")}
            variant="secondary"
          >
            Go Home
          </Button>
        </div>
        {process.env.NODE_ENV === "development" && (
          <details className="mt-8 text-left max-w-2xl mx-auto">
            <summary className="cursor-pointer text-sm text-text-muted">
              Error Details
            </summary>
            <pre className="mt-2 overflow-auto rounded bg-bg-elevated p-4 text-xs text-red-400">
              {error.message}
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
