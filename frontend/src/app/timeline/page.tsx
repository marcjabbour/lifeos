"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ComingSoon } from "@/components/ui/coming-soon";
import { ClockIcon } from "@/components/icons";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function TimelinePage() {
  return (
    <AuthGuard>
      <AppShell showWidgets={false}>
        <ComingSoon
          feature="Timeline"
          description="View your memories and saved content chronologically. Rediscover what you captured day by day."
          icon={<ClockIcon size={40} />}
        />
      </AppShell>
    </AuthGuard>
  );
}
