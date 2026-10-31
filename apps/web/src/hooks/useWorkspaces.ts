import { pickableProjectGroups } from "@t3tools/client-runtime/state/project-grouping";
import type { Workspace, WorkspaceWriteInput } from "@t3tools/contracts";

import type { SidebarProjectSnapshot } from "~/sidebarProjectGrouping";
import { useServerConfigs } from "~/state/entities";
import { useUiStateStore } from "~/uiStateStore";
import { mergeWorkspaces, workspaceProjectGroups } from "~/workspaces";
import { useUpdatePrimarySettings } from "./useSettings";
import { useSidebarProjectGroups } from "./useSidebarProjectGroups";

const NO_WORKSPACES: readonly Workspace[] = [];

/** Every connected environment's copy, merged by id with the newest copy winning. */
export function useWorkspaces(): readonly Workspace[] {
  const configs = useServerConfigs();
  const copies = [...configs.values()].map((config) => config.settings.workspaces);
  const merged = mergeWorkspaces(copies);
  return merged.length === 0 ? NO_WORKSPACES : merged;
}

/** The workspace this device is switched to, or null for every project. */
export function useActiveWorkspace(): Workspace | null {
  const workspaces = useWorkspaces();
  const activeId = useUiStateStore((store) => store.activeWorkspaceId);
  return activeId === null ? null : (workspaces.find((w) => w.id === activeId) ?? null);
}

export function useWorkspaceProjectGroups(): {
  readonly workspace: Workspace | null;
  readonly projects: readonly SidebarProjectSnapshot[];
  /** The name of the "every project" entry inside this workspace. */
  readonly label: string;
} {
  const workspace = useActiveWorkspace();
  const groups = pickableProjectGroups(useSidebarProjectGroups());
  return {
    workspace,
    projects: workspace ? workspaceProjectGroups(workspace, groups) : groups,
    label: workspace ? `All in ${workspace.name}` : "All projects",
  };
}

/** The one project the app is scoped to inside the current workspace, if any. */
export function useScopedProjectGroup(): {
  readonly group: SidebarProjectSnapshot | null;
  readonly projects: readonly SidebarProjectSnapshot[];
  readonly label: string;
} {
  const { projects, label } = useWorkspaceProjectGroups();
  const scopeKeys = useUiStateStore((store) => store.sidebarProjectScopeKeys);
  const group =
    scopeKeys.length === 1 ? (projects.find((p) => p.projectKey === scopeKeys[0]) ?? null) : null;
  return { group, projects, label };
}

/**
 * Writes the whole list to every connected environment that accepts shared settings,
 * which is how the same record ends up under the same id everywhere.
 */
export function useSaveWorkspaces() {
  const workspaces = useWorkspaces();
  const updateSettings = useUpdatePrimarySettings();
  const now = () => new Date().toISOString();
  const save = (next: readonly Workspace[]) => updateSettings({ workspaces: next });
  return {
    upsert: (input: WorkspaceWriteInput) => {
      const existing = workspaces.find((w) => w.id === input.id);
      const record: Workspace = {
        ...input,
        createdAt: existing?.createdAt ?? now(),
        updatedAt: now(),
        deletedAt: null,
      };
      return save(
        existing
          ? workspaces.map((w) => (w.id === input.id ? record : w))
          : [...workspaces, record],
      );
    },
    remove: (id: Workspace["id"]) => {
      const removed = workspaces.map((w) =>
        w.id === id ? { ...w, updatedAt: now(), deletedAt: now() } : w,
      );
      return save(removed);
    },
  };
}
