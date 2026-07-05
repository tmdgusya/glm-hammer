# Plan: `crucible` — Storyline-Driven Design Token Skill

**Context Brief:** `docs/engineering-discipline/context/2026-07-05-crucible-design-skill-brief.md`

## Goal

Add a `crucible` skill to the glm-hammer plugin that turns a user's storyline/references into hook-gated W3C design tokens: multi-agent reference prospecting → token smelting → deterministic token validation + fidelity assay → a 2-designer critic panel with retry loops, producing a design spec that `forge` consumes.

## Architecture

`crucible` is a fourth top-level phase alongside `forge`/`blueprint`/`hammer`, reusing the existing three-line defense (content seal, dispatch ledger, receipt substance) from `hooks/scripts/lib.js`. A new `token-lib.js` holds deterministic W3C-token validation (schema, required groups, WCAG contrast) shared by a new PostToolUse hook (`token-gate.js`, the crucible analog of `plan-gate.js`) and a new `crucibleGate()` branch in `stop-gate.js`. Eight new agent profiles in `agents/` follow the existing binary-checklist + evidence-receipt format.

## Tech Stack

Node.js (CommonJS, zero dependencies — same as existing hooks), Markdown skill/agent definitions, JSON hook registration. No new runtime dependencies.

## Work Scope

