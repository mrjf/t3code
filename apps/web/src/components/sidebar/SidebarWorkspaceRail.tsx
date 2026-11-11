import { useAtomValue } from "@effect/atom-react";
import type { Workspace } from "@t3tools/contracts";
import { LayersIcon, PlusIcon } from "lucide-react";
import { useEffect, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";

import { isCommandPaletteOpen } from "../../commandPaletteBus";
import { useStableCallback } from "../../hooks/useStableCallback";
import {
  resolveShortcutCommand,
  workspaceJumpHintForIndex,
  workspaceJumpIndexFromCommand,
} from "../../keybindings";
import { isTerminalFocused } from "../../lib/terminalFocus";
import { primaryServerKeybindingsAtom } from "../../state/server";
import { useWorkspaceJumpHintsVisible } from "../Sidebar.logic";

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

/** A workspace's glyph: its icon, or else the first letters of its name. */
function WorkspaceGlyph({
  workspace,
  className,
}: {
  workspace: Pick<Workspace, "name" | "icon">;
  className?: string;
}) {
  const text =
    workspace.icon ??
    workspace.name
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("");
  return (
    <span aria-hidden className={className ?? "text-sm leading-none font-semibold tracking-tight"}>
      {text}
    </span>
  );
}

/** ⌘⌥ plus a workspace's key switches to it; holding ⌘⌥ shows each workspace's key. */
function useWorkspaceJumpShortcuts(
  workspaces: readonly Workspace[],
  onJump: (workspace: Workspace) => void,
): ReadonlyArray<string | null> | null {
  const keybindings = useAtomValue(primaryServerKeybindingsAtom);
  const jump = useStableCallback((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.repeat || isCommandPaletteOpen()) return;
    const command = resolveShortcutCommand(event, keybindings, {
      platform: navigator.platform,
      context: { terminalFocus: isTerminalFocused() },
    });
    const index = workspaceJumpIndexFromCommand(command ?? "");
    const workspace = index === null ? undefined : workspaces[index];
    if (!workspace) return;
    event.preventDefault();
    event.stopPropagation();
    onJump(workspace);
  });
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- listens for workspace jump shortcuts on the window
  useEffect(() => {
    window.addEventListener("keydown", jump);
    return () => window.removeEventListener("keydown", jump);
  }, [jump]);
  const visible = useWorkspaceJumpHintsVisible(keybindings);
  if (!visible) return null;
  const options = { platform: navigator.platform, context: { terminalFocus: isTerminalFocused() } };
  return workspaces.map((_, index) => workspaceJumpHintForIndex(keybindings, index, options));
}

/** Choosing a workspace scopes the whole app to its projects. */
export function SidebarWorkspaceRail(props: {
  workspaces: readonly Workspace[];
  activeWorkspaceId: string | null;
  mascot: string | null;
  onSelect: (workspace: Workspace | null) => void;
  onWorkspaceContextMenu: (workspace: Workspace, position: { x: number; y: number }) => void;
  onAddWorkspace: () => void;
}) {
  const jumpHints = useWorkspaceJumpShortcuts(props.workspaces, props.onSelect);
  return (
    <div className="flex w-12 shrink-0 flex-col items-center border-r border-sidebar-border">
      <ul
        aria-label="Workspaces"
        className="flex w-full min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto scrollbar-gutter-both py-2"
      >
        <RailButton
          label="All projects"
          selected={props.activeWorkspaceId === null}
          onClick={() => props.onSelect(null)}
        >
          <LayersIcon />
        </RailButton>
        {props.workspaces.map((workspace, index) => (
          <RailButton
            key={workspace.id}
            jumpHint={jumpHints?.[index] ?? null}
            label={workspace.name}
            selected={props.activeWorkspaceId === workspace.id}
            onClick={() => props.onSelect(workspace)}
            onContextMenu={(event) => {
              event.preventDefault();
              // The Menu key and Shift+F10 report no pointer position.
              const fromKeyboard = event.clientX === 0 && event.clientY === 0;
              const rect = event.currentTarget.getBoundingClientRect();
              props.onWorkspaceContextMenu(
                workspace,
                fromKeyboard
                  ? { x: rect.right, y: rect.top }
                  : { x: event.clientX, y: event.clientY },
              );
            }}
          >
            <WorkspaceGlyph workspace={workspace} />
          </RailButton>
        ))}
        <RailButton label="New workspace" onClick={props.onAddWorkspace}>
          <PlusIcon />
        </RailButton>
      </ul>
      {props.mascot ? (
        <img alt="" aria-hidden src={props.mascot} className="mb-3 size-9 -rotate-8 select-none" />
      ) : null}
    </div>
  );
}
