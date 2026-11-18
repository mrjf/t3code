import {
  WORKSPACE_NAME_MAX_LENGTH,
  WorkspaceId,
  type Workspace,
  type WorkspaceAppearance,
  type WorkspaceMember,
} from "@t3tools/contracts";
import { BUILT_IN_THEMES } from "@t3tools/shared/themePalettes";
import { T, useGT } from "gt-react";
import { useId, useState } from "react";
import { create } from "zustand";

import { useSaveWorkspaces, useWorkspaces } from "../hooks/useWorkspaces";
import { useSidebarProjectGroups } from "../hooks/useSidebarProjectGroups";
import { pickableProjectGroups } from "@t3tools/client-runtime/state/project-grouping";
import { randomUUID } from "../lib/utils";
import { groupInWorkspace, toggleWorkspaceGroup } from "@t3tools/client-runtime/state/workspaces";
import { ProjectFavicon } from "./ProjectFavicon";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "./ui/select";

interface WorkspaceDialogState {
  readonly request: { readonly workspace: Workspace | null } | null;
  readonly open: (workspace: Workspace | null) => void;
  readonly close: () => void;
}

const useWorkspaceDialogStore = create<WorkspaceDialogState>((set) => ({
  request: null,
  open: (workspace) => set({ request: { workspace } }),
  close: () => set({ request: null }),
}));

export function openWorkspaceDialog(workspace: Workspace | null): void {
  useWorkspaceDialogStore.getState().open(workspace);
}

const USER_THEME = "__user__";
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

interface Draft {
  name: string;
  icon: string;
  theme: string;
  lightBackground: string;
  lightAccent: string;
  darkBackground: string;
  darkAccent: string;
  interfaceFont: string;
  codeFont: string;
  members: readonly WorkspaceMember[];
}

function draftFrom(workspace: Workspace | null): Draft {
  const appearance = workspace?.appearance;
  return {
    name: workspace?.name ?? "",
    icon: workspace?.icon ?? "",
    theme: appearance?.theme ?? USER_THEME,
    lightBackground: appearance?.light?.background ?? "",
    lightAccent: appearance?.light?.accent ?? "",
    darkBackground: appearance?.dark?.background ?? "",
    darkAccent: appearance?.dark?.accent ?? "",
    interfaceFont: appearance?.fonts?.interface ?? "",
    codeFont: appearance?.fonts?.code ?? "",
    members: workspace?.members ?? [],
  };
}

function colorsOf(background: string, accent: string) {
  return HEX_COLOR.test(background) && HEX_COLOR.test(accent) ? { background, accent } : undefined;
}

function appearanceFromDraft(draft: Draft): WorkspaceAppearance | null {
  const light = colorsOf(draft.lightBackground.trim(), draft.lightAccent.trim());
  const dark = colorsOf(draft.darkBackground.trim(), draft.darkAccent.trim());
  const interfaceFont = draft.interfaceFont.trim();
  const codeFont = draft.codeFont.trim();
  const appearance: WorkspaceAppearance = {
    ...(draft.theme !== USER_THEME ? { theme: draft.theme } : {}),
    ...(light ? { light } : {}),
    ...(dark ? { dark } : {}),
    ...(interfaceFont || codeFont
      ? {
          fonts: {
            ...(interfaceFont ? { interface: interfaceFont } : {}),
            ...(codeFont ? { code: codeFont } : {}),
          },
        }
      : {}),
  };
  return Object.keys(appearance).length === 0 ? null : appearance;
}

export function WorkspaceDialogHost() {
  const request = useWorkspaceDialogStore((store) => store.request);
  if (!request) return null;
  // Keyed so a different workspace starts a fresh draft.
  return <WorkspaceDialog key={request.workspace?.id ?? "new"} workspace={request.workspace} />;
}

