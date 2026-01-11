"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

// =============================================================================
// TYPES
// =============================================================================

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  isTyping?: boolean;
  sources?: { id: string; title: string }[];
  className?: string;
}

// =============================================================================
// CHAT BUBBLE COMPONENT
// =============================================================================

export function ChatBubble({
  role,
  content,
  timestamp,
  isTyping = false,
  sources,
  className = "",
}: ChatBubbleProps) {
  const isUser = role === "user";

  return (
    <motion.div
      className={`flex ${isUser ? "justify-end" : "justify-start"} ${className}`}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
    >
      <div
        className={`
          max-w-[85%] sm:max-w-[75%]
          ${isUser ? "order-1" : "order-2"}
        `}
      >
        {/* Bubble */}
        <div
          className={`
            relative rounded-2xl px-4 py-3
            ${
              isUser
                ? "bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30"
                : "bg-surface border border-border"
            }
          `}
          style={
            isUser
              ? {
                  boxShadow: "0 0 20px rgba(0, 212, 255, 0.1)",
                }
              : undefined
          }
        >
          {/* Content */}
          {isTyping ? (
            <TypingIndicator />
          ) : (
            <div className="text-sm text-primary whitespace-pre-wrap">
              {content}
            </div>
          )}

          {/* Glow effect for user messages */}
          {isUser && (
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl opacity-50"
              style={{
                background:
                  "radial-gradient(ellipse at top right, rgba(0, 212, 255, 0.1), transparent 70%)",
              }}
            />
          )}
        </div>

        {/* Sources */}
        {sources && sources.length > 0 && (
          <motion.div
            className="mt-2 flex flex-wrap gap-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {sources.map((source) => (
              <span
                key={source.id}
                className="inline-flex items-center gap-1 rounded-full bg-elevated px-2 py-0.5 text-xs text-tertiary"
              >
                <SourceIcon />
                {source.title}
              </span>
            ))}
          </motion.div>
        )}

        {/* Timestamp */}
        {timestamp && (
          <div
            className={`
              mt-1 text-[10px] text-tertiary
              ${isUser ? "text-right" : "text-left"}
            `}
          >
            {formatTime(timestamp)}
          </div>
        )}
      </div>

      {/* Avatar */}
      <div
        className={`
          flex h-8 w-8 shrink-0 items-center justify-center rounded-full
          ${isUser ? "order-2 ml-2" : "order-1 mr-2"}
          ${
            isUser
              ? "bg-gradient-to-br from-cyan-500 to-purple-500"
              : "bg-elevated border border-border"
          }
        `}
      >
        {isUser ? <UserIcon /> : <BotIcon />}
      </div>
    </motion.div>
  );
}

// =============================================================================
// TYPING INDICATOR
// =============================================================================

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-2 w-2 rounded-full bg-tertiary"
          animate={{
            y: [0, -4, 0],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// =============================================================================
// CHAT CONTAINER
// =============================================================================

interface ChatContainerProps {
  children: ReactNode;
  className?: string;
}

export function ChatContainer({
  children,
  className = "",
}: ChatContainerProps) {
  return (
    <div
      className={`
        flex flex-col gap-4 p-4
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// =============================================================================
// SYSTEM MESSAGE
// =============================================================================

interface SystemMessageProps {
  children: ReactNode;
  className?: string;
}

export function SystemMessage({
  children,
  className = "",
}: SystemMessageProps) {
  return (
    <motion.div
      className={`
        flex justify-center py-2
        ${className}
      `}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="rounded-full bg-elevated px-4 py-1.5 text-xs text-tertiary">
        {children}
      </div>
    </motion.div>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// =============================================================================
// ICONS
// =============================================================================

function UserIcon() {
  return (
    <svg
      className="h-4 w-4 text-black"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}

function BotIcon() {
  return (
    <svg
      className="h-4 w-4 text-cyan-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  );
}

function SourceIcon() {
  return (
    <svg
      className="h-3 w-3"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757"
      />
    </svg>
  );
}
