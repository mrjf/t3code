import { LayersIcon, PlusIcon } from "lucide-react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";

import type { SidebarProjectSnapshot } from "../../sidebarProjectGrouping";
import { ProjectFavicon } from "../ProjectFavicon";
import { SidebarMenuButton } from "../ui/sidebar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

function RailButton(props: {
  label: string;
  tooltip?: string;
  selected?: boolean;
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onContextMenu?: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
}) {
  return (
    <li className="relative flex justify-center">
      {props.selected ? (
        <span
          aria-hidden
          className="absolute top-1.5 bottom-1.5 left-0 w-1 rounded-r-full bg-sidebar-foreground"
        />
      ) : null}
      <Tooltip>
        <TooltipTrigger
          render={
            <SidebarMenuButton
              size="icon"
              type="button"
              isActive={props.selected ?? false}
              aria-label={props.label}
              {...(props.selected === undefined ? {} : { "aria-pressed": props.selected })}
              onClick={props.onClick}
              onContextMenu={props.onContextMenu}
            />
          }
        >
          {props.children}
        </TooltipTrigger>
        <TooltipPopup side="right">{props.tooltip ?? props.label}</TooltipPopup>
      </Tooltip>
    </li>
  );
}

/** Choosing a project scopes the whole app to it. */
export function SidebarProjectRail(props: {
  projects: readonly SidebarProjectSnapshot[];
  selectedKeys: readonly string[];
  mascot: string | null;
  onSelect: (projectKey: string | null) => void;
  onToggle: (projectKey: string) => void;
  onProjectContextMenu: (
    project: SidebarProjectSnapshot,
    position: { x: number; y: number },
  ) => void;
  onAddProject: () => void;
}) {
  return (
    <div className="flex w-12 shrink-0 flex-col items-center border-r border-sidebar-border">
      <ul
        aria-label="Projects"
        className="flex w-full min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto scrollbar-gutter-both py-2"
      >
        <RailButton
          label="All projects"
          selected={props.selectedKeys.length === 0}
          onClick={() => props.onSelect(null)}
        >
          <LayersIcon />
        </RailButton>
        {props.projects.map((project) => (
          <RailButton
            key={project.projectKey}
            label={project.displayName}
            tooltip={`${project.displayName} · Shift-click to add`}
            selected={props.selectedKeys.includes(project.projectKey)}
            onClick={(event) =>
              event.shiftKey
                ? props.onToggle(project.projectKey)
                : props.onSelect(project.projectKey)
            }
            onContextMenu={(event) => {
              event.preventDefault();
              // The Menu key and Shift+F10 report no pointer position.
              const fromKeyboard = event.clientX === 0 && event.clientY === 0;
              const rect = event.currentTarget.getBoundingClientRect();
              props.onProjectContextMenu(
                project,
                fromKeyboard
                  ? { x: rect.right, y: rect.top }
                  : { x: event.clientX, y: event.clientY },
              );
            }}
          >
            <ProjectFavicon project={project} className="size-5" />
          </RailButton>
        ))}
        <RailButton label="Add project" onClick={props.onAddProject}>
          <PlusIcon />
        </RailButton>
      </ul>
      {props.mascot ? (
        <img alt="" aria-hidden src={props.mascot} className="mb-3 size-9 -rotate-8 select-none" />
      ) : null}
    </div>
  );
}
