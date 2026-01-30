"use client";

import { ServiceWorkerProvider } from "@/components/providers/service-worker-provider";
import { PerformanceProvider } from "@/components/providers/performance-provider";
import { ToastProvider } from "@/components/ui/toast";
import { ErrorBoundary } from "@/components/error/error-boundary";
import { NetworkError } from "@/components/error/network-error";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <PerformanceProvider>
        <ServiceWorkerProvider>
          <ToastProvider>
            {children}
            <NetworkError />
          </ToastProvider>
        </ServiceWorkerProvider>
      </PerformanceProvider>
    </ErrorBoundary>
  );
}
