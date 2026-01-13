"use client";

import { HTMLAttributes, ReactNode } from "react";
import { LayersIcon } from "@/components/icons";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "nova" | "memory" | "success" | "warning" | "error";
  size?: "sm" | "md";
  icon?: ReactNode;
}

export function Badge({
  className = "",
  variant = "default",
  size = "md",
  icon,
  children,
  ...props
}: BadgeProps) {
  const baseStyles =
    "inline-flex items-center gap-2 rounded-full font-semibold uppercase tracking-wide";

  const variants = {
    default: "bg-bg-hover text-text-muted border border-border",
    nova: "bg-nova-amber-bg text-nova-amber border border-nova-amber/30 shadow-glow-amber",
    memory:
      "bg-accent-muted text-accent-primary border border-accent-primary/30",
    success: "bg-green-500/15 text-green-500 border border-green-500/30",
    warning: "bg-amber-500/15 text-amber-500 border border-amber-500/30",
    error: "bg-red-500/15 text-red-500 border border-red-500/30",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-3 py-1 text-[11px]",
  };

  return (
    <span
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}

// Special Nova Badge component
export interface NovaBadgeProps extends HTMLAttributes<HTMLSpanElement> {}

export function NovaBadge({
  className = "",
  children,
  ...props
}: NovaBadgeProps) {
  return (
    <Badge
      variant="nova"
      icon={<LayersIcon size={14} />}
      className={className}
      {...props}
    >
      {children || "Nova Worked On This"}
    </Badge>
  );
}

// Tag component (simpler, for categorization)
export interface TagProps extends HTMLAttributes<HTMLSpanElement> {}

export function Tag({ className = "", children, ...props }: TagProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-bg-hover px-3 py-1 text-xs text-text-muted ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