- **In:** `skills/crucible/SKILL.md`; 8 agent profiles; `token-lib.js`; `token-gate.js`; `crucibleGate()` in `stop-gate.js`; `planKey()` extension in `lib.js`; crucible routing in `route-intent.js`; crucible resume lines in `session-start.js`; `hooks.json` registration; README + plugin.json documentation; a zero-dep test harness `tests/gates.test.js`.
- **Out:** changes to `forge`/`hammer`/`blueprint` skill files; `index.html` explainer update; image generation; any actual UI implementation; `dispatch-log.js` (its evidence-path extraction already matches any `.glm-hammer/evidence/...` path, including crucible's).

## Verification Strategy

- **Level:** test-suite (created by Task 1 of this plan — the repo currently has none)
- **Command:** `node tests/gates.test.js` (run from the repo root)
- **What passing proves:** every hook script parses (`node --check`), `hooks.json`/`plugin.json` are valid JSON, `validateTokens()` accepts a known-good token file and rejects missing-group / low-contrast fixtures, `validateSpec()` enforces required headings, `token-gate.js` reseals design files and resets approvals on edit, the `stop-gate.js` crucible branch blocks when receipts are missing and stays silent when all gates are green, and every authored artifact (8 agent profiles + SKILL.md) exists on disk.
- **Out of automated scope:** a live end-to-end crucible run and forge consuming a design spec are verified manually on first real use after merge — they require web access and interactive approval and cannot run in the zero-dep suite.

## Fixed Contracts (single source of truth for all tasks)

### C-1. Crucible state shape (`.glm-hammer/state.json`)

```json
{
  "phase": "crucible",
  "status": "prospecting | smelting | assay | critique | awaiting-user | approved",
  "design": "docs/glm-hammer/design/YYYY-MM-DD-<name>",
  "prospect": { "required": 5, "reported": 0 },
  "assay": { "verdict": "pending", "round": 1 },
  "panel": { "required": 2, "approved": 0, "round": 1, "verdicts": [] },
  "stopBlocks": 0
}
```

`assay.verdict` is `"pending"` or `"approve"`. `panel.verdicts` entries are `{ "critic": "harmony-critic", "verdict": "APPROVE|REJECT", "round": 1 }`.

### C-2. Evidence receipt paths (under `.glm-hammer/evidence/`)

| Receipt | Path | Kind | Requirement |
|---|---|---|---|
| Vein reader report | `design/prospect/vein-reader.md` | raw | ≥20 bytes |
| Prospector reports (4) | `design/prospect/<color\|type\|layout\|motion>-prospector.md` | raw | ≥20 bytes |
| Fidelity assay | `design/assay/round-<N>/fidelity-critic.md` | judge | ≥300 B, `CHECKS:` block, `VERDICT: APPROVE` |
| Designer panel (2) | `design/panel/round-<N>/<harmony\|rigor>-critic.md` | judge | ≥300 B, `CHECKS:` block, `VERDICT: APPROVE` |

Judge receipts are dispatch-backed via the existing `dispatch-log.js` (no changes needed).

### C-3. Design artifacts (in the `state.design` directory)

- `references.md` — curated reference list (orchestrator-written from prospect receipts)
- `tokens.json` — W3C design tokens (contract C-4)
- `design-spec.md` — must contain ALL of these exact headings: `## Story & Direction`, `## References`, `## Token Rationale`, `## Application Guide`, `## Fidelity Notes`

All three are content-sealed by `token-gate.js` on tracked writes; `tokens.json`/`design-spec.md` edits reset assay + panel approvals.

### C-4. tokens.json validation contract (implemented by `validateTokens()`)

1. File parses as JSON. Tokens are W3C-style: leaf objects with `$value` AND `$type` (every leaf must carry its own `$type`; group-level `$type` inheritance is NOT supported). Alias values `"{group.path}"` are resolved (max 10 hops, cycles are errors).
2. Required top-level groups: `color`, `typography`, `spacing`, `radius`. `motion` is optional. Other groups are allowed and only type-checked.
3. `color.text`, `color.surface`, `color.accent` subgroups each have ≥1 token; `color.text.default` and `color.surface.default` must exist.
4. Per-`$type` value checks (after alias resolution):
   - `color` → hex `#RGB`, `#RRGGBB`, or `#RRGGBBAA` (case-insensitive)
   - `dimension` → `/^-?\d+(\.\d+)?(px|rem|em|%)$/`
   - `duration` → `/^\d+(\.\d+)?m?s$/`
   - `cubicBezier` → array of exactly 4 numbers
   - `fontFamily` → string or non-empty array of strings
5. Group typing: every token under `typography.font` is `fontFamily` (≥1 token); every token under `typography.size` is `dimension` (≥3 tokens); every token under `spacing` is `dimension` (≥4 tokens); every token under `radius` is `dimension` (≥1); if `motion` exists, every token under `motion.duration` is `duration` and every token under `motion.easing` is `cubicBezier`.
6. WCAG contrast (alpha ignored, computed per WCAG 2.x relative luminance):
   - every `color.text.*` token vs `color.surface.default`: ≥3.0 if the token name matches `/muted|subtle|disabled|placeholder/i`, else ≥4.5
   - every `color.accent.*` token vs `color.surface.default`: ≥3.0

Return shape: `{ ok: boolean, problems: string[] }`.

### C-5. Known-good token fixture (used by tests; contrast values verified: `#1a1a1a`/`#faf7f2` ≈ 15.9, `#5f5f5f`/`#faf7f2` ≈ 6.0, `#b3541e`/`#faf7f2` ≈ 5.0)

```json
{
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
}
```

## File Structure Mapping

| Action | File | Anchor |
|---|---|---|
| Create | `tests/gates.test.js` | — |
| Create | `hooks/scripts/token-lib.js` | — |
| Modify | `hooks/scripts/lib.js` | `function planKey` |
| Create | `hooks/scripts/token-gate.js` | — |
| Modify | `hooks/hooks.json` | `"matcher": "Write|Edit|MultiEdit"` hooks array |
| Modify | `hooks/scripts/stop-gate.js` | `const CRITICS`, `function hammerGate`, the `state.phase === 'forge'` dispatch line |
| Modify | `hooks/scripts/route-intent.js` | `const workRequest`, `const executeIntent`, `let hint`, the `active` branch `bits` |
| Modify | `hooks/scripts/session-start.js` | `if (state.reviews)` lines block |
| Create | `agents/vein-reader.md`, `agents/color-prospector.md`, `agents/type-prospector.md`, `agents/layout-prospector.md`, `agents/motion-prospector.md` | — |
| Create | `agents/fidelity-critic.md`, `agents/harmony-critic.md`, `agents/rigor-critic.md` | — |
| Create | `skills/crucible/SKILL.md` | — |
| Modify | `README.md` | skills listing / workflow section |
| Modify | `.claude-plugin/plugin.json` | `description`, `keywords` |

Parallel tasks touch disjoint files (verified in the table above; `lib.js` only in Task 2, `stop-gate.js` only in Task 4, `hooks.json` only in Task 3).

---

## Tasks

### Task 1: Test harness `tests/gates.test.js`

**Goal:** Create the zero-dependency test suite that verifies hook syntax, token validation, token-gate resets, and the crucible stop-gate branch.
**Dependencies:** None (can run in parallel; the suite is EXPECTED to fail until Tasks 2–4 land — its own acceptance here is authoring + syntax only).
**Files:** Create `tests/gates.test.js`

**Acceptance Criteria:**
- [ ] `node --check tests/gates.test.js` exits 0
- [ ] The file contains test blocks covering exactly: (a) `node --check` over every `hooks/scripts/*.js`; (b) JSON.parse of `hooks/hooks.json` and `.claude-plugin/plugin.json`; (c) `validateTokens` accepts fixture C-5; (d) `validateTokens` rejects C-5 with `radius` deleted, with a problem string containing `radius`; (e) `validateTokens` rejects C-5 with `color.text.default.$value` set to `#8a8a8a`, with a problem string containing `contrast`; (f) `contrast('#000000', '#ffffff')` returns 21 (±0.01); (g) `validateSpec` rejects a spec missing `## Fidelity Notes`; (h) stop-gate crucible simulation blocks on missing fidelity receipt and stays silent when all receipts/seals/tokens are green; (i) token-gate simulation resets `panel.approved` to 0 after a tracked write to `tokens.json`; (j) `fs.existsSync` over the 8 `agents/*.md` profiles created by Tasks 6–7 and `skills/crucible/SKILL.md`
- [ ] The script exits non-zero iff any check failed

**Step 1:** Write `tests/gates.test.js` with this exact skeleton (fill the fixture from contract C-5 verbatim):

```js
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
for (const f of ['hooks/hooks.json', '.claude-plugin/plugin.json']) {
  let ok = true;
  try { JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); } catch { ok = false; }
  check(`${f} parses`, ok);
}

const { validateTokens, validateSpec, contrast } = require(path.join(ROOT, 'hooks', 'scripts', 'token-lib.js'));
const lib = require(path.join(ROOT, 'hooks', 'scripts', 'lib.js'));

const GOOD = /* contract C-5 fixture object, verbatim */;

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
```

**Step 2:** Run `node --check tests/gates.test.js` — expected output: exit 0, no stderr. (Do NOT run the suite itself yet; token-lib/token-gate/stop-gate branches do not exist until Tasks 2–4.)

### Task 2: `token-lib.js` + `planKey()` extension

**Goal:** Implement deterministic W3C token/spec validation (contract C-4) and extend the seal key so design artifacts get stable seal keys.
**Dependencies:** None
**Files:** Create `hooks/scripts/token-lib.js`; Modify `hooks/scripts/lib.js` (anchor: `function planKey`)

**Acceptance Criteria:**
- [ ] `node --check hooks/scripts/token-lib.js` exits 0
- [ ] The Step 3 contrast command prints a value within 0.01 of 21 (full fixture acceptance is proven by test (c) in Task 10)
- [ ] `planKey('C:\\x\\docs\\glm-hammer\\design\\2026-07-05-a\\tokens.json')` returns `'docs/glm-hammer/design/2026-07-05-a/tokens.json'` and plan paths keep their existing behavior (verify with the Step 4 command)
- [ ] `token-lib.js` exports exactly `{ validateTokens, validateSpec, contrast, flattenTokens, resolveTokenValue }`

**Step 1:** Create `hooks/scripts/token-lib.js`:

```js
'use strict';
// Deterministic design-token validation (contract shared by token-gate.js and
// stop-gate.js). Everything here must be decidable without model judgment:
// schema shape, required groups, value formats, WCAG contrast.
const fs = require('fs');

function isToken(node) {
  return !!node && typeof node === 'object' && !Array.isArray(node) && '$value' in node;
}

function flattenTokens(tree, prefix, out) {
  prefix = prefix || [];
  out = out || {};
  if (!tree || typeof tree !== 'object') return out;
  for (const [k, v] of Object.entries(tree)) {
    if (k.startsWith('$')) continue;
    if (isToken(v)) out[prefix.concat(k).join('.')] = v;
    else if (v && typeof v === 'object' && !Array.isArray(v)) flattenTokens(v, prefix.concat(k), out);
  }
  return out;
}

const ALIAS = /^\{([^}]+)\}$/;

function resolveTokenValue(tokens, name) {
  const seen = new Set([name]);
  let cur = tokens[name];
  for (let hops = 0; hops <= 10; hops++) {
    if (!cur) return undefined;
    const v = cur.$value;
    const m = typeof v === 'string' && v.match(ALIAS);
    if (!m) return v;
    const ref = m[1];
    if (seen.has(ref)) return undefined; // cycle
    seen.add(ref);
    cur = tokens[ref];
  }
  return undefined;
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const DIMENSION = /^-?\d+(\.\d+)?(px|rem|em|%)$/;
const DURATION = /^\d+(\.\d+)?m?s$/;

function hexToRgb(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16), // alpha (8-digit hex) intentionally ignored
  };
}

function channelLum(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channelLum(r) + 0.7152 * channelLum(g) + 0.0722 * channelLum(b);
}

function contrast(hexA, hexB) {
  const la = luminance(hexA);
  const lb = luminance(hexB);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function typeCheck(name, type, value, problems) {
  if (type === 'color') {
    if (typeof value !== 'string' || !HEX.test(value)) problems.push(`${name}: $type color must resolve to hex (#RGB/#RRGGBB/#RRGGBBAA), got ${JSON.stringify(value)}`);
  } else if (type === 'dimension') {
    if (typeof value !== 'string' || !DIMENSION.test(value)) problems.push(`${name}: $type dimension must match <number>px|rem|em|%, got ${JSON.stringify(value)}`);
  } else if (type === 'duration') {
    if (typeof value !== 'string' || !DURATION.test(value)) problems.push(`${name}: $type duration must match <number>ms|s, got ${JSON.stringify(value)}`);
  } else if (type === 'cubicBezier') {
    if (!Array.isArray(value) || value.length !== 4 || value.some((n) => typeof n !== 'number')) problems.push(`${name}: $type cubicBezier must be an array of 4 numbers`);
  } else if (type === 'fontFamily') {
    const ok = typeof value === 'string' || (Array.isArray(value) && value.length > 0 && value.every((s) => typeof s === 'string'));
    if (!ok) problems.push(`${name}: $type fontFamily must be a string or non-empty string array`);
  }
}

