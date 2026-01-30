"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  FormEvent,
  KeyboardEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Spinner } from "@/components/ui";
import {
  NovaIcon,
  SendIcon,
  PaperclipIcon,
  MicIcon,
  UserIcon,
  SparklesIcon,
  CopyIcon,
  RefreshIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
} from "@/components/icons";

// Types
export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  metadata?: {
    tokensUsed?: number;
    sources?: Array<{ title: string; url: string }>;
  };
}

interface ChatInterfaceProps {
  onSendMessage?: (message: string) => Promise<string>;
  initialMessages?: ChatMessage[];
  placeholder?: string;
}

export function ChatInterface({
  onSendMessage,
  initialMessages = [],
  placeholder = "Ask Nova anything about your life...",
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      // Auto-resize
      e.target.style.height = "auto";
      e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
    },
    [],
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();

      if (!input.trim() || isLoading) return;

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: input.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);

      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }

      try {
        // Simulate AI response or use provided handler
        const response = onSendMessage
          ? await onSendMessage(userMessage.content)
          : await simulateAIResponse(userMessage.content);

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: response,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error("Error getting response:", error);
        // Add error message
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "system",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, onSendMessage],
  );

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            <AnimatePresence>
              {messages.map((message) => (
                <ChatMessageBubble key={message.id} message={message} />
              ))}
            </AnimatePresence>

            {isLoading && <TypingIndicator />}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-border-subtle bg-bg-secondary/50 p-4">
        <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
          <div className="flex items-end gap-3 rounded-2xl border border-border-default bg-bg-elevated p-3 shadow-xl transition-all focus-within:border-accent-primary focus-within:shadow-glow-purple">
            {/* Nova Avatar */}
            <div className="h-9 w-9 flex-shrink-0 rounded-full bg-gradient-to-br from-accent-primary to-indigo-500 flex items-center justify-center shadow-glow-purple-sm">
              <NovaIcon size={18} className="text-white" />
            </div>

            {/* Input */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={1}
              className="flex-1 resize-none bg-transparent text-[15px] text-text-primary placeholder-text-muted outline-none"
              disabled={isLoading}
            />

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
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
                disabled={!input.trim() || isLoading}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-primary text-white transition-all hover:bg-accent-hover hover:shadow-glow-purple disabled:opacity-50 disabled:cursor-not-allowed"
                title="Send"
              >
                {isLoading ? (
                  <Spinner
                    size="sm"
                    className="border-white border-t-transparent"
                  />
                ) : (
                  <SendIcon size={18} />
                )}
              </button>
            </div>
          </div>

          <p className="mt-2 text-center text-xs text-text-muted">
            Nova can make mistakes. Consider checking important information.
          </p>
        </form>
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState() {
  const suggestions = [
    "What patterns do you see in my reading this week?",
    "Summarize my notes on productivity",
    "Find connections between my recent saves",
    "What did I save about design last month?",
  ];

  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-12">
      <div className="mb-6 h-16 w-16 rounded-full bg-gradient-to-br from-accent-primary to-indigo-500 flex items-center justify-center shadow-glow-purple animate-glow">
        <NovaIcon size={32} className="text-white" />
      </div>

      <h2 className="mb-2 text-2xl font-semibold text-text-primary">
        Hi, I'm Nova
      </h2>
      <p className="mb-8 max-w-md text-center text-text-secondary">
        Your intelligent assistant for navigating your digital life. Ask me
        anything about your saved items, notes, or connections.
      </p>

      <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            className="rounded-xl border border-border-subtle bg-bg-card p-4 text-left text-sm text-text-secondary transition-all hover:border-accent-primary/50 hover:bg-bg-hover"
          >
            <SparklesIcon size={16} className="mb-2 text-accent-primary" />
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

// Chat Message Bubble
function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      <div
        className={`h-8 w-8 flex-shrink-0 rounded-full flex items-center justify-center ${
          isUser
            ? "bg-bg-hover"
            : isSystem
              ? "bg-amber-500/20"
              : "bg-gradient-to-br from-accent-primary to-indigo-500 shadow-glow-purple-sm"
        }`}
      >
        {isUser ? (
          <UserIcon size={16} className="text-text-secondary" />
        ) : (
          <NovaIcon
            size={16}
            className={isSystem ? "text-amber-500" : "text-white"}
          />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 ${isUser ? "text-right" : ""}`}>
        <div
          className={`inline-block max-w-[85%] rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-accent-primary text-white rounded-tr-sm"
              : isSystem
                ? "bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-tl-sm"
                : "bg-bg-card border border-border-subtle text-text-primary rounded-tl-sm"
          }`}
        >
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
            {message.content}
          </p>
        </div>

        {/* Message Actions (for assistant messages) */}
        {!isUser && !isSystem && (
          <div className="mt-2 flex items-center gap-2">
            <button
              className="flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-text-secondary"
              title="Copy"
            >
              <CopyIcon size={14} />
            </button>
            <button
              className="flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-text-secondary"
              title="Regenerate"
            >
              <RefreshIcon size={14} />
            </button>
            <div className="mx-2 h-3 w-px bg-border-subtle" />
            <button
              className="flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-green-500"
              title="Good response"
            >
              <ThumbsUpIcon size={14} />
            </button>
            <button
              className="flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-red-500"
              title="Bad response"
            >
              <ThumbsDownIcon size={14} />
            </button>
          </div>
        )}

        {/* Timestamp */}
        <p className="mt-1 text-xs text-text-muted">
          {formatTimestamp(message.timestamp)}
        </p>
      </div>
    </motion.div>
  );
}

// Typing Indicator
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gradient-to-br from-accent-primary to-indigo-500 flex items-center justify-center shadow-glow-purple-sm">
        <NovaIcon size={16} className="text-white" />
      </div>
      <div className="inline-flex items-center gap-1 rounded-2xl rounded-tl-sm bg-bg-card border border-border-subtle px-4 py-3">
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-accent-primary"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-accent-primary"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-accent-primary"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </motion.div>
  );
}

// Helper functions
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Simulate AI response (for demo)
async function simulateAIResponse(message: string): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const responses: Record<string, string> = {
    default: `I understand you're asking about: "${message}"\n\nBased on your saved items, here's what I found relevant. I've analyzed your recent activity and identified some interesting patterns that might help answer your question.\n\nWould you like me to dig deeper into any specific aspect?`,
    pattern: `I've analyzed your reading patterns from the past week. Here's what I noticed:\n\n📚 **Focus Areas:**\n- Productivity systems (5 articles)\n- AI/ML developments (3 articles)\n- Design thinking (2 articles)\n\n📈 **Trends:**\nYou've been particularly interested in how AI can enhance personal workflows. I found 3 connections between your recent saves that explore this theme.\n\nWould you like me to create a summary document?`,
    summarize: `Here's a summary of your productivity notes:\n\n**Key Themes:**\n1. Time blocking is your preferred scheduling method\n2. You're exploring the Zettelkasten system\n3. Focus on reducing context switching\n\n**Action Items Found:**\n- Review weekly on Sundays\n- Implement 90-minute focus blocks\n- Set up second brain in Notion\n\nI can help you implement any of these if you'd like!`,
  };

  // Simple keyword matching for demo
  if (message.toLowerCase().includes("pattern")) {
    return responses.pattern;
  }
  if (
    message.toLowerCase().includes("summarize") ||
    message.toLowerCase().includes("summary")
  ) {
    return responses.summarize;
  }

  return responses.default;
}

export default ChatInterface;
