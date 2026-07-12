#!/bin/sh
set -eu

usage() {
  printf '%s\n' 'usage: tests/runtime-capture.sh --output-dir DIR [--run-headless]' >&2
  exit 64
}

[ "$#" -eq 2 ] || { [ "$#" -eq 3 ] && [ "$3" = '--run-headless' ]; } || usage
[ "$1" = '--output-dir' ] || usage
OUTPUT_DIR=$2
RUN_HEADLESS=0
[ "$#" -eq 2 ] || RUN_HEADLESS=1
: "${GLM_HAMMER_CAPTURE_DIR:?GLM_HAMMER_CAPTURE_DIR is required}"
: "${ZCODE_BIN:?ZCODE_BIN is required}"
: "${ZCODE_ENGINE_ARTIFACT:?ZCODE_ENGINE_ARTIFACT is required}"
: "${GLM_HAMMER_ENGINE_NAME:?GLM_HAMMER_ENGINE_NAME is required}"
: "${GLM_HAMMER_ENGINE_VERSION:?GLM_HAMMER_ENGINE_VERSION is required}"
: "${GLM_HAMMER_ENGINE_SHA256:?GLM_HAMMER_ENGINE_SHA256 is required}"

node tests/runtime-capture.js --validate-environment >/dev/null
OUTPUT_REAL=$(node -e 'process.stdout.write(require("fs").realpathSync(process.argv[1]))' "$OUTPUT_DIR")
ENV_REAL=$(node -e 'process.stdout.write(require("fs").realpathSync(process.argv[1]))' "$GLM_HAMMER_CAPTURE_DIR")
[ "$OUTPUT_REAL" = "$ENV_REAL" ] || { printf '%s\n' 'CAPTURE_DIRECTORY_MISMATCH' >&2; exit 1; }

PLUGIN_DIR=$OUTPUT_REAL/plugin
mkdir "$PLUGIN_DIR"
cat >"$PLUGIN_DIR/capture-hook.js" <<'JS'
'use strict';
const fs = require('fs');
const path = require('path');
let input;
try {
  const raw = fs.readFileSync(0, 'utf8');
  input = raw ? JSON.parse(raw) : {};
} catch {
  process.exit(1);
}
const event = process.argv[2];
const safe = {
  event,
  environment: {
    GLM_HAMMER_ENGINE_NAME: process.env.GLM_HAMMER_ENGINE_NAME || null,
    GLM_HAMMER_ENGINE_VERSION: process.env.GLM_HAMMER_ENGINE_VERSION || null,
    GLM_HAMMER_ENGINE_SHA256: process.env.GLM_HAMMER_ENGINE_SHA256 || null,
  },
  payloadShape: Object.fromEntries(Object.keys(input).sort().map((key) => [key, typeof input[key]])),
  sourceKind: 'live-capture',
};
const name = `${Date.now()}-${process.pid}-${event}.json`;
fs.writeFileSync(path.join(process.env.GLM_HAMMER_CAPTURE_DIR, name), `${JSON.stringify(safe)}\n`, { flag: 'wx' });
JS
cat >"$PLUGIN_DIR/hooks.json" <<JSON
{"hooks":{"SessionStart":[{"hooks":[{"type":"process","command":"node","args":["$PLUGIN_DIR/capture-hook.js","SessionStart"]}]}],"UserPromptSubmit":[{"hooks":[{"type":"process","command":"node","args":["$PLUGIN_DIR/capture-hook.js","UserPromptSubmit"]}]}],"PostToolUse":[{"matcher":"Agent|Task","hooks":[{"type":"process","command":"node","args":["$PLUGIN_DIR/capture-hook.js","PostToolUse"]}]}],"Stop":[{"hooks":[{"type":"process","command":"node","args":["$PLUGIN_DIR/capture-hook.js","Stop"]}]}]}}
JSON

WORK_DIR=$OUTPUT_REAL/workspace
mkdir "$WORK_DIR"
cat >"$WORK_DIR/zcode.json" <<JSON
{"hooks":{"enabled":true,"timeoutMs":60000,"events":{"SessionStart":[{"hooks":[{"type":"process","command":"node","args":["$PLUGIN_DIR/capture-hook.js","SessionStart"]}]}],"UserPromptSubmit":[{"hooks":[{"type":"process","command":"node","args":["$PLUGIN_DIR/capture-hook.js","UserPromptSubmit"]}]}],"PostToolUse":[{"matcher":"Agent|Task","hooks":[{"type":"process","command":"node","args":["$PLUGIN_DIR/capture-hook.js","PostToolUse"]}]}],"Stop":[{"hooks":[{"type":"process","command":"node","args":["$PLUGIN_DIR/capture-hook.js","Stop"]}]}]}}}
JSON

if [ "$RUN_HEADLESS" -eq 0 ]; then
  printf '%s\n' 'Trigger normal SessionStart, a matched prompt, Stop, documented compaction SessionStart, one Agent/Task completion, and two parallel completions with this temporary hooks file.' >&2
  printf '%s\n' 'CAPTURE_PLUGIN_READY'
  exit 0
fi

FIRST=$("$ZCODE_BIN" --cwd "$WORK_DIR" --mode yolo --prompt 'Harness capture: use the Agent or Task tool exactly once to ask a subagent to answer OK, then answer CAPTURE_DONE.' --json)
SESSION_ID=$(printf '%s' "$FIRST" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const m=s.match(/"sessionId"\s*:\s*"(sess_[a-z0-9-]+)"/);if(!m)process.exit(1);process.stdout.write(m[1])})')
"$ZCODE_BIN" --cwd "$WORK_DIR" --resume "$SESSION_ID" --mode yolo --prompt '/compact retain only that this is a hook capture' --json >/dev/null
ATTEMPT=0
while [ "$ATTEMPT" -lt 3 ]; do
  "$ZCODE_BIN" --cwd "$WORK_DIR" --resume "$SESSION_ID" --mode yolo --prompt 'Mandatory harness action: call the Agent or Task tool exactly twice in the same assistant turn, in parallel. Each subagent must return OK. Do not answer directly before both tool calls complete; then answer PARALLEL_CAPTURE_DONE.' --json >/dev/null
  if node tests/runtime-capture.js --verify-input-dir --input-dir "$OUTPUT_REAL" >/dev/null 2>&1; then
    printf '%s\n' 'CAPTURE_SEQUENCE_VERIFIED'
    exit 0
  fi
  ATTEMPT=$((ATTEMPT + 1))
done
node tests/runtime-capture.js --verify-input-dir --input-dir "$OUTPUT_REAL"
