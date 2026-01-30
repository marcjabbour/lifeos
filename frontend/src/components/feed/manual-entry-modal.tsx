"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XIcon, NovaIcon, LoaderIcon } from "@/components/icons";
import { api } from "@/lib/api";

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (entry: { title: string; content: string }) => void;
}

export function ManualEntryModal({
  isOpen,
  onClose,
  onSubmit,
}: ManualEntryModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);

    try {
      // Submit to API - Nova will generate tags
      await api.post("/api/feed/manual-entry", {
        title: title.trim(),
        content: content.trim(),
      });

      if (onSubmit) {
        onSubmit({ title: title.trim(), content: content.trim() });
      }

      // Reset form and close
      setTitle("");
      setContent("");
      onClose();
    } catch (error) {
      console.error("Failed to create entry:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTitle("");
      setContent("");
      onClose();
    }
  };

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
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 px-4"
          >
            <div className="rounded-2xl border border-border bg-bg-elevated shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent-primary to-indigo-500 shadow-glow-purple-sm">
                    <NovaIcon size={16} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-semibold text-text-primary">
                      Create Entry
                    </h2>
                    <p className="text-[12px] text-text-muted">
                      Nova will auto-generate tags
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-bg-hover hover:text-text-secondary disabled:opacity-50"
                >
                  <XIcon size={18} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-5">
                <div className="mb-4">
                  <label
                    htmlFor="entry-title"
                    className="mb-1.5 block text-[13px] font-medium text-text-secondary"
                  >
                    Title
                  </label>
                  <input
                    id="entry-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What is this about?"
                    disabled={isSubmitting}
                    className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2.5 text-[14px] text-text-primary placeholder-text-muted outline-none transition-colors focus:border-accent-primary disabled:opacity-50"
                  />
                </div>

                <div className="mb-5">
                  <label
                    htmlFor="entry-content"
                    className="mb-1.5 block text-[13px] font-medium text-text-secondary"
                  >
                    Content
                  </label>
                  <textarea
                    id="entry-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Add a note, thought, or anything you want to remember..."
                    rows={4}
                    disabled={isSubmitting}
                    className="w-full resize-none rounded-lg border border-border-subtle bg-bg-primary px-3 py-2.5 text-[14px] text-text-primary placeholder-text-muted outline-none transition-colors focus:border-accent-primary disabled:opacity-50"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="btn btn-secondary btn-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!title.trim() || !content.trim() || isSubmitting}
                    className="btn btn-primary btn-sm flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <LoaderIcon size={14} className="animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Entry"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
