'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const lib = require('../hooks/scripts/lib');
const root = path.resolve(__dirname, '..');
function copyFixture(name) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'glm-migration-'));
  const source = path.join(root, 'tests', 'fixtures', 'migration', name);
  const stateDir = path.join(tmp, '.glm-hammer');
  fs.mkdirSync(stateDir, { recursive: true });
  fs.copyFileSync(path.join(source, 'state.json'), path.join(stateDir, 'state.json'));
  const seal = path.join(source, 'plan-seal.json');
  if (fs.existsSync(seal)) fs.copyFileSync(seal, path.join(stateDir, 'plan-seal.json'));
  const plan = path.join(source, 'plan.md');
  if (fs.existsSync(plan)) {
    const target = path.join(tmp, 'tests', 'fixtures', 'migration', name, 'plan.md');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(plan, target);
  }
  const journal = path.join(source, 'control-events.jsonl');
  if (fs.existsSync(journal)) fs.copyFileSync(journal, path.join(stateDir, 'control-events.jsonl'));
  return tmp;
}
const valid = copyFixture('legacy-core-run');
fs.copyFileSync(path.join(root, 'tests/fixtures/migration/legacy-core-run/plan-seal.json'), path.join(valid, '.glm-hammer/plan-seal.json'));
const migrated = lib.migrateLegacyCoreRun(valid, { runId: '123e4567-e89b-42d3-a456-426614174000' });
if (!migrated.ok || !migrated.migrated || migrated.event.payload.migrationCode !== 'FRESH_REDISPATCH_REQUIRED') throw new Error('valid migration failed');
const projected = lib.readState(valid);
if (projected.status !== 'migration-required' || projected.verification !== 'UNVERIFIED' || projected.tasks || projected.reviews) throw new Error('legacy approval credit survived');
if (projected.schemaVersion !== 1 || projected.generation !== 0 || !projected.plan ||
    !Number.isSafeInteger(projected.generationStartMs)) throw new Error('core migration metadata missing');
if (lib.readJournal(valid).events.length !== 1) throw new Error('migration event missing');
fs.rmSync(valid, { recursive: true, force: true });
const current = fs.mkdtempSync(path.join(os.tmpdir(), 'glm-migration-current-'));
const currentRunId = '123e4567-e89b-42d3-a456-426614174010';
lib.writeState(current, {
  schemaVersion: 1, phase: 'hammer', status: 'executing',
  runId: currentRunId, generation: 0, generationStartMs: Date.now(),
});
lib.appendJournalPayload(current, 'ROUTER_ARMED', currentRunId, 0, {
  baselineHead: null, baselineSnapshotSha256: '0'.repeat(64), promptEventHash: '1'.repeat(64),
});
const currentNoop = lib.migrateLegacyCoreRun(current);
if (!currentNoop.ok || currentNoop.migrated !== false) throw new Error('authenticated current run required a legacy seal');
const mismatchedState = lib.readState(current);
mismatchedState.generation = 1;
lib.writeState(current, mismatchedState);
const mismatched = lib.migrateLegacyCoreRun(current);
if (mismatched.ok || mismatched.code !== 'MIGRATION_CORRUPT') throw new Error('mismatched generation received migration no-op');
fs.rmSync(current, { recursive: true, force: true });

const nullState = fs.mkdtempSync(path.join(os.tmpdir(), 'glm-migration-null-state-'));
fs.mkdirSync(path.join(nullState, '.glm-hammer'), { recursive: true });
const nullStateBytes = Buffer.from('null\n');
fs.writeFileSync(path.join(nullState, '.glm-hammer', 'state.json'), nullStateBytes);
const nullStateResult = lib.migrateLegacyCoreRun(nullState);
const nullStateCopies = fs.readdirSync(path.join(nullState, '.glm-hammer', 'quarantine'));
if (nullStateResult.ok || nullStateResult.code !== 'MIGRATION_CORRUPT' ||
    !nullStateCopies.some((copy) => fs.readFileSync(path.join(nullState, '.glm-hammer', 'quarantine', copy)).equals(nullStateBytes))) {
  throw new Error('semantic null state was not quarantined unchanged');
}
fs.rmSync(nullState, { recursive: true, force: true });

