'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const lib = require('../hooks/scripts/lib');

function arg(name) { const i = process.argv.indexOf(name); return i < 0 ? null : process.argv[i + 1]; }
function waitFor(predicate, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) return false;
    const wait = new Int32Array(new SharedArrayBuffer(4));
    Atomics.wait(wait, 0, 0, 10);
  }
  return true;
}
if (process.argv[2] === '--child') {
  const [, , , cwd, runId, readyFile, goFile, doneFile] = process.argv;
  const hash = crypto.createHash('sha256').update(String(process.pid)).digest('hex');
  fs.writeFileSync(readyFile, String(process.pid));
  if (!waitFor(() => fs.existsSync(goFile), 10000)) process.exit(2);
  const out = lib.appendJournalPayload(cwd, 'ROUTER_ARMED', runId, 0, {
    baselineHead: null,
    baselineSnapshotSha256: hash,
    promptEventHash: hash,
  });
  fs.writeFileSync(doneFile, JSON.stringify({ ok: out.ok, code: out.code || null }));
  process.exit(out.ok ? 0 : 1);
}

const platformContract = arg('--platform-contract');
const fsKind = arg('--fs-kind');
const writeResult = arg('--write-result');
const writeCertification = arg('--write-certification');
const verifyResult = arg('--verify-result');
const verifyCertification = arg('--verify-certification');
if (!platformContract || fsKind !== 'local') throw new Error('explicit local platform contract required');
const capabilities = JSON.parse(fs.readFileSync(platformContract, 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'glm-journal-stress-'));
const runId = crypto.randomUUID();
const startedAtMs = Date.now();
const children = [];
const readyDir = path.join(tmp, 'ready');
const doneDir = path.join(tmp, 'done');
fs.mkdirSync(readyDir);
fs.mkdirSync(doneDir);
const goFile = path.join(tmp, 'go');
for (let i = 0; i < 8; i++) {
  children.push(spawn(process.execPath, [
    __filename, '--child', tmp, runId,
    path.join(readyDir, String(i)), goFile, path.join(doneDir, String(i)),
  ]));
}
if (!waitFor(() => fs.readdirSync(readyDir).length === 8)) throw new Error('children did not overlap');
fs.writeFileSync(goFile, 'go');
if (!waitFor(() => fs.readdirSync(doneDir).length === 8)) throw new Error('parallel children did not finish');
if (fs.readdirSync(doneDir).some((name) => !JSON.parse(fs.readFileSync(path.join(doneDir, name), 'utf8')).ok)) {
  throw new Error('parallel append failed');
}
const first = lib.readJournal(tmp);
if (!first.ok || first.events.length !== 8 || first.events.some((event, i) => event.seq !== i + 1)) throw new Error('journal sequence mismatch');
fs.appendFileSync(lib.journalPath(tmp), '{"torn":');
const repaired = lib.appendJournalPayload(tmp, 'ROUTER_ARMED', runId, 0, {
  baselineHead: null,
  baselineSnapshotSha256: 'a'.repeat(64),
  promptEventHash: 'b'.repeat(64),
});
if (!repaired.ok || lib.readJournal(tmp).events.length !== 9 ||
    !fs.readdirSync(path.dirname(lib.journalPath(tmp))).some((name) => name.includes('.torn-'))) {
  throw new Error('torn-tail repair failed');
}
const held = lib.acquireJournalLock(tmp);
if (!held.ok) throw new Error('lock acquisition failed');
const forged = { ...held, owner: { ...held.owner, ownerToken: '0'.repeat(32) } };
if (lib.releaseJournalLock(forged) || !lib.releaseJournalLock(held)) throw new Error('owner-token release failed');
const lockDir = path.join(tmp, '.glm-hammer', 'control.lock');
fs.mkdirSync(lockDir, { recursive: true });
fs.writeFileSync(path.join(lockDir, 'owner.json'), JSON.stringify({
  schemaVersion: 1, ownerToken: '1'.repeat(32), pid: 99999999, startedAtMs: 1, hostname: 'dead',
}));
const old = new Date(Date.now() - 60000);
fs.utimesSync(lockDir, old, old);
const reclaimed = lib.acquireJournalLock(tmp, { staleMs: 10, timeoutMs: 200 });
if (!reclaimed.ok || !lib.releaseJournalLock(reclaimed)) throw new Error('stale lock was not reclaimed');
fs.mkdirSync(lockDir, { recursive: true });
fs.utimesSync(lockDir, old, old);
const ownerless = lib.acquireJournalLock(tmp, { staleMs: 10, timeoutMs: 200 });
if (!ownerless.ok || !lib.releaseJournalLock(ownerless)) throw new Error('ownerless stale lock was not reclaimed');

