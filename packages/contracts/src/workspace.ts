import * as Schema from "effect/Schema";

import { IsoDateTime, ProjectId, TrimmedNonEmptyString, WorkspaceId } from "./baseSchemas.ts";
import { ProjectAppearanceColors, projectFont } from "./t3ProjectFile.ts";

/**
 * A workspace names a set of projects across machines and carries its own look.
 * Every environment stores the same record under the same id, so clients merge them.
 */
export const WorkspaceMember = Schema.Union([
  /** Every checkout of a repository, on any machine: the repository grouping key. */
  Schema.Struct({ kind: Schema.Literal("repository"), key: TrimmedNonEmptyString }),
  /** One project on one machine; other machines ignore ids they do not have. */
  Schema.Struct({ kind: Schema.Literal("project"), projectId: ProjectId }),
]);
export type WorkspaceMember = typeof WorkspaceMember.Type;

export const WorkspaceAppearance = Schema.Struct({
  /** A built-in theme id, painted in place of the user's theme. */
  theme: Schema.optionalKey(TrimmedNonEmptyString),
  light: Schema.optionalKey(ProjectAppearanceColors),
  dark: Schema.optionalKey(ProjectAppearanceColors),
  fonts: Schema.optionalKey(
    Schema.Struct({
      interface: projectFont("CSS font-family stack for interface text."),
      code: projectFont("CSS font-family stack for code, diffs and the terminal."),
    }),
  ),
});
export type WorkspaceAppearance = typeof WorkspaceAppearance.Type;

export const WORKSPACE_NAME_MAX_LENGTH = 60;
export const WorkspaceName = TrimmedNonEmptyString.check(
  Schema.isMaxLength(WORKSPACE_NAME_MAX_LENGTH),
);

/** A short glyph for the rail: one emoji or up to two letters. */
export const WorkspaceIcon = TrimmedNonEmptyString.check(Schema.isMaxLength(8));

export const Workspace = Schema.Struct({
  id: WorkspaceId,
  name: WorkspaceName,
  icon: Schema.NullOr(WorkspaceIcon),
  appearance: Schema.NullOr(WorkspaceAppearance),
  members: Schema.Array(WorkspaceMember),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
  deletedAt: Schema.NullOr(IsoDateTime),
});
export type Workspace = typeof Workspace.Type;

export const WorkspaceWriteInput = Schema.Struct({
  id: WorkspaceId,
  name: WorkspaceName,
  icon: Schema.NullOr(WorkspaceIcon),
  appearance: Schema.NullOr(WorkspaceAppearance),
  members: Schema.Array(WorkspaceMember),
});
export type WorkspaceWriteInput = typeof WorkspaceWriteInput.Type;
