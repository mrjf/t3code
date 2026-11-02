# Running this fork as your own app

This branch (`project-rail`) adds workspaces and the project switcher on top of
upstream [pingdotgg/t3code](https://github.com/pingdotgg/t3code). It is built as the
**T3 Code (Rail)** flavor, which installs beside the official T3 Code (Beta) and keeps its
own state in `~/.t3-rail`, so both apps run at the same time without sharing a database.

Remotes:

- `origin` is upstream `pingdotgg/t3code`. Never push there.
- `fork` is `mrjf/t3code`. The branch lives there.

## Everyday commands

Build the app and install it into `/Applications`, relaunching it if it was open:

```sh
fork/install-mac.sh
```

Install the latest finished build without rebuilding, from Terminal or T3 Code (Beta):

```sh
fork/install-mac.sh --skip-build
```

Pull in upstream, merge it into this branch, and push the result to the fork:

```sh
fork/sync-upstream.sh
```

Add `--build` to rebuild the app after a clean merge. It never installs, so the running app
is left alone until you choose to install. The script stops with exit
code 2 and leaves the merge in progress when there are conflicts; resolve them (or hand the
conflict to an agent with `fork/UPSTREAM-SYNC.md`), commit, and run it again.

Both scripts expect the Node version from `package.json` through nvm. Run
tests and `check:changed` with the repo-local `node_modules/.bin/vp`; the global `vp` fails
this repo's tests with "Cannot read properties of undefined (reading 'config')".

## The flavor

`vp run dist:desktop:dmg --flavor rail` is what `install-mac.sh` runs. The flavor changes
only packaging and the app's identity (see `docs/operations/development.md`, "Personal
flavors"); the feature code is identical to a plain build. The `t3` command for this app is
`~/.t3-rail/bin/t3`.

Automatic updates are off in a flavored build. Upstream releases arrive through
`sync-upstream.sh`, which a scheduled T3 Code task runs every morning with an agent to
resolve conflicts. The task builds and pushes; you install.
