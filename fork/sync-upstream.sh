#!/bin/sh
# Merge upstream main into this fork's branch and push the branch to the fork.
#
#   fork/sync-upstream.sh            merge and push
#   fork/sync-upstream.sh --build    also rebuild the Rail app after a clean merge
#
# This never installs, because installing quits the running app. Install by hand with
# fork/install-mac.sh --skip-build. --install is an old name for --build, kept because the
# scheduled sync task in T3 Code (Beta) still passes it.
#
# Exit codes: 0 merged (or nothing to merge), 2 merge conflicts left in progress, 1 other failure.
set -eu

repo=$(cd "$(dirname "$0")/.." && pwd)
branch=project-rail
upstream=origin
fork=fork
build=0
for arg in "$@"; do
  case "$arg" in
    --build|--install) build=1 ;;
    *) echo "unknown argument: $arg" >&2; exit 1 ;;
  esac
done

cd "$repo"

if [ "$(git rev-parse --abbrev-ref HEAD)" != "$branch" ]; then
  echo "sync-upstream: expected branch $branch, on $(git rev-parse --abbrev-ref HEAD)" >&2
  exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
  echo "sync-upstream: working tree is not clean; commit or stash first" >&2
  git status --short >&2
  exit 1
fi

git fetch "$upstream" main
git fetch "$fork" "$branch" || true

behind=$(git rev-list --count "HEAD..$upstream/main")
if [ "$behind" = "0" ]; then
  echo "sync-upstream: already up to date with $upstream/main"
else
  echo "sync-upstream: merging $behind upstream commit(s)"
  if ! git merge --no-edit "$upstream/main"; then
    echo "" >&2
    echo "sync-upstream: merge conflicts. Resolve them keeping both upstream's change and this" >&2
    echo "fork's intent (see fork/UPSTREAM-SYNC.md), then: git commit && $0 $*" >&2
    git diff --name-only --diff-filter=U >&2
    exit 2
  fi
fi

git push "$fork" "$branch"

if [ "$build" = "1" ]; then
  exec "$repo/fork/install-mac.sh" --build-only
fi
