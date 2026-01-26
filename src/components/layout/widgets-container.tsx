"use client";

import { useState } from "react";
import { NovaIcon, StarIcon } from "@/components/icons";
import { NovaActivityModal } from "./nova-activity-modal";

// Neon dot color mapping
type NeonDotColor =
  | "purple"
  | "amber"
  | "green"
  | "cyan"
  | "pink"
  | "blue"
  | "coral"
  | "gray";

const neonDotClasses: Record<NeonDotColor, string> = {
  purple: "neon-dot-tech",
  amber: "neon-dot-work",
  green: "neon-dot-fitness",
  cyan: "neon-dot-music",
  pink: "neon-dot-entertainment",
  blue: "neon-dot-travel",
  coral: "neon-dot-food",
  gray: "neon-dot-default",
};

// Activity data with rationale
interface Activity {
  id: number;
  text: string;
  time: string;
  dotColor: NeonDotColor;
  hasLine: boolean;
  rationale?: string;
}

// Tooltip Component
interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && content && (
        <div className="absolute right-full top-1/2 z-[100] mr-3 w-64 -translate-y-1/2 transform">
          <div
            className="rounded-lg border border-border-subtle px-3 py-2 text-[12px] leading-relaxed text-text-secondary shadow-lg"
            style={{ backgroundColor: "rgba(22, 22, 32, 0.98)" }}
          >
            <div className="mb-1 flex items-center gap-1.5">
              <NovaIcon size={12} className="text-accent-primary" />
              <span className="font-medium text-accent-primary">
                Nova&apos;s Rationale
              </span>
            </div>
            {content}
          </div>
          {/* Tooltip arrow - pointing right */}
          <div className="absolute left-full top-1/2 -translate-y-1/2 transform">
            <div
              className="border-8 border-transparent"
              style={{ borderLeftColor: "rgba(22, 22, 32, 0.98)" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Neon Dot Component with glow effect
function NeonDot({ color }: { color: NeonDotColor }) {
  return (
    <div className={`neon-dot ${neonDotClasses[color]} animate-pulse-slow`} />
  );
}

// Activity Timeline Widget
function ActivityWidget() {
  const activities: Activity[] = [
    {
      id: 1,
      text: "Enriched video transcript with key insights",
      time: "2 min ago",
      dotColor: "purple",
      hasLine: true,
      rationale:
        "You saved a 28-minute video about personal AI assistants. I extracted the key insights and connected them to 3 articles you saved last month about productivity systems.",
    },
    {
      id: 2,
      text: "Found 3 connections to existing notes",
      time: "15 min ago",
      dotColor: "amber",
      hasLine: true,
      rationale:
        "While processing your new bookmark about second brain concepts, I noticed it relates to your existing notes on knowledge management and PKM workflows.",
    },
    {
      id: 3,
      text: "Organized meal prep list by store section",
      time: "1 hour ago",
      dotColor: "coral",
      hasLine: true,
      rationale:
        "You saved several Mediterranean recipes this week. I compiled the ingredients and organized them by grocery store sections to make your shopping trip more efficient.",
    },
    {
      id: 4,
      text: "Processed 2 new bookmarks",
      time: "3 hours ago",
      dotColor: "gray",
      hasLine: false,
      rationale:
        "You shared two articles from your browser. I extracted their content and added them to your reading list with automatic tags.",
    },
  ];

  return (
    <div className="widget animate-fade-in">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">
          Nova&apos;s Activity
        </h3>
        <button className="text-xs text-accent-primary transition-colors hover:text-accent-hover">
          View all
        </button>
      </div>

      <div className="flex flex-col gap-1">
        {activities.map((activity) => (
          <Tooltip key={activity.id} content={activity.rationale || ""}>
            <div className="group flex cursor-pointer items-start gap-3 rounded-lg py-2 transition-colors hover:bg-bg-hover/50">
              {/* Left neon dot */}
              <div className="flex flex-col items-center pt-1.5">
                <NeonDot color={activity.dotColor} />
                {activity.hasLine && (
                  <div className="mt-2 h-8 w-px bg-border-subtle" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <p className="text-[13px] leading-snug text-text-secondary transition-colors group-hover:text-text-primary">
                  {activity.text.split(" ").map((word, i) =>
                    word.includes("video") ||
                    word.includes("connections") ||
                    word.includes("meal") ||
                    word.includes("bookmarks") ? (
                      <strong key={i} className="font-medium text-text-primary">
                        {word}{" "}
                      </strong>
                    ) : (
                      word + " "
                    ),
                  )}
                </p>
                <span className="mt-1 text-[11px] text-text-muted">
                  {activity.time}
                </span>
              </div>
            </div>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

// Nova Insight Widget
function InsightWidget() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="widget insight-widget animate-fade-in stagger-2">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent-primary to-indigo-500 shadow-glow-purple-sm">
            <NovaIcon size={20} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-text-primary">
              Nova Insight
            </div>
            <div className="text-xs text-text-muted">Weekly Analysis</div>
          </div>
        </div>

        <div className="mb-3 flex items-baseline gap-2">
          <span className="text-[32px] font-bold leading-none text-accent-primary text-glow-purple">
            23%
          </span>
          <span className="text-sm text-text-secondary">
            more productive time
          </span>
        </div>

        <p className="mb-4 text-[13px] leading-relaxed text-text-secondary">
          You saved a couple restaurants and some music this week. Click to see
          all your activity.
        </p>

        <div className="flex gap-2">
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setIsModalOpen(true)}
          >
            See Details
          </button>
          <button className="btn btn-secondary btn-sm">Dismiss</button>
        </div>
      </div>

      <NovaActivityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

// Upgrade Widget
function UpgradeWidget() {
  return (
    <div className="widget upgrade-widget animate-fade-in stagger-3">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-nova-amber-bg">
        <StarIcon size={22} className="text-nova-amber" />
      </div>

      <h3 className="mb-2 text-[15px] font-semibold text-text-primary">
        Upgrade to Pro Plan
      </h3>

      <p className="mb-4 text-[13px] leading-relaxed text-text-secondary">
        Unlock unlimited enrichments, advanced connections, and priority
        processing.
      </p>

      <button className="btn w-full bg-gradient-to-r from-nova-amber to-amber-600 font-semibold text-bg-primary hover:shadow-glow-amber">
        Explore Pro
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}

export function WidgetsContainer() {
  return (
    <aside className="fixed right-6 top-6 bottom-6 hidden w-[320px] flex-col gap-5 overflow-y-auto pr-1 xl:flex scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border-subtle hover:scrollbar-thumb-border">
      <ActivityWidget />
      <InsightWidget />
      <UpgradeWidget />
    </aside>
  );
}
