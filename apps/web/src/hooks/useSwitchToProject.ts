import { scopeProjectRef, scopeThreadRef } from "@t3tools/client-runtime/environment";
import type { ScopedProjectRef } from "@t3tools/contracts";
import { useRouter } from "@tanstack/react-router";

import { filterSidebarV2VisibleThreads } from "~/components/Sidebar.logic";
import { useSidebar } from "~/components/ui/sidebar";
import { appAtomRegistry } from "~/rpc/atomRegistry";
import { environmentThreadShells } from "~/state/threads";
import { useThreadSelectionStore } from "~/threadSelectionStore";
import { buildThreadRouteParams } from "~/threadRoutes";
import { useUiStateStore } from "~/uiStateStore";
import { useHandleNewThread } from "./useHandleNewThread";
import { useStableCallback } from "./useStableCallback";

interface SwitchableProject {
  readonly projectKey: string;
  readonly environmentId: ScopedProjectRef["environmentId"];
  readonly id: ScopedProjectRef["projectId"];
  readonly memberProjectRefs: ReadonlyArray<ScopedProjectRef>;
}

/** Every scope change clears the selection: it can hold threads the next scope hides. */
export function setProjectScope(projectKeys: readonly string[]): void {
  useThreadSelectionStore.getState().clearSelection();
  useUiStateStore.getState().setSidebarProjectScopeKeys([...projectKeys]);
}

/** Scopes the app to a project and opens its latest thread, or a new one. `null` shows all projects. */
export function useSwitchToProject() {
  const router = useRouter();
  const { handleNewThread } = useHandleNewThread();
  const { isMobile, setOpenMobile } = useSidebar();

  return useStableCallback((project: SwitchableProject | null) => {
    setProjectScope(project ? [project.projectKey] : []);
    if (project === null) return;
    if (isMobile) setOpenMobile(false);
    // Read at click time so callers don't re-render on every thread change.
    const visible = filterSidebarV2VisibleThreads(
      appAtomRegistry.get(environmentThreadShells.quietThreadShellsAtom),
      new Set(project.memberProjectRefs.map((ref) => `${ref.environmentId}:${ref.projectId}`)),
      appAtomRegistry.get(environmentThreadShells.delegatedUnderParentAtom),
    );
    const latest = visible.reduce<(typeof visible)[number] | null>(
      (best, thread) => (best === null || thread.updatedAt > best.updatedAt ? thread : best),
      null,
    );
    if (latest) {
      void router.navigate({
        to: "/$environmentId/$threadId",
        params: buildThreadRouteParams(scopeThreadRef(latest.environmentId, latest.id)),
      });
    } else {
      void handleNewThread(scopeProjectRef(project.environmentId, project.id));
    }
  });
}
