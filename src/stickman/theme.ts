import type { AccentName } from "./schema";

export type ThemeName = "light" | "dark";

export interface Theme {
  bg: string;
  ink: string;
  faint: string;
  accents: Record<AccentName, string>;
}

const accents: Record<AccentName, string> = {
  red: "#EB2D2D",
  blue: "#1E82FA",
  gold: "#F5B419",
  green: "#1FB36B",
};

export const THEMES: Record<ThemeName, Theme> = {
  light: { bg: "#FFFFFF", ink: "#141414", faint: "#E3E3E3", accents },
  dark: { bg: "#0B0B0B", ink: "#FFFFFF", faint: "#2A2A2A", accents },
};

export const WORLD = { width: 1920, height: 1080, ground: 880 } as const;

/** 9:16 canvas for Shorts / Reels (set "orientation": "vertical" in video.json). */
export const WORLD_VERTICAL = { width: 1080, height: 1920, ground: 1380 } as const;
export type World = { readonly width: number; readonly height: number; readonly ground: number };
