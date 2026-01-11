"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sidebar,
  MobileNav,
  ItemsGrid,
  CommandInput,
  QuickCapture,
  ChatBubble,
  ChatContainer,
  SystemMessage,
} from "@/components";
import { useItems } from "@/hooks/useItems";
import { Item } from "@/lib/api";

// =============================================================================
// MOCK DATA (Remove when backend is connected)
// =============================================================================

const MOCK_ITEMS: Item[] = [
  {
    id: "1",
    user_id: "user-1",
    type: "article",
    title: "The Future of AI Interfaces",
    content:
      "Exploring how AI is reshaping the way we interact with technology and what it means for the future of user experience design.",
    url: "https://example.com/ai-interfaces",
    source: "Hacker News",
    metadata: {},
    embedding: null,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    user_id: "user-1",
    type: "note",
    title: "Project ideas for Q1",
    content:
      "1. Build a personal dashboard\n2. Create an AI-powered note taker\n3. Design a habit tracking system",
    url: null,
    source: null,
    metadata: {},
    embedding: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    updated_at: new Date().toISOString(),
  },
  {
    id: "3",
    user_id: "user-1",
    type: "task",
    title: "Review pull request #42",
    content: "Check the new authentication flow implementation",
    url: null,
    source: "GitHub",
    metadata: { priority: "high" },
    embedding: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    updated_at: new Date().toISOString(),
  },
  {
    id: "4",
    user_id: "user-1",
    type: "link",
    title: "Framer Motion Documentation",
    content: "Comprehensive guide to building animations with Framer Motion",
    url: "https://www.framer.com/motion/",
    source: "Twitter",
    metadata: {},
    embedding: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    updated_at: new Date().toISOString(),
  },
  {
    id: "5",
    user_id: "user-1",
    type: "article",
    title: "Building PWAs in 2025",
    content:
      "A comprehensive guide to creating Progressive Web Apps with the latest web technologies and best practices.",
    url: "https://example.com/pwa-guide",
    source: "Reddit",
    metadata: {},
    embedding: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    updated_at: new Date().toISOString(),
  },
  {
    id: "6",
    user_id: "user-1",
    type: "note",
    title: "Meeting notes: Product sync",
    content:
      "Discussed roadmap priorities, upcoming feature releases, and team allocation for next sprint.",
    url: null,
    source: null,
    metadata: {},
    embedding: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
    updated_at: new Date().toISOString(),
  },
];

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function Home() {
  const [activeView, setActiveView] = useState("all");
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [isTyping, setIsTyping] = useState(false);

  // Use real hook when backend is ready
  const { items: apiItems, isLoading } = useItems({ enabled: false });

  // Use mock data for now
  const items = apiItems.length > 0 ? apiItems : MOCK_ITEMS;

  // Filter items based on active view
  const filteredItems = items.filter((item) => {
    if (activeView === "all") return true;
    if (activeView === "focus") return item.metadata?.priority === "high";
    if (activeView === "inbox") return !item.source;
    if (
      ["article", "note", "task", "link", "image", "file"].includes(activeView)
    ) {
      return item.type === activeView;
    }
    return item.source?.toLowerCase() === activeView.toLowerCase();
  });

  const handleItemClick = (item: Item) => {
    console.log("Item clicked:", item);
    // TODO: Open item detail modal or navigate
  };

  const handleCaptureSubmit = (value: string) => {
    console.log("Quick capture:", value);
    // TODO: Call API to create item
  };

  const handleChatSubmit = async (message: string) => {
    // Add user message
    setChatMessages((prev) => [...prev, { role: "user", content: message }]);
    setIsTyping(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `I received your message: "${message}". This is a demo response. When connected to the backend, I'll be able to help you search through your items, create new ones, and answer questions about your data.`,
        },
      ]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (Desktop only) */}
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      {/* Main Content */}
      <main className="flex flex-1 flex-col pb-20 lg:pb-0">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between px-4 lg:px-6">
            {/* Mobile logo */}
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-purple-500">
                <span className="text-sm font-bold text-black">L</span>
              </div>
              <span className="text-lg font-semibold text-primary">LifeOS</span>
            </div>

            {/* View title (Desktop) */}
            <div className="hidden lg:block">
              <h1 className="text-xl font-semibold text-primary">
                {getViewTitle(activeView)}
              </h1>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Chat toggle */}
              <motion.button
                className={`
                  flex h-10 w-10 items-center justify-center rounded-lg
                  transition-colors
                  ${showChat ? "bg-cyan-500/20 text-cyan-400" : "text-secondary hover:bg-surface hover:text-primary"}
                `}
                onClick={() => setShowChat(!showChat)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ChatIcon />
              </motion.button>

              {/* Notifications */}
              <motion.button
                className="flex h-10 w-10 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-surface hover:text-primary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <BellIcon />
              </motion.button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Items Grid */}
          <motion.div
            className={`flex-1 overflow-y-auto p-4 lg:p-6 ${showChat ? "hidden lg:block lg:w-1/2" : "w-full"}`}
            initial={false}
            animate={{ width: showChat ? "50%" : "100%" }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* View title (Mobile) */}
            <div className="mb-4 lg:hidden">
              <h1 className="text-xl font-semibold text-primary">
                {getViewTitle(activeView)}
              </h1>
              <p className="text-sm text-secondary">
                {filteredItems.length} items
              </p>
            </div>

            <ItemsGrid
              items={filteredItems}
              onItemClick={handleItemClick}
              isLoading={isLoading}
              emptyMessage={getEmptyMessage(activeView)}
            />
          </motion.div>

          {/* Chat Panel */}
          <AnimatePresence>
            {showChat && (
              <motion.div
                className="fixed inset-0 z-40 flex flex-col bg-background lg:relative lg:inset-auto lg:w-1/2 lg:border-l lg:border-border"
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              >
                {/* Chat Header */}
                <div className="flex h-16 items-center justify-between border-b border-border px-4">
                  <h2 className="text-lg font-semibold text-primary">
                    Ask LifeOS
                  </h2>
                  <motion.button
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-secondary hover:bg-surface hover:text-primary lg:hidden"
                    onClick={() => setShowChat(false)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <CloseIcon />
                  </motion.button>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto">
                  {chatMessages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
                        <SparklesIcon />
                      </div>
                      <h3 className="text-lg font-medium text-primary">
                        How can I help?
                      </h3>
                      <p className="mt-1 max-w-xs text-sm text-secondary">
                        Ask me anything about your items, or tell me what you
                        want to capture.
                      </p>
                    </div>
                  ) : (
                    <ChatContainer>
                      <SystemMessage>Start of conversation</SystemMessage>
                      {chatMessages.map((msg, i) => (
                        <ChatBubble
                          key={i}
                          role={msg.role}
                          content={msg.content}
                          timestamp={new Date()}
                        />
                      ))}
                      {isTyping && (
                        <ChatBubble
                          role="assistant"
                          content=""
                          isTyping={true}
                        />
                      )}
                    </ChatContainer>
                  )}
                </div>

                {/* Chat Input */}
                <div className="border-t border-border p-4">
                  <CommandInput
                    onSubmit={handleChatSubmit}
                    placeholder="Ask anything..."
                    isLoading={isTyping}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Navigation */}
      <MobileNav
        activeView={activeView}
        onViewChange={setActiveView}
        onCaptureClick={() => setShowQuickCapture(true)}
      />

      {/* Quick Capture Modal */}
      <AnimatePresence>
        {showQuickCapture && (
          <QuickCapture
            onSubmit={handleCaptureSubmit}
            onClose={() => setShowQuickCapture(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function getViewTitle(view: string): string {
  const titles: Record<string, string> = {
    all: "All Items",
    focus: "Today's Focus",
    inbox: "Inbox",
    article: "Articles",
    note: "Notes",
    task: "Tasks",
    link: "Links",
    twitter: "Twitter",
    youtube: "YouTube",
    reddit: "Reddit",
    email: "Email",
    settings: "Settings",
  };
  return titles[view] || "All Items";
}

function getEmptyMessage(view: string): string {
  const messages: Record<string, string> = {
    all: "No items yet",
    focus: "Nothing in focus today",
    inbox: "Inbox is empty",
    article: "No articles saved",
    note: "No notes yet",
    task: "All tasks complete!",
    link: "No links saved",
  };
  return messages[view] || "No items here";
}

// =============================================================================
// ICONS
// =============================================================================

function ChatIcon() {
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
        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
      />
    </svg>
  );
}

function BellIcon() {
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
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg
      className="h-8 w-8 text-cyan-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  );
}
