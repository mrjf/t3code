import type { T3ProjectFileAppearance } from "@t3tools/contracts";
import { BUILT_IN_THEMES } from "@t3tools/shared/themePalettes";
import * as Schema from "effect/Schema";

import type { ProjectFonts } from "./appearanceFonts";
import { useLocalStorage } from "./hooks/useLocalStorage";
import {
  getCustomThemes,
  getThemeDefinition,
  parseThemeFile,
  type ThemeAppearance,
  type ThemeDefinition,
} from "./themePalette";

const PROJECT_THEMES_STORAGE_KEY = "t3code:project-themes:v1";
const ProjectThemeChoices = Schema.Record(Schema.String, Schema.String);

/** "project" uses the look the repository declares in t3.json; "none" keeps the user's theme. */
export type ProjectThemeChoice = "project" | "none" | (string & {});

const NO_PROJECT_THEME_CHOICES: Readonly<Record<string, ProjectThemeChoice>> = {};

export function useProjectThemeChoices() {
  const [choices, setChoices] = useLocalStorage(
    PROJECT_THEMES_STORAGE_KEY,
    NO_PROJECT_THEME_CHOICES,
    ProjectThemeChoices,
  );
  const setChoice = (projectKey: string, choice: ProjectThemeChoice) =>
    setChoices((current) => ({ ...current, [projectKey]: choice }));
  return [choices, setChoice] as const;
}

export function resolveProjectThemeChoice(
  projectKey: string,
  hasProjectLook: boolean,
  choices: Readonly<Record<string, ProjectThemeChoice>>,
): ProjectThemeChoice {
  const choice = choices[projectKey];
  if (choice === "project" && !hasProjectLook) return "none";
  return choice ?? (hasProjectLook ? "project" : "none");
}

export function projectThemeOptions(): ReadonlyArray<{ id: string; label: string }> {
  return [...BUILT_IN_THEMES, ...getCustomThemes()].map((theme) => ({
    id: theme.id,
    label: theme.label,
  }));
}

/** A theme file the repository ships, in the format Settings → Appearance exports. */
export function parseProjectThemeFile(contents: string | null): ThemeDefinition | null {
  if (contents === null) return null;
  try {
    return parseThemeFile(JSON.parse(contents));
  } catch {
    return null;
  }
}

export interface ProjectLayers {
  /** Painted in place of the user's theme. */
  readonly theme: ThemeDefinition | null;
  /** Without a theme file: background and accent over the user's own theme. */
  readonly tint: Readonly<Record<string, string>> | null;
  readonly fonts: ProjectFonts | null;
}

const NO_PROJECT_LAYERS: ProjectLayers = { theme: null, tint: null, fonts: null };

function readableOn(hex: string): string {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((index) =>
    Number.parseInt(hex.slice(index, index + 2), 16),
  );
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#111111" : "#ffffff";
}

/** What the choice paints: a chosen theme alone, or the project's theme or tint plus its fonts. */
export function resolveProjectLayers(input: {
  choice: ProjectThemeChoice;
  projectAppearance: T3ProjectFileAppearance | null;
  projectTheme: ThemeDefinition | null;
  appearance: ThemeAppearance;
}): ProjectLayers {
  const { choice, projectAppearance, projectTheme, appearance } = input;
  if (choice === "none") return NO_PROJECT_LAYERS;
  if (choice !== "project") {
    return { ...NO_PROJECT_LAYERS, theme: getThemeDefinition(choice) };
  }
  if (!projectAppearance) return NO_PROJECT_LAYERS;
  const brand = projectAppearance[appearance];
  const tint =
    projectTheme === null && brand
      ? {
          "--background": brand.background,
          "--app-chrome-background": brand.background,
          "--toolbar-background": brand.background,
          "--sidebar": brand.background,
          "--primary": brand.accent,
          "--primary-foreground": readableOn(brand.accent),
          "--ring": brand.accent,
        }
      : null;
  return { theme: projectTheme, tint, fonts: projectAppearance.fonts ?? null };
}

/** Sets the tint inline, where it outranks the stylesheet's theme selectors, and returns its undo. */
export function applyProjectTint(tint: Readonly<Record<string, string>>): () => void {
  const style = document.documentElement.style;
  for (const [name, value] of Object.entries(tint)) style.setProperty(name, value);
  return () => {
    for (const name of Object.keys(tint)) style.removeProperty(name);
  };
}

/**
 * The wallpaper for this appearance. A single wallpaper declares its tone, and a light one would
 * leave light-on-light text in dark appearance, so it only shows in light.
 */
export function resolveProjectWallpaper(
  projectAppearance: T3ProjectFileAppearance | null,
  appearance: ThemeAppearance,
): { readonly path: string; readonly dark: boolean } | null {
  const wallpaper = projectAppearance?.wallpaper;
  if (wallpaper === undefined) return null;
  if (typeof wallpaper !== "string") {
    const path = wallpaper[appearance];
    return path ? { path, dark: appearance === "dark" } : null;
  }
  const dark = projectAppearance?.wallpaperTone === "dark";
  return dark || appearance === "light" ? { path: wallpaper, dark } : null;
}
