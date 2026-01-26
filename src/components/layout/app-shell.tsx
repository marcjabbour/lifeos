"use client";

import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { CommandInput } from "./command-input";
import { WidgetsContainer } from "./widgets-container";

interface AppShellProps {
  children: ReactNode;
  showWidgets?: boolean;
  showCommandInput?: boolean;
}

export function AppShell({
  children,
  showWidgets = true,
  showCommandInput = true,
}: AppShellProps) {
  const handleCommandSubmit = (message: string) => {
    // TODO: Integrate with Nova conversation API
    console.log("Command submitted:", message);
  };

  return (
    <div className="flex min-h-screen bg-bg-primary">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 pb-20 pt-6 md:ml-[68px] md:pb-20">
        <div
          className={`
            mx-auto px-4 md:px-8
            ${showWidgets ? "xl:mr-[360px]" : ""}
          `}
        >
          {/* Command Input at Top */}
          {showCommandInput && <CommandInput onSubmit={handleCommandSubmit} />}
          {children}
        </div>
      </main>

      {/* Right Widgets (Desktop only) */}
      {showWidgets && <WidgetsContainer />}

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
