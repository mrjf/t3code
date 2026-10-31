import {
  type ActiveSoundTheme,
  type SoundEvent,
  type TypingSound,
  typingSoundForEdit,
} from "@t3tools/client-runtime/sound-themes";
import type { SoundTheme } from "@t3tools/contracts/settings";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { AsyncResult } from "effect/reactivity";

import { appAtomRegistry } from "../state/atom-registry";
import { mobilePreferencesAtom } from "../state/preferences";
import { playInterfaceSound } from "./audioSession";

type Sound = SoundEvent | TypingSound;

// Rendered by scripts/render-sound-themes.py.
const SOUND_ASSETS: Record<ActiveSoundTheme, Record<Sound, number>> = {
  crispy: {
    send: require("../../assets/sounds/crispy/send.mp3"),
    interrupt: require("../../assets/sounds/crispy/interrupt.mp3"),
    complete: require("../../assets/sounds/crispy/complete.mp3"),
    input: require("../../assets/sounds/crispy/input.mp3"),
    approval: require("../../assets/sounds/crispy/approval.mp3"),
    error: require("../../assets/sounds/crispy/error.mp3"),
    key: require("../../assets/sounds/crispy/key.mp3"),
    space: require("../../assets/sounds/crispy/space.mp3"),
    enter: require("../../assets/sounds/crispy/enter.mp3"),
    delete: require("../../assets/sounds/crispy/delete.mp3"),
  },
  gooey: {
    send: require("../../assets/sounds/gooey/send.mp3"),
    interrupt: require("../../assets/sounds/gooey/interrupt.mp3"),
    complete: require("../../assets/sounds/gooey/complete.mp3"),
    input: require("../../assets/sounds/gooey/input.mp3"),
    approval: require("../../assets/sounds/gooey/approval.mp3"),
    error: require("../../assets/sounds/gooey/error.mp3"),
    key: require("../../assets/sounds/gooey/key.mp3"),
    space: require("../../assets/sounds/gooey/space.mp3"),
    enter: require("../../assets/sounds/gooey/enter.mp3"),
    delete: require("../../assets/sounds/gooey/delete.mp3"),
  },
};

const players = new Map<number, AudioPlayer>();

function playSound(theme: SoundTheme, sound: Sound) {
  if (theme === "off") return;
  const asset = SOUND_ASSETS[theme][sound];
  let player = players.get(asset);
  if (!player) {
    player = createAudioPlayer(asset);
    players.set(asset, player);
  }
  playInterfaceSound(player);
}

function readThemes() {
  const preferences = appAtomRegistry.get(mobilePreferencesAtom);
  if (!AsyncResult.isSuccess(preferences)) return { sound: "off", typing: "off" } as const;
  return {
    sound: preferences.value.soundTheme ?? "off",
    typing: preferences.value.typingSoundTheme ?? "off",
  };
}

export function playThemeSound(event: SoundEvent) {
  playSound(readThemes().sound, event);
}

export function playTypingSound(previous: string, next: string) {
  const theme = readThemes().typing;
  const sound = theme === "off" ? null : typingSoundForEdit(previous, next);
  if (sound) playSound(theme, sound);
}

export function previewSound(theme: SoundTheme, sound: Sound) {
  playSound(theme, sound);
}

export function isSoundThemeOn() {
  return readThemes().sound !== "off";
}
