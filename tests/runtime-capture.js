'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHA256 = /^[0-9a-f]{64}$/;
const IDENTITY_KEYS = ['GLM_HAMMER_ENGINE_NAME', 'GLM_HAMMER_ENGINE_VERSION', 'GLM_HAMMER_ENGINE_SHA256'];

function fail(code, detail) {
  process.stderr.write(`${code}${detail ? `: ${detail}` : ''}\n`);
  process.exit(1);
}
function sha256Bytes(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}
function sha256File(file) {
  return sha256Bytes(fs.readFileSync(file));
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
function inside(parent, child) {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel));
}
function validateIdentity(allowCaptureWildcard) {
  for (const key of IDENTITY_KEYS) if (!process.env[key]) fail('CAPTURE_IDENTITY_MISSING', key);
  if (!/^[a-z][a-z0-9._-]*$/.test(process.env.GLM_HAMMER_ENGINE_NAME)) fail('CAPTURE_IDENTITY_INVALID', 'engine name');
  if (/[*?]/.test(process.env.GLM_HAMMER_ENGINE_VERSION) || (!allowCaptureWildcard && /x/i.test(process.env.GLM_HAMMER_ENGINE_VERSION))) {
    fail('CAPTURE_IDENTITY_WILDCARD', 'engine version');
  }
  if (!SHA256.test(process.env.GLM_HAMMER_ENGINE_SHA256)) fail('CAPTURE_IDENTITY_INVALID', 'artifact hash');
  const artifact = process.env.ZCODE_ENGINE_ARTIFACT;
  try {
    if (!artifact || !fs.statSync(artifact).isFile()) fail('CAPTURE_ARTIFACT_MISSING');
  } catch {
    fail('CAPTURE_ARTIFACT_MISSING');
  }
  if (sha256File(artifact) !== process.env.GLM_HAMMER_ENGINE_SHA256) fail('CAPTURE_ARTIFACT_MISMATCH');
  const binary = process.env.ZCODE_BIN;
  try {
    if (!binary || !fs.statSync(binary).isFile()) fail('CAPTURE_BINARY_MISSING');
  } catch {
    fail('CAPTURE_BINARY_MISSING');
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
  validateIdentity(true);
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
function sanitizeFixture(input) {
  assertKeys(input, ['event', 'environment', 'payloadShape', 'sourceKind'], 'CAPTURE_FIXTURE_FIELDS');
  if (!input.environment || IDENTITY_KEYS.some((k) => input.environment[k] !== process.env[k])) fail('CAPTURE_INHERITANCE_MISMATCH');
  const forbidden = /prompt|output|secret|token|password|cwd|path|content/i;
  const walk = (value, pointer) => {
    if (value === null || ['boolean', 'number'].includes(typeof value)) return value;
    if (typeof value === 'string') return forbidden.test(pointer) ? sha256Bytes(value) : value.slice(0, 120);
    if (Array.isArray(value)) return value.map((v, i) => walk(v, `${pointer}/${i}`));
    const out = {};
    for (const key of Object.keys(value).sort()) {
      if (forbidden.test(key)) fail('CAPTURE_FIXTURE_RAW_FIELD', key);
      out[key] = walk(value[key], `${pointer}/${key}`);
    }
    return out;
  };
  return { event: input.event, payloadShape: walk(input.payloadShape, ''), sourceKind: input.sourceKind };
}
function promote() {
  validateIdentity(false);
  const inputDir = validateCaptureDirectory(arg('--input-dir'), false);
  const destination = path.resolve(arg('--destination') || '');
  const expectedDestination = path.join(ROOT, 'tests', 'fixtures', 'runtime');
  if (destination !== expectedDestination) fail('CAPTURE_DESTINATION_INVALID');
  const manifestPath = path.resolve(arg('--manifest') || '');
  if (manifestPath !== path.join(expectedDestination, 'manifest.json')) fail('CAPTURE_MANIFEST_INVALID');
  const manifest = readJson(manifestPath, 'CAPTURE_MANIFEST_INVALID');
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.fixtures)) fail('CAPTURE_MANIFEST_INVALID');
  fs.mkdirSync(destination, { recursive: true });
  for (const row of manifest.fixtures) {
    if (row.status !== 'supported' || !row.fixturePath) continue;
    const source = path.join(inputDir, path.basename(row.fixturePath));
    const parsed = readJson(source, 'CAPTURE_FIXTURE_INVALID');
    const sanitized = sanitizeFixture(parsed);
    const body = `${JSON.stringify(sanitized, null, 2)}\n`;
    const target = path.resolve(ROOT, row.fixturePath);
    if (!inside(destination, target)) fail('CAPTURE_FIXTURE_PATH');
    fs.writeFileSync(target, body);
    row.fixtureSha256 = sha256Bytes(body);
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write('RUNTIME_FIXTURES_PROMOTED\n');
}

if (process.argv.includes('--validate-environment')) validateEnvironment();
else if (process.argv.includes('--promote')) promote();
else fail('CAPTURE_USAGE');
