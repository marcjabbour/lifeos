"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ComingSoon } from "@/components/ui/coming-soon";
import { SettingsIcon } from "@/components/icons";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function SettingsPage() {
  return (
    <AuthGuard>
      <AppShell showWidgets={false}>
        <ComingSoon
          feature="Settings"
          description="Customize your LifeOS experience. Configure preferences, manage integrations, and personalize your workspace."
          icon={<SettingsIcon size={40} />}
        />
      </AppShell>
    </AuthGuard>
  );
}
