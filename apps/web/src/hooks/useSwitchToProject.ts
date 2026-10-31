import { scopeProjectRef, scopeThreadRef } from "@t3tools/client-runtime/environment";
import type { ScopedProjectRef } from "@t3tools/contracts";
import { useRouter } from "@tanstack/react-router";

import { useQuietThreadShells } from "~/state/entities";
import { buildThreadRouteParams } from "~/threadRoutes";
import { useUiStateStore } from "~/uiStateStore";
import { useHandleNewThread } from "./useHandleNewThread";

interface SwitchableProject {
  readonly projectKey: string;
  readonly environmentId: ScopedProjectRef["environmentId"];
  readonly id: ScopedProjectRef["projectId"];
  readonly memberProjectRefs: ReadonlyArray<ScopedProjectRef>;
}

/** Scopes the app to a project and opens its latest thread, or a new one. `null` shows all projects. */
export function useSwitchToProject() {
  const router = useRouter();
  const threads = useQuietThreadShells();
  const { handleNewThread } = useHandleNewThread();
  const setScopeKeys = useUiStateStore((store) => store.setSidebarProjectScopeKeys);

  return (project: SwitchableProject | null) => {
    if (project === null) {
      setScopeKeys([]);
      return;
    }
    setScopeKeys([project.projectKey]);
    const members = new Set(
      project.memberProjectRefs.map((ref) => `${ref.environmentId}:${ref.projectId}`),
    );
    const latest = threads
      .filter(
        (thread) =>
          thread.archivedAt === null && members.has(`${thread.environmentId}:${thread.projectId}`),
      )
      .reduce<(typeof threads)[number] | null>(
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
  };
}
