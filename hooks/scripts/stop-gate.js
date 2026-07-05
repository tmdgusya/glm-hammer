'use strict';
// Stop hook: the loop-closer, with three lines of defense:
//
//   1. EVIDENCE RECEIPTS — state claims are cross-checked against verdict files
//      under .glm-hammer/evidence/ with substance requirements (min size +
//      CHECKS block + VERDICT line). A one-line "VERDICT: PASS" is not evidence.
//   2. PLAN SEAL — the plan's content hash must match the seal recorded by
//      plan-gate on the last tracked Write/Edit. An edit smuggled through Bash
//      or any untracked route breaks the seal and voids critic approvals.
//   3. DISPATCH LEDGER — each receipt must be backed by a recorded Agent/Task
//      dispatch that referenced its path (dispatch-log.js). A receipt no judge
//      was ever pointed at was written by the orchestrator — it does not count.
//      Fail-open: enforced only once the ledger has at least one entry, so a
//      runtime whose Agent matcher never fires cannot deadlock the loop.
//
// Escape hatches: status "awaiting-user" / context-pressure markers / block cap
// (ZCode's runtime additionally caps Stop continuations at 3 per turn).
const path = require('path');
const {
  readStdin,
  readState,
  writeState,
  evidencePath,
  evidenceOk,
  underContextPressure,
  sealMatches,
  readDispatchedTails,
  emit,
} = require('./lib');

const BLOCK_CAP = 6;
const CRITICS = ['feasibility-critic', 'integration-critic', 'coverage-critic'];
const { validateTokens, validateSpec } = require('./token-lib');
const PROSPECT_REPORTS = [
  'vein-reader',
  'color-prospector',
  'type-prospector',
  'layout-prospector',
  'motion-prospector',
];
const CRUCIBLE_PANEL = ['harmony-critic', 'rigor-critic'];
const APPROVE = /VERDICT:\s*APPROVE/i;
const PASS = /VERDICT:\s*PASS/i;
const JUDGE = { minBytes: 300, requireChecks: true };

function receiptProblems(cwd, entries) {
  // entries: [{tail, pattern, kind}] — returns {missing:[], unbacked:[]}
  const dispatched = readDispatchedTails(cwd);
  const enforceDispatch = dispatched.size > 0;
  const missing = [];
  const unbacked = [];
  for (const e of entries) {
    const abs = evidencePath(cwd, ...e.tail.split('/'));
    const opts = e.kind === 'raw' ? { minBytes: 20 } : { ...JUDGE, pattern: e.pattern };
    if (!evidenceOk(abs, opts)) {
      missing.push(e.tail);
    } else if (enforceDispatch && e.kind !== 'raw' && !dispatched.has(e.tail.toLowerCase())) {
      unbacked.push(e.tail);
    }
  }
  return { missing, unbacked };
}

function substanceNote() {
  return (
    'A valid judge receipt has real substance: at least ~300 bytes with a CHECKS: block (binary answers with evidence) and the VERDICT line. '
  );
}

function unbackedNote(unbacked) {
  return (
    `These receipts exist but NO recorded subagent dispatch ever referenced them: ${unbacked.join(', ')}. ` +
    'Receipts must be written by the dispatched judge itself, not by you. Re-dispatch each judge with its evidence path in the prompt — the dispatch ledger records it automatically. '
  );
}

