import {
  EnvironmentId,
  ProjectId,
  ProviderInstanceId,
  type ModelSelection,
} from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";
import {
  resolveNewThreadModelSelectionOverride,
  resolveScopedNewThreadProjectRef,
} from "./chatThreadActions";

const PROJECT_DEFAULT_SELECTION: ModelSelection = {
  instanceId: ProviderInstanceId.make("codex"),
  model: "project-default",
};
const CARRIED_SELECTION: ModelSelection = {
  instanceId: ProviderInstanceId.make("codex"),
  model: "carried-model",
};

describe("chatThreadActions", () => {
  it("does not carry a non-explicit model from the destination draft back into itself", () => {
    expect(
      resolveNewThreadModelSelectionOverride({
        projectDefaultSelection: null,
        carrySelection: CARRIED_SELECTION,
        carrySourceDraftId: "draft-a",
        destinationDraftId: "draft-a",
      }),
    ).toBeNull();
  });

  it("keeps the project default above any carried selection", () => {
    expect(
      resolveNewThreadModelSelectionOverride({
        projectDefaultSelection: PROJECT_DEFAULT_SELECTION,
        carrySelection: CARRIED_SELECTION,
        carrySourceDraftId: "draft-a",
        destinationDraftId: "draft-b",
      }),
    ).toEqual(PROJECT_DEFAULT_SELECTION);
  });
});

describe("resolveScopedNewThreadProjectRef", () => {
  const laptop = EnvironmentId.make("laptop");
  const server = EnvironmentId.make("server");
  const app = ProjectId.make("app");
  const appOnServer = ProjectId.make("app-server");
  const other = ProjectId.make("other");
  const group = (archived = false) => ({
    projectKey: "github.com/acme/app",
    archived,
    environmentId: laptop,
    id: app,
    memberProjectRefs: [
      { environmentId: laptop, projectId: app },
      { environmentId: server, projectId: appOnServer },
    ],
  });
  const context = (activeThread?: { environmentId: EnvironmentId; projectId: ProjectId }) => ({
    activeThread,
    activeDraftThread: null,
    defaultProjectRef: null,
  });

  it.each([
    ["no scope", [], [group()], context(), null],
    ["several projects", ["github.com/acme/app", "x"], [group()], context(), null],
    ["an archived project", ["github.com/acme/app"], [group(true)], context(), null],
    ["a missing project", ["gone"], [group()], context(), null],
    [
      "the open thread's machine when it belongs to the project",
      ["github.com/acme/app"],
      [group()],
      context({ environmentId: server, projectId: appOnServer }),
      { environmentId: server, projectId: appOnServer },
    ],
    [
      "the project's primary checkout when the open thread is elsewhere",
      ["github.com/acme/app"],
      [group()],
      context({ environmentId: laptop, projectId: other }),
      { environmentId: laptop, projectId: app },
    ],
  ] as const)("resolves %s", (_name, scopeKeys, groups, threadContext, expected) => {
    expect(resolveScopedNewThreadProjectRef(groups, scopeKeys, threadContext)).toEqual(expected);
  });
});
