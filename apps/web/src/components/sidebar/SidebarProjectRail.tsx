import { LayersIcon, PlusIcon } from "lucide-react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";

import type { SidebarProjectSnapshot } from "../../sidebarProjectGrouping";
import { ProjectFavicon } from "../ProjectFavicon";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { cn } from "~/lib/utils";

function SidebarProjectRailButton(props: {
  label: string;
  selected: boolean;
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onContextMenu?: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={props.label}
            aria-pressed={props.selected}
            onClick={props.onClick}
            onContextMenu={props.onContextMenu}
            className={cn(
              "grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-sidebar-muted-foreground outline-none transition-colors hover:bg-sidebar-row-hover hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              props.selected &&
                "bg-sidebar-row-hover text-sidebar-foreground ring-2 ring-sidebar-foreground/70 ring-inset",
            )}
          />
        }
      >
        {props.children}
      </TooltipTrigger>
      <TooltipPopup side="right">{props.label}</TooltipPopup>
    </Tooltip>
  );
}

/** Slack-style column of projects: choosing one scopes the whole sidebar to it. */
export function SidebarProjectRail(props: {
  projects: readonly SidebarProjectSnapshot[];
  selectedKeys: readonly string[];
  onSelect: (projectKey: string | null) => void;
  onToggle: (projectKey: string) => void;
  onProjectSettings: (event: ReactMouseEvent<HTMLElement>, project: SidebarProjectSnapshot) => void;
  onAddProject: () => void;
}) {
  return (
    <nav
      aria-label="Projects"
      className="flex w-13 shrink-0 flex-col items-center gap-2 overflow-y-auto scrollbar-gutter-both border-r border-sidebar-border py-2"
    >
      <SidebarProjectRailButton
        label="All projects"
        selected={props.selectedKeys.length === 0}
        onClick={() => props.onSelect(null)}
      >
        <LayersIcon className="size-4.5" />
      </SidebarProjectRailButton>
      {props.projects.map((project) => (
        <SidebarProjectRailButton
          key={project.projectKey}
          label={project.displayName}
          selected={props.selectedKeys.includes(project.projectKey)}
          onClick={(event) =>
            event.shiftKey ? props.onToggle(project.projectKey) : props.onSelect(project.projectKey)
          }
          onContextMenu={(event) => props.onProjectSettings(event, project)}
        >
          <ProjectFavicon project={project} className="size-5" />
        </SidebarProjectRailButton>
      ))}
      <SidebarProjectRailButton label="Add project" selected={false} onClick={props.onAddProject}>
        <PlusIcon className="size-4.5" />
      </SidebarProjectRailButton>
    </nav>
  );
}