function groupTokens(tokens, prefix) {
  return Object.keys(tokens).filter((n) => n.startsWith(prefix + '.'));
}

function validateTokens(tokensPath) {
  const problems = [];
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
  } catch (e) {
    return { ok: false, problems: [`tokens.json missing or invalid JSON: ${e.message}`] };
  }
  const tokens = flattenTokens(doc);

  for (const g of ['color', 'typography', 'spacing', 'radius']) {
    if (!doc[g] || typeof doc[g] !== 'object') problems.push(`required top-level group missing: ${g}`);
  }
  for (const sub of ['color.text', 'color.surface', 'color.accent']) {
    if (groupTokens(tokens, sub).length < 1) problems.push(`required subgroup has no tokens: ${sub}`);
  }
  for (const req of ['color.text.default', 'color.surface.default']) {
    if (!tokens[req]) problems.push(`required token missing: ${req}`);
  }

  for (const [name, t] of Object.entries(tokens)) {
    if (!t.$type) {
      problems.push(`${name}: every token must carry its own $type (group inheritance unsupported)`);
      continue;
    }
    const value = resolveTokenValue(tokens, name);
    if (value === undefined) {
      problems.push(`${name}: alias does not resolve (missing target or cycle)`);
      continue;
    }
    typeCheck(name, t.$type, value, problems);
  }

  const expectType = (prefix, type, min) => {
    const names = groupTokens(tokens, prefix);
    if (min && names.length < min) problems.push(`${prefix} needs at least ${min} token(s), found ${names.length}`);
    for (const n of names) {
      if (tokens[n].$type !== type) problems.push(`${n}: tokens under ${prefix} must be $type ${type}`);
    }
  };
  expectType('typography.font', 'fontFamily', 1);
  expectType('typography.size', 'dimension', 3);
  expectType('spacing', 'dimension', 4);
  expectType('radius', 'dimension', 1);
  if (doc.motion) {
    expectType('motion.duration', 'duration', 0);
    expectType('motion.easing', 'cubicBezier', 0);
  }

  const surface = resolveTokenValue(tokens, 'color.surface.default');
  if (typeof surface === 'string' && HEX.test(surface)) {
    const pairRule = (prefix, minDefault) => {
      for (const n of groupTokens(tokens, prefix)) {
        const v = resolveTokenValue(tokens, n);
        if (typeof v !== 'string' || !HEX.test(v)) continue; // format problem already reported
        const min = /muted|subtle|disabled|placeholder/i.test(n) ? 3.0 : minDefault;
        const ratio = contrast(v, surface);
        if (ratio < min) problems.push(`${n}: contrast vs color.surface.default is ${ratio.toFixed(2)}:1, below the required ${min}:1`);
      }
    };
    pairRule('color.text', 4.5);
    pairRule('color.accent', 3.0);
  }

  return { ok: problems.length === 0, problems };
}

