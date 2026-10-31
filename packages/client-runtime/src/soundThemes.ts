import type { SoundTheme } from "@t3tools/contracts/settings";

export type ActiveSoundTheme = Exclude<SoundTheme, "off">;

export const SOUND_THEME_LABELS = {
  off: "Off",
  crispy: "Crispy",
  gooey: "Gooey",
} satisfies Record<SoundTheme, string>;

export const SOUND_THEME_DESCRIPTIONS = {
  crispy: "Bright ticks, zips and dings.",
  gooey: "Soft pops, drips and a kalimba.",
} satisfies Record<ActiveSoundTheme, string>;

export const SOUND_EVENTS = [
  "send",
  "interrupt",
  "complete",
  "input",
  "approval",
  "error",
] as const;
export type SoundEvent = (typeof SOUND_EVENTS)[number];

export const SOUND_EVENT_LABELS = {
  send: "Send",
  interrupt: "Stop",
  complete: "Done",
  input: "Input",
  approval: "Approval",
  error: "Error",
} satisfies Record<SoundEvent, string>;

export type TypingSound = "key" | "space" | "enter" | "delete";

/** Keys that type something; navigation and modifier keys stay silent. */
export function typingSoundForKey(key: string): TypingSound | null {
  if (key === " ") return "space";
  if (key === "Enter") return "enter";
  if (key === "Backspace" || key === "Delete") return "delete";
  return [...key].length === 1 ? "key" : null;
}

/**
 * For editors that report text instead of keys. A deletion clicks, one typed
 * character clicks by kind, and larger inserts such as pastes and autocorrect stay silent.
 */
export function typingSoundForEdit(previous: string, next: string): TypingSound | null {
  if (next.length < previous.length) return "delete";
  if (next.length === previous.length || next.length - previous.length > 2) return null;
  let index = 0;
  while (index < previous.length && previous[index] === next[index]) index += 1;
  const inserted = next.slice(index, index + next.length - previous.length);
  if (inserted === "\n") return "enter";
  return typingSoundForKey(inserted);
}

/** The sound for a thread that needs attention, by the status that raised it. */
export function attentionSoundEvent(status: string): SoundEvent {
  if (status === "approval") return "approval";
  if (status === "failed" || status === "limited") return "error";
  return "input";
}
