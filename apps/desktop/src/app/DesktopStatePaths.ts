import * as Option from "effect/Option";

export type JoinPath = (first: string, ...segments: string[]) => string;

function normalizeConfiguredBaseDir(t3Home: Option.Option<string>): Option.Option<string> {
  if (Option.isNone(t3Home)) {
    return Option.none();
  }
  const trimmed = t3Home.value.trim();
  return trimmed.length > 0 ? Option.some(trimmed) : Option.none();
}

/** Lower-case letters, digits and dashes, so the flavor can name files, bundle ids and app names. */
export function normalizeDesktopFlavor(flavor: Option.Option<string>): Option.Option<string> {
  return Option.flatMap(flavor, (value) => {
    const normalized = value.trim().toLowerCase();
    return /^[a-z][a-z0-9-]*$/.test(normalized) ? Option.some(normalized) : Option.none();
  });
}

export function resolveDesktopBaseDir(input: {
  readonly homeDirectory: string;
  readonly joinPath: JoinPath;
  readonly t3Home: Option.Option<string>;
  readonly flavor?: Option.Option<string>;
}): string {
  return Option.getOrElse(normalizeConfiguredBaseDir(input.t3Home), () => {
    const flavor = normalizeDesktopFlavor(input.flavor ?? Option.none());
    // A flavored build never shares ~/.t3 with the official app: two servers on one database.
    return input.joinPath(
      input.homeDirectory,
      Option.match(flavor, { onNone: () => ".t3", onSome: (value) => `.t3-${value}` }),
    );
  });
}

export function resolveDesktopStateDir(input: {
  readonly baseDir: string;
  readonly isDevelopment: boolean;
  readonly joinPath: JoinPath;
  readonly t3Home: Option.Option<string>;
}): string {
  const useDevSubdir =
    input.isDevelopment && Option.isNone(normalizeConfiguredBaseDir(input.t3Home));
  return input.joinPath(input.baseDir, useDevSubdir ? "dev" : "userdata");
}
