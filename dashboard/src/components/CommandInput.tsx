"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, KeyboardEvent, FormEvent } from "react";

// =============================================================================
// TYPES
// =============================================================================

interface CommandInputProps {
  onSubmit?: (value: string) => void;
  onTyping?: (isTyping: boolean) => void;
  placeholder?: string;
  isLoading?: boolean;
  className?: string;
}

// =============================================================================
// COMMAND INPUT COMPONENT
// =============================================================================

export function CommandInput({
  onSubmit,
  onTyping,
  placeholder = "Ask anything or capture a thought...",
  isLoading = false,
  className = "",
}: CommandInputProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  // Notify parent of typing state
  useEffect(() => {
    onTyping?.(value.length > 0);
  }, [value, onTyping]);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (value.trim() && !isLoading) {
      onSubmit?.(value.trim());
      setValue("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className={`relative ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Outer glow container */}
      <motion.div
        className="relative"
        animate={{
          boxShadow: isFocused
            ? "0 0 30px rgba(0, 212, 255, 0.2), 0 0 60px rgba(139, 92, 246, 0.1)"
            : "0 0 0 rgba(0, 212, 255, 0)",
        }}
        transition={{ duration: 0.3 }}
        style={{ borderRadius: "1rem" }}
      >
        {/* Input container */}
        <div
          className={`
            relative flex items-end gap-2
            rounded-2xl border bg-surface p-3
            transition-colors duration-200
            ${
              isFocused
                ? "border-cyan-500/50"
                : "border-border hover:border-border/80"
            }
          `}
        >
          {/* Textarea */}
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={isLoading}
            rows={1}
            className="
              min-h-[24px] max-h-[200px] flex-1 resize-none
              bg-transparent text-sm text-primary
              placeholder:text-tertiary
              focus:outline-none
              disabled:opacity-50
            "
          />

          {/* Action buttons */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Attachment button */}
            <motion.button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-tertiary transition-colors hover:bg-elevated hover:text-secondary"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <AttachmentIcon />
            </motion.button>

            {/* Submit button */}
            <motion.button
              type="submit"
              disabled={!value.trim() || isLoading}
              className={`
                flex h-8 w-8 items-center justify-center rounded-lg
                transition-all duration-200
                ${
                  value.trim() && !isLoading
                    ? "bg-gradient-to-r from-cyan-500 to-purple-500 text-black"
                    : "bg-elevated text-tertiary"
                }
                disabled:cursor-not-allowed disabled:opacity-50
              `}
              whileHover={value.trim() && !isLoading ? { scale: 1.05 } : {}}
              whileTap={value.trim() && !isLoading ? { scale: 0.95 } : {}}
            >
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, rotate: 0 }}
                    animate={{ opacity: 1, rotate: 360 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      rotate: { duration: 1, repeat: Infinity, ease: "linear" },
                    }}
                  >
                    <LoadingIcon />
                  </motion.div>
                ) : (
                  <motion.div
                    key="send"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <SendIcon />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        {/* Pulse ring when focused */}
        <AnimatePresence>
          {isFocused && (
            <motion.div
              className="pointer-events-none absolute inset-0 rounded-2xl"
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 0.5, 0],
                scale: [1, 1.02, 1],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                border: "1px solid rgba(0, 212, 255, 0.3)",
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Hints */}
      <div className="mt-2 flex items-center justify-between px-1">
        <p className="text-xs text-tertiary">
          Press{" "}
          <kbd className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[10px]">
            Enter
          </kbd>{" "}
          to send,{" "}
          <kbd className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[10px]">
            Shift+Enter
          </kbd>{" "}
          for new line
        </p>
        <p className="text-xs text-tertiary">
          {value.length > 0 && `${value.length} chars`}
        </p>
      </div>
    </motion.form>
  );
}

// =============================================================================
// QUICK CAPTURE INPUT - Simplified for mobile
// =============================================================================

interface QuickCaptureProps {
  onSubmit?: (value: string) => void;
  onClose?: () => void;
  isLoading?: boolean;
}

export function QuickCapture({
  onSubmit,
  onClose,
  isLoading = false,
}: QuickCaptureProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading) {
      onSubmit?.(value.trim());
      setValue("");
      onClose?.();
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <motion.form
        onSubmit={handleSubmit}
        className="w-full max-w-lg p-4"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="relative overflow-hidden rounded-2xl border border-border bg-elevated">
          {/* Glow effect */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10" />

          {/* Input row */}
          <div className="relative flex items-center gap-3 p-4">
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Quick capture..."
              disabled={isLoading}
              className="flex-1 bg-transparent text-base text-primary placeholder:text-tertiary focus:outline-none"
            />

            <motion.button
              type="submit"
              disabled={!value.trim() || isLoading}
              className={`
                flex h-10 w-10 items-center justify-center rounded-full
                ${
                  value.trim() && !isLoading
                    ? "bg-gradient-to-r from-cyan-500 to-purple-500 text-black"
                    : "bg-surface text-tertiary"
                }
                disabled:opacity-50
              `}
              whileHover={value.trim() ? { scale: 1.1 } : {}}
              whileTap={value.trim() ? { scale: 0.95 } : {}}
            >
              {isLoading ? <LoadingIcon /> : <SendIcon />}
            </motion.button>
          </div>

          {/* Quick action buttons */}
          <div className="flex gap-2 border-t border-border px-4 py-3">
            <QuickActionButton icon={<NoteIcon />} label="Note" />
            <QuickActionButton icon={<LinkIcon />} label="Link" />
            <QuickActionButton icon={<TaskIcon />} label="Task" />
            <QuickActionButton icon={<ImageIcon />} label="Image" />
          </div>
        </div>

        {/* Close hint */}
        <p className="mt-3 text-center text-xs text-tertiary">
          Tap outside to close
        </p>
      </motion.form>
    </motion.div>
  );
}

interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

function QuickActionButton({ icon, label, onClick }: QuickActionButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="flex flex-1 flex-col items-center gap-1 rounded-lg bg-surface py-2 text-secondary transition-colors hover:bg-black/50 hover:text-primary"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="h-5 w-5">{icon}</span>
      <span className="text-xs">{label}</span>
    </motion.button>
  );
}

// =============================================================================
// ICONS
// =============================================================================

function AttachmentIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
      />
    </svg>
  );
}

function LoadingIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg
      className="h-full w-full"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
      />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg
      className="h-full w-full"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
      />
    </svg>
  );
}

function TaskIcon() {
  return (
    <svg
      className="h-full w-full"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg
      className="h-full w-full"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z"
      />
    </svg>
  );
}
