import type { EnvironmentProject } from "@t3tools/client-runtime/state/shell";
import type { ProjectIconColor } from "@t3tools/contracts";
import { BUILT_IN_THEMES } from "@t3tools/shared/themePalettes";
import * as Schema from "effect/Schema";

import { useLocalStorage } from "./hooks/useLocalStorage";
import {
  applyThemeColorPreview,
  createVividThemeColors,
  getCustomThemes,
  getThemeColorsForMode,
  getThemeDefinition,
  type ThemeAppearance,
  type ThemeColors,
} from "./themePalette";

const PROJECT_THEMES_STORAGE_KEY = "t3code:project-themes:v1";
const ProjectThemeChoices = Schema.Record(Schema.String, Schema.String);

/** "project" derives a palette from the project's icon color; "none" keeps the user's theme. */
export type ProjectThemeChoice = "project" | "none" | (string & {});

// Tailwind 600 (accent) and 50/950 (canvas) for each project icon color.
const PROJECT_COLOR_SEEDS: Record<
  Exclude<ProjectIconColor, "gray">,
  { accent: string; light: string; dark: string }
> = {
  red: { accent: "#dc2626", light: "#fef2f2", dark: "#1f0a0a" },
  orange: { accent: "#ea580c", light: "#fff7ed", dark: "#1f0e05" },
  amber: { accent: "#d97706", light: "#fffbeb", dark: "#1c1305" },
  yellow: { accent: "#ca8a04", light: "#fefce8", dark: "#1a1505" },
  lime: { accent: "#65a30d", light: "#f7fee7", dark: "#111a05" },
  green: { accent: "#16a34a", light: "#f0fdf4", dark: "#06180d" },
  emerald: { accent: "#059669", light: "#ecfdf5", dark: "#04180f" },
  teal: { accent: "#0d9488", light: "#f0fdfa", dark: "#041817" },
  cyan: { accent: "#0891b2", light: "#ecfeff", dark: "#04161c" },
  sky: { accent: "#0284c7", light: "#f0f9ff", dark: "#05131f" },
  blue: { accent: "#2563eb", light: "#eff6ff", dark: "#070f24" },
  indigo: { accent: "#4f46e5", light: "#eef2ff", dark: "#0c0b26" },
  violet: { accent: "#7c3aed", light: "#f5f3ff", dark: "#140a26" },
  purple: { accent: "#9333ea", light: "#faf5ff", dark: "#170a24" },
  fuchsia: { accent: "#c026d3", light: "#fdf4ff", dark: "#1d0820" },
  pink: { accent: "#db2777", light: "#fdf2f8", dark: "#1f0814" },
  rose: { accent: "#e11d48", light: "#fff1f2", dark: "#1f0710" },
};

type ProjectThemeSource = Pick<EnvironmentProject, "projectIcon"> & { readonly projectKey: string };

function projectIconColor(project: ProjectThemeSource): ProjectIconColor | null {
  const icon = project.projectIcon;
  return icon && "color" in icon ? icon.color : null;
}

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

export function canUseProjectColors(project: ProjectThemeSource): boolean {
  const color = projectIconColor(project);
  return color !== null && color !== "gray";
}

/** A colored project icon themes its project by default. */
export function resolveProjectThemeChoice(
  project: ProjectThemeSource,
  choices: Readonly<Record<string, ProjectThemeChoice>>,
): ProjectThemeChoice {
  const choice = choices[project.projectKey];
  if (choice === "project" && !canUseProjectColors(project)) return "none";
  return choice ?? (canUseProjectColors(project) ? "project" : "none");
}

export function projectThemeOptions(): ReadonlyArray<{ id: string; label: string }> {
  return [...BUILT_IN_THEMES, ...getCustomThemes()].map((theme) => ({
    id: theme.id,
    label: theme.label,
  }));
}

export function resolveProjectThemeColors(
  project: ProjectThemeSource,
  choice: ProjectThemeChoice,
  appearance: ThemeAppearance,
): { colors: ThemeColors; appearance: ThemeAppearance } | null {
  if (choice === "none") return null;
  if (choice === "project") {
    const color = projectIconColor(project);
    if (color === null || color === "gray") return null;
    const seed = PROJECT_COLOR_SEEDS[color];
    return {
      colors: createVividThemeColors(appearance, seed[appearance], seed.accent),
      appearance,
    };
  }
  const theme = getThemeDefinition(choice);
  if (!theme) return null;
  const colors = getThemeColorsForMode(theme, appearance);
  return colors ? { colors, appearance } : { colors: theme.colors, appearance: theme.appearance };
}

export function applyProjectTheme(theme: {
  colors: ThemeColors;
  appearance: ThemeAppearance;
}): void {
  applyThemeColorPreview(theme.colors, theme.appearance);
}
