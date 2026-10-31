import {
  SOUND_EVENT_LABELS,
  SOUND_EVENTS,
  SOUND_THEME_DESCRIPTIONS,
  SOUND_THEME_LABELS,
} from "@t3tools/client-runtime/sound-themes";
import { DEFAULT_UNIFIED_SETTINGS, SoundTheme } from "@t3tools/contracts/settings";
import * as Schema from "effect/Schema";
import { PlayIcon } from "lucide-react";

import { previewSound } from "../../soundThemes";
import { Button } from "../ui/button";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { SettingResetButton, SettingsRow, SettingsSection } from "./settingsLayout";
import { searchableSetting } from "./settingsSearch";
import { useScopedSettings, useUpdateScopedSettings } from "./useScopedSettings";

const isSoundTheme = Schema.is(SoundTheme);

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

export function SoundSettingsSection() {
  const soundTheme = useScopedSettings((settings) => settings.soundTheme);
  const typingSoundTheme = useScopedSettings((settings) => settings.typingSoundTheme);
  const updateSettings = useUpdateScopedSettings();

  return (
    <SettingsSection id="appearance-sounds" title="Sounds">
      <SettingsRow
        {...searchableSetting("sound-theme")}
        description={
          soundTheme === "off"
            ? "Play sounds when you send or stop, and when a thread finishes, fails, or needs you. Replaces notification sounds on this device."
            : `${SOUND_THEME_DESCRIPTIONS[soundTheme]} Replaces notification sounds on this device.`
        }
        resetAction={
          soundTheme !== DEFAULT_UNIFIED_SETTINGS.soundTheme ? (
            <SettingResetButton
              label="sound theme"
              onClick={() => updateSettings({ soundTheme: DEFAULT_UNIFIED_SETTINGS.soundTheme })}
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
        {soundTheme === "off" ? null : (
          <div className="flex flex-wrap gap-1 pb-2">
            {SOUND_EVENTS.map((event) => (
              <Button
                key={event}
                size="compact"
                variant="ghost-muted"
                aria-label={`Play ${SOUND_EVENT_LABELS[event]}`}
                onClick={() => void previewSound(soundTheme, event)}
              >
                <PlayIcon />
                {SOUND_EVENT_LABELS[event]}
              </Button>
            ))}
          </div>
        )}
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
              void previewSound(value, "key");
            }}
          />
        }
      />
    </SettingsSection>
  );
}
