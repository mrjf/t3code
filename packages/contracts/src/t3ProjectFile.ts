import * as Schema from "effect/Schema";
import * as SchemaTransformation from "effect/SchemaTransformation";

import { ThreadEnvMode, WorktreeSubmodules } from "./environment.ts";
import { ProjectScriptIcon } from "./project.ts";
import type { ProjectScopedServerSettingKey, ServerSettings } from "./settings.ts";

export const T3_PROJECT_FILE_NAME = "t3.json";

export const T3_PROJECT_FILE_SCHEMA_URL = "https://t3.codes/schema/t3.json";

const T3_PROJECT_FILE_PATH_MAX_LENGTH = 512;
const T3_PROJECT_FILE_MAX_SCRIPTS = 50;

// Encoded-side annotations survive into JSON Schema; decoding still trims and rejects empty strings.
const trimmedNonEmpty = (annotations: { readonly description: string }, maxLength?: number) => {
  const annotated = Schema.String.annotate(annotations);
  const encoded =
    maxLength === undefined
      ? annotated.check(Schema.isNonEmpty())
      : annotated.check(Schema.isNonEmpty(), Schema.isMaxLength(maxLength));
  return encoded.pipe(Schema.decodeTo(encoded, SchemaTransformation.trim()));
};

export const T3ProjectFileScript = Schema.Struct({
  name: trimmedNonEmpty({
    description: "Display name for the script, shown in the T3 Code scripts menu.",
  }),
  command: trimmedNonEmpty({
    description: "Shell command executed in a T3 Code terminal at the project root.",
  }),
  icon: Schema.optionalKey(
    ProjectScriptIcon.annotate({
      description: 'Icon shown next to the script in the scripts menu. Defaults to "play".',
    }),
  ),
  runOnWorktreeCreate: Schema.optionalKey(
    Schema.Boolean.annotate({
      description:
        "When true, the script runs automatically after a worktree is created for a new thread.",
    }),
  ),
  runOnSettle: Schema.optionalKey(
    Schema.Boolean.annotate({
      description:
        "When true, the script runs in the thread's worktree each time the thread settles, for example to delete build output. Threads without their own worktree skip it.",
    }),
  ),
  stopOnSettle: Schema.optionalKey(
    Schema.Boolean.annotate({
      description:
        "When true, T3 stops this action's terminal and child processes when its thread settles.",
    }),
  ),
  async: Schema.optionalKey(
    Schema.Boolean.annotate({
      description:
        "Only for runOnWorktreeCreate scripts. When true (the default), the agent starts while the script is still running. Set false to hold the agent until the script exits.",
    }),
  ),
  previewUrl: Schema.optionalKey(
    trimmedNonEmpty({
      description:
        "URL opened in the in-app browser preview when this script runs. Only honored on the desktop build.",
    }),
  ),
  autoOpenPreview: Schema.optionalKey(
    Schema.Boolean.annotate({
      description:
        "When true, automatically open the preview panel at `previewUrl` the moment the script starts.",
    }),
  ),
}).annotate({
  description: "A project script that team members can import into T3 Code.",
});
export type T3ProjectFileScript = typeof T3ProjectFileScript.Type;

const T3_PROJECT_FILE_FONT_MAX_LENGTH = 200;

