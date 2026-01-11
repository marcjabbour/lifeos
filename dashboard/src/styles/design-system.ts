/**
 * LifeOS Design System
 *
 * A futuristic, dark-mode-first design system with glowing accents
 * and smooth animations. Built for a dashboard you want to LIVE on.
 */

// =============================================================================
// COLOR PALETTE
// =============================================================================

export const colors = {
  // Base blacks - deep and rich
  black: {
    pure: "#000000",
    deep: "#050508",
    base: "#0a0a0f",
    elevated: "#12121a",
    surface: "#1a1a24",
    border: "#2a2a3a",
  },

  // Primary accent - Cyan (futuristic, tech-forward)
  cyan: {
    50: "#e0fcff",
    100: "#bef8fd",
    200: "#87eaf2",
    300: "#54d1db",
    400: "#38bec9",
    500: "#00d4ff", // Primary
    600: "#00b4d8",
    700: "#0096c7",
    800: "#0077b6",
    900: "#005f99",
    glow: "rgba(0, 212, 255, 0.5)",
    glowStrong: "rgba(0, 212, 255, 0.8)",
  },

  // Secondary accent - Purple (premium, creative)
  purple: {
    50: "#f5f3ff",
    100: "#ede9fe",
    200: "#ddd6fe",
    300: "#c4b5fd",
    400: "#a78bfa",
    500: "#8b5cf6", // Secondary
    600: "#7c3aed",
    700: "#6d28d9",
    800: "#5b21b6",
    900: "#4c1d95",
    glow: "rgba(139, 92, 246, 0.5)",
    glowStrong: "rgba(139, 92, 246, 0.8)",
  },

  // Semantic colors
  success: {
    base: "#10b981",
    glow: "rgba(16, 185, 129, 0.5)",
  },
  warning: {
    base: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.5)",
  },
  error: {
    base: "#ef4444",
    glow: "rgba(239, 68, 68, 0.5)",
  },

  // Text colors
  text: {
    primary: "#ffffff",
    secondary: "#a1a1aa",
    tertiary: "#71717a",
    muted: "#52525b",
  },
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const typography = {
  fontFamily: {
    sans: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", "SF Mono", Monaco, "Cascadia Code", monospace',
  },

  fontSize: {
    xs: "0.75rem", // 12px
    sm: "0.875rem", // 14px
    base: "1rem", // 16px
    lg: "1.125rem", // 18px
    xl: "1.25rem", // 20px
    "2xl": "1.5rem", // 24px
    "3xl": "1.875rem", // 30px
    "4xl": "2.25rem", // 36px
    "5xl": "3rem", // 48px
  },

  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },

  lineHeight: {
    tight: "1.25",
    normal: "1.5",
    relaxed: "1.75",
  },

  letterSpacing: {
    tighter: "-0.05em",
    tight: "-0.025em",
    normal: "0",
    wide: "0.025em",
    wider: "0.05em",
  },
} as const;

// =============================================================================
// SPACING
// =============================================================================

export const spacing = {
  px: "1px",
  0: "0",
  0.5: "0.125rem", // 2px
  1: "0.25rem", // 4px
  1.5: "0.375rem", // 6px
  2: "0.5rem", // 8px
  2.5: "0.625rem", // 10px
  3: "0.75rem", // 12px
  3.5: "0.875rem", // 14px
  4: "1rem", // 16px
  5: "1.25rem", // 20px
  6: "1.5rem", // 24px
  7: "1.75rem", // 28px
  8: "2rem", // 32px
  9: "2.25rem", // 36px
  10: "2.5rem", // 40px
  12: "3rem", // 48px
  14: "3.5rem", // 56px
  16: "4rem", // 64px
  20: "5rem", // 80px
  24: "6rem", // 96px
} as const;

// =============================================================================
// SHADOWS & GLOWS
// =============================================================================

export const shadows = {
  // Subtle shadows for depth
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.5)",
  base: "0 1px 3px 0 rgba(0, 0, 0, 0.5), 0 1px 2px -1px rgba(0, 0, 0, 0.5)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",

  // Glow effects - the magic sauce
  glowCyan: {
    sm: `0 0 10px ${colors.cyan.glow}`,
    md: `0 0 20px ${colors.cyan.glow}, 0 0 40px ${colors.cyan.glow}`,
    lg: `0 0 30px ${colors.cyan.glowStrong}, 0 0 60px ${colors.cyan.glow}`,
    intense: `0 0 20px ${colors.cyan.glowStrong}, 0 0 40px ${colors.cyan.glowStrong}, 0 0 80px ${colors.cyan.glow}`,
  },

  glowPurple: {
    sm: `0 0 10px ${colors.purple.glow}`,
    md: `0 0 20px ${colors.purple.glow}, 0 0 40px ${colors.purple.glow}`,
    lg: `0 0 30px ${colors.purple.glowStrong}, 0 0 60px ${colors.purple.glow}`,
    intense: `0 0 20px ${colors.purple.glowStrong}, 0 0 40px ${colors.purple.glowStrong}, 0 0 80px ${colors.purple.glow}`,
  },

  // Card hover glow (gradient effect)
  cardGlow: `
    0 0 20px rgba(0, 212, 255, 0.15),
    0 0 40px rgba(139, 92, 246, 0.1),
    0 8px 32px rgba(0, 0, 0, 0.4)
  `,

  cardGlowHover: `
    0 0 30px rgba(0, 212, 255, 0.25),
    0 0 60px rgba(139, 92, 246, 0.15),
    0 12px 40px rgba(0, 0, 0, 0.5)
  `,
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================

