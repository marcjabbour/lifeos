"use client";

import { NovaIcon, StarIcon } from "@/components/icons";

// Activity Timeline Widget
function ActivityWidget() {
  const activities = [
    {
      id: 1,
      text: "Enriched video transcript with key insights",
      time: "2 min ago",
      dotColor: "purple" as const,
      hasLine: true,
    },
    {
      id: 2,
      text: "Found 3 connections to existing notes",
      time: "15 min ago",
      dotColor: "amber" as const,
      hasLine: true,
    },
    {
      id: 3,
      text: "Organized meal prep list by store section",
      time: "1 hour ago",
      dotColor: "green" as const,
      hasLine: true,
    },
    {
      id: 4,
      text: "Processed 2 new bookmarks",
      time: "3 hours ago",
      dotColor: "gray" as const,
      hasLine: false,
    },
  ];

  const dotColorClasses = {
    purple: "bg-dot-active",
    amber: "bg-dot-warning",
    green: "bg-dot-success",
    gray: "bg-dot-muted",
  };

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
          <div key={activity.id} className="flex items-start gap-3 py-2">
            <div className="flex flex-col items-center pt-1.5">
              <div
                className={`h-2 w-2 rounded-full ${dotColorClasses[activity.dotColor]}`}
              />
              {activity.hasLine && (
                <div className="mt-2 h-8 w-px bg-border-subtle" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-[13px] leading-snug text-text-secondary">
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
        ))}
      </div>
    </div>
  );
}

// Nova Insight Widget
function InsightWidget() {
  return (
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
        Your morning capture routine is working. You&apos;ve saved 40% more
        items before noon compared to last month.
      </p>

      <div className="flex gap-2">
        <button className="btn btn-primary btn-sm">See Details</button>
        <button className="btn btn-secondary btn-sm">Dismiss</button>
      </div>
    </div>
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
    <aside className="fixed right-6 top-6 hidden h-[calc(100vh-140px)] w-[320px] flex-col gap-5 overflow-y-auto pb-4 xl:flex">
      <ActivityWidget />
      <InsightWidget />
      <UpgradeWidget />
    </aside>
  );
}
