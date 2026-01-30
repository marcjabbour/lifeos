"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[#0a0a0f] text-white">
        <div className="flex min-h-screen flex-col items-center justify-center p-8">
          <div className="text-center">
            <div className="mb-6 text-8xl font-bold text-red-500">Error</div>
            <h1 className="mb-2 text-2xl font-semibold">Critical Error</h1>
            <p className="mb-8 max-w-md text-gray-400">
              A critical error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={reset}
              className="inline-flex items-center justify-center rounded-lg bg-purple-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-purple-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