export const borderRadius = {
  none: "0",
  sm: "0.25rem", // 4px
  base: "0.5rem", // 8px
  md: "0.75rem", // 12px
  lg: "1rem", // 16px
  xl: "1.25rem", // 20px
  "2xl": "1.5rem", // 24px
  "3xl": "2rem", // 32px
  full: "9999px",
} as const;

// =============================================================================
// Z-INDEX
// =============================================================================

export const zIndex = {
  behind: -1,
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  overlay: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  toast: 80,
  max: 9999,
} as const;

// =============================================================================
// BREAKPOINTS
// =============================================================================

export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

// =============================================================================
// TRANSITIONS
// =============================================================================

export const transitions = {
  duration: {
    instant: "0ms",
    fast: "150ms",
    normal: "200ms",
    slow: "300ms",
    slower: "500ms",
  },

  easing: {
    linear: "linear",
    easeIn: "cubic-bezier(0.4, 0, 1, 1)",
    easeOut: "cubic-bezier(0, 0, 0.2, 1)",
    easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
    spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  },
} as const;

// =============================================================================
// FRAMER MOTION VARIANTS
// =============================================================================

export const motionVariants = {
  // Fade in/out
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  },

  // Slide up with fade
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },

  // Slide in from left (for sidebar)
  slideInLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },

  // Slide in from bottom (for mobile nav)
  slideInBottom: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },

  // Scale up (for cards)
  scaleUp: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
  },

  // Pop effect for hover
  popHover: {
    rest: { scale: 1 },
    hover: {
      scale: 1.02,
      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
    },
    tap: { scale: 0.98 },
  },

  // Card hover with glow
  cardHover: {
    rest: {
      scale: 1,
      boxShadow: shadows.cardGlow,
    },
    hover: {
      scale: 1.02,
      boxShadow: shadows.cardGlowHover,
      transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
    },
    tap: {
      scale: 0.98,
      transition: { duration: 0.1 },
    },
  },

  // Stagger children
  staggerContainer: {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  },

  staggerItem: {
    initial: { opacity: 0, y: 10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
    },
  },

  // Pulse animation for input focus
  pulse: {
    initial: { boxShadow: `0 0 0 0 ${colors.cyan.glow}` },
    animate: {
      boxShadow: [`0 0 0 0 ${colors.cyan.glow}`, `0 0 0 8px transparent`],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeOut",
      },
    },
  },

  // Glow pulse for active elements
  glowPulse: {
    animate: {
      boxShadow: [
        shadows.glowCyan.sm,
        shadows.glowCyan.md,
        shadows.glowCyan.sm,
      ],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  },

  // Page transition
  pageTransition: {
    initial: { opacity: 0, y: 10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: { duration: 0.3, ease: [0.4, 0, 1, 1] },
    },
  },
} as const;

// =============================================================================
// CSS VARIABLE EXPORT (for globals.css)
// =============================================================================

export const cssVariables = `
  /* Colors - Black */
  --color-black-pure: ${colors.black.pure};
  --color-black-deep: ${colors.black.deep};
  --color-black-base: ${colors.black.base};
  --color-black-elevated: ${colors.black.elevated};
  --color-black-surface: ${colors.black.surface};
  --color-black-border: ${colors.black.border};

  /* Colors - Cyan */
  --color-cyan-500: ${colors.cyan[500]};
  --color-cyan-glow: ${colors.cyan.glow};
  --color-cyan-glow-strong: ${colors.cyan.glowStrong};

  /* Colors - Purple */
  --color-purple-500: ${colors.purple[500]};
  --color-purple-glow: ${colors.purple.glow};
  --color-purple-glow-strong: ${colors.purple.glowStrong};

  /* Colors - Text */
  --color-text-primary: ${colors.text.primary};
  --color-text-secondary: ${colors.text.secondary};
  --color-text-tertiary: ${colors.text.tertiary};
  --color-text-muted: ${colors.text.muted};

  /* Typography */
  --font-sans: ${typography.fontFamily.sans};
  --font-mono: ${typography.fontFamily.mono};

  /* Shadows */
  --shadow-card-glow: ${shadows.cardGlow};
  --shadow-card-glow-hover: ${shadows.cardGlowHover};
  --shadow-glow-cyan-sm: ${shadows.glowCyan.sm};
  --shadow-glow-cyan-md: ${shadows.glowCyan.md};
`;

// Type exports for TypeScript
export type Colors = typeof colors;
export type Typography = typeof typography;
export type Spacing = typeof spacing;
export type Shadows = typeof shadows;
export type BorderRadius = typeof borderRadius;
export type ZIndex = typeof zIndex;
export type Breakpoints = typeof breakpoints;
export type Transitions = typeof transitions;
export type MotionVariants = typeof motionVariants;
