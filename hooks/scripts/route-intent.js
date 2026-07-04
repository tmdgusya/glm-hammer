'use strict';
// UserPromptSubmit hook: intent router.
// - If a glm-hammer run is active, remind the agent of the live state so it resumes the loop.
// - If idle and the prompt looks like a work request, inject routing rules so the agent
//   picks forge / blueprint / hammer without the user naming a skill.
const fs = require('fs');
const path = require('path');
const { readStdin, readState, writeState, emitContext } = require('./lib');

try {
  const input = readStdin();
  const cwd = input.cwd || process.cwd();
  const prompt = String(input.prompt || '');
  const state = readState(cwd);

  const active =
    state &&
    state.phase &&
    state.phase !== 'idle' &&
    state.status &&
    state.status !== 'done';

  if (active) {
    // Fresh user turn: reset the stop-block counter so the gate can enforce again.
    state.stopBlocks = 0;
    writeState(cwd, state);

    const bits = [`phase=${state.phase}`, `status=${state.status}`];
    if (state.tasks && state.tasks.total) {
      bits.push(`tasks ${state.tasks.completed || 0}/${state.tasks.total}`);
    }
    if (state.critics && state.critics.required) {
      bits.push(`critics ${state.critics.approved || 0}/${state.critics.required} (round ${state.critics.round || 1})`);
    }
    if (state.reviews) {
      bits.push(`reviews security=${state.reviews.security || 'pending'} qa=${state.reviews.qa || 'pending'}`);
    }
    emitContext(
      'UserPromptSubmit',
      `[glm-hammer] Active run: ${bits.join(', ')}${state.plan ? `, plan=${state.plan}` : ''}. ` +
        `Unless this message redirects or cancels the work, resume the ${state.phase} skill loop from this state. ` +
        `If the user is answering a question, incorporate the answer and continue.`
    );
    process.exit(0);
  }

  const workRequest =
    /(만들|추가|구현|개발|리팩터|리팩토링|수정|고쳐|바꿔|기능|시스템|설계|계획|플랜|만들어|붙여|개선|마이그레이션|build|implement|add|create|refactor|feature|fix|migrate|redesign|develop|integrate|rewrite|plan)/i;
  if (!workRequest.test(prompt)) process.exit(0);

  const executeIntent =
    /(플랜.*(실행|구현|시작)|계획.*(실행|구현|시작)|(실행|구현|시작).*(플랜|계획)|execute the plan|run the plan|implement the plan|proceed with the plan|start implementing)/i;
  const strongMarker =
    /(강한|강력|빡세|제대로|철저|꼼꼼|탄탄|deep|thorough|robust|strong|rigorous|properly|carefully)/i;

  let plansDirHasFiles = false;
  try {
    plansDirHasFiles = fs
      .readdirSync(path.join(cwd, 'docs', 'glm-hammer', 'plans'))
      .some((f) => f.endsWith('.md'));
  } catch {
    /* no plans dir */
  }

  let hint;
  if (executeIntent.test(prompt) && plansDirHasFiles) {
    hint = 'This looks like a request to execute an existing plan → invoke the `hammer` skill.';
  } else if (strongMarker.test(prompt)) {
    hint = 'The user is asking for rigorous work → invoke the `forge` skill (strong planning) before touching code.';
  } else {
    hint =
      'Route before touching code: ambiguous scope, 4+ files, or new/changed interfaces → `forge` skill; ' +
      'small clear change (≤3 files, existing interfaces) → `blueprint` skill; ' +
      'an approved plan already exists and the user wants it built → `hammer` skill. ' +
      'Trivial one-liners need no skill.';
  }

  emitContext(
    'UserPromptSubmit',
    `[glm-hammer router] This prompt looks like a work request. ${hint} ` +
      'Do not start implementation without a plan document.'
  );
  process.exit(0);
} catch {
  process.exit(0);
}
