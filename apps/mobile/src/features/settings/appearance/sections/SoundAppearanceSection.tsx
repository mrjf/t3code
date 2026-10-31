import { useAtomSet, useAtomValue } from "@effect/atom-react";
import {
  isSoundEventEnabled,
  SOUND_EVENT_GROUPS,
  SOUND_EVENT_INFO,
  SOUND_EVENTS,
  SOUND_THEME_DESCRIPTIONS,
  SOUND_THEME_LABELS,
  type SoundEventGroup,
} from "@t3tools/client-runtime/sound-themes";
import type { SoundTheme } from "@t3tools/contracts/settings";
import { AsyncResult } from "effect/reactivity";
import { View } from "react-native";

import { ListChoiceRow } from "../../../../components/ui/ListChoiceRow";
import { previewSound } from "../../../../lib/soundThemes";
import { mobilePreferencesAtom, updateMobilePreferencesAtom } from "../../../../state/preferences";
import { SettingsSection } from "../../components/SettingsSection";
import { SettingsSwitchRow } from "../../components/SettingsSwitchRow";

const THEMES = ["off", "crispy", "gooey"] as const satisfies ReadonlyArray<SoundTheme>;
const EVENTS_BY_GROUP = Object.keys(SOUND_EVENT_GROUPS).map((group) => ({
  group: group as SoundEventGroup,
  events: SOUND_EVENTS.filter((event) => SOUND_EVENT_INFO[event].group === group),
}));

function SoundThemeChoices(props: {
  readonly label: string;
  readonly value: SoundTheme;
  readonly disabled: boolean;
  readonly onChange: (value: SoundTheme) => void;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={props.label}>
      {THEMES.map((theme, index) => (
        <ListChoiceRow
          key={theme}
          label={SOUND_THEME_LABELS[theme]}
          {...(theme === "off" ? {} : { description: SOUND_THEME_DESCRIPTIONS[theme] })}
          disabled={props.disabled}
          selected={props.value === theme}
          separated={index > 0}
          onPress={() => props.onChange(theme)}
        />
      ))}
    </View>
  );
}

export function SoundAppearanceSection() {
  const preferences = useAtomValue(mobilePreferencesAtom);
  const savePreferences = useAtomSet(updateMobilePreferencesAtom);
  const isReady = AsyncResult.isSuccess(preferences);
  const soundTheme = (isReady && preferences.value.soundTheme) || "off";
  const typingSoundTheme = (isReady && preferences.value.typingSoundTheme) || "off";
  const soundEvents = (isReady && preferences.value.soundEvents) || {};

  return (
    <>
      <SettingsSection
        title="Sounds"
        footer="Plays for what you and your agents do while the app is open. Choose which events play below."
      >
        <SoundThemeChoices
          label="Sound theme"
          value={soundTheme}
          disabled={!isReady}
          onChange={(value) => {
            savePreferences({ soundTheme: value });
            previewSound(value, "complete");
          }}
        />
      </SettingsSection>
      {soundTheme === "off"
        ? null
        : EVENTS_BY_GROUP.map(({ group, events }) => (
            <SettingsSection key={group} title={`${SOUND_EVENT_GROUPS[group]} sounds`}>
              {events.map((event) => (
                <SettingsSwitchRow
                  key={event}
                  label={SOUND_EVENT_INFO[event].label}
                  disabled={!isReady}
                  value={isSoundEventEnabled(event, soundEvents)}
                  onValueChange={(enabled) => {
                    savePreferences({ soundEvents: { ...soundEvents, [event]: enabled } });
                    if (enabled) previewSound(soundTheme, event);
                  }}
                />
              ))}
            </SettingsSection>
          ))}
      <SettingsSection
        title="Typing sounds"
        footer="Plays a key sound as you type in the composer."
      >
        <SoundThemeChoices
          label="Typing sounds"
          value={typingSoundTheme}
          disabled={!isReady}
          onChange={(value) => {
            savePreferences({ typingSoundTheme: value });
            previewSound(value, "typing-key");
          }}
        />
      </SettingsSection>
    </>
  );
}
