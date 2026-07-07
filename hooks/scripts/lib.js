'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

// Evidence receipt check with substance requirements: a receipt must exist,
// carry real content (minBytes), contain its verdict line, and — for judge
// receipts — contain the binary CHECKS block. A one-line "VERDICT: PASS"
// file is not evidence of a review having happened.
function evidenceOk(filePath, opts) {
  const o = opts instanceof RegExp ? { pattern: opts } : opts || {};
  const minBytes = o.minBytes == null ? 1 : o.minBytes;
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size < minBytes) return false;
    if (!o.pattern && !o.requireChecks) return true;
    const body = fs.readFileSync(filePath, 'utf8');
    if (o.pattern && !o.pattern.test(body)) return false;
    if (o.requireChecks && !/CHECKS\s*:/i.test(body)) return false;
    return true;
  } catch {
    return false;
  }
}

// ---- Plan content seal (Bash-bypass defense) --------------------------------
// plan-gate reseals the plan on every tracked Write/Edit. stop-gate compares
// the file's current hash against the seal: an edit through any untracked
// route (shell redirection, external tool) breaks the seal and voids approvals.
function sha256File(filePath) {
  try {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  } catch {
    return null;
  }
}

function planKey(p) {
  const n = String(p).replace(/\\/g, '/');
  const m = n.match(/docs\/glm-hammer\/(?:plans\/[^/]+\.md|design\/[^/]+\/[^/]+\.(?:md|json))$/i);
  return (m ? m[0] : n).toLowerCase();
}

function sealPath(cwd) {
  return path.join(cwd || process.cwd(), '.glm-hammer', 'plan-seal.json');
}

function readSeals(cwd) {
  try {
    return JSON.parse(fs.readFileSync(sealPath(cwd), 'utf8'));
  } catch {
    return {};
  }
}

function writeSeal(cwd, filePath) {
  try {
    const hash = sha256File(filePath);
    if (!hash) return;
    const seals = readSeals(cwd);
    seals[planKey(filePath)] = { sha256: hash };
    const p = sealPath(cwd);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const tmp = `${p}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(seals, null, 2));
    fs.renameSync(tmp, p);
  } catch {
    /* never break the hook */
  }
}

function sealMatches(cwd, filePath) {
  const seal = readSeals(cwd)[planKey(filePath)];
  if (!seal) return 'missing';
  const cur = sha256File(filePath);
  if (!cur) return 'missing';
  return seal.sha256 === cur ? 'ok' : 'broken';
}

// ---- Subagent dispatch log (forged-receipt defense) -------------------------
// dispatch-log.js appends one JSONL entry per Agent/Task tool call, recording
// every evidence path mentioned in the dispatch input. stop-gate then requires
// each receipt to be backed by a dispatch that referenced it. Enforcement is
// fail-open: it activates only once the log has at least one path-bearing
// entry (i.e., the matcher demonstrably works in this runtime).
function dispatchLogPath(cwd) {
  return path.join(cwd || process.cwd(), '.glm-hammer', 'dispatch.jsonl');
}

function extractEvidenceTails(text) {
  const tails = [];
  const re = /\.glm-hammer[\\/]+evidence[\\/]+[^\s"'`,;|)\]}>]+/g;
  let m;
  while ((m = re.exec(text))) {
    const norm = m[0].replace(/\\+/g, '/').replace(/\/+/g, '/');
    const tail = norm.replace(/^\.glm-hammer\/evidence\//, '').replace(/[.,;:]+$/, '');
    if (tail) tails.push(tail.toLowerCase());
  }
  return tails;
}

function readDispatchedTails(cwd) {
  const set = new Set();
  try {
    const lines = fs.readFileSync(dispatchLogPath(cwd), 'utf8').split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        (entry.paths || []).forEach((t) => set.add(String(t).toLowerCase()));
      } catch {
        /* skip bad line */
      }
    }
  } catch {
    /* no log yet */
  }
  return set;
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
// (extra keys fail validation) and accepts top-level `additionalContext`.
// Claude Code expects `hookSpecificOutput.{hookEventName,additionalContext}`.
// The Claude path is opt-in via GLM_HAMMER_EMIT=claude (set by claude-hammer),
// so the default (ZCode) branch below is unchanged.
function emitContext(eventName, text) {
  if (process.env.GLM_HAMMER_EMIT === 'claude') {
    emit({ hookSpecificOutput: { hookEventName: eventName, additionalContext: text } });
  } else {
    emit({ additionalContext: text });
  }
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
  sha256File,
  planKey,
  writeSeal,
  sealMatches,
  dispatchLogPath,
  extractEvidenceTails,
  readDispatchedTails,
};
