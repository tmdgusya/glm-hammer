'use strict';

const fs = require('fs');
const path = require('path');
const {
  readStdin,
  readState,
  readJournal,
  appendJournalPayload,
  canonicalJson,
  sha256,
} = require('./lib');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function jsonFile(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

try {
  const input = readStdin();
  const cwd = input.cwd || process.cwd();
  const state = readState(cwd);
  const localCapabilities = path.join(cwd, 'tests', 'fixtures', 'runtime', 'capabilities.json');
  const capabilities = jsonFile(fs.existsSync(localCapabilities)
    ? localCapabilities
    : path.resolve(__dirname, '..', '..', 'tests', 'fixtures', 'runtime', 'capabilities.json'));
  if (!state || state.schemaVersion !== 1 || !UUID.test(state.runId || '') ||
      !Number.isSafeInteger(state.generation) || !capabilities ||
      capabilities.questionObserver !== 'stop-transcript' ||
      capabilities.capabilities?.Stop?.status !== 'supported') process.exit(0);

  const required = ['responsePreview', 'responseText', 'transcriptPath', 'transcript_path', 'toolCallCount', 'turnId'];
  if (input.hookEventName !== 'Stop' && input.hook_event_name !== 'Stop') process.exit(0);
  if (!required.every((key) =>
    Object.prototype.hasOwnProperty.call(input, key) &&
    (key === 'toolCallCount' ? Number.isSafeInteger(input[key]) : typeof input[key] === 'string'))) process.exit(0);
  if (!input.turnId.trim()) process.exit(0);

  let structural;
  try {
    structural = typeof input.responseText === 'string' ? JSON.parse(input.responseText) : input.responseText;
  } catch {
    process.exit(0);
  }
  if (!structural || typeof structural !== 'object' || Array.isArray(structural) ||
      !structural.question || structural.question.requiresUserResponse !== true) process.exit(0);

  const journal = readJournal(cwd);
  if (!journal.ok || journal.events.some((event) =>
    event.runId === state.runId && event.generation === state.generation &&
    event.type === 'USER_QUESTION_OBSERVED' && event.payload.turnId === input.turnId)) process.exit(0);

  const observed = {
    response: structural,
    turnId: input.turnId,
    toolCallCount: input.toolCallCount,
  };
  appendJournalPayload(cwd, 'USER_QUESTION_OBSERVED', state.runId, state.generation, {
    observerEventHash: sha256(Buffer.from(canonicalJson(observed))),
    observerKind: 'stop-transcript',
    turnId: input.turnId,
  });
  process.exit(0);
} catch {
  process.exit(0);
}