function forgeGate(cwd, state) {
  const c = state.critics || { required: 3, approved: 0, round: 1 };
  const round = c.round || 1;

  // Line of defense 2: plan seal
  if (state.plan) {
    const planAbs = path.resolve(cwd, state.plan);
    const seal = sealMatches(cwd, planAbs);
    if (seal !== 'ok') {
      if ((c.approved || 0) > 0) {
        c.approved = 0;
        c.verdicts = [];
        state.critics = c;
        writeState(cwd, state);
      }
      return (
        `Forge gate: the plan's content seal is ${seal === 'broken' ? 'BROKEN — the file changed outside tracked editing (e.g. via shell redirection)' : 'MISSING — the file was never saved through the Write/Edit tools'}. ` +
        'Any critic approvals are void. Re-save the exact intended plan content via the Write tool (this reseals it), then re-run the FULL critic panel.'
      );
    }
  }

  // Lines of defense 1 & 3: receipts + dispatch backing
  const entries = CRITICS.map((name) => ({
    tail: `critics/round-${round}/${name}.md`,
    pattern: APPROVE,
    kind: 'judge',
  }));
  const { missing, unbacked } = receiptProblems(cwd, entries);

  if ((c.approved || 0) >= (c.required || 3) && missing.length === 0 && unbacked.length === 0) {
    return null;
  }
  if (unbacked.length > 0) {
    return `Forge gate: ${unbackedNote(unbacked)}Approvals do not count until every receipt is dispatch-backed.`;
  }
  if (missing.length > 0 && (c.approved || 0) >= (c.required || 3)) {
    return (
      `Forge gate: state claims ${c.approved}/${c.required} critic approvals, but these receipts are missing, lack substance, or lack "VERDICT: APPROVE": ${missing.join(', ')} ` +
      `(under .glm-hammer/evidence/, round ${round}). ${substanceNote()}` +
      'Approval claims without valid receipts are not trusted. Dispatch the missing critics; each writes its own verdict file and ends with EVIDENCE_RECORDED: <path>.'
    );
  }
  return (
    `Forge gate: critic panel incomplete — ${c.approved || 0}/${c.required || 3} APPROVE (round ${round}); missing/invalid receipts: ${missing.join(', ')}. ` +
    'Dispatch the full panel (feasibility-critic, integration-critic, coverage-critic) on the current plan, or revise the plan and re-run the panel. ' +
    'If you are genuinely blocked on user input, set status to "awaiting-user" in .glm-hammer/state.json and ask the question.'
  );
}

