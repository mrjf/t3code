import { describe, expect, it } from "vite-plus/test";

import {
  resolveProjectLook,
  resolveProjectThemeChoice,
  showsProjectWallpaper,
} from "./projectTheme";

const appearance = {
  font: "Inter",
  light: { background: "#f6f7fb", accent: "#2f5bea" },
};

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

describe("resolveProjectLook", () => {
  it("tints the user's theme with the project's colors and font", () => {
    const look = resolveProjectLook({
      choice: "project",
      projectAppearance: appearance,
      appearance: "light",
    });
    expect(look?.kind).toBe("tint");
    expect(look?.kind === "tint" ? look.variables : null).toMatchObject({
      "--background": "#f6f7fb",
      "--primary": "#2f5bea",
      "--primary-foreground": "#ffffff",
    });
  });

  it("keeps only the font when the project has no colors for this appearance", () => {
    const look = resolveProjectLook({
      choice: "project",
      projectAppearance: appearance,
      appearance: "dark",
    });
    expect(look?.kind === "tint" ? Object.keys(look.variables) : null).toEqual([
      "--project-font-sans",
    ]);
  });

  it.each([
    ["the user's theme", "none", appearance],
    ["a project without a look", "project", null],
    ["an unknown theme", "missing-theme", appearance],
  ] as const)("returns nothing for %s", (_name, choice, projectAppearance) => {
    expect(resolveProjectLook({ choice, projectAppearance, appearance: "light" })).toBeNull();
  });
});

describe("showsProjectWallpaper", () => {
  it.each([
    ["dark", "dark", true],
    ["dark", "light", true],
    ["light", "light", true],
    ["light", "dark", false],
    [undefined, "dark", false],
  ] as const)("a %s wallpaper in %s appearance: %s", (tone, mode, expected) => {
    expect(showsProjectWallpaper(tone, mode)).toBe(expected);
  });
});
