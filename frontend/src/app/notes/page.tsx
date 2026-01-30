"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ComingSoon } from "@/components/ui/coming-soon";
import { FileTextIcon } from "@/components/icons";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function NotesPage() {
  return (
    <AuthGuard>
      <AppShell showWidgets={false}>
        <ComingSoon
          feature="Notes"
          description="Capture and organize your thoughts with rich text notes, linked to your saved content."
          icon={<FileTextIcon size={40} />}
        />
      </AppShell>
    </AuthGuard>
  );
}
