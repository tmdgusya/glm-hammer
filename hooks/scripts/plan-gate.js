'use strict';
// PostToolUse hook (Write|Edit|MultiEdit): plan integrity gate.
// - forge phase: any edit to the plan file invalidates critic approvals — the full
//   panel must re-run. This makes "revise then re-critique" mechanical, not optional.
// - hammer phase: plan edits are reminded to go through the Plan Amendment Log.
const path = require('path');
const { readStdin, readState, writeState, emitContext } = require('./lib');

try {
  const input = readStdin();
  const cwd = input.cwd || process.cwd();
  const filePath = String((input.tool_input && input.tool_input.file_path) || '');
  if (!filePath) process.exit(0);

  const normalized = path.normalize(filePath).replace(/\\/g, '/');
  const isPlanFile = /docs\/glm-hammer\/plans\/[^/]+\.md$/i.test(normalized);
  if (!isPlanFile) process.exit(0);

  const state = readState(cwd);
  if (!state || !state.phase) process.exit(0);

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
