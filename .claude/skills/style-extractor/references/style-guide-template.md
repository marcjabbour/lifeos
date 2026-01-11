# Style Guide Template

Use this structure for all style guide outputs. Include CSS custom properties for each section.

## Required Sections

### 1. Design Overview
- Overall aesthetic (minimal, bold, playful, corporate, etc.)
- Design influences/similar products
- Key characteristics in 2-3 sentences

### 2. Color Palette

```css
:root {
  /* Primary */
  --color-primary: #value;
  --color-primary-hover: #value;

  /* Backgrounds */
  --color-bg-page: #value;
  --color-bg-surface: #value;
  --color-bg-elevated: #value;

  /* Text */
  --color-text-primary: #value;
  --color-text-secondary: #value;
  --color-text-muted: #value;

  /* Borders */
  --color-border: #value;
  --color-border-subtle: #value;

  /* Semantic */
  --color-success: #value;
  --color-warning: #value;
  --color-error: #value;
}
```

Include:
- Exact hex values extracted from image
- Color relationships (warm/cool foundation, accent strategy)
- Usage notes for each color category

### 3. Typography

```css
:root {
  /* Font Families */
  --font-sans: 'Font Name', system-ui, sans-serif;
  --font-mono: 'Mono Font', monospace;

  /* Font Sizes */
  --text-xs: 11px;
  --text-sm: 12px;
  --text-base: 14px;
  --text-lg: 16px;
  --text-xl: 18px;
  --text-2xl: 24px;
  --text-3xl: 32px;

  /* Font Weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;

  /* Line Heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;

  /* Letter Spacing */
  --tracking-tight: -0.02em;
  --tracking-normal: 0;
  --tracking-wide: 0.02em;
}
```

Include:
- Visual font characteristics (geometric, humanist, serif, etc.)
- Suggested free alternatives (Google Fonts, system fonts)
- Heading vs body treatment
- Special text treatments (labels, captions, code)

### 4. Spacing System

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
}
```

Include:
- Base unit (typically 4px or 8px)
- Component internal padding patterns
- Section spacing patterns
- Density assessment (tight, comfortable, generous)

### 5. Border Radius

```css
:root {
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;
}
```

Include:
- Corner style (sharp, soft, rounded)
- Usage by component type (buttons, cards, inputs, avatars)

### 6. Shadows & Depth

```css
:root {
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 2px 4px rgba(0,0,0,0.08);
  --shadow-lg: 0 4px 8px rgba(0,0,0,0.1);
}
```

Include:
- Depth strategy (flat/borders-only, subtle shadows, layered shadows)
- Elevation hierarchy
- Border vs shadow preference

### 7. Component Patterns

Document visible components:

**Buttons**
- Primary, secondary, ghost styles
- Padding, border-radius, font-weight
- Hover/active states if visible

**Cards**
- Background, border, shadow treatment
- Internal padding
- Header/body/footer patterns

**Inputs**
- Border style, focus states
- Label positioning
- Placeholder styling

**Navigation**
- Layout pattern (sidebar, top nav, tabs)
- Active/hover states
- Icon usage

**Tables/Lists**
- Row styling, zebra striping
- Cell padding
- Header treatment

### 8. Iconography

- Icon style (outlined, filled, duotone)
- Icon size scale
- Suggested icon library match (Phosphor, Lucide, Heroicons, etc.)

### 9. Layout Patterns

- Container max-width
- Grid/column system
- Content density
- Responsive breakpoint hints (if multiple sizes shown)

## Output Quality Checklist

Before delivering:
- [ ] All hex colors are valid 6-digit codes
- [ ] Font suggestions include free alternatives
- [ ] Spacing values follow a consistent scale
- [ ] CSS variables use consistent naming
- [ ] Component patterns include actual measurements
