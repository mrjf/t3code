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

export const SOUND_EVENT_GROUPS = {
  agent: "Agent",
  requests: "Requests",
  threads: "Threads",
  composer: "Composer",
  drag: "Drag and drop",
  git: "Git",
  interface: "Interface",
} as const;
export type SoundEventGroup = keyof typeof SOUND_EVENT_GROUPS;

interface SoundEventInfo {
  readonly group: SoundEventGroup;
  readonly label: string;
  /** Frequent interface sounds start off; every event can be switched either way. */
  readonly defaultEnabled: boolean;
}

export const SOUND_EVENT_INFO = {
  send: { group: "agent", label: "Message sent", defaultEnabled: true },
  queue: { group: "agent", label: "Follow-up queued", defaultEnabled: true },
  interrupt: { group: "agent", label: "Turn stopped", defaultEnabled: true },
  complete: { group: "agent", label: "Thread finished", defaultEnabled: true },
  input: { group: "agent", label: "Needs input", defaultEnabled: true },
  approval: { group: "agent", label: "Needs approval", defaultEnabled: true },
  error: { group: "agent", label: "Failed or limited", defaultEnabled: true },
  approve: { group: "requests", label: "Approved", defaultEnabled: true },
  decline: { group: "requests", label: "Declined", defaultEnabled: true },
  answer: { group: "requests", label: "Question answered", defaultEnabled: true },
  newThread: { group: "threads", label: "New thread", defaultEnabled: true },
  archive: { group: "threads", label: "Archived", defaultEnabled: true },
  unarchive: { group: "threads", label: "Unarchived", defaultEnabled: true },
  delete: { group: "threads", label: "Deleted", defaultEnabled: true },
  pin: { group: "threads", label: "Pinned", defaultEnabled: true },
  unpin: { group: "threads", label: "Unpinned", defaultEnabled: true },
  snooze: { group: "threads", label: "Snoozed", defaultEnabled: true },
  unsnooze: { group: "threads", label: "Woken", defaultEnabled: true },
  settle: { group: "threads", label: "Settled", defaultEnabled: true },
  unsettle: { group: "threads", label: "Unsettled", defaultEnabled: true },
  rename: { group: "threads", label: "Renamed", defaultEnabled: true },
  fork: { group: "threads", label: "Forked", defaultEnabled: true },
  revert: { group: "threads", label: "Rewound", defaultEnabled: true },
  undo: { group: "threads", label: "Undo", defaultEnabled: true },
  attach: { group: "composer", label: "Attachment added", defaultEnabled: true },
  modelChange: { group: "composer", label: "Model changed", defaultEnabled: false },
  modeChange: { group: "composer", label: "Mode changed", defaultEnabled: false },
  dragStart: { group: "drag", label: "Drag started", defaultEnabled: true },
  drop: { group: "drag", label: "Dropped", defaultEnabled: true },
  commit: { group: "git", label: "Commit", defaultEnabled: true },
  push: { group: "git", label: "Push", defaultEnabled: true },
  pullRequest: { group: "git", label: "Pull request", defaultEnabled: true },
  branchSwitch: { group: "git", label: "Branch switched", defaultEnabled: true },
  copy: { group: "interface", label: "Copied", defaultEnabled: false },
  toast: { group: "interface", label: "Toast", defaultEnabled: false },
  palette: { group: "interface", label: "Command palette", defaultEnabled: false },
  panelOpen: { group: "interface", label: "Panel opened", defaultEnabled: false },
  panelClose: { group: "interface", label: "Panel closed", defaultEnabled: false },
  switchOn: { group: "interface", label: "Switch on", defaultEnabled: false },
  switchOff: { group: "interface", label: "Switch off", defaultEnabled: false },
  terminal: { group: "interface", label: "Terminal opened", defaultEnabled: false },
} as const satisfies Record<string, SoundEventInfo>;

export type SoundEvent = keyof typeof SOUND_EVENT_INFO;
export const SOUND_EVENTS = Object.keys(SOUND_EVENT_INFO) as ReadonlyArray<SoundEvent>;

/** `overrides` is sparse: missing ids use the default, so new events reach everyone. */
export function isSoundEventEnabled(
  event: SoundEvent,
  overrides: Readonly<Record<string, boolean>>,
): boolean {
  return overrides[event] ?? SOUND_EVENT_INFO[event].defaultEnabled;
}

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

/** Stacked git actions sound as their furthest step. */
export function gitActionSoundEvent(action: string): SoundEvent {
  if (action.endsWith("pr")) return "pullRequest";
  if (action.endsWith("push")) return "push";
  return "commit";
}

let player: ((event: SoundEvent) => void) | null = null;

/**
 * Each client installs its player at startup. Call sites only emit, so UI
 * primitives and tests never load audio or settings.
 */
export function setSoundPlayer(next: ((event: SoundEvent) => void) | null): void {
  player = next;
}

export function playSound(event: SoundEvent): void {
  player?.(event);
}
