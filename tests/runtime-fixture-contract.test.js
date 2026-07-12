'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHA = /^[0-9a-f]{64}$/;
const REQUIRED = [
  'README.md', 'manifest.json', 'capability-matrix.json', 'session-start-normal.json', 'session-start-compact.json',
  'user-prompt-submit.json', 'stop.jsonl', 'agent-task-post-tool-use.json',
  'parallel-agent-task-post-tool-use.json', 'capabilities.json', 'architect-approval-receipt.json', 'approval.json',
];
const TYPE_NAMES = new Set(['string', 'number', 'boolean', 'object']);
const SUPPORTED_EVENTS = ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PermissionRequest', 'PostToolUse', 'PostToolUseFailure', 'Stop'];
const OBSERVED_EVENTS = ['SessionStart', 'UserPromptSubmit', 'PostToolUse', 'Stop'];
function die(code, detail) { process.stderr.write(`${code}${detail ? `: ${detail}` : ''}\n`); process.exit(1); }
function readJson(file, code) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { die(code, file); } }
function bytes(file, code) { try { return fs.readFileSync(file); } catch { die(code, file); } }
function hash(file) { return crypto.createHash('sha256').update(bytes(file, 'RUNTIME_FILE_READ')).digest('hex'); }
function keys(value, allowed, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) die(code, 'object required');
  const a = Object.keys(value).sort(); const b = [...allowed].sort();
  if (a.length !== b.length || a.some((k, i) => k !== b[i])) die(code, a.join(','));
}
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function inside(parent, child) {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel));
}
function identity(value, code) {
  keys(value, ['name', 'version', 'artifactSha256'], code);
  if (!/^[a-z][a-z0-9._-]*$/.test(value.name) || !value.version || /[?*x]/i.test(value.version) || !SHA.test(value.artifactSha256)) die(code);
}
function safeShape(shape, code) {
  if (!shape || typeof shape !== 'object' || Array.isArray(shape)) die(code, 'payloadShape');
  for (const [key, value] of Object.entries(shape)) {
    if (/secret|token|password|authorization|cookie|header|api[-_]?key/i.test(key) || typeof value !== 'string' || !TYPE_NAMES.has(value)) die(code, key);
  }
}
function sourceView(source, expectedIdentity) {
  keys(source, ['event', 'environment', 'payloadShape', 'sourceKind'], 'RUNTIME_SOURCE_FIELDS');
  keys(source.environment, ['GLM_HAMMER_ENGINE_NAME', 'GLM_HAMMER_ENGINE_VERSION', 'GLM_HAMMER_ENGINE_SHA256'], 'RUNTIME_SOURCE_ENVIRONMENT');
  if (!same(source.environment, {
    GLM_HAMMER_ENGINE_NAME: expectedIdentity.name,
    GLM_HAMMER_ENGINE_VERSION: expectedIdentity.version,
    GLM_HAMMER_ENGINE_SHA256: expectedIdentity.artifactSha256,
  })) die('RUNTIME_SOURCE_IDENTITY');
  safeShape(source.payloadShape, 'RUNTIME_SOURCE_PAYLOAD');
  if (source.sourceKind !== 'live-capture') die('RUNTIME_SOURCE_KIND');
  if (!OBSERVED_EVENTS.includes(source.event)) die('RUNTIME_SOURCE_EVENT', source.event);
  return { event: source.event, payloadShape: Object.fromEntries(Object.entries(source.payloadShape).sort()), sourceKind: source.sourceKind };
}
function fixtureRecords(file, code) {
  if (file.endsWith('.jsonl')) {
    const lines = bytes(file, code).toString('utf8').split('\n').filter(Boolean);
    if (!lines.length) die(code, file);
    return lines.map((line) => { try { return JSON.parse(line); } catch { die(code, file); } });
  }
  const value = readJson(file, code);
  return Array.isArray(value) ? value : [value];
}
function safeRef(ref) {
  return typeof ref === 'string' && ref.length > 0 && ref.split(',').every((part) => {
    const value = part.trim();
    return value && path.basename(value) === value && value !== '.' && value !== '..';
  });
}
const approvalArg = process.argv.indexOf('--approval');
if (approvalArg < 0 || !process.argv[approvalArg + 1]) die('RUNTIME_APPROVAL_REQUIRED');
const approvalPath = path.resolve(process.argv[approvalArg + 1]);
const fixtureDir = path.dirname(approvalPath);
for (const name of REQUIRED) if (!fs.existsSync(path.join(fixtureDir, name))) die('RUNTIME_FIXTURE_MISSING', name);

