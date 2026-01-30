"use client";

import { useState, useEffect, useCallback } from "react";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { NovaIcon, ArrowRightIcon, CalendarIcon } from "@/components/icons";
import type { NovaActivityItem } from "./widgets-container";

interface NovaAction {
  id: string;
  userAction: string;
  novaResponse: string;
  category: string;
  timestamp: string;
}

/**
 * Format timestamp to relative time (e.g., "2 hours ago", "3 days ago")
 */
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

/**
 * Map dot_color to category name
 */
function mapDotColorToCategory(dotColor: string): string {
  const colorToCategory: Record<string, string> = {
    purple: "tech",
    amber: "work",
    green: "fitness",
    cyan: "music",
    pink: "entertainment",
    blue: "travel",
    coral: "food",
    gray: "general",
  };
  return colorToCategory[dotColor] || "general";
}

/**
 * Convert API activity to display format
 */
function convertToDisplayAction(item: NovaActivityItem): NovaAction {
  // Parse the action summary to extract user action and Nova response
  // The action_summary contains what Nova did
  // The rationale contains why Nova did it
  return {
    id: item.id,
    userAction: item.rationale
      ? extractUserAction(item.rationale)
      : "Saved content",
    novaResponse: item.action_summary,
    category: mapDotColorToCategory(item.dot_color),
    timestamp: formatRelativeTime(item.created_at),
  };
}

/**
 * Extract user action from rationale text
 * Rationale typically starts with "You saved..." or "You shared..."
 */
function extractUserAction(rationale: string): string {
  // Try to extract the first sentence that describes what the user did
  const youMatch = rationale.match(/^You\s+([^.]+)/i);
  if (youMatch) {
    return youMatch[0];
  }
  // Fallback: take first sentence
  const firstSentence = rationale.split(".")[0];
  if (firstSentence && firstSentence.length < 100) {
    return firstSentence;
  }
  return "Saved content";
}

// Category color mapping
const CATEGORY_COLORS: Record<string, string> = {
  food: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  tech: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  music: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  entertainment: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  fitness: "bg-green-500/15 text-green-400 border-green-500/30",
  travel: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  work: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  learning: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  finance: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  social: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

// Loading skeleton for table rows
function TableRowSkeleton() {
  return (
    <tr className="border-b border-border-subtle/50">
      <td className="px-4 py-3">
        <div className="h-4 w-40 animate-pulse rounded bg-border-subtle" />
      </td>
      <td className="px-2 py-3">
        <div className="h-4 w-4 animate-pulse rounded bg-border-subtle" />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-5 w-16 animate-pulse rounded-full bg-border-subtle" />
          <div className="h-4 w-48 animate-pulse rounded bg-border-subtle" />
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="h-3 w-16 animate-pulse rounded bg-border-subtle" />
      </td>
    </tr>
  );
}

interface NovaActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NovaActivityModal({ isOpen, onClose }: NovaActivityModalProps) {
  const [activities, setActivities] = useState<NovaAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch last 7 days of activity (limit 20)
      const response = await fetch("/api/nova/activity?limit=20");

      if (!response.ok) {
        throw new Error(`Failed to fetch activities: ${response.status}`);
      }

      const data = await response.json();
      const apiActivities = data.activities as NovaActivityItem[];

      // Convert to display format
      const displayActivities = apiActivities.map(convertToDisplayAction);

      setActivities(displayActivities);
    } catch (err) {
      console.error("Failed to fetch Nova activities:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load activities",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchActivities();
    }
  }, [isOpen, fetchActivities]);

  // Calculate summary stats
  const totalActions = activities.length;
  const categoryCounts = activities.reduce(
    (acc, a) => {
      acc[a.category] = (acc[a.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const topCategory =
    Object.entries(categoryCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ||
    "general";

  // Generate summary text
  const summaryParts: string[] = [];
  if (categoryCounts.food)
    summaryParts.push(
      `${categoryCounts.food} restaurant${categoryCounts.food > 1 ? "s" : ""}`,
    );
  if (categoryCounts.music)
    summaryParts.push(
      `${categoryCounts.music} music item${categoryCounts.music > 1 ? "s" : ""}`,
    );
  if (categoryCounts.tech)
    summaryParts.push(
      `${categoryCounts.tech} tech article${categoryCounts.tech > 1 ? "s" : ""}`,
    );
  if (categoryCounts.travel)
    summaryParts.push(
      `${categoryCounts.travel} travel memory${categoryCounts.travel > 1 ? "ies" : ""}`,
    );
  if (categoryCounts.fitness)
    summaryParts.push(
      `${categoryCounts.fitness} workout${categoryCounts.fitness > 1 ? "s" : ""}`,
    );

  const summaryText =
    summaryParts.length > 0
      ? `You saved ${summaryParts.slice(0, 3).join(", ")}${summaryParts.length > 3 ? " and more" : ""}`
      : `${totalActions} items processed`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nova Activity - Last 7 Days"
      description={summaryText}
      size="lg"
      showCloseButton
    >
      <ModalBody className="p-0">
        {/* Summary Header */}
        <div className="flex items-center gap-4 border-b border-border-subtle bg-bg-elevated/50 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-accent-primary to-indigo-500 shadow-glow-purple-sm">
            <NovaIcon size={24} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="text-lg font-semibold text-text-primary">
              Weekly Summary
            </div>
            <div className="text-sm text-text-secondary">
              Nova processed {totalActions} items and created {totalActions}{" "}
              enrichments
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-accent-primary">23%</div>
            <div className="text-xs text-text-muted">productivity boost</div>
          </div>
        </div>

        {/* Activity Table */}
        <div className="max-h-[400px] overflow-y-auto">
          {error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-text-muted">{error}</p>
              <button
                onClick={fetchActivities}
                className="mt-2 text-xs text-accent-primary hover:text-accent-hover"
              >
                Try again
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-bg-card">
                <tr className="border-b border-border-subtle text-left text-[11px] uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-3 font-medium">Your Action</th>
                  <th className="w-8 px-4 py-3 font-medium"></th>
                  <th className="px-4 py-3 font-medium">Nova Created</th>
                  <th className="px-4 py-3 text-right font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  // Loading skeletons
                  <>
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                  </>
                ) : activities.length === 0 ? (
                  // Empty state
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center">
                      <p className="text-sm text-text-muted">
                        No activity yet this week
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        Nova will show activity as you save content
                      </p>
                    </td>
                  </tr>
                ) : (
                  // Activity rows
                  activities.map((activity) => (
                    <tr
                      key={activity.id}
                      className="border-b border-border-subtle/50 transition-colors hover:bg-bg-hover/50"
                    >
                      <td className="px-4 py-3">
                        <div className="text-[13px] text-text-primary">
                          {activity.userAction}
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <ArrowRightIcon
                          size={14}
                          className="text-accent-primary"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${
                              CATEGORY_COLORS[activity.category] ||
                              "bg-gray-500/15 text-gray-400 border-gray-500/30"
                            }`}
                          >
                            {activity.category}
                          </span>
                          <span className="text-[13px] text-text-secondary">
                            {activity.novaResponse}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[11px] text-text-muted">
                          {activity.timestamp}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button variant="primary" leftIcon={<CalendarIcon size={16} />}>
          View Full History
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default NovaActivityModal;
