import { CheckIcon, LayersIcon, PlusIcon, SettingsIcon, SquarePenIcon } from "lucide-react";
import type { ReactElement, ReactNode } from "react";

import { useSwitchToProject } from "~/hooks/useSwitchToProject";
import { useWorkspaceProjectGroups } from "~/hooks/useWorkspaces";
import { openWorkspaceDialog } from "./WorkspaceDialog";
import { useUiStateStore } from "~/uiStateStore";
import { ProjectFavicon } from "./ProjectFavicon";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "./ui/menu";

/**
 * Lists the current workspace's projects; choosing one switches the whole app to it.
 * The trigger is the caller's, so the header and the breadcrumb can each style theirs.
 */
export function ProjectSwitcherMenu(props: {
  trigger: ReactElement;
  children: ReactNode;
  newThreadLabel?: string;
  onNewThread?: () => void;
}) {
  const { workspace, projects, label } = useWorkspaceProjectGroups();
  const scopeKeys = useUiStateStore((store) => store.sidebarProjectScopeKeys);
  const switchToProject = useSwitchToProject();

  return (
    <Menu>
      <MenuTrigger render={props.trigger}>{props.children}</MenuTrigger>
      <MenuPopup align="start" className="min-w-52">
        {props.onNewThread ? (
          <>
            <MenuItem onClick={props.onNewThread}>
              <SquarePenIcon className="size-4" />
              {props.newThreadLabel}
            </MenuItem>
            <MenuSeparator />
          </>
        ) : null}
        <MenuItem onClick={() => switchToProject(null)}>
          <LayersIcon className="size-4" />
          <span className="flex-1">{label}</span>
          {scopeKeys.length === 0 ? <CheckIcon className="size-3.5" /> : null}
        </MenuItem>
        <MenuSeparator />
        {projects.map((group) => (
          <MenuItem key={group.projectKey} onClick={() => switchToProject(group)}>
            <ProjectFavicon project={group} className="size-4" />
            <span className="min-w-0 flex-1 truncate">{group.displayName}</span>
            {scopeKeys.includes(group.projectKey) ? <CheckIcon className="size-3.5" /> : null}
          </MenuItem>
        ))}
        <MenuSeparator />
        {workspace ? (
          <MenuItem onClick={() => openWorkspaceDialog(workspace)}>
            <SettingsIcon className="size-4" />
            Edit {workspace.name}
          </MenuItem>
        ) : null}
        <MenuItem onClick={() => openWorkspaceDialog(null)}>
          <PlusIcon className="size-4" />
          New workspace
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}
