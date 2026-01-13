/**
 * LifeOS Design System
 *
 * Design tokens and utilities for the LifeOS application.
 * This file provides type-safe access to design tokens.
 */

export const colors = {
  // Backgrounds - blue-tinted dark
  bg: {
    primary: "#0a0a0f",
    secondary: "#12121a",
    card: "#161620",
    elevated: "#1a1a28",
    hover: "#1e1e2d",
  },
  // Text hierarchy
  text: {
    primary: "#ffffff",
    secondary: "rgba(255, 255, 255, 0.7)",
    muted: "rgba(255, 255, 255, 0.5)",
    disabled: "rgba(255, 255, 255, 0.3)",
  },
  // Accent - Purple/Violet
  accent: {
    primary: "#8b5cf6",
    hover: "#a78bfa",
    muted: "rgba(139, 92, 246, 0.15)",
    glow: "rgba(139, 92, 246, 0.4)",
  },
  // Nova Enriched - Amber/Orange
  nova: {
    amber: "#f59e0b",
    amberBg: "rgba(245, 158, 11, 0.15)",
    amberGlow: "rgba(245, 158, 11, 0.3)",
  },
  // Activity dots
  dot: {
    active: "#8b5cf6",
    warning: "#f59e0b",
    success: "#10b981",
    muted: "#4b5563",
  },
  // Status colors
  status: {
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#3b82f6",
  },
  // Borders
  border: {
    subtle: "rgba(255, 255, 255, 0.08)",
    default: "rgba(255, 255, 255, 0.12)",
    strong: "rgba(255, 255, 255, 0.16)",
  },
} as const;

export const spacing = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
} as const;

export const radius = {
  sm: "6px",
  md: "10px",
  lg: "14px",
  xl: "18px",
  "2xl": "24px",
  full: "9999px",
} as const;

export const shadows = {
  sm: "0 1px 2px rgba(0, 0, 0, 0.3)",
  md: "0 4px 12px rgba(0, 0, 0, 0.4)",
  lg: "0 8px 24px rgba(0, 0, 0, 0.5)",
  xl: "0 16px 48px rgba(0, 0, 0, 0.6)",
  glowPurple:
    "0 0 20px rgba(139, 92, 246, 0.4), 0 0 40px rgba(139, 92, 246, 0.2)",
  glowPurpleSm:
    "0 0 12px rgba(139, 92, 246, 0.3), 0 0 24px rgba(139, 92, 246, 0.15)",
  glowAmber:
    "0 0 20px rgba(245, 158, 11, 0.3), 0 0 40px rgba(245, 158, 11, 0.15)",
  glowBlue:
    "0 0 20px rgba(59, 130, 246, 0.4), 0 0 40px rgba(59, 130, 246, 0.2)",
} as const;

export const layout = {
  sidebarWidth: "68px",
  sidebarWidthMobile: "56px",
  widgetWidth: "320px",
  maxContentWidth: "800px",
} as const;

export const typography = {
  fontFamily: {
    sans: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "SF Mono, Monaco, 'Fira Code', monospace",
  },
  fontSize: {
    display: "32px",
    h1: "28px",
    h2: "20px",
    h3: "17px",
    body: "15px",
    small: "14px",
    caption: "13px",
    tiny: "11px",
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.2,
    snug: 1.3,
    normal: 1.5,
    relaxed: 1.6,
  },
} as const;

export const animation = {
  duration: {
    fast: "0.15s",
    normal: "0.2s",
    slow: "0.3s",
    slower: "0.4s",
  },
  timing: {
    default: "ease",
    smooth: "cubic-bezier(0.25, 1, 0.5, 1)",
    bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
  },
} as const;

export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1200px",
  "2xl": "1400px",
} as const;

// Type exports
export type ColorToken = typeof colors;
export type SpacingToken = typeof spacing;
export type RadiusToken = typeof radius;
export type ShadowToken = typeof shadows;
export type LayoutToken = typeof layout;
export type TypographyToken = typeof typography;
export type AnimationToken = typeof animation;
export type BreakpointToken = typeof breakpoints;

export const designSystem = {
  colors,
  spacing,
  radius,
  shadows,
  layout,
  typography,
  animation,
  breakpoints,
} as const;

export default designSystem;
