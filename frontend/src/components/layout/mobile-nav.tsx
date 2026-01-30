"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GridIcon,
  FileTextIcon,
  ClockIcon,
  FolderIcon,
  MessageIcon,
} from "@/components/icons";

interface NavItem {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  href: string;
}

const mobileNavItems: NavItem[] = [
  { icon: GridIcon, label: "Feed", href: "/" },
  { icon: FileTextIcon, label: "Notes", href: "/notes" },
  { icon: MessageIcon, label: "Chat", href: "/conversations" },
  { icon: ClockIcon, label: "Timeline", href: "/timeline" },
  { icon: FolderIcon, label: "Collections", href: "/collections" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border-subtle bg-bg-secondary/95 backdrop-blur-md safe-bottom md:hidden">
      {mobileNavItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex min-w-[44px] flex-col items-center justify-center gap-1 px-3 py-2 transition-colors
              ${isActive ? "text-accent-primary" : "text-text-muted"}
            `}
          >
            <Icon size={22} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
