"use client";

import { ReactNode } from "react";

export interface ComingSoonProps {
  feature: string;
  description?: string;
  icon?: ReactNode;
}

export function ComingSoon({ feature, description, icon }: ComingSoonProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      {/* Icon */}
      {icon && (
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-accent-muted text-accent-primary">
          {icon}
        </div>
      )}

      {/* Feature Name */}
      <h1 className="mb-3 text-center text-2xl font-bold text-text-primary md:text-3xl">
        {feature}
      </h1>

      {/* Description */}
      {description && (
        <p className="mb-6 max-w-md text-center text-text-muted">
          {description}
        </p>
      )}

      {/* Coming Soon Badge */}
      <div className="inline-flex items-center gap-2 rounded-full bg-bg-hover px-4 py-2 text-sm text-text-muted">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-primary opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-primary"></span>
        </span>
        Coming Soon
      </div>

      {/* Decorative elements */}
      <div className="mt-12 flex items-center gap-3 text-text-muted/40">
        <div className="h-px w-12 bg-border"></div>
        <span className="text-xs uppercase tracking-widest">
          In Development
        </span>
        <div className="h-px w-12 bg-border"></div>
      </div>
    </div>
  );
}
