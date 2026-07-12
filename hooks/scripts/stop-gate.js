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
const fs = require('fs');
const path = require('path');
const {
  readStdin,
  readState,
  writeState,
  evidencePath,
  evidenceOk,
  underContextPressure,
  sealMatches,
  sha256File,
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

// ---- pptxx deck gate (§0 frozen contract) -----------------------------------
// Branch-③ manifest scan extensions / license allowlist (§0 frozen values;
// they live here rather than deck-gate.js because manifest verification is a
// Stop-gate concern).
const IMAGE_EXT = /\.(?:png|jpe?g|gif|webp|svg)$/i;
const LICENSE_ALLOW = new Set(['cc0', 'pdm', 'cc-by', 'cc-by-sa']);
const DECK_SEALED = ['slides.md', 'index.html'];

// attributions.md row grammar (frozen):
// | images/photo1.jpg | <sha256> | https://... | cc-by | <author> |
// Pipe-leading lines are cell-split; header/separator lines are skipped;
// only lines with >= 5 cells count as rows. Paths are deck-relative,
// forward-slash.
function manifestRows(text) {
  const rows = new Map();
  for (const line of text.split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length && cells[0] === '') cells.shift();
    if (cells.length && cells[cells.length - 1] === '') cells.pop();
    if (cells.length < 5) continue;
    if (cells.every((c) => /^:?-+:?$/.test(c) || c === '')) continue; // separator row
    if (/^(?:path|file)$/i.test(cells[0]) && /^sha-?256$/i.test(cells[1])) continue; // header row
    rows.set(cells[0].replace(/\\/g, '/'), cells);
  }
  return rows;
}

function pptxxManifestProblem(cwd, state, panelRound) {
  try {
    const deckAbs = path.resolve(cwd, state.deck);
    const images = [];
    (function walk(dir, rel) {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        if (ent.isDirectory()) {
          if (ent.name.toLowerCase() === 'shots') continue; // screenshots are scan-exempt
          walk(path.join(dir, ent.name), rel ? `${rel}/${ent.name}` : ent.name);
        } else if (IMAGE_EXT.test(ent.name)) {
          images.push(rel ? `${rel}/${ent.name}` : ent.name);
        }
      }
    })(deckAbs, '');
    if (images.length === 0) return null;

    const rows = manifestRows(fs.readFileSync(path.join(deckAbs, 'attributions.md'), 'utf8'));
    const problems = [];
    for (const rel of images) {
      const row = rows.get(rel);
      if (!row) {
        problems.push(`${rel}: no attributions.md row`);
        continue;
      }
      const actual = sha256File(path.join(deckAbs, ...rel.split('/')));
      if (!actual || actual.toLowerCase() !== String(row[1] || '').toLowerCase()) {
        problems.push(`${rel}: sha256 mismatch against the manifest`);
        continue;
      }
      const license = String(row[3] || '').toLowerCase().split(/\s+/)[0];
      const confirmed = row.some((c) => /(?:^|\s)user-confirmed(?:\s|$)/i.test(c));
      if (!LICENSE_ALLOW.has(license) && !confirmed) {
        problems.push(`${rel}: license "${license || '(missing)'}" not in {cc0, pdm, cc-by, cc-by-sa} and no user-confirmed token`);
      }
    }
    if (problems.length === 0) return null;
    return (
      `pptxx gate: image integrity manifest failed — ${problems.join('; ')}. ` +
      `Every image under ${state.deck} (shots/ excepted) needs an attributions.md row "| <deck-relative-path> | <sha256> | <source-url> | <license> | <author> |" ` +
      `with an allowlisted license or a user-confirmed token. Fix attributions.md via the Write tool (this reseals it), then re-run the image panel (round ${panelRound}).`
    );
  } catch (err) {
    // §0 fail-closed: scan/parse errors inside the armed scope block, never pass.
    return (
      `pptxx gate: image manifest verification errored (${err && err.message ? err.message : 'fs error'}) — failing closed. ` +
      `Ensure ${state.deck} is readable and attributions.md contains the manifest table, then stop again.`
    );
  }
}

