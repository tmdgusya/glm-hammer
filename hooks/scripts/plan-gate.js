'use strict';
// PostToolUse hook (Write|Edit|MultiEdit): plan integrity gate.
// - every tracked write to a plan file RESEALS it (content hash). stop-gate
//   compares the live file against the seal, so edits smuggled through Bash
//   or any untracked route break the seal and void approvals.
// - forge phase: any edit to the plan file invalidates critic approvals — the full
//   panel must re-run. This makes "revise then re-critique" mechanical, not optional.
// - hammer phase: plan edits are reminded to go through the Plan Amendment Log.
const fs = require('fs');
const path = require('path');
const {
  readStdin, readState, writeState, emitContext, writeSeal, parseStrictPlan,
  capturePlanPathBaseline, appendJournalPayload, sha256,
} = require('./lib');
function recordCorePlan(cwd, state, filePath) {
  if (!state || state.schemaVersion !== 1 || !state.runId || !Number.isSafeInteger(state.generation)) return true;
  let text;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch {
    return false;
  }
  const parsed = parseStrictPlan(text, null, { syntaxOnly: true });
  if (!parsed.ok) return false;
  const baseline = capturePlanPathBaseline(path.resolve(cwd), parsed.declaredPaths);
  if (!baseline.ok) return false;
  const planSha256 = sha256(Buffer.from(text));
  const nextGeneration = state.generation + 1;
  const base = appendJournalPayload(cwd, 'PLAN_PATH_BASELINE_RECORDED', state.runId, nextGeneration, {
    planPathBaseline: baseline.baseline,
    planPathBaselineSha256: baseline.sha256,
    planSha256,
  });
  if (!base.ok) return false;
  const advanced = appendJournalPayload(cwd, 'PLAN_GENERATION_ADVANCED', state.runId, nextGeneration, {
    planPath: path.relative(cwd, filePath).replace(/\\/g, '/'),
    planPathBaselineSha256: baseline.sha256,
    planSha256,
    previousGeneration: state.generation,
  });
  if (!advanced.ok) return false;
  state.generation = nextGeneration;
  state.generationStartMs = advanced.value.atMs;
  state.planSha256 = planSha256;
  state.declaredPaths = parsed.declaredPaths;
  state.plan = path.relative(cwd, filePath).replace(/\\/g, '/');
  writeState(cwd, state);
  return true;
}

try {
  const input = readStdin();
  const cwd = input.cwd || process.cwd();
  const filePath = String((input.tool_input && input.tool_input.file_path) || '');
  if (!filePath) process.exit(0);

  const normalized = path.normalize(filePath).replace(/\\/g, '/');
  const isPlanFile = /docs\/glm-hammer\/plans\/[^/]+\.md$/i.test(normalized);
  if (!isPlanFile) process.exit(0);

  if (!writeSeal(cwd, filePath)) process.exit(0); // strict core plans must parse and bind a complete baseline
  const state = readState(cwd);
  if (!state || !state.phase) process.exit(0);
  if (!recordCorePlan(cwd, state, filePath)) process.exit(0);


  if (state.phase === 'forge') {
    const critics = state.critics || { required: 3, approved: 0, round: 1, verdicts: [] };
    const hadApprovals = (critics.approved || 0) > 0 || state.status === 'approved';
    critics.approved = 0;
    critics.verdicts = [];
    state.critics = critics;
    if (state.status === 'approved' || state.status === 'critique') state.status = 'drafting';
    writeState(cwd, state);

    if (hadApprovals) {
      emitContext(
        'PostToolUse',
        `[glm-hammer plan-gate] ${normalized} was modified — all critic approvals are reset (0/${critics.required}). ` +
          'Re-dispatch the FULL critic panel (feasibility-critic, integration-critic, coverage-critic) before presenting the plan.'
      );
    }
    process.exit(0);
  }

  if (state.phase === 'hammer') {
    emitContext(
      'PostToolUse',
      `[glm-hammer plan-gate] ${normalized} was modified during a hammer run. ` +
        'Plan changes mid-execution are amendments: record what changed and why in the "## Plan Amendment Log" section, ' +
        'never weaken an acceptance criterion to make a failing implementation pass, and re-run the compliance check for affected tasks.'
    );
  }
  process.exit(0);
} catch {
  process.exit(0);
}
