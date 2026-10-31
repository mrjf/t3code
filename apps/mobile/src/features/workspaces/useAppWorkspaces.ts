import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { supportsSharedSettingsSync } from "@t3tools/client-runtime/state/shared-settings";
import {
  filterProjectsToWorkspace,
  liveWorkspaces,
  mergeWorkspaceCopies,
  removeWorkspace,
  upsertWorkspace,
} from "@t3tools/client-runtime/state/workspaces";
import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";
import {
  AuthSettingsWriteScope,
  type Workspace,
  type WorkspaceWriteInput,
} from "@t3tools/contracts";
import { AsyncResult } from "effect/reactivity";

import type { EnvironmentProject } from "@t3tools/client-runtime/state/models";
import { useServerConfigs } from "../../state/entities";
import { useEnvironments } from "../../state/environments";
import { mobilePreferencesAtom, updateMobilePreferencesAtom } from "../../state/preferences";
import { serverEnvironment } from "../../state/server";
import { useEnvironmentsWithScope } from "../../state/session";
import { useAtomCommand } from "../../state/use-atom-command";

const NO_WORKSPACES: readonly Workspace[] = [];

export interface WorkspaceSaveOutcome {
  /** At least one environment took the write. */
  readonly saved: boolean;
  readonly failures: readonly string[];
}

/** Every connected environment's copy, merged by id with the newest copy winning, tombstones kept. */
function useMergedWorkspaceCopies(): readonly Workspace[] {
  const configs = useServerConfigs();
  return mergeWorkspaceCopies([...configs.values()].map((config) => config.settings.workspaces));
}

/** The workspaces (named sets of projects) every connected environment agrees on. */
export function useAppWorkspaces(): readonly Workspace[] {
  const live = liveWorkspaces(useMergedWorkspaceCopies());
  return live.length === 0 ? NO_WORKSPACES : live;
}

/** The workspace this device is switched to, or null for every project. */
export function useActiveAppWorkspace(): Workspace | null {
  const workspaces = useAppWorkspaces();
  const preferences = useAtomValue(mobilePreferencesAtom);
  const activeId = AsyncResult.isSuccess(preferences)
    ? (preferences.value.activeWorkspaceId ?? null)
    : null;
  return activeId === null ? null : (workspaces.find((w) => w.id === activeId) ?? null);
}

export function useSetActiveAppWorkspace() {
  const save = useAtomSet(updateMobilePreferencesAtom);
  return (workspace: Workspace | null) => save({ activeWorkspaceId: workspace?.id ?? null });
}

/** The projects the active workspace lists, or every project outside a workspace. */
export function useWorkspaceProjects<TProject extends EnvironmentProject>(
  projects: readonly TProject[],
): readonly TProject[] {
  const workspace = useActiveAppWorkspace();
  return filterProjectsToWorkspace(projects, workspace);
}

/**
 * Writes the whole list to every connected environment this session may change settings on,
 * which is how the same record ends up under the same id everywhere.
 */
export function useSaveAppWorkspaces() {
  const merged = useMergedWorkspaceCopies();
  const { environments } = useEnvironments();
  const targets = environments.filter(supportsSharedSettingsSync);
  const writable = useEnvironmentsWithScope(targets, AuthSettingsWriteScope);
  const updateSettings = useAtomCommand(serverEnvironment.updateSettings, {
    label: "workspaces update",
    reportFailure: true,
  });
  // No Dialog here: the appearance provider reads this module, and the Android Dialog reads
  // the provider's theme, which would close an import cycle. Callers show the failure.
  const save = async (next: readonly Workspace[]): Promise<WorkspaceSaveOutcome> => {
    const writes = targets.filter((environment) => writable.has(environment.environmentId));
    if (writes.length === 0) {
      return {
        saved: false,
        failures: ["Connect an environment this device may change settings on, then try again."],
      };
    }
    const outcomes = await Promise.all(
      writes.map(async (environment) => {
        const result = await updateSettings({
          environmentId: environment.environmentId,
          input: { patch: { workspaces: next } },
        });
        if (result._tag !== "Failure" || isAtomCommandInterrupted(result)) return null;
        const error = squashAtomCommandFailure(result);
        return `${environment.label}: ${error instanceof Error ? error.message : String(error)}`;
      }),
    );
    const failures = outcomes.filter((outcome) => outcome !== null);
    return { saved: failures.length < writes.length, failures };
  };
  return {
    upsert: (input: WorkspaceWriteInput) =>
      save(upsertWorkspace(merged, input, new Date().toISOString())),
    remove: (id: Workspace["id"]) => save(removeWorkspace(merged, id, new Date().toISOString())),
  };
}
