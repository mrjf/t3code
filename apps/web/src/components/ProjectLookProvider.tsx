import { pickableProjectGroups } from "@t3tools/client-runtime/state/project-grouping";
import type { EnvironmentId } from "@t3tools/contracts";
import { useLocation } from "@tanstack/react-router";
import { createContext, useContext, useEffect, type ReactNode } from "react";

import { useSidebarProjectGroups } from "../hooks/useSidebarProjectGroups";
import { useT3ProjectFileState } from "../hooks/useT3ProjectFileScripts";
import { setProjectFonts, type ProjectFonts } from "../appearanceFonts";
import { setProjectTheme, useTheme } from "../hooks/useTheme";
import {
  applyProjectTint,
  parseProjectThemeFile,
  resolveProjectLayers,
  resolveProjectThemeChoice,
  resolveProjectWallpaper,
  useProjectThemeChoices,
} from "../projectTheme";
import { useUiStateStore } from "../uiStateStore";
import { useProjectFileQuery } from "./files/projectFilesQueryState";

export interface ActiveProjectLook {
  readonly projectKey: string | null;
  readonly hasProjectLook: boolean;
  readonly wallpaper: string | null;
  readonly wallpaperDark: boolean;
  readonly mascot: string | null;
}

const NO_PROJECT_LOOK: ActiveProjectLook = {
  projectKey: null,
  hasProjectLook: false,
  wallpaper: null,
  wallpaperDark: false,
  mascot: null,
};

// Never queried: every read below is disabled while no project is scoped.
const NO_ENVIRONMENT = "" as EnvironmentId;

const ProjectLookContext = createContext<ActiveProjectLook>(NO_PROJECT_LOOK);

export function useActiveProjectLook(): ActiveProjectLook {
  return useContext(ProjectLookContext);
}

// <img> never runs an SVG's scripts or loads its external resources.
function svgDataUrl(contents: string | null): string | null {
  return contents?.trimStart().startsWith("<svg")
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(contents)}`
    : null;
}

function useProjectFileText(environmentId: EnvironmentId, cwd: string, path: string | null) {
  const query = useProjectFileQuery(environmentId, cwd, path, path !== null);
  return query.data && !query.data.truncated ? query.data.contents : null;
}

/** Applies the scoped project's look app-wide; lives above the sidebar so the mobile sheet can close. */
export function ProjectLookProvider({ children }: { children: ReactNode }) {
  const scopeKeys = useUiStateStore((store) => store.sidebarProjectScopeKeys);
  const groups = pickableProjectGroups(useSidebarProjectGroups());
  const project =
    scopeKeys.length === 1
      ? (groups.find((group) => group.projectKey === scopeKeys[0]) ?? null)
      : null;
  const environmentId = project?.environmentId ?? NO_ENVIRONMENT;
  const cwd = project?.workspaceRoot ?? "";
  const projectFile = useT3ProjectFileState(environmentId, project?.workspaceRoot ?? null);
  const projectAppearance = projectFile.file?.appearance ?? null;
  const [choices] = useProjectThemeChoices();
  const { resolvedTheme: appearance } = useTheme();
  // Settings shows the user's own theme and fonts, which the theme editor and font pickers edit.
  const onSettings = useLocation({
    select: (location) => location.pathname.startsWith("/settings"),
  });
  const choice =
    project && !onSettings
      ? resolveProjectThemeChoice(project.projectKey, projectAppearance !== null, choices)
      : "none";
  const usesProjectLook = choice === "project";

  const themeFileText = useProjectFileText(
    environmentId,
    cwd,
    usesProjectLook ? (projectAppearance?.theme ?? null) : null,
  );
  const projectTheme = parseProjectThemeFile(themeFileText);
  const layers = resolveProjectLayers({ choice, projectAppearance, projectTheme, appearance });

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- hands the project's theme to the theme system, which paints the document root
  useEffect(() => {
    if (!layers.theme) return;
    setProjectTheme(layers.theme);
    return () => setProjectTheme(null);
  }, [layers.theme]);

  const fontsKey = layers.fonts ? JSON.stringify(layers.fonts) : null;
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- hands the project's fonts to the appearance settings, which set the root font variables
  useEffect(() => {
    if (fontsKey === null) return;
    setProjectFonts(JSON.parse(fontsKey) as ProjectFonts);
    return () => setProjectFonts(null);
  }, [fontsKey]);

  const tintKey = layers.tint ? JSON.stringify(layers.tint) : null;
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- sets the project's tint on the document root and removes it after
  useEffect(() => {
    if (tintKey === null) return;
    return applyProjectTint(JSON.parse(tintKey) as Record<string, string>);
  }, [tintKey]);

  const wallpaperChoice = usesProjectLook
    ? resolveProjectWallpaper(projectAppearance, appearance)
    : null;
  const wallpaperText = useProjectFileText(environmentId, cwd, wallpaperChoice?.path ?? null);
  const mascotText = useProjectFileText(
    environmentId,
    cwd,
    usesProjectLook ? (projectAppearance?.mascot ?? null) : null,
  );
  const wallpaper = svgDataUrl(wallpaperText);
  const mascot = svgDataUrl(mascotText);

  const value: ActiveProjectLook = project
    ? {
        projectKey: project.projectKey,
        hasProjectLook: projectAppearance !== null,
        wallpaper,
        wallpaperDark: wallpaperChoice?.dark ?? false,
        mascot,
      }
    : NO_PROJECT_LOOK;
  return <ProjectLookContext value={value}>{children}</ProjectLookContext>;
}
