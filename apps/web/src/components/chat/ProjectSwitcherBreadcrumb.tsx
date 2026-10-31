import { pickableProjectGroups } from "@t3tools/client-runtime/state/project-grouping";
import type { EnvironmentProject } from "@t3tools/client-runtime/state/shell";
import { CheckIcon, ChevronDownIcon, LayersIcon, SquarePenIcon } from "lucide-react";

import { useSidebarProjectGroups } from "~/hooks/useSidebarProjectGroups";
import { useSwitchToProject } from "~/hooks/useSwitchToProject";
import { useUiStateStore } from "~/uiStateStore";
import { ProjectFavicon } from "../ProjectFavicon";
import { WorkspaceBreadcrumbText } from "../WorkspaceBreadcrumb";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "../ui/menu";

export function ProjectSwitcherBreadcrumb(props: {
  activeProject: EnvironmentProject;
  activeProjectName: string | undefined;
  onNewThreadInProject: () => void;
}) {
  const projectGroups = pickableProjectGroups(useSidebarProjectGroups());
  const scopeKeys = useUiStateStore((store) => store.sidebarProjectScopeKeys);
  const switchToProject = useSwitchToProject();

  return (
    <Menu>
      <MenuTrigger
        render={
          <button
            type="button"
            aria-label={`${props.activeProjectName ?? "Project"}, switch project`}
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
        <MenuItem onClick={() => switchToProject(null)}>
          <LayersIcon className="size-4" />
          <span className="flex-1">All projects</span>
          {scopeKeys.length === 0 ? <CheckIcon className="size-3.5" /> : null}
        </MenuItem>
        <MenuSeparator />
        {projectGroups.map((group) => (
          <MenuItem key={group.projectKey} onClick={() => switchToProject(group)}>
            <ProjectFavicon project={group} className="size-4" />
            <span className="min-w-0 flex-1 truncate">{group.displayName}</span>
            {scopeKeys.includes(group.projectKey) ? <CheckIcon className="size-3.5" /> : null}
          </MenuItem>
        ))}
      </MenuPopup>
    </Menu>
  );
}