const corrupt = fs.mkdtempSync(path.join(os.tmpdir(), 'glm-journal-corrupt-'));
const cRun = crypto.randomUUID();
const c1 = lib.appendJournalPayload(corrupt, 'ROUTER_ARMED', cRun, 0, {
  baselineHead: null, baselineSnapshotSha256: 'c'.repeat(64), promptEventHash: 'd'.repeat(64),
});
if (!c1.ok) throw new Error('corruption fixture setup failed');
const c2 = lib.appendJournalPayload(corrupt, 'ROUTER_ARMED', cRun, 0, {
  baselineHead: null, baselineSnapshotSha256: 'e'.repeat(64), promptEventHash: 'f'.repeat(64),
});
if (!c2.ok) throw new Error('corruption fixture setup failed');
const journalFile = lib.journalPath(corrupt);
const beforeCorruption = fs.readFileSync(journalFile);
fs.writeFileSync(journalFile, Buffer.concat([Buffer.from('not-json\n'), beforeCorruption.subarray(beforeCorruption.indexOf(10) + 1)]));
const corruptedBytes = fs.readFileSync(journalFile);
const blocked = lib.appendJournalPayload(corrupt, 'ROUTER_ARMED', cRun, 0, {
  baselineHead: null, baselineSnapshotSha256: 'a'.repeat(64), promptEventHash: 'b'.repeat(64),
});
if (blocked.ok || blocked.code !== 'EVT_JSON' || !corruptedBytes.equals(fs.readFileSync(journalFile))) {
  throw new Error('mid-file corruption was not blocked');
}
fs.rmSync(corrupt, { recursive: true, force: true });

