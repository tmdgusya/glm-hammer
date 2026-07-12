'use strict';
// UserPromptSubmit hook: intent router.
// - If a glm-hammer run is active, remind the agent of the live state so it resumes the loop.
// - If idle and the prompt looks like a work request, inject routing rules so the agent
//   picks forge / blueprint / hammer without the user naming a skill.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  readStdin, readState, writeState, emitContext, readJournal, canonicalJson, sha256, atomicUnverified,
  appendJournalPayload, buildSourceSnapshot, parseStrictPlan, capturePlanPathBaseline,
} = require('./lib');
function armCoreRequest(cwd, state, prompt) {
  if (!state || state.schemaVersion !== 1 || !state.runId || !Number.isSafeInteger(state.generation)) return false;
  const snapshot = buildSourceSnapshot(cwd, {
    baselineHead: state.baselineHead || null,
    declaredPaths: state.declaredPaths || [],
  });
  if (!snapshot.ok) return false;
  const journal = readJournal(cwd);
  if (!journal.ok || !journal.events.some((event) =>
    event.runId === state.runId && event.generation === state.generation &&
    event.type === 'ROUTER_ARMED')) return false;
  const armed = appendJournalPayload(cwd, 'ROUTER_ARMED', state.runId, state.generation, {
    baselineHead: snapshot.snapshot.baselineHead,
    baselineSnapshotSha256: snapshot.sha256,
    promptEventHash: sha256(Buffer.from(prompt)),
  });
  return armed.ok;
}
function bootstrapCoreRun(cwd, phase, status, prompt) {
  const runId = crypto.randomUUID();
  const generation = 0;
  const startedAtMs = Date.now();
  let planControl = null;
  if (phase === 'hammer') {
    const plansDir = path.join(cwd, 'docs', 'glm-hammer', 'plans');
    let candidates = [];
    try {
      candidates = fs.readdirSync(plansDir)
        .filter((name) => name.endsWith('.md'))
        .map((name) => path.join(plansDir, name))
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    } catch {
      return null;
    }
    for (const absolute of candidates) {
      const text = fs.readFileSync(absolute, 'utf8');
      const syntax = parseStrictPlan(text, null, { syntaxOnly: true });
      if (!syntax.ok) continue;
      const baseline = capturePlanPathBaseline(cwd, syntax.declaredPaths);
      if (!baseline.ok) continue;
      planControl = {
        path: path.relative(cwd, absolute).replace(/\\/g, '/'),
        sha256: sha256(Buffer.from(text)),
        declaredPaths: syntax.declaredPaths,
        baseline: baseline.baseline,
        baselineSha256: baseline.sha256,
      };
      break;
    }
    if (!planControl) return null;
  }
  const snapshot = buildSourceSnapshot(cwd, {
    baselineHead: null,
    declaredPaths: planControl ? planControl.declaredPaths : [],
  });
  if (!snapshot.ok) return null;
  const state = {
    schemaVersion: 1,
    phase,
    status,
    runId,
    generation,
    generationStartMs: startedAtMs,
    baselineHead: snapshot.snapshot.currentHead,
    declaredPaths: planControl ? planControl.declaredPaths : [],
    plan: planControl ? planControl.path : undefined,
    planSha256: planControl ? planControl.sha256 : undefined,
    stopBlocks: 0,
  };
  writeState(cwd, state);
  const armed = appendJournalPayload(cwd, 'ROUTER_ARMED', runId, generation, {
    baselineHead: snapshot.snapshot.baselineHead,
    baselineSnapshotSha256: snapshot.sha256,
    promptEventHash: sha256(Buffer.from(prompt)),
  }, { atMs: startedAtMs });
  const transitioned = armed.ok && appendJournalPayload(cwd, 'PHASE_TRANSITIONED', runId, generation, {
    fromPhase: 'idle',
    fromStatus: 'idle',
    parentPhase: null,
    resumePhase: null,
    toPhase: phase,
    toStatus: status,
  }, { atMs: startedAtMs });
  const sealed = transitioned && transitioned.ok && (!planControl || appendJournalPayload(
    cwd, 'PLAN_PATH_BASELINE_RECORDED', runId, generation, {
      planPathBaseline: planControl.baseline,
      planPathBaselineSha256: planControl.baselineSha256,
      planSha256: planControl.sha256,
    }, { atMs: startedAtMs }));
  if (!sealed || (sealed !== true && !sealed.ok)) return null;
  return state;
}

