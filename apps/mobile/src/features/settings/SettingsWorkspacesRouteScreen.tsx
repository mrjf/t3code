import {
  buildProjectGroups,
  pickableProjectGroups,
} from "@t3tools/client-runtime/state/project-grouping";
import { groupInWorkspace, toggleWorkspaceGroup } from "@t3tools/client-runtime/state/workspaces";
import {
  WORKSPACE_NAME_MAX_LENGTH,
  WorkspaceId,
  type Workspace,
  type WorkspaceAppearance,
  type WorkspaceMember,
} from "@t3tools/contracts";
import { BUILT_IN_THEMES } from "@t3tools/shared/themePalettes";
import { useGT } from "gt-react-native";
import { useState } from "react";
import { View } from "react-native";

import { AppText as Text, AppTextInput } from "../../components/ui/AppText";
import { Button } from "../../components/ui/Button";
import * as Dialog from "../../components/ui/Dialog";
import { ListActionRow } from "../../components/ui/ListActionRow";
import { ListChoiceRow } from "../../components/ui/ListChoiceRow";
import { ListRow } from "../../components/ui/ListRow";
import { SelectionRow } from "../../components/ui/SelectionRow";
import { isMobileThemeId } from "../../lib/mobileTheme";
import { uuidv4 } from "../../lib/uuid";
import { useProjects } from "../../state/entities";
import { useMobileProjectGroupingSettings } from "../../state/project-grouping";
import {
  useActiveAppWorkspace,
  useAppWorkspaces,
  useSaveAppWorkspaces,
  useSetActiveAppWorkspace,
} from "../workspaces/useAppWorkspaces";
import { SettingsScreen } from "./components/SettingsScreen";
import { SettingsSection } from "./components/SettingsSection";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const USER_THEME = "__user__";
/** Themes the phone can paint; the rest of the built-in list is web-only. */
const MOBILE_THEMES = BUILT_IN_THEMES.filter((theme) => isMobileThemeId(theme.id));

interface Draft {
  readonly name: string;
  readonly icon: string;
  readonly theme: string;
  readonly lightBackground: string;
  readonly lightAccent: string;
  readonly darkBackground: string;
  readonly darkAccent: string;
  readonly members: readonly WorkspaceMember[];
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
    members: workspace?.members ?? [],
  };
}

function colorsOf(background: string, accent: string) {
  return HEX_COLOR.test(background) && HEX_COLOR.test(accent) ? { background, accent } : undefined;
}

function appearanceFromDraft(draft: Draft, previous: WorkspaceAppearance | null) {
  const light = colorsOf(draft.lightBackground.trim(), draft.lightAccent.trim());
  const dark = colorsOf(draft.darkBackground.trim(), draft.darkAccent.trim());
  const appearance: WorkspaceAppearance = {
    ...(draft.theme !== USER_THEME ? { theme: draft.theme } : {}),
    ...(light ? { light } : {}),
    ...(dark ? { dark } : {}),
    // Fonts are CSS stacks the phone cannot paint; another device's choice is kept.
    ...(previous?.fonts ? { fonts: previous.fonts } : {}),
  };
  return Object.keys(appearance).length === 0 ? null : appearance;
}

export function SettingsWorkspacesRouteScreen() {
  const gt = useGT();
  const workspaces = useAppWorkspaces();
  const active = useActiveAppWorkspace();
  const setActive = useSetActiveAppWorkspace();
  // "new" opens an empty editor; an id edits that workspace.
  const [editing, setEditing] = useState<string | null>(null);
  const editingWorkspace = workspaces.find((workspace) => workspace.id === editing) ?? null;

  return (
    <SettingsScreen title={gt("Workspaces")}>
      <SettingsSection
        title={gt("Workspaces")}
        footer={gt(
          "A workspace is a named set of projects, such as Personal and Work, saved on every connected environment. Switch between them from the thread list.",
        )}
      >
        {workspaces.map((workspace) => (
          <ListRow
            key={workspace.id}
            icon="square.grid.2x2"
            label={`${workspace.icon ? `${workspace.icon} ` : ""}${workspace.name}`}
            description={gt("{count, plural, one {{count} project} other {{count} projects}}", {
              count: workspace.members.length,
            })}
            detail={active?.id === workspace.id ? gt("Active") : undefined}
            onPress={() => setEditing(workspace.id)}
          />
        ))}
        <ListActionRow icon="plus" label={gt("New workspace")} onPress={() => setEditing("new")} />
      </SettingsSection>
      {editing !== null ? (
        <WorkspaceEditor
          key={editing}
          workspace={editingWorkspace}
          isActive={editingWorkspace !== null && active?.id === editingWorkspace.id}
          onActivate={() => setActive(editingWorkspace)}
          onDone={() => setEditing(null)}
        />
      ) : null}
    </SettingsScreen>
  );
}