function crucibleGate(cwd, state) {
  // Gate 1: prospecting receipts (raw reports, not judges)
  const prospectEntries = PROSPECT_REPORTS.map((n) => ({ tail: `design/prospect/${n}.md`, kind: 'raw' }));
  const prospect = receiptProblems(cwd, prospectEntries);
  if (prospect.missing.length > 0) {
    return (
      `Crucible gate: prospecting incomplete — missing/empty reports: ${prospect.missing.join(', ')}. ` +
      'Dispatch vein-reader first (storyline → direction brief), then the four prospectors in parallel; ' +
      'each writes its report to its evidence path and ends with EVIDENCE_RECORDED: <path>.'
    );
  }

  // Gate 2: design artifacts exist, pass deterministic checks, and are sealed
  if (!state.design) {
    return 'Crucible gate: state.design is not set. Set it to the design directory (docs/glm-hammer/design/YYYY-MM-DD-<name>) and write the artifacts there.';
  }
  const tokensAbs = path.resolve(cwd, state.design, 'tokens.json');
  const specAbs = path.resolve(cwd, state.design, 'design-spec.md');
  const tokensCheck = validateTokens(tokensAbs);
  if (!tokensCheck.ok) {
    return (
      `Crucible gate: tokens.json fails deterministic validation:\n- ${tokensCheck.problems.slice(0, 12).join('\n- ')}\n` +
      'Fix tokens.json via the Write/Edit tools (this reseals it), then re-run the assay and the panel.'
    );
  }
  const specCheck = validateSpec(specAbs);
  if (!specCheck.ok) {
    return `Crucible gate: ${specCheck.problems.join('; ')}. Complete design-spec.md via the Write/Edit tools.`;
  }
  for (const abs of [tokensAbs, specAbs]) {
    const seal = sealMatches(cwd, abs);
    if (seal !== 'ok') {
      if (((state.panel && state.panel.approved) || 0) > 0 || (state.assay && state.assay.verdict === 'approve')) {
        state.assay = { verdict: 'pending', round: (state.assay && state.assay.round) || 1 };
        state.panel = Object.assign({ required: 2, round: 1 }, state.panel, { approved: 0, verdicts: [] });
        if (state.status === 'assay' || state.status === 'critique' || state.status === 'approved') {
          state.status = 'smelting'; // same reset token-gate applies on tracked edits
        }
        writeState(cwd, state);
      }
      return (
        `Crucible gate: the content seal on ${abs} is ${seal === 'broken' ? 'BROKEN — the file changed outside tracked editing' : 'MISSING — the file was never saved through the Write/Edit tools'}. ` +
        'Assay and panel approvals are void. Re-save the intended content via the Write tool, then re-run the assay and the FULL panel.'
      );
    }
  }

  // Gate 3: fidelity assay receipt
  const assayRound = (state.assay && state.assay.round) || 1;
  const assay = receiptProblems(cwd, [
    { tail: `design/assay/round-${assayRound}/fidelity-critic.md`, pattern: APPROVE, kind: 'judge' },
  ]);
  if (assay.unbacked.length > 0) {
    return `Crucible gate: ${unbackedNote(assay.unbacked)}`;
  }
  if (assay.missing.length > 0 || !(state.assay && state.assay.verdict === 'approve')) {
    return (
      `Crucible gate: fidelity assay not green (round ${assayRound}). ` +
      `${substanceNote()}Dispatch fidelity-critic with the design directory, the prospect receipts, and its evidence path ` +
      `.glm-hammer/evidence/design/assay/round-${assayRound}/fidelity-critic.md. On REJECT, revise the tokens and re-assay (increment assay.round).`
    );
  }

  // Gate 4: designer panel receipts
  const panelRound = (state.panel && state.panel.round) || 1;
  const panelEntries = CRUCIBLE_PANEL.map((n) => ({
    tail: `design/panel/round-${panelRound}/${n}.md`,
    pattern: APPROVE,
    kind: 'judge',
  }));
  const panel = receiptProblems(cwd, panelEntries);
  if (panel.unbacked.length > 0) {
    return `Crucible gate: ${unbackedNote(panel.unbacked)}Approvals do not count until every receipt is dispatch-backed.`;
  }
  if (((state.panel && state.panel.approved) || 0) >= ((state.panel && state.panel.required) || 2) && panel.missing.length === 0) {
    return null;
  }
  return (
    `Crucible gate: designer panel incomplete — ${(state.panel && state.panel.approved) || 0}/${(state.panel && state.panel.required) || 2} APPROVE (round ${panelRound}); missing/invalid receipts: ${panel.missing.join(', ') || 'none'}. ` +
    'Dispatch the full panel (harmony-critic, rigor-critic) on the current design, or revise it and re-run assay + panel. ' +
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

  const taskEntries = [];
  for (let i = 1; i <= (t.total || 0); i++) {
    taskEntries.push({ tail: `tasks/task-${i}/validator.md`, pattern: PASS, kind: 'judge' });
    taskEntries.push({ tail: `tasks/task-${i}/critic.md`, pattern: APPROVE, kind: 'judge' });
  }
  const taskCheck = receiptProblems(cwd, taskEntries);
  if (taskCheck.unbacked.length > 0) {
    return `Hammer gate: ${unbackedNote(taskCheck.unbacked)}`;
  }
  if (taskCheck.missing.length > 0) {
    return (
      `Hammer gate: state claims all ${t.total} tasks are complete, but these receipts are missing, lack substance, or lack the required verdict: ${taskCheck.missing.join('; ')}. ` +
      `${substanceNote()}Completion claims without valid receipts are not trusted. Re-dispatch the validator/critic for each unevidenced task.`
    );
  }

  if (r.security !== 'pass' || r.qa !== 'pass') {
    return (
      `Hammer gate: all tasks complete but reviews are not green (security=${r.security}, qa=${r.qa}). ` +
      'Run the E2E gate (save its output to .glm-hammer/evidence/e2e.md), then dispatch security-reviewer and qa-reviewer in parallel. ' +
      'On FAIL, convert blocking findings into fix tasks, run them through the full task cycle, and re-run the E2E gate and the FULL review panel.'
    );
  }

  const reviewEntries = [
    { tail: 'e2e.md', kind: 'raw' },
    { tail: 'reviews/security.md', pattern: PASS, kind: 'judge' },
    { tail: 'reviews/qa.md', pattern: PASS, kind: 'judge' },
  ];
  const reviewCheck = receiptProblems(cwd, reviewEntries);
  if (reviewCheck.unbacked.length > 0) {
    return `Hammer gate: ${unbackedNote(reviewCheck.unbacked)}`;
  }
  if (reviewCheck.missing.length > 0) {
    return (
      `Hammer gate: state claims reviews passed, but these receipts are missing or invalid: ${reviewCheck.missing.join('; ')}. ` +
      `${substanceNote()}A PASS you cannot show a valid receipt for did not happen. Re-run the E2E gate and/or re-dispatch the reviewers.`
    );
  }

  // Plan seal on the amended plan (only when a seal exists — forge-created plans always have one)
  if (state.plan) {
    const planAbs = path.resolve(cwd, state.plan);
    if (sealMatches(cwd, planAbs) === 'broken') {
      return (
        'Hammer gate: the plan file changed outside tracked editing (its content seal is broken). ' +
        'Plan amendments must go through the Write/Edit tools with a Plan Amendment Log entry. ' +
        'Re-save the intended plan content via the Write tool, verify the Amendment Log reflects reality, and re-check affected tasks.'
      );
    }
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
  else if (state.phase === 'crucible' && state.status !== 'done') reason = crucibleGate(cwd, state);
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
