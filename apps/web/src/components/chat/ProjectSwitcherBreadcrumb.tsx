import type { EnvironmentProject } from "@t3tools/client-runtime/state/shell";
import { useGT } from "gt-react";
import { ChevronDownIcon } from "lucide-react";

import { ProjectFavicon } from "../ProjectFavicon";
import { ProjectSwitcherMenu } from "../ProjectSwitcherMenu";
import { MiddleTruncate } from "../ui/middle-truncate";

export function ProjectSwitcherBreadcrumb(props: {
  activeProject: EnvironmentProject;
  activeProjectName: string | undefined;
  onNewThreadInProject: () => void;
}) {
  const gt = useGT();
  const name = props.activeProjectName ?? gt("Project");
  return (
    <ProjectSwitcherMenu
      newThreadLabel={gt("New thread in {project}", { project: name })}
      onNewThread={props.onNewThreadInProject}
      trigger={
        <button
          type="button"
          aria-label={gt("{name}, switch project", { name })}
          className="inline-flex min-w-0 max-w-full cursor-pointer items-center gap-1.5 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        />
      }
    >
      <ProjectFavicon project={props.activeProject} className="size-3.5" />
      <MiddleTruncate
        data-slot="workspace-breadcrumb-text"
        value={props.activeProjectName ?? ""}
        showTitle={false}
        variant="cap-aligned"
      />
      <ChevronDownIcon className="size-3 shrink-0" />
    </ProjectSwitcherMenu>
  );
}