function WorkspaceDialog({ workspace }: { workspace: Workspace | null }) {
  const gt = useGT();
  const id = useId();
  const close = useWorkspaceDialogStore((store) => store.close);
  const { upsert, remove } = useSaveWorkspaces();
  const existing = useWorkspaces();
  const groups = pickableProjectGroups(useSidebarProjectGroups());
  const [draft, setDraft] = useState(() => draftFrom(workspace));
  const [submitting, setSubmitting] = useState(false);
  const patch = (fields: Partial<Draft>) => setDraft((current) => ({ ...current, ...fields }));
  const name = draft.name.trim();
  const nameTaken = existing.some(
    (candidate) =>
      candidate.id !== workspace?.id && candidate.name.toLowerCase() === name.toLowerCase(),
  );
  const canSubmit = name.length > 0 && !nameTaken && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const icon = draft.icon.trim();
    await upsert({
      id: workspace?.id ?? WorkspaceId.make(randomUUID()),
      name,
      icon: icon.length === 0 ? null : icon,
      appearance: appearanceFromDraft(draft),
      members: draft.members,
    });
    close();
  };

  const colorField = (label: string, key: keyof Draft) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`${id}-${key}`}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={gt("{label} swatch", { label })}
          className="size-8 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
          value={HEX_COLOR.test(draft[key] as string) ? (draft[key] as string) : "#808080"}
          onChange={(event) => patch({ [key]: event.target.value })}
        />
        <Input
          id={`${id}-${key}`}
          value={draft[key] as string}
          placeholder="#rrggbb"
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => patch({ [key]: event.target.value })}
        />
      </div>
    </div>
  );

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogPopup className="sm:max-w-xl">
        <form
          className="flex min-h-0 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <DialogHeader>
            <DialogTitle>{workspace ? gt("Edit workspace") : gt("New workspace")}</DialogTitle>
            <DialogDescription>
              <T>
                A workspace groups projects across your machines and can bring its own look. It is
                saved on every connected environment.
              </T>
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${id}-name`}>
                  <T>Name</T>
                </Label>
                <Input
                  id={`${id}-name`}
                  value={draft.name}
                  maxLength={WORKSPACE_NAME_MAX_LENGTH}
                  placeholder={gt("Work", { $context: "example workspace name" })}
                  autoFocus
                  autoComplete="off"
                  aria-invalid={nameTaken || undefined}
                  onChange={(event) => patch({ name: event.target.value })}
                />
                {nameTaken ? (
                  <span className="text-destructive text-xs">
                    <T>A workspace with this name exists.</T>
                  </span>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${id}-icon`}>
                  <T>Icon</T>
                </Label>
                <Input
                  id={`${id}-icon`}
                  value={draft.icon}
                  maxLength={8}
                  placeholder={gt("emoji", { $context: "workspace icon placeholder" })}
                  autoComplete="off"
                  onChange={(event) => patch({ icon: event.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>
                <T>Projects</T>
              </Label>
              {groups.length === 0 ? (
                <span className="text-muted-foreground text-xs">
                  <T>Add a project first.</T>
                </span>
              ) : (
                <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-md border border-input p-1.5">
                  {groups.map((group) => {
                    const checked = groupInWorkspace(draft, group);
                    return (
                      <li key={group.projectKey}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-sm px-1.5 py-1 text-sm hover:bg-muted">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() =>
                              patch({ members: toggleWorkspaceGroup(draft, group) })
                            }
                          />
                          <ProjectFavicon project={group} className="size-4" />
                          <span className="min-w-0 flex-1 truncate">{group.displayName}</span>
                          {group.remoteEnvironmentLabels.length > 0 ? (
                            <span className="truncate text-muted-foreground text-xs">
                              {group.remoteEnvironmentLabels.join(", ")}
                            </span>
                          ) : null}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
              <span className="text-muted-foreground text-xs">
                <T>
                  A project is in the workspace on every machine that has a checkout of its
                  repository.
                </T>
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>
                <T>Theme</T>
              </Label>
              <Select
                value={draft.theme}
                onValueChange={(value) => {
                  if (value) patch({ theme: value });
                }}
                items={[
                  { value: USER_THEME, label: gt("My theme") },
                  ...BUILT_IN_THEMES.map((theme) => ({ value: theme.id, label: theme.label })),
                ]}
              >
                <SelectTrigger size="sm" aria-label={gt("Workspace theme")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  <SelectItem value={USER_THEME}>{gt("My theme")}</SelectItem>
                  {BUILT_IN_THEMES.map((theme) => (
                    <SelectItem key={theme.id} value={theme.id}>
                      {theme.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
              <span className="text-muted-foreground text-xs">
                <T>
                  With <strong>My theme</strong>, the colors below tint your own theme instead.
                </T>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {colorField(gt("Light background"), "lightBackground")}
              {colorField(gt("Light accent"), "lightAccent")}
              {colorField(gt("Dark background"), "darkBackground")}
              {colorField(gt("Dark accent"), "darkAccent")}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${id}-font`}>
                  <T>Interface font</T>
                </Label>
                <Input
                  id={`${id}-font`}
                  value={draft.interfaceFont}
                  placeholder={gt("Inter, system-ui", { $context: "example font stack" })}
                  autoComplete="off"
                  onChange={(event) => patch({ interfaceFont: event.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${id}-code-font`}>
                  <T>Code font</T>
                </Label>
                <Input
                  id={`${id}-code-font`}
                  value={draft.codeFont}
                  placeholder={gt("JetBrains Mono", { $context: "example font name" })}
                  autoComplete="off"
                  onChange={(event) => patch({ codeFont: event.target.value })}
                />
              </div>
            </div>
          </DialogPanel>
          <DialogFooter>
            {workspace ? (
              <Button
                type="button"
                variant="ghost-destructive"
                className="mr-auto"
                onClick={() => {
                  void remove(workspace.id);
                  close();
                }}
              >
                <T>Delete workspace</T>
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={close}>
              <T>Cancel</T>
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {workspace ? gt("Save") : gt("Create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
