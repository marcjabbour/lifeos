"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ItemsFeed } from "@/components/feed/items-feed";

export default function DashboardPage() {
  return (
    <AppShell>
      <ItemsFeed />
    </AppShell>
  );
}