const manifestPath = path.join(fixtureDir, 'manifest.json');
const matrixPath = path.join(fixtureDir, 'capability-matrix.json');
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
  if (!['SessionStart', 'UserPromptSubmit', 'PostToolUse', 'Stop', 'AskUserQuestion', 'Bash'].includes(row.event)) die('RUNTIME_MANIFEST_EVENT');
  if (!['live-capture', 'distribution-source', 'built-in-guide'].includes(row.sourceKind)) die('RUNTIME_MANIFEST_SOURCE');
  if (!Array.isArray(row.retainedFields) || !same(row.retainedFields, [...row.retainedFields].sort())) die('RUNTIME_RETAINED_FIELDS');
  if (row.sourceSha256 !== null && !SHA.test(row.sourceSha256)) die('RUNTIME_SOURCE_HASH');
  if (row.fixturePath === null) {
    if (row.fixtureSha256 !== null || row.sourceSha256 !== null || row.status === 'supported') die('RUNTIME_FIXTURE_BINDING');
    continue;
  }
  const target = path.resolve(ROOT, row.fixturePath);
  if (!fs.existsSync(target) || !inside(fixtureDir, target)) die('RUNTIME_FIXTURE_PATH');
  if (!SHA.test(row.fixtureSha256) || hash(target) !== row.fixtureSha256) die('RUNTIME_FIXTURE_HASH', row.name);
  if (row.status !== 'supported' || row.sourceKind !== 'live-capture' || !safeRef(row.sourceRef) || !SHA.test(row.sourceSha256)) die('RUNTIME_FIXTURE_BINDING', row.name);
  const sourceRoot = path.join(fixtureDir, 'source');
  const refs = row.sourceRef.split(',').map((ref) => ref.trim());
  const sourcePaths = refs.map((ref) => path.join(sourceRoot, ref));
  if (sourcePaths.some((source) => !fs.existsSync(source) || !fs.statSync(source).isFile())) die('RUNTIME_SOURCE_MISSING', row.name);
  if (sha256Concat(sourcePaths) !== row.sourceSha256) die('RUNTIME_SOURCE_HASH', row.name);
  const sourceRecords = sourcePaths.map((source) => sourceView(readJson(source, 'RUNTIME_SOURCE_JSON'), manifest.engineIdentity));
  const outputRecords = fixtureRecords(target, 'RUNTIME_FIXTURE_JSON');
  if (sourceRecords.length !== outputRecords.length) die('RUNTIME_SOURCE_FIXTURE_BINDING', row.name);
  for (let i = 0; i < outputRecords.length; i++) {
    keys(outputRecords[i], row.retainedFields, 'RUNTIME_RETAINED_FIELDS');
    safeShape(outputRecords[i].payloadShape, 'RUNTIME_FIXTURE_PAYLOAD');
    if (outputRecords[i].event !== row.event || outputRecords[i].sourceKind !== row.sourceKind || !same(outputRecords[i], sourceRecords[i])) die('RUNTIME_SOURCE_FIXTURE_BINDING', row.name);
  }
}
function sha256Concat(files) {
  return crypto.createHash('sha256').update(Buffer.concat(files.map((file) => bytes(file, 'RUNTIME_SOURCE_READ')))).digest('hex');
}
const capabilities = readJson(capabilitiesPath, 'RUNTIME_CAPABILITIES_JSON');
keys(capabilities, ['schemaVersion', 'engineIdentity', 'manifestSha256', 'questionObserver', 'capabilities'], 'RUNTIME_CAPABILITIES_FIELDS');
if (capabilities.schemaVersion !== 1 || !same(capabilities.engineIdentity, manifest.engineIdentity) || capabilities.manifestSha256 !== hash(manifestPath)) die('RUNTIME_CAPABILITIES_BINDING');
if (capabilities.questionObserver !== 'stop-transcript') die('RUNTIME_QUESTION_OBSERVER');
for (const [name, cap] of Object.entries(capabilities.capabilities || {})) {
  keys(cap, ['status', 'fixtureName', 'requiredFields', 'consumers', 'fallback'], 'RUNTIME_CAPABILITY_FIELDS');
  if (!['supported', 'unsupported', 'unverified'].includes(cap.status)) die('RUNTIME_CAPABILITY_STATUS');
  const row = manifest.fixtures.find((item) => item.name === cap.fixtureName);
  if (!row || cap.status !== row.status) die('RUNTIME_CAPABILITY_FIXTURE');
}
for (const required of ['AskUserQuestion', 'Bash']) {
  const cap = capabilities.capabilities && capabilities.capabilities[required];
  if (!cap || cap.status !== 'unsupported') die('RUNTIME_UNSUPPORTED_CAPABILITY');
}
if (!capabilities.capabilities.Stop || capabilities.capabilities.Stop.status !== 'supported') die('RUNTIME_STOP_CAPABILITY');