const SPEC_HEADINGS = ['## Story & Direction', '## References', '## Token Rationale', '## Application Guide', '## Fidelity Notes'];

function validateSpec(specPath) {
  let body;
  try {
    body = fs.readFileSync(specPath, 'utf8');
  } catch (e) {
    return { ok: false, problems: [`design-spec.md missing: ${e.message}`] };
  }
  const problems = SPEC_HEADINGS.filter((h) => !body.includes(h)).map((h) => `design-spec.md missing required heading: ${h}`);
  return { ok: problems.length === 0, problems };
}

module.exports = { validateTokens, validateSpec, contrast, flattenTokens, resolveTokenValue };
```

**Step 2:** In `hooks/scripts/lib.js`, replace the body of `planKey` so design artifacts also get repo-relative seal keys:

```js
function planKey(p) {
  const n = String(p).replace(/\\/g, '/');
  const m = n.match(/docs\/glm-hammer\/(?:plans\/[^/]+\.md|design\/[^/]+\/[^/]+\.(?:md|json))$/i);
  return (m ? m[0] : n).toLowerCase();
}
```

**Step 3:** Verify the contrast math (from repo root; full fixture acceptance runs in Task 10):

```
node -e "const{contrast}=require('./hooks/scripts/token-lib');console.log(contrast('#000000','#ffffff'))"
```

Expected output: `21` (a value within 0.01 of 21).

**Step 4:** Verify `planKey`:

```
node -e "const{planKey}=require('./hooks/scripts/lib');console.log(planKey('C:\\x\\docs\\glm-hammer\\design\\2026-07-05-a\\tokens.json'));console.log(planKey('C:\\x\\docs\\glm-hammer\\plans\\2026-07-05-b.md'))"
```

Expected output: `docs/glm-hammer/design/2026-07-05-a/tokens.json` then `docs/glm-hammer/plans/2026-07-05-b.md`.

### Task 3: `token-gate.js` + hook registration

**Goal:** Reseal design artifacts on tracked writes, reset assay/panel approvals when tokens or spec change, and surface deterministic token problems same-turn.
**Dependencies:** Task 2
**Files:** Create `hooks/scripts/token-gate.js`; Modify `hooks/hooks.json` (anchor: the `"matcher": "Write|Edit|MultiEdit"` hooks array)

**Acceptance Criteria:**
- [ ] `node --check hooks/scripts/token-gate.js` exits 0
- [ ] `hooks/hooks.json` parses and its `Write|Edit|MultiEdit` matcher lists `token-gate.js` after `plan-gate.js`
- [ ] Piping `{"cwd":"<tmp>","tool_input":{"file_path":"<tmp>/docs/glm-hammer/design/x/tokens.json"}}` into the script with a crucible state where `panel.approved: 2` leaves state with `panel.approved: 0`, `assay.verdict: "pending"`, `status: "smelting"` (this exact scenario is test (i) in `tests/gates.test.js`)

**Step 1:** Create `hooks/scripts/token-gate.js`:

```js
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
```

**Step 2:** In `hooks/hooks.json`, insert this object into the `"matcher": "Write|Edit|MultiEdit"` hooks array, directly after the `plan-gate.js` entry:

```json
{
  "type": "process",
  "command": "node",
  "args": ["${CLAUDE_PLUGIN_ROOT}/hooks/scripts/token-gate.js"],
  "timeoutMs": 10000,
  "statusMessage": "(glm-hammer) Design token gate"
}
```

**Step 3:** Run `node --check hooks/scripts/token-gate.js` (expect exit 0) and `node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8'));console.log('ok')"` (expect `ok`).

