'use strict';
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(ROOT, 'tests', 'runtime-capture.js');
const SHELL_SCRIPT = path.join(ROOT, 'tests', 'runtime-capture.sh');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'glm-hammer-runtime-contract-'));
let failures = 0;
function check(name, condition, detail) {
  if (!condition) { failures++; process.stderr.write(`FAIL - ${name}${detail ? `: ${detail}` : ''}\n`); }
}
function directory(name) { const p = path.join(tmp, name); fs.mkdirSync(p); return p; }
const artifact = path.join(tmp, 'zcode');
fs.writeFileSync(artifact, `#!/bin/sh
if [ "$1" = "doctor" ] && [ "$2" = "--json" ]; then
  printf '%s\n' '{"cli":{"name":"zcode","processName":"zcode-cli","version":"0.15.2"}}'
  exit 0
fi
exit 64
`, { mode: 0o755 });
const digest = crypto.createHash('sha256').update(fs.readFileSync(artifact)).digest('hex');
const base = {
  ...process.env,
  ZCODE_BIN: artifact,
  ZCODE_ENGINE_ARTIFACT: artifact,
  GLM_HAMMER_ENGINE_NAME: 'zcode-cli',
  GLM_HAMMER_ENGINE_VERSION: '0.15.2',
  GLM_HAMMER_ENGINE_SHA256: digest,
};
function validate(capture, overrides = {}) {
  return spawnSync(process.execPath, [SCRIPT, '--validate-environment'], {
    cwd: ROOT,
    env: { ...base, GLM_HAMMER_CAPTURE_DIR: capture, ...overrides },
    encoding: 'utf8',
  });
}
let capture = directory('valid');
let result = validate(capture);
check('valid explicit capture directory', result.status === 0 && result.stdout === 'CAPTURE_ENVIRONMENT_OK\n', result.stderr);
result = validate(capture, { GLM_HAMMER_ENGINE_SHA256: '0'.repeat(64) });
check('artifact mismatch blocks', result.status !== 0 && result.stderr.startsWith('CAPTURE_ARTIFACT_MISMATCH'));
result = validate(capture, { GLM_HAMMER_ENGINE_NAME: '' });
check('missing identity blocks', result.status !== 0 && result.stderr.startsWith('CAPTURE_IDENTITY_MISSING'));
fs.writeFileSync(path.join(capture, 'unexpected'), 'x');
result = validate(capture);
check('nonempty capture directory blocks', result.status !== 0 && result.stderr.startsWith('CAPTURE_DIRECTORY_NOT_EMPTY'));
result = spawnSync(process.execPath, [SCRIPT, '--validate-environment'], {
  cwd: ROOT,
  env: { ...base, GLM_HAMMER_CAPTURE_DIR: ROOT }, encoding: 'utf8',
});
check('repository capture destination blocks', result.status !== 0 && result.stderr.startsWith('CAPTURE_DIRECTORY_PRODUCT_PATH'));

capture = directory('plugin');
result = spawnSync('sh', [SHELL_SCRIPT, '--output-dir', capture], {
  cwd: ROOT, env: { ...base, GLM_HAMMER_CAPTURE_DIR: capture }, encoding: 'utf8',
});
check('capture harness creates temporary plugin', result.status === 0 && result.stdout === 'CAPTURE_PLUGIN_READY\n' && fs.existsSync(path.join(capture, 'plugin', 'hooks.json')), result.stderr);
const hooks = JSON.parse(fs.readFileSync(path.join(capture, 'plugin', 'hooks.json'), 'utf8'));
check('capture harness uses only registered event surface', Object.keys(hooks.hooks).join(',') === 'SessionStart,UserPromptSubmit,PostToolUse,Stop');

const fixtureResult = spawnSync(process.execPath, [path.join(ROOT, 'tests', 'runtime-fixture-contract.test.js'), '--approval', path.join(tmp, 'missing', 'approval.json')], { cwd: ROOT, encoding: 'utf8' });
check('missing approval fails closed', fixtureResult.status !== 0 && fixtureResult.stderr.startsWith('RUNTIME_FIXTURE_MISSING'));
fs.rmSync(tmp, { recursive: true, force: true });
if (failures) process.exit(1);
process.stdout.write('RUNTIME_CAPTURE_CONTRACT_OK\n');
