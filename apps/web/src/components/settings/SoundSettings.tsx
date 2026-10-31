import {
  type ActiveSoundTheme,
  isSoundEventEnabled,
  SOUND_EVENT_GROUPS,
  SOUND_EVENT_INFO,
  SOUND_EVENTS,
  SOUND_THEME_DESCRIPTIONS,
  SOUND_THEME_LABELS,
  type SoundEventGroup,
} from "@t3tools/client-runtime/sound-themes";
import { DEFAULT_UNIFIED_SETTINGS, SoundTheme } from "@t3tools/contracts/settings";
import * as Schema from "effect/Schema";
import { PlayIcon } from "lucide-react";

import { previewSound } from "../../soundThemes";
import { Button } from "../ui/button";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { SettingResetButton, SettingsRow, SettingsSection } from "./settingsLayout";
import { searchableSetting } from "./settingsSearch";
import { useScopedSettings, useUpdateScopedSettings } from "./useScopedSettings";

const isSoundTheme = Schema.is(SoundTheme);
const EVENTS_BY_GROUP = Object.keys(SOUND_EVENT_GROUPS).map((group) => ({
  group: group as SoundEventGroup,
  events: SOUND_EVENTS.filter((event) => SOUND_EVENT_INFO[event].group === group),
}));

function SoundThemeSelect(props: {
  readonly label: string;
  readonly value: SoundTheme;
  readonly onChange: (value: SoundTheme) => void;
}) {
  return (
    <div className="w-full sm:w-40">
      <Select
        value={props.value}
        onValueChange={(value) => {
          if (isSoundTheme(value)) props.onChange(value);
        }}
      >
        <SelectTrigger size="sm" className="w-full min-w-0" aria-label={props.label}>
          <SelectValue>{SOUND_THEME_LABELS[props.value]}</SelectValue>
        </SelectTrigger>
        <SelectPopup align="end" alignItemWithTrigger={false}>
          <SelectItem value="off">Off (default)</SelectItem>
          <SelectItem value="crispy">{SOUND_THEME_LABELS.crispy}</SelectItem>
          <SelectItem value="gooey">{SOUND_THEME_LABELS.gooey}</SelectItem>
        </SelectPopup>
      </Select>
    </div>
  );
}

function SoundEventList(props: { readonly theme: ActiveSoundTheme }) {
  const soundEvents = useScopedSettings((settings) => settings.soundEvents);
  const updateSettings = useUpdateScopedSettings();
  return (
    <div className="grid gap-4 pb-3 sm:grid-cols-2">
      {EVENTS_BY_GROUP.map(({ group, events }) => (
        <div key={group} role="group" aria-label={SOUND_EVENT_GROUPS[group]}>
          <div className="pb-1 text-xs font-medium text-muted-foreground">
            {SOUND_EVENT_GROUPS[group]}
          </div>
          {events.map((event) => {
            const { label } = SOUND_EVENT_INFO[event];
            return (
              <div key={event} className="flex items-center gap-1 py-0.5">
                <Button
                  size="icon-xs"
                  variant="ghost-muted"
                  aria-label={`Play ${label}`}
                  onClick={() => void previewSound(props.theme, event)}
                >
                  <PlayIcon />
                </Button>
                <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
                <Switch
                  size="sm"
                  aria-label={label}
                  checked={isSoundEventEnabled(event, soundEvents)}
                  onCheckedChange={(checked) =>
                    updateSettings({ soundEvents: { ...soundEvents, [event]: checked } })
                  }
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function SoundSettingsSection() {
  const soundTheme = useScopedSettings((settings) => settings.soundTheme);
  const typingSoundTheme = useScopedSettings((settings) => settings.typingSoundTheme);
  const soundEvents = useScopedSettings((settings) => settings.soundEvents);
  const updateSettings = useUpdateScopedSettings();

  return (
    <SettingsSection id="appearance-sounds" title="Sounds">
      <SettingsRow
        {...searchableSetting("sound-theme")}
        description={
          soundTheme === "off"
            ? "Play sounds for what you and your agents do: sends, alerts, thread actions, drag and drop, git, and more. Replaces notification sounds on this device."
            : `${SOUND_THEME_DESCRIPTIONS[soundTheme]} Choose which events play below. Replaces notification sounds on this device.`
        }
        resetAction={
          soundTheme !== DEFAULT_UNIFIED_SETTINGS.soundTheme ||
          Object.keys(soundEvents).length > 0 ? (
            <SettingResetButton
              label="sounds"
              onClick={() =>
                updateSettings({
                  soundTheme: DEFAULT_UNIFIED_SETTINGS.soundTheme,
                  soundEvents: DEFAULT_UNIFIED_SETTINGS.soundEvents,
                })
              }
            />
          ) : null
        }
        control={
          <SoundThemeSelect
            label="Sound theme"
            value={soundTheme}
            onChange={(value) => {
              updateSettings({ soundTheme: value });
              void previewSound(value, "complete");
            }}
          />
        }
      >
        {soundTheme === "off" ? null : <SoundEventList theme={soundTheme} />}
      </SettingsRow>
      <SettingsRow
        {...searchableSetting("typing-sounds")}
        description="Play a key sound as you type in text fields on this device."
        resetAction={
          typingSoundTheme !== DEFAULT_UNIFIED_SETTINGS.typingSoundTheme ? (
            <SettingResetButton
              label="typing sounds"
              onClick={() =>
                updateSettings({ typingSoundTheme: DEFAULT_UNIFIED_SETTINGS.typingSoundTheme })
              }
            />
          ) : null
        }
        control={
          <SoundThemeSelect
            label="Typing sounds"
            value={typingSoundTheme}
            onChange={(value) => {
              updateSettings({ typingSoundTheme: value });
              void previewSound(value, { typing: "key" });
            }}
          />
        }
      />
    </SettingsSection>
  );
}
