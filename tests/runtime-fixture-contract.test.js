'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHA = /^[0-9a-f]{64}$/;
const REQUIRED = [
  'README.md', 'manifest.json', 'session-start-normal.json', 'session-start-compact.json',
  'user-prompt-submit.json', 'stop.jsonl', 'agent-task-post-tool-use.json',
  'parallel-agent-task-post-tool-use.json', 'capabilities.json',
  'architect-approval-receipt.json', 'approval.json',
];
function die(code, detail) { process.stderr.write(`${code}${detail ? `: ${detail}` : ''}\n`); process.exit(1); }
function readJson(file, code) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { die(code, file); } }
function hash(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function keys(value, allowed, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) die(code);
  const a = Object.keys(value).sort(); const b = [...allowed].sort();
  if (a.length !== b.length || a.some((k, i) => k !== b[i])) die(code, a.join(','));
}
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function identity(value, code) {
  keys(value, ['name', 'version', 'artifactSha256'], code);
  if (!/^[a-z][a-z0-9._-]*$/.test(value.name) || !value.version || /[?*x]/i.test(value.version) || !SHA.test(value.artifactSha256)) die(code);
}
const approvalArg = process.argv.indexOf('--approval');
if (approvalArg < 0 || !process.argv[approvalArg + 1]) die('RUNTIME_APPROVAL_REQUIRED');
const approvalPath = path.resolve(process.argv[approvalArg + 1]);
const fixtureDir = path.dirname(approvalPath);
for (const name of REQUIRED) if (!fs.existsSync(path.join(fixtureDir, name))) die('RUNTIME_FIXTURE_MISSING', name);

const manifestPath = path.join(fixtureDir, 'manifest.json');
const capabilitiesPath = path.join(fixtureDir, 'capabilities.json');
const receiptPath = path.join(fixtureDir, 'architect-approval-receipt.json');
const manifest = readJson(manifestPath, 'RUNTIME_MANIFEST_JSON');
keys(manifest, ['schemaVersion', 'engineIdentity', 'sanitizerVersion', 'fixtures'], 'RUNTIME_MANIFEST_FIELDS');
if (manifest.schemaVersion !== 1 || !manifest.sanitizerVersion || !Array.isArray(manifest.fixtures)) die('RUNTIME_MANIFEST_VALUE');
identity(manifest.engineIdentity, 'RUNTIME_IDENTITY');
const rowKeys = ['name', 'event', 'status', 'sourceKind', 'sourceRef', 'sourceSha256', 'fixturePath', 'fixtureSha256', 'retainedFields', 'notes'];
const names = new Set();
for (const row of manifest.fixtures) {
  keys(row, rowKeys, 'RUNTIME_MANIFEST_ROW_FIELDS');
  if (names.has(row.name)) die('RUNTIME_MANIFEST_DUPLICATE', row.name); names.add(row.name);
  if (!['supported', 'unsupported', 'unverified'].includes(row.status)) die('RUNTIME_MANIFEST_STATUS');
  if (!['live-capture', 'distribution-source', 'built-in-guide'].includes(row.sourceKind)) die('RUNTIME_MANIFEST_SOURCE');
  if (!Array.isArray(row.retainedFields) || !same(row.retainedFields, [...row.retainedFields].sort())) die('RUNTIME_RETAINED_FIELDS');
  if (row.sourceSha256 !== null && !SHA.test(row.sourceSha256)) die('RUNTIME_SOURCE_HASH');
  if (row.fixturePath === null) {
    if (row.fixtureSha256 !== null || row.status === 'supported') die('RUNTIME_FIXTURE_BINDING');
  } else {
    const target = path.resolve(ROOT, row.fixturePath);
    if (path.relative(fixtureDir, target).startsWith('..')) die('RUNTIME_FIXTURE_PATH');
    if (!SHA.test(row.fixtureSha256) || hash(target) !== row.fixtureSha256) die('RUNTIME_FIXTURE_HASH', row.name);
  }
}
const capabilities = readJson(capabilitiesPath, 'RUNTIME_CAPABILITIES_JSON');
keys(capabilities, ['schemaVersion', 'engineIdentity', 'manifestSha256', 'questionObserver', 'capabilities'], 'RUNTIME_CAPABILITIES_FIELDS');
if (capabilities.schemaVersion !== 1 || !same(capabilities.engineIdentity, manifest.engineIdentity) || capabilities.manifestSha256 !== hash(manifestPath)) die('RUNTIME_CAPABILITIES_BINDING');
if (!['ask-user-question', 'stop-transcript', 'unavailable'].includes(capabilities.questionObserver)) die('RUNTIME_QUESTION_OBSERVER');
for (const required of ['AskUserQuestion', 'Bash']) {
  const cap = capabilities.capabilities && capabilities.capabilities[required];
  keys(cap, ['status', 'fixtureName', 'requiredFields', 'consumers', 'fallback'], 'RUNTIME_CAPABILITY_FIELDS');
  if (!['supported', 'unsupported', 'unverified'].includes(cap.status)) die('RUNTIME_CAPABILITY_STATUS');
  const row = manifest.fixtures.find((item) => item.name === cap.fixtureName);
  if (!row) die('RUNTIME_CAPABILITY_FIXTURE');
  if (cap.status !== 'supported' && row.fixturePath !== null) die('RUNTIME_UNSUPPORTED_PAYLOAD');
}
const ask = capabilities.capabilities.AskUserQuestion;
if (capabilities.questionObserver === 'ask-user-question' && ask.status !== 'supported') die('RUNTIME_QUESTION_OBSERVER_BINDING');
if (capabilities.questionObserver === 'stop-transcript' && (capabilities.capabilities.Stop || {}).status !== 'supported') die('RUNTIME_QUESTION_OBSERVER_BINDING');

