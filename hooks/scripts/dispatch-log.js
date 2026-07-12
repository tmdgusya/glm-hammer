'use strict';
// PostToolUse hook (Agent|Task): subagent dispatch ledger (forged-receipt defense).
// Records every evidence path mentioned in a subagent dispatch's input to
// .glm-hammer/dispatch.jsonl. stop-gate cross-checks receipts against this
// ledger: a receipt no dispatched judge was ever pointed at was written by
// the orchestrator itself — and does not count.
const fs = require('fs');
const path = require('path');
const {
  readStdin, dispatchLogPath, extractEvidenceTails, readState, readJournal,
  parseReceiptV1, validateCoreDispatch, appendJournalPayload, buildSourceSnapshot,
  canonicalJson, sha256, sha256File,
} = require('./lib');

const MAX_LOG_BYTES = 512 * 1024;
function recordCoreDispatch(cwd, state, input, tails) {
  if (!state || state.schemaVersion !== 1 || !state.runId || !Number.isSafeInteger(state.generation)) return null;
  const toolInput = input.tool_input || {};
  const preallocated = toolInput.dispatchId || toolInput.dispatch_id;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(preallocated || '')) return false;
  const now = Date.now();
  const invocationMs = Number.isSafeInteger(toolInput.invocationMs) ? toolInput.invocationMs : now;
  const completionMs = Number.isSafeInteger(toolInput.completionMs) ? toolInput.completionMs : now;
  const observedAtMs = Number.isSafeInteger(input.observedAtMs) ? input.observedAtMs : now;
  const toolEventHash = HASH.test(toolInput.toolEventHash || '') ? toolInput.toolEventHash : sha256(Buffer.from(canonicalJson(toolInput)));
  const planPath = state.plan && path.resolve(cwd, state.plan);
  const planSha256 = state.planSha256 || (planPath && sha256File(planPath));
  if (!HASH.test(planSha256 || '')) return false;
  const journal = readJournal(cwd);
  if (!journal.ok) return false;
  for (const tail of tails) {
    const evidencePath = `.glm-hammer/evidence/${tail}`;
    const absolute = path.join(cwd, '.glm-hammer', 'evidence', ...tail.split('/'));
    let stat;
    let body;
    try {
      stat = fs.statSync(absolute);
      body = fs.readFileSync(absolute, 'utf8');
    } catch {
      return false;
    }
    const parsed = parseReceiptV1(body, {
      runId: state.runId,
      generation: state.generation,
      planSha256,
    });
    if (!parsed.ok || parsed.value.DISPATCH_ID !== preallocated || parsed.value.evidenceTail !== tail) return false;
    let reviewSnapshot = null;
    if (parsed.value.role === 'security-reviewer' || parsed.value.role === 'qa-reviewer') {
      const requestedSnapshot = toolInput.sourceSnapshotSha256 || toolInput.source_snapshot_sha256;
      const promptText = String(toolInput.prompt || toolInput.description || '');
      if (!HASH.test(requestedSnapshot || '') ||
          parsed.value.SOURCE_SNAPSHOT_SHA256 !== requestedSnapshot ||
          !promptText.includes(requestedSnapshot)) return false;
      const snapshotEvent = [...journal.events].reverse().find((event) =>
        event.runId === state.runId && event.generation === state.generation &&
        event.type === 'SOURCE_REVIEW_SNAPSHOT_RECORDED' &&
        event.payload.snapshotSha256 === requestedSnapshot
      );
      if (!snapshotEvent) return false;
      reviewSnapshot = {
        runId: snapshotEvent.runId,
        generation: snapshotEvent.generation,
        atMs: snapshotEvent.atMs,
        snapshotSha256: snapshotEvent.payload.snapshotSha256,
      };
    }
    const receiptSha256 = sha256(Buffer.from(body));
    const receiptSize = Buffer.byteLength(body);
    const stat2 = fs.statSync(absolute);
    if (stat2.size !== stat.size || stat2.mtimeMs !== stat.mtimeMs ||
        (stat2.dev != null && stat2.dev !== stat.dev) || (stat2.ino != null && stat2.ino !== stat.ino)) return false;
    if (reviewSnapshot) {
      const fresh = buildSourceSnapshot(cwd, {
        baselineHead: state.baselineHead || null,
        declaredPaths: state.declaredPaths || [],
      });
      if (!fresh.ok || fresh.sha256 !== reviewSnapshot.snapshotSha256) return false;
    }
    const payload = {
      completionMs,
      dispatchId: preallocated,
      evidencePath,
      invocationMs,
      observedAtMs,
      receiptMtimeMs: Math.floor(stat.mtimeMs),
      receiptSha256,
      receiptSize,
      role: parsed.value.role,
      sourceSnapshotSha256: parsed.value.SOURCE_SNAPSHOT_SHA256 || null,
      toolEventHash,
    };
    const checked = validateCoreDispatch(payload, {
      runId: state.runId,
      generation: state.generation,
      generationStartMs: state.generationStartMs || 0,
      nowMs: now,
      reviewSnapshot,
    });
    if (!checked.ok) return false;
    const duplicate = journal.events.find((event) =>
      event.type === 'CORE_DISPATCH_COMPLETED' && event.runId === state.runId &&
      event.payload.dispatchId === payload.dispatchId
    );
    if (duplicate && canonicalJson(duplicate.payload) !== canonicalJson(payload)) return false;
    if (duplicate) continue;
    if (!appendJournalPayload(cwd, 'CORE_DISPATCH_COMPLETED', state.runId, state.generation, payload).ok) return false;
  }
  return true;
}
const HASH = /^[0-9a-f]{64}$/;

try {
  const input = readStdin();
  const cwd = input.cwd || process.cwd();
  const toolInput = input.tool_input;
  if (!toolInput) process.exit(0);

  const paths = extractEvidenceTails(JSON.stringify(toolInput));
  if (paths.length === 0) process.exit(0);
  const state = readState(cwd);
  const coreDispatch = recordCoreDispatch(cwd, state, input, paths);
  if (coreDispatch !== null) process.exit(0);

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
