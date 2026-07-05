'use strict';
// SessionStart hook: durable-run recovery (pattern borrowed from lazycodex).
// If .glm-hammer/state.json shows an unfinished run, inject a resume brief so the
// agent picks the loop back up after a restart, /clear, or compaction — without
// the user having to say "continue".
const { readStdin, readState, writeState, emitContext } = require('./lib');

try {
  const input = readStdin();
  const cwd = input.cwd || process.cwd();
  const state = readState(cwd);

  const active =
    state && state.phase && state.phase !== 'idle' && state.status && state.status !== 'done';
  if (!active) process.exit(0);

  // Fresh session: the old block counter is stale.
  state.stopBlocks = 0;
  writeState(cwd, state);

  const lines = [
    `[glm-hammer] Unfinished run detected (session source: ${input.source || 'unknown'}).`,
    `phase=${state.phase}, status=${state.status}${state.plan ? `, plan=${state.plan}` : ''}`,
  ];
  if (state.critics && state.critics.required) {
    lines.push(`critics: ${state.critics.approved || 0}/${state.critics.required} APPROVE (round ${state.critics.round || 1})`);
  }
  if (state.tasks && state.tasks.total) {
    lines.push(`tasks: ${state.tasks.completed || 0}/${state.tasks.total}${state.tasks.current ? ` (current: ${state.tasks.current})` : ''}`);
  }
  if (state.reviews) {
    lines.push(`reviews: security=${state.reviews.security || 'pending'}, qa=${state.reviews.qa || 'pending'}`);
  }
  if (state.prospect && state.prospect.required) {
    lines.push(`prospect: ${state.prospect.reported || 0}/${state.prospect.required} reports`);
  }
  if (state.assay) {
    lines.push(`assay: ${state.assay.verdict || 'pending'} (round ${state.assay.round || 1})`);
  }
  if (state.panel && state.panel.required) {
    lines.push(`panel: ${state.panel.approved || 0}/${state.panel.required} APPROVE (round ${state.panel.round || 1})`);
  }
  if (state.status === 'awaiting-user') {
    lines.push(
      'The run is paused waiting on the user. Do not resume the loop on your own — restate the open question to the user first.'
    );
  } else {
    lines.push(
      `Resume the ${state.phase} skill loop from this state: read the plan file and .glm-hammer/evidence/ to see what is already receipted, then continue from the first unmet gate. Do not restart from scratch and do not ask the user to repeat anything already in the plan.`
    );
  }
  emitContext('SessionStart', lines.join('\n'));
  process.exit(0);
} catch {
  process.exit(0);
}
