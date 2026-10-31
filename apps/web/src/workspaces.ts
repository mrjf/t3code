import { repositoryGroupingKeyOf, type Workspace, type WorkspaceMember } from "@t3tools/contracts";

import type { EnvironmentProject } from "@t3tools/client-runtime/state/shell";

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
 * Every environment holds its own copy of a workspace; the newest copy wins and
 * is what the client shows and writes back to the rest.
 */
export function mergeWorkspaces(copies: ReadonlyArray<readonly Workspace[]>): Workspace[] {
  const byId = new Map<string, Workspace>();
  for (const list of copies) {
    for (const workspace of list) {
      if (workspace.deletedAt !== null) continue;
      const current = byId.get(workspace.id);
      if (!current || workspace.updatedAt > current.updatedAt) byId.set(workspace.id, workspace);
    }
  }
  return [...byId.values()].toSorted(
    (left, right) =>
      left.createdAt.localeCompare(right.createdAt) || left.name.localeCompare(right.name),
  );
}