const nullSeal = copyFixture('legacy-core-run');
const nullSealBytes = Buffer.from('null\n');
fs.writeFileSync(path.join(nullSeal, '.glm-hammer', 'plan-seal.json'), nullSealBytes);
const nullSealResult = lib.migrateLegacyCoreRun(nullSeal);
const nullSealCopies = fs.readdirSync(path.join(nullSeal, '.glm-hammer', 'quarantine'));
if (nullSealResult.ok || nullSealResult.code !== 'MIGRATION_CORRUPT' ||
    !nullSealCopies.some((copy) => fs.readFileSync(path.join(nullSeal, '.glm-hammer', 'quarantine', copy)).equals(nullSealBytes))) {
  throw new Error('semantic null seal was not quarantined unchanged');
}
fs.rmSync(nullSeal, { recursive: true, force: true });
function assertRejectedFixture(name) {
  const cwd = copyFixture(name);
  const expected = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'fixtures', 'migration', name, 'expected.json'), 'utf8'));
  if (expected.schemaVersion !== 1 || !expected.quarantinePreservesBytes || !expected.quarantine) {
    throw new Error(`${name} expectation is incomplete`);
  }
  const controlArtifact = new Set(['state.json', 'plan-seal.json', 'control-events.jsonl']).has(expected.quarantine);
  const source = controlArtifact
    ? path.join(cwd, '.glm-hammer', expected.quarantine)
    : path.join(cwd, 'tests', 'fixtures', 'migration', name, expected.quarantine);
  const before = fs.readFileSync(source);
  const rejected = lib.migrateLegacyCoreRun(cwd);
  const journalEvents = lib.readJournal(cwd).events.length;
  if (rejected.ok || rejected.code !== expected.code || journalEvents !== expected.journalEvents) {
    throw new Error(`${name} migration did not fail closed`);
  }
  const copies = fs.readdirSync(path.join(cwd, '.glm-hammer', 'quarantine'));
  if (!copies.some((copy) => fs.readFileSync(path.join(cwd, '.glm-hammer', 'quarantine', copy)).equals(before))) {
    throw new Error(`${name} quarantine changed source bytes`);
  }
  fs.rmSync(cwd, { recursive: true, force: true });
}
for (const name of ['corrupt-state', 'corrupt-seal', 'corrupt-plan', 'corrupt-journal']) {
  assertRejectedFixture(name);
}

const unreadableDescriptor = JSON.parse(fs.readFileSync(
  path.join(root, 'tests', 'fixtures', 'migration', 'unreadable-state', 'error.json'), 'utf8'));
const unreadableExpected = JSON.parse(fs.readFileSync(
  path.join(root, 'tests', 'fixtures', 'migration', 'unreadable-state', 'expected.json'), 'utf8'));
if (unreadableDescriptor.simulatedNodeCode !== 'EISDIR' || unreadableExpected.schemaVersion !== 1) {
  throw new Error('unreadable-state fixture contract invalid');
}
const unreadable = fs.mkdtempSync(path.join(os.tmpdir(), 'glm-migration-unreadable-'));
fs.mkdirSync(path.join(unreadable, '.glm-hammer', 'state.json'), { recursive: true });
const unreadableRejected = lib.migrateLegacyCoreRun(unreadable);
if (unreadableRejected.ok || unreadableRejected.code !== unreadableExpected.code ||
    lib.readJournal(unreadable).events.length !== unreadableExpected.journalEvents ||
    !fs.statSync(path.join(unreadable, '.glm-hammer', 'state.json')).isDirectory() ||
    fs.existsSync(path.join(unreadable, '.glm-hammer', 'quarantine')) ||
    fs.existsSync(path.join(unreadable, '.glm-hammer', 'control-events.jsonl'))) {
  throw new Error('unreadable state did not fail closed without mutating control artifacts');
}
fs.rmSync(unreadable, { recursive: true, force: true });
process.stdout.write('MIGRATION_CONTRACT_OK\n');
