"use client";

import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { CommandInput } from "./command-input";
import { WidgetsContainer } from "./widgets-container";
import { FilterProvider } from "@/contexts/FilterContext";

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
  return (
    <FilterProvider>
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
            {showCommandInput && <CommandInput />}
            {children}
          </div>
        </main>

        {/* Right Widgets (Desktop only) */}
        {showWidgets && <WidgetsContainer />}

        {/* Mobile Bottom Navigation */}
        <MobileNav />
      </div>
    </FilterProvider>
  );
}
