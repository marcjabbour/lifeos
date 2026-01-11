# Font Matching Reference

Map visual characteristics to common web fonts.

## Geometric Sans-Serif

**Characteristics**: Circular bowls, uniform stroke width, modern/technical feel

| If it looks like... | Suggest |
|---------------------|---------|
| Inter | Inter (Google Fonts) |
| SF Pro | Inter, -apple-system |
| Circular | Nunito Sans, Poppins |
| Futura | Jost, Nunito |
| Geist | Inter, Outfit |
| Avenir | Nunito, Questrial |
| Proxima Nova | Montserrat, Source Sans 3 |
| Graphik | Inter, DM Sans |

## Humanist Sans-Serif

**Characteristics**: Varying stroke width, calligraphic influence, warmer feel

| If it looks like... | Suggest |
|---------------------|---------|
| Open Sans | Open Sans (Google Fonts) |
| Lato | Lato (Google Fonts) |
| Segoe UI | Open Sans, system-ui |
| Fira Sans | Fira Sans (Google Fonts) |
| Source Sans | Source Sans 3 (Google Fonts) |
| Myriad | Source Sans 3, Lato |
| Gill Sans | Lato, Cabin |

## Neo-Grotesque

**Characteristics**: Neutral, minimal personality, highly legible

| If it looks like... | Suggest |
|---------------------|---------|
| Helvetica | Inter, Roboto |
| Arial | Roboto, Inter |
| Roboto | Roboto (Google Fonts) |
| Neue Haas | Inter, Roboto |
| Univers | IBM Plex Sans |
| Aktiv Grotesk | Inter, Roboto |

## Monospace

**Characteristics**: Fixed-width, used for code/data

| If it looks like... | Suggest |
|---------------------|---------|
| SF Mono | JetBrains Mono, Fira Code |
| Monaco | JetBrains Mono |
| Consolas | Fira Code, Source Code Pro |
| Menlo | JetBrains Mono, IBM Plex Mono |
| Operator Mono | JetBrains Mono (italic) |
| Dank Mono | Fira Code |
| Berkeley Mono | JetBrains Mono, IBM Plex Mono |
| Geist Mono | JetBrains Mono, Space Mono |

## Serif

| If it looks like... | Suggest |
|---------------------|---------|
| Georgia | Georgia (system), Merriweather |
| Times New Roman | Libre Baskerville |
| Freight Text | Lora, Merriweather |
| Charter | Charter (system), Lora |
| Lyon | Source Serif 4 |
| Tiempos | Source Serif 4, Merriweather |

## Display/Decorative

| Style | Suggest |
|-------|---------|
| Bold geometric | Poppins, Outfit |
| Rounded friendly | Nunito, Quicksand |
| Condensed | Barlow Condensed, Oswald |
| Extra bold | Plus Jakarta Sans, Sora |

## System Font Stacks

```css
/* Modern system stack */
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Monospace system stack */
font-family: ui-monospace, 'SF Mono', Menlo, Monaco, 'Cascadia Code', monospace;

/* Serif system stack */
font-family: ui-serif, Georgia, Cambria, 'Times New Roman', serif;
```

## Visual Identification Cues

**Geometric indicators**:
- Perfectly circular 'o'
- Single-story 'a' (looks like 'ɑ')
- 't' with horizontal crossbar

**Humanist indicators**:
- Two-story 'a' (looks like 'a')
- Varying stroke thickness
- Calligraphic 'e' terminal

**Weight identification**:
- Thin/Light: Very delicate strokes
- Regular: Standard reading weight
- Medium: Slightly heavier, good for UI labels
- Semibold: Noticeable emphasis
- Bold: Strong headlines
- Black: Very heavy, display use
