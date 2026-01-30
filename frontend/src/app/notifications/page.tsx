"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ComingSoon } from "@/components/ui/coming-soon";
import { BellIcon } from "@/components/icons";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <AppShell showWidgets={false}>
        <ComingSoon
          feature="Notifications"
          description="Stay updated with Nova's insights and activity. Get alerts when content is processed or when patterns emerge."
          icon={<BellIcon size={40} />}
        />
      </AppShell>
    </AuthGuard>
  );
}
