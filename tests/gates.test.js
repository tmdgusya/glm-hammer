'use strict';
// Zero-dep smoke tests for glm-hammer hook gates. Run from repo root: node tests/gates.test.js
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
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
for (const f of ['hooks/hooks.json', '.zcode-plugin/plugin.json']) {
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
  'skills/crucible/SKILL.md',
]) {
  check(`${f} exists`, fs.existsSync(path.join(ROOT, f)));
}

process.exit(failures ? 1 : 0);
