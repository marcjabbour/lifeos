"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ComingSoon } from "@/components/ui/coming-soon";
import { BarChartIcon } from "@/components/icons";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function AnalyticsPage() {
  return (
    <AuthGuard>
      <AppShell showWidgets={false}>
        <ComingSoon
          feature="Analytics"
          description="Gain insights about your content patterns, discover trends, and understand how you interact with information."
          icon={<BarChartIcon size={40} />}
        />
      </AppShell>
    </AuthGuard>
  );
}
