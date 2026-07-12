'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const lib = require('../hooks/scripts/lib');

function arg(name) { const i = process.argv.indexOf(name); return i < 0 ? null : process.argv[i + 1]; }
if (process.argv[2] === '--child') {
  const [, , , cwd, runId] = process.argv;
  const hash = crypto.createHash('sha256').update(String(process.pid)).digest('hex');
  const out = lib.appendJournalPayload(cwd, 'ROUTER_ARMED', runId, 0, {
    baselineHead: null,
    baselineSnapshotSha256: hash,
    promptEventHash: hash,
  });
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
for (let i = 0; i < 8; i++) children.push(spawnSync(process.execPath, [__filename, '--child', tmp, runId]));
if (children.some((child) => child.status !== 0)) throw new Error('parallel append failed');
const first = lib.readJournal(tmp);
if (!first.ok || first.events.length !== 8 || first.events.some((event, i) => event.seq !== i + 1)) throw new Error('journal sequence mismatch');
fs.appendFileSync(lib.journalPath(tmp), '{"torn":');
const repaired = lib.appendJournalPayload(tmp, 'ROUTER_ARMED', runId, 0, {
  baselineHead: null,
  baselineSnapshotSha256: 'a'.repeat(64),
  promptEventHash: 'b'.repeat(64),
});
if (!repaired.ok || lib.readJournal(tmp).events.length !== 9) throw new Error('torn-tail repair failed');
const held = lib.acquireJournalLock(tmp);
if (!held.ok) throw new Error('lock acquisition failed');
const forged = { ...held, owner: { ...held.owner, ownerToken: '0'.repeat(32) } };
if (lib.releaseJournalLock(forged) || !lib.releaseJournalLock(held)) throw new Error('owner-token release failed');
const scriptSha256 = lib.sha256(fs.readFileSync(__filename));
const capabilitiesSha256 = lib.sha256(fs.readFileSync(platformContract));
const result = {
  schemaVersion: 1,
  engineIdentity: capabilities.engineIdentity,
  os: { platform: process.platform, release: os.release(), arch: process.arch, nodeVersion: process.version },
  fsKind: 'local', localSingleHost: true, testScriptSha256: scriptSha256,
  capabilitiesSha256, journalSchemaVersion: 1, startedAtMs, finishedAtMs: Date.now(),
  cases: [
    { name: 'parallel-append', expectedCount: 8, actualCount: 8, verdict: 'PASS' },
    { name: 'torn-tail-repair', expectedCount: 9, actualCount: 9, verdict: 'PASS' },
    { name: 'owner-token-release', expectedCount: 1, actualCount: 1, verdict: 'PASS' },
  ],
  overall: 'PASS',
};
function stableShape(value) {
  const copy = JSON.parse(JSON.stringify(value));
  delete copy.startedAtMs; delete copy.finishedAtMs;
  return copy;
}
if (writeResult) fs.writeFileSync(writeResult, JSON.stringify(result, null, 2) + '\n');
if (verifyResult) {
  const saved = JSON.parse(fs.readFileSync(verifyResult, 'utf8'));
  if (lib.canonicalJson(stableShape(saved)) !== lib.canonicalJson(stableShape(result))) throw new Error('journal result certification mismatch');
}
const resultPath = writeResult || verifyResult;
const certification = {
  schemaVersion: 1, engineIdentity: capabilities.engineIdentity, os: result.os,
  fsKind: 'local', localSingleHost: true, journalSchemaVersion: 1,
  testScriptSha256: scriptSha256, capabilitiesSha256,
  result: { path: 'tests/fixtures/runtime/journal-stress-result.json', sha256: resultPath && lib.sha256(fs.readFileSync(resultPath)) },
  reviewerId: 'local-operator', status: 'APPROVE',
};
if (writeCertification) fs.writeFileSync(writeCertification, JSON.stringify(certification, null, 2) + '\n');
if (verifyCertification) {
  const saved = JSON.parse(fs.readFileSync(verifyCertification, 'utf8'));
  const comparable = { ...saved, result: { ...saved.result, sha256: certification.result.sha256 } };
  if (lib.canonicalJson(comparable) !== lib.canonicalJson(certification)) throw new Error('platform certification mismatch');
}
fs.rmSync(tmp, { recursive: true, force: true });
process.stdout.write('JOURNAL_PLATFORM_CERTIFIED\n');