export const ProjectAppearanceColor = Schema.String.check(
  Schema.isPattern(/^#[0-9a-fA-F]{6}$/),
).annotate({
  description: 'A six-digit hex color, such as "#f6f7fb".',
});

export const ProjectAppearanceColors = Schema.Struct({
  background: ProjectAppearanceColor.annotate({
    description: "Background tint for the canvas, toolbar and sidebar.",
  }),
  accent: ProjectAppearanceColor.annotate({
    description: "Accent color for primary actions and focus rings.",
  }),
});

// Repository files only: no absolute, home-relative, parent or Windows paths.
const repositoryFilePath = (extension: string) =>
  Schema.String.check(
    Schema.isMaxLength(T3_PROJECT_FILE_PATH_MAX_LENGTH),
    Schema.isPattern(
      new RegExp(`^(?![/~\\\\])(?![A-Za-z]:)(?!.*(?:^|/)\\.\\.(?:/|$))[^\\\\]+\\.${extension}$`),
    ),
  );
const ProjectArtworkPath = repositoryFilePath("svg");

export const projectFont = (description: string) =>
  Schema.optionalKey(trimmedNonEmpty({ description }, T3_PROJECT_FILE_FONT_MAX_LENGTH));

export const T3ProjectFileAppearance = Schema.Struct({
  theme: Schema.optionalKey(
    repositoryFilePath("json").annotate({
      description:
        'Workspace-relative path to a T3 Code theme file, as exported from Settings → Appearance (e.g. "assets/theme.json"). Give it light and dark variants to follow each user\'s appearance.',
    }),
  ),
  light: Schema.optionalKey(
    ProjectAppearanceColors.annotate({
      description:
        "A lighter alternative to a theme file: tints the user's own theme in light appearance.",
    }),
  ),
  dark: Schema.optionalKey(
    ProjectAppearanceColors.annotate({
      description:
        "A lighter alternative to a theme file: tints the user's own theme in dark appearance.",
    }),
  ),
  fonts: Schema.optionalKey(
    Schema.Struct({
      interface: projectFont("CSS font-family stack for interface text."),
      code: projectFont("CSS font-family stack for code, diffs and the terminal."),
    }).annotate({ description: "Fonts while this project is open; the user's sizes still apply." }),
  ),
  wallpaper: Schema.optionalKey(
    Schema.Union([
      ProjectArtworkPath,
      Schema.Struct({
        light: Schema.optionalKey(ProjectArtworkPath),
        dark: Schema.optionalKey(ProjectArtworkPath),
      }),
    ]).annotate({
      description:
        'Workspace-relative path to an SVG shown at the top of the sidebar, or { "light", "dark" } paths for each appearance.',
    }),
  ),
  wallpaperTone: Schema.optionalKey(
    Schema.Literals(["light", "dark"]).annotate({
      description:
        'For a single wallpaper: whether it is "light" or "dark", so text over it stays readable. A light wallpaper is shown only in light appearance. Defaults to "light".',
    }),
  ),
  mascot: Schema.optionalKey(
    ProjectArtworkPath.annotate({
      description: "Workspace-relative path to a small square SVG shown in the project rail.",
    }),
  ),
}).annotate({
  description:
    "How T3 Code looks while this project is open. Each user can switch it off from the project's menu.",
});
export type T3ProjectFileAppearance = typeof T3ProjectFileAppearance.Type;

export const T3ProjectFile = Schema.Struct({
  $schema: Schema.optionalKey(
    Schema.String.annotate({
      description: `URL of the JSON Schema for this file, typically "${T3_PROJECT_FILE_SCHEMA_URL}".`,
    }),
  ),
  iconPath: Schema.optionalKey(
    trimmedNonEmpty(
      {
        description:
          'Workspace-relative path to the project icon (e.g. "assets/logo.svg"). Checked before T3 Code\'s built-in icon locations.',
      },
      T3_PROJECT_FILE_PATH_MAX_LENGTH,
    ),
  ),
  defaultThreadEnvMode: Schema.optionalKey(
    ThreadEnvMode.annotate({
      description:
        'Where new threads start for this repository: "worktree" for a fresh git worktree, "local" for the current checkout. A per-project setting in T3 Code overrides this; when neither is set, the global default applies.',
    }),
  ),
  worktreeSubmodules: Schema.optionalKey(
    WorktreeSubmodules.annotate({
      description:
        'How new worktrees populate git submodules: "recursive" (the default) initializes nested submodules too, "top-level" initializes only those declared by this repository, and "none" leaves every submodule empty for a setup script to handle. A project or environment setting in T3 Code overrides this.',
    }),
  ),
  appearance: Schema.optionalKey(T3ProjectFileAppearance),
  scripts: Schema.optionalKey(
    Schema.Array(T3ProjectFileScript)
      .annotate({
        description: "Project scripts shared with everyone who opens this repository in T3 Code.",
      })
      .check(Schema.isMaxLength(T3_PROJECT_FILE_MAX_SCRIPTS)),
  ),
}).annotate({
  title: "T3 project file",
  description:
    "Checked-in project configuration for T3 Code (t3.json at the repository root). See https://t3.codes for documentation.",
});
export type T3ProjectFile = typeof T3ProjectFile.Type;

/** Keys must be nullable in ServerSettings so both environment and project overrides can inherit t3.json. */
export const PROJECT_FILE_BACKED_SETTINGS = {
  defaultThreadEnvMode: { field: "defaultThreadEnvMode", builtIn: "local" },
  worktreeSubmodules: { field: "worktreeSubmodules", builtIn: "recursive" },
} as const satisfies {
  // providerInstances overrides individual fields, so it cannot use whole-setting file inheritance.
  readonly [K in ProjectScopedServerSettingKey & keyof ServerSettings]?: {
    readonly field: {
      readonly [F in keyof T3ProjectFile]: T3ProjectFile[F] extends
        | Exclude<ServerSettings[K], null>
        | undefined
        ? F
        : never;
    }[keyof T3ProjectFile];
    readonly builtIn: Exclude<ServerSettings[K], null>;
  };
};
export type ProjectFileBackedSettingKey = keyof typeof PROJECT_FILE_BACKED_SETTINGS;

export type ResolvedServerSettings = Omit<ServerSettings, ProjectFileBackedSettingKey> & {
  readonly [K in ProjectFileBackedSettingKey]: Exclude<ServerSettings[K], null>;
};
