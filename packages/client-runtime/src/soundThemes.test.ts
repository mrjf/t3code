import { describe, expect, it } from "vite-plus/test";

import { typingSoundForEdit, typingSoundForKey } from "./soundThemes.ts";

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
