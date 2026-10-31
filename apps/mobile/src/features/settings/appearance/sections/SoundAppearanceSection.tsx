import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { SOUND_THEME_DESCRIPTIONS, SOUND_THEME_LABELS } from "@t3tools/client-runtime/sound-themes";
import type { SoundTheme } from "@t3tools/contracts/settings";
import { AsyncResult } from "effect/reactivity";
import { View } from "react-native";

import { ListChoiceRow } from "../../../../components/ui/ListChoiceRow";
import { previewSound } from "../../../../lib/soundThemes";
import { mobilePreferencesAtom, updateMobilePreferencesAtom } from "../../../../state/preferences";
import { SettingsSection } from "../../components/SettingsSection";

const THEMES = ["off", "crispy", "gooey"] as const satisfies ReadonlyArray<SoundTheme>;

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

  return (
    <>
      <SettingsSection
        title="Sounds"
        footer="Plays when you send or stop, and when a thread finishes, fails, or needs you while the app is open."
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
            previewSound(value, "key");
          }}
        />
      </SettingsSection>
    </>
  );
}
