---
name: style-extractor
description: Extract comprehensive, reproducible style guides from screenshots OR live websites. Use when a user provides an image/screenshot OR a URL and wants to replicate its visual design. Analyzes colors, typography, spacing, shadows, components, and layout patterns to produce a complete style guide with CSS custom properties.
---

# Style Extractor

Analyze web app screenshots or live websites and produce detailed, actionable style guides.

## Input Types

### 1. Screenshot/Image
User provides a screenshot or image file path.
```
Analyze this design: /path/to/screenshot.png
```

### 2. URL (Live Website)
User provides a URL to extract styles from.
```
Extract the style from: https://example.com
```

## Workflow

### For Screenshots

1. **Receive image** - User provides screenshot of web page/app
2. **Analyze systematically** - Extract each design dimension (see analysis checklist below)
3. **Generate style guide** - Output markdown following the template in `references/style-guide-template.md`

### For URLs

1. **Navigate to URL** - Use Playwright MCP to load the page
   ```
   mcp__playwright__browser_navigate: url
   ```

2. **Take screenshot** - Capture the current state
   ```
   mcp__playwright__browser_take_screenshot
   ```

3. **Get page snapshot** - Capture DOM structure for component analysis
   ```
   mcp__playwright__browser_snapshot
   ```

4. **Extract computed styles** - Use browser evaluation to get actual CSS values
   ```javascript
   mcp__playwright__browser_evaluate:
   // Extract CSS custom properties
   const styles = getComputedStyle(document.documentElement);
   const root = document.documentElement;

   // Get colors from key elements
   const body = getComputedStyle(document.body);
   const headings = document.querySelectorAll('h1, h2, h3');
   const buttons = document.querySelectorAll('button, .btn');
   const cards = document.querySelectorAll('.card, [class*="card"]');

   return {
     background: body.backgroundColor,
     textColor: body.color,
     fontFamily: body.fontFamily,
     // ... more extractions
   };
   ```

5. **Analyze visually** - Review screenshot for patterns not captured by CSS
6. **Generate style guide** - Combine computed values with visual analysis

## Analysis Checklist

Extract in this order:

### Colors
- Sample exact hex values from distinct regions (use color picker precision)
- Identify: page background, surface/card backgrounds, text colors (primary, secondary, muted), borders, primary accent, semantic colors (success/warning/error)
- Note: warm vs cool foundation, single vs multiple accent colors

### Typography
- Assess font category: geometric, humanist, neo-grotesque, serif, mono
- Note visible weights and their usage (headlines, body, labels, captions)
- Estimate size scale from visual hierarchy
- Check `references/font-matching.md` to suggest free alternatives

### Spacing
- Identify base unit (usually 4px or 8px grid)
- Measure component padding (buttons, cards, inputs)
- Measure gaps between elements
- Assess overall density: tight (data-dense), comfortable (balanced), generous (marketing)

### Depth & Borders
- Determine strategy: flat (borders only), subtle shadows, or layered shadows
- Note border thickness and opacity
- Extract shadow values if present

### Border Radius
- Categorize: sharp (2-4px), soft (6-8px), rounded (12px+), pill (full)
- Note variation between component types

### Components
Document what's visible:
- Buttons: styles, padding, radius
- Cards: background, border, shadow, padding
- Inputs: border style, focus indication
- Navigation: layout, active states
- Tables/lists: row styling, cell padding

### Layout
- Container width
- Sidebar vs top navigation
- Content area structure
- Grid patterns

## URL Extraction Script

Use this evaluation script for comprehensive style extraction:

```javascript
// Run via mcp__playwright__browser_evaluate
(function() {
  const getColorValue = (el, prop) => {
    const style = getComputedStyle(el);
    return style[prop];
  };

  const rgbToHex = (rgb) => {
    const match = rgb.match(/\d+/g);
    if (!match) return rgb;
    return '#' + match.slice(0, 3).map(x =>
      parseInt(x).toString(16).padStart(2, '0')
    ).join('');
  };

  const body = document.body;
  const bodyStyle = getComputedStyle(body);

  // Find primary button
  const buttons = [...document.querySelectorAll('button, [class*="btn"], [class*="button"]')];
  const primaryBtn = buttons.find(b =>
    getComputedStyle(b).backgroundColor !== 'rgba(0, 0, 0, 0)'
  );

  // Find cards
  const cards = document.querySelectorAll('[class*="card"], [class*="Card"]');
  const cardStyle = cards[0] ? getComputedStyle(cards[0]) : null;

  return {
    colors: {
      background: rgbToHex(bodyStyle.backgroundColor),
      text: rgbToHex(bodyStyle.color),
      primary: primaryBtn ? rgbToHex(getComputedStyle(primaryBtn).backgroundColor) : null,
    },
    typography: {
      fontFamily: bodyStyle.fontFamily,
      fontSize: bodyStyle.fontSize,
      lineHeight: bodyStyle.lineHeight,
    },
    spacing: {
      bodyPadding: bodyStyle.padding,
    },
    components: {
      button: primaryBtn ? {
        padding: getComputedStyle(primaryBtn).padding,
        borderRadius: getComputedStyle(primaryBtn).borderRadius,
        fontWeight: getComputedStyle(primaryBtn).fontWeight,
      } : null,
      card: cardStyle ? {
        padding: cardStyle.padding,
        borderRadius: cardStyle.borderRadius,
        boxShadow: cardStyle.boxShadow,
        border: cardStyle.border,
      } : null,
    }
  };
})();
```

## Output Format

Generate a markdown document with:
- Design overview (2-3 sentence summary)
- CSS custom properties for each section (colors, typography, spacing, etc.)
- Component-specific patterns with measurements
- Usage notes explaining design decisions

Follow the complete structure in `references/style-guide-template.md`.

## Precision Guidelines

- **Colors**: Use 6-digit hex codes. If uncertain between two similar shades, pick the more likely intentional value (e.g., `#f8fafc` not `#f9fafb`)
- **Sizes**: Prefer values that align to common scales (4px increments, standard font sizes like 12, 14, 16, 18)
- **Fonts**: Always provide a free alternative, even if you identify the exact font
- **Shadows**: Describe as CSS `box-shadow` values with rgba opacity

## Quality Bar

The style guide should be detailed enough that someone could recreate the visual design without seeing the original image or visiting the URL.

## Example Workflow for URL

```
User: Extract the style from https://linear.app

1. Navigate to URL
   → mcp__playwright__browser_navigate: https://linear.app

2. Wait for page load
   → mcp__playwright__browser_wait_for: { time: 2 }

3. Take screenshot
   → mcp__playwright__browser_take_screenshot

4. Get snapshot for structure
   → mcp__playwright__browser_snapshot

5. Extract computed styles
   → mcp__playwright__browser_evaluate: [extraction script]

6. Analyze and generate style guide
   → Combine visual analysis with computed values
```
