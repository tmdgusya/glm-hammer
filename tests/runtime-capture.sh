#!/bin/sh
set -eu

usage() {
  printf '%s\n' 'usage: tests/runtime-capture.sh --output-dir DIR' >&2
  exit 64
}

[ "$#" -eq 2 ] || usage
[ "$1" = '--output-dir' ] || usage
OUTPUT_DIR=$2
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
let input = {};
try { const raw = fs.readFileSync(0, 'utf8'); input = raw ? JSON.parse(raw) : {}; } catch {}
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

printf '%s\n' 'Trigger normal SessionStart, a matched prompt, Stop, documented compaction SessionStart, one Agent/Task completion, and two parallel completions with this temporary hooks file.' >&2
printf '%s\n' 'CAPTURE_PLUGIN_READY'
