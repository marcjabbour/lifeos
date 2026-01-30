"use client";

import { HTMLAttributes } from "react";

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
}

export function Spinner({
  size = "md",
  className = "",
  ...props
}: SpinnerProps) {
  const sizes = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-3",
  };

  return (
    <div
      className={`${sizes[size]} animate-spin rounded-full border-accent-primary border-t-transparent ${className}`}
      role="status"
      aria-label="Loading"
      {...props}
    />
  );
}

// Nova-themed loading indicator
export interface NovaActivityProps extends HTMLAttributes<HTMLDivElement> {
  text?: string;
}

export function NovaActivity({
  text = "Nova is thinking...",
  className = "",
  ...props
}: NovaActivityProps) {
  return (
    <div
      className={`flex items-center gap-3 ${className}`}
      role="status"
      {...props}
    >
      <div className="relative flex h-8 w-8 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-accent-primary/30" />
        <div className="relative h-4 w-4 rounded-full bg-accent-primary shadow-glow-purple-sm" />
      </div>
      <span className="text-sm font-medium text-text-secondary">{text}</span>
    </div>
  );
}

// Skeleton loading placeholder
export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  variant = "text",
  width,
  height,
  className = "",
  ...props
}: SkeletonProps) {
  const variants = {
    text: "rounded h-4",
    circular: "rounded-full",
    rectangular: "rounded-lg",
  };

  return (
    <div
      className={`animate-pulse bg-bg-hover ${variants[variant]} ${className}`}
      style={{
        width: width || (variant === "text" ? "100%" : undefined),
        height: height || (variant === "circular" ? width : undefined),
      }}
      {...props}
    />
  );
}
