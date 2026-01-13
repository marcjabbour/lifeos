/**
 * Web Vitals monitoring and reporting
 * Tracks Core Web Vitals: LCP, FID, CLS, FCP, TTFB
 */

export interface WebVitalsMetric {
  name: "LCP" | "FID" | "CLS" | "FCP" | "TTFB" | "INP";
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
  navigationType: string;
}

// Thresholds per Google's Web Vitals recommendations
const thresholds = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
  FID: { good: 100, poor: 300 }, // First Input Delay
  CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte
  INP: { good: 200, poor: 500 }, // Interaction to Next Paint
};

function getRating(
  name: keyof typeof thresholds,
  value: number,
): "good" | "needs-improvement" | "poor" {
  const { good, poor } = thresholds[name];
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

export type WebVitalsReportHandler = (metric: WebVitalsMetric) => void;

/**
 * Report Web Vitals to analytics endpoint or console
 */
export function reportWebVitals(metric: WebVitalsMetric): void {
  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log(`[Web Vitals] ${metric.name}:`, {
      value: metric.value.toFixed(2),
      rating: metric.rating,
      delta: metric.delta.toFixed(2),
    });
  }

  // Send to analytics endpoint in production
  if (process.env.NODE_ENV === "production") {
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      page: window.location.pathname,
      timestamp: Date.now(),
    });

    // Use sendBeacon for reliable delivery
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics/vitals", body);
    } else {
      fetch("/api/analytics/vitals", {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {
        // Silently fail - analytics shouldn't break the app
      });
    }
  }
}

/**
 * Initialize Web Vitals monitoring
 * Call this in your app's entry point
 */
export async function initWebVitals(
  onReport: WebVitalsReportHandler = reportWebVitals,
): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    // Dynamic import to keep bundle size small
    const { onLCP, onFID, onCLS, onFCP, onTTFB, onINP } =
      await import("web-vitals");

    const handleMetric =
      (name: keyof typeof thresholds) =>
      (metric: {
        value: number;
        delta: number;
        id: string;
        navigationType: string;
      }) => {
        onReport({
          name,
          value: metric.value,
          rating: getRating(name, metric.value),
          delta: metric.delta,
          id: metric.id,
          navigationType: metric.navigationType,
        });
      };

    onLCP(handleMetric("LCP"));
    onFID(handleMetric("FID"));
    onCLS(handleMetric("CLS"));
    onFCP(handleMetric("FCP"));
    onTTFB(handleMetric("TTFB"));
    onINP(handleMetric("INP"));
  } catch {
    // web-vitals library not available
    console.warn("Web Vitals monitoring not available");
  }
}

/**
 * Performance budget checker
 * Use in CI/CD to enforce performance standards
 */
export interface PerformanceBudget {
  LCP: number;
  FID: number;
  CLS: number;
  FCP: number;
  TTFB: number;
  bundleSize: number; // in KB
}

export const defaultBudget: PerformanceBudget = {
  LCP: 2500, // ms
  FID: 100, // ms
  CLS: 0.1, // score
  FCP: 1800, // ms
  TTFB: 800, // ms
  bundleSize: 200, // KB
};

export function checkBudget(
  metrics: Partial<Record<keyof PerformanceBudget, number>>,
  budget: PerformanceBudget = defaultBudget,
): { passed: boolean; violations: string[] } {
  const violations: string[] = [];

  for (const [key, value] of Object.entries(metrics)) {
    const budgetValue = budget[key as keyof PerformanceBudget];
    if (value !== undefined && value > budgetValue) {
      violations.push(`${key}: ${value} exceeds budget of ${budgetValue}`);
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}
