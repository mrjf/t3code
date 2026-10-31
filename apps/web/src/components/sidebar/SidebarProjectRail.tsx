import { useAtomValue } from "@effect/atom-react";
import { LayersIcon, PlusIcon } from "lucide-react";
import { useEffect, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";

import { isCommandPaletteOpen } from "../../commandPaletteBus";
import { useStableCallback } from "../../hooks/useStableCallback";
import { useTerminalFocus } from "../../hooks/useTerminalFocus";
import {
  projectJumpHintForIndex,
  projectJumpIndexFromCommand,
  resolveShortcutCommand,
  shouldShowProjectJumpHintsForModifiers,
} from "../../keybindings";
import { isTerminalFocused } from "../../lib/terminalFocus";
import { useShortcutModifierState } from "../../shortcutModifierState";
import { primaryServerKeybindingsAtom } from "../../state/server";
import { useThreadJumpHintsVisible } from "../Sidebar.logic";

import type { SidebarProjectSnapshot } from "../../sidebarProjectGrouping";
import { ProjectFavicon } from "../ProjectFavicon";
import { SidebarMenuButton } from "../ui/sidebar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

function RailButton(props: {
  label: string;
  jumpHint?: string | null;
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
      {props.jumpHint ? (
        <kbd className="pointer-events-none absolute bottom-0 left-1 grid h-3.5 min-w-3.5 place-items-center rounded-sm bg-muted px-0.5 font-sans text-3xs leading-none font-medium text-muted-foreground ring-1 ring-sidebar-border">
          {props.jumpHint}
        </kbd>
      ) : null}
    </li>
  );
}

/** ⌘⌥ plus a project's key switches to it; holding ⌘⌥ shows each project's key. */
function useProjectJumpShortcuts(
  projects: readonly SidebarProjectSnapshot[],
  onJump: (project: SidebarProjectSnapshot) => void,
): ReadonlyArray<string | null> | null {
  const keybindings = useAtomValue(primaryServerKeybindingsAtom);
  const modifiers = useShortcutModifierState();
  const terminalFocused = useTerminalFocus();
  const jump = useStableCallback((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.repeat || isCommandPaletteOpen()) return;
    const command = resolveShortcutCommand(event, keybindings, {
      platform: navigator.platform,
      context: { terminalFocus: isTerminalFocused() },
    });
    const index = projectJumpIndexFromCommand(command ?? "");
    const project = index === null ? undefined : projects[index];
    if (!project) return;
    event.preventDefault();
    event.stopPropagation();
    onJump(project);
  });
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- listens for project jump shortcuts on the window
  useEffect(() => {
    window.addEventListener("keydown", jump);
    return () => window.removeEventListener("keydown", jump);
  }, [jump]);
  const options = { platform: navigator.platform, context: { terminalFocus: terminalFocused } };
  const visible = useThreadJumpHintsVisible(
    shouldShowProjectJumpHintsForModifiers(modifiers, keybindings, options),
  );
  return visible
    ? projects.map((_, index) => projectJumpHintForIndex(keybindings, index, options))
    : null;
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
  const jumpHints = useProjectJumpShortcuts(props.projects, (project) =>
    props.onSelect(project.projectKey),
  );
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
        {props.projects.map((project, index) => (
          <RailButton
            key={project.projectKey}
            jumpHint={jumpHints?.[index] ?? null}
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
