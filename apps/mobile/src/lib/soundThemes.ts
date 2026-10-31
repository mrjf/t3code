import {
  type ActiveSoundTheme,
  isSoundEventEnabled,
  setSoundPlayer,
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

type SoundFile = SoundEvent | `typing-${TypingSound}`;

// Rendered by scripts/render-sound-themes.py.
const SOUND_ASSETS: Record<ActiveSoundTheme, Record<SoundFile, number>> = {
  crispy: {
    answer: require("../../assets/sounds/crispy/answer.mp3"),
    approval: require("../../assets/sounds/crispy/approval.mp3"),
    approve: require("../../assets/sounds/crispy/approve.mp3"),
    archive: require("../../assets/sounds/crispy/archive.mp3"),
    attach: require("../../assets/sounds/crispy/attach.mp3"),
    branchSwitch: require("../../assets/sounds/crispy/branchSwitch.mp3"),
    commit: require("../../assets/sounds/crispy/commit.mp3"),
    complete: require("../../assets/sounds/crispy/complete.mp3"),
    copy: require("../../assets/sounds/crispy/copy.mp3"),
    decline: require("../../assets/sounds/crispy/decline.mp3"),
    delete: require("../../assets/sounds/crispy/delete.mp3"),
    dragStart: require("../../assets/sounds/crispy/dragStart.mp3"),
    drop: require("../../assets/sounds/crispy/drop.mp3"),
    error: require("../../assets/sounds/crispy/error.mp3"),
    fork: require("../../assets/sounds/crispy/fork.mp3"),
    input: require("../../assets/sounds/crispy/input.mp3"),
    interrupt: require("../../assets/sounds/crispy/interrupt.mp3"),
    modeChange: require("../../assets/sounds/crispy/modeChange.mp3"),
    modelChange: require("../../assets/sounds/crispy/modelChange.mp3"),
    newThread: require("../../assets/sounds/crispy/newThread.mp3"),
    palette: require("../../assets/sounds/crispy/palette.mp3"),
    panelClose: require("../../assets/sounds/crispy/panelClose.mp3"),
    panelOpen: require("../../assets/sounds/crispy/panelOpen.mp3"),
    pin: require("../../assets/sounds/crispy/pin.mp3"),
    pullRequest: require("../../assets/sounds/crispy/pullRequest.mp3"),
    push: require("../../assets/sounds/crispy/push.mp3"),
    queue: require("../../assets/sounds/crispy/queue.mp3"),
    rename: require("../../assets/sounds/crispy/rename.mp3"),
    revert: require("../../assets/sounds/crispy/revert.mp3"),
    send: require("../../assets/sounds/crispy/send.mp3"),
    settle: require("../../assets/sounds/crispy/settle.mp3"),
    snooze: require("../../assets/sounds/crispy/snooze.mp3"),
    switchOff: require("../../assets/sounds/crispy/switchOff.mp3"),
    switchOn: require("../../assets/sounds/crispy/switchOn.mp3"),
    terminal: require("../../assets/sounds/crispy/terminal.mp3"),
    toast: require("../../assets/sounds/crispy/toast.mp3"),
    "typing-delete": require("../../assets/sounds/crispy/typing-delete.mp3"),
    "typing-enter": require("../../assets/sounds/crispy/typing-enter.mp3"),
    "typing-key": require("../../assets/sounds/crispy/typing-key.mp3"),
    "typing-space": require("../../assets/sounds/crispy/typing-space.mp3"),
    unarchive: require("../../assets/sounds/crispy/unarchive.mp3"),
    undo: require("../../assets/sounds/crispy/undo.mp3"),
    unpin: require("../../assets/sounds/crispy/unpin.mp3"),
    unsettle: require("../../assets/sounds/crispy/unsettle.mp3"),
    unsnooze: require("../../assets/sounds/crispy/unsnooze.mp3"),
  },
  gooey: {
    answer: require("../../assets/sounds/gooey/answer.mp3"),
    approval: require("../../assets/sounds/gooey/approval.mp3"),
    approve: require("../../assets/sounds/gooey/approve.mp3"),
    archive: require("../../assets/sounds/gooey/archive.mp3"),
    attach: require("../../assets/sounds/gooey/attach.mp3"),
    branchSwitch: require("../../assets/sounds/gooey/branchSwitch.mp3"),
    commit: require("../../assets/sounds/gooey/commit.mp3"),
    complete: require("../../assets/sounds/gooey/complete.mp3"),
    copy: require("../../assets/sounds/gooey/copy.mp3"),
    decline: require("../../assets/sounds/gooey/decline.mp3"),
    delete: require("../../assets/sounds/gooey/delete.mp3"),
    dragStart: require("../../assets/sounds/gooey/dragStart.mp3"),
    drop: require("../../assets/sounds/gooey/drop.mp3"),
    error: require("../../assets/sounds/gooey/error.mp3"),
    fork: require("../../assets/sounds/gooey/fork.mp3"),
    input: require("../../assets/sounds/gooey/input.mp3"),
    interrupt: require("../../assets/sounds/gooey/interrupt.mp3"),
    modeChange: require("../../assets/sounds/gooey/modeChange.mp3"),
    modelChange: require("../../assets/sounds/gooey/modelChange.mp3"),
    newThread: require("../../assets/sounds/gooey/newThread.mp3"),
    palette: require("../../assets/sounds/gooey/palette.mp3"),
    panelClose: require("../../assets/sounds/gooey/panelClose.mp3"),
    panelOpen: require("../../assets/sounds/gooey/panelOpen.mp3"),
    pin: require("../../assets/sounds/gooey/pin.mp3"),
    pullRequest: require("../../assets/sounds/gooey/pullRequest.mp3"),
    push: require("../../assets/sounds/gooey/push.mp3"),
    queue: require("../../assets/sounds/gooey/queue.mp3"),
    rename: require("../../assets/sounds/gooey/rename.mp3"),
    revert: require("../../assets/sounds/gooey/revert.mp3"),
    send: require("../../assets/sounds/gooey/send.mp3"),
    settle: require("../../assets/sounds/gooey/settle.mp3"),
    snooze: require("../../assets/sounds/gooey/snooze.mp3"),
    switchOff: require("../../assets/sounds/gooey/switchOff.mp3"),
    switchOn: require("../../assets/sounds/gooey/switchOn.mp3"),
    terminal: require("../../assets/sounds/gooey/terminal.mp3"),
    toast: require("../../assets/sounds/gooey/toast.mp3"),
    "typing-delete": require("../../assets/sounds/gooey/typing-delete.mp3"),
    "typing-enter": require("../../assets/sounds/gooey/typing-enter.mp3"),
    "typing-key": require("../../assets/sounds/gooey/typing-key.mp3"),
    "typing-space": require("../../assets/sounds/gooey/typing-space.mp3"),
    unarchive: require("../../assets/sounds/gooey/unarchive.mp3"),
    undo: require("../../assets/sounds/gooey/undo.mp3"),
    unpin: require("../../assets/sounds/gooey/unpin.mp3"),
    unsettle: require("../../assets/sounds/gooey/unsettle.mp3"),
    unsnooze: require("../../assets/sounds/gooey/unsnooze.mp3"),
  },
};

const players = new Map<number, AudioPlayer>();

function playFile(theme: SoundTheme, sound: SoundFile) {
  if (theme === "off") return;
  const asset = SOUND_ASSETS[theme][sound];
  let player = players.get(asset);
  if (!player) {
    player = createAudioPlayer(asset);
    players.set(asset, player);
  }
  playInterfaceSound(player);
}

function readSoundPreferences() {
  const preferences = appAtomRegistry.get(mobilePreferencesAtom);
  const value = AsyncResult.isSuccess(preferences) ? preferences.value : {};
  return {
    sound: value.soundTheme ?? "off",
    typing: value.typingSoundTheme ?? "off",
    events: value.soundEvents ?? {},
  };
}

function playThemeSound(event: SoundEvent) {
  const { sound, events } = readSoundPreferences();
  if (isSoundEventEnabled(event, events)) playFile(sound, event);
}

export function playTypingSound(previous: string, next: string) {
  const theme = readSoundPreferences().typing;
  const typing = theme === "off" ? null : typingSoundForEdit(previous, next);
  if (typing) playFile(theme, `typing-${typing}`);
}

export function previewSound(theme: SoundTheme, sound: SoundFile) {
  playFile(theme, sound);
}

export function isSoundThemeOn() {
  return readSoundPreferences().sound !== "off";
}

export function installSoundThemes(): () => void {
  setSoundPlayer(playThemeSound);
  return () => setSoundPlayer(null);
}
