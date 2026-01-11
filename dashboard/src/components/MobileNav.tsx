"use client";

import { motion } from "framer-motion";

// =============================================================================
// TYPES
// =============================================================================

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface MobileNavProps {
  activeView?: string;
  onViewChange?: (view: string) => void;
  onCaptureClick?: () => void;
  className?: string;
}

// =============================================================================
// NAVIGATION DATA
// =============================================================================

const navItems: NavItem[] = [
  { id: "all", label: "Home", icon: <HomeIcon /> },
  { id: "focus", label: "Focus", icon: <FocusIcon /> },
  { id: "inbox", label: "Inbox", icon: <InboxIcon /> },
  { id: "settings", label: "Settings", icon: <SettingsIcon /> },
];

// =============================================================================
// MOBILE NAV COMPONENT
// =============================================================================

export function MobileNav({
  activeView = "all",
  onViewChange,
  onCaptureClick,
  className = "",
}: MobileNavProps) {
  return (
    <motion.nav
      className={`
        fixed bottom-0 left-0 right-0 z-50
        flex lg:hidden items-center justify-around
        border-t border-border bg-elevated/95 backdrop-blur-xl
        pb-safe px-2 pt-2
        ${className}
      `}
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Left nav items */}
      {navItems.slice(0, 2).map((item) => (
        <MobileNavItem
          key={item.id}
          item={item}
          active={activeView === item.id}
          onClick={() => onViewChange?.(item.id)}
        />
      ))}

      {/* Center capture button */}
      <CaptureButton onClick={onCaptureClick} />

      {/* Right nav items */}
      {navItems.slice(2).map((item) => (
        <MobileNavItem
          key={item.id}
          item={item}
          active={activeView === item.id}
          onClick={() => onViewChange?.(item.id)}
        />
      ))}
    </motion.nav>
  );
}

// =============================================================================
// MOBILE NAV ITEM
// =============================================================================

interface MobileNavItemProps {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}

function MobileNavItem({ item, active, onClick }: MobileNavItemProps) {
  return (
    <motion.button
      className={`
        relative flex flex-col items-center justify-center
        min-w-[48px] py-1.5 px-3 rounded-xl
        ${active ? "text-cyan-400" : "text-secondary"}
      `}
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
    >
      {/* Active indicator */}
      {active && (
        <motion.div
          className="absolute inset-0 rounded-xl bg-cyan-500/10"
          layoutId="mobileActiveNav"
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}

      {/* Icon */}
      <span className="relative z-10">{item.icon}</span>

      {/* Label */}
      <span className="relative z-10 mt-0.5 text-[10px] font-medium">
        {item.label}
      </span>
    </motion.button>
  );
}

// =============================================================================
// CAPTURE BUTTON - Center button with glow
// =============================================================================

interface CaptureButtonProps {
  onClick?: () => void;
}

function CaptureButton({ onClick }: CaptureButtonProps) {
  return (
    <motion.button
      className="relative -mt-4 flex h-14 w-14 items-center justify-center"
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 opacity-50 blur-lg"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.3, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Button */}
      <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 shadow-lg">
        <PlusIcon />
      </div>
    </motion.button>
  );
}

// =============================================================================
// ICONS
// =============================================================================

function HomeIcon() {
  return (
    <svg
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  );
}

function FocusIcon() {
  return (
    <svg
      className="h-6 w-6"
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
      className="h-6 w-6"
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

function SettingsIcon() {
  return (
    <svg
      className="h-6 w-6"
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

function PlusIcon() {
  return (
    <svg
      className="h-6 w-6 text-black"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.5v15m7.5-7.5h-15"
      />
    </svg>
  );
}
