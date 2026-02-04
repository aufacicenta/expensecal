// Available themes - single source of truth
export const THEMES = [
  "light",
  "dark",
  "purple",
  "ocean",
  "forest",
  "sunset",
  "lavender",
  "cyberpunk",
  "mocha",
  "nord",
  "rose",
] as const;

export type ThemeName = (typeof THEMES)[number];