function WorkspaceEditor(props: {
  readonly workspace: Workspace | null;
  readonly isActive: boolean;
  readonly onActivate: () => void;
  readonly onDone: () => void;
}) {
  const gt = useGT();
  const { workspace } = props;
  const { upsert, remove } = useSaveAppWorkspaces();
  const workspaces = useAppWorkspaces();
  const groupingSettings = useMobileProjectGroupingSettings();
  const groups = pickableProjectGroups(
    buildProjectGroups({
      projects: useProjects(),
      groupScratchProjects: true,
      settings: groupingSettings,
    }),
  );
  const [draft, setDraft] = useState(() => draftFrom(workspace));
  const [saving, setSaving] = useState(false);
  const patch = (fields: Partial<Draft>) => setDraft((current) => ({ ...current, ...fields }));
  const name = draft.name.trim();
  const nameTaken = workspaces.some(
    (candidate) =>
      candidate.id !== workspace?.id && candidate.name.toLowerCase() === name.toLowerCase(),
  );
  const canSave = name.length > 0 && !nameTaken && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    const icon = draft.icon.trim();
    const saved = await upsert({
      id: workspace?.id ?? WorkspaceId.make(uuidv4()),
      name,
      icon: icon.length === 0 ? null : icon,
      appearance: appearanceFromDraft(draft, workspace?.appearance ?? null),
      members: draft.members,
    });
    setSaving(false);
    if (saved.failures.length > 0) {
      Dialog.alert(gt("Could not save workspace"), saved.failures.join("\n\n"));
    }
    if (saved.saved) props.onDone();
  };

  const colorField = (label: string, key: keyof Draft) => (
    <View className="min-w-0 flex-1 gap-1">
      <Text className="text-sm font-t3-medium text-foreground-muted">{label}</Text>
      <AppTextInput
        accessibilityLabel={label}
        className="min-h-11 rounded-xl border-continuous bg-card px-3 text-base text-foreground"
        value={draft[key] as string}
        placeholder="#rrggbb"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={(value) => patch({ [key]: value })}
      />
    </View>
  );

  return (
    <>
      <SettingsSection title={workspace ? gt("Edit workspace") : gt("New workspace")}>
        <View className="gap-3 p-4">
          <Text className="text-sm font-t3-medium text-foreground-muted">{gt("Name")}</Text>
          <AppTextInput
            accessibilityLabel={gt("Workspace name")}
            className="min-h-11 rounded-xl border-continuous bg-card px-3 text-base text-foreground"
            value={draft.name}
            maxLength={WORKSPACE_NAME_MAX_LENGTH}
            placeholder={gt("Work", { $context: "example workspace name" })}
            onChangeText={(value) => patch({ name: value })}
          />
          {nameTaken ? (
            <Text className="text-sm text-destructive">
              {gt("A workspace with this name exists.")}
            </Text>
          ) : null}
          <Text className="text-sm font-t3-medium text-foreground-muted">{gt("Icon")}</Text>
          <AppTextInput
            accessibilityLabel={gt("Workspace icon")}
            className="min-h-11 rounded-xl border-continuous bg-card px-3 text-base text-foreground"
            value={draft.icon}
            maxLength={8}
            placeholder={gt("An emoji")}
            onChangeText={(value) => patch({ icon: value })}
          />
        </View>
      </SettingsSection>

      <SettingsSection
        title={gt("Projects")}
        footer={gt(
          "A project is in the workspace on every machine that has a checkout of its repository.",
        )}
      >
        {groups.length === 0 ? (
          <View className="p-4">
            <Text className="text-sm text-foreground-muted">{gt("Add a project first.")}</Text>
          </View>
        ) : (
          groups.map((group) => (
            <SelectionRow
              key={group.key}
              role="checkbox"
              title={group.label}
              selected={groupInWorkspace(draft, {
                memberProjects: group.members.map((m) => m.project),
              })}
              onPress={() =>
                patch({
                  members: toggleWorkspaceGroup(draft, {
                    memberProjects: group.members.map((member) => member.project),
                  }),
                })
              }
            />
          ))
        )}
      </SettingsSection>

      <SettingsSection
        title={gt("Theme")}
        footer={gt("With My theme, the colors below tint your own theme instead.")}
      >
        <ListChoiceRow
          label={gt("My theme")}
          selected={draft.theme === USER_THEME}
          onPress={() => patch({ theme: USER_THEME })}
        />
        {MOBILE_THEMES.map((theme) => (
          <ListChoiceRow
            key={theme.id}
            label={theme.label}
            selected={draft.theme === theme.id}
            onPress={() => patch({ theme: theme.id })}
          />
        ))}
      </SettingsSection>

      <SettingsSection title={gt("Colors")}>
        <View className="gap-3 p-4">
          <View className="flex-row gap-3">
            {colorField(gt("Light background"), "lightBackground")}
            {colorField(gt("Light accent"), "lightAccent")}
          </View>
          <View className="flex-row gap-3">
            {colorField(gt("Dark background"), "darkBackground")}
            {colorField(gt("Dark accent"), "darkAccent")}
          </View>
        </View>
      </SettingsSection>

      <SettingsSection>
        <View className="flex-row flex-wrap gap-3 p-4">
          <Button
            label={workspace ? gt("Save") : gt("Create")}
            accessibilityHint={gt("Save the workspace on every connected environment")}
            disabled={!canSave}
            onPress={() => void save()}
          />
          {workspace && !props.isActive ? (
            <Button label={gt("Switch to it")} tone="secondary" onPress={props.onActivate} />
          ) : null}
          <Button label={gt("Cancel")} tone="secondary" onPress={props.onDone} />
        </View>
        {workspace ? (
          <ListActionRow
            icon="trash"
            label={gt("Delete workspace")}
            description={gt("Projects and threads stay; only the grouping goes.")}
            tone="danger"
            disabled={saving}
            onPress={() => {
              void remove(workspace.id).then((outcome) => {
                if (outcome.failures.length > 0) {
                  Dialog.alert(gt("Could not delete workspace"), outcome.failures.join("\n\n"));
                }
                if (outcome.saved) props.onDone();
              });
            }}
          />
        ) : null}
      </SettingsSection>
    </>
  );
}
