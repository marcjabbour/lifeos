"use client";

import { useState, useRef, useContext } from "react";
import {
  NovaIcon,
  PaperclipIcon,
  MicIcon,
  SendIcon,
  PlusIcon,
} from "@/components/icons";
import { ManualEntryModal } from "@/components/feed/manual-entry-modal";
import { FilterContext } from "@/contexts/FilterContext";

interface CommandInputProps {
  onSubmit?: (message: string) => void;
  placeholder?: string;
}

export function CommandInput({
  onSubmit,
  placeholder = "Ask Nova anything about your life...",
}: CommandInputProps) {
  const [message, setMessage] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get filter context for Nova commands (optional - component works without it)
  const filterContext = useContext(FilterContext);
  const isLoading = filterContext?.isLoading ?? false;
  const lastMessage = filterContext?.lastMessage ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const trimmedMessage = message.trim();
    setMessage("");

    // If custom onSubmit is provided, use it (backwards compatibility)
    if (onSubmit) {
      onSubmit(trimmedMessage);
    }

    // Also submit to Nova command API via FilterContext if available
    if (filterContext?.submitCommand) {
      await filterContext.submitCommand(trimmedMessage);
    }
  };

  return (
    <>
      <div className="mb-5 flex flex-col items-center gap-2">
        <div className="flex items-center justify-center gap-2 w-full">
          {/* Add Entry Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-bg-elevated text-text-muted transition-all hover:border-accent-primary hover:bg-bg-hover hover:text-accent-primary"
            title="Add manual entry"
          >
            <PlusIcon size={16} />
          </button>

          {/* Nova Input */}
          <form
            onSubmit={handleSubmit}
            className={`
              flex w-full max-w-md items-center gap-2 rounded-lg border bg-bg-elevated px-2.5 py-1.5 transition-all duration-200
              ${
                isFocused
                  ? "border-accent-primary shadow-glow-purple-sm"
                  : "border-border hover:border-border-subtle"
              }
            `}
          >
            {/* Nova Avatar */}
            <div
              className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-primary to-indigo-500 ${isLoading ? "animate-pulse" : ""}`}
            >
              <NovaIcon size={11} className="text-white" />
            </div>

            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              disabled={isLoading}
              className="flex-1 bg-transparent text-[12px] text-text-primary placeholder-text-muted outline-none disabled:opacity-50"
            />

            {/* Action Buttons */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-bg-hover hover:text-text-secondary"
                title="Attach file"
              >
                <PaperclipIcon size={12} />
              </button>

              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-bg-hover hover:text-text-secondary"
                title="Voice input"
              >
                <MicIcon size={12} />
              </button>

              <button
                type="submit"
                disabled={!message.trim() || isLoading}
                className={`
                  flex h-6 w-6 items-center justify-center rounded-full transition-all
                  ${
                    message.trim() && !isLoading
                      ? "bg-accent-primary text-white hover:bg-accent-hover"
                      : "bg-bg-hover text-text-disabled cursor-not-allowed"
                  }
                `}
                title="Send"
              >
                <SendIcon size={12} />
              </button>
            </div>
          </form>
        </div>

        {/* Status Message */}
        {lastMessage && (
          <div className="text-xs text-text-secondary animate-fade-in">
            {lastMessage}
          </div>
        )}
      </div>

      {/* Manual Entry Modal */}
      <ManualEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
