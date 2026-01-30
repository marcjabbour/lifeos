"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NovaIcon,
  GridIcon,
  FileTextIcon,
  ClockIcon,
  BarChartIcon,
  FolderIcon,
  BellIcon,
  SettingsIcon,
} from "@/components/icons";

interface NavItem {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  href: string;
}

const mainNavItems: NavItem[] = [
  { icon: GridIcon, label: "Feed", href: "/" },
  { icon: FileTextIcon, label: "Notes", href: "/notes" },
  { icon: ClockIcon, label: "Timeline", href: "/timeline" },
  { icon: BarChartIcon, label: "Analytics", href: "/analytics" },
  { icon: FolderIcon, label: "Collections", href: "/collections" },
];

const footerNavItems: NavItem[] = [
  { icon: BellIcon, label: "Notifications", href: "/notifications" },
  { icon: SettingsIcon, label: "Settings", href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-[68px] flex-col items-center border-r border-border-subtle bg-bg-secondary py-4 md:w-[68px]">
      {/* Logo */}
      <Link
        href="/"
        className="mb-8 flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-accent-primary to-indigo-500 shadow-glow-purple animate-glow transition-transform hover:scale-105"
      >
        <NovaIcon size={22} className="text-white" />
      </Link>

      {/* Main Navigation */}
      <nav className="flex flex-1 flex-col items-center gap-2">
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                relative flex h-11 w-11 items-center justify-center rounded-md transition-all duration-200
                ${
                  isActive
                    ? "bg-accent-muted text-accent-primary"
                    : "text-text-muted hover:bg-bg-hover hover:text-text-secondary"
                }
              `}
              onMouseEnter={() => setHoveredItem(item.href)}
              onMouseLeave={() => setHoveredItem(null)}
              title={item.label}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute -left-[14px] h-6 w-[3px] rounded-r-full bg-accent-primary shadow-glow-purple-sm" />
              )}
              <Icon size={22} />

              {/* Tooltip */}
              {hoveredItem === item.href && (
                <span className="absolute left-full ml-3 whitespace-nowrap rounded-md bg-bg-elevated px-3 py-1.5 text-sm font-medium text-text-primary shadow-md animate-fade-in">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Navigation */}
      <div className="flex flex-col items-center gap-2">
        <div className="mb-3 h-px w-8 bg-border-subtle" />
        {footerNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                relative flex h-11 w-11 items-center justify-center rounded-md transition-all duration-200
                ${
                  isActive
                    ? "bg-accent-muted text-accent-primary"
                    : "text-text-muted hover:bg-bg-hover hover:text-text-secondary"
                }
              `}
              onMouseEnter={() => setHoveredItem(item.href)}
              onMouseLeave={() => setHoveredItem(null)}
              title={item.label}
            >
              {isActive && (
                <span className="absolute -left-[14px] h-6 w-[3px] rounded-r-full bg-accent-primary shadow-glow-purple-sm" />
              )}
              <Icon size={22} />

              {/* Tooltip */}
              {hoveredItem === item.href && (
                <span className="absolute left-full ml-3 whitespace-nowrap rounded-md bg-bg-elevated px-3 py-1.5 text-sm font-medium text-text-primary shadow-md animate-fade-in">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
