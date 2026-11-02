# Upstream sync: instructions for the agent

You are keeping the `project-rail` branch of this fork current with upstream
`pingdotgg/t3code` while preserving every change the fork carries. Work in
`/Users/h/imbue/t3code-project-rail`.

## What the fork carries

- Workspaces: `packages/contracts/src/workspace.ts`, `ServerSettings.workspaces`,
  `packages/client-runtime/src/state/workspaces.ts`, the web rail
  (`SidebarWorkspaceRail.tsx`), header project switcher (`ProjectSwitcherMenu.tsx`,
  `SidebarChrome.tsx`), `WorkspaceDialog.tsx`, `useWorkspaces.ts`, workspace appearance
  layering in `ProjectLookProvider.tsx` and `projectTheme.ts`, the mobile
  `features/workspaces/` and Settings → Workspaces screen, and `workspace.jump.*` keybindings.
- Project appearance bundles in `t3.json` (`look`), project favicons and theme files.
- The desktop "flavor" build (`--flavor` in `scripts/build-desktop-artifact.ts`,
  `T3CODE_DESKTOP_FLAVOR` in `apps/desktop/src/app/`).
- This `fork/` directory and the "Personal flavors" section of
  `docs/operations/development.md`.

`git log --oneline origin/main..HEAD` lists the fork's commits with their intent.

## Steps

1. Run `fork/sync-upstream.sh`. Exit 0 means it merged (or there was nothing) and pushed.
   Exit 2 means conflicts; continue below. Anything else: stop and report the output.
2. For each conflicted file, read both sides. Keep upstream's change and re-apply the
   fork's intent on top of it. When upstream renamed or moved something the fork touches,
   follow the rename. When upstream added a hard-coded list the fork also extends (settings
   keys, keybinding commands, route registrations, Settings page targets), add the fork's
   entry to the new list.
3. Rebuilding is not a resolution: never drop a fork feature to make the merge easier, and
   never drop an upstream change. If the two are truly incompatible, stop and report which
   files and why.
4. `git add` the resolved files and `git commit --no-edit` to finish the merge.
5. Run `node_modules/.bin/vp run check:changed` and fix what it finds. Also run the tests
   nearest the conflicts, for example `node_modules/.bin/vp test run <files>`. Use the
   repo-local `vp`: the global one fails this repo's tests with "reading 'config'".
6. Run `fork/sync-upstream.sh --install`. It pushes the branch to the `fork` remote and
   rebuilds and reinstalls the Rail app. If the build fails, fix it, commit, and run it again.
7. Report: upstream commits merged, files that conflicted and how each was resolved, check
   results, and whether the app was reinstalled.

Run checks and tests with `env -u T3CODE_DESKTOP_FLAVOR -u ELECTRON_RUN_AS_NODE -u T3CODE_HOME`,
because a shell inside T3 Code inherits those and they change test results. A test that
fails is only the fork's problem if it passes on a clean `origin/main` checkout, so compare
before fixing. As of 2026-11-01 these fail on upstream too on this Mac:
`DesktopLinuxUrlHandler`, `ServerEnvironment`, `externalLauncher`, `AgentSessionScanner`,
`UsageService` and `GitVcsDriverCore`. Upstream tests that render a mobile component using
`useWorkspaceProjects` need that hook mocked.

`install-mac.sh` exits 3 when it runs inside the Rail app, which cannot replace itself. That
is not a failure of the sync: report that the build is ready and needs installing.

Rules: never push to `origin`. Never open a pull request. Never force-push. Commit messages
are conventional commits ending with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
Do not run a server against `~/.t3/userdata`; the Rail app uses `~/.t3-rail`.
