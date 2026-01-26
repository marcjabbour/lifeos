"use client";

/**
 * QueryResultModal
 *
 * Modal for displaying Nova query results when a user asks a question
 * that returns items rather than applying filters.
 */

import { motion, AnimatePresence } from "framer-motion";
import { XIcon, NovaIcon, ExternalLinkIcon } from "@/components/icons";

interface QueryResultItem {
  id: string;
  title: string;
  category: string;
  url?: string;
  source_type: string;
  created_at: string;
}

interface QueryResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  answer: string;
  items: QueryResultItem[];
}

// Category colors for visual distinction
const CATEGORY_COLORS: Record<string, string> = {
  food: "bg-orange-500/10 text-orange-400",
  tech: "bg-blue-500/10 text-blue-400",
  music: "bg-purple-500/10 text-purple-400",
  entertainment: "bg-pink-500/10 text-pink-400",
  fitness: "bg-green-500/10 text-green-400",
  travel: "bg-cyan-500/10 text-cyan-400",
  work: "bg-yellow-500/10 text-yellow-400",
  learning: "bg-indigo-500/10 text-indigo-400",
  finance: "bg-emerald-500/10 text-emerald-400",
  social: "bg-rose-500/10 text-rose-400",
  uncategorized: "bg-gray-500/10 text-gray-400",
};

export function QueryResultModal({
  isOpen,
  onClose,
  answer,
  items,
}: QueryResultModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2"
          >
            <div className="mx-4 rounded-xl border border-border bg-bg-elevated shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-accent-primary to-indigo-500">
                    <NovaIcon size={14} className="text-white" />
                  </div>
                  <span className="text-sm font-medium text-text-primary">
                    Nova
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
                >
                  <XIcon size={16} />
                </button>
              </div>

              {/* Content */}
              <div className="max-h-[60vh] overflow-y-auto p-4">
                {/* Answer */}
                <p className="mb-4 text-sm text-text-secondary">{answer}</p>

                {/* Items List */}
                {items.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                      Related Items
                    </p>
                    {items.map((item) => (
                      <QueryResultItem key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-border px-4 py-3">
                <button
                  onClick={onClose}
                  className="w-full rounded-lg bg-bg-hover py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-primary hover:text-text-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function QueryResultItem({ item }: { item: QueryResultItem }) {
  const categoryColor =
    CATEGORY_COLORS[item.category] || CATEGORY_COLORS.uncategorized;

  const formattedDate = new Date(item.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="group flex items-start gap-3 rounded-lg border border-border bg-bg-primary p-3 transition-colors hover:border-border-subtle">
      <div className="flex-1 min-w-0">
        <h4 className="truncate text-sm font-medium text-text-primary">
          {item.title}
        </h4>
        <div className="mt-1 flex items-center gap-2">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${categoryColor}`}
          >
            {item.category}
          </span>
          <span className="text-[10px] text-text-muted">{formattedDate}</span>
        </div>
      </div>
      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-text-muted opacity-0 transition-all group-hover:opacity-100 hover:bg-bg-hover hover:text-text-primary"
        >
          <ExternalLinkIcon size={14} />
        </a>
      )}
    </div>
  );
}