function pptxxGate(cwd, state) {
  const vq = state.visualQa || {};
  const ip = state.imagePanel || {};
  const armed = vq.required === true || ip.required === 1;

  // ⓪ §0 fail-closed — the one exception to fail-open, for ALL statuses and
  // BEFORE done-skip: armed flags with no deck path means the evidence can no
  // longer be located, so nothing can be verified.
  if (armed && !state.deck) {
    return (
      'pptxx gate: quality flags are armed (visualQa.required/imagePanel.required) but state.deck is missing — failing closed. ' +
      'Restore "deck" in .glm-hammer/state.json to the deck directory (docs/glm-hammer/decks/YYYY-MM-DD-<name>) so seals and receipts can be verified.'
    );
  }

  // done-skip: a finished run with no deck (unarmed — ⓪ ran first) is silent.
  if (state.status === 'done' && !state.deck) return null;

  // ④ early statuses demand nothing yet. awaiting-user never reaches here —
  // the common guard handles it before phase dispatch.
  if (state.status !== 'visual-qa' && state.status !== 'exporting' && state.status !== 'done') return null;

  // ① seal set + build receipt (whenever a deck exists; hybrid-done re-verifies).
  if (state.deck) {
    const deckAbs = path.resolve(cwd, state.deck);
    const sealedNames = ip.required === 1 ? DECK_SEALED.concat('attributions.md') : DECK_SEALED;
    for (const name of sealedNames) {
      const seal = sealMatches(cwd, path.join(deckAbs, name));
      if (seal !== 'ok') {
        return (
          `pptxx gate: the content seal on ${state.deck}/${name} is ${seal === 'broken' ? 'BROKEN — the file changed outside tracked editing (e.g. via shell redirection)' : 'MISSING — the file was never saved through the Write/Edit tools'}. ` +
          'Re-save the exact intended content via the Write tool (this reseals it), then satisfy the remaining deck gates.'
        );
      }
    }
    const build = receiptProblems(cwd, [{ tail: 'deck/build.md', kind: 'raw' }]);
    if (build.missing.length > 0) {
      return (
        'pptxx gate: deck build receipt missing or empty: .glm-hammer/evidence/deck/build.md. ' +
        'Record the real build/render output there when building completes, then stop again.'
      );
    }
  }

  // ② visual QA judge (dispatch-backed).
  if (vq.required === true) {
    const round = vq.round || 1;
    const tail = `deck/visual-qa/round-${round}/visual-qa-critic.md`;
    const r = receiptProblems(cwd, [{ tail, pattern: APPROVE, kind: 'judge' }]);
    if (r.unbacked.length > 0) return `pptxx gate: ${unbackedNote(r.unbacked)}`;
    if (r.missing.length > 0) {
      return (
        `pptxx gate: visual QA not green (round ${round}) — missing, insubstantial, or lacking "VERDICT: APPROVE": ${r.missing.join(', ')}. ` +
        `${substanceNote()}Dispatch visual-qa-critic on the current shots/ with its evidence path .glm-hammer/evidence/${tail}. On REJECT, fix the deck (tracked edits bump the round) and re-dispatch.`
      );
    }
  }

  // ③ image panel judge (dispatch-backed) + integrity manifest.
  if (ip.required === 1) {
    const round = ip.round || 1;
    const tail = `deck/panel/round-${round}/image-suitability-critic.md`;
    const r = receiptProblems(cwd, [{ tail, pattern: APPROVE, kind: 'judge' }]);
    if (r.unbacked.length > 0) return `pptxx gate: ${unbackedNote(r.unbacked)}`;
    if (r.missing.length > 0) {
      return (
        `pptxx gate: image panel not green (round ${round}) — missing, insubstantial, or lacking "VERDICT: APPROVE": ${r.missing.join(', ')}. ` +
        `${substanceNote()}Dispatch image-suitability-critic with the deck images, attributions.md, and its evidence path .glm-hammer/evidence/${tail}.`
      );
    }
    const manifestProblem = pptxxManifestProblem(cwd, state, round);
    if (manifestProblem) return manifestProblem;
  }

  return null;
}
function coreCommonGuard(cwd, state) {
  const journal = require('./lib').readJournal(cwd);
  if (!journal.ok) return `Core gate: journal authority is invalid (${journal.code}).`;
  if (journal.events.length === 0) return 'Core gate: authoritative journal is missing for a non-idle core run.';
  const runEvents = journal.events.filter((event) => event.runId === state.runId);
  if (runEvents.some((event) => event.type === 'RUN_COMPLETED' || event.type === 'RUN_ENDED_UNVERIFIED')) return null;
  if (state.status === 'awaiting-user') {
    if (runEvents.some((event) => event.type === 'USER_QUESTION_OBSERVED' &&
      !runEvents.some((terminal) => terminal.type === 'RUN_ENDED_UNVERIFIED' &&
        terminal.payload.questionProofEventId === event.eventId))) return null;
    return 'Core gate: awaiting-user requires an approved unconsumed structural question proof.';
  }
  if (state.phase === 'forge') return forgeGate(cwd, state);
  if (state.phase === 'hammer') return hammerGate(cwd, state);
  return `Core gate: unsupported core phase ${state.phase}.`;
}


try {
  const input = readStdin();
  const cwd = input.cwd || process.cwd();
  const state = readState(cwd);

  if (!state || !state.phase || state.phase === 'idle') process.exit(0);
  const core = state.schemaVersion === 1 && typeof state.runId === 'string' && Number.isSafeInteger(state.generation);
  let reason = null;
  let blocks = state.stopBlocks || 0;
  if (core) {
    reason = coreCommonGuard(cwd, state);
  } else {
    if (state.status === 'awaiting-user') process.exit(0);
    if (underContextPressure(input.transcript_path)) process.exit(0);
    if (blocks >= BLOCK_CAP) process.exit(0);
    if (state.phase === 'forge' && state.status !== 'done') reason = forgeGate(cwd, state);
    else if (state.phase === 'crucible' && state.status !== 'done') reason = crucibleGate(cwd, state);
    else if (state.phase === 'hammer') reason = hammerGate(cwd, state);
    else if (state.phase === 'pptxx') reason = pptxxGate(cwd, state);
  }

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
