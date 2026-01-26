"use client";

import { useState } from "react";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NovaIcon, ArrowRightIcon, CalendarIcon } from "@/components/icons";

interface NovaAction {
  id: string;
  userAction: string;
  novaResponse: string;
  category: string;
  timestamp: string;
}

// Mock data for 7-day activity summary
const MOCK_NOVA_ACTIVITY: NovaAction[] = [
  {
    id: "1",
    userAction: "Sent screenshot of Entrecote menu",
    novaResponse: "Created restaurant reminder with address and hours",
    category: "food",
    timestamp: "2 hours ago",
  },
  {
    id: "2",
    userAction: "Saved YouTube video about AI assistants",
    novaResponse: "Extracted key insights and linked to 3 related articles",
    category: "tech",
    timestamp: "5 hours ago",
  },
  {
    id: "3",
    userAction: "Bookmarked Kendrick Lamar album review",
    novaResponse: "Connected to your hip-hop production notes",
    category: "music",
    timestamp: "1 day ago",
  },
  {
    id: "4",
    userAction: "Shared meal prep recipes",
    novaResponse: "Organized grocery list by store section",
    category: "food",
    timestamp: "2 days ago",
  },
  {
    id: "5",
    userAction: "Saved hiking trail photos",
    novaResponse: "Tagged location and linked to outdoor gear reviews",
    category: "travel",
    timestamp: "3 days ago",
  },
  {
    id: "6",
    userAction: "Sent workout routine screenshot",
    novaResponse: "Created structured workout plan with timer reminders",
    category: "fitness",
    timestamp: "5 days ago",
  },
  {
    id: "7",
    userAction: "Bookmarked TypeScript tutorial",
    novaResponse: "Added to learning queue with estimated completion time",
    category: "tech",
    timestamp: "6 days ago",
  },
];

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

interface NovaActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NovaActivityModal({ isOpen, onClose }: NovaActivityModalProps) {
  const [activities] = useState<NovaAction[]>(MOCK_NOVA_ACTIVITY);

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
              {activities.map((activity) => (
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
                    <ArrowRightIcon size={14} className="text-accent-primary" />
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
              ))}
            </tbody>
          </table>
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
