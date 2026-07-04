'use strict';
// PostToolUse hook (Agent|Task): subagent dispatch ledger (forged-receipt defense).
// Records every evidence path mentioned in a subagent dispatch's input to
// .glm-hammer/dispatch.jsonl. stop-gate cross-checks receipts against this
// ledger: a receipt no dispatched judge was ever pointed at was written by
// the orchestrator itself — and does not count.
const fs = require('fs');
const path = require('path');
const { readStdin, dispatchLogPath, extractEvidenceTails } = require('./lib');

const MAX_LOG_BYTES = 512 * 1024;

try {
  const input = readStdin();
  const cwd = input.cwd || process.cwd();
  const toolInput = input.tool_input;
  if (!toolInput) process.exit(0);

  const paths = extractEvidenceTails(JSON.stringify(toolInput));
  if (paths.length === 0) process.exit(0);

  const desc = String(toolInput.description || toolInput.subagent_type || '').slice(0, 120);
  const logPath = dispatchLogPath(cwd);
  fs.mkdirSync(path.dirname(logPath), { recursive: true });

  try {
    const stat = fs.statSync(logPath);
    if (stat.size > MAX_LOG_BYTES) {
      const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
      fs.writeFileSync(logPath, lines.slice(-200).join('\n') + '\n');
    }
  } catch {
    /* no log yet */
  }

  fs.appendFileSync(logPath, JSON.stringify({ t: Date.now(), desc, paths }) + '\n');
  process.exit(0);
} catch {
  process.exit(0);
}
