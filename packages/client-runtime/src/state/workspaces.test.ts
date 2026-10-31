import { EnvironmentId, ProjectId, WorkspaceId, type Workspace } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  groupInWorkspace,
  mergeWorkspaceCopies,
  mergeWorkspaces,
  removeWorkspace,
  toggleWorkspaceGroup,
  workspaceMembersForGroup,
  workspaceProjectGroups,
} from "./workspaces.ts";

const identity = (canonicalKey: string) => ({
  canonicalKey,
  locator: {
    source: "git-remote" as const,
    remoteName: "origin",
    remoteUrl: `https://${canonicalKey}`,
  },
});

function member(id: string, repo: string | null) {
  return {
    id: ProjectId.make(id),
    environmentId: EnvironmentId.make(`env-${id}`),
    repositoryIdentity: repo === null ? null : identity(repo),
  };
}

const t3 = {
  memberProjects: [
    member("t3-a", "github.com/pingdotgg/t3code"),
    member("t3-b", "github.com/pingdotgg/t3code"),
  ],
};
const ollama = { memberProjects: [member("ollama", "github.com/ollama/ollama")] };
const scratch = { memberProjects: [member("scratch", null)] };

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: WorkspaceId.make("ws"),
    name: "Work",
    icon: null,
    appearance: null,
    members: [],
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

describe("workspace membership", () => {
  it("lists a group when any checkout matches a repository member", () => {
    const work = workspace({
      members: [{ kind: "repository", key: "github.com/pingdotgg/t3code" }],
    });
    expect(workspaceProjectGroups(work, [t3, ollama, scratch])).toEqual([t3]);
  });

  it("matches a project without a repository by id", () => {
    const work = workspace({
      members: [{ kind: "project", projectId: ProjectId.make("scratch") }],
    });
    expect(groupInWorkspace(work, scratch)).toBe(true);
    expect(groupInWorkspace(work, t3)).toBe(false);
  });

  it("names a group by its repository, or else by each checkout", () => {
    expect(workspaceMembersForGroup(t3)).toEqual([
      { kind: "repository", key: "github.com/pingdotgg/t3code" },
    ]);
    expect(workspaceMembersForGroup(scratch)).toEqual([{ kind: "project", projectId: "scratch" }]);
  });

  it("toggles a group in and out", () => {
    const added = toggleWorkspaceGroup(workspace(), t3);
    expect(added).toEqual([{ kind: "repository", key: "github.com/pingdotgg/t3code" }]);
    expect(toggleWorkspaceGroup(workspace({ members: added }), t3)).toEqual([]);
  });
});

describe("mergeWorkspaces", () => {
  it("keeps the newest copy of each id, drops deleted ones, and orders by creation", () => {
    const older = workspace({ name: "Old name", updatedAt: "2026-10-02T00:00:00.000Z" });
    const newer = workspace({ name: "New name", updatedAt: "2026-10-03T00:00:00.000Z" });
    const personal = workspace({
      id: WorkspaceId.make("personal"),
      name: "Personal",
      createdAt: "2026-09-01T00:00:00.000Z",
    });
    const gone = workspace({
      id: WorkspaceId.make("gone"),
      deletedAt: "2026-10-04T00:00:00.000Z",
    });
    expect(
      mergeWorkspaces([
        [older, gone],
        [newer, personal],
      ]).map((w) => w.name),
    ).toEqual(["Personal", "New name"]);
  });

  it("keeps a newer tombstone over an older live copy, and writes it back", () => {
    const live = workspace({ updatedAt: "2026-10-02T00:00:00.000Z" });
    const merged = mergeWorkspaceCopies(
      [[live], [removeWorkspace([live], live.id, "2026-10-03T00:00:00.000Z")]].map((list) =>
        list.flat(),
      ),
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.deletedAt).toBe("2026-10-03T00:00:00.000Z");
    expect(mergeWorkspaces([merged])).toEqual([]);
  });
});
