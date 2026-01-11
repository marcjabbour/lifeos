---
name: data-viz
description: Data visualization and dashboard design patterns. Use when building charts, graphs, dashboards, analytics views, or data-heavy interfaces. Covers library selection, chart types, dashboard layouts, and data transformation.
---

# Data Visualization

Patterns for building effective data visualizations and dashboards. Use this skill when working with charts, graphs, analytics, or data-heavy interfaces.

## When to Use

- Building dashboard interfaces
- Adding charts or graphs to an application
- Designing analytics views
- Presenting data in visual form
- Choosing between visualization libraries

## Library Selection

### JavaScript/TypeScript

| Library | Best For | Trade-offs |
|---------|----------|------------|
| **Recharts** | React apps, simple charts | Easy API, limited customization |
| **Chart.js** | Quick setup, standard charts | Good defaults, canvas-based |
| **D3.js** | Custom/complex visualizations | Steep learning curve, full control |
| **Visx** | React + D3 hybrid | Composable, more setup |
| **Apache ECharts** | Large datasets, many chart types | Feature-rich, heavier bundle |
| **Plotly** | Scientific/statistical | Interactive, larger bundle |
| **Nivo** | React, beautiful defaults | Opinionated, good DX |

### Decision Tree

```
Simple bar/line/pie charts?
  → Recharts (React) or Chart.js (vanilla)

Need heavy customization?
  → D3.js or Visx

Large datasets (10k+ points)?
  → Apache ECharts or Plotly

Scientific/statistical visualization?
  → Plotly or D3.js

Dashboard with many chart types?
  → Apache ECharts or Nivo
```

## Chart Type Selection

### Choose Based on Data Relationship

| Relationship | Chart Type | Example |
|--------------|------------|---------|
| Part-to-whole | Pie, Donut, Treemap | Market share breakdown |
| Comparison | Bar, Column, Grouped Bar | Sales by region |
| Trend over time | Line, Area | Revenue over months |
| Distribution | Histogram, Box Plot | Age distribution |
| Correlation | Scatter, Bubble | Price vs. quantity |
| Ranking | Horizontal Bar | Top 10 products |
| Geographic | Map, Choropleth | Sales by country |
| Flow/Process | Sankey, Funnel | Conversion funnel |

### Anti-Patterns

- **Pie charts with many slices** → Use horizontal bar instead
- **3D charts** → Always use 2D (3D distorts perception)
- **Dual Y-axes** → Often misleading, consider two charts
- **Rainbow color schemes** → Use sequential or diverging palettes

## Dashboard Layout Patterns

### Grid-Based Layout

```
┌─────────────────────────────────────────────┐
│  KPI Cards (4 across)                       │
├──────────────────────┬──────────────────────┤
│  Primary Chart       │  Secondary Chart     │
│  (2/3 width)         │  (1/3 width)         │
├──────────────────────┴──────────────────────┤
│  Data Table                                 │
└─────────────────────────────────────────────┘
```

### KPI Card Pattern

```tsx
interface KPICard {
  label: string;       // "Total Revenue"
  value: string;       // "$1.2M"
  change: number;      // +12.5 (percent)
  trend: 'up' | 'down' | 'neutral';
  sparkline?: number[]; // Optional mini chart
}
```

### Responsive Considerations

```css
/* Mobile: Stack everything */
@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  .chart-container {
    min-height: 300px;
  }
}

/* Desktop: Multi-column */
@media (min-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: repeat(12, 1fr);
  }
}
```

## Data Transformation Patterns

### Aggregation

```typescript
// Group and sum
const salesByRegion = data.reduce((acc, item) => {
  acc[item.region] = (acc[item.region] || 0) + item.amount;
  return acc;
}, {});

// Transform for chart
const chartData = Object.entries(salesByRegion).map(([region, total]) => ({
  name: region,
  value: total,
}));
```

### Time Series Bucketing

```typescript
// Group by month
const byMonth = data.reduce((acc, item) => {
  const month = new Date(item.date).toISOString().slice(0, 7); // YYYY-MM
  acc[month] = (acc[month] || 0) + item.value;
  return acc;
}, {});
```

### Percentage Calculation

```typescript
const total = data.reduce((sum, item) => sum + item.value, 0);
const withPercentage = data.map(item => ({
  ...item,
  percentage: ((item.value / total) * 100).toFixed(1),
}));
```

## Color Palettes

### Categorical (Distinct Groups)

```css
:root {
  --chart-1: #0088FE;
  --chart-2: #00C49F;
  --chart-3: #FFBB28;
  --chart-4: #FF8042;
  --chart-5: #8884D8;
}
```

### Sequential (Low to High)

```css
/* Blues - for positive metrics */
--seq-1: #E3F2FD;
--seq-2: #90CAF9;
--seq-3: #42A5F5;
--seq-4: #1E88E5;
--seq-5: #1565C0;
```

### Diverging (Negative to Positive)

```css
/* Red-White-Green for performance */
--div-neg-2: #EF5350;
--div-neg-1: #FFCDD2;
--div-neutral: #FFFFFF;
--div-pos-1: #C8E6C9;
--div-pos-2: #66BB6A;
```

### Accessibility

- Ensure 4.5:1 contrast ratio for text on charts
- Don't rely on color alone—use patterns, labels, or shapes
- Test with colorblind simulation tools
- Provide data tables as alternative

## Common Components

### Chart Container

```tsx
function ChartContainer({ title, subtitle, children, actions }) {
  return (
    <div className="chart-container">
      <div className="chart-header">
        <div>
          <h3>{title}</h3>
          {subtitle && <p className="subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="chart-actions">{actions}</div>}
      </div>
      <div className="chart-body">
        {children}
      </div>
    </div>
  );
}
```

### Loading State

```tsx
function ChartSkeleton() {
  return (
    <div className="chart-skeleton">
      <div className="skeleton-header" />
      <div className="skeleton-body" />
    </div>
  );
}
```

### Empty State

```tsx
function NoData({ message = "No data available" }) {
  return (
    <div className="chart-empty">
      <Icon name="chart-bar" />
      <p>{message}</p>
    </div>
  );
}
```

## Performance Considerations

### Large Datasets

```typescript
// Downsample for display
function downsample(data: Point[], targetPoints: number): Point[] {
  if (data.length <= targetPoints) return data;
  const step = Math.ceil(data.length / targetPoints);
  return data.filter((_, i) => i % step === 0);
}
```

### Lazy Loading

```tsx
// Only render chart when visible
function LazyChart({ children }) {
  const [isVisible, ref] = useIntersectionObserver();
  return (
    <div ref={ref}>
      {isVisible ? children : <ChartSkeleton />}
    </div>
  );
}
```

### Memoization

```tsx
// Prevent unnecessary recalculations
const chartData = useMemo(() =>
  transformData(rawData),
  [rawData]
);
```

## Integration with Design Principles

When building dashboards, also invoke `/design-principles` for:
- Consistent spacing (4px grid)
- Typography hierarchy
- Color usage
- Card and container styling

## Guardrails

### Do
- Label axes clearly
- Include units (%, $, etc.)
- Provide context (comparisons, benchmarks)
- Use consistent colors across dashboard
- Start Y-axis at zero for bar charts

### Don't
- Don't truncate Y-axis to exaggerate differences
- Don't use too many chart types on one dashboard
- Don't animate everything (motion sickness)
- Don't show more than 7 categories in a pie chart
- Don't use chart junk (unnecessary decorations)
