import * as Schema from "effect/Schema";
import { describe, expect, it } from "vite-plus/test";

import { parseT3ProjectFile, T3ProjectFileFromJson } from "./t3ProjectFile.ts";

const decodeJson = Schema.decodeUnknownSync(T3ProjectFileFromJson);

describe("T3ProjectFileFromJson", () => {
  it("decodes lenient JSONC with comments and trailing commas", () => {
    const decoded = decodeJson(`{
      // team scripts
      "iconPath": "assets/logo.svg",
      "scripts": [
        { "name": "Dev", "command": "pnpm dev", "stopOnSettle": true, },
      ],
    }`);

    expect(decoded.iconPath).toBe("assets/logo.svg");
    expect(decoded.scripts?.[0]).toEqual({ name: "Dev", command: "pnpm dev", stopOnSettle: true });
  });
});

describe("parseT3ProjectFile", () => {
  it("reads project defaults from JSONC with a URL in a block comment", () => {
    expect(
      parseT3ProjectFile(`{
        /* See https://t3.codes/schema/t3.json */
        "defaultThreadEnvMode": "worktree"
      }`),
    ).toEqual({ defaultThreadEnvMode: "worktree" });
  });

  it("reads an appearance and keeps its files inside the repository", () => {
    const appearance = (wallpaper: unknown, theme = "assets/theme.json") =>
      parseT3ProjectFile(`{
        // brand
        "appearance": {
          "theme": ${JSON.stringify(theme)},
          "fonts": { "interface": "Inter, sans-serif", "code": "Berkeley Mono" },
          "light": { "background": "#f6f7fb", "accent": "#2f5bea" },
          "wallpaper": ${JSON.stringify(wallpaper)},
          "wallpaperTone": "dark",
        },
      }`)?.appearance;

    expect(appearance({ light: "assets/day.svg", dark: "assets/night.svg" })).toEqual({
      theme: "assets/theme.json",
      fonts: { interface: "Inter, sans-serif", code: "Berkeley Mono" },
      light: { background: "#f6f7fb", accent: "#2f5bea" },
      wallpaper: { light: "assets/day.svg", dark: "assets/night.svg" },
      wallpaperTone: "dark",
    });
    for (const outside of [
      "/etc/passwd.svg",
      "~/.ssh/key.svg",
      "../other/art.svg",
      "assets/../../art.svg",
      "C:/art.svg",
      "assets\\art.svg",
      "assets/wallpaper.png",
      { dark: "/etc/night.svg" },
    ]) {
      expect(appearance(outside)).toBeUndefined();
    }
    expect(appearance("assets/wallpaper.svg", "../theme.json")).toBeUndefined();
  });
});
