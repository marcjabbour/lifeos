export type TagCategory =
  | "food"
  | "tech"
  | "music"
  | "entertainment"
  | "fitness"
  | "travel"
  | "work"
  | "learning"
  | "finance"
  | "social"
  | "uncategorized";

export const CATEGORY_GLOW_MAP: Record<TagCategory, string> = {
  food: "shadow-glow-food",
  tech: "shadow-glow-tech",
  music: "shadow-glow-music",
  entertainment: "shadow-glow-entertainment",
  fitness: "shadow-glow-fitness",
  travel: "shadow-glow-travel",
  work: "shadow-glow-work",
  learning: "shadow-glow-learning",
  finance: "shadow-glow-finance",
  social: "shadow-glow-social",
  uncategorized: "shadow-glow-default",
};

export const CATEGORY_BORDER_MAP: Record<TagCategory, string> = {
  food: "border-glow-food",
  tech: "border-glow-tech",
  music: "border-glow-music",
  entertainment: "border-glow-entertainment",
  fitness: "border-glow-fitness",
  travel: "border-glow-travel",
  work: "border-glow-work",
  learning: "border-glow-learning",
  finance: "border-glow-finance",
  social: "border-glow-social",
  uncategorized: "border-glow-default",
};

export const CATEGORY_DOT_MAP: Record<TagCategory, string> = {
  food: "neon-dot-food",
  tech: "neon-dot-tech",
  music: "neon-dot-music",
  entertainment: "neon-dot-entertainment",
  fitness: "neon-dot-fitness",
  travel: "neon-dot-travel",
  work: "neon-dot-work",
  learning: "neon-dot-learning",
  finance: "neon-dot-finance",
  social: "neon-dot-social",
  uncategorized: "neon-dot-default",
};

export function getGlowClassForCategory(category: TagCategory): string {
  return CATEGORY_GLOW_MAP[category] || CATEGORY_GLOW_MAP.uncategorized;
}

export function getBorderClassForCategory(category: TagCategory): string {
  return CATEGORY_BORDER_MAP[category] || CATEGORY_BORDER_MAP.uncategorized;
}

export function getDotClassForCategory(category: TagCategory): string {
  return CATEGORY_DOT_MAP[category] || CATEGORY_DOT_MAP.uncategorized;
}
