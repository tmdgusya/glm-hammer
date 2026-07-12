'use strict';
// PreToolUse (Agent|Task): record the exact source snapshot before security/QA dispatch.
const {
  readStdin, readState, readJournal, buildSourceSnapshot, appendJournalPayload,
} = require('./lib');

const HASH = /^[0-9a-f]{64}$/;

try {
  const input = readStdin();
  const cwd = input.cwd || process.cwd();
  const state = readState(cwd);
  if (!state || state.schemaVersion !== 1 || state.phase !== 'hammer' ||
      !state.runId || !Number.isSafeInteger(state.generation)) process.exit(0);
  const toolInput = input.tool_input || {};
  const prompt = String(toolInput.prompt || toolInput.description || '');
  const role = String(toolInput.role || toolInput.subagent_type || toolInput.agent || '');
  const reviewRole = role === 'security-reviewer' || role === 'qa-reviewer' ||
    /\b(?:security-reviewer|qa-reviewer)\b/.test(prompt);
  if (!reviewRole) process.exit(0);
  const requested = toolInput.sourceSnapshotSha256 || toolInput.source_snapshot_sha256;
  if (!HASH.test(requested || '') || !prompt.includes(requested)) process.exit(2);
  const snapshot = buildSourceSnapshot(cwd, {
    baselineHead: state.baselineHead || null,
    declaredPaths: state.declaredPaths || [],
  });
  if (!snapshot.ok || snapshot.sha256 !== requested) process.exit(2);
  const journal = readJournal(cwd);
  if (!journal.ok) process.exit(2);
  const existing = journal.events.some((event) =>
    event.type === 'SOURCE_REVIEW_SNAPSHOT_RECORDED' && event.runId === state.runId &&
    event.generation === state.generation && event.payload.snapshotSha256 === requested);
  if (!existing) {
    const appended = appendJournalPayload(cwd, 'SOURCE_REVIEW_SNAPSHOT_RECORDED', state.runId, state.generation, {
      head: snapshot.snapshot.currentHead,
      scope: snapshot.snapshot.scope,
      snapshotSha256: snapshot.sha256,
    });
    if (!appended.ok) process.exit(2);
  }
  process.exit(0);
} catch {
  process.exit(2);
}
