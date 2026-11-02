#!/bin/sh
# Build the Rail flavor of the desktop app and install it into /Applications.
#
#   fork/install-mac.sh               build, then install
#   fork/install-mac.sh --skip-build  install the zip already in release/
#   fork/install-mac.sh --build-only  build the zip and stop; the running app is not touched
#
# Installing quits the app if it is running and relaunches it afterwards, so only do that when
# Russell asks. Its data lives in ~/.t3-rail and is untouched.
set -eu

# A shell spawned by T3 Code itself carries this, and `open` forwards it, which makes the new
# app run as plain Node and exit at once.
unset ELECTRON_RUN_AS_NODE

repo=$(cd "$(dirname "$0")/.." && pwd)
flavor=rail
app_name="T3 Code (Rail)"
bundle_id="com.t3tools.t3code.$flavor"
destination="/Applications/$app_name.app"
skip_build=0
build_only=0
for arg in "$@"; do
  case "$arg" in
    --skip-build) skip_build=1 ;;
    --build-only) build_only=1 ;;
    *) echo "unknown argument: $arg" >&2; exit 1 ;;
  esac
done

if [ "$skip_build" = "1" ] && [ "$build_only" = "1" ]; then
  echo "install-mac: --skip-build and --build-only together do nothing" >&2
  exit 1
fi

cd "$repo"

if [ "$skip_build" = "0" ]; then
  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck disable=SC1091
    . "$HOME/.nvm/nvm.sh"
    nvm use "$(node -e 'console.log(require("./package.json").engines.node)')" >/dev/null
  fi
  node_modules/.bin/vp i --frozen-lockfile
  # The repo-local vp; the global one may pair with a different vitest and vite.
  node_modules/.bin/vp run dist:desktop:dmg --flavor "$flavor"
fi

zip=$(ls -t "$repo"/release/T3-Code-"$flavor"-*-arm64.zip 2>/dev/null | head -n 1 || true)
if [ -z "$zip" ]; then
  echo "install-mac: no release/T3-Code-$flavor-*-arm64.zip to install" >&2
  exit 1
fi

if [ "$build_only" = "1" ]; then
  echo "install-mac: built $zip. Install it when ready with: $repo/fork/install-mac.sh --skip-build"
  exit 0
fi

stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT
ditto -x -k "$zip" "$stage"
built="$stage/$app_name.app"
if [ ! -d "$built" ]; then
  echo "install-mac: $zip did not contain $app_name.app" >&2
  exit 1
fi

# The Rail app sets this for everything it spawns, and a shell inside the app dies with it, so
# quitting the app here would strand the install. Do not probe for the process: pgrep can see
# nothing from a sandboxed shell.
if [ "${T3CODE_DESKTOP_FLAVOR:-}" = "$flavor" ]; then
  echo "install-mac: running inside $app_name, which cannot replace itself." >&2
  echo "install-mac: the build is ready. Run this from Terminal or T3 Code (Beta):" >&2
  echo "  $repo/fork/install-mac.sh --skip-build" >&2
  exit 3
fi

was_running=0
if osascript -e "tell application id \"$bundle_id\" to if it is running then return 1" 2>/dev/null | grep -q 1; then
  was_running=1
  echo "install-mac: quitting $app_name"
  osascript -e "tell application id \"$bundle_id\" to quit" || true
  tries=0
  while ps -axo command= | grep -F "$destination/Contents/MacOS/" | grep -qv grep; do
    tries=$((tries + 1))
    if [ "$tries" -gt 60 ]; then
      echo "install-mac: $app_name did not quit" >&2
      exit 1
    fi
    sleep 0.5
  done
fi

# Replace atomically: a half-copied bundle would launch broken.
rm -rf "$destination.installing"
ditto "$built" "$destination.installing"
rm -rf "$destination"
mv "$destination.installing" "$destination"
# Gatekeeper quarantine is not set by ditto, but clear it in case the zip carried it.
xattr -dr com.apple.quarantine "$destination" 2>/dev/null || true
# The unsigned build has no bundle signature, which Apple Silicon refuses to launch (it dies
# silently). An ad-hoc signature is enough for a locally built app.
codesign --force --deep --sign - "$destination"
codesign --verify --deep --strict "$destination"

version=$(defaults read "$destination/Contents/Info.plist" CFBundleShortVersionString)
echo "install-mac: installed $app_name $version at $destination"

# Launch Services does not know the bundle id until a first launch, so open by path.
if [ "$was_running" = "1" ] || [ -t 1 ]; then
  open "$destination"
fi
