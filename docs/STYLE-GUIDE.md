# LifeOS Design System & Style Guide

> **Design Philosophy:** Dark-first, content-forward, conversational. Nova's intelligence feels ambient, not intrusive. Every element serves focus and clarity.

---

## Table of Contents

1. [Design Tokens](#design-tokens)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Shadows & Glow Effects](#shadows--glow-effects)
6. [Border Radius](#border-radius)
7. [Components](#components)
8. [Animation](#animation)
9. [Responsive Breakpoints](#responsive-breakpoints)
10. [Tailwind Configuration](#tailwind-configuration)

---

## Design Tokens

### CSS Custom Properties

```css
:root {
  /* ========================================
     BACKGROUNDS - Blue-tinted dark palette
     ======================================== */
  --bg-primary: #0a0a0f;      /* Main app background */
  --bg-secondary: #12121a;    /* Sidebar, elevated surfaces */
  --bg-card: #161620;         /* Card backgrounds */
  --bg-elevated: #1a1a28;     /* Modal, dropdown, tooltip backgrounds */
  --bg-hover: #1e1e2d;        /* Hover states on cards/buttons */

  /* ========================================
     TEXT - 4-level contrast hierarchy
     ======================================== */
  --text-primary: #ffffff;                    /* Headlines, important content */
  --text-secondary: rgba(255, 255, 255, 0.7); /* Body text, descriptions */
  --text-muted: rgba(255, 255, 255, 0.5);     /* Captions, timestamps, labels */
  --text-disabled: rgba(255, 255, 255, 0.3);  /* Disabled states, placeholders */

  /* ========================================
     ACCENT - Purple/Violet (Primary brand)
     ======================================== */
  --accent-primary: #8b5cf6;                  /* Primary buttons, links, active states */
  --accent-hover: #a78bfa;                    /* Hover state for accent elements */
  --accent-muted: rgba(139, 92, 246, 0.15);   /* Subtle backgrounds (active nav) */
  --accent-glow: rgba(139, 92, 246, 0.4);     /* Glow effect color */

  /* ========================================
     NOVA ENRICHED - Amber/Orange (AI activity)
     ======================================== */
  --nova-amber: #f59e0b;                      /* Nova badges, enrichment indicators */
  --nova-amber-bg: rgba(245, 158, 11, 0.15);  /* Badge backgrounds */
  --nova-amber-glow: rgba(245, 158, 11, 0.3); /* Glow for enriched content */

  /* ========================================
     ACTIVITY DOTS - Status indicators
     ======================================== */
  --dot-active: #8b5cf6;   /* Active/processing - Purple */
  --dot-warning: #f59e0b;  /* Attention needed - Amber */
  --dot-success: #10b981;  /* Completed - Green */
  --dot-muted: #4b5563;    /* Inactive/old - Gray */

  /* ========================================
     BORDERS - Subtle definition for dark mode
     ======================================== */
  --border-subtle: rgba(255, 255, 255, 0.08);  /* Default card borders */
  --border-default: rgba(255, 255, 255, 0.12); /* Hover state borders */
  --border-strong: rgba(255, 255, 255, 0.16);  /* Focus state borders */

  /* ========================================
     SPACING - 4px grid system
     ======================================== */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* ========================================
     BORDER RADIUS - Soft system
     ======================================== */
  --radius-sm: 6px;       /* Small elements (tags, dots) */
  --radius-md: 10px;      /* Buttons, inputs, nav items */
  --radius-lg: 14px;      /* Cards, dropdowns */
  --radius-xl: 18px;      /* Large cards, modals */
  --radius-2xl: 24px;     /* Command input, hero elements */
  --radius-full: 9999px;  /* Circular elements, pills */

  /* ========================================
     SHADOWS - Depth for dark mode
     ======================================== */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
  --shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.6);

  /* ========================================
     LAYOUT - Fixed dimensions
     ======================================== */
  --sidebar-width: 68px;
  --widget-width: 320px;
  --max-content-width: 800px;
}
```

---

## Color System

### Background Layers

| Layer | Variable | Hex | Usage |
|-------|----------|-----|-------|
| Base | `--bg-primary` | `#0a0a0f` | Main app background |
| Elevated | `--bg-secondary` | `#12121a` | Sidebar, nav bars |
| Surface | `--bg-card` | `#161620` | Cards, panels |
| Raised | `--bg-elevated` | `#1a1a28` | Modals, tooltips, floating elements |
| Interactive | `--bg-hover` | `#1e1e2d` | Hover states |

### Text Hierarchy

| Level | Variable | Value | Usage |
|-------|----------|-------|-------|
| Primary | `--text-primary` | `#ffffff` | Headlines, card titles, important |
| Secondary | `--text-secondary` | `rgba(255,255,255,0.7)` | Body text, Nova commentary |
| Muted | `--text-muted` | `rgba(255,255,255,0.5)` | Timestamps, captions, meta |
| Disabled | `--text-disabled` | `rgba(255,255,255,0.3)` | Placeholders, inactive |

### Accent Colors

```
PRIMARY ACCENT (Violet)
┌─────────────────────────────────────────────────────────────┐
│  Base       #8b5cf6   ████████  Primary buttons, links      │
│  Hover      #a78bfa   ████████  Hover state                 │
│  Muted      rgba(139,92,246,0.15)  Active nav backgrounds   │
│  Glow       rgba(139,92,246,0.4)   Shadow glow effect       │
└─────────────────────────────────────────────────────────────┘

NOVA AMBER (AI Activity)
┌─────────────────────────────────────────────────────────────┐
│  Base       #f59e0b   ████████  "Nova worked on this"       │
│  Background rgba(245,158,11,0.15)  Badge backgrounds        │
│  Glow       rgba(245,158,11,0.3)   Enriched card glow       │
└─────────────────────────────────────────────────────────────┘

STATUS COLORS
┌─────────────────────────────────────────────────────────────┐
│  Success    #10b981   ████████  Completed, positive         │
│  Warning    #f59e0b   ████████  Attention, processing       │
│  Error      #ef4444   ████████  Failed, destructive         │
│  Info       #3b82f6   ████████  Informational               │
└─────────────────────────────────────────────────────────────┘
```

---

## Typography

### Font Stack

```css
/* Primary - UI and body text */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Monospace - Code, timestamps, data */
font-family: 'SF Mono', 'Monaco', 'Fira Code', 'Fira Mono', monospace;
```

### Type Scale

| Name | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Display | 32px | 700 | 1.2 | Hero stats, large numbers |
| H1 | 28px | 700 | 1.2 | Page titles |
| H2 | 20px | 600 | 1.3 | Card titles (hero) |
| H3 | 17px | 600 | 1.3 | Card titles (standard) |
| Body | 15px | 400 | 1.5 | Body text, descriptions |
| Small | 14px | 400 | 1.5 | Secondary text |
| Caption | 13px | 400 | 1.4 | Meta info, timestamps |
| Tiny | 11px | 600 | 1.4 | Badges, labels (uppercase) |

### Letter Spacing

```css
/* Headlines - Slightly tighter */
letter-spacing: -0.5px;

/* Uppercase labels/badges */
letter-spacing: 0.5px;
text-transform: uppercase;
```

---

## Spacing & Layout

### 4px Grid System

All spacing uses multiples of 4px:

```
4px   (space-1)  → Tiny gaps, icon padding
8px   (space-2)  → Element gaps, tag padding
12px  (space-3)  → Small component padding
16px  (space-4)  → Standard padding, card gaps
20px  (space-5)  → Card content padding
24px  (space-6)  → Section gaps
32px  (space-8)  → Large section margins
40px  (space-10) → Major layout gaps
48px  (space-12) → Page margins
64px  (space-16) → Hero spacing
```

### Layout Structure

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  ┌────────┐  ┌─────────────────────────────────┐  ┌──────────────────┐  │
│  │        │  │                                 │  │                  │  │
│  │ ICON   │  │         MAIN CONTENT            │  │ FLOATING         │  │
│  │ SIDEBAR│  │         (Feed cards)            │  │ WIDGETS          │  │
│  │        │  │                                 │  │                  │  │
│  │ 68px   │  │                                 │  │ 320px            │  │
│  │        │  │                                 │  │                  │  │
│  │        │  │                                 │  │                  │  │
│  │        │  │                                 │  │                  │  │
│  │        │  │                                 │  │                  │  │
│  └────────┘  └─────────────────────────────────┘  └──────────────────┘  │
│                                                                          │
│              ┌─────────────────────────────────┐                         │
│              │    FLOATING COMMAND INPUT       │                         │
│              └─────────────────────────────────┘                         │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Shadows & Glow Effects

### Standard Shadows

```css
/* Subtle depth */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);

/* Card hover, elevated elements */
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);

/* Modals, dropdowns */
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);

/* Floating elements (command input) */
--shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.6);
```

### Glow Effects (CRITICAL)

These create the signature LifeOS "luminous" feel:

```css
/* Purple glow - Primary interactive elements */
.shadow-glow-purple {
  box-shadow:
    0 0 20px rgba(139, 92, 246, 0.4),
    0 0 40px rgba(139, 92, 246, 0.2);
}

/* Purple glow small - Avatars, icons */
.shadow-glow-purple-sm {
  box-shadow:
    0 0 12px rgba(139, 92, 246, 0.3),
    0 0 24px rgba(139, 92, 246, 0.15);
}

/* Amber glow - Nova enriched content */
.shadow-glow-amber {
  box-shadow:
    0 0 20px rgba(245, 158, 11, 0.3),
    0 0 40px rgba(245, 158, 11, 0.15);
}

/* Blue glow - Alternative accent */
.shadow-glow-blue {
  box-shadow:
    0 0 20px rgba(59, 130, 246, 0.4),
    0 0 40px rgba(59, 130, 246, 0.2);
}

/* Text glow - Highlighted stats */
.text-glow-purple {
  text-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
}
```

### When to Apply Glow

| Element | Glow Type | Trigger |
|---------|-----------|---------|
| Sidebar logo | `shadow-glow-purple` + animate | Always |
| Active nav indicator | `shadow-glow-purple-sm` | When active |
| Nova avatar (anywhere) | `shadow-glow-purple-sm` | Always |
| "Nova worked on this" badge | `shadow-glow-amber` | Always |
| Primary buttons | `shadow-glow-purple` | On hover |
| Command input | `shadow-glow-purple` | On focus |
| Stat numbers | `text-glow-purple` | Always |

---

## Border Radius

### Radius Scale

```css
--radius-sm: 6px;       /* Tags, status dots, small buttons */
--radius-md: 10px;      /* Buttons, inputs, nav items, avatars */
--radius-lg: 14px;      /* Standard cards, dropdowns */
--radius-xl: 18px;      /* Large cards, modals */
--radius-2xl: 24px;     /* Command input, hero cards */
--radius-full: 9999px;  /* Pills, circular avatars, badges */
```

### Component Radius Map

| Component | Radius |
|-----------|--------|
| Buttons | `radius-md` (10px) |
| Cards | `radius-xl` (18px) |
| Inputs | `radius-md` (10px) |
| Tags/Pills | `radius-full` |
| Nova badges | `radius-full` |
| Command input | `radius-2xl` (24px) |
| Avatars | `radius-full` |
| Nav items | `radius-md` (10px) |
| Thumbnails | `radius-md` (10px) |

---

## Components

### Icon Sidebar

```css
.sidebar {
  width: 68px;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-4) 0;
  z-index: 100;
}

.nav-item {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
}

.nav-item.active {
  background: var(--accent-muted);
  color: var(--accent-primary);
}

/* Active indicator bar */
.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  width: 3px;
  height: 24px;
  background: var(--accent-primary);
  border-radius: 0 var(--radius-full) var(--radius-full) 0;
  box-shadow: 0 0 12px var(--accent-glow);
}
```

### Cards

```css
/* Base card */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: all 0.3s ease;
}

.card:hover {
  border-color: var(--border-default);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

/* Hero card (featured content) */
.card-hero .card-thumbnail {
  width: 100%;
  height: 280px;
  object-fit: cover;
}

.card-hero .card-thumbnail-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 280px;
  background: linear-gradient(to bottom, transparent 50%, var(--bg-card) 100%);
}

/* Split card (image + content side by side) */
.card-split {
  display: flex;
}

.card-split .card-image {
  width: 200px;
  height: 180px;
  object-fit: cover;
  flex-shrink: 0;
}

/* Memory card (special purple gradient) */
.card-memory {
  border: 1px solid rgba(139, 92, 246, 0.2);
  background: linear-gradient(135deg, var(--bg-card) 0%, rgba(139, 92, 246, 0.05) 100%);
}
```

### Nova Badge

```css
.nova-badge {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  background: var(--nova-amber-bg);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 600;
  color: var(--nova-amber);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Apply glow */
.nova-badge {
  box-shadow:
    0 0 20px rgba(245, 158, 11, 0.3),
    0 0 40px rgba(245, 158, 11, 0.15);
}
```

### Nova Commentary Block

```css
.nova-commentary {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
  border-left: 3px solid var(--accent-primary);
}

.nova-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--accent-primary), #6366f1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.3);
}

.nova-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-primary);
}

.nova-commentary-text {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}
```

### Buttons

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

/* Primary (filled) */
.btn-primary {
  background: var(--accent-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-hover);
  box-shadow: 0 0 20px var(--accent-glow);
}

/* Secondary (outlined) */
.btn-secondary {
  background: var(--bg-hover);
  color: var(--text-secondary);
  border: 1px solid var(--border-default);
}

.btn-secondary:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
  border-color: var(--accent-primary);
}

/* Small variant */
.btn-sm {
  padding: var(--space-2) var(--space-3);
  font-size: 12px;
}
```

### Floating Command Input

```css
.command-input-container {
  position: fixed;
  bottom: var(--space-6);
  left: 50%;
  transform: translateX(-50%);
  width: min(680px, calc(100vw - 200px));
  z-index: 200;
}

.command-input {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-2xl);
  box-shadow:
    var(--shadow-xl),
    0 0 30px rgba(139, 92, 246, 0.15);
  transition: all 0.3s ease;
}

.command-input:focus-within {
  border-color: var(--accent-primary);
  box-shadow:
    var(--shadow-xl),
    0 0 40px rgba(139, 92, 246, 0.25);
}

.command-avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--accent-primary), #6366f1);
  box-shadow: 0 0 16px rgba(139, 92, 246, 0.4);
}
```

### Activity Timeline

```css
.activity-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}

.activity-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.activity-dot.purple { background: var(--dot-active); }
.activity-dot.amber { background: var(--dot-warning); }
.activity-dot.green { background: var(--dot-success); }
.activity-dot.gray { background: var(--dot-muted); }

.activity-line {
  width: 1px;
  height: 32px;
  background: var(--border-subtle);
  margin-top: var(--space-2);
}
```

### Widget Cards

```css
.widget {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  transition: all 0.3s ease;
}

.widget:hover {
  border-color: var(--border-default);
}

/* Insight widget (purple gradient) */
.insight-widget {
  background: linear-gradient(135deg, var(--bg-card) 0%, rgba(139, 92, 246, 0.08) 100%);
  border-color: rgba(139, 92, 246, 0.2);
}

/* Upgrade widget (amber gradient) */
.upgrade-widget {
  background: linear-gradient(135deg, #1a1a28 0%, rgba(245, 158, 11, 0.1) 100%);
  border-color: rgba(245, 158, 11, 0.2);
}
```

---

## Animation

### Timing Functions

```css
/* Standard easing - smooth, natural feel */
transition: all 0.2s ease;

/* Emphasized easing - for important interactions */
transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
```

### Keyframe Animations

```css
/* Fade in with slide */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Subtle pulse */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Glow breathing (for logo) */
@keyframes glow {
  0%, 100% {
    box-shadow:
      0 0 20px rgba(139, 92, 246, 0.4),
      0 0 40px rgba(139, 92, 246, 0.2);
  }
  50% {
    box-shadow:
      0 0 30px rgba(139, 92, 246, 0.5),
      0 0 60px rgba(139, 92, 246, 0.3);
  }
}
```

### Staggered Entrance

```css
.card { animation: fadeIn 0.4s ease-out; }
.card:nth-child(1) { animation-delay: 0.05s; }
.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.15s; }
.card:nth-child(4) { animation-delay: 0.2s; }

.widget { animation: fadeIn 0.5s ease-out; }
.widget:nth-child(1) { animation-delay: 0.1s; }
.widget:nth-child(2) { animation-delay: 0.2s; }
.widget:nth-child(3) { animation-delay: 0.3s; }
```

### Hover Transitions

```css
/* Card lift */
.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

/* Button glow */
.btn-primary:hover {
  box-shadow: 0 0 20px var(--accent-glow);
}

/* Link arrow slide */
.card-link:hover {
  gap: var(--space-3); /* Arrow slides right */
}
```

---

## Responsive Breakpoints

### Breakpoint Scale

| Name | Width | Description |
|------|-------|-------------|
| Desktop XL | > 1400px | Full layout with all widgets |
| Desktop | 1200-1400px | Widgets shrink |
| Tablet | 768-1200px | Widgets hidden, full-width content |
| Mobile | < 768px | Collapsed sidebar, stacked layouts |

### Media Queries

```css
/* Desktop (widgets shrink) */
@media (max-width: 1400px) {
  .widgets-container {
    width: 280px;
  }
}

/* Tablet (widgets hidden) */
@media (max-width: 1200px) {
  .widgets-container {
    display: none;
  }
  .main-content {
    max-width: calc(100vw - var(--sidebar-width) - var(--space-8));
  }
}

/* Mobile */
@media (max-width: 768px) {
  .sidebar {
    width: 56px;
  }
  .main-content {
    margin-left: 56px;
    padding: var(--space-4) var(--space-4) 100px;
  }
  .card-split {
    flex-direction: column;
  }
  .card-split .card-image {
    width: 100%;
    height: 160px;
  }
}
```

---

## Tailwind Configuration

If using Tailwind CSS, extend the default config:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Backgrounds
        bg: {
          primary: '#0a0a0f',
          secondary: '#12121a',
          card: '#161620',
          elevated: '#1a1a28',
          hover: '#1e1e2d',
        },
        // Accent
        accent: {
          primary: '#8b5cf6',
          hover: '#a78bfa',
          muted: 'rgba(139, 92, 246, 0.15)',
        },
        // Nova
        nova: {
          amber: '#f59e0b',
          'amber-bg': 'rgba(245, 158, 11, 0.15)',
        },
        // Dots
        dot: {
          active: '#8b5cf6',
          warning: '#f59e0b',
          success: '#10b981',
          muted: '#4b5563',
        },
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '18px',
        '2xl': '24px',
      },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.4), 0 0 40px rgba(139, 92, 246, 0.2)',
        'glow-purple-sm': '0 0 12px rgba(139, 92, 246, 0.3), 0 0 24px rgba(139, 92, 246, 0.15)',
        'glow-amber': '0 0 20px rgba(245, 158, 11, 0.3), 0 0 40px rgba(245, 158, 11, 0.15)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.4), 0 0 40px rgba(59, 130, 246, 0.2)',
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Fira Code', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'pulse': 'pulse 2s ease-in-out infinite',
        'glow': 'glow 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.4), 0 0 40px rgba(139, 92, 246, 0.2)' },
          '50%': { boxShadow: '0 0 30px rgba(139, 92, 246, 0.5), 0 0 60px rgba(139, 92, 246, 0.3)' },
        },
      },
    },
  },
}
```

---

## Quick Reference

### Class Utilities (Tailwind-style)

```html
<!-- Glow effects -->
<div class="shadow-glow-purple">Purple glow</div>
<div class="shadow-glow-purple-sm">Small purple glow</div>
<div class="shadow-glow-amber">Amber glow</div>
<span class="text-glow-purple">Glowing text</span>

<!-- Backgrounds -->
<div class="bg-primary">Base background</div>
<div class="bg-card">Card surface</div>
<div class="bg-elevated">Raised surface</div>

<!-- Text -->
<span class="text-primary">Primary text</span>
<span class="text-secondary">Secondary text</span>
<span class="text-muted">Muted text</span>

<!-- Borders -->
<div class="border border-subtle">Subtle border</div>
<div class="border border-default">Default border</div>

<!-- Radius -->
<div class="rounded-md">10px radius</div>
<div class="rounded-xl">18px radius</div>
<div class="rounded-full">Pill/circle</div>
```

---

## Design Principles Checklist

When building new components, verify:

- [ ] Background uses correct elevation layer
- [ ] Text follows 4-level hierarchy
- [ ] Spacing uses 4px grid (4, 8, 12, 16, 20, 24, 32...)
- [ ] Border radius matches component type
- [ ] Interactive elements have hover states
- [ ] Nova-related elements use amber accent
- [ ] Glow effects applied to key interactive elements
- [ ] Animations use standard timing (0.2s-0.3s ease)
- [ ] Responsive behavior defined for all breakpoints
