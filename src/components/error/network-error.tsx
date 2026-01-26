"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { WifiOffIcon } from "@/components/icons";

interface NetworkErrorProps {
  onRetry?: () => void;
  message?: string;
}

export function NetworkError({
  onRetry,
  message = "You're currently offline. Please check your internet connection.",
}: NetworkErrorProps) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 shadow-lg backdrop-blur-sm">
        <WifiOffIcon className="h-5 w-5 flex-shrink-0 text-amber-500" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-200">No Connection</p>
          <p className="mt-1 text-xs text-amber-300/80">{message}</p>
        </div>
        {onRetry && (
          <Button
            size="sm"
            variant="secondary"
            onClick={onRetry}
            className="flex-shrink-0"
          >
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to detect online/offline status
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline };
}

export default NetworkError;
