'use strict';
// Zero-dep smoke tests for glm-hammer hook gates. Run from repo root: node tests/gates.test.js
const { spawnSync, execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
function findStrictPlanner(root) {
  const persisted = path.join(root, 'docs', 'glm-hammer', 'plans', '2026-07-12-harness-hardening-execution.md');
  return fs.existsSync(persisted) ? persisted : null;
}

function scanPlanAndContracts() {
  const planPath = findStrictPlanner(ROOT);
  if (!planPath) throw new Error('strict reviewed Planner artifact not found');
  const plan = fs.readFileSync(planPath, 'utf8');
  const taskStart = plan.indexOf('### Task 1:');
  const sequenceStart = plan.indexOf('## Sequencing');
  const taskBlock = plan.slice(taskStart, sequenceStart >= 0 ? sequenceStart : plan.length);
  const headings = [...taskBlock.matchAll(/^### Task ([1-7]): .+$/gm)].map((match) => Number(match[1]));
  if (headings.join(',') !== '1,2,3,4,5,6,7') throw new Error('Task 1-7 headings are not contiguous');
  for (let id = 1; id <= 7; id++) {
    const start = taskBlock.indexOf(`### Task ${id}:`);
    const end = id === 7 ? taskBlock.length : taskBlock.indexOf(`### Task ${id + 1}:`);
    const block = taskBlock.slice(start, end);
    if (!/^\*\*Dependencies:\*\* (?:None|Task [1-6](?:, Task [1-6])*)$/m.test(block)) throw new Error(`Task ${id} dependencies invalid`);
    if (!/^\*\*Files:\*\*$/m.test(block) || !/^- (?:Create|Modify|Test): `[^`]+`$/m.test(block)) throw new Error(`Task ${id} files invalid`);
    if (!/^\*\*Acceptance Criteria:\*\*$/m.test(block) || !/^- \[ \] .+$/m.test(block)) throw new Error(`Task ${id} acceptance invalid`);
    const steps = [...block.matchAll(/^\*\*Step ([1-9]\d*):\*\*/gm)].map((match) => Number(match[1]));
    if (!steps.length || steps.some((step, index) => step !== index + 1)) throw new Error(`Task ${id} steps invalid`);
  }
  if (/\b(?:TODO|TBD|FIXME)\b/.test(taskBlock) || /<[^>\n]+>/.test(taskBlock)) throw new Error('unfinished plan marker');
  const coreLib = require(path.join(ROOT, 'hooks', 'scripts', 'lib.js'));
  const syntax = coreLib.parseStrictPlan(plan, null, { syntaxOnly: true });
  if (!syntax.ok) throw new Error(`strict plan syntax failed: ${syntax.code}`);
  const baselineReceipt = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'tests', 'fixtures', 'plans', 'generation-baseline.json'), 'utf8'));
  if (baselineReceipt.schemaVersion !== 1 ||
      baselineReceipt.planSha256 !== coreLib.sha256(Buffer.from(plan))) {
    throw new Error('sealed generation plan receipt mismatch');
  }
  const baseline = coreLib.capturePlanPathBaselineAtCommit(
    ROOT, baselineReceipt.baseCommit, syntax.declaredPaths);
  if (!baseline.ok || baseline.sha256 !== baselineReceipt.baselineSha256) {
    throw new Error(`generation baseline failed: ${baseline.code || 'sealed hash mismatch'}`);
  }
  const strict = coreLib.parseStrictPlan(plan, baseline.baseline);
  if (!strict.ok || strict.tasks.length !== 7 || strict.obligations.length !== 7) {
    throw new Error(`strict plan obligations failed: ${strict.code || 'count'}`);
  }
  for (const required of [
    '- Create: `hooks/scripts/review-snapshot.js`',
    '- Modify: `hooks/hooks.json`',
  ]) if (!taskBlock.includes(required)) throw new Error(`strict change inventory missing: ${required}`);
  const changedPaths = new Set([
    ...execFileSync('git', ['diff', '--name-only', baselineReceipt.baseCommit], { cwd: ROOT, encoding: 'utf8' })
      .split('\n').filter(Boolean),
    ...execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8' })
      .split('\n').filter(Boolean).map((line) => line.slice(3)),
  ]);
  const undeclared = [...changedPaths].filter((file) =>
    !file.startsWith('.gjc/') && !file.startsWith('docs/glm-hammer/reviews/') &&
    !syntax.declaredPaths.includes(file));
  if (undeclared.length) throw new Error(`strict change inventory incomplete: ${undeclared.sort().join(',')}`);
  const hooks = JSON.parse(fs.readFileSync(path.join(ROOT, 'hooks', 'hooks.json'), 'utf8')).hooks;
  const allowed = ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PermissionRequest', 'PostToolUse', 'PostToolUseFailure', 'Stop'];
  if (Object.keys(hooks).some((event) => !allowed.includes(event))) throw new Error('unsupported hook event');
  const preReview = hooks.PreToolUse.find((entry) => entry.matcher === 'Agent|Task');
  const postDispatch = hooks.PostToolUse.find((entry) => entry.matcher === 'Agent|Task');
  const stopCommands = hooks.Stop.flatMap((entry) => entry.hooks)
    .map((hook) => hook.args && hook.args[0]);
  if (!preReview || preReview.hooks.length !== 1 ||
      preReview.hooks[0].args[0] !== '${ZCODE_PLUGIN_ROOT}/hooks/scripts/review-snapshot.js' ||
      !postDispatch || postDispatch.hooks.length !== 1 ||
      postDispatch.hooks[0].args[0] !== '${ZCODE_PLUGIN_ROOT}/hooks/scripts/dispatch-log.js' ||
      stopCommands[0] !== '${ZCODE_PLUGIN_ROOT}/hooks/scripts/question-observer.js' ||
      stopCommands[1] !== '${ZCODE_PLUGIN_ROOT}/hooks/scripts/stop-gate.js') {
    throw new Error('core provenance hook wiring drift');
  }
  const matrix = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'runtime', 'capability-matrix.json'), 'utf8'));
  if (JSON.stringify(matrix.supportedZCodeEvents) !== JSON.stringify(allowed) || matrix.f11 !== 'OPEN') throw new Error('runtime matrix drift');
  const approval = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'runtime', 'approval.json'), 'utf8'));
  if (approval.architecturalStatus !== 'CLEAR' || approval.recommendation !== 'APPROVE') throw new Error('runtime approval missing');
  const amendment = fs.readFileSync(path.join(ROOT, 'docs', 'glm-hammer', 'plans', '2026-07-12-harness-hardening-runtime-amendment.md'), 'utf8');
  if (!amendment.includes('zcode-cli') || !amendment.includes('0.15.2') ||
      !amendment.includes(matrix.engineIdentity.artifactSha256)) throw new Error('runtime amendment missing');
  for (const [file, token] of [
    ['hooks/scripts/stop-gate.js', 'coreCommonGuard'],
    ['hooks/scripts/dispatch-log.js', 'CORE_DISPATCH_COMPLETED'],
    ['hooks/scripts/plan-gate.js', 'PLAN_PATH_BASELINE_RECORDED'],
    ['hooks/scripts/route-intent.js', 'ROUTER_ARMED'],
  ]) if (!fs.readFileSync(path.join(ROOT, file), 'utf8').includes(token)) throw new Error(`production wiring missing: ${file}`);
  process.stdout.write('PLAN_AND_CONTRACTS_CLEAN\n');
}

if (process.argv.includes('--scan-plan-and-contracts')) {
  try {
    scanPlanAndContracts();
    process.exit(0);
  } catch (error) {
    process.stderr.write(`PLAN_AND_CONTRACTS_DIRTY: ${error.message}\n`);
    process.exit(1);
  }
}
let failures = 0;
function check(name, cond, detail) {
  console.log(`${cond ? 'ok  ' : 'FAIL'} - ${name}${!cond && detail ? ` :: ${detail}` : ''}`);
  if (!cond) failures++;
}

// (a) every hook script parses
for (const f of fs.readdirSync(path.join(ROOT, 'hooks', 'scripts')).filter((f) => f.endsWith('.js'))) {
  const r = spawnSync(process.execPath, ['--check', path.join(ROOT, 'hooks', 'scripts', f)]);
  check(`node --check hooks/scripts/${f}`, r.status === 0, String(r.stderr));
}

// (b) JSON registrations parse
for (const f of ['hooks/hooks.json', '.zcode-plugin/plugin.json', '.claude-plugin/plugin.json']) {
  let ok = true;
  try { JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); } catch { ok = false; }
  check(`${f} parses`, ok);
}

const { validateTokens, validateSpec, contrast } = require(path.join(ROOT, 'hooks', 'scripts', 'token-lib.js'));
const lib = require(path.join(ROOT, 'hooks', 'scripts', 'lib.js'));

const GOOD = {
  "color": {
    "text": {
      "default": { "$type": "color", "$value": "#1a1a1a" },
      "muted": { "$type": "color", "$value": "#5f5f5f" }
    },
    "surface": {
      "default": { "$type": "color", "$value": "#faf7f2" },
      "raised": { "$type": "color", "$value": "#ffffff" }
    },
    "accent": {
      "default": { "$type": "color", "$value": "#b3541e" }
    }
  },
  "typography": {
    "font": { "body": { "$type": "fontFamily", "$value": ["Georgia", "serif"] } },
    "size": {
      "sm": { "$type": "dimension", "$value": "14px" },
      "md": { "$type": "dimension", "$value": "16px" },
      "lg": { "$type": "dimension", "$value": "24px" }
    }
  },
  "spacing": {
    "xs": { "$type": "dimension", "$value": "4px" },
    "sm": { "$type": "dimension", "$value": "8px" },
    "md": { "$type": "dimension", "$value": "16px" },
    "lg": { "$type": "dimension", "$value": "32px" }
  },
  "radius": { "md": { "$type": "dimension", "$value": "8px" } }
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'glm-hammer-test-'));
function writeTokens(obj) {
  const p = path.join(tmp, 'tokens.json');
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
  return p;
}

// (c) known-good fixture passes
check('validateTokens accepts good fixture', validateTokens(writeTokens(GOOD)).ok === true);

// (d) missing required group
const noRadius = JSON.parse(JSON.stringify(GOOD)); delete noRadius.radius;
const r1 = validateTokens(writeTokens(noRadius));
check('missing radius rejected', !r1.ok && r1.problems.some((p) => /radius/i.test(p)));

// (e) low contrast (#8a8a8a on #faf7f2 is ~3.3, below the 4.5 required for non-muted text)
const lowContrast = JSON.parse(JSON.stringify(GOOD));
lowContrast.color.text.default.$value = '#8a8a8a';
const r2 = validateTokens(writeTokens(lowContrast));
check('low contrast rejected', !r2.ok && r2.problems.some((p) => /contrast/i.test(p)));

// (e2) non-object documents are rejected, not crashed on (QA finding: fail-open via thrown TypeError)
for (const bad of ['null', '[]', '123', '"str"', 'true']) {
  let res = null;
  try {
    res = validateTokens(writeTokens(JSON.parse(bad)));
  } catch {
    res = null;
  }
  check(`validateTokens rejects non-object ${bad}`, !!res && res.ok === false && res.problems.some((m) => /object/i.test(m)));
}

// (f) contrast math
check('contrast(#000,#fff) === 21', Math.abs(contrast('#000000', '#ffffff') - 21) < 0.01);

// (g) spec heading enforcement
const specPath = path.join(tmp, 'design-spec.md');
fs.writeFileSync(specPath, '# Design Spec\n## Story & Direction\nx\n## References\nx\n## Token Rationale\nx\n## Application Guide\nx\n');
check('spec missing Fidelity Notes rejected', validateSpec(specPath).ok === false);
fs.appendFileSync(specPath, '## Fidelity Notes\nx\n');
check('complete spec accepted', validateSpec(specPath).ok === true);

// (h) stop-gate crucible branch, end to end in a throwaway project dir
const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'glm-hammer-proj-'));
const designRel = 'docs/glm-hammer/design/2026-07-05-test';
const designAbs = path.join(proj, ...designRel.split('/'));
fs.mkdirSync(designAbs, { recursive: true });
fs.writeFileSync(path.join(designAbs, 'tokens.json'), JSON.stringify(GOOD, null, 2));
fs.writeFileSync(
  path.join(designAbs, 'design-spec.md'),
  '# Design Spec\n## Story & Direction\nx\n## References\nx\n## Token Rationale\nx\n## Application Guide\nx\n## Fidelity Notes\nx\n'
);
fs.writeFileSync(path.join(designAbs, 'references.md'), 'refs\n');
lib.writeSeal(proj, path.join(designAbs, 'tokens.json'));
lib.writeSeal(proj, path.join(designAbs, 'design-spec.md'));

const JUDGE_BODY =
  'CHECKS:\n' + Array.from({ length: 6 }, (_, i) => `- C${i + 1}: YES — verified against the design dir with real content padding`).join('\n') +
  '\nVERDICT: APPROVE\nFINDINGS:\n- none\n';
const evid = (tail) => path.join(proj, '.glm-hammer', 'evidence', ...tail.split('/'));
for (const t of [
  'design/prospect/vein-reader.md',
  'design/prospect/color-prospector.md',
  'design/prospect/type-prospector.md',
  'design/prospect/layout-prospector.md',
  'design/prospect/motion-prospector.md',
]) {
  fs.mkdirSync(path.dirname(evid(t)), { recursive: true });
  fs.writeFileSync(evid(t), 'report with at least twenty bytes of content\n');
}
for (const t of [
  'design/assay/round-1/fidelity-critic.md',
  'design/panel/round-1/harmony-critic.md',
  'design/panel/round-1/rigor-critic.md',
]) {
  fs.mkdirSync(path.dirname(evid(t)), { recursive: true });
  fs.writeFileSync(evid(t), JUDGE_BODY);
}

const greenState = {
  phase: 'crucible',
  status: 'critique',
  design: designRel,
  prospect: { required: 5, reported: 5 },
  assay: { verdict: 'approve', round: 1 },
  panel: { required: 2, approved: 2, round: 1, verdicts: [] },
  stopBlocks: 0,
};
function runStopGate() {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'hooks', 'scripts', 'stop-gate.js')], {
    input: JSON.stringify({ cwd: proj }),
    encoding: 'utf8',
  });
  return r.stdout || '';
}
lib.writeState(proj, greenState);
check('stop-gate silent when crucible gates are green', runStopGate().indexOf('"block"') === -1);

// (h2) non-object tokens.json fails CLOSED at the stop gate
fs.writeFileSync(path.join(designAbs, 'tokens.json'), 'null');
lib.writeSeal(proj, path.join(designAbs, 'tokens.json'));
lib.writeState(proj, greenState);
check('stop-gate blocks on non-object tokens.json', runStopGate().indexOf('"block"') !== -1);
fs.writeFileSync(path.join(designAbs, 'tokens.json'), JSON.stringify(GOOD, null, 2));
lib.writeSeal(proj, path.join(designAbs, 'tokens.json'));

fs.rmSync(evid('design/assay/round-1/fidelity-critic.md'));
lib.writeState(proj, greenState);
check('stop-gate blocks on missing fidelity receipt', runStopGate().indexOf('"block"') !== -1);

// (i) token-gate resets approvals on tracked token write
lib.writeState(proj, { ...greenState, panel: { required: 2, approved: 2, round: 1, verdicts: [] } });
const tg = spawnSync(process.execPath, [path.join(ROOT, 'hooks', 'scripts', 'token-gate.js')], {
  input: JSON.stringify({ cwd: proj, tool_input: { file_path: path.join(designAbs, 'tokens.json') } }),
  encoding: 'utf8',
});
check('token-gate exits 0', tg.status === 0, String(tg.stderr));
const after = lib.readState(proj);
check('token-gate reset panel approvals', after.panel.approved === 0 && after.assay.verdict === 'pending');
check('token-gate moved status back to smelting', after.status === 'smelting');

// (j) authored artifacts exist
for (const f of [
  'agents/vein-reader.md',
  'agents/color-prospector.md',
  'agents/type-prospector.md',
  'agents/layout-prospector.md',
  'agents/motion-prospector.md',
  'agents/fidelity-critic.md',
  'agents/harmony-critic.md',
  'agents/rigor-critic.md',
  'agents/image-suitability-critic.md',
  'agents/visual-qa-critic.md',
  'skills/crucible/SKILL.md',
  'skills/pptxx/SKILL.md',
]) {
  check(`${f} exists`, fs.existsSync(path.join(ROOT, f)));
}

// ---------------------------------------------------------------------------
// pptxx (M2): deck-gate.js + stop-gate pptxxGate — §0 frozen-contract scenarios
// ---------------------------------------------------------------------------
const DECK_GATE = path.join(ROOT, 'hooks', 'scripts', 'deck-gate.js');
const STOP_GATE = path.join(ROOT, 'hooks', 'scripts', 'stop-gate.js');

function mkDeckProj() {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'glm-hammer-pptxx-'));
  const deckRel = 'docs/glm-hammer/decks/2026-07-07-test';
  const deckAbs = path.join(p, ...deckRel.split('/'));
  fs.mkdirSync(deckAbs, { recursive: true });
  return { proj: p, deckRel, deckAbs };
}
function pptxxState(deckRel, overrides) {
  return Object.assign(
    {
      phase: 'pptxx',
      status: 'scripting',
      deck: deckRel,
      design: 'docs/glm-hammer/design/2026-07-07-test',
      resume: null,
      slides: { total: 0, diagrams: 0 },
      imagePanel: { required: 0, round: 1 },
      visualQa: { required: false, round: 1 },
      stopBlocks: 0,
    },
    overrides || {}
  );
}
function runStop(p) {
  const r = spawnSync(process.execPath, [STOP_GATE], { input: JSON.stringify({ cwd: p }), encoding: 'utf8' });
  return r.stdout || '';
}
function runDeck(p, filePath) {
  const r = spawnSync(process.execPath, [DECK_GATE], {
    input: JSON.stringify({ cwd: p, tool_input: { file_path: filePath } }),
    encoding: 'utf8',
  });
  return r.stdout || '';
}
function writeDeckFile(deckAbs, name, body) {
  const abs = path.join(deckAbs, ...name.split('/'));
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, body);
  return abs;
}
function deckEvid(p, tail) {
  const abs = path.join(p, '.glm-hammer', 'evidence', ...tail.split('/'));
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  return abs;
}
function readSealFile(p) {
  try {
    return JSON.parse(fs.readFileSync(path.join(p, '.glm-hammer', 'plan-seal.json'), 'utf8'));
  } catch {
    return {};
  }
}
// Green branch-① fixture: slides.md + index.html written and sealed (via
// lib.writeSeal — gate-standalone), build receipt present, flags unarmed.
function greenDeck(p, deckAbs) {
  const slides = writeDeckFile(deckAbs, 'slides.md', '# Deck\n\n## Slide 1\nplain text, no diagram blocks\n');
  const html = writeDeckFile(deckAbs, 'index.html', '<h1>Deck</h1><p>self-contained, no external refs</p>\n');
  lib.writeSeal(p, slides);
  lib.writeSeal(p, html);
  fs.writeFileSync(deckEvid(p, 'deck/build.md'), 'build ok: 6 slides rendered without errors\n');
  return { slides, html };
}
const JUDGE_REJECT = JUDGE_BODY.replace('VERDICT: APPROVE', 'VERDICT: REJECT');
const DECK_KEY = 'docs/glm-hammer/decks/2026-07-07-test';

// planKey unit assertions (decks/ extension)
check(
  'planKey decks: abs backslash == rel forward',
  lib.planKey('C:\\proj\\docs\\glm-hammer\\decks\\2026-07-07-x\\slides.md') ===
    lib.planKey('docs/glm-hammer/decks/2026-07-07-x/slides.md') &&
    lib.planKey('docs/glm-hammer/decks/2026-07-07-x/slides.md') === 'docs/glm-hammer/decks/2026-07-07-x/slides.md'
);
check('planKey decks: html tracked', lib.planKey('/x/docs/glm-hammer/decks/d/index.html') === 'docs/glm-hammer/decks/d/index.html');
check(
  'planKey decks: png/shots not tracked',
  lib.planKey('docs/glm-hammer/decks/d/shots/slide-01.png') === 'docs/glm-hammer/decks/d/shots/slide-01.png' &&
    lib.planKey('docs/glm-hammer/decks/d/img.png') === 'docs/glm-hammer/decks/d/img.png'
);
check(
  'planKey legacy keys unchanged',
  lib.planKey('C:\\p\\docs\\glm-hammer\\plans\\2026-07-05-a.md') === 'docs/glm-hammer/plans/2026-07-05-a.md' &&
    lib.planKey('docs/glm-hammer/design/2026-07-05-x/tokens.json') === 'docs/glm-hammer/design/2026-07-05-x/tokens.json'
);

// pptxx (a): visual-qa with no seals blocks
{
  const { proj, deckRel } = mkDeckProj();
  lib.writeState(proj, pptxxState(deckRel, { status: 'visual-qa' }));
  check('pptxx (a) visual-qa no seals blocks', runStop(proj).indexOf('"block"') !== -1);
}

// pptxx (b): fully green, unarmed
{
  const { proj, deckRel, deckAbs } = mkDeckProj();
  greenDeck(proj, deckAbs);
  lib.writeState(proj, pptxxState(deckRel, { status: 'visual-qa' }));
  check('pptxx (b) all green passes', runStop(proj).indexOf('"block"') === -1);
}

// pptxx (g): the done 4-branch (hybrid-done keyed on state.deck).
// stopBlocks cap(6) = 의도된 하우스 탈출구 (hammer 선례와 동일) — 캡 초과 시 침묵은 회귀 아님.
{
  const { proj, deckRel, deckAbs } = mkDeckProj();
  const noDeck = pptxxState(deckRel, { status: 'done' });
  delete noDeck.deck; // unarmed fixture — fail-closed must not fire here
  lib.writeState(proj, noDeck);
  check('pptxx (g1) done without deck is silent', runStop(proj).indexOf('"block"') === -1);

  greenDeck(proj, deckAbs);
  lib.writeState(proj, pptxxState(deckRel, { status: 'done' }));
  check('pptxx (g2) done with deck + green seals passes', runStop(proj).indexOf('"block"') === -1);

  // tamper through an untracked route: content changes, seal does not
  fs.appendFileSync(path.join(deckAbs, 'slides.md'), 'smuggled edit outside tracked tools\n');
  lib.writeState(proj, pptxxState(deckRel, { status: 'done' }));
  check('pptxx (g3) done with deck + broken seal blocks', runStop(proj).indexOf('"block"') !== -1);

  lib.writeSeal(proj, path.join(deckAbs, 'slides.md')); // repair the seal
  lib.writeState(proj, pptxxState(deckRel, { status: 'done', visualQa: { required: true, round: 1 } }));
  check('pptxx (g4) done + armed flag + no receipt blocks', runStop(proj).indexOf('"block"') !== -1);
}

// pptxx (h): awaiting-user is handled by the common guard BEFORE phase dispatch
{
  const { proj, deckRel } = mkDeckProj();
  lib.writeState(proj, pptxxState(deckRel, { status: 'awaiting-user' }));
  check('pptxx (h) awaiting-user passes (guard-order regression)', runStop(proj).indexOf('"block"') === -1);
}

// pptxx (o): early statuses demand nothing (branch ④)
{
  const { proj, deckRel } = mkDeckProj();
  let earlyAllPass = true;
  for (const s of ['scripting', 'chaining', 'imaging', 'building']) {
    lib.writeState(proj, pptxxState(deckRel, { status: s }));
    if (runStop(proj).indexOf('"block"') !== -1) earlyAllPass = false;
  }
  check('pptxx (o) early statuses pass', earlyAllPass);
}

// pptxx (p): armed + state.deck missing → fail-closed, even at an early status
{
  const { proj, deckRel } = mkDeckProj();
  const armedNoDeck = pptxxState(deckRel, { status: 'building', visualQa: { required: true, round: 1 } });
  delete armedNoDeck.deck;
  lib.writeState(proj, armedNoDeck);
  check('pptxx (p) armed without deck fail-closed blocks', runStop(proj).indexOf('"block"') !== -1);
}

// pptxx (i): slides.md with a diagram block arms visualQa; the arming write
// itself does not bump the round; the seal lands under the decks planKey.
{
  const { proj, deckRel, deckAbs } = mkDeckProj();
  lib.writeState(proj, pptxxState(deckRel, { status: 'scripting' }));
  const slides = writeDeckFile(deckAbs, 'slides.md', '# Deck\n\n```diagram\nA -> B -> C\n```\n');
  runDeck(proj, slides);
  const st = lib.readState(proj);
  check(
    'pptxx (i) slides.md write arms visualQa',
    st.visualQa.required === true && st.visualQa.round === 1 && !!readSealFile(proj)[`${DECK_KEY}/slides.md`]
  );
}

// pptxx (i2): index.html local image ref ratchets imagePanel.required to 1;
// a later rewrite without image refs must NOT un-arm it (one-way ratchet).
{
  const { proj, deckRel, deckAbs } = mkDeckProj();
  lib.writeState(proj, pptxxState(deckRel, { status: 'building' }));
  const html = writeDeckFile(deckAbs, 'index.html', '<h1>x</h1><img src="images/a.png" alt="a">\n');
  runDeck(proj, html);
  const st1 = lib.readState(proj);
  writeDeckFile(deckAbs, 'index.html', '<h1>no images anymore</h1>\n');
  runDeck(proj, html);
  const st2 = lib.readState(proj);
  check(
    'pptxx (i2) index.html local image ref ratchets imagePanel',
    st1.imagePanel.required === 1 && st1.imagePanel.round === 1 && st2.imagePanel.required === 1
  );
}

// pptxx (j): deck-direct binaries and anything under shots/ are untracked —
// no seal, no state change, no output.
{
  const { proj, deckRel, deckAbs } = mkDeckProj();
  const seeded = pptxxState(deckRel, { status: 'building' });
  lib.writeState(proj, seeded);
  const png = writeDeckFile(deckAbs, 'logo.png', 'not-really-a-png');
  const shot = writeDeckFile(deckAbs, 'shots/slide-01.png', 'not-really-a-png');
  const outPng = runDeck(proj, png);
  const outShot = runDeck(proj, shot);
  check(
    'pptxx (j) deck png and shots excluded',
    Object.keys(readSealFile(proj)).length === 0 &&
      JSON.stringify(lib.readState(proj)) === JSON.stringify(seeded) &&
      outPng === '' &&
      outShot === ''
  );
}

// pptxx (k): file→round reset mapping. Fixture note: both flags are seeded
// armed at round 1 (the state (i)+(i2) produce, minus the visualQa.round bump
// §0's own mapping applies to the second arming write) so the mapping under
// test is isolated.
{
  const { proj, deckRel, deckAbs } = mkDeckProj();
  lib.writeState(
    proj,
    pptxxState(deckRel, {
      status: 'visual-qa',
      visualQa: { required: true, round: 1 },
      imagePanel: { required: 1, round: 1 },
    })
  );
  const html = writeDeckFile(deckAbs, 'index.html', '<h1>rev 2</h1><img src="images/a.png" alt="a">\n');
  runDeck(proj, html);
  const st1 = lib.readState(proj);
  check(
    'pptxx (k1) index.html re-edit bumps only visualQa.round',
    st1.visualQa.round === 2 && st1.imagePanel.round === 1
  );

  const attr = writeDeckFile(deckAbs, 'attributions.md', '| path | sha256 | source | license | author |\n');
  runDeck(proj, attr);
  const st2 = lib.readState(proj);
  check(
    'pptxx (k2) attributions.md edit bumps only imagePanel.round',
    st2.imagePanel.round === 2 && st2.visualQa.round === 2
  );
}

// pptxx (c)(d)(l): visual-qa judge receipt + dispatch-ledger backing
{
  const { proj, deckRel, deckAbs } = mkDeckProj();
  greenDeck(proj, deckAbs);
  const vqArmed = { status: 'visual-qa', visualQa: { required: true, round: 1 } };

  lib.writeState(proj, pptxxState(deckRel, vqArmed));
  check('pptxx (c) visualQa required + no receipt blocks', runStop(proj).indexOf('"block"') !== -1);

  lib.writeState(proj, pptxxState(deckRel, { status: 'visual-qa', visualQa: { required: false, round: 1 } }));
  check('pptxx (d) visualQa not required passes', runStop(proj).indexOf('"block"') === -1);

  // (l1) receipt exists AND the seeded ledger references its tail → backed
  fs.writeFileSync(deckEvid(proj, 'deck/visual-qa/round-1/visual-qa-critic.md'), JUDGE_BODY);
  fs.writeFileSync(
    path.join(proj, '.glm-hammer', 'dispatch.jsonl'),
    JSON.stringify({ paths: ['deck/visual-qa/round-1/visual-qa-critic.md'] }) + '\n'
  );
  lib.writeState(proj, pptxxState(deckRel, vqArmed));
  check('pptxx (l1) ledger-backed receipt passes', runStop(proj).indexOf('"block"') === -1);

  // (l2) ledger is NON-EMPTY (enforcement active — empty ledger stays
  // fail-open) but only references a different tail → unbacked
  fs.writeFileSync(
    path.join(proj, '.glm-hammer', 'dispatch.jsonl'),
    JSON.stringify({ paths: ['deck/visual-qa/round-9/somebody-else.md'] }) + '\n'
  );
  lib.writeState(proj, pptxxState(deckRel, vqArmed));
  const l2out = runStop(proj);
  check('pptxx (l2) unbacked receipt blocks', l2out.indexOf('"block"') !== -1 && /dispatch/i.test(l2out));
}

// pptxx (e)(m): image panel receipt + integrity manifest (C-6 row grammar:
// 5 pipe cells, deck-relative forward-slash path)
{
  const { proj, deckRel, deckAbs } = mkDeckProj();
  greenDeck(proj, deckAbs);
  writeDeckFile(deckAbs, 'images/photo1.jpg', 'jpeg-bytes-photo-one-1111');
  writeDeckFile(deckAbs, 'images/sub/photo2.png', 'png-bytes-photo-two-2222');
  const sha1 = lib.sha256File(path.join(deckAbs, 'images', 'photo1.jpg'));
  const sha2 = lib.sha256File(path.join(deckAbs, 'images', 'sub', 'photo2.png'));
  const ROW1 = `| images/photo1.jpg | ${sha1} | https://example.com/p1 | cc-by | Author One |`;
  const ROW2 = `| images/sub/photo2.png | ${sha2} | https://example.com/p2 | cc0 | Author Two |`;
  function writeManifest(rowLines) {
    const body =
      '| path | sha256 | source | license | author |\n| --- | --- | --- | --- | --- |\n' + rowLines.join('\n') + '\n';
    lib.writeSeal(proj, writeDeckFile(deckAbs, 'attributions.md', body));
  }
  writeManifest([ROW1, ROW2]);
  const ipArmed = { status: 'visual-qa', imagePanel: { required: 1, round: 1 } };
  const panelTail = 'deck/panel/round-1/image-suitability-critic.md';

  lib.writeState(proj, pptxxState(deckRel, ipArmed));
  check('pptxx (e1) imagePanel armed + missing receipt blocks', runStop(proj).indexOf('"block"') !== -1);

  fs.writeFileSync(deckEvid(proj, panelTail), JUDGE_REJECT);
  lib.writeState(proj, pptxxState(deckRel, ipArmed));
  check('pptxx (e2) REJECT receipt blocks', runStop(proj).indexOf('"block"') !== -1);

  fs.writeFileSync(deckEvid(proj, panelTail), JUDGE_BODY);
  lib.writeState(proj, pptxxState(deckRel, ipArmed));
  // subdirectory image images/sub/photo2.png matching here doubles as ⓜ's pass side
  check('pptxx (e3) APPROVE + matching manifest passes', runStop(proj).indexOf('"block"') === -1);

  writeManifest([ROW1.replace(sha1, sha1.split('').reverse().join('')), ROW2]);
  lib.writeState(proj, pptxxState(deckRel, ipArmed));
  check('pptxx (m1) sha256 mismatch blocks', runStop(proj).indexOf('"block"') !== -1);

  writeManifest([ROW1.replace(' cc-by ', ' cc-by-nc '), ROW2]);
  lib.writeState(proj, pptxxState(deckRel, ipArmed));
  check('pptxx (m2) disallowed license without user-confirmed blocks', runStop(proj).indexOf('"block"') !== -1);

  writeManifest([
    `| images/photo1.jpg | ${sha1} | https://example.com/p1 | cc-by-nc user-confirmed | Author One |`,
    ROW2,
  ]);
  lib.writeState(proj, pptxxState(deckRel, ipArmed));
  check('pptxx (m3) disallowed license + user-confirmed passes', runStop(proj).indexOf('"block"') === -1);

  writeManifest([ROW1]); // photo2 row dropped
  lib.writeState(proj, pptxxState(deckRel, ipArmed));
  check('pptxx (m4) unmanifested subdirectory image blocks', runStop(proj).indexOf('"block"') !== -1);
}

// pptxx (f): imagePanel.required === 0 demands nothing image-related
{
  const { proj, deckRel, deckAbs } = mkDeckProj();
  greenDeck(proj, deckAbs);
  lib.writeState(proj, pptxxState(deckRel, { status: 'visual-qa', imagePanel: { required: 0, round: 1 } }));
  check('pptxx (f1) imagePanel 0 not required', runStop(proj).indexOf('"block"') === -1);

  lib.writeState(proj, pptxxState(deckRel, { status: 'visual-qa' }));
  check(
    'pptxx (f2) required=0 + no attributions + 2-file seal passes',
    !fs.existsSync(path.join(deckAbs, 'attributions.md')) && runStop(proj).indexOf('"block"') === -1
  );
}

// pptxx (n): attribute-scoped static checks — violations refuse the seal
// (deck-gate warns; the Stop gate then blocks via seal missing/broken).
{
  const { proj, deckRel, deckAbs } = mkDeckProj();
  lib.writeState(proj, pptxxState(deckRel, { status: 'building' }));
  const html = writeDeckFile(deckAbs, 'index.html', '<h1>x</h1><script>alert(1)</script>\n');
  const out = runDeck(proj, html);
  check(
    'pptxx (n1) <script> refuses seal',
    out.indexOf('additionalContext') !== -1 &&
      out.indexOf('REFUSED') !== -1 &&
      readSealFile(proj)[`${DECK_KEY}/index.html`] === undefined
  );
}
{
  const { proj, deckRel, deckAbs } = mkDeckProj();
  greenDeck(proj, deckAbs); // index.html sealed with its original content
  const html = writeDeckFile(deckAbs, 'index.html', '<h1>x</h1><img src="https://evil/x.png" alt="x">\n');
  const out = runDeck(proj, html); // refused → seal now broken vs new content
  lib.writeState(proj, pptxxState(deckRel, { status: 'visual-qa' }));
  check(
    'pptxx (n2) remote src refuses seal, stop blocks',
    out.indexOf('REFUSED') !== -1 && runStop(proj).indexOf('"block"') !== -1
  );
}
{
  const { proj, deckRel, deckAbs } = mkDeckProj();
  const slides = writeDeckFile(deckAbs, 'slides.md', '# Deck\n\n## Slide 1\nplain text\n');
  lib.writeSeal(proj, slides);
  fs.writeFileSync(deckEvid(proj, 'deck/build.md'), 'build ok: rendered without errors\n');
  lib.writeState(proj, pptxxState(deckRel, { status: 'building' }));
  // <a href> attribution links and text-node URLs are explicitly allowed;
  // every reference-context value here is deck-relative.
  const html = writeDeckFile(
    deckAbs,
    'index.html',
    '<h1>Deck</h1><img src="images/local.png" alt="chart">' +
      '<p>Source: https://unsplash.com/photos/abc123 (plain text URL)</p>' +
      '<a href="https://unsplash.com/@author">출처: Author</a>\n'
  );
  const out = runDeck(proj, html); // seals; also ratchets imagePanel (local img)
  const sealed = !!readSealFile(proj)[`${DECK_KEY}/index.html`];
  lib.writeState(proj, pptxxState(deckRel, { status: 'visual-qa' })); // (b)-style unarmed stop
  check(
    'pptxx (n3) attribution link and text URL seal OK',
    out.indexOf('REFUSED') === -1 && sealed && runStop(proj).indexOf('"block"') === -1
  );
}

// ---------------------------------------------------------------------------
// pptxx (M3): route-intent deck routing E2E + SKILL.md drift suite + keywords
// ---------------------------------------------------------------------------
const ROUTE_INTENT = path.join(ROOT, 'hooks', 'scripts', 'route-intent.js');

// (r) route-intent E2E fixture harness: spawn + stdin {cwd, prompt}, fresh
// tmpdir per fixture (state-leak isolation), optional seeded state.
function runRoute(prompt, state) {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'glm-hammer-route-'));
  if (state) lib.writeState(p, state);
  const r = spawnSync(process.execPath, [ROUTE_INTENT], {
    input: JSON.stringify({ cwd: p, prompt }),
    encoding: 'utf8',
  });
  return r.stdout || '';
}

// (r0) active state → resume context (Active run), never the router hint
{
  const out = runRoute('다음 진행해줘', pptxxState(DECK_KEY, { status: 'building' }));
  check('pptxx (r0) active state emits resume context, not router hint', out.indexOf('Active run') !== -1 && out.indexOf('router') === -1);
}
// (r1) deck verb prompt (뽑 verb + 발표/슬라이드 nouns) → pptxx
check('pptxx (r1) deck verb prompt routes to pptxx', runRoute('이 스크립트로 발표 슬라이드 뽑아줘').indexOf('pptxx') !== -1);
// (r2) design-token prompt → crucible, not pptxx
{
  const out = runRoute('브랜드 디자인 토큰 만들어줘');
  check('pptxx (r2) design-token prompt routes to crucible', out.indexOf('crucible') !== -1 && out.indexOf('pptxx') === -1);
}
// (r3) deck+design ambiguous prompt: deck branch precedes designIntent → pptxx
// (branch-order regression label: '슬라이드 디자인해줘' matches BOTH deckIntent and designIntent)
check('pptxx (r3) deck+design prompt prefers pptxx', runRoute('슬라이드 디자인해줘').indexOf('pptxx') !== -1);
// (r4) non-work mention of 발표 (a noun, not a workRequest verb) → nothing emitted
check('pptxx (r4) non-work mention of 발표 emits nothing', runRoute('팀에게 결과를 발표했어요') === '');

// (s) drift suite: read the SKILL.md files and compare at the string level.
const pptxxSkill = fs.readFileSync(path.join(ROOT, 'skills', 'pptxx', 'SKILL.md'), 'utf8');
const crucibleSkill = fs.readFileSync(path.join(ROOT, 'skills', 'crucible', 'SKILL.md'), 'utf8');

// (s1) status enum set-equal to §0 (size 8 + every element)
{
  const m = pptxxSkill.match(/"status":\s*"([^"]+)"/);
  const got = m ? m[1].split('|').map((x) => x.trim()) : [];
  const want = ['scripting', 'chaining', 'imaging', 'building', 'visual-qa', 'awaiting-user', 'exporting', 'done'];
  const setEqual = got.length === 8 && want.every((w) => got.includes(w)) && got.every((g) => want.includes(g));
  check('pptxx (s1) status enum set-equal to §0', setEqual, JSON.stringify(got));
}

// (s2) marker ⟨state: <m>⟩ present ×8. Era constant — full 8-status set at M5
// (M4 += visual-qa; M5 += awaiting-user·exporting). This is the sole in-place
// assertion edit §0's drift rule pre-approves; the marker grep and the fenced-JSON
// status enum (s1) now range over the same full enum.
const M3_MARKERS = ['scripting', 'chaining', 'imaging', 'building', 'visual-qa', 'awaiting-user', 'exporting', 'done'];
for (const m of M3_MARKERS) {
  check(`pptxx (s2) marker ⟨state: ${m}⟩ present`, new RegExp('⟨state:\\s*' + m).test(pptxxSkill));
}

// (s3) evidence tails COVERAGE (M4 upgrade: subset → coverage, §0 drift rule):
// all 4 §0 tails present AND nothing outside the set (round-N normalized).
{
  const tailSet = new Set([
    'evidence/deck/build.md',
    'evidence/deck/fetch.md',
    'evidence/deck/visual-qa/round-N/visual-qa-critic.md',
    'evidence/deck/panel/round-N/image-suitability-critic.md',
  ]);
  const found = (pptxxSkill.match(/evidence\/deck\/[^\s)`]+/g) || []).map((x) =>
    x.replace(/round-(?:\d+|<[^>]*>)/, 'round-N')
  );
  check(
    'pptxx (s3) evidence tails coverage (all 4 §0 tails present)',
    found.length >= 1 && found.every((f) => tailSet.has(f)) && [...tailSet].every((t) => found.includes(t)),
    JSON.stringify(found)
  );
}

// (s4)(s5) crucible resume amendment anchors present
check('pptxx (s4) crucible preserve-keys amendment present', crucibleSkill.indexOf('Preserve top-level `resume`, `deck`, and `slides` keys across every state rewrite') !== -1);
check('pptxx (s5) crucible Phase E resume bullet present', crucibleSkill.indexOf('skip ONLY the forge hand-off') !== -1);

// (s6)(s7) contract document path citations
check('pptxx (s6) cites format-spec contract', pptxxSkill.indexOf('planning/spikes/pptx/format-spec.md') !== -1);
check('pptxx (s7) cites screenshot addressing contract', pptxxSkill.indexOf('planning/spikes/screenshot/README.md') !== -1);

// keyword membership: both plugin.json manifests carry the pptxx keywords
for (const f of ['.zcode-plugin/plugin.json', '.claude-plugin/plugin.json']) {
  let kw = [];
  try { kw = JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')).keywords || []; } catch { kw = []; }
  const need = ['pptxx', 'deck', 'presentation', '슬라이드'];
  check(`${f} has pptxx keywords`, need.every((k) => kw.includes(k)));
}

// ---------------------------------------------------------------------------
// pptxx (M4): image-sourcing + visual-qa SKILL.md drift (s8..s12) and the two
// critic agent contracts (t1..t8). Code-frozen strings match verbatim; prose
// concepts accept KR/EN alternatives (plan C-9 #4).
// ---------------------------------------------------------------------------

// (s8) imaging names Openverse + Wikimedia + WebSearch
check(
  'pptxx (s8) imaging names Openverse+Wikimedia+WebSearch',
  pptxxSkill.includes('Openverse') &&
    (pptxxSkill.includes('Wikimedia') || pptxxSkill.includes('commons.wikimedia.org')) &&
    pptxxSkill.includes('WebSearch')
);

// (s9) attributions.md 5-column grammar present (example path + column tokens)
check(
  'pptxx (s9) attributions.md 5-column grammar present',
  pptxxSkill.includes('attributions.md') &&
    pptxxSkill.includes('images/photo1.jpg') &&
    pptxxSkill.includes('sha256') &&
    pptxxSkill.includes('license') &&
    pptxxSkill.includes('author')
);

// (s10) insane-search prohibitions present
check(
  'pptxx (s10) insane-search prohibitions present',
  pptxxSkill.includes('insane-search') &&
    (pptxxSkill.includes('image bytes') || pptxxSkill.includes('이미지 바이트')) &&
    (pptxxSkill.includes('robots') || pptxxSkill.includes('paywall')) &&
    (pptxxSkill.includes('per-URL') || pptxxSkill.includes('URL별'))
);

// (s11) license policy allowlist + user-confirmed + mature
check(
  'pptxx (s11) license policy allowlist + user-confirmed',
  ['cc0', 'pdm', 'cc-by', 'cc-by-sa', 'user-confirmed', 'mature'].every((k) => pptxxSkill.includes(k))
);

// (s12) M1 download flags present (code-frozen)
check(
  'pptxx (s12) M1 download flags present',
  ["--proto '=https'", '--max-redirs 3', '5242880', 'image/*'].every((k) => pptxxSkill.includes(k))
);

// (t) critic agent contracts — read each file once and reuse.
const imgCritic = fs.readFileSync(path.join(ROOT, 'agents', 'image-suitability-critic.md'), 'utf8');
const vqCritic = fs.readFileSync(path.join(ROOT, 'agents', 'visual-qa-critic.md'), 'utf8');
const TOOLS_4SET = 'tools: ["Read", "Grep", "Glob", "Write"]';
function agentContract(prefix, name, body) {
  check(`pptxx (${prefix[0]}) ${name} tools == 4-set`, body.includes(TOOLS_4SET) && !/tools:.*Bash/.test(body));
  check(
    `pptxx (${prefix[1]}) ${name} single-Write rule present`,
    body.includes('Write exactly one file') && body.includes('REJECT-level protocol violation')
  );
  check(
    `pptxx (${prefix[2]}) ${name} data-not-instructions present`,
    body.includes('untrusted data') && body.includes('never instructions')
  );
  check(
    `pptxx (${prefix[3]}) ${name} 4-item checklist`,
    ['**C1:**', '**C2:**', '**C3:**', '**C4:**'].every((c) => body.includes(c))
  );
}
agentContract(['t1', 't2', 't3', 't4'], 'image-suitability-critic', imgCritic);
agentContract(['t5', 't6', 't7', 't8'], 'visual-qa-critic', vqCritic);

// ---------------------------------------------------------------------------
// pptxx (M5): zero-dep boundary — skills/pptxx/scripts/md2pptx.py is runtime
// only. The suite stays pure-Node: it never imports/requires/spawns the
// converter; it only asserts the converter EXISTS and that hooks/ + tests/
// carry no python dependency. The match patterns are FRAGMENT-ASSEMBLED so this
// test file never self-matches its own scan of tests/ (plan C-7 #7 / C-8 B).
// ---------------------------------------------------------------------------
function readTreeFiles(dir, exts) {
  const out = [];
  const walk = (d) => {
    let entries = [];
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (exts.some((x) => e.name.endsWith(x))) out.push(full);
    }
  };
  walk(dir);
  return out;
}
const BOUNDARY_FILES = [
  ...readTreeFiles(path.join(ROOT, 'hooks'), ['.js', '.json']),
  ...readTreeFiles(path.join(ROOT, 'tests'), ['.js', '.json']),
];

// (z1) no python dependency anywhere under hooks/ or tests/. Pattern assembled
// from fragments so the literal never appears contiguously in this file.
{
  const zeroDepRe = new RegExp(
    ['python' + '-pptx', 'import ' + 'pptx', 'spawn' + '(Sync)?\\(' + "['\"]" + '(python' + '|py)'].join('|')
  );
  const hits = BOUNDARY_FILES.filter((f) => zeroDepRe.test(fs.readFileSync(f, 'utf8')));
  check(
    'pptxx (z1) zero-dep boundary: no python refs in hooks/ + tests/',
    hits.length === 0,
    JSON.stringify(hits.map((f) => path.relative(ROOT, f)))
  );
}

// (z2) the runtime converter exists (existence only — never invoked).
check(
  'pptxx (z2) md2pptx.py exists',
  fs.existsSync(path.join(ROOT, 'skills', 'pptxx', 'scripts', 'md2pptx.py'))
);

// (z3) no hook/test require()s the converter (python files can't be require()'d
// — this pins the boundary). Fragment-assembled; the z2 existence-check path
// literal is not a require() context, so it does not match.
{
  const reqRe = new RegExp('require' + '\\([^)]*md2pptx');
  const jsFiles = BOUNDARY_FILES.filter((f) => f.endsWith('.js'));
  const hits = jsFiles.filter((f) => reqRe.test(fs.readFileSync(f, 'utf8')));
  check(
    "pptxx (z3) md2pptx.py is never require()'d by any hook/test",
    hits.length === 0,
    JSON.stringify(hits.map((f) => path.relative(ROOT, f)))
  );
}

// (core-v1) strict grammar, generation-relative virtual files, receipt order,
// dispatch freshness, and canonical journal envelopes.
{
  const plan = [
    '### Task 1: Create',
    '**Goal:** create',
    '**Dependencies:** None',
    '**Files:**',
    '- Create: `a.txt`',
    '**Acceptance Criteria:**',
    '- [ ] created',
    '**Step 1:** create it',
    '',
    '### Task 2: Consume',
    '**Goal:** consume',
    '**Dependencies:** Task 1',
    '**Files:**',
    '- Modify: `a.txt`',
    '**Acceptance Criteria:**',
    '- [ ] consumed',
    '**Step 1:** consume it',
  ].join('\n');
  const baseline = { 'a.txt': { state: 'ABSENT', type: 'absent', sha256: null } };
  const parsed = lib.parseStrictPlan(plan, baseline);
  check('core-v1 strict virtual plan accepts create then dependent modify', parsed.ok, parsed.code);
  check('core-v1 baseline missing blocks deterministically', lib.parseStrictPlan(plan, null).code === 'PLAN_PATH_BASELINE_MISSING');
  const badDependency = plan.replace('**Dependencies:** Task 1', '**Dependencies:** None');
  check('core-v1 virtual consumer requires creator dependency', lib.parseStrictPlan(badDependency, baseline).code === 'PLAN_PATH_DEPENDENCY');
  const event = {
    schemaVersion: 1,
    type: 'ROUTER_ARMED',
    eventId: `evt_${'a'.repeat(32)}`,
    runId: '123e4567-e89b-42d3-a456-426614174000',
    seq: 1,
    generation: 0,
    atMs: 1,
    payload: { baselineHead: null, baselineSnapshotSha256: 'b'.repeat(64), promptEventHash: 'c'.repeat(64) },
  };
  check('core-v1 canonical journal event validates', lib.parseJournalLine(lib.canonicalJson(event), { nowMs: 1 }).ok);
  check('core-v1 noncanonical journal event blocks', lib.parseJournalLine(JSON.stringify(event), { nowMs: 1 }).code === 'EVT_JSON');
  const unverifiedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'glm-unverified-'));
  const proof = lib.appendJournalPayload(unverifiedDir, 'USER_QUESTION_OBSERVED', event.runId, 0, {
    observerEventHash: 'd'.repeat(64),
    observerKind: 'stop-transcript',
    turnId: 'turn-1',
  });
  const token = `glm-hammer override-unverified ${event.runId} 0`;
  const ended = lib.atomicUnverified(unverifiedDir, { prompt: token }, {
    phase: 'hammer',
    runId: event.runId,
    generation: 0,
    questionProof: { eventId: proof.value.eventId, eventHash: lib.sha256(Buffer.from(lib.canonicalJson(proof.value))), consumed: false },
    unresolvedGateCodes: ['CORE_REVIEW_SNAPSHOT_MISSING'],
  });
  const terminalEvents = lib.readJournal(unverifiedDir).events.filter((entry) => entry.type === 'RUN_ENDED_UNVERIFIED');
  const projection = lib.readState(unverifiedDir);
  check('core-v1 structural proof emits one atomic UNVERIFIED terminal', ended.ok && terminalEvents.length === 1);
  check('core-v1 UNVERIFIED projection has no verified fields', projection.verification === 'UNVERIFIED' && !Object.keys(projection).some((key) => /^verified/i.test(key)));
  const replay = lib.atomicUnverified(unverifiedDir, { prompt: token }, {
    phase: 'hammer', runId: event.runId, generation: 0,
    questionProof: { eventId: proof.value.eventId, eventHash: 'd'.repeat(64), consumed: false },
  });
  check('core-v1 UNVERIFIED replay is idempotent', replay.ok && replay.replay === true && lib.readJournal(unverifiedDir).events.filter((entry) => entry.type === 'RUN_ENDED_UNVERIFIED').length === 1);
  fs.rmSync(unverifiedDir, { recursive: true, force: true });
}
// (core-runtime) invoke the real Stop observer and Stop gate processes.
{
  const coreProbe = fs.mkdtempSync(path.join(os.tmpdir(), 'glm-core-runtime-'));
  fs.mkdirSync(path.join(coreProbe, '.glm-hammer'), { recursive: true });
  const runId = '123e4567-e89b-42d3-a456-426614174000';
  lib.writeState(coreProbe, { schemaVersion: 1, runId, generation: 0, phase: 'hammer', status: 'awaiting-user' });
  const observer = (responseText) => spawnSync(process.execPath, [path.join(ROOT, 'hooks', 'scripts', 'question-observer.js')], {
    input: JSON.stringify({
      cwd: coreProbe, hookEventName: 'Stop', hook_event_name: 'Stop',
      responsePreview: 'preview', responseText, transcriptPath: 'none',
      transcript_path: 'none', toolCallCount: 1, turnId: 'turn-1',
    }), encoding: 'utf8',
  });
  observer('context low');
  check('core Stop observer ignores raw transcript markers', lib.readJournal(coreProbe).events.length === 0);
  observer(JSON.stringify({ question: { requiresUserResponse: true } }));
  observer(JSON.stringify({ question: { requiresUserResponse: true } }));
  check('core Stop observer records one concrete question proof', lib.readJournal(coreProbe).events.filter((e) => e.type === 'USER_QUESTION_OBSERVED').length === 1);
  const blocked = spawnSync(process.execPath, [path.join(ROOT, 'hooks', 'scripts', 'stop-gate.js')], {
    input: JSON.stringify({ cwd: coreProbe }), encoding: 'utf8',
  });
  check('real core Stop gate blocks missing authoritative evidence', blocked.stdout.includes('"decision":"block"'));
  const localRuntime = path.join(coreProbe, 'tests', 'fixtures', 'runtime');
  fs.mkdirSync(localRuntime, { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'tests', 'fixtures', 'runtime', 'manifest.json'),
    path.join(localRuntime, 'manifest.json'));
  const phase0Blocked = spawnSync(process.execPath, [path.join(ROOT, 'hooks', 'scripts', 'stop-gate.js')], {
    input: JSON.stringify({ cwd: coreProbe }), encoding: 'utf8',
  });
  check('Phase 0 incomplete approval blocks later core gates',
    phase0Blocked.stdout.includes('missing or invalid Phase-0 artifact capabilities.json'));
  fs.rmSync(path.join(coreProbe, 'tests'), { recursive: true, force: true });
  const stateFile = path.join(coreProbe, '.glm-hammer', 'state.json');
  const stateBytes = fs.readFileSync(stateFile);
  fs.rmSync(stateFile);
  const stateDeleted = spawnSync(process.execPath, [path.join(ROOT, 'hooks', 'scripts', 'stop-gate.js')], {
    input: JSON.stringify({ cwd: coreProbe }), encoding: 'utf8',
  });
  check('state deletion alone cannot disarm a nonterminal authoritative journal',
    stateDeleted.stdout.includes('nonterminal run but state is missing or idle'));
  fs.writeFileSync(stateFile, stateBytes);
  const idleState = JSON.parse(stateBytes);
  idleState.phase = 'idle';
  idleState.status = 'idle';
  fs.writeFileSync(stateFile, JSON.stringify(idleState));
  const idleProjection = spawnSync(process.execPath, [path.join(ROOT, 'hooks', 'scripts', 'stop-gate.js')], {
    input: JSON.stringify({ cwd: coreProbe }), encoding: 'utf8',
  });
  check('mutable idle projection cannot disarm a nonterminal authoritative journal',
    idleProjection.stdout.includes('nonterminal run but state is missing or idle'));
  fs.writeFileSync(stateFile, stateBytes);
  fs.rmSync(path.join(coreProbe, '.glm-hammer', 'control-events.jsonl'));
  const journalDeleted = spawnSync(process.execPath, [path.join(ROOT, 'hooks', 'scripts', 'stop-gate.js')], {
    input: JSON.stringify({ cwd: coreProbe }), encoding: 'utf8',
  });
  check('journal deletion with nonidle state blocks without migration credit',
    journalDeleted.stdout.includes('authoritative journal is missing or invalid'));
  fs.rmSync(path.join(coreProbe, '.glm-hammer', 'state.json'));
  const bothDeleted = spawnSync(process.execPath, [path.join(ROOT, 'hooks', 'scripts', 'stop-gate.js')], {
    input: JSON.stringify({ cwd: coreProbe }), encoding: 'utf8',
  });
  check('both control files deleted remains explicitly undetectable and silent', bothDeleted.stdout === '');
  fs.rmSync(coreProbe, { recursive: true, force: true });
}
// (core-runtime-bootstrap) a fresh execution request creates an authenticated core run.
{
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'glm-core-bootstrap-'));
  const planDir = path.join(cwd, 'docs', 'glm-hammer', 'plans');
  fs.mkdirSync(planDir, { recursive: true });
  fs.writeFileSync(path.join(planDir, 'approved.md'), [
    '### Task 1: Bootstrap',
    '**Goal:** bootstrap a sealed execution',
    '**Dependencies:** None',
    '**Files:**',
    '- Create: `artifact.txt`',
    '**Acceptance Criteria:**',
    '- [ ] The artifact is created.',
    '**Step 1:** Create the artifact.',
    '',
  ].join('\n'));
  const prompt = 'implement the plan';
  const routed = spawnSync(process.execPath, [path.join(ROOT, 'hooks', 'scripts', 'route-intent.js')], {
    input: JSON.stringify({ cwd, prompt }),
    encoding: 'utf8',
  });
  const state = lib.readState(cwd);
  const journal = lib.readJournal(cwd);
  check('fresh core execution request bootstraps schema-v1 hammer run',
    routed.status === 0 && state.schemaVersion === 1 && state.phase === 'hammer' &&
    state.status === 'executing' && /^[0-9a-f-]{36}$/.test(state.runId) && state.generation === 0);
  check('fresh core bootstrap records authenticated route, transition, and sealed generation baseline',
    journal.ok && journal.events.length === 3 &&
    journal.events[0].type === 'ROUTER_ARMED' && journal.events[1].type === 'PHASE_TRANSITIONED' &&
    journal.events[2].type === 'PLAN_PATH_BASELINE_RECORDED' &&
    journal.events.every((event) => event.runId === state.runId && event.generation === 0) &&
    state.plan === 'docs/glm-hammer/plans/approved.md' &&
    /^[0-9a-f]{64}$/.test(state.planSha256));
  const expectedSnapshot = lib.buildSourceSnapshot(cwd, { baselineHead: null, declaredPaths: ['artifact.txt'] });
  check('fresh bootstrap authenticates prompt and baseline snapshot',
    journal.events[0].payload.promptEventHash === lib.sha256(Buffer.from(prompt)) &&
    expectedSnapshot.ok &&
    journal.events[0].payload.baselineSnapshotSha256 === expectedSnapshot.sha256);
  check('fresh bootstrap seals the exact plan baseline',
    journal.events[2].payload.planSha256 === state.planSha256 &&
    journal.events[2].payload.planPathBaselineSha256 ===
      lib.sha256(Buffer.from(lib.canonicalJson(journal.events[2].payload.planPathBaseline))));
  const missingPlan = fs.mkdtempSync(path.join(os.tmpdir(), 'glm-core-missing-plan-'));
  spawnSync(process.execPath, [path.join(ROOT, 'hooks', 'scripts', 'route-intent.js')], {
    input: JSON.stringify({ cwd: missingPlan, prompt }),
    encoding: 'utf8',
  });
  check('execution request without a plan does not bootstrap a core run',
    !lib.readState(missingPlan) && lib.readJournal(missingPlan).events.length === 0);
  const neutral = fs.mkdtempSync(path.join(os.tmpdir(), 'glm-core-neutral-'));
  spawnSync(process.execPath, [path.join(ROOT, 'hooks', 'scripts', 'route-intent.js')], {
    input: JSON.stringify({ cwd: neutral, prompt: 'explain the repository' }),
    encoding: 'utf8',
  });
  check('unmatched request does not bootstrap a core run',
    !lib.readState(neutral) && lib.readJournal(neutral).events.length === 0);
  const orphan = fs.mkdtempSync(path.join(os.tmpdir(), 'glm-core-orphan-'));
  fs.mkdirSync(path.join(orphan, 'docs', 'glm-hammer', 'plans'), { recursive: true });
  fs.writeFileSync(path.join(orphan, 'docs', 'glm-hammer', 'plans', 'approved.md'), '# Approved plan\n');
  lib.writeState(orphan, {
    schemaVersion: 1,
    phase: 'hammer',
    status: 'done',
    runId: '123e4567-e89b-42d3-a456-426614174099',
    generation: 0,
    generationStartMs: Date.now(),
  });
  spawnSync(process.execPath, [path.join(ROOT, 'hooks', 'scripts', 'route-intent.js')], {
    input: JSON.stringify({ cwd: orphan, prompt }),
    encoding: 'utf8',
  });
  check('mutable done state without terminal journal cannot bootstrap or self-authenticate',
    lib.readState(orphan).runId === '123e4567-e89b-42d3-a456-426614174099' &&
    lib.readJournal(orphan).events.length === 0);
  lib.appendJournalPayload(orphan, 'RUN_COMPLETED', '123e4567-e89b-42d3-a456-426614174099', 0, {
    planSha256: '0'.repeat(64),
    reviewSnapshotSha256: '0'.repeat(64),
  });
  spawnSync(process.execPath, [path.join(ROOT, 'hooks', 'scripts', 'route-intent.js')], {
    input: JSON.stringify({ cwd: orphan, prompt }),
    encoding: 'utf8',
  });
  check('orphan completion without ROUTER_ARMED cannot authorize renewal',
    lib.readState(orphan).runId === '123e4567-e89b-42d3-a456-426614174099' &&
    lib.readJournal(orphan).events.length === 1);
  fs.rmSync(missingPlan, { recursive: true, force: true });
  fs.rmSync(neutral, { recursive: true, force: true });
  fs.rmSync(orphan, { recursive: true, force: true });
  const terminal = lib.appendJournalPayload(cwd, 'RUN_COMPLETED', state.runId, 0, {
    planSha256: '0'.repeat(64),
    reviewSnapshotSha256: '0'.repeat(64),
  });
  const rerouted = spawnSync(process.execPath, [path.join(ROOT, 'hooks', 'scripts', 'route-intent.js')], {
    input: JSON.stringify({ cwd, prompt: 'implement the plan again' }),
    encoding: 'utf8',
  });
  const nextState = lib.readState(cwd);
  const nextJournal = lib.readJournal(cwd);
  check('completed core run rotates into a fresh authenticated run',
    terminal.ok && rerouted.status === 0 && nextState.runId !== state.runId &&
    nextJournal.events.slice(-3).every((event) => event.runId === nextState.runId) &&
    nextJournal.events.at(-3).type === 'ROUTER_ARMED' &&
    nextJournal.events.at(-2).type === 'PHASE_TRANSITIONED' &&
    nextJournal.events.at(-1).type === 'PLAN_PATH_BASELINE_RECORDED');
  fs.rmSync(cwd, { recursive: true, force: true });
}
// (core-runtime-positive) exercise real positive and adversarial forge/hammer Stop paths.
{
  const STOP = path.join(ROOT, 'hooks', 'scripts', 'stop-gate.js');
  const roleUuids = [
    '123e4567-e89b-42d3-a456-426614174101',
    '123e4567-e89b-42d3-a456-426614174102',
    '123e4567-e89b-42d3-a456-426614174103',
    '123e4567-e89b-42d3-a456-426614174104',
    '123e4567-e89b-42d3-a456-426614174105',
    '123e4567-e89b-42d3-a456-426614174106',
    '123e4567-e89b-42d3-a456-426614174107',
  ];
  function runStop(cwd) {
    return spawnSync(process.execPath, [STOP], { input: JSON.stringify({ cwd }), encoding: 'utf8' });
  }
  function coreFixture(phase) {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), `glm-core-${phase}-`));
    fs.mkdirSync(path.join(cwd, '.glm-hammer'), { recursive: true });
    fs.writeFileSync(path.join(cwd, 'README.md'), 'baseline\n');
    const planPath = 'docs/glm-hammer/plans/runtime.md';
    const absolutePlan = path.join(cwd, planPath);
    fs.mkdirSync(path.dirname(absolutePlan), { recursive: true });
    const plan = [
      '### Task 1: Runtime',
      '**Goal:** verify runtime',
      '**Dependencies:** None',
      '**Files:**',
      '- Modify: `README.md`',
      '**Acceptance Criteria:**',
      '- [ ] verified',
      '**Step 1:** verify',
      '',
    ].join('\n');
    fs.writeFileSync(absolutePlan, plan);
    const baseline = lib.capturePlanPathBaseline(cwd, ['README.md']);
    const planSha256 = lib.sha256(Buffer.from(plan));
    const runId = phase === 'forge'
      ? '123e4567-e89b-42d3-a456-426614174010'
      : '123e4567-e89b-42d3-a456-426614174020';
    const status = phase === 'forge' ? 'approved' : 'done';
    lib.writeState(cwd, {
      schemaVersion: 1, runId, generation: 0, generationStartMs: Date.now(),
      phase, status, plan: planPath, planSha256, baselineHead: null, declaredPaths: ['README.md'],
    });
    const routeHash = lib.sha256(Buffer.from(`${phase}-route`));
    lib.appendJournalPayload(cwd, 'ROUTER_ARMED', runId, 0, {
      baselineHead: null, baselineSnapshotSha256: routeHash, promptEventHash: routeHash,
    });
    lib.appendJournalPayload(cwd, 'PHASE_TRANSITIONED', runId, 0, {
      fromPhase: 'idle', fromStatus: 'idle', parentPhase: null, resumePhase: null,
      toPhase: phase, toStatus: status,
    });
    lib.appendJournalPayload(cwd, 'PLAN_PATH_BASELINE_RECORDED', runId, 0, {
      planPathBaseline: baseline.baseline,
      planPathBaselineSha256: baseline.sha256,
      planSha256,
    });
    return { cwd, runId, planPath, planSha256 };
  }
  function addDispatch(fixture, role, tail, verdict, dispatchId, sourceSnapshot) {
    const evidencePath = `.glm-hammer/evidence/${tail}`;
    const file = path.join(fixture.cwd, '.glm-hammer', 'evidence', ...tail.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const kind = role.endsWith('-critic') && role !== 'implementation-critic'
      ? ['FORGE_ROUND', '1']
      : role === 'validator' || role === 'implementation-critic'
        ? ['TASK_ID', '1']
        : ['REVIEW_KIND', role === 'security-reviewer' ? 'security' : 'qa'];
    const header = [
      'RECEIPT_VERSION: 1',
      `RUN_ID: ${fixture.runId}`,
      `ROLE: ${role}`,
      `EVIDENCE_PATH: ${evidencePath}`,
      `PLAN_SHA256: ${fixture.planSha256}`,
      'GENERATION: 0',
      `${kind[0]}: ${kind[1]}`,
      `DISPATCH_ID: ${dispatchId}`,
    ];
    if (sourceSnapshot) header.push(`SOURCE_SNAPSHOT_SHA256: ${sourceSnapshot.snapshotSha256}`);
    const body = `${header.join('\n')}\nCHECKS:\n- runtime evidence\nVERDICT: ${verdict}\n`;
    fs.writeFileSync(file, body);
    const stat = fs.statSync(file);
    const atMs = Math.max(fixture.generationStartMs || 0, Math.floor(stat.mtimeMs));
    const prompt = sourceSnapshot
      ? `Review ${evidencePath} at source snapshot ${sourceSnapshot.snapshotSha256}`
      : `Validate ${evidencePath}`;
    const toolInput = {
      role,
      description: prompt,
      prompt,
      evidencePath,
      dispatchId,
      invocationMs: atMs,
      completionMs: atMs,
    };
    if (sourceSnapshot) toolInput.sourceSnapshotSha256 = sourceSnapshot.snapshotSha256;
    const dispatched = spawnSync(process.execPath, [path.join(ROOT, 'hooks', 'scripts', 'dispatch-log.js')], {
      input: JSON.stringify({
        cwd: fixture.cwd,
        observedAtMs: atMs,
        tool_input: toolInput,
      }),
      encoding: 'utf8',
    });
    const appended = [...lib.readJournal(fixture.cwd).events].reverse().find((event) =>
      event.type === 'CORE_DISPATCH_COMPLETED' && event.payload.dispatchId === dispatchId);
    check(`core fixture records ${role} through PostToolUse provenance`, dispatched.status === 0 && appended,
      dispatched.stderr);
    check(`core ${role} provenance binds prompt, receipt, identity, and snapshot`,
      appended && appended.payload.evidencePath === evidencePath &&
      appended.payload.role === role &&
      appended.payload.receiptSha256 === lib.sha256(Buffer.from(body)) &&
      appended.payload.receiptSize === Buffer.byteLength(body) &&
      appended.payload.toolEventHash === lib.sha256(Buffer.from(lib.canonicalJson(toolInput))) &&
      appended.payload.sourceSnapshotSha256 === (sourceSnapshot ? sourceSnapshot.snapshotSha256 : null) &&
      appended.payload.invocationMs === atMs && appended.payload.completionMs === atMs &&
      appended.runId === fixture.runId && appended.generation === 0);
    return file;
  }

  const forge = coreFixture('forge');
  forge.generationStartMs = lib.readJournal(forge.cwd).events[0].atMs;
  ['feasibility-critic', 'integration-critic', 'coverage-critic'].forEach((role, index) => {
    addDispatch(forge, role, `critics/round-1/${role}.md`, 'APPROVE', roleUuids[index], null);
  });
  const forgePass = runStop(forge.cwd);
  check('real core forge Stop records verified completion', forgePass.stdout === '' &&
    lib.readJournal(forge.cwd).events.some((event) => event.type === 'RUN_COMPLETED'));
  const forgeState = lib.readState(forge.cwd);
  forgeState.status = 'done';
  lib.writeState(forge.cwd, forgeState);
  check('real core forge done bypass blocks', runStop(forge.cwd).stdout.includes('"decision":"block"'));
  forgeState.status = 'approved';
  forgeState.generation = 1;
  lib.writeState(forge.cwd, forgeState);
  check('real core stale generation blocks', runStop(forge.cwd).stdout.includes('"decision":"block"'));
  forgeState.generation = 0;
  lib.writeState(forge.cwd, forgeState);
  const forgedReceipt = path.join(forge.cwd, '.glm-hammer/evidence/critics/round-1/coverage-critic.md');
  fs.appendFileSync(forgedReceipt, 'tampered\n');
  check('real core forged receipt blocks', runStop(forge.cwd).stdout.includes('"decision":"block"'));
  fs.rmSync(forge.cwd, { recursive: true, force: true });

  const hammer = coreFixture('hammer');
  hammer.generationStartMs = lib.readJournal(hammer.cwd).events[0].atMs;
  const snapshot = lib.buildSourceSnapshot(hammer.cwd, { baselineHead: null, declaredPaths: ['README.md'] });
  const deniedReview = spawnSync(process.execPath, [path.join(ROOT, 'hooks', 'scripts', 'review-snapshot.js')], {
    input: JSON.stringify({
      cwd: hammer.cwd,
      tool_input: { role: 'security-reviewer', sourceSnapshotSha256: '0'.repeat(64), prompt: 'review stale snapshot' },
    }),
    encoding: 'utf8',
  });
  check('review dispatch with stale snapshot is denied before provenance is recorded',
    deniedReview.status === 2 && !lib.readJournal(hammer.cwd).events.some((event) => event.type === 'SOURCE_REVIEW_SNAPSHOT_RECORDED'));
  const snapshotDispatch = spawnSync(process.execPath, [path.join(ROOT, 'hooks', 'scripts', 'review-snapshot.js')], {
    input: JSON.stringify({
      cwd: hammer.cwd,
      tool_input: {
        role: 'security-reviewer',
        sourceSnapshotSha256: snapshot.sha256,
        prompt: `Review the frozen source snapshot ${snapshot.sha256}`,
      },
    }),
    encoding: 'utf8',
  });
  const snapshotEvent = [...lib.readJournal(hammer.cwd).events].reverse()
    .find((event) => event.type === 'SOURCE_REVIEW_SNAPSHOT_RECORDED');
  check('review snapshot is bound before dispatch', snapshotDispatch.status === 0 && snapshotEvent);
  const reviewSnapshot = { snapshotSha256: snapshot.sha256, atMs: snapshotEvent.atMs };
  addDispatch(hammer, 'validator', 'tasks/task-1/validator.md', 'PASS', roleUuids[3], null);
  addDispatch(hammer, 'implementation-critic', 'tasks/task-1/critic.md', 'APPROVE', roleUuids[4], null);
  addDispatch(hammer, 'security-reviewer', 'reviews/security.md', 'PASS', roleUuids[5], reviewSnapshot);
  addDispatch(hammer, 'qa-reviewer', 'reviews/qa.md', 'PASS', roleUuids[6], reviewSnapshot);
  const hammerPass = runStop(hammer.cwd);
  check('real core hammer Stop records snapshot-bound completion', hammerPass.stdout === '' &&
    lib.readJournal(hammer.cwd).events.some((event) => event.type === 'RUN_COMPLETED'), hammerPass.stdout);
  fs.writeFileSync(path.join(hammer.cwd, 'README.md'), 'mutated after review\n');
  check('real core post-snapshot mutation blocks', runStop(hammer.cwd).stdout.includes('"decision":"block"'));
  const refreshed = lib.buildSourceSnapshot(hammer.cwd, { baselineHead: null, declaredPaths: ['README.md'] });
  const refreshedDispatch = spawnSync(process.execPath, [path.join(ROOT, 'hooks', 'scripts', 'review-snapshot.js')], {
    input: JSON.stringify({
      cwd: hammer.cwd,
      tool_input: {
        role: 'security-reviewer',
        sourceSnapshotSha256: refreshed.sha256,
        prompt: `Review the refreshed source snapshot ${refreshed.sha256}`,
      },
    }),
    encoding: 'utf8',
  });
  const refreshedEvent = [...lib.readJournal(hammer.cwd).events].reverse()
    .find((event) => event.type === 'SOURCE_REVIEW_SNAPSHOT_RECORDED');
  const refreshedSnapshot = { snapshotSha256: refreshed.sha256, atMs: refreshedEvent.atMs };
  addDispatch(hammer, 'security-reviewer', 'reviews/security.md', 'PASS',
    '123e4567-e89b-42d3-a456-426614174108', refreshedSnapshot);
  addDispatch(hammer, 'qa-reviewer', 'reviews/qa.md', 'PASS',
    '123e4567-e89b-42d3-a456-426614174109', refreshedSnapshot);
  check('fresh snapshot and reviewer redispatch recover after source mutation',
    refreshedDispatch.status === 0 && runStop(hammer.cwd).stdout === '');
  fs.rmSync(hammer.cwd, { recursive: true, force: true });
}
process.exit(failures ? 1 : 0);
