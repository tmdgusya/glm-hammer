'use strict';
// Stop hook: the loop-closer, with evidence gates (pattern borrowed from lazycodex).
//
// State claims are NOT trusted. Every gate cross-checks .glm-hammer/state.json
// against evidence receipts on disk under .glm-hammer/evidence/:
//   forge  → evidence/critics/round-<N>/<critic>.md   containing VERDICT: APPROVE  (×3)
//   hammer → evidence/tasks/task-<i>/validator.md      containing VERDICT: PASS
//            evidence/tasks/task-<i>/critic.md         containing VERDICT: APPROVE
//            evidence/e2e.md                           (non-empty gate output)
//            evidence/reviews/{security,qa}.md         containing VERDICT: PASS
// A completion claim without its receipt blocks the stop, with escalating tone.
//
// Escape hatches: status "awaiting-user" / "done" (done still requires receipts),
// context-pressure markers in the transcript, and a block cap (Claude Code also
// force-stops after 8 consecutive blocks).
const {
  readStdin,
  readState,
  writeState,
  evidencePath,
  evidenceOk,
  underContextPressure,
  emit,
} = require('./lib');

const BLOCK_CAP = 6;
const CRITICS = ['feasibility-critic', 'integration-critic', 'coverage-critic'];
const APPROVE = /VERDICT:\s*APPROVE/i;
const PASS = /VERDICT:\s*PASS/i;

function forgeGate(cwd, state) {
  const c = state.critics || { required: 3, approved: 0, round: 1 };
  const round = c.round || 1;
  const missing = CRITICS.filter(
    (name) => !evidenceOk(evidencePath(cwd, 'critics', `round-${round}`, `${name}.md`), APPROVE)
  );
  if ((c.approved || 0) >= (c.required || 3) && missing.length === 0) return null;

  if (missing.length > 0 && (c.approved || 0) >= (c.required || 3)) {
    return (
      `Forge gate: state claims ${c.approved}/${c.required} critic approvals, but no APPROVE receipt exists on disk for: ${missing.join(', ')} ` +
      `(expected .glm-hammer/evidence/critics/round-${round}/<critic>.md containing "VERDICT: APPROVE"). ` +
      'Approval claims without evidence receipts are not trusted. Dispatch the missing critics; each must write its own verdict file and end with EVIDENCE_RECORDED: <path>.'
    );
  }
  return (
    `Forge gate: critic panel incomplete — ${c.approved || 0}/${c.required || 3} APPROVE (round ${round}); missing receipts: ${missing.join(', ')}. ` +
    'Dispatch the full panel (feasibility-critic, integration-critic, coverage-critic) on the current plan, or revise the plan and re-run the panel. ' +
    'If you are genuinely blocked on user input, set status to "awaiting-user" in .glm-hammer/state.json and ask the question.'
  );
}

function hammerGate(cwd, state) {
  const t = state.tasks || { total: 0, completed: 0 };
  const r = state.reviews || { security: 'pending', qa: 'pending' };

  if ((t.completed || 0) < (t.total || 0)) {
    return (
      `Hammer gate: ${t.completed || 0}/${t.total} tasks complete${t.current ? ` (current: ${t.current})` : ''}. ` +
      'Continue the worker → validator → implementation-critic loop for the remaining tasks. ' +
      'If a task has failed 3 times, escalate: set status to "awaiting-user" with the failure history.'
    );
  }

  const missing = [];
  for (let i = 1; i <= (t.total || 0); i++) {
    if (!evidenceOk(evidencePath(cwd, 'tasks', `task-${i}`, 'validator.md'), PASS)) {
      missing.push(`tasks/task-${i}/validator.md (VERDICT: PASS)`);
    }
    if (!evidenceOk(evidencePath(cwd, 'tasks', `task-${i}`, 'critic.md'), APPROVE)) {
      missing.push(`tasks/task-${i}/critic.md (VERDICT: APPROVE)`);
    }
  }
  if (missing.length > 0) {
    return (
      `Hammer gate: state claims all ${t.total} tasks are complete, but these evidence receipts are missing or lack the required verdict under .glm-hammer/evidence/: ${missing.join('; ')}. ` +
      'Completion claims without receipts are not trusted. Re-dispatch the validator/critic for each unevidenced task; each must write its own verdict file and end with EVIDENCE_RECORDED: <path>.'
    );
  }

  if (r.security !== 'pass' || r.qa !== 'pass') {
    return (
      `Hammer gate: all tasks complete but reviews are not green (security=${r.security}, qa=${r.qa}). ` +
      'Run the E2E gate (save its output to .glm-hammer/evidence/e2e.md), then dispatch security-reviewer and qa-reviewer in parallel. ' +
      'On FAIL, convert blocking findings into fix tasks, run them through the full task cycle, and re-run the E2E gate and the FULL review panel.'
    );
  }

  const reviewMissing = [];
  if (!evidenceOk(evidencePath(cwd, 'e2e.md'))) reviewMissing.push('e2e.md (E2E gate output)');
  if (!evidenceOk(evidencePath(cwd, 'reviews', 'security.md'), PASS)) reviewMissing.push('reviews/security.md (VERDICT: PASS)');
  if (!evidenceOk(evidencePath(cwd, 'reviews', 'qa.md'), PASS)) reviewMissing.push('reviews/qa.md (VERDICT: PASS)');
  if (reviewMissing.length > 0) {
    return (
      `Hammer gate: state claims reviews passed, but receipts are missing under .glm-hammer/evidence/: ${reviewMissing.join('; ')}. ` +
      'A PASS you cannot show a receipt for did not happen. Re-run the E2E gate and/or re-dispatch the reviewers; each reviewer writes its own verdict file and ends with EVIDENCE_RECORDED: <path>.'
    );
  }
  return null;
}

try {
  const input = readStdin();
  const cwd = input.cwd || process.cwd();
  const state = readState(cwd);

  if (!state || !state.phase || state.phase === 'idle') process.exit(0);
  if (state.status === 'awaiting-user') process.exit(0);
  if (underContextPressure(input.transcript_path)) process.exit(0);

  const blocks = state.stopBlocks || 0;
  if (blocks >= BLOCK_CAP) process.exit(0); // yield; router/session-start reset the counter

  let reason = null;
  if (state.phase === 'forge' && state.status !== 'done') reason = forgeGate(cwd, state);
  else if (state.phase === 'hammer') reason = hammerGate(cwd, state); // "done" is re-verified against receipts

  if (!reason) process.exit(0);

  const attempt = blocks + 1;
  let prefix = `[glm-hammer | attempt ${attempt}/${BLOCK_CAP}] `;
  if (attempt >= 3) {
    prefix +=
      'You have now claimed or attempted completion multiple times without satisfying the gates. ' +
      'Your completion reports are not trusted until the receipts exist on disk. Do the work, record the evidence, then stop. ';
  }

  state.stopBlocks = attempt;
  writeState(cwd, state);
  emit({ decision: 'block', reason: prefix + reason });
  process.exit(0);
} catch {
  process.exit(0);
}
