import { describe, expect, it } from "vite-plus/test";

import {
  parseProjectThemeFile,
  resolveProjectLayers,
  resolveProjectThemeChoice,
  resolveProjectWallpaper,
} from "./projectTheme";

const tinted = {
  fonts: { interface: "Inter" },
  light: { background: "#f6f7fb", accent: "#2f5bea" },
};
const themeFile = parseProjectThemeFile(
  JSON.stringify({ version: 1, name: "Bands", appearance: "dark", colors: { accent: "#e8431a" } }),
);

describe("resolveProjectThemeChoice", () => {
  it.each([
    ["defaults to the project's look when it has one", true, {}, "project"],
    ["defaults to the user's theme without one", false, {}, "none"],
    ["keeps a stored choice", true, { app: "ocean" }, "ocean"],
    ["drops a stored project look the project no longer has", false, { app: "project" }, "none"],
  ] as const)("%s", (_name, hasProjectLook, choices, expected) => {
    expect(resolveProjectThemeChoice("app", hasProjectLook, choices)).toBe(expected);
  });
});

describe("parseProjectThemeFile", () => {
  it("reads an exported theme file and ignores anything else", () => {
    expect(themeFile?.label).toBe("Bands");
    expect(parseProjectThemeFile("{ not json")).toBeNull();
    expect(parseProjectThemeFile(JSON.stringify({ version: 1, name: "x" }))).toBeNull();
  });
});

describe("resolveProjectLayers", () => {
  const layers = (
    choice: string,
    projectTheme = themeFile,
    projectAppearance: Parameters<typeof resolveProjectLayers>[0]["projectAppearance"] = tinted,
  ) => resolveProjectLayers({ choice, projectAppearance, projectTheme, appearance: "light" });

  it("paints the project's theme file and fonts, with no tint", () => {
    expect(layers("project")).toEqual({
      theme: themeFile,
      tint: null,
      fonts: { interface: "Inter" },
    });
  });

  it("tints the user's theme when the project has colors but no theme file", () => {
    expect(layers("project", null).tint).toMatchObject({
      "--background": "#f6f7fb",
      "--primary": "#2f5bea",
      "--primary-foreground": "#ffffff",
    });
  });

  it("uses a theme chosen for the project without the project's fonts", () => {
    expect(layers("ocean")).toMatchObject({ tint: null, fonts: null });
    expect(layers("ocean").theme?.id).toBe("ocean");
  });

  it.each([
    ["the user's theme", "none", tinted],
    ["a project without a look", "project", null],
  ] as const)("paints nothing for %s", (_name, choice, projectAppearance) => {
    expect(layers(choice, null, projectAppearance)).toEqual({
      theme: null,
      tint: null,
      fonts: null,
    });
  });
});

describe("resolveProjectWallpaper", () => {
  it.each([
    [
      "a dark single wallpaper in light",
      "art.svg",
      "dark",
      "light",
      { path: "art.svg", dark: true },
    ],
    ["a dark single wallpaper in dark", "art.svg", "dark", "dark", { path: "art.svg", dark: true }],
    [
      "a light single wallpaper in light",
      "art.svg",
      "light",
      "light",
      { path: "art.svg", dark: false },
    ],
    ["no light single wallpaper in dark", "art.svg", undefined, "dark", null],
    [
      "the light wallpaper in light",
      { light: "day.svg", dark: "night.svg" },
      undefined,
      "light",
      { path: "day.svg", dark: false },
    ],
    [
      "the dark wallpaper in dark",
      { light: "day.svg", dark: "night.svg" },
      undefined,
      "dark",
      { path: "night.svg", dark: true },
    ],
    ["nothing for a missing mode", { light: "day.svg" }, undefined, "dark", null],
  ] as const)("shows %s", (_name, wallpaper, wallpaperTone, appearance, expected) => {
    expect(
      resolveProjectWallpaper(
        { wallpaper, ...(wallpaperTone ? { wallpaperTone } : {}) },
        appearance,
      ),
    ).toEqual(expected);
  });
});
