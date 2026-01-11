"use client";

import { motion } from "framer-motion";
import { useState } from "react";

// =============================================================================
// TYPES
// =============================================================================

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

interface SidebarProps {
  activeView?: string;
  onViewChange?: (view: string) => void;
  className?: string;
}

// =============================================================================
// NAVIGATION DATA
// =============================================================================

const mainNavItems: NavItem[] = [
  { id: "all", label: "All Items", icon: <GridIcon /> },
  { id: "focus", label: "Today's Focus", icon: <FocusIcon /> },
  { id: "inbox", label: "Inbox", icon: <InboxIcon />, count: 3 },
];

const typeNavItems: NavItem[] = [
  { id: "article", label: "Articles", icon: <ArticleIcon /> },
  { id: "note", label: "Notes", icon: <NoteIcon /> },
  { id: "task", label: "Tasks", icon: <TaskIcon /> },
  { id: "link", label: "Links", icon: <LinkIcon /> },
];

const sourceNavItems: NavItem[] = [
  { id: "twitter", label: "Twitter", icon: <TwitterIcon /> },
  { id: "youtube", label: "YouTube", icon: <YouTubeIcon /> },
  { id: "reddit", label: "Reddit", icon: <RedditIcon /> },
  { id: "email", label: "Email", icon: <EmailIcon /> },
];

// =============================================================================
// SIDEBAR COMPONENT
// =============================================================================

export function Sidebar({
  activeView = "all",
  onViewChange,
  className = "",
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      className={`
        hidden lg:flex flex-col
        h-full border-r border-border bg-elevated
        ${collapsed ? "w-16" : "w-64"}
        transition-[width] duration-300 ease-in-out
        ${className}
      `}
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4">
        <motion.div
          className="flex items-center gap-2"
          animate={{ opacity: collapsed ? 0 : 1 }}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-purple-500">
            <span className="text-sm font-bold text-black">L</span>
          </div>
          {!collapsed && (
            <span className="text-lg font-semibold text-primary">LifeOS</span>
          )}
        </motion.div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-tertiary transition-colors hover:bg-surface hover:text-primary"
        >
          <CollapseIcon collapsed={collapsed} />
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <NavSection title="Main" collapsed={collapsed}>
          {mainNavItems.map((item) => (
            <NavItemComponent
              key={item.id}
              item={item}
              active={activeView === item.id}
              collapsed={collapsed}
              onClick={() => onViewChange?.(item.id)}
            />
          ))}
        </NavSection>

        <NavSection title="Types" collapsed={collapsed}>
          {typeNavItems.map((item) => (
            <NavItemComponent
              key={item.id}
              item={item}
              active={activeView === item.id}
              collapsed={collapsed}
              onClick={() => onViewChange?.(item.id)}
            />
          ))}
        </NavSection>

        <NavSection title="Sources" collapsed={collapsed}>
          {sourceNavItems.map((item) => (
            <NavItemComponent
              key={item.id}
              item={item}
              active={activeView === item.id}
              collapsed={collapsed}
              onClick={() => onViewChange?.(item.id)}
            />
          ))}
        </NavSection>
      </nav>

      {/* Settings */}
      <div className="border-t border-border px-2 py-4">
        <NavItemComponent
          item={{ id: "settings", label: "Settings", icon: <SettingsIcon /> }}
          active={activeView === "settings"}
          collapsed={collapsed}
          onClick={() => onViewChange?.("settings")}
        />
      </div>
    </motion.aside>
  );
}

// =============================================================================
// NAV SECTION
// =============================================================================

interface NavSectionProps {
  title: string;
  collapsed: boolean;
  children: React.ReactNode;
}

function NavSection({ title, collapsed, children }: NavSectionProps) {
  return (
    <div className="mb-6">
      {!collapsed && (
        <h3 className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-tertiary">
          {title}
        </h3>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

// =============================================================================
// NAV ITEM COMPONENT
// =============================================================================

interface NavItemComponentProps {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}

function NavItemComponent({
  item,
  active,
  collapsed,
  onClick,
}: NavItemComponentProps) {
  return (
    <motion.button
      className={`
        relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5
        text-left text-sm font-medium transition-colors
        ${
          active
            ? "bg-surface text-cyan-400"
            : "text-secondary hover:bg-surface hover:text-primary"
        }
        ${collapsed ? "justify-center" : ""}
      `}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Active indicator glow */}
      {active && (
        <motion.div
          className="absolute inset-0 rounded-lg"
          layoutId="activeNav"
          style={{
            boxShadow: "inset 0 0 0 1px rgba(0, 212, 255, 0.3)",
          }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}

      {/* Icon */}
      <span
        className={`relative z-10 flex h-5 w-5 items-center justify-center ${
          active ? "text-cyan-400" : ""
        }`}
      >
        {item.icon}
      </span>

      {/* Label */}
      {!collapsed && (
        <span className="relative z-10 flex-1 truncate">{item.label}</span>
      )}

      {/* Count badge */}
      {!collapsed && item.count && (
        <span className="relative z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-500/20 px-1.5 text-xs font-medium text-cyan-400">
          {item.count}
        </span>
      )}
    </motion.button>
  );
}

// =============================================================================
// ICONS
// =============================================================================

function GridIcon() {
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
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
      />
    </svg>
  );
}

function FocusIcon() {
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
        d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
      />
    </svg>
  );
}

function InboxIcon() {
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
        d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z"
      />
    </svg>
  );
}

function ArticleIcon() {
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
        d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z"
      />
    </svg>
  );
}

function NoteIcon() {
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
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
      />
    </svg>
  );
}

function TaskIcon() {
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
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function LinkIcon() {
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
        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
      />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function RedditIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
    </svg>
  );
}

function EmailIcon() {
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
        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
      />
    </svg>
  );
}

function SettingsIcon() {
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
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <motion.svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      animate={{ rotate: collapsed ? 180 : 0 }}
      transition={{ duration: 0.2 }}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 19.5L8.25 12l7.5-7.5"
      />
    </motion.svg>
  );
}
