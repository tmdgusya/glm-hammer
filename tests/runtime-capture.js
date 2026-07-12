'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SHA256 = /^[0-9a-f]{64}$/;
const IDENTITY_KEYS = ['GLM_HAMMER_ENGINE_NAME', 'GLM_HAMMER_ENGINE_VERSION', 'GLM_HAMMER_ENGINE_SHA256'];
const CAPTURE_EVENTS = new Set(['SessionStart', 'UserPromptSubmit', 'PostToolUse', 'Stop']);
const TYPE_NAMES = new Set(['string', 'number', 'boolean', 'object']);

function fail(code, detail) {
  process.stderr.write(`${code}${detail ? `: ${detail}` : ''}\n`);
  process.exit(1);
}
function sha256Bytes(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}
function sha256File(file) {
  try { return sha256Bytes(fs.readFileSync(file)); } catch { fail('CAPTURE_FILE_UNREADABLE', file); }
}
function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}
function realExistingDirectory(value, code) {
  if (!value) fail(code, 'missing path');
  let resolved;
  try {
    resolved = fs.realpathSync(value);
    if (!fs.statSync(resolved).isDirectory()) fail(code, 'not a directory');
  } catch {
    fail(code, 'directory is not readable');
  }
  return resolved;
}
function regularFile(value, code) {
  if (!value) fail(code, 'missing path');
  try {
    const resolved = fs.realpathSync(value);
    if (!fs.statSync(resolved).isFile()) fail(code, 'not a regular file');
    return resolved;
  } catch {
    fail(code, 'file is not readable');
  }
}
function inside(parent, child) {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel));
}
function validateIdentity() {
  for (const key of IDENTITY_KEYS) if (!process.env[key]) fail('CAPTURE_IDENTITY_MISSING', key);
  if (!/^[a-z][a-z0-9._-]*$/.test(process.env.GLM_HAMMER_ENGINE_NAME)) fail('CAPTURE_IDENTITY_INVALID', 'engine name');
  if (/[*?x]/i.test(process.env.GLM_HAMMER_ENGINE_VERSION)) fail('CAPTURE_IDENTITY_WILDCARD', 'engine version');
  if (!SHA256.test(process.env.GLM_HAMMER_ENGINE_SHA256)) fail('CAPTURE_IDENTITY_INVALID', 'artifact hash');
  if (process.env.GLM_HAMMER_ENGINE_NAME !== 'zcode-cli') fail('CAPTURE_ENGINE_IDENTITY_MISMATCH', 'engine name');

  const artifact = regularFile(process.env.ZCODE_ENGINE_ARTIFACT, 'CAPTURE_ARTIFACT_MISSING');
  const binary = regularFile(process.env.ZCODE_BIN, 'CAPTURE_BINARY_MISSING');
  if (artifact !== binary) fail('CAPTURE_ENGINE_PATH_MISMATCH');
  if (sha256File(artifact) !== process.env.GLM_HAMMER_ENGINE_SHA256) fail('CAPTURE_ARTIFACT_MISMATCH');

  const probe = spawnSync(binary, ['doctor', '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1024 * 1024 });
  if (probe.error || probe.status !== 0) fail('CAPTURE_ENGINE_PROBE_FAILED');
  let report;
  try { report = JSON.parse(probe.stdout); } catch { fail('CAPTURE_ENGINE_PROBE_FAILED', 'invalid json'); }
  if (!report || !report.cli || report.cli.processName !== 'zcode-cli' || report.cli.processName !== process.env.GLM_HAMMER_ENGINE_NAME || report.cli.version !== process.env.GLM_HAMMER_ENGINE_VERSION) {
    fail('CAPTURE_ENGINE_IDENTITY_MISMATCH');
  }
}
function validateCaptureDirectory(value, requireEmpty) {
  const capture = realExistingDirectory(value, 'CAPTURE_DIRECTORY_INVALID');
  const exported = realExistingDirectory(process.env.GLM_HAMMER_CAPTURE_DIR, 'CAPTURE_DIRECTORY_ENV_MISSING');
  if (capture !== exported) fail('CAPTURE_DIRECTORY_MISMATCH');
  const productRoots = [ROOT, path.join(ROOT, '.glm-hammer')].map((p) => path.resolve(p));
  if (productRoots.some((p) => inside(p, capture) || inside(capture, p))) fail('CAPTURE_DIRECTORY_PRODUCT_PATH');
  if (requireEmpty && fs.readdirSync(capture).length !== 0) fail('CAPTURE_DIRECTORY_NOT_EMPTY');
  return capture;
}
function validateEnvironment() {
  validateIdentity();
  validateCaptureDirectory(process.env.GLM_HAMMER_CAPTURE_DIR, true);
  process.stdout.write('CAPTURE_ENVIRONMENT_OK\n');
}
function readJson(file, code) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { fail(code, file); }
}
function assertKeys(object, expected, code) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) fail(code, 'object required');
  const actual = Object.keys(object).sort();
  const allowed = [...expected].sort();
  if (actual.length !== allowed.length || actual.some((k, i) => k !== allowed[i])) fail(code, actual.join(','));
}
function sanitizePayloadShape(payloadShape) {
  if (!payloadShape || typeof payloadShape !== 'object' || Array.isArray(payloadShape)) fail('CAPTURE_FIXTURE_RAW_FIELD', 'payloadShape');
  const out = {};
  for (const key of Object.keys(payloadShape).sort()) {
    if (/secret|token|password|authorization|cookie|header|api[-_]?key/i.test(key)) fail('CAPTURE_FIXTURE_RAW_FIELD', key);
    const value = payloadShape[key];
    if (typeof value !== 'string' || !TYPE_NAMES.has(value)) fail('CAPTURE_FIXTURE_RAW_FIELD', key);
    out[key] = value;
  }
  return out;
}
function sanitizeFixture(input) {
  assertKeys(input, ['event', 'environment', 'payloadShape', 'sourceKind'], 'CAPTURE_FIXTURE_FIELDS');
  assertKeys(input.environment, IDENTITY_KEYS, 'CAPTURE_FIXTURE_ENVIRONMENT');
  if (IDENTITY_KEYS.some((k) => input.environment[k] !== process.env[k])) fail('CAPTURE_INHERITANCE_MISMATCH');
  if (!CAPTURE_EVENTS.has(input.event)) fail('CAPTURE_FIXTURE_EVENT', input.event);
  if (input.sourceKind !== 'live-capture') fail('CAPTURE_FIXTURE_SOURCE', input.sourceKind);
  return { event: input.event, payloadShape: sanitizePayloadShape(input.payloadShape), sourceKind: input.sourceKind };
}
function sourceBytes(files) {
  return Buffer.concat(files.map((file) => fs.readFileSync(file)));
}
function selectRecords(records, event, predicate, count, label) {
  const selected = records.filter((record) => record.safe.event === event && (!predicate || predicate(record.safe)));
  if (selected.length < count) fail('CAPTURE_EVENT_COUNT', label);
  return selected.slice(0, count);
}
function verifyCaptureSequence() {
  validateIdentity();
  const inputDir = validateCaptureDirectory(arg('--input-dir'), false);
  const records = fs.readdirSync(inputDir).filter((name) => name.endsWith('.json')).sort().map((name) => {
    const file = path.join(inputDir, name);
    return { name, safe: sanitizeFixture(readJson(file, 'CAPTURE_SOURCE_INVALID')) };
  });
  const normal = selectRecords(records, 'SessionStart', (record) => Object.hasOwn(record.payloadShape, 'turnId'), 1, 'SessionStart normal');
  const compact = selectRecords(records, 'SessionStart', (record) => !Object.hasOwn(record.payloadShape, 'turnId'), 1, 'SessionStart compact');
  const prompt = selectRecords(records, 'UserPromptSubmit', null, 1, 'UserPromptSubmit');
  const post = selectRecords(records, 'PostToolUse', null, 3, 'PostToolUse');
  const stops = selectRecords(records, 'Stop', null, 2, 'Stop');
  if (normal.length !== 1 || compact.length !== 1 || prompt.length !== 1 ||
      post.length < 3 || stops.length < 2) fail('CAPTURE_SEQUENCE_INCOMPLETE');
  process.stdout.write('CAPTURE_SEQUENCE_VERIFIED\n');
}
function promote() {
  validateIdentity();
  const inputDir = validateCaptureDirectory(arg('--input-dir'), false);
  const destination = path.resolve(arg('--destination') || '');
  const expectedDestination = path.join(ROOT, 'tests', 'fixtures', 'runtime');
  if (destination !== expectedDestination) fail('CAPTURE_DESTINATION_INVALID');
  const manifestPath = path.resolve(arg('--manifest') || '');
  if (manifestPath !== path.join(expectedDestination, 'manifest.json')) fail('CAPTURE_MANIFEST_INVALID');
  const manifest = readJson(manifestPath, 'CAPTURE_MANIFEST_INVALID');
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.fixtures)) fail('CAPTURE_MANIFEST_INVALID');

  const records = fs.readdirSync(inputDir).filter((name) => name.endsWith('.json')).sort().map((name) => {
    const file = path.join(inputDir, name);
    let stat;
    try { stat = fs.statSync(file); } catch { fail('CAPTURE_SOURCE_UNREADABLE', name); }
    if (!stat.isFile()) fail('CAPTURE_SOURCE_INVALID', name);
    const bytes = fs.readFileSync(file);
    let parsed;
    try { parsed = JSON.parse(bytes.toString('utf8')); } catch { fail('CAPTURE_SOURCE_INVALID', name); }
    return { name, bytes, safe: sanitizeFixture(parsed) };
  });
  if (!records.length) fail('CAPTURE_SOURCE_EMPTY');

  const normal = selectRecords(records, 'SessionStart', (record) => Object.hasOwn(record.payloadShape, 'turnId'), 1, 'SessionStart normal');
  const compact = selectRecords(records, 'SessionStart', (record) => !Object.hasOwn(record.payloadShape, 'turnId'), 1, 'SessionStart compact');
  const prompt = selectRecords(records, 'UserPromptSubmit', null, 1, 'UserPromptSubmit');
  const post = selectRecords(records, 'PostToolUse', null, 3, 'PostToolUse');
  const stops = selectRecords(records, 'Stop', null, 2, 'Stop');
  const groups = new Map([
    ['session-start-normal', normal],
    ['session-start-compact', compact],
    ['user-prompt-submit', prompt],
    ['agent-task-post-tool-use', post.slice(0, 1)],
    ['parallel-agent-task-post-tool-use', post.slice(1, 3)],
    ['stop', stops],
  ]);

  const sourceDestination = path.join(destination, 'source');
  fs.mkdirSync(sourceDestination, { recursive: true });
  for (const record of records) {
    const target = path.join(sourceDestination, record.name);
    if (fs.existsSync(target)) {
      if (!Buffer.from(fs.readFileSync(target)).equals(record.bytes)) fail('CAPTURE_SOURCE_COLLISION', record.name);
    } else fs.writeFileSync(target, record.bytes, { flag: 'wx' });
  }
  for (const row of manifest.fixtures) {
    const group = groups.get(row.name);
    if (row.status !== 'supported' || !row.fixturePath) {
      if (group) fail('CAPTURE_MANIFEST_ROW', row.name);
      continue;
    }
    if (!group) fail('CAPTURE_MANIFEST_ROW', row.name);
    const sourceFiles = group.map((record) => path.join(sourceDestination, record.name));
    const fixtureRecords = group.map((record) => record.safe);
    const body = row.fixturePath.endsWith('.jsonl')
      ? fixtureRecords.map((record) => JSON.stringify(record)).join('\n') + '\n'
      : `${JSON.stringify(fixtureRecords.length === 1 ? fixtureRecords[0] : fixtureRecords, null, 2)}\n`;
    const target = path.resolve(ROOT, row.fixturePath);
    if (!inside(destination, target)) fail('CAPTURE_FIXTURE_PATH');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, body);
    row.sourceRef = group.map((record) => record.name).join(',');
    row.sourceSha256 = sha256Bytes(sourceBytes(sourceFiles));
    row.fixtureSha256 = sha256Bytes(body);
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write('RUNTIME_FIXTURES_PROMOTED\n');
}

if (process.argv.includes('--validate-environment')) validateEnvironment();
else if (process.argv.includes('--verify-input-dir')) verifyCaptureSequence();
else if (process.argv.includes('--promote')) promote();
else fail('CAPTURE_USAGE');
