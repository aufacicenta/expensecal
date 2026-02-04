// Available themes - single source of truth
export const THEMES = [
  "light",
  "dark",
  "purple",
  "ocean",
  "forest",
  "sunset",
  "lavender",
] as const;

export type ThemeName = (typeof THEMES)[number];
