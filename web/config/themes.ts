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
  "mist",
  "desert",
  "icecream",
  "light-forest",
  "win98",
  "retro64",
] as const;

export type ThemeName = (typeof THEMES)[number];
