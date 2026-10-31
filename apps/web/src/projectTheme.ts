import type { T3ProjectFileAppearance } from "@t3tools/contracts";
import { BUILT_IN_THEMES } from "@t3tools/shared/themePalettes";
import * as Schema from "effect/Schema";

import { appearanceFontStack } from "./appearanceFonts";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { refreshTheme } from "./hooks/useTheme";
import {
  applyThemeColorPreview,
  getCustomThemes,
  getThemeColorsForMode,
  getThemeDefinition,
  type ThemeAppearance,
  type ThemeColors,
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

function readableOn(hex: string): string {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((index) =>
    Number.parseInt(hex.slice(index, index + 2), 16),
  );
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#111111" : "#ffffff";
}

// index.css sets body text from this, falling back to the user's --font-sans.
const PROJECT_FONT_VARIABLE = "--project-font-sans";

export type ProjectLook =
  | { readonly kind: "palette"; readonly colors: ThemeColors; readonly appearance: ThemeAppearance }
  | { readonly kind: "tint"; readonly variables: Readonly<Record<string, string>> };

/** A chosen theme replaces the palette; the project's own look tints the user's theme. */
export function resolveProjectLook(input: {
  choice: ProjectThemeChoice;
  projectAppearance: T3ProjectFileAppearance | null;
  appearance: ThemeAppearance;
}): ProjectLook | null {
  const { choice, projectAppearance, appearance } = input;
  if (choice === "none") return null;
  if (choice !== "project") {
    const theme = getThemeDefinition(choice);
    if (!theme) return null;
    const colors = getThemeColorsForMode(theme, appearance);
    return colors
      ? { kind: "palette", colors, appearance }
      : { kind: "palette", colors: theme.colors, appearance: theme.appearance };
  }
  if (!projectAppearance) return null;
  const variables: Record<string, string> = {};
  const brand = projectAppearance[appearance];
  if (brand) {
    for (const name of [
      "--background",
      "--app-chrome-background",
      "--toolbar-background",
      "--sidebar",
    ]) {
      variables[name] = brand.background;
    }
    variables["--primary"] = brand.accent;
    variables["--primary-foreground"] = readableOn(brand.accent);
    variables["--ring"] = brand.accent;
  }
  if (projectAppearance.font) {
    variables[PROJECT_FONT_VARIABLE] = appearanceFontStack(
      projectAppearance.font,
      "var(--font-sans)",
    );
  }
  return Object.keys(variables).length > 0 ? { kind: "tint", variables } : null;
}

/** Paints the look onto the document root and returns how to undo it. */
export function applyProjectLook(look: ProjectLook): () => void {
  if (look.kind === "palette") {
    applyThemeColorPreview(look.colors, look.appearance);
    return () => refreshTheme();
  }
  // Inline styles outrank the stylesheet's theme selectors without touching the user's theme.
  const style = document.documentElement.style;
  for (const [name, value] of Object.entries(look.variables)) style.setProperty(name, value);
  return () => {
    for (const name of Object.keys(look.variables)) style.removeProperty(name);
  };
}

/** A light wallpaper would leave light-on-light text in dark appearance, so it only shows in light. */
export function showsProjectWallpaper(
  tone: T3ProjectFileAppearance["wallpaperTone"],
  appearance: ThemeAppearance,
): boolean {
  return tone === "dark" || appearance === "light";
}