const receipt = readJson(receiptPath, 'RUNTIME_ARCHITECT_RECEIPT_JSON');
keys(receipt, ['schemaVersion', 'reviewerRole', 'reviewerId', 'architecturalStatus', 'recommendation', 'engineIdentity', 'manifestSha256', 'capabilitiesSha256', 'matrixSha256', 'reviewedAt'], 'RUNTIME_ARCHITECT_RECEIPT_FIELDS');
if (receipt.schemaVersion !== 1 || receipt.reviewerRole !== 'architect' || receipt.architecturalStatus !== 'CLEAR' || receipt.recommendation !== 'APPROVE') die('RUNTIME_ARCHITECT_DECISION');
if (!same(receipt.engineIdentity, manifest.engineIdentity) || receipt.manifestSha256 !== hash(manifestPath) || receipt.capabilitiesSha256 !== hash(capabilitiesPath) || !SHA.test(receipt.matrixSha256)) die('RUNTIME_ARCHITECT_BINDING');
const approval = readJson(approvalPath, 'RUNTIME_APPROVAL_JSON');
keys(approval, ['schemaVersion', 'architecturalStatus', 'recommendation', 'engineIdentity', 'manifestSha256', 'capabilitiesSha256', 'matrixSha256', 'receipt'], 'RUNTIME_APPROVAL_FIELDS');
keys(approval.receipt, ['path', 'sha256'], 'RUNTIME_APPROVAL_RECEIPT_FIELDS');
if (approval.schemaVersion !== 1 || approval.architecturalStatus !== 'CLEAR' || approval.recommendation !== 'APPROVE' || !same(approval.engineIdentity, manifest.engineIdentity)) die('RUNTIME_APPROVAL_DECISION');
if (approval.manifestSha256 !== hash(manifestPath) || approval.capabilitiesSha256 !== hash(capabilitiesPath) || approval.matrixSha256 !== receipt.matrixSha256 || approval.receipt.path !== 'tests/fixtures/runtime/architect-approval-receipt.json' || approval.receipt.sha256 !== hash(receiptPath)) die('RUNTIME_APPROVAL_BINDING');
process.stdout.write('RUNTIME_CAPABILITY_APPROVED\n');
