#!/usr/bin/env bash
# sync-sessions.sh — copy Claude Code session logs for the current project into ./.sessions/
#
# Claude Code stores per-project session JSONL logs under:
#   ~/.claude/projects/<cwd-with-slashes-as-dashes>/<sessionid>.jsonl
#
# This script:
#   1. Resolves the encoded path for the current working directory (or $1 if given)
#   2. Finds the matching ~/.claude/projects/ subdirectory
#   3. Mirrors all *.jsonl files + agent subdirectories into <cwd>/.sessions/
#
# It is portable — drop it into any project and it works without modification.
#
# Usage:
#   ./scripts/sync-sessions.sh                # sync current cwd
#   ./scripts/sync-sessions.sh /some/proj     # sync a specific path
#   ./scripts/sync-sessions.sh --list         # list session files for cwd without copying
#   ./scripts/sync-sessions.sh --since 7d     # only sync logs modified in last 7 days
#   QUIET=1 ./scripts/sync-sessions.sh        # suppress progress output

set -euo pipefail

LIST_ONLY=0
SINCE=""
TARGET="${PWD}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --list) LIST_ONLY=1; shift ;;
    --since) SINCE="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,/^set/p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) TARGET="$1"; shift ;;
  esac
done

TARGET="$(cd "$TARGET" 2>/dev/null && pwd)" || { echo "✗ path not found: $TARGET" >&2; exit 1; }

# Encode path: leading slash dropped, remaining slashes → dashes, prepend leading dash
ENCODED="$(echo "$TARGET" | sed 's|^/||; s|/|-|g')"
ENCODED="-${ENCODED}"

CLAUDE_DIR="${HOME}/.claude/projects/${ENCODED}"

if [[ ! -d "$CLAUDE_DIR" ]]; then
  echo "✗ no Claude Code sessions found for $TARGET" >&2
  echo "  looked in: $CLAUDE_DIR" >&2
  exit 1
fi

DEST="${TARGET}/.sessions"
mkdir -p "$DEST"

log() { [[ "${QUIET:-0}" == "1" ]] || echo "$@"; }

# Find files honoring --since
FIND_ARGS=( "$CLAUDE_DIR" -type f -name '*.jsonl' )
if [[ -n "$SINCE" ]]; then
  case "$SINCE" in
    *d) FIND_ARGS+=( -mtime "-${SINCE%d}" ) ;;
    *h) FIND_ARGS+=( -mmin "-$(( ${SINCE%h} * 60 ))" ) ;;
    *)  echo "✗ --since expects '<N>d' or '<N>h'" >&2; exit 1 ;;
  esac
fi

count=0
total_kb=0
while IFS= read -r -d '' f; do
  rel="${f#$CLAUDE_DIR/}"
  if [[ "$LIST_ONLY" == "1" ]]; then
    sz_kb=$(( $(wc -c <"$f") / 1024 ))
    printf "  %-60s %5d KB\n" "$rel" "$sz_kb"
  else
    mkdir -p "$(dirname "$DEST/$rel")"
    # Hardlink when possible (zero-cost mirror); fall back to cp
    if ln -f "$f" "$DEST/$rel" 2>/dev/null; then :; else cp -p "$f" "$DEST/$rel"; fi
    sz_kb=$(( $(wc -c <"$f") / 1024 ))
    total_kb=$(( total_kb + sz_kb ))
  fi
  count=$(( count + 1 ))
done < <(find "${FIND_ARGS[@]}" -print0 2>/dev/null)

if [[ "$LIST_ONLY" == "1" ]]; then
  log ""
  log "→ $count session(s) for $TARGET"
else
  log "✓ synced $count session(s) (~${total_kb} KB) → ${DEST}"
fi
