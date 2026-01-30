"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ItemsFeed } from "@/components/feed/items-feed";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <AppShell>
        <ItemsFeed />
      </AppShell>
    </AuthGuard>
  );
}
