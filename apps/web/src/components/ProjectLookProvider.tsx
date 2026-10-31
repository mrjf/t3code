import { pickableProjectGroups } from "@t3tools/client-runtime/state/project-grouping";
import type { EnvironmentId } from "@t3tools/contracts";
import { useLocation } from "@tanstack/react-router";
import { createContext, useContext, useEffect, type ReactNode } from "react";

import { useSidebarProjectGroups } from "../hooks/useSidebarProjectGroups";
import { useT3ProjectFileState } from "../hooks/useT3ProjectFileScripts";
import { useTheme } from "../hooks/useTheme";
import {
  applyProjectLook,
  resolveProjectLook,
  resolveProjectThemeChoice,
  showsProjectWallpaper,
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

function useProjectSvg(environmentId: EnvironmentId, cwd: string, path: string | null) {
  const query = useProjectFileQuery(environmentId, cwd, path, path !== null);
  const contents = query.data && !query.data.truncated ? query.data.contents : null;
  return svgDataUrl(contents);
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
  const { theme: userTheme, resolvedTheme: appearance } = useTheme();
  // The theme editor previews on the same root variables, so a project look would hide its edits.
  const onSettings = useLocation({
    select: (location) => location.pathname.startsWith("/settings"),
  });
  const choice = project
    ? resolveProjectThemeChoice(project.projectKey, projectAppearance !== null, choices)
    : "none";
  const look = onSettings ? null : resolveProjectLook({ choice, projectAppearance, appearance });
  const lookKey = look ? JSON.stringify([look, userTheme]) : null;

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- paints the project's look onto the document root and restores the user's theme after
  useEffect(() => {
    if (lookKey === null) return;
    const [nextLook] = JSON.parse(lookKey) as [NonNullable<typeof look>, string];
    return applyProjectLook(nextLook);
  }, [lookKey]);

  const usesProjectArtwork = project !== null && choice === "project";
  const wallpaperShown =
    usesProjectArtwork && showsProjectWallpaper(projectAppearance?.wallpaperTone, appearance);
  const wallpaper = useProjectSvg(
    environmentId,
    cwd,
    wallpaperShown ? (projectAppearance?.wallpaper ?? null) : null,
  );
  const mascot = useProjectSvg(
    environmentId,
    cwd,
    usesProjectArtwork ? (projectAppearance?.mascot ?? null) : null,
  );

  const value: ActiveProjectLook = project
    ? {
        projectKey: project.projectKey,
        hasProjectLook: projectAppearance !== null,
        wallpaper,
        wallpaperDark: projectAppearance?.wallpaperTone === "dark",
        mascot,
      }
    : NO_PROJECT_LOOK;
  return <ProjectLookContext value={value}>{children}</ProjectLookContext>;
}