try {
  const input = readStdin();
  const cwd = input.cwd || process.cwd();
  const prompt = String(input.prompt || '');
  let state = readState(cwd);
  const stateJournal = state && state.schemaVersion === 1 && state.runId ? readJournal(cwd) : null;
  const armedRun = Boolean(stateJournal && stateJournal.ok && stateJournal.events.some((event) =>
    event.type === 'ROUTER_ARMED' && event.runId === state.runId &&
    event.generation === state.generation));
  const completedRun = Boolean(armedRun && stateJournal.events.some((event) =>
    event.type === 'RUN_COMPLETED' && event.runId === state.runId &&
    event.generation === state.generation));
  const authenticatedCore = Boolean(state && state.schemaVersion === 1 && state.runId &&
    Number.isSafeInteger(state.generation));
  const bootstrapEligible = !state || (authenticatedCore
    ? completedRun
    : (!state.phase || state.phase === 'idle' || state.status === 'done'));
  if (state && state.schemaVersion === 1 && state.runId && Number.isSafeInteger(state.generation) &&
      /^glm-hammer override-unverified /.test(prompt.trim())) {
    const journal = readJournal(cwd);
    if (!journal.ok) process.exit(0);
    const proof = [...journal.events].reverse().find((event) =>
      event.runId === state.runId && event.generation === state.generation && event.type === 'USER_QUESTION_OBSERVED'
    );
    if (!proof) process.exit(0);
    atomicUnverified(cwd, input, {
      phase: state.phase,
      runId: state.runId,
      generation: state.generation,
      questionProof: { eventId: proof.eventId, eventHash: sha256(Buffer.from(canonicalJson(proof))), consumed: false },
      unresolvedGateCodes: state.unresolvedGateCodes || [],
    });
    process.exit(0);
  }

  const workRequest =
    /(만들|추가|구현|개발|리팩터|리팩토링|수정|고쳐|바꿔|기능|시스템|설계|디자인|계획|플랜|만들어|붙여|개선|마이그레이션|뽑|생성|추출|export|build|implement|add|create|refactor|feature|fix|migrate|redesign|design|develop|integrate|rewrite|plan)/i;
  const active = authenticatedCore
    ? !completedRun
    : Boolean(state && state.phase && state.phase !== 'idle' && state.status && state.status !== 'done');

  if (active) {
    if (workRequest.test(prompt)) armCoreRequest(cwd, state, prompt);
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
    if (state.prospect && state.prospect.required) {
      bits.push(`prospect ${state.prospect.reported || 0}/${state.prospect.required}`);
    }
    if (state.assay) {
      bits.push(`assay ${state.assay.verdict || 'pending'} (round ${state.assay.round || 1})`);
    }
    if (state.panel && state.panel.required) {
      bits.push(`panel ${state.panel.approved || 0}/${state.panel.required} (round ${state.panel.round || 1})`);
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

  if (!workRequest.test(prompt)) process.exit(0);

  const executeIntent =
    /(플랜.*(실행|구현|시작)|계획.*(실행|구현|시작)|(실행|구현|시작).*(플랜|계획)|execute the plan|run the plan|implement the plan|proceed with the plan|start implementing)/i;
  const deckIntent =
    /(발표|슬라이드|프레젠테이션|deck|presentation|pptx)/i;
  const designIntent =
    /(디자인|무드|룩\s*앤\s*필|브랜딩|비주얼|스타일\s*가이드|디자인\s*토큰|리디자인|design\s*tokens?|style\s*guide|visual\s*identity|look\s*and\s*feel|branding|mood)/i;
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
  } else if (deckIntent.test(prompt)) {
    hint =
      'This looks like a presentation/slide-deck request → invoke the `pptxx` skill ' +
      '(script → crucible design-token chaining → token-styled self-contained HTML deck) ' +
      'before any ad-hoc slide writing.';
  } else if (designIntent.test(prompt)) {
    hint =
      'This looks like a storyline/reference-driven design request → invoke the `crucible` skill ' +
      '(reference prospecting → design tokens → fidelity assay → designer panel) before any planning or implementation.';
  } else if (strongMarker.test(prompt)) {
    hint = 'The user is asking for rigorous work → invoke the `forge` skill (strong planning) before touching code.';
  } else {
    hint =
      'Route before touching code: ambiguous scope, 4+ files, or new/changed interfaces → `forge` skill; ' +
      'storyline/mood/design-token work → `crucible` skill; ' +
      'small clear change (≤3 files, existing interfaces) → `blueprint` skill; ' +
      'an approved plan already exists and the user wants it built → `hammer` skill. ' +
      'Trivial one-liners need no skill.';
  }
  if (bootstrapEligible &&
      ((executeIntent.test(prompt) && plansDirHasFiles) || strongMarker.test(prompt))) {
    const phase = executeIntent.test(prompt) && plansDirHasFiles ? 'hammer' : 'forge';
    state = bootstrapCoreRun(cwd, phase, phase === 'hammer' ? 'executing' : 'recon', prompt);
    if (!state) process.exit(0);
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
