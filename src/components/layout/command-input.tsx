"use client";

import { useState, useRef } from "react";
import { NovaIcon, PaperclipIcon, MicIcon, SendIcon } from "@/components/icons";

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
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && onSubmit) {
      onSubmit(message.trim());
      setMessage("");
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 z-40 w-full max-w-[680px] -translate-x-1/2 px-4 md:left-[calc(50%+34px)] md:max-w-[min(680px,calc(100vw-68px-320px-80px))] lg:max-w-[min(680px,calc(100vw-68px-320px-80px))]">
      <form
        onSubmit={handleSubmit}
        className={`
          flex items-center gap-3 rounded-2xl border bg-bg-elevated p-3 shadow-xl transition-all duration-300
          ${
            isFocused
              ? "border-accent-primary shadow-[0_16px_48px_rgba(0,0,0,0.6),0_0_40px_rgba(139,92,246,0.25)]"
              : "border-border shadow-[0_16px_48px_rgba(0,0,0,0.6),0_0_30px_rgba(139,92,246,0.15)]"
          }
        `}
        style={{
          transform: isFocused ? "scale(1.01)" : "scale(1)",
        }}
      >
        {/* Nova Avatar */}
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-primary to-indigo-500 shadow-glow-purple-sm">
          <NovaIcon size={20} className="text-white" />
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
          className="flex-1 bg-transparent text-[15px] text-text-primary placeholder-text-muted outline-none"
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-bg-hover hover:text-text-secondary"
            title="Attach file"
          >
            <PaperclipIcon size={18} />
          </button>

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-bg-hover hover:text-text-secondary"
            title="Voice input"
          >
            <MicIcon size={18} />
          </button>

          <button
            type="submit"
            disabled={!message.trim()}
            className={`
              flex h-9 w-9 items-center justify-center rounded-full transition-all
              ${
                message.trim()
                  ? "bg-accent-primary text-white hover:bg-accent-hover hover:shadow-glow-purple-sm"
                  : "bg-bg-hover text-text-disabled cursor-not-allowed"
              }
            `}
            title="Send"
          >
            <SendIcon size={18} />
          </button>
        </div>
      </form>

      {/* Mobile: hide when keyboard is not visible to not overlap bottom nav */}
      <style jsx>{`
        @media (max-width: 768px) {
          div {
            bottom: calc(64px + 24px);
            left: 50%;
            transform: translateX(-50%);
            max-width: calc(100vw - 32px);
          }
        }
      `}</style>
    </div>
  );
}