### Task 4: `crucibleGate()` in `stop-gate.js`

**Goal:** Block turn completion during a crucible run until prospect receipts, valid sealed artifacts, the fidelity assay receipt, and both panel receipts are all on disk and dispatch-backed.
**Dependencies:** Task 2
**Files:** Modify `hooks/scripts/stop-gate.js` (anchors: `const CRITICS`, `function hammerGate`, the phase-dispatch lines in the main `try` block)

**Acceptance Criteria:**
- [ ] `node --check hooks/scripts/stop-gate.js` exits 0
- [ ] With a green crucible fixture (test (h) in `tests/gates.test.js`), stop-gate stdout contains no `"block"`
- [ ] Deleting the fidelity receipt from the same fixture makes stop-gate stdout contain `"decision":"block"` (also test (h))
- [ ] Existing forge/hammer behavior untouched: the only edits are the additions listed in Steps 1–3

**Step 1:** Add imports and constants. Extend the existing `require('./lib')` destructuring — it already imports `sealMatches`; no change needed there. Below `const CRITICS = [...]`, add:

```js
const { validateTokens, validateSpec } = require('./token-lib');
const PROSPECT_REPORTS = [
  'vein-reader',
  'color-prospector',
  'type-prospector',
  'layout-prospector',
  'motion-prospector',
];
const CRUCIBLE_PANEL = ['harmony-critic', 'rigor-critic'];
```

**Step 2:** Add `crucibleGate` directly above `function hammerGate`:

```js
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
```

**Step 3:** In the main `try` block, extend the phase dispatch:

```js
  let reason = null;
  if (state.phase === 'forge' && state.status !== 'done') reason = forgeGate(cwd, state);
  else if (state.phase === 'crucible' && state.status !== 'done') reason = crucibleGate(cwd, state);
  else if (state.phase === 'hammer') reason = hammerGate(cwd, state); // "done" is re-verified against receipts
```

**Step 4:** Run `node --check hooks/scripts/stop-gate.js` — expect exit 0.

### Task 5: Routing and resume support

**Goal:** Route design-shaped requests to `crucible` and make session resume/prompt reminders show crucible progress.
**Dependencies:** None
**Files:** Modify `hooks/scripts/route-intent.js` (anchors: `const workRequest`, `let hint`, the `active` branch `bits`); Modify `hooks/scripts/session-start.js` (anchor: the `if (state.reviews)` lines block)

**Acceptance Criteria:**
- [ ] `node --check` exits 0 on both files
- [ ] `route-intent.js` `workRequest` regex additionally matches `디자인` and `design`
- [ ] A prompt like "이 스토리 무드로 디자인 토큰 만들어줘" (idle state) yields a hint containing `crucible`
- [ ] The default routing hint mentions crucible for design requests
- [ ] With an active crucible state, both scripts emit `prospect`, `assay`, and `panel` progress bits

**Step 1:** In `route-intent.js`, extend `workRequest` — replace `리팩터|리팩토링` context word list by adding `디자인` and add `design` on the English side (insert `디자인|` after `설계|` and `design|` after `redesign|`).

**Step 2:** Below `executeIntent`/`strongMarker`, add:

```js
  const designIntent =
    /(디자인|무드|룩\s*앤\s*필|브랜딩|비주얼|스타일\s*가이드|디자인\s*토큰|리디자인|design\s*tokens?|style\s*guide|visual\s*identity|look\s*and\s*feel|branding|mood)/i;
```

**Step 3:** Change the hint chain to check design intent after execute intent:

```js
  let hint;
  if (executeIntent.test(prompt) && plansDirHasFiles) {
    hint = 'This looks like a request to execute an existing plan → invoke the `hammer` skill.';
  } else if (designIntent.test(prompt)) {
    hint =
      'This looks like a storyline/reference-driven design request → invoke the `crucible` skill ' +
      '(reference prospecting → design tokens → fidelity assay → designer panel) before any planning or implementation.';
  } else if (strongMarker.test(prompt)) {
```

and extend the default hint's routing list by inserting, before the blueprint clause: `storyline/mood/design-token work → \`crucible\` skill; `.

**Step 4:** In the `active` branch of `route-intent.js`, after the `state.critics` bits block, add:

```js
    if (state.prospect && state.prospect.required) {
      bits.push(`prospect ${state.prospect.reported || 0}/${state.prospect.required}`);
    }
    if (state.assay) {
      bits.push(`assay ${state.assay.verdict || 'pending'} (round ${state.assay.round || 1})`);
    }
    if (state.panel && state.panel.required) {
      bits.push(`panel ${state.panel.approved || 0}/${state.panel.required} (round ${state.panel.round || 1})`);
    }
```

