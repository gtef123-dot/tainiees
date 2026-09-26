#!/bin/bash
# Install everything the anidoodle plugin needs in a Claude Code on the web session:
#   - ffmpeg/ffprobe: MP4 with score, GIF, WebM, APNG, music metering (stills need only a browser)
#   - DejaVu Sans Mono: the caption font tools/compare.mjs draws with
#   - the engine's node deps (esbuild, playwright-core, typescript, remotion) plus
#     @hyperframes/engine, in the plugin's engine and in any anidoodle project in this repo
# Chromium comes with the environment (PLAYWRIGHT_BROWSERS_PATH), so nothing is downloaded for it.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

SUDO=""
if [ "$(id -u)" -ne 0 ]; then SUDO="sudo"; fi

FONT=/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf
if ! command -v ffmpeg >/dev/null || ! command -v ffprobe >/dev/null || [ ! -f "$FONT" ]; then
  echo "anidoodle: installing ffmpeg and fonts" >&2
  $SUDO apt-get update -qq >&2
  DEBIAN_FRONTEND=noninteractive $SUDO apt-get install -y -qq --no-install-recommends ffmpeg fonts-dejavu-core >&2
fi

# Idempotent: skips a directory whose deps are already there. --no-save keeps package.json and the
# lockfile untouched while adding the optional hyperframes backend alongside the declared deps.
install_engine_deps() {
  local dir="$1"
  if [ -d "$dir/node_modules/esbuild" ] && [ -d "$dir/node_modules/playwright-core" ] \
    && [ -d "$dir/node_modules/remotion" ] && [ -d "$dir/node_modules/@hyperframes/engine" ]; then
    return
  fi
  echo "anidoodle: installing node deps in $dir" >&2
  (cd "$dir" && npm install --no-save --no-audit --no-fund --prefer-offline @hyperframes/engine >&2)
}

PLUGIN_ROOT="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins/cache/alexgreensh-anidoodle/anidoodle"
ENGINE=""
if [ -d "$PLUGIN_ROOT" ]; then
  VERSION=$(ls "$PLUGIN_ROOT" | sort -V | tail -n 1)
  if [ -n "$VERSION" ] && [ -f "$PLUGIN_ROOT/$VERSION/skills/anidoodle/engine/package.json" ]; then
    ENGINE="$PLUGIN_ROOT/$VERSION/skills/anidoodle/engine"
    install_engine_deps "$ENGINE"
  fi
fi

# Projects made with engine/tools/scaffold.mjs carry the engine's package.json.
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
while IFS= read -r pkg; do
  if grep -q '"name": "anidoodle-engine"' "$pkg"; then
    install_engine_deps "$(dirname "$pkg")"
  fi
done < <(find "$PROJECT_DIR" -maxdepth 4 -name package.json -not -path "*/node_modules/*" 2>/dev/null)

echo "anidoodle: ready ($(ffmpeg -version | head -n 1 | cut -d' ' -f1-3); engine ${ENGINE:-not found, plugin not yet installed})"
