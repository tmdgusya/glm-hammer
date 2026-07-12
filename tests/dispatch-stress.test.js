'use strict';
const lib = require('../hooks/scripts/lib');
const receipt = require('./fixtures/receipts/positive.json');
const dispatch = require('./fixtures/dispatch/positive.json');
const now = 10_000;
const body = [
  'RECEIPT_VERSION: 1', `RUN_ID: ${receipt.runId}`, 'ROLE: security-reviewer',
  'EVIDENCE_PATH: .glm-hammer/evidence/reviews/security.md', `PLAN_SHA256: ${receipt.planSha256}`,
  `GENERATION: ${receipt.generation}`, 'REVIEW_KIND: security', `DISPATCH_ID: ${receipt.dispatchId}`,
  `SOURCE_SNAPSHOT_SHA256: ${dispatch.sourceSnapshotSha256}`, 'CHECKS:', '- PASS',
].join('\n');
const parsed = lib.parseReceiptV1(body, receipt);
if (!parsed.ok) throw new Error(`positive receipt rejected: ${parsed.code}`);
const payload = {
  dispatchId: dispatch.dispatchId, role: dispatch.role, evidencePath: dispatch.evidencePath,
  invocationMs: 8_000, completionMs: 8_100, observedAtMs: 8_200, receiptMtimeMs: 8_150,
  receiptSize: Buffer.byteLength(body), receiptSha256: lib.sha256(Buffer.from(body)),
  toolEventHash: 'c'.repeat(64), sourceSnapshotSha256: dispatch.sourceSnapshotSha256,
};
const context = {
  runId: receipt.runId, generation: receipt.generation, generationStartMs: 7_000, nowMs: now,
  reviewSnapshot: { runId: receipt.runId, generation: receipt.generation, atMs: 7_900, snapshotSha256: dispatch.sourceSnapshotSha256 },
};
if (!lib.validateCoreDispatch(payload, context).ok) throw new Error('positive dispatch rejected');
function expect(code, changedPayload, changedContext = context) {
  const actual = lib.validateCoreDispatch({ ...payload, ...changedPayload }, changedContext);
  if (actual.ok || actual.code !== code) throw new Error(`${code}: received ${actual.code}`);
}
expect('DSP_TIME_INVOCATION_FUTURE', { invocationMs: now + 1, completionMs: now + 1, observedAtMs: now + 1 });
expect('DSP_TIME_COMPLETION_FUTURE', { completionMs: now + 1, observedAtMs: now + 1 });
expect('DSP_TIME_OBSERVED_FUTURE', { observedAtMs: now + 1 });
expect('DSP_RECEIPT_TIME', { receiptMtimeMs: payload.invocationMs - 2001 });
expect('CORE_REVIEW_SNAPSHOT_MISSING', { sourceSnapshotSha256: null }, { ...context, reviewSnapshot: null });
expect('CORE_REVIEW_SNAPSHOT_MISMATCH', { sourceSnapshotSha256: 'd'.repeat(64) });
expect('CORE_REVIEW_PREDATES_SNAPSHOT', { invocationMs: 7_800, receiptMtimeMs: 7_800 }, { ...context, reviewSnapshot: { ...context.reviewSnapshot, atMs: 7_900 } });
process.stdout.write('DISPATCH_CONTRACT_OK\n');
