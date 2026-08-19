#!/bin/sh
# Emits session-rules.md as a hook payload for the event named in $1.
# SessionStart would accept plain stdout, but SubagentStart only injects text
# it receives as JSON hookSpecificOutput.additionalContext — so both go here.
set -eu
event="$1"
file="$(dirname "$0")/session-rules.md"

if command -v jq >/dev/null 2>&1; then
  jq -Rs --arg e "$event" \
    '{hookSpecificOutput: {hookEventName: $e, additionalContext: .}}' "$file"
elif command -v python3 >/dev/null 2>&1; then
  python3 -c 'import json,sys; print(json.dumps({"hookSpecificOutput":{"hookEventName":sys.argv[1],"additionalContext":open(sys.argv[2],encoding="utf-8").read()}}))' "$event" "$file"
else
  # No JSON encoder available: plain text still reaches SessionStart.
  cat "$file"
fi
