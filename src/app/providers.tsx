"use client";

import { ServiceWorkerProvider } from "@/components/providers/service-worker-provider";
import { PerformanceProvider } from "@/components/providers/performance-provider";
import { ToastProvider } from "@/components/ui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PerformanceProvider>
      <ServiceWorkerProvider>
        <ToastProvider>{children}</ToastProvider>
      </ServiceWorkerProvider>
    </PerformanceProvider>
  );
}
