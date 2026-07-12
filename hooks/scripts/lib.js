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
  const m = n.match(/docs\/glm-hammer\/(?:plans\/[^/]+\.md|design\/[^/]+\/[^/]+\.(?:md|json)|decks\/[^/]+\/[^/]+\.(?:md|html))$/i);
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
    const bytes = fs.readFileSync(filePath);
    const hash = sha256(bytes);
    const seals = readSeals(cwd);
    const key = planKey(filePath);
    const previous = seals[key];
    const relative = path.relative(cwd || process.cwd(), filePath).replace(/\\/g, '/');
    const corePlan = /(^|\/)docs\/glm-hammer\/plans\/[^/]+\.md$/i.test(relative);
    const syntax = parseStrictPlan(bytes.toString('utf8'), null, { syntaxOnly: true });
    if (corePlan && !syntax.ok) return false;
    const entry = {
      sha256: hash,
      planSha256: hash,
      generation: previous && previous.sha256 === hash ? previous.generation || 0 : (previous && previous.generation || 0) + 1,
    };
    if (syntax.ok) {
      const captured = capturePlanPathBaseline(path.resolve(cwd || process.cwd()), syntax.declaredPaths);
      if (!captured.ok) return false;
      entry.planPathBaseline = captured.baseline;
      entry.planPathBaselineSha256 = captured.sha256;
    }
    seals[key] = entry;
    const p = sealPath(cwd);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const tmp = `${p}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(seals, null, 2));
    fs.renameSync(tmp, p);
    return true;
  } catch {
    return false;
  }
}

function sealMatches(cwd, filePath) {
  const seal = readSeals(cwd)[planKey(filePath)];
  if (!seal) return 'missing';
  const cur = sha256File(filePath);
  if (!cur) return 'missing';
  const relative = path.relative(cwd || process.cwd(), filePath).replace(/\\/g, '/');
  const corePlan = /(^|\/)docs\/glm-hammer\/plans\/[^/]+\.md$/i.test(relative);
  if (corePlan) {
    let syntax;
    try {
      syntax = parseStrictPlan(fs.readFileSync(filePath, 'utf8'), null, { syntaxOnly: true });
    } catch {
      return 'broken';
    }
    if (!syntax.ok || !HASH_RE.test(seal.planSha256 || '') ||
        seal.planSha256 !== seal.sha256 || seal.planSha256 !== cur ||
        !HASH_RE.test(seal.planPathBaselineSha256 || '') ||
        !seal.planPathBaseline ||
        !validatePlanPathBaseline(seal.planPathBaseline, syntax.declaredPaths).ok ||
        seal.planPathBaselineSha256 !== sha256(canonicalJson(seal.planPathBaseline))) {
      return 'missing';
    }
  }
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
// (extra keys fail validation); top-level `additionalContext` is accepted for
// every event and is injected into the conversation, so emit only that.
function emitContext(_eventName, text) {
  emit({ additionalContext: text });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HASH_RE = /^[0-9a-f]{64}$/;
const EVENT_ID_RE = /^evt_[0-9a-f]{32}$/;
const EVENT_TYPES = Object.freeze({
  ROUTER_ARMED: ['baselineHead', 'baselineSnapshotSha256', 'promptEventHash'],
  PHASE_TRANSITIONED: ['fromPhase', 'fromStatus', 'parentPhase', 'resumePhase', 'toPhase', 'toStatus'],
  PLAN_GENERATION_ADVANCED: ['planPath', 'planPathBaselineSha256', 'planSha256', 'previousGeneration'],
  PLAN_PATH_BASELINE_RECORDED: ['planPathBaseline', 'planPathBaselineSha256', 'planSha256'],
  USER_QUESTION_OBSERVED: ['observerEventHash', 'observerKind', 'turnId'],
  RUN_ENDED_UNVERIFIED: ['endedAtMs', 'questionProofEventHash', 'questionProofEventId', 'unresolvedGateCodes', 'userPromptEventHash'],
  CORE_DISPATCH_COMPLETED: ['completionMs', 'dispatchId', 'evidencePath', 'invocationMs', 'observedAtMs', 'receiptMtimeMs', 'receiptSha256', 'receiptSize', 'role', 'sourceSnapshotSha256', 'toolEventHash'],
  LEGACY_RUN_MIGRATED: ['legacyStateSha256', 'migrationCode', 'planPath', 'planSha256'],
  SOURCE_BASELINE_RECORDED: ['head', 'scope', 'snapshotSha256'],
  SOURCE_REVIEW_SNAPSHOT_RECORDED: ['head', 'scope', 'snapshotSha256'],
  RUN_COMPLETED: ['planSha256', 'reviewSnapshotSha256'],
});

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
    return out;
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function exactKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).sort().join('\0') === [...keys].sort().join('\0');
}

function result(code, value) {
  return code ? { ok: false, code } : { ok: true, value };
}
function validateJournalPayload(type, payload, event, options) {
  if (type === 'ROUTER_ARMED') {
    if ((payload.baselineHead !== null && !/^[0-9a-f]{40,64}$/.test(payload.baselineHead || '')) ||
        !HASH_RE.test(payload.baselineSnapshotSha256 || '') || !HASH_RE.test(payload.promptEventHash || '')) return 'EVT_SEMANTIC';
  } else if (type === 'PHASE_TRANSITIONED') {
    const phases = new Set(['idle', 'forge', 'crucible', 'hammer', 'pptxx']);
    const statuses = {
      idle: new Set(['idle', 'done']),
      forge: new Set(['recon', 'drafting', 'critique', 'approved', 'awaiting-user']),
      crucible: new Set(['prospecting', 'smelting', 'assay', 'critique', 'approved', 'awaiting-user']),
      hammer: new Set(['executing', 'review', 'awaiting-user', 'done']),
      pptxx: new Set(['scripting', 'chaining', 'imaging', 'building', 'visual-qa', 'exporting', 'awaiting-user', 'done']),
    };
    const optionalPhase = (value) => value === null || (typeof value === 'string' && phases.has(value));
    const edges = new Set(['idle>forge', 'idle>crucible', 'idle>hammer', 'idle>pptxx', 'forge>hammer', 'crucible>pptxx', 'hammer>idle', 'pptxx>idle']);
    if (![payload.fromPhase, payload.toPhase].every((value) => typeof value === 'string' && phases.has(value)) ||
        !optionalPhase(payload.parentPhase) || !optionalPhase(payload.resumePhase) ||
        typeof payload.fromStatus !== 'string' || typeof payload.toStatus !== 'string' ||
        !statuses[payload.fromPhase].has(payload.fromStatus) || !statuses[payload.toPhase].has(payload.toStatus) ||
        (payload.fromPhase !== payload.toPhase && !edges.has(`${payload.fromPhase}>${payload.toPhase}`))) return 'EVT_TRANSITION';
    if (payload.fromPhase === 'idle' && payload.toPhase === 'idle') return 'EVT_TRANSITION';
  } else if (type === 'PLAN_GENERATION_ADVANCED') {
    if (!normalizeRepoPath(payload.planPath) || !HASH_RE.test(payload.planPathBaselineSha256 || '') ||
        !HASH_RE.test(payload.planSha256 || '') || !Number.isSafeInteger(payload.previousGeneration) ||
        payload.previousGeneration < 0 || event.generation !== payload.previousGeneration + 1) return 'EVT_SEMANTIC';
  } else if (type === 'PLAN_PATH_BASELINE_RECORDED') {
    const paths = Object.keys(payload.planPathBaseline || {});
    if (!HASH_RE.test(payload.planPathBaselineSha256 || '') || !HASH_RE.test(payload.planSha256 || '') ||
        !validatePlanPathBaseline(payload.planPathBaseline, paths).ok ||
        payload.planPathBaselineSha256 !== sha256(canonicalJson(payload.planPathBaseline))) return 'EVT_SEMANTIC';
  } else if (type === 'USER_QUESTION_OBSERVED') {
    if (!HASH_RE.test(payload.observerEventHash || '') || typeof payload.observerKind !== 'string' ||
        !payload.observerKind || typeof payload.turnId !== 'string' || !payload.turnId) return 'EVT_SEMANTIC';
  } else if (type === 'RUN_ENDED_UNVERIFIED') {
    if (!Number.isSafeInteger(payload.endedAtMs) || payload.endedAtMs < event.atMs ||
        !HASH_RE.test(payload.questionProofEventHash || '') || !EVENT_ID_RE.test(payload.questionProofEventId || '') ||
        !Array.isArray(payload.unresolvedGateCodes) || payload.unresolvedGateCodes.some((code) => typeof code !== 'string') ||
        !HASH_RE.test(payload.userPromptEventHash || '')) return 'EVT_SEMANTIC';
  } else if (type === 'CORE_DISPATCH_COMPLETED') {
    const role = RECEIPT_ROLES[payload.role];
    const review = role && role.review;
    const tail = String(payload.evidencePath || '').replace(/^\.glm-hammer\/evidence\//, '');
    const now = options && options.nowMs == null ? Date.now() : (options && options.nowMs);
    for (const key of ['invocationMs', 'completionMs', 'observedAtMs', 'receiptMtimeMs']) {
      if (!Number.isSafeInteger(payload[key])) return 'EVT_SEMANTIC';
    }
    if (!role || !role.path.test(tail) || !UUID_RE.test(payload.dispatchId || '') ||
        payload.invocationMs > now || payload.completionMs > now || payload.observedAtMs > now ||
        payload.invocationMs > payload.completionMs || payload.completionMs > payload.observedAtMs ||
        payload.receiptMtimeMs < payload.invocationMs - 2000 || payload.receiptMtimeMs > payload.observedAtMs + 2000 ||
        !HASH_RE.test(payload.receiptSha256 || '') || !HASH_RE.test(payload.toolEventHash || '') ||
        !Number.isSafeInteger(payload.receiptSize) || payload.receiptSize < 0 ||
        (review ? !HASH_RE.test(payload.sourceSnapshotSha256 || '') : payload.sourceSnapshotSha256 !== null)) return 'EVT_SEMANTIC';
  } else if (type === 'SOURCE_BASELINE_RECORDED' || type === 'SOURCE_REVIEW_SNAPSHOT_RECORDED') {
    if ((payload.head !== null && !/^[0-9a-f]{40,64}$/.test(payload.head || '')) ||
        typeof payload.scope !== 'string' || !payload.scope || !HASH_RE.test(payload.snapshotSha256 || '')) return 'EVT_SEMANTIC';
  } else if (type === 'RUN_COMPLETED') {
    if (!HASH_RE.test(payload.planSha256 || '') || !HASH_RE.test(payload.reviewSnapshotSha256 || '')) return 'EVT_SEMANTIC';
  }
  return null;
}

function validateJournalEvent(event, options = {}) {
  if (!exactKeys(event, ['schemaVersion', 'type', 'eventId', 'runId', 'seq', 'generation', 'atMs', 'payload'])) {
    return result('EVT_UNKNOWN_KEY');
  }
  if (event.schemaVersion !== 1) return result('EVT_SCHEMA');
  if (!Object.prototype.hasOwnProperty.call(EVENT_TYPES, event.type)) return result('EVT_TYPE');
  if (!EVENT_ID_RE.test(event.eventId || '')) return result('EVT_ID');
  if (!UUID_RE.test(event.runId || '')) return result('EVT_RUN');
  if (!Number.isSafeInteger(event.seq) || event.seq < 1 || (options.expectedSeq && event.seq !== options.expectedSeq)) {
    return result('EVT_SEQ');
  }
  if (!Number.isSafeInteger(event.generation) || event.generation < 0) return result('EVT_GENERATION');
  const nowMs = options.nowMs == null ? Date.now() : options.nowMs;
  if (!Number.isSafeInteger(event.atMs) || event.atMs > nowMs) return result('EVT_TIME');
  if (!exactKeys(event.payload, EVENT_TYPES[event.type])) return result('EVT_PAYLOAD');
  const semantic = validateJournalPayload(event.type, event.payload, event, options);
  if (semantic) return result(semantic);
  return result(null, event);
}

function parseJournalLine(line, options = {}) {
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    return result('EVT_JSON');
  }
  const checked = validateJournalEvent(event, options);
  if (!checked.ok) return checked;
  if (options.requireCanonical !== false && line !== canonicalJson(event)) return result('EVT_JSON');
  return checked;
}

function journalPath(cwd) {
  return path.join(cwd || process.cwd(), '.glm-hammer', 'control-events.jsonl');
}

function readJournal(cwd, options = {}) {
  let raw;
  try {
    raw = fs.readFileSync(journalPath(cwd), 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return { ok: true, events: [], tornTail: null };
    return { ok: false, code: 'JOURNAL_READ' };
  }
  const completeEnd = raw.lastIndexOf('\n');
  const tornTail = completeEnd === raw.length - 1 ? null : raw.slice(completeEnd + 1);
  const body = completeEnd < 0 ? '' : raw.slice(0, completeEnd);
  const events = [];
  for (const line of body ? body.split('\n') : []) {
    const checked = parseJournalLine(line, { nowMs: options.nowMs, expectedSeq: events.length + 1 });
    if (!checked.ok) return { ok: false, code: checked.code, events, tornTail };
    events.push(checked.value);
  }
  return { ok: true, events, tornTail };
}

function lockPath(cwd) {
  return path.join(cwd || process.cwd(), '.glm-hammer', 'control.lock');
}

function sleepMs(ms) {
  const wait = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(wait, 0, 0, ms);
}

function acquireJournalLock(cwd, options = {}) {
  const dir = lockPath(cwd);
  const timeoutMs = options.timeoutMs == null ? 2000 : options.timeoutMs;
  const staleMs = options.staleMs == null ? 30000 : options.staleMs;
  const started = Date.now();
  const owner = {
    schemaVersion: 1,
    ownerToken: crypto.randomBytes(16).toString('hex'),
    pid: process.pid,
    startedAtMs: started,
    hostname: require('os').hostname(),
  };
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  while (true) {
    try {
      fs.mkdirSync(dir);
      fs.writeFileSync(path.join(dir, 'owner.json'), canonicalJson(owner) + '\n', { flag: 'wx' });
      return { ok: true, cwd, dir, owner };
    } catch (error) {
      if (error.code !== 'EEXIST') return { ok: false, code: 'LOCK_CREATE' };
      let reclaim = false;
      try {
        const stat = fs.statSync(dir);
        const existing = JSON.parse(fs.readFileSync(path.join(dir, 'owner.json'), 'utf8'));
        if (Date.now() - stat.mtimeMs > staleMs) {
          try {
            process.kill(existing.pid, 0);
          } catch (killError) {
            reclaim = killError.code === 'ESRCH';
          }
        }
      } catch {
        try {
          reclaim = Date.now() - fs.statSync(dir).mtimeMs > staleMs;
        } catch {
          reclaim = false;
        }
      }
      if (reclaim) {
        try {
          fs.renameSync(dir, `${dir}.quarantine-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`);
          continue;
        } catch {
          /* another process won */
        }
      }
      if (Date.now() - started >= timeoutMs) return { ok: false, code: 'LOCK_TIMEOUT' };
      sleepMs(10 + Math.floor(Math.random() * 41));
    }
  }
}

function releaseJournalLock(lock) {
  if (!lock || !lock.ok) return false;
  try {
    const current = JSON.parse(fs.readFileSync(path.join(lock.dir, 'owner.json'), 'utf8'));
    if (current.ownerToken !== lock.owner.ownerToken) return false;
    fs.rmSync(lock.dir, { recursive: true });
    return true;
  } catch {
    return false;
  }
}
const MAX_JOURNAL_BYTES = 512 * 1024;

function rotateCompletedJournal(cwd, journal, nextType, nextRunId) {
  const terminal = journal.events[journal.events.length - 1];
  if (!terminal || !['RUN_COMPLETED', 'RUN_ENDED_UNVERIFIED'].includes(terminal.type) ||
      terminal.runId === nextRunId || !['ROUTER_ARMED', 'LEGACY_RUN_MIGRATED'].includes(nextType)) return journal;
  const file = journalPath(cwd);
  let bytes;
  try {
    bytes = fs.readFileSync(file);
  } catch {
    return journal;
  }
  if (bytes.length <= MAX_JOURNAL_BYTES) return journal;
  const archive = `${file}.archive-${sha256(bytes).slice(0, 16)}.jsonl`;
  if (fs.existsSync(archive)) {
    if (!fs.readFileSync(archive).equals(bytes)) return { ok: false, code: 'JOURNAL_ROTATION_COLLISION' };
    fs.rmSync(file);
  } else {
    fs.renameSync(file, archive);
  }
  return { ok: true, events: [], tornTail: null, rotatedTo: archive };
}

function appendJournalEvent(cwd, event, options = {}) {
  const lock = acquireJournalLock(cwd, options);
  if (!lock.ok) return lock;
  try {
    let journal = readJournal(cwd, { nowMs: options.nowMs });
    if (!journal.ok) return journal;
    journal = rotateCompletedJournal(cwd, journal, event.type, event.runId);
    if (!journal.ok) return journal;
    const file = journalPath(cwd);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (journal.tornTail != null) {
      const raw = fs.readFileSync(file);
      const end = raw.lastIndexOf(10);
      const quarantine = `${file}.torn-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      fs.writeFileSync(quarantine, raw.subarray(end + 1));
      fs.truncateSync(file, end + 1);
    }
    const checked = validateJournalEvent(event, {
      nowMs: options.nowMs,
      expectedSeq: journal.events.length + 1,
    });
    if (!checked.ok) return checked;
    const fd = fs.openSync(file, 'a');
    try {
      fs.writeSync(fd, canonicalJson(event) + '\n');
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    return { ok: true, value: event };
  } finally {
    releaseJournalLock(lock);
  }
}
function appendJournalPayload(cwd, type, runId, generation, payload, options = {}) {
  const lock = acquireJournalLock(cwd, options);
  if (!lock.ok) return lock;
  try {
    let journal = readJournal(cwd, { nowMs: options.nowMs });
    if (!journal.ok) return journal;
    journal = rotateCompletedJournal(cwd, journal, type, runId);
    if (!journal.ok) return journal;
    const file = journalPath(cwd);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (journal.tornTail != null) {
      const raw = fs.readFileSync(file);
      const end = raw.lastIndexOf(10);
      fs.writeFileSync(`${file}.torn-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`, raw.subarray(end + 1));
      fs.truncateSync(file, end + 1);
    }
    const event = {
      schemaVersion: 1,
      type,
      eventId: `evt_${crypto.randomBytes(16).toString('hex')}`,
      runId,
      seq: journal.events.length + 1,
      generation,
      atMs: options.atMs == null ? Date.now() : options.atMs,
      payload,
    };
    const checked = validateJournalEvent(event, { nowMs: options.nowMs, expectedSeq: event.seq });
    if (!checked.ok) return checked;
    const fd = fs.openSync(file, 'a');
    try {
      fs.writeSync(fd, canonicalJson(event) + '\n');
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    return { ok: true, value: event };
  } finally {
    releaseJournalLock(lock);
  }
}


function normalizeRepoPath(value) {
  if (typeof value !== 'string' || !value || value !== value.normalize('NFC') || value.includes('\\') ||
      path.posix.isAbsolute(value) || value.split('/').some((part) => !part || part === '.' || part === '..')) return null;
  return value;
}

function enumeratePlanPaths(text) {
  const parsed = parseStrictPlan(text, null, { syntaxOnly: true });
  return parsed.ok ? { ok: true, paths: parsed.declaredPaths } : parsed;
}

function parseStrictPlan(text, baseline, options = {}) {
  if (typeof text !== 'string' || text.charCodeAt(0) === 0xfeff || text.includes('\r')) return result('PLAN_ENCODING');
  const lines = text.split('\n');
  const tasks = [];
  let task = null;
  let section = null;
  let fenced = false;
  for (const line of lines) {
    if (/^```/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const taskMatch = line.match(/^### Task ([1-9]\d*): (.+)$/);
    if (taskMatch) {
      task = { id: Number(taskMatch[1]), title: taskMatch[2], dependencies: null, files: [], acceptance: [], steps: [] };
      tasks.push(task);
      section = null;
      continue;
    }
    if (!task) continue;
    if (line === '**Files:**') {
      section = 'files';
      continue;
    }
    if (line === '**Acceptance Criteria:**') {
      section = 'acceptance';
      continue;
    }
    const dependency = line.match(/^\*\*Dependencies:\*\* (.+)$/);
    if (dependency) {
      if (task.dependencies !== null) return result('PLAN_DEPENDENCIES');
      if (dependency[1] === 'None') task.dependencies = [];
      else {
        if (!/^Task [1-9]\d*(?:, Task [1-9]\d*)*$/.test(dependency[1])) return result('PLAN_DEPENDENCIES');
        task.dependencies = dependency[1].split(', ').map((entry) => Number(entry.slice(5)));
      }
      continue;
    }
    const file = line.match(/^- (Create|Modify|Test): `([^`]+)`$/);
    if (section === 'files' && file) {
      const normalized = normalizeRepoPath(file[2]);
      if (!normalized) return result('PLAN_FILE');
      if (task.files.some((existing) => existing.path === normalized)) {
        return result('PLAN_FILE_DUPLICATE');
      }
      task.files.push({ operation: file[1], path: normalized });
      continue;
    }
    if (section === 'files' && /^- /.test(line)) return result('PLAN_FILE');
    if (section === 'acceptance' && /^- \[ \] /.test(line)) {
      const obligation = line.slice(6).trim();
      if (!obligation) return result('PLAN_ACCEPTANCE');
      task.acceptance.push(obligation);
      continue;
    }
    if (section === 'acceptance' && /^- \[[xX]\] /.test(line)) return result('PLAN_ACCEPTANCE');
    const step = line.match(/^\*\*Step ([1-9]\d*):\*\*\s+(\S.*)$/);
    if (step) {
      task.steps.push(Number(step[1]));
      section = 'steps';
      continue;
    }
    if (/^\*\*Step /.test(line)) return result('PLAN_STEPS');
  }
  if (fenced || tasks.length === 0) return result('PLAN_TASKS');
  for (let i = 0; i < tasks.length; i++) {
    const current = tasks[i];
    if (current.id !== i + 1) return result('PLAN_TASKS');
    if (current.dependencies === null) return result('PLAN_DEPENDENCIES');
    if (current.dependencies.some((dep, index, all) => dep >= current.id || (index && dep <= all[index - 1]))) {
      return result('PLAN_DEPENDENCIES');
    }
    if (!current.files.length) return result('PLAN_FILE');
    if (!current.acceptance.length) return result('PLAN_ACCEPTANCE');
    if (!current.steps.length || current.steps.some((step, index) => step !== index + 1)) return result('PLAN_STEPS');
  }
  const declaredPaths = [];
  for (const entry of tasks) for (const file of entry.files) if (!declaredPaths.includes(file.path)) declaredPaths.push(file.path);
  declaredPaths.sort();
  if (options.syntaxOnly) return { ok: true, tasks, declaredPaths };
  const baselineCheck = validatePlanPathBaseline(baseline, declaredPaths);
  if (!baselineCheck.ok) return baselineCheck;
  const virtual = new Map(Object.entries(baseline));
  const writers = new Map();
  const creators = new Map();
  const ancestors = new Map();
  for (const current of tasks) {
    const closure = new Set(current.dependencies);
    for (const dep of current.dependencies) for (const ancestor of ancestors.get(dep) || []) closure.add(ancestor);
    ancestors.set(current.id, closure);
    for (const file of current.files) {
      const state = virtual.get(file.path);
      if (file.operation === 'Create') {
        if (state.state !== 'ABSENT') return result('PLAN_PATH_TRANSITION');
        virtual.set(file.path, { state: 'FILE', type: 'regular', sha256: state.sha256 });
        creators.set(file.path, current.id);
      } else if (state.state !== 'FILE' && state.state !== 'SYMLINK') {
        return result('PLAN_PATH_TRANSITION');
      }
      const creator = creators.get(file.path);
      if (creator && creator !== current.id && !closure.has(creator)) return result('PLAN_PATH_DEPENDENCY');
      if (file.operation !== 'Test') {
        for (const writer of writers.get(file.path) || []) {
          if (writer !== current.id && !closure.has(writer)) return result('PLAN_WRITER_DEPENDENCY');
        }
        const prior = writers.get(file.path) || [];
        if (!prior.includes(current.id)) prior.push(current.id);
        writers.set(file.path, prior);
      }
    }
  }
  return { ok: true, tasks, declaredPaths, obligations: tasks.map((entry) => ({ taskId: entry.id, receiptCount: 2 })) };
}

function validatePlanPathBaseline(baseline, declaredPaths) {
  if (!baseline || typeof baseline !== 'object' || Array.isArray(baseline)) return result('PLAN_PATH_BASELINE_MISSING');
  const keys = Object.keys(baseline).sort();
  if (keys.join('\0') !== [...declaredPaths].sort().join('\0')) return result('PLAN_PATH_BASELINE_MISSING');
  for (const key of keys) {
    if (!normalizeRepoPath(key)) return result('PLAN_PATH_BASELINE_INVALID');
    const value = baseline[key];
    if (!exactKeys(value, ['state', 'type', 'sha256'])) return result('PLAN_PATH_BASELINE_INVALID');
    const valid = (value.state === 'ABSENT' && value.type === 'absent' && value.sha256 === null) ||
      (value.state === 'FILE' && value.type === 'regular' && HASH_RE.test(value.sha256 || '')) ||
      (value.state === 'SYMLINK' && value.type === 'symlink' && HASH_RE.test(value.sha256 || ''));
    if (!valid) return result('PLAN_PATH_BASELINE_INVALID');
  }
  return result(null, baseline);
}

function capturePlanPathBaseline(repoRoot, declaredPaths) {
  const baseline = {};
  for (const relative of [...declaredPaths].sort()) {
    const normalized = normalizeRepoPath(relative);
    if (!normalized || Object.prototype.hasOwnProperty.call(baseline, normalized)) return result('PLAN_PATH_BASELINE_INVALID');
    const absolute = path.resolve(repoRoot, normalized);
    if (absolute !== repoRoot && !absolute.startsWith(repoRoot + path.sep)) return result('PLAN_PATH_BASELINE_INVALID');
    try {
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink()) {
        baseline[normalized] = { state: 'SYMLINK', type: 'symlink', sha256: sha256(Buffer.from(fs.readlinkSync(absolute))) };
      } else if (stat.isFile()) {
        baseline[normalized] = { state: 'FILE', type: 'regular', sha256: sha256(fs.readFileSync(absolute)) };
      } else return result('PLAN_PATH_BASELINE_INVALID');
    } catch (error) {
      if (error.code !== 'ENOENT') return result('PLAN_PATH_BASELINE_INVALID');
      baseline[normalized] = { state: 'ABSENT', type: 'absent', sha256: null };
    }
  }
  return { ok: true, baseline, sha256: sha256(canonicalJson(baseline)) };
}
function capturePlanPathBaselineAtCommit(repoRoot, commit, declaredPaths) {
  if (!/^[0-9a-f]{40,64}$/.test(commit || '')) return result('PLAN_PATH_BASELINE_INVALID');
  const cp = require('child_process');
  const baseline = {};
  for (const relative of [...declaredPaths].sort()) {
    if (!normalizeRepoPath(relative)) return result('PLAN_PATH_BASELINE_INVALID');
    let mode;
    try {
      mode = cp.execFileSync('git', ['ls-tree', commit, '--', relative], { cwd: repoRoot, encoding: 'utf8' }).split(/\s+/)[0];
    } catch {
      return result('PLAN_PATH_BASELINE_INVALID');
    }
    if (!mode) {
      baseline[relative] = { state: 'ABSENT', type: 'absent', sha256: null };
      continue;
    }
    if (mode !== '100644' && mode !== '100755' && mode !== '120000') return result('PLAN_PATH_BASELINE_INVALID');
    let bytes;
    try {
      bytes = cp.execFileSync('git', ['show', `${commit}:${relative}`], { cwd: repoRoot, encoding: null });
    } catch {
      return result('PLAN_PATH_BASELINE_INVALID');
    }
    baseline[relative] = mode === '120000'
      ? { state: 'SYMLINK', type: 'symlink', sha256: sha256(bytes) }
      : { state: 'FILE', type: 'regular', sha256: sha256(bytes) };
  }
  return { ok: true, baseline, sha256: sha256(canonicalJson(baseline)) };
}


const RECEIPT_ROLES = {
  'feasibility-critic': { kind: 'FORGE_ROUND', path: /^critics\/round-([1-9]\d*)\/feasibility-critic\.md$/ },
  'integration-critic': { kind: 'FORGE_ROUND', path: /^critics\/round-([1-9]\d*)\/integration-critic\.md$/ },
  'coverage-critic': { kind: 'FORGE_ROUND', path: /^critics\/round-([1-9]\d*)\/coverage-critic\.md$/ },
  validator: { kind: 'TASK_ID', path: /^tasks\/task-([1-9]\d*)\/validator\.md$/ },
  'implementation-critic': { kind: 'TASK_ID', path: /^tasks\/task-([1-9]\d*)\/critic\.md$/ },
  'security-reviewer': { kind: 'REVIEW_KIND', path: /^reviews\/security\.md$/, review: 'security' },
  'qa-reviewer': { kind: 'REVIEW_KIND', path: /^reviews\/qa\.md$/, review: 'qa' },
};

function parseReceiptV1(body, expected = {}) {
  if (typeof body !== 'string' || body.includes('\r')) return result('RCPT_HEADER_VALUE');
  const lines = body.split('\n');
  const values = {};
  const header = [];
  for (const line of lines) {
    if (line === 'CHECKS:') break;
    const match = line.match(/^([A-Z0-9_]+): (.+)$/);
    if (!match) return result('RCPT_HEADER_MISSING');
    if (values[match[1]] !== undefined) return result('RCPT_HEADER_DUPLICATE');
    values[match[1]] = match[2];
    header.push(match[1]);
  }
  const role = RECEIPT_ROLES[values.ROLE];
  if (!role) return result('RCPT_HEADER_VALUE');
  const expectedOrder = ['RECEIPT_VERSION', 'RUN_ID', 'ROLE', 'EVIDENCE_PATH', 'PLAN_SHA256', 'GENERATION', role.kind, 'DISPATCH_ID'];
  if (role.review) expectedOrder.push('SOURCE_SNAPSHOT_SHA256');
  if (header.some((key) => !expectedOrder.includes(key))) return result('RCPT_HEADER_UNKNOWN');
  if (header.join('\0') !== expectedOrder.join('\0') || !lines.includes('CHECKS:')) return result('RCPT_HEADER_ORDER');
  const tail = String(values.EVIDENCE_PATH || '').replace(/^\.glm-hammer\/evidence\//, '');
  const pathMatch = role.path.exec(tail);
  if (!pathMatch || (role.review && values.REVIEW_KIND !== role.review) ||
      (!role.review && String(pathMatch[1]) !== values[role.kind])) return result('RCPT_ROLE_PATH');
  if (values.RECEIPT_VERSION !== '1' || !UUID_RE.test(values.RUN_ID || '') || !HASH_RE.test(values.PLAN_SHA256 || '') ||
      !/^(0|[1-9]\d*)$/.test(values.GENERATION || '') || !UUID_RE.test(values.DISPATCH_ID || '') ||
      (role.review && !HASH_RE.test(values.SOURCE_SNAPSHOT_SHA256 || ''))) return result('RCPT_HEADER_VALUE');
  if (expected.runId && values.RUN_ID !== expected.runId) return result('RCPT_HEADER_VALUE');
  if (expected.generation != null && Number(values.GENERATION) !== expected.generation) return result('RCPT_GENERATION');
  if (expected.planSha256 && values.PLAN_SHA256 !== expected.planSha256) return result('RCPT_HEADER_VALUE');
  return { ok: true, value: { ...values, evidenceTail: tail, role: values.ROLE, generation: Number(values.GENERATION) } };
}

function validateCoreDispatch(payload, context = {}) {
  const keys = EVENT_TYPES.CORE_DISPATCH_COMPLETED;
  if (!exactKeys(payload, keys)) return result('DSP_SCHEMA');
  const role = RECEIPT_ROLES[payload.role];
  if (!role) return result('DSP_ROLE');
  if (!UUID_RE.test(payload.dispatchId || '')) return result('DSP_ID');
  const tail = String(payload.evidencePath || '').replace(/^\.glm-hammer\/evidence\//, '');
  if (!role.path.test(tail)) return result('DSP_PATH');
  if (!Number.isSafeInteger(context.generation) || context.generation < 0) return result('DSP_GENERATION');
  const now = context.nowMs == null ? Date.now() : context.nowMs;
  for (const key of ['invocationMs', 'completionMs', 'observedAtMs', 'receiptMtimeMs']) {
    if (!Number.isSafeInteger(payload[key])) return result('DSP_SCHEMA');
  }
  if (payload.invocationMs > now) return result('DSP_TIME_INVOCATION_FUTURE');
  if (payload.completionMs > now) return result('DSP_TIME_COMPLETION_FUTURE');
  if (payload.observedAtMs > now) return result('DSP_TIME_OBSERVED_FUTURE');
  if (payload.invocationMs < (context.generationStartMs || 0) ||
      payload.completionMs < payload.invocationMs || payload.observedAtMs < payload.completionMs) return result('DSP_TIME_ORDER');
  if (payload.receiptMtimeMs < payload.invocationMs - 2000 || payload.receiptMtimeMs > payload.observedAtMs + 2000) {
    return result('DSP_RECEIPT_TIME');
  }
  if (!Number.isSafeInteger(payload.receiptSize) || payload.receiptSize < 0 ||
      !HASH_RE.test(payload.receiptSha256 || '') || !HASH_RE.test(payload.toolEventHash || '')) return result('DSP_SCHEMA');
  if (role.review) {
    const snapshot = context.reviewSnapshot;
    if (!snapshot || !payload.sourceSnapshotSha256) return result('CORE_REVIEW_SNAPSHOT_MISSING');
    if (payload.sourceSnapshotSha256 !== snapshot.snapshotSha256 ||
        (context.runId && snapshot.runId !== context.runId) ||
        snapshot.generation !== context.generation) return result('CORE_REVIEW_SNAPSHOT_MISMATCH');
    if (payload.invocationMs < snapshot.atMs) return result('CORE_REVIEW_PREDATES_SNAPSHOT');
  } else if (payload.sourceSnapshotSha256 !== null) return result('DSP_SCHEMA');
  return result(null, payload);
}

function atomicUnverified(cwd, input, control) {
  const token = `glm-hammer override-unverified ${control.runId} ${control.generation}`;
  if (String(input.prompt || '').trim() !== token || !UUID_RE.test(control.runId || '') ||
      !Number.isSafeInteger(control.generation) || !control.questionProof || control.questionProof.consumed) {
    return { ok: false, code: 'QUESTION_PROOF_REQUIRED' };
  }
  const journal = readJournal(cwd);
  if (!journal.ok) return journal;
  if (journal.events.some((event) => event.type === 'RUN_ENDED_UNVERIFIED' && event.runId === control.runId)) {
    return { ok: true, replay: true };
  }
  const atMs = Date.now();
  const event = {
    schemaVersion: 1,
    type: 'RUN_ENDED_UNVERIFIED',
    eventId: `evt_${crypto.randomBytes(16).toString('hex')}`,
    runId: control.runId,
    seq: journal.events.length + 1,
    generation: control.generation,
    atMs,
    payload: {
      endedAtMs: atMs,
      questionProofEventHash: control.questionProof.eventHash,
      questionProofEventId: control.questionProof.eventId,
      unresolvedGateCodes: [...(control.unresolvedGateCodes || [])],
      userPromptEventHash: sha256(Buffer.from(String(input.prompt))),
    },
  };
  const appended = appendJournalEvent(cwd, event);
  if (!appended.ok) return appended;
  writeState(cwd, {
    phase: control.phase,
    status: 'ended-unverified',
    verification: 'UNVERIFIED',
    runId: control.runId,
    generation: control.generation,
  });
  return { ok: true, event };
}

const SNAPSHOT_EXCLUSIONS = ['.git', '.glm-hammer', 'node_modules', 'dist', 'build', 'out', 'vendor'];

function snapshotEntry(repoRoot, relative, status) {
  const absolute = path.join(repoRoot, relative);
  try {
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) {
      return { path: relative, status, type: 'symlink', sha256: sha256(Buffer.from(fs.readlinkSync(absolute))) };
    }
    if (stat.isFile()) return { path: relative, status, type: 'regular', sha256: sha256(fs.readFileSync(absolute)) };
    throw new Error('unsupported file type');
  } catch (error) {
    if (error.code === 'ENOENT') return { path: relative, status: status === 'DELETED' ? 'DELETED' : 'ABSENT', type: status === 'DELETED' ? 'deleted' : 'absent', sha256: null };
    throw error;
  }
}

function buildSourceSnapshot(repoRoot, options = {}) {
  const declared = [...new Set(options.declaredPaths || [])];
  for (const relative of declared) if (!normalizeRepoPath(relative)) return result('SNAPSHOT_PATH');
  let currentHead = null;
  let baselineHead = options.baselineHead || null;
  const changed = new Map();
  try {
    const cp = require('child_process');
    currentHead = cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (baselineHead) {
      cp.execFileSync('git', ['cat-file', '-e', `${baselineHead}^{commit}`], { cwd: repoRoot, stdio: 'ignore' });
    } else baselineHead = currentHead;
    if (baselineHead !== currentHead) {
      const diff = cp.execFileSync('git', ['diff', '--name-status', '-z', '--find-renames', baselineHead, currentHead], {
        cwd: repoRoot,
        encoding: 'utf8',
      }).split('\0');
      for (let i = 0; i < diff.length && diff[i];) {
        const code = diff[i++];
        if (code.startsWith('R')) {
          const from = diff[i++];
          const to = diff[i++];
          changed.set(from, 'RENAMED_FROM');
          changed.set(to, 'RENAMED_TO');
        } else {
          const relative = diff[i++];
          changed.set(relative, code === 'D' ? 'DELETED' : code === 'A' ? 'ADDED' : 'MODIFIED');
        }
      }
    }
    const dirty = cp.execFileSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], {
      cwd: repoRoot,
      encoding: 'utf8',
    }).split('\0');
    for (let i = 0; i < dirty.length && dirty[i]; i++) {
      const record = dirty[i];
      const code = record.slice(0, 2);
      const relative = record.slice(3);
      if (code.includes('R') && dirty[i + 1]) {
        changed.set(dirty[++i], 'RENAMED_FROM');
        changed.set(relative, 'RENAMED_TO');
      } else changed.set(relative, code.includes('D') ? 'DELETED' : code === '??' ? 'ADDED' : 'MODIFIED');
    }
  } catch (error) {
    if (baselineHead && currentHead) return result('SNAPSHOT_HISTORY_UNAVAILABLE');
    baselineHead = null;
    currentHead = null;
  }
  for (const relative of declared) if (!changed.has(relative)) changed.set(relative, 'UNCHANGED_DIRTY');
  const entries = [];
  try {
    for (const [relative, status] of [...changed].sort(([a], [b]) => a.localeCompare(b))) {
      if (!normalizeRepoPath(relative) || SNAPSHOT_EXCLUSIONS.some((dir) => relative === dir || relative.startsWith(`${dir}/`))) continue;
      entries.push(snapshotEntry(repoRoot, relative, status));
    }
  } catch {
    return result('SNAPSHOT_READ');
  }
  const snapshot = {
    schemaVersion: 1,
    repoRootHash: sha256(Buffer.from(path.resolve(repoRoot))),
    baselineHead,
    currentHead,
    scope: currentHead ? 'git-baseline-and-head-diff' : 'declared-files-only',
    excludedDirectories: [...SNAPSHOT_EXCLUSIONS],
    entries,
  };
  return { ok: true, snapshot, sha256: sha256(canonicalJson(snapshot)) };
}

function validateSourceSnapshot(snapshot) {
  if (!exactKeys(snapshot, ['schemaVersion', 'repoRootHash', 'baselineHead', 'currentHead', 'scope', 'excludedDirectories', 'entries']) ||
      snapshot.schemaVersion !== 1 || !HASH_RE.test(snapshot.repoRootHash || '') ||
      !['git-baseline-and-head-diff', 'declared-files-only'].includes(snapshot.scope) ||
      canonicalJson(snapshot.excludedDirectories) !== canonicalJson(SNAPSHOT_EXCLUSIONS) ||
      !Array.isArray(snapshot.entries)) return result('SNAPSHOT_SCHEMA');
  let previous = '';
  for (const entry of snapshot.entries) {
    if (!exactKeys(entry, ['path', 'status', 'type', 'sha256']) || !normalizeRepoPath(entry.path) || entry.path <= previous) {
      return result('SNAPSHOT_SCHEMA');
    }
    previous = entry.path;
    const statuses = ['ABSENT', 'ADDED', 'MODIFIED', 'DELETED', 'RENAMED_FROM', 'RENAMED_TO', 'UNCHANGED_DIRTY'];
    if (!statuses.includes(entry.status) || !['absent', 'regular', 'symlink', 'deleted'].includes(entry.type)) return result('SNAPSHOT_SCHEMA');
    if ((entry.type === 'absent' || entry.type === 'deleted') ? entry.sha256 !== null : !HASH_RE.test(entry.sha256 || '')) {
      return result('SNAPSHOT_SCHEMA');
    }
  }
  return result(null, snapshot);
}

function quarantineUnchanged(cwd, source) {
  if (!source || !fs.existsSync(source) || !fs.statSync(source).isFile()) return null;
  const quarantine = path.join(cwd, '.glm-hammer', 'quarantine');
  fs.mkdirSync(quarantine, { recursive: true });
  const target = path.join(quarantine, `${path.basename(source)}.${Date.now()}.unchanged`);
  fs.copyFileSync(source, target);
  return target;
}

function migrateLegacyCoreRun(cwd, options = {}) {
  const stateFile = statePath(cwd);
  const sealFile = sealPath(cwd);
  let stateBytes;
  let state;
  try {
    stateBytes = fs.readFileSync(stateFile);
    state = JSON.parse(stateBytes);
    if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('state shape');
  } catch (error) {
    quarantineUnchanged(cwd, stateFile);
    return result(['EACCES', 'EPERM', 'EISDIR'].includes(error.code) ? 'MIGRATION_UNREADABLE' : 'MIGRATION_CORRUPT');
  }
  const journal = readJournal(cwd);
  if (!journal.ok || journal.tornTail) {
    quarantineUnchanged(cwd, journalPath(cwd));
    return result(journal.code === 'JOURNAL_READ' ? 'MIGRATION_UNREADABLE' : 'MIGRATION_CORRUPT');
  }
  if (state.schemaVersion === 1 && state.runId && UUID_RE.test(state.runId) &&
      Number.isSafeInteger(state.generation) && journal.events.some((event) =>
        event.runId === state.runId && event.generation === state.generation &&
        event.type === 'ROUTER_ARMED')) return { ok: true, migrated: false };
  let sealBytes;
  let seals;
  try {
    sealBytes = fs.readFileSync(sealFile);
    seals = JSON.parse(sealBytes);
    if (!seals || typeof seals !== 'object' || Array.isArray(seals)) throw new Error('seal shape');
  } catch (error) {
    quarantineUnchanged(cwd, sealFile);
    return result(['EACCES', 'EPERM', 'EISDIR'].includes(error.code) ? 'MIGRATION_UNREADABLE' : 'MIGRATION_CORRUPT');
  }
  const planRelative = typeof state.plan === 'string' ? state.plan : '';
  const planAbsolute = planRelative && path.resolve(cwd, planRelative);
  const sealed = seals[planKey(planRelative)] || seals[planRelative.toLowerCase()];
  const planSha256 = planAbsolute && sha256File(planAbsolute);
  if (!planRelative || path.isAbsolute(planRelative) ||
      (planAbsolute !== cwd && !planAbsolute.startsWith(path.resolve(cwd) + path.sep)) ||
      !planSha256 || !sealed || sealed.sha256 !== planSha256) {
    quarantineUnchanged(cwd, planAbsolute);
    quarantineUnchanged(cwd, sealFile);
    return result('MIGRATION_PLAN_INVALID');
  }
  const runId = options.runId || crypto.randomUUID();
  const now = Date.now();
  // The legacy seal was validated above; migration records the exact current bytes.
  const event = {
    schemaVersion: 1,
    type: 'LEGACY_RUN_MIGRATED',
    eventId: `evt_${crypto.randomBytes(16).toString('hex')}`,
    runId,
    seq: 1,
    generation: 0,
    atMs: now,
    payload: {
      legacyStateSha256: sha256(stateBytes),
      migrationCode: 'FRESH_REDISPATCH_REQUIRED',
      planPath: planRelative,
      planSha256,
    },
  };
  const appended = appendJournalEvent(cwd, event);
  if (!appended.ok) return appended;
  writeState(cwd, {
    schemaVersion: 1,
    phase: state.phase || 'forge',
    status: 'migration-required',
    runId,
    generation: 0,
    generationStartMs: now,
    plan: planRelative,
    planSha256,
    baselineHead: state.baselineHead || null,
    declaredPaths: [],
    verification: 'UNVERIFIED',
  });
  return { ok: true, migrated: true, event };
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
  sha256,
  canonicalJson,
  planKey,
  writeSeal,
  sealMatches,
  dispatchLogPath,
  extractEvidenceTails,
  readDispatchedTails,
  validateJournalEvent,
  parseJournalLine,
  journalPath,
  readJournal,
  acquireJournalLock,
  releaseJournalLock,
  appendJournalEvent,
  appendJournalPayload,
  normalizeRepoPath,
  enumeratePlanPaths,
  parseStrictPlan,
  validatePlanPathBaseline,
  capturePlanPathBaseline,
  capturePlanPathBaselineAtCommit,
  parseReceiptV1,
  validateCoreDispatch,
  atomicUnverified,
  buildSourceSnapshot,
  validateSourceSnapshot,
  migrateLegacyCoreRun,
};
