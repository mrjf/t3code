import { useAtomValue } from "@effect/atom-react";
import { useSyncExternalStore } from "react";
import type { ProjectReadFileResult, ScopedProjectRef } from "@t3tools/contracts";
import { BUILT_IN_THEMES } from "@t3tools/shared/themePalettes";
import * as Option from "effect/Option";
import { AsyncResult, Atom } from "effect/reactivity";
import * as Schema from "effect/Schema";

import { useLocalStorage } from "./hooks/useLocalStorage";
import { refreshTheme } from "./hooks/useTheme";
import { projectEnvironment } from "./state/projects";
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

const HexColor = Schema.String.check(Schema.isPattern(/^#[0-9a-fA-F]{6}$/));
const AppearanceColors = Schema.Struct({ background: HexColor, accent: HexColor });
const ProjectAppearance = Schema.Struct({
  font: Schema.optional(Schema.String),
  wallpaper: Schema.optional(Schema.String),
  wallpaperTone: Schema.optional(Schema.Literals(["light", "dark"])),
  mascot: Schema.optional(Schema.String),
  light: Schema.optional(AppearanceColors),
  dark: Schema.optional(AppearanceColors),
});
type ProjectAppearance = typeof ProjectAppearance.Type;
const decodeProjectFile = Schema.decodeUnknownOption(
  Schema.fromJsonString(Schema.Struct({ appearance: Schema.optional(ProjectAppearance) })),
);

const NO_PROJECT_FILE = Atom.make(AsyncResult.initial<ProjectReadFileResult, never>(false));

/** The `appearance` block of the project's t3.json, if it has one. */
export function useProjectAppearance(
  project: (ScopedProjectRef & { readonly workspaceRoot: string }) | null,
): ProjectAppearance | null {
  const contents = useProjectFile(project, "t3.json");
  return contents === null
    ? null
    : (Option.getOrUndefined(decodeProjectFile(contents))?.appearance ?? null);
}

function useProjectFile(
  project: (ScopedProjectRef & { readonly workspaceRoot: string }) | null,
  relativePath: string | null,
): string | null {
  const result = useAtomValue(
    project && relativePath
      ? projectEnvironment.readFile({
          environmentId: project.environmentId,
          input: { cwd: project.workspaceRoot, relativePath, allowMissing: true },
        })
      : NO_PROJECT_FILE,
  );
  const file = Option.getOrUndefined(AsyncResult.value(result));
  return file && file.exists !== false && !file.truncated ? file.contents : null;
}

// Artwork is SVG so it reads as text; an <img> never runs its scripts.
function svgDataUrl(contents: string | null): string | null {
  return contents?.trimStart().startsWith("<svg")
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(contents)}`
    : null;
}

export interface ProjectArtwork {
  readonly wallpaper: string | null;
  readonly wallpaperTone: "light" | "dark";
  readonly mascot: string | null;
}

export function useProjectArtwork(
  project: (ScopedProjectRef & { readonly workspaceRoot: string }) | null,
  appearance: ProjectAppearance | null,
): ProjectArtwork | null {
  const wallpaper = svgDataUrl(useProjectFile(project, appearance?.wallpaper ?? null));
  const mascot = svgDataUrl(useProjectFile(project, appearance?.mascot ?? null));
  if (!wallpaper && !mascot) return null;
  return { wallpaper, wallpaperTone: appearance?.wallpaperTone ?? "light", mascot };
}

let activeArtwork: ProjectArtwork | null = null;
const artworkListeners = new Set<() => void>();

export function setActiveProjectArtwork(artwork: ProjectArtwork | null): void {
  activeArtwork = artwork;
  for (const listener of artworkListeners) listener();
}

/** The artwork of the project the app is switched to, for the sidebar header and the canvas. */
export function useActiveProjectArtwork(): ProjectArtwork | null {
  return useSyncExternalStore(
    (listener) => {
      artworkListeners.add(listener);
      return () => artworkListeners.delete(listener);
    },
    () => activeArtwork,
    () => null,
  );
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

export type ProjectLook =
  | { readonly kind: "palette"; readonly colors: ThemeColors; readonly appearance: ThemeAppearance }
  | { readonly kind: "tint"; readonly variables: Readonly<Record<string, string>> };

/** A chosen theme replaces the palette; the project's own look tints the user's theme. */
export function resolveProjectLook(input: {
  choice: ProjectThemeChoice;
  projectAppearance: ProjectAppearance | null;
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
  const brand = projectAppearance[appearance];
  const variables: Record<string, string> = {};
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
  if (projectAppearance.font) variables["--font-sans"] = projectAppearance.font;
  return { kind: "tint", variables };
}

/** Paints the look onto the document root and returns how to undo it. */
export function applyProjectLook(look: ProjectLook): () => void {
  if (look.kind === "palette") {
    applyThemeColorPreview(look.colors, look.appearance);
    return () => refreshTheme();
  }
  // Inline styles outrank the stylesheet's theme selectors without touching the user's theme.
  const style = document.documentElement.style;
  const previous = Object.keys(look.variables).map(
    (name) => [name, style.getPropertyValue(name)] as const,
  );
  for (const [name, value] of Object.entries(look.variables)) style.setProperty(name, value);
  return () => {
    for (const [name, value] of previous) {
      if (value) style.setProperty(name, value);
      else style.removeProperty(name);
    }
  };
}
