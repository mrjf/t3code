import { describe, expect, it } from "vite-plus/test";

import {
  gitActionSoundEvent,
  isSoundEventEnabled,
  typingSoundForEdit,
  typingSoundForKey,
} from "./soundThemes.ts";

describe("typingSoundForKey", () => {
  it.each([
    ["a", "key"],
    ["😀", "key"],
    [" ", "space"],
    ["Enter", "enter"],
    ["Backspace", "delete"],
    ["Delete", "delete"],
    ["Shift", null],
    ["ArrowLeft", null],
  ] as const)("%s -> %s", (key, sound) => {
    expect(typingSoundForKey(key)).toBe(sound);
  });
});

describe("typingSoundForEdit", () => {
  it.each([
    ["hell", "hello", "key"],
    ["hello", "hel lo", "space"],
    ["hello", "hello\n", "enter"],
    ["hi", "hi😀", "key"],
    ["hello", "hell", "delete"],
    ["hello world", "hello ", "delete"],
    ["hello", "hello", null],
    ["", "pasted text", null],
    ["teh", "the", null],
  ] as const)("%j -> %j is %s", (previous, next, sound) => {
    expect(typingSoundForEdit(previous, next)).toBe(sound);
  });
});

describe("isSoundEventEnabled", () => {
  it("uses the event's default until the user overrides it", () => {
    expect(isSoundEventEnabled("complete", {})).toBe(true);
    expect(isSoundEventEnabled("toast", {})).toBe(false);
    expect(isSoundEventEnabled("complete", { complete: false })).toBe(false);
    expect(isSoundEventEnabled("toast", { toast: true })).toBe(true);
  });
});

describe("gitActionSoundEvent", () => {
  it.each([
    ["commit", "commit"],
    ["push", "push"],
    ["commit_push", "push"],
    ["create_pr", "pullRequest"],
    ["commit_push_pr", "pullRequest"],
  ] as const)("%s -> %s", (action, event) => {
    expect(gitActionSoundEvent(action)).toBe(event);
  });
});