**Step 5:** In `session-start.js`, after the `if (state.reviews)` block, add:

```js
  if (state.prospect && state.prospect.required) {
    lines.push(`prospect: ${state.prospect.reported || 0}/${state.prospect.required} reports`);
  }
  if (state.assay) {
    lines.push(`assay: ${state.assay.verdict || 'pending'} (round ${state.assay.round || 1})`);
  }
  if (state.panel && state.panel.required) {
    lines.push(`panel: ${state.panel.approved || 0}/${state.panel.required} APPROVE (round ${state.panel.round || 1})`);
  }
```

**Step 6:** Run `node --check hooks/scripts/route-intent.js` and `node --check hooks/scripts/session-start.js` — both exit 0.

### Task 6: Prospecting agent profiles (5 files)

**Goal:** Author the vein-reader and the four dimension prospectors as fixed-profile agents matching the existing `agents/*.md` format.
**Dependencies:** None
**Files:** Create `agents/vein-reader.md`, `agents/color-prospector.md`, `agents/type-prospector.md`, `agents/layout-prospector.md`, `agents/motion-prospector.md`

**Acceptance Criteria:**
- [ ] Every file has YAML frontmatter with `name` (matching its filename), `description` (stating panel role and when dispatched), and `tools: ["Read", "Grep", "Glob", "Bash", "WebSearch", "WebFetch"]`
- [ ] `agents/vein-reader.md` requires a **Direction Brief** with exactly these labeled fields: `Mood keywords` (5–8 items), `Era / genre`, `Texture & material`, `Color stance` (temperature + saturation), `Typography voice`, `Motion character`, `Anti-references` (things to avoid)
- [ ] Each prospector file requires ≥3 references, and for EACH reference exactly these labeled fields: `Name/URL`, `What to take` (dimension-specific), `Concrete values` (hex palette for color / font stacks + scale for type / grid + spacing rhythm for layout / durations + easing for motion), `Fit` (one line tying it to the Direction Brief)
- [ ] Every file ends with an **Evidence Receipt (mandatory)** section instructing the agent to write its FULL report to the evidence path given in its prompt via Bash and end its final message with `EVIDENCE_RECORDED: <path>`
- [ ] No file instructs the agent to edit project files (read + web + receipt write only)

**Step 1:** Write `agents/vein-reader.md`. Role paragraph: "You are the **vein reader** — the crucible run's first dispatch. You receive the user's storyline/references verbatim and translate narrative into a design direction other agents can prospect against. You do not pick tokens; you name the vein." Method: read any user-provided URLs with WebFetch; extract the story's emotional register; produce the Direction Brief fields listed in the acceptance criteria; every field must cite which part of the storyline motivated it. Output format block showing the Direction Brief skeleton. Evidence Receipt section (wording adapted from `agents/feasibility-critic.md`).

