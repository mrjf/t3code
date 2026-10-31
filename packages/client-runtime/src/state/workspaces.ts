import {
  repositoryGroupingKeyOf,
  type Workspace,
  type WorkspaceId,
  type WorkspaceMember,
  type WorkspaceWriteInput,
} from "@t3tools/contracts";

import type { EnvironmentProject } from "./models.ts";

type MemberProject = Pick<EnvironmentProject, "id" | "repositoryIdentity">;
/** The part of a project group that membership reads. */
export interface WorkspaceGroupLike {
  readonly memberProjects: ReadonlyArray<MemberProject>;
}

/** The project groups a workspace lists: any member checkout puts the whole group in. */
export function workspaceProjectGroups<TGroup extends WorkspaceGroupLike>(
  workspace: Pick<Workspace, "members">,
  groups: readonly TGroup[],
): TGroup[] {
  return groups.filter((group) => groupInWorkspace(workspace, group));
}

export function groupInWorkspace(
  workspace: Pick<Workspace, "members">,
  group: WorkspaceGroupLike,
): boolean {
  return workspace.members.some((member) =>
    group.memberProjects.some((project) => projectMatchesMember(project, member)),
  );
}

/** Keeps the projects a workspace lists; null keeps them all. */
export function filterProjectsToWorkspace<TProject extends MemberProject>(
  projects: readonly TProject[],
  workspace: Pick<Workspace, "members"> | null,
): readonly TProject[] {
  if (workspace === null) return projects;
  return projects.filter((project) =>
    workspace.members.some((member) => projectMatchesMember(project, member)),
  );
}

function projectMatchesMember(project: MemberProject, member: WorkspaceMember): boolean {
  switch (member.kind) {
    case "repository":
      return (
        project.repositoryIdentity != null &&
        repositoryGroupingKeyOf(project.repositoryIdentity) === member.key
      );
    case "project":
      return project.id === member.projectId;
  }
}

/** The member that names a group everywhere: its repository, or else each checkout by id. */
export function workspaceMembersForGroup(group: WorkspaceGroupLike): WorkspaceMember[] {
  const identity = group.memberProjects.find(
    (project) => project.repositoryIdentity != null,
  )?.repositoryIdentity;
  if (identity) return [{ kind: "repository", key: repositoryGroupingKeyOf(identity) }];
  return group.memberProjects.map((project) => ({ kind: "project", projectId: project.id }));
}

/** Toggles a group in or out of a workspace's members. */
export function toggleWorkspaceGroup(
  workspace: Pick<Workspace, "members">,
  group: WorkspaceGroupLike,
): WorkspaceMember[] {
  if (!groupInWorkspace(workspace, group)) {
    return [...workspace.members, ...workspaceMembersForGroup(group)];
  }
  return workspace.members.filter(
    (member) => !group.memberProjects.some((project) => projectMatchesMember(project, member)),
  );
}

/**
 * Every environment holds its own copy of a workspace; the newest copy of each id wins,
 * tombstones included, so a delete made while another machine was offline still sticks.
 * This is the list a client writes back to every environment.
 */
export function mergeWorkspaceCopies(copies: ReadonlyArray<readonly Workspace[]>): Workspace[] {
  const byId = new Map<string, Workspace>();
  for (const list of copies) {
    for (const workspace of list) {
      const current = byId.get(workspace.id);
      if (!current || workspace.updatedAt > current.updatedAt) byId.set(workspace.id, workspace);
    }
  }
  return [...byId.values()];
}

/** The workspaces to show: the merged copies minus tombstones, oldest first. */
export function liveWorkspaces(merged: readonly Workspace[]): Workspace[] {
  return merged
    .filter((workspace) => workspace.deletedAt === null)
    .sort(
      (left, right) =>
        left.createdAt.localeCompare(right.createdAt) || left.name.localeCompare(right.name),
    );
}

export function mergeWorkspaces(copies: ReadonlyArray<readonly Workspace[]>): Workspace[] {
  return liveWorkspaces(mergeWorkspaceCopies(copies));
}

/** The merged list with one record created or replaced. */
export function upsertWorkspace(
  merged: readonly Workspace[],
  input: WorkspaceWriteInput,
  now: string,
): Workspace[] {
  const existing = merged.find((workspace) => workspace.id === input.id);
  const record: Workspace = {
    ...input,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    deletedAt: null,
  };
  return existing
    ? merged.map((workspace) => (workspace.id === input.id ? record : workspace))
    : [...merged, record];
}

/** The merged list with one record tombstoned. */
export function removeWorkspace(
  merged: readonly Workspace[],
  id: WorkspaceId,
  now: string,
): Workspace[] {
  return merged.map((workspace) =>
    workspace.id === id ? { ...workspace, updatedAt: now, deletedAt: now } : workspace,
  );
}
