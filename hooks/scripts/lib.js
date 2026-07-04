'use strict';
const fs = require('fs');
const path = require('path');

function readStdin() {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function statePath(cwd) {
  return path.join(cwd || process.cwd(), '.glm-hammer', 'state.json');
}

function evidencePath(cwd, ...parts) {
  return path.join(cwd || process.cwd(), '.glm-hammer', 'evidence', ...parts);
}

function readState(cwd) {
  try {
    return JSON.parse(fs.readFileSync(statePath(cwd), 'utf8'));
  } catch {
    return null;
  }
}

// Atomic write (tmp + rename) so a concurrent hook never reads a torn file.
function writeState(cwd, state) {
  try {
    const p = statePath(cwd);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const tmp = `${p}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, p);
  } catch {
    // never break the hook over state I/O
  }
}

// Evidence receipt check: file exists, is non-empty, and (optionally) matches a pattern.
function evidenceOk(filePath, pattern) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size <= 0) return false;
    if (!pattern) return true;
    return pattern.test(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return false;
  }
}

// When the transcript shows context pressure, blocking a stop makes things
// worse — the agent needs to yield, not loop. (Pattern from lazycodex.)
const CONTEXT_PRESSURE_MARKERS = [
  'context compacted',
  'context_length_exceeded',
  'context_too_large',
  'context low',
  'ran out of room in the model',
  'exceeds the context window',
  'conversation was summarized',
];

function underContextPressure(transcriptPath) {
  try {
    if (!transcriptPath) return false;
    const stat = fs.statSync(transcriptPath);
    const TAIL = 64 * 1024;
    const fd = fs.openSync(transcriptPath, 'r');
    const start = Math.max(0, stat.size - TAIL);
    const buf = Buffer.alloc(Math.min(TAIL, stat.size));
    fs.readSync(fd, buf, 0, buf.length, start);
    fs.closeSync(fd);
    const tail = buf.toString('utf8').toLowerCase();
    return CONTEXT_PRESSURE_MARKERS.some((m) => tail.includes(m));
  } catch {
    return false;
  }
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj));
}

// Context injection. ZCode validates hook stdout against a STRICT schema
// (extra keys fail validation); top-level `additionalContext` is accepted for
// every event and is injected into the conversation, so emit only that.
function emitContext(_eventName, text) {
  emit({ additionalContext: text });
}

module.exports = {
  readStdin,
  readState,
  writeState,
  statePath,
  evidencePath,
  evidenceOk,
  underContextPressure,
  emit,
  emitContext,
};