**Step 2:** Write the four prospector files. Shared structure, per-dimension focus:
- `color-prospector`: hunts palettes — for each reference report dominant/surface/accent hexes (extract from the reference's visuals or published brand guides via WebFetch/WebSearch)
- `type-prospector`: hunts typography — font families/pairings, scale ratios, weight usage
- `layout-prospector`: hunts spatial systems — grid, spacing rhythm, corner radius language, density
- `motion-prospector`: hunts motion — durations, easing character, what animates and what never does

Each: receives the Direction Brief content and the user's storyline in its prompt; must find ≥3 references (WebSearch for real sites/products/design systems; user-provided references count as one each when relevant); reports the per-reference labeled fields from the acceptance criteria; flags any Direction Brief field its dimension cannot honor. Evidence Receipt section identical in mechanism to vein-reader.

### Task 7: Judge agent profiles (3 files)

**Goal:** Author fidelity-critic (assay) and the two-designer panel (harmony-critic, rigor-critic) with fixed binary checklists, matching the existing critic format.
**Dependencies:** None
**Files:** Create `agents/fidelity-critic.md`, `agents/harmony-critic.md`, `agents/rigor-critic.md`

**Acceptance Criteria:**
- [ ] Every file has frontmatter (`name` matching filename, `description`, `tools: ["Read", "Grep", "Glob", "Bash"]`), a Method section, a **Verdict — Binary Checklist** section with EXACTLY the checks listed below (IDs and substance preserved; wording may be polished), the mechanical-verdict rule ("APPROVE iff every check is YES or N/A; any NO → REJECT with a matching REJECT-level finding; unverified = NO"), the `CHECKS:`/`VERDICT:`/`FINDINGS:` output template, and the Evidence Receipt section ending with `EVIDENCE_RECORDED: <path>`
- [ ] `fidelity-critic.md` checks: **F1** every `color.*` token's value traces to a specific reference or Direction Brief line in design-spec.md's Token Rationale; **F2** typography tokens are consistent with the type-prospector's references or the Direction Brief's typography voice; **F3** spacing/radius/motion tokens are consistent with the layout/motion prospectors' references; **F4** every reference named in design-spec.md's `## References` appears in a prospect receipt or the user's own input (no invented references); **F5** no token contradicts the Direction Brief's Anti-references; **F6** the Token Rationale covers every top-level token group
- [ ] `harmony-critic.md` (persona: a picky art-director) checks: **H1** the palette forms a coherent temperature/saturation family consistent with the Direction Brief's Color stance (inspect actual hex values); **H2** the font pairing and size scale express the Typography voice; **H3** spacing and radius values form a coherent rhythm (consistent ratios; any outlier is explained in the Token Rationale); **H4** motion tokens (if present) match the Motion character; **H5** the Application Guide demonstrates the story in ≥3 concrete component treatments; **H6** nothing in tokens.json visually clashes with the references cited for it
- [ ] `rigor-critic.md` (persona: a picky design-systems engineer) checks: **R1** token naming is consistent (one case convention, no synonyms for the same concept); **R2** spot-recompute contrast for at least `color.text.default` and one accent against `color.surface.default` and confirm the required ratios hold; **R3** the scale is complete for real UI (text sizes cover body/heading/caption; spacing covers component gap, section gap, and page gutter — as named or documented in the Application Guide); **R4** aliases resolve and no two tokens hold identical values without a stated reason; **R5** every token name referenced in the Application Guide exists in tokens.json; **R6** design-spec.md states a dark-mode stance (even if "out of scope")
- [ ] Both panel critics' descriptions state they sit on the crucible design panel (seat 1 of 2 / seat 2 of 2); fidelity-critic's states it is the assay judge dispatched between smelting and the panel

**Step 1:** Write `agents/fidelity-critic.md` using `agents/feasibility-critic.md` as the structural template. Inputs named in the role paragraph: the design directory path, the prospect receipt paths, the original user request verbatim, and its evidence output path. It must Read tokens.json, design-spec.md, references.md, and the prospect receipts before answering any check.

**Step 2:** Write `agents/harmony-critic.md` and `agents/rigor-critic.md` with the same structure; both receive the design directory path, the vein-reader receipt path, the original user request verbatim, and their evidence output paths. Personas are exacting but bound by the mechanical-verdict rule: "Do not reject for taste alone — every NO must point at a check."

### Task 8: `skills/crucible/SKILL.md`

**Goal:** Author the crucible skill definition orchestrating prospect → smelt → assay → critique → handoff with hook-enforced gates.
**Dependencies:** None (contracts pinned in this plan)
**Files:** Create `skills/crucible/SKILL.md`

**Acceptance Criteria:**
- [ ] Frontmatter: `name: crucible`; `description` covers triggers: storyline/reference-driven design requests, design tokens, mood/visual identity, "디자인", "무드", "스토리", "레퍼런스", "design tokens", "style guide" — and says hooks enforce the gates
- [ ] Contains a **State Protocol** section with the exact JSON shape from contract C-1 and the rules: set `awaiting-user` before ending a turn that needs an answer; never set `approved` unless assay is `approve` AND `panel.approved >= panel.required` in the current round with receipts on disk
- [ ] Contains **Hard Gates (hook-enforced)** covering: prospect receipts required; tokens.json/design-spec.md written via Write/Edit only (content-sealed; Bash edits break the seal and void approvals); deterministic token validation (summarize contract C-4 requirements incl. required groups and contrast thresholds); assay receipt gate; panel receipt gate with edit-triggered resets; dispatch-backed receipts; no placeholder tokens (every token traceable to a reference or the Direction Brief)
- [ ] Process phases in order, each with a ⟨state⟩ marker: **Phase A Prospecting** (`prospecting`) — dispatch `vein-reader` first with the storyline verbatim + its evidence path; then dispatch the 4 prospectors IN PARALLEL, each receiving the Direction Brief content, the user's own references, and its evidence path; then curate `references.md`. **Phase B Smelting** (`smelting`) — create the design dir `docs/glm-hammer/design/YYYY-MM-DD-<name>/`, write `tokens.json` and `design-spec.md` (with the 5 required headings from contract C-3) via Write. **Phase C Assay** (`assay`) — dispatch `fidelity-critic`; REJECT → revise tokens (token-gate resets approvals), increment `assay.round`, re-dispatch. **Phase D Critique** (`critique`) — dispatch `harmony-critic` + `rigor-critic` IN PARALLEL; verify each receipt exists and matches before recording verdicts in state; any REJECT → revise, which voids the assay too → return to Phase C, increment `panel.round`; round > 3 → present deadlock ⟨awaiting-user⟩. **Phase E Present & Hand Off** (`awaiting-user` → `approved`) — compact summary (direction, reference count, token group counts, rounds survived), ask ONE question: "이 디자인으로 forge를 진행할까요?"; on yes → set status `approved`, then invoke the `forge` skill with the design directory as declared input (forge's plan must list `design-spec.md` + `tokens.json` as inputs and hammer implements against them); if the user declines the handoff (design-only run), set status `done` so the resume/router hooks stop treating the run as active
- [ ] Includes the critic-dispatch fallback sentence (if the runtime doesn't expose named agent types, read `agents/<name>.md` and inline it into a general-purpose subagent), mirroring forge's wording
- [ ] Includes an **Anti-Patterns** table with at least: asking the user for direction before the vein-reader/prospectors return; inventing references no prospector reported; hand-tuning tokens after panel approval without re-running assay+panel; treating contrast failures as advisory; writing tokens.json via Bash redirection; softening the Direction Brief to make the panel approve
- [ ] The blacksmith narrative frames the doc: prospect the ore, smelt in the crucible, assay the alloy, then send it to the forge

**Step 1:** Write the file following `skills/forge/SKILL.md`'s structure (Core Principle → Hard Gates → State Protocol → Process → Anti-Patterns), with the content pinned above.

### Task 9: Documentation — README + plugin manifest

**Goal:** Document crucible as the design entry point in the plugin's README and manifest.
**Dependencies:** None
**Files:** Modify `README.md`; Modify `.claude-plugin/plugin.json` (anchors: `description`, `keywords`)

**Acceptance Criteria:**
- [ ] README gains a heading whose text contains `crucible`, and under it: the chain `crucible → forge → hammer`, the gates (token-gate, fidelity assay, 2-designer panel), and the artifact path `docs/glm-hammer/design/` — written in the same language/tone as the existing skill sections
- [ ] `plugin.json` `description` mentions the design-token stage; `keywords` gains `"design-tokens"` and `"design"`
- [ ] `node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json','utf8'));console.log('ok')"` prints `ok`

**Step 1:** Read README.md, add a crucible section mirroring the existing skill sections (Korean, matching tone), and update any workflow/flow list to show crucible as the optional design stage before forge.

**Step 2:** Update `plugin.json` description to: `"Forge-and-hammer engineering harness: storyline-driven design tokens verified by a designer panel (crucible), recon-first strong planning verified by a 3-critic panel, and a worker-validator-critic implementation loop with security/QA review gates enforced by hooks."` and extend keywords with `"design"` and `"design-tokens"`.

### Task 10: Final Verification

**Goal:** Prove the whole change set with the Verification Strategy command.
**Dependencies:** Tasks 1–9
**Files:** None (runs commands only)

**Acceptance Criteria:**
- [ ] `node tests/gates.test.js` exits 0 with every line prefixed `ok`
- [ ] `git status --porcelain` shows only the files listed in the File Structure Mapping (plus this plan and the context brief)

**Step 1:** Run `node tests/gates.test.js` from the repo root. Expected: all `ok` lines, exit code 0.

**Step 2:** Run `git status --porcelain` and compare against the File Structure Mapping table.

### Task 11: Fail closed on non-object tokens.json (QA fix task)

**Goal:** Reject non-object tokens.json documents in `validateTokens` so the crucible gates fail closed instead of crashing into the hooks' silent fail-open path.
**Dependencies:** Task 2
**Files:** Modify `hooks/scripts/token-lib.js` (anchor: `function validateTokens`); Modify `tests/gates.test.js` (anchor: the low-contrast test block and the `stop-gate silent when crucible gates are green` check)

**Acceptance Criteria:**
- [ ] For each of the documents `null`, `[]`, `123`, `"str"`, `true` written as the full content of a tokens.json file, `validateTokens` RETURNS (does not throw) `{ ok: false, problems: [...] }` with a problem string matching `/object/i`
- [ ] `tests/gates.test.js` gains checks named `validateTokens rejects non-object <doc>` for all five documents, and an end-to-end check `stop-gate blocks on non-object tokens.json` (crucible green fixture with tokens.json overwritten to `null` and resealed → stdout contains `"block"`), with the good tokens.json restored and resealed afterward so subsequent checks still pass
- [ ] `node tests/gates.test.js` exits 0 with every line `ok` (38 checks: the original 32 plus the six new ones)

**Step 1:** In `hooks/scripts/token-lib.js`, inside `validateTokens`, directly after the `try { doc = JSON.parse(...) } catch { ... }` block, add:

```js
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    return { ok: false, problems: ['tokens.json must be a JSON object of token groups (got ' + (doc === null ? 'null' : Array.isArray(doc) ? 'an array' : typeof doc) + ')'] };
  }
```

**Step 2:** In `tests/gates.test.js`, directly after the low-contrast rejection check (test (e)), add:

```js
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
```

**Step 3:** In `tests/gates.test.js`, directly after the `stop-gate silent when crucible gates are green` check, add:

```js
// (h2) non-object tokens.json fails CLOSED at the stop gate
fs.writeFileSync(path.join(designAbs, 'tokens.json'), 'null');
lib.writeSeal(proj, path.join(designAbs, 'tokens.json'));
lib.writeState(proj, greenState);
check('stop-gate blocks on non-object tokens.json', runStopGate().indexOf('"block"') !== -1);
fs.writeFileSync(path.join(designAbs, 'tokens.json'), JSON.stringify(GOOD, null, 2));
lib.writeSeal(proj, path.join(designAbs, 'tokens.json'));
```

**Step 4:** Run `node tests/gates.test.js` — expected: 38 lines, all `ok`, exit 0.

## Plan Amendment Log

- **2026-07-05 (hammer, review phase):** QA review returned FAIL with one blocking finding — `validateTokens` throws a TypeError on non-object JSON documents (e.g. a tokens.json containing `null`), and the hooks' outer catch converts the crash into a silent fail-open that bypasses every crucible gate. Added Task 11 (fix + regression tests) per the review-failure protocol; tasks.total 10 → 11. No acceptance criteria of existing tasks were weakened.
