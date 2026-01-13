"use client";

import { useEffect } from "react";
import { initWebVitals } from "@/lib/client/analytics";

export function PerformanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Initialize Web Vitals monitoring
    initWebVitals();
  }, []);

  return <>{children}</>;
}
