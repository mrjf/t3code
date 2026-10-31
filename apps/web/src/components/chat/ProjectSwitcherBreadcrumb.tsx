import type { EnvironmentProject } from "@t3tools/client-runtime/state/shell";
import { ChevronDownIcon } from "lucide-react";

import { ProjectFavicon } from "../ProjectFavicon";
import { ProjectSwitcherMenu } from "../ProjectSwitcherMenu";
import { WorkspaceBreadcrumbText } from "../WorkspaceBreadcrumb";

export function ProjectSwitcherBreadcrumb(props: {
  activeProject: EnvironmentProject;
  activeProjectName: string | undefined;
  onNewThreadInProject: () => void;
}) {
  return (
    <ProjectSwitcherMenu
      newThreadLabel={`New thread in ${props.activeProjectName}`}
      onNewThread={props.onNewThreadInProject}
      trigger={
        <button
          type="button"
          aria-label={`${props.activeProjectName ?? "Project"}, switch project`}
          className="inline-flex min-w-0 max-w-full cursor-pointer items-center gap-1.5 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        />
      }
    >
      <ProjectFavicon project={props.activeProject} className="size-3.5" />
      <WorkspaceBreadcrumbText className="max-w-40">
        {props.activeProjectName}
      </WorkspaceBreadcrumbText>
      <ChevronDownIcon className="size-3 shrink-0" />
    </ProjectSwitcherMenu>
  );
}