const matrix = readJson(matrixPath, 'RUNTIME_MATRIX_JSON');
keys(matrix, ['schemaVersion', 'engineIdentity', 'observedEvents', 'supportedZCodeEvents', 'questionObserver', 'f11', 'captureSessionId'], 'RUNTIME_MATRIX_FIELDS');
if (matrix.schemaVersion !== 1 || !same(matrix.engineIdentity, manifest.engineIdentity) || !same(matrix.observedEvents, OBSERVED_EVENTS) || !same(matrix.supportedZCodeEvents, SUPPORTED_EVENTS) || matrix.questionObserver !== 'stop-transcript' || matrix.f11 !== 'OPEN' || !/^sess_[a-z0-9-]+$/.test(matrix.captureSessionId)) die('RUNTIME_MATRIX_VALUE');

const normal = manifest.fixtures.find((row) => row.name === 'session-start-normal');
const compact = manifest.fixtures.find((row) => row.name === 'session-start-compact');
const parallel = manifest.fixtures.find((row) => row.name === 'parallel-agent-task-post-tool-use');
const stop = manifest.fixtures.find((row) => row.name === 'stop');
if (!normal || !compact || !parallel || !stop) die('RUNTIME_REQUIRED_FIXTURE');
const normalRecord = fixtureRecords(path.resolve(ROOT, normal.fixturePath), 'RUNTIME_FIXTURE_JSON')[0];
const compactRecord = fixtureRecords(path.resolve(ROOT, compact.fixturePath), 'RUNTIME_FIXTURE_JSON')[0];
if (normalRecord.payloadShape.turnId !== 'string' || compactRecord.payloadShape.turnId !== undefined || !normalRecord.payloadShape.source || !compactRecord.payloadShape.source) die('RUNTIME_SESSION_VARIANTS');
const parallelRecords = fixtureRecords(path.resolve(ROOT, parallel.fixturePath), 'RUNTIME_FIXTURE_JSON');
if (parallelRecords.length !== 2 || parallel.sourceRef.split(',').length !== 2 || parallelRecords.some((record) => record.event !== 'PostToolUse')) die('RUNTIME_PARALLEL_COUNT');
const stopRecords = fixtureRecords(path.resolve(ROOT, stop.fixturePath), 'RUNTIME_FIXTURE_JSON');
if (stopRecords.length !== 2 || stopRecords.some((record) => record.event !== 'Stop' || !['responsePreview', 'responseText', 'transcriptPath', 'transcript_path', 'toolCallCount'].every((field) => Object.hasOwn(record.payloadShape, field)))) die('RUNTIME_STOP_OBSERVATION');

const receipt = readJson(receiptPath, 'RUNTIME_ARCHITECT_RECEIPT_JSON');
keys(receipt, ['schemaVersion', 'reviewerRole', 'reviewerId', 'architecturalStatus', 'recommendation', 'engineIdentity', 'manifestSha256', 'capabilitiesSha256', 'matrixSha256', 'reviewedAt'], 'RUNTIME_ARCHITECT_RECEIPT_FIELDS');
if (receipt.schemaVersion !== 1 || receipt.reviewerRole !== 'architect' || receipt.architecturalStatus !== 'CLEAR' || receipt.recommendation !== 'APPROVE') die('RUNTIME_ARCHITECT_DECISION');
if (!same(receipt.engineIdentity, manifest.engineIdentity) || receipt.manifestSha256 !== hash(manifestPath) || receipt.capabilitiesSha256 !== hash(capabilitiesPath) || receipt.matrixSha256 !== hash(matrixPath)) die('RUNTIME_ARCHITECT_BINDING');
const approval = readJson(approvalPath, 'RUNTIME_APPROVAL_JSON');
keys(approval, ['schemaVersion', 'architecturalStatus', 'recommendation', 'engineIdentity', 'manifestSha256', 'capabilitiesSha256', 'matrixSha256', 'receipt'], 'RUNTIME_APPROVAL_FIELDS');
keys(approval.receipt, ['path', 'sha256'], 'RUNTIME_APPROVAL_RECEIPT_FIELDS');
if (approval.schemaVersion !== 1 || approval.architecturalStatus !== 'CLEAR' || approval.recommendation !== 'APPROVE' || !same(approval.engineIdentity, manifest.engineIdentity)) die('RUNTIME_APPROVAL_DECISION');
if (approval.manifestSha256 !== hash(manifestPath) || approval.capabilitiesSha256 !== hash(capabilitiesPath) || approval.matrixSha256 !== hash(matrixPath) || approval.matrixSha256 !== receipt.matrixSha256 || approval.receipt.path !== 'tests/fixtures/runtime/architect-approval-receipt.json' || approval.receipt.sha256 !== hash(receiptPath)) die('RUNTIME_APPROVAL_BINDING');
process.stdout.write('RUNTIME_CAPABILITY_APPROVED\n');
