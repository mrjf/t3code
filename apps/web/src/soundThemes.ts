import {
  type ActiveSoundTheme,
  type SoundEvent,
  type TypingSound,
  typingSoundForKey,
} from "@t3tools/client-runtime/sound-themes";
import type { SoundTheme } from "@t3tools/contracts/settings";

import { getClientSettings, subscribeClientSettings } from "./hooks/useSettings";
import { isEditableFocused } from "./lib/editableFocus";
import {
  hasNotificationSound,
  playNotificationSound,
  playSoundUrl,
  unlockNotificationAudio,
} from "./threadNotifications";

// Rendered by scripts/render-sound-themes.py.
const soundUrls = import.meta.glob<string>("./assets/sounds/*/*.mp3", {
  query: "?url",
  import: "default",
  eager: true,
});

function soundUrl(theme: ActiveSoundTheme, sound: SoundEvent | TypingSound): string | undefined {
  return soundUrls[`./assets/sounds/${theme}/${sound}.mp3`];
}

export function playThemeSound(event: SoundEvent): void {
  const theme = getClientSettings().soundTheme;
  if (theme === "off") return;
  const url = soundUrl(theme, event);
  if (url) void playSoundUrl(url, () => getClientSettings().soundTheme === theme);
}

/** A thread alert: the theme's sound, or the classic notification sound when no theme is set. */
export function playAlertSound(event: SoundEvent): void {
  const { soundTheme, notificationMode } = getClientSettings();
  if (soundTheme !== "off") {
    playThemeSound(event);
    return;
  }
  if (!hasNotificationSound(notificationMode)) return;
  void playNotificationSound(event === "complete" ? "completion" : "input", () =>
    hasNotificationSound(getClientSettings().notificationMode),
  );
}

/** Settings previews run inside a click, so they can wait for the unlock. */
export async function previewSound(
  theme: SoundTheme,
  sound: SoundEvent | TypingSound,
): Promise<void> {
  if (theme === "off") return;
  const url = soundUrl(theme, sound);
  if (!url) return;
  await unlockNotificationAudio();
  await playSoundUrl(url, () => true, { overlap: true });
}

function onTypingKey(event: KeyboardEvent) {
  const theme = getClientSettings().typingSoundTheme;
  if (theme === "off" || event.repeat || event.isComposing) return;
  if (event.metaKey || event.ctrlKey || !isEditableFocused(event.target)) return;
  const sound = typingSoundForKey(event.key);
  const url = sound && soundUrl(theme, sound);
  if (!url) return;
  // A few cents of drift keeps a run of keystrokes from sounding like a machine gun.
  const detune = (Math.random() - 0.5) * 120;
  void playSoundUrl(url, () => getClientSettings().typingSoundTheme === theme, {
    overlap: true,
    detune,
  });
}

/** Unlocks audio on the first gesture and plays typing sounds while either theme is on. */
export function startSoundThemes(): () => void {
  let listening = false;
  const unlock = () => void unlockNotificationAudio();
  const setListening = (next: boolean) => {
    if (next === listening) return;
    listening = next;
    if (next) {
      document.addEventListener("pointerdown", unlock, true);
      document.addEventListener("keydown", unlock, true);
      document.addEventListener("keydown", onTypingKey, true);
    } else {
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", unlock, true);
      document.removeEventListener("keydown", onTypingKey, true);
    }
  };
  const sync = () => {
    const { soundTheme, typingSoundTheme } = getClientSettings();
    setListening(soundTheme !== "off" || typingSoundTheme !== "off");
  };
  const unsubscribe = subscribeClientSettings(sync);
  sync();
  return () => {
    unsubscribe();
    setListening(false);
  };
}
