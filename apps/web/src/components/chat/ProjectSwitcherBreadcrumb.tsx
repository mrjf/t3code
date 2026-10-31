import { scopeProjectRef, scopeThreadRef } from "@t3tools/client-runtime/environment";
import { pickableProjectGroups } from "@t3tools/client-runtime/state/project-grouping";
import type { EnvironmentProject } from "@t3tools/client-runtime/state/shell";
import { useRouter } from "@tanstack/react-router";
import { CheckIcon, ChevronDownIcon, LayersIcon, SquarePenIcon } from "lucide-react";

import { useHandleNewThread } from "~/hooks/useHandleNewThread";
import { useSidebarProjectGroups } from "~/hooks/useSidebarProjectGroups";
import { useQuietThreadShells } from "~/state/entities";
import { buildThreadRouteParams } from "~/threadRoutes";
import { useUiStateStore } from "~/uiStateStore";
import { ProjectFavicon } from "../ProjectFavicon";
import { WorkspaceBreadcrumbText } from "../WorkspaceBreadcrumb";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "../ui/menu";

/** The breadcrumb's project, as the app's top-level project switcher. */
export function ProjectSwitcherBreadcrumb(props: {
  activeProject: EnvironmentProject;
  activeProjectName: string | undefined;
  onNewThreadInProject: () => void;
}) {
  const router = useRouter();
  const projectGroups = pickableProjectGroups(useSidebarProjectGroups());
  const threads = useQuietThreadShells();
  const { handleNewThread } = useHandleNewThread();
  const scopeKeys = useUiStateStore((store) => store.sidebarProjectScopeKeys);
  const setScopeKeys = useUiStateStore((store) => store.setSidebarProjectScopeKeys);

  const switchToProject = (group: (typeof projectGroups)[number]) => {
    setScopeKeys([group.projectKey]);
    const members = new Set(
      group.memberProjectRefs.map((ref) => `${ref.environmentId}:${ref.projectId}`),
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
      void handleNewThread(scopeProjectRef(group.environmentId, group.id));
    }
  };

  return (
    <Menu>
      <MenuTrigger
        render={
          <button
            type="button"
            aria-label={`Switch project, current: ${props.activeProjectName}`}
            className="inline-flex min-w-0 max-w-full cursor-pointer items-center gap-1.5 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          />
        }
      >
        <ProjectFavicon project={props.activeProject} className="size-3.5" />
        <WorkspaceBreadcrumbText className="max-w-40">
          {props.activeProjectName}
        </WorkspaceBreadcrumbText>
        <ChevronDownIcon className="size-3 shrink-0" />
      </MenuTrigger>
      <MenuPopup align="start" className="min-w-52">
        <MenuItem onClick={props.onNewThreadInProject}>
          <SquarePenIcon className="size-4" />
          New thread in {props.activeProjectName}
        </MenuItem>
        <MenuSeparator />
        <MenuItem onClick={() => setScopeKeys([])}>
          <LayersIcon className="size-4" />
          <span className="flex-1">All projects</span>
          {scopeKeys.length === 0 ? <CheckIcon className="size-3.5" /> : null}
        </MenuItem>
        <MenuSeparator />
        {projectGroups.map((group) => (
          <MenuItem key={group.projectKey} onClick={() => switchToProject(group)}>
            <ProjectFavicon project={group} className="size-4" />
            <span className="min-w-0 flex-1 truncate">{group.displayName}</span>
            {scopeKeys.length === 1 && scopeKeys[0] === group.projectKey ? (
              <CheckIcon className="size-3.5" />
            ) : null}
          </MenuItem>
        ))}
      </MenuPopup>
    </Menu>
  );
}