const transitions = fs.mkdtempSync(path.join(os.tmpdir(), 'glm-journal-transition-'));
const tRun = crypto.randomUUID();
const legal = lib.appendJournalPayload(transitions, 'PHASE_TRANSITIONED', tRun, 0, {
  fromPhase: 'idle', fromStatus: 'idle', parentPhase: null, resumePhase: null,
  toPhase: 'forge', toStatus: 'drafting',
});
if (!legal.ok) throw new Error('legal transition rejected');
const illegal = lib.appendJournalPayload(transitions, 'PHASE_TRANSITIONED', tRun, 0, {
  fromPhase: 'forge', fromStatus: 'drafting', parentPhase: null, resumePhase: null,
  toPhase: 'idle', toStatus: 'done',
});
if (illegal.ok || illegal.code !== 'EVT_TRANSITION') throw new Error('illegal transition accepted');
fs.rmSync(transitions, { recursive: true, force: true });
const rotation = fs.mkdtempSync(path.join(os.tmpdir(), 'glm-journal-rotation-'));
const oldRun = crypto.randomUUID();
const rotationLines = [];
let rotationIndex = 0;
while (Buffer.byteLength(rotationLines.join('\n')) <= 512 * 1024) {
  const hex = crypto.createHash('sha256').update(String(rotationIndex)).digest('hex');
  rotationLines.push(lib.canonicalJson({
    schemaVersion: 1,
    type: 'ROUTER_ARMED',
    eventId: `evt_${hex.slice(0, 32)}`,
    runId: oldRun,
    seq: rotationIndex + 1,
    generation: 0,
    atMs: Date.now(),
    payload: { baselineHead: null, baselineSnapshotSha256: hex, promptEventHash: hex },
  }));
  rotationIndex++;
}
fs.mkdirSync(path.dirname(lib.journalPath(rotation)), { recursive: true });
fs.writeFileSync(lib.journalPath(rotation), rotationLines.join('\n') + '\n');
const terminal = lib.appendJournalPayload(rotation, 'RUN_COMPLETED', oldRun, 0, {
  planSha256: 'a'.repeat(64), reviewSnapshotSha256: 'b'.repeat(64),
});
if (!terminal.ok) throw new Error('rotation terminal setup failed');
const newRun = crypto.randomUUID();
const rotated = lib.appendJournalPayload(rotation, 'ROUTER_ARMED', newRun, 0, {
  baselineHead: null, baselineSnapshotSha256: 'c'.repeat(64), promptEventHash: 'd'.repeat(64),
});
const rotatedJournal = lib.readJournal(rotation);
const archives = fs.readdirSync(path.join(rotation, '.glm-hammer')).filter((name) => name.includes('.archive-'));
if (!rotated.ok || archives.length !== 1 || rotatedJournal.events.length !== 1 ||
    rotatedJournal.events[0].runId !== newRun || rotatedJournal.events[0].seq !== 1) {
  throw new Error('completed journal rotation failed');
}
const journalEvidence = {
  liveJournalSha256: lib.sha256(fs.readFileSync(lib.journalPath(rotation))),
  rotatedArchiveSha256: lib.sha256(fs.readFileSync(path.join(rotation, '.glm-hammer', archives[0]))),
};
fs.rmSync(rotation, { recursive: true, force: true });
const scriptSha256 = lib.sha256(fs.readFileSync(__filename));
const capabilitiesSha256 = lib.sha256(fs.readFileSync(platformContract));
const result = {
  schemaVersion: 1,
  engineIdentity: capabilities.engineIdentity,
  os: { platform: process.platform, release: os.release(), arch: process.arch, nodeVersion: process.version },
  fsKind: 'local', localSingleHost: true, testScriptSha256: scriptSha256,
  capabilitiesSha256, journalSchemaVersion: 1, startedAtMs, finishedAtMs: Date.now(),
  journalEvidence,
  cases: [
    { name: 'parallel-append', expectedCount: 8, actualCount: 8, verdict: 'PASS' },
    { name: 'torn-tail-repair', expectedCount: 9, actualCount: 9, verdict: 'PASS' },
    { name: 'owner-token-release', expectedCount: 1, actualCount: 1, verdict: 'PASS' },
    { name: 'stale-owner-lock-reclamation', expectedCount: 2, actualCount: 2, verdict: 'PASS' },
    { name: 'mid-file-corruption-blocking', expectedCount: 1, actualCount: 1, verdict: 'PASS' },
    { name: 'legal-transition-semantics', expectedCount: 1, actualCount: 1, verdict: 'PASS' },
    { name: 'completed-journal-rotation', expectedCount: 1, actualCount: 1, verdict: 'PASS' },
  ],
  overall: 'PASS',
};
function stableShape(value) {
  const copy = JSON.parse(JSON.stringify(value));
  delete copy.startedAtMs; delete copy.finishedAtMs;
  delete copy.journalEvidence;
  return copy;
}
let savedResult = null;
if (writeResult) fs.writeFileSync(writeResult, JSON.stringify(result, null, 2) + '\n');
if (verifyResult) {
  savedResult = JSON.parse(fs.readFileSync(verifyResult, 'utf8'));
  if (lib.canonicalJson(stableShape(savedResult)) !== lib.canonicalJson(stableShape(result)) ||
      !/^[0-9a-f]{64}$/.test(savedResult.journalEvidence?.liveJournalSha256 || '') ||
      !/^[0-9a-f]{64}$/.test(savedResult.journalEvidence?.rotatedArchiveSha256 || '')) {
    throw new Error('journal result certification mismatch');
  }
}
const resultPath = writeResult || verifyResult;
const certification = {
  schemaVersion: 1, engineIdentity: capabilities.engineIdentity, os: result.os,
  fsKind: 'local', localSingleHost: true, journalSchemaVersion: 1,
  testScriptSha256: scriptSha256, capabilitiesSha256,
  result: { path: 'tests/fixtures/runtime/journal-stress-result.json', sha256: resultPath && lib.sha256(fs.readFileSync(resultPath)) },
  journalEvidence: savedResult ? savedResult.journalEvidence : result.journalEvidence,
  reviewerId: 'local-operator', status: 'APPROVE',
};
if (writeCertification) fs.writeFileSync(writeCertification, JSON.stringify(certification, null, 2) + '\n');
if (verifyCertification) {
  const saved = JSON.parse(fs.readFileSync(verifyCertification, 'utf8'));
  if (!verifyResult || saved.result.path !== path.relative(process.cwd(), path.resolve(verifyResult)).replace(/\\/g, '/') ||
      saved.result.sha256 !== lib.sha256(fs.readFileSync(verifyResult)) ||
      lib.canonicalJson(saved) !== lib.canonicalJson(certification)) {
    throw new Error('platform certification mismatch');
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
process.stdout.write('JOURNAL_PLATFORM_CERTIFIED\n');
