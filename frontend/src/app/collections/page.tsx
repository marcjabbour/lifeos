"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ComingSoon } from "@/components/ui/coming-soon";
import { FolderIcon } from "@/components/icons";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function CollectionsPage() {
  return (
    <AuthGuard>
      <AppShell showWidgets={false}>
        <ComingSoon
          feature="Collections"
          description="Curate and organize your items into custom collections. Group related content for easy access."
          icon={<FolderIcon size={40} />}
        />
      </AppShell>
    </AuthGuard>
  );
}
