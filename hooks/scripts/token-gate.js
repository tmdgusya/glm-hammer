'use strict';
// PostToolUse hook (Write|Edit|MultiEdit): crucible design-artifact gate — the
// design-phase analog of plan-gate.js.
// - every tracked write to a design artifact RESEALS it (content hash).
// - crucible phase: edits to tokens.json / design-spec.md void the fidelity
//   assay and the designer-panel approvals — re-run assay, then the full panel.
// - tokens.json writes get an immediate deterministic validation so schema and
//   contrast problems are fixed same-turn, not discovered at the Stop gate.
const path = require('path');
const { readStdin, readState, writeState, emitContext, writeSeal } = require('./lib');
const { validateTokens } = require('./token-lib');

try {
  const input = readStdin();
  const cwd = input.cwd || process.cwd();
  const filePath = String((input.tool_input && input.tool_input.file_path) || '');
  if (!filePath) process.exit(0);

  const normalized = path.normalize(filePath).replace(/\\/g, '/');
  const isDesignFile = /docs\/glm-hammer\/design\/[^/]+\/(tokens\.json|design-spec\.md|references\.md)$/i.test(normalized);
  if (!isDesignFile) process.exit(0);

  writeSeal(cwd, filePath);

  const messages = [];
  const state = readState(cwd);
  const resetsApprovals = /(tokens\.json|design-spec\.md)$/i.test(normalized);

  if (state && state.phase === 'crucible' && resetsApprovals) {
    const hadApprovals =
      (state.assay && state.assay.verdict === 'approve') ||
      ((state.panel && state.panel.approved) || 0) > 0;
    state.assay = { verdict: 'pending', round: (state.assay && state.assay.round) || 1 };
    state.panel = Object.assign({ required: 2, round: 1 }, state.panel, { approved: 0, verdicts: [] });
    if (state.status === 'assay' || state.status === 'critique' || state.status === 'approved') {
      state.status = 'smelting';
    }
    writeState(cwd, state);
    if (hadApprovals) {
      messages.push(
        `${normalized} was modified — the fidelity assay and designer-panel approvals are reset. ` +
          'Re-dispatch fidelity-critic, then the FULL panel (harmony-critic, rigor-critic).'
      );
    }
  }

  if (/tokens\.json$/i.test(normalized)) {
    const res = validateTokens(path.resolve(cwd, filePath));
    if (!res.ok) {
      messages.push(
        `deterministic token check FAILED:\n- ${res.problems.join('\n- ')}\n` +
          'Fix tokens.json now — the Stop gate blocks while it is invalid.'
      );
    }
  }

  if (messages.length) emitContext('PostToolUse', `[glm-hammer token-gate] ${messages.join(' ')}`);
  process.exit(0);
} catch {
  process.exit(0);
}
