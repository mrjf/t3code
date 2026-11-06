import type { EnvironmentId } from "@t3tools/contracts";

import type { AppBarMenuItem } from "../../components/ui/AppBar.types";

export interface HomeListFilterMenuEnvironment {
  readonly environmentId: EnvironmentId;
  readonly label: string;
}

export interface HomeListFilterMenuProject {
  readonly key: string;
  readonly label: string;
}

export interface HomeListFilterMenuWorkspace {
  readonly id: string;
  readonly name: string;
}

export function buildHomeListFilterMenuItems(props: {
  readonly environments: ReadonlyArray<HomeListFilterMenuEnvironment>;
  /** Named sets of projects; empty until the user creates one. */
  readonly workspaces?: ReadonlyArray<HomeListFilterMenuWorkspace>;
  readonly activeWorkspaceId?: string | null;
  readonly onWorkspaceChange?: (workspaceId: string | null) => void;
  readonly projects: ReadonlyArray<HomeListFilterMenuProject>;
  readonly selectedEnvironmentId: EnvironmentId | null;
  readonly selectedProjectKey: string | null;
  readonly onEnvironmentChange: (environmentId: EnvironmentId | null) => void;
  readonly onProjectChange: (projectKey: string | null) => void;
}): AppBarMenuItem[] {
  const { workspaces = [], activeWorkspaceId = null, onWorkspaceChange } = props;
  const items: AppBarMenuItem[] = [
    ...(workspaces.length > 0 && onWorkspaceChange
      ? [
          {
            id: "workspace",
            title: "Workspace",
            items: [
              {
                id: "workspace:all",
                title: "All projects",
                subtitle: "Show threads from every workspace",
                selected: activeWorkspaceId === null,
                onPress: () => onWorkspaceChange(null),
              },
              ...workspaces.map((workspace) => ({
                id: `workspace:${workspace.id}`,
                title: workspace.name,
                selected: activeWorkspaceId === workspace.id,
                onPress: () => onWorkspaceChange(workspace.id),
              })),
            ],
          } satisfies AppBarMenuItem,
        ]
      : []),
    {
      id: "environment",
      title: "Environment",
      items: [
        {
          id: "environment:all",
          title: "All environments",
          subtitle: "Show threads from every environment",
          selected: props.selectedEnvironmentId === null,
          onPress: () => props.onEnvironmentChange(null),
        },
        ...props.environments.map((environment) => ({
          id: `environment:${environment.environmentId}`,
          title: environment.label,
          selected: props.selectedEnvironmentId === environment.environmentId,
          onPress: () => props.onEnvironmentChange(environment.environmentId),
        })),
      ],
    },
  ];

  if (props.projects.length > 0) {
    items.push({
      id: "project",
      title: "Project",
      items: [
        {
          id: "project:all",
          title: "All projects",
          subtitle: "Show threads from every project",
          selected: props.selectedProjectKey === null,
          onPress: () => props.onProjectChange(null),
        },
        ...props.projects.map((project) => ({
          id: `project:${project.key}`,
          title: project.label,
          selected: props.selectedProjectKey === project.key,
          onPress: () => props.onProjectChange(project.key),
        })),
      ],
    });
  }

  return items;
}
