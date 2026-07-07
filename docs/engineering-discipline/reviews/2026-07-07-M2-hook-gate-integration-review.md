# Review: M2 — Hook & Gate Integration (§0 전체 계약)

**Date:** 2026-07-07
**Reviewer:** review-work agent (information-isolated — verified from scratch against plan + frozen contract)
**Plan:** `docs/engineering-discipline/plans/2026-07-07-M2-hook-gate-integration.md`
**Milestone:** `docs/engineering-discipline/harness/pptxx-skill/milestones/M2-hook-gate-integration.md`
**Contract:** `docs/engineering-discipline/harness/pptxx-skill/planning/draft-v4.md` §0 (frozen)

All results below were produced by running the commands myself; no checkbox notes were trusted.

## Per-Criterion Verification

| # | Criterion | Method | Result | Evidence |
|---|---|---|---|---|
| 1 | `node tests/gates.test.js` exits 0 | Ran from repo root | **Met** | Exit 0; **73 ok / 0 FAIL**. 39 pre-existing checks + 34 new (30 pptxx scenario checks ⓐ–ⓟ + 4 planKey unit checks) |
| 2 | Diff surface = 5 files only | `git diff --stat`, `git status --porcelain` | **Met** | Modified: `hooks/hooks.json` (+7), `hooks/scripts/lib.js` (+1/−1), `hooks/scripts/stop-gate.js` (+158), `tests/gates.test.js` (+383/−0). New untracked: `hooks/scripts/deck-gate.js`. Untracked `docs/engineering-discipline/**` belongs to the concurrent planning/review milestone — out of M2 scope. No `skills/` or `agents/` changes |
| 3 | `route-intent.js` untouched | `git diff -- hooks/scripts/route-intent.js \| wc -l` | **Met** | 0 lines |
| 4 | Existing test assertions unmodified (append-only) | `git diff --numstat -- tests/gates.test.js`; grep for removed lines | **Met** | 383 added, **0 removed**; the diff is a pure `+` block appended after the (j) section. All 39 pre-existing checks still pass by name |
| 5 | Milestone scenario list ⓐ–ⓟ each has a real assertion | Read every new check in `tests/gates.test.js:198–579` against actual gate behavior | **Met** | See scenario table below — no vacuous assertions found |
| 6 | Fabricated receipts follow JUDGE_BODY idiom | Read test code | **Met** | `JUDGE_BODY` (`tests/gates.test.js:118`) reused for all judge receipts; `JUDGE_REJECT = JUDGE_BODY.replace('VERDICT: APPROVE', 'VERDICT: REJECT')` (:266) |
| 7 | ⓛ seeds dispatch.jsonl | Read (l1)/(l2) (:446–463) | **Met** | (l1) seeds `{"paths":["deck/visual-qa/round-1/visual-qa-critic.md"]}` → pass; (l2) seeds a *different* tail (ledger non-empty → enforcement active) → asserts block **and** `/dispatch/i` in reason |
| 8 | ⓚ asserts both bumped AND un-bumped round | Read (k1)/(k2) (:420–431) | **Met** | (k1): `st1.visualQa.round === 2 && st1.imagePanel.round === 1`; (k2): `st2.imagePanel.round === 2 && st2.visualQa.round === 2` |
| 9 | hooks.json parses; deck-gate entry; env var | `node -e JSON.parse(...)` (via suite check "hooks/hooks.json parses"); grep | **Met** | `deck-gate.js` count 1, under the `"Write\|Edit\|MultiEdit"` matcher (hooks.json:31, entry :50), `${ZCODE_PLUGIN_ROOT}`; `CLAUDE_PLUGIN_ROOT` count 0 |
| 10 | Hook-code style | Read `deck-gate.js` in full; grep | **Met** | `'use strict'` ✓, CommonJS `require('./lib')` ✓ (no `node:` prefix, no external deps), top-level try/catch → `process.exit(0)` fail-open ✓. Stdout schema: deck-gate uses `emitContext` only (`additionalContext`, 3 sites; `emit({decision` count 0); stop-gate emits only `{decision:'block', reason}` |
| 11 | State mutation via `writeState` only | grep `writeFileSync` in deck-gate.js | **Met** | deck-gate writes state exclusively via `writeState(cwd, state)` (deck-gate.js:148); seals via `writeSeal` (atomic tmp+rename in lib.js) |
| 12 | Plan acceptance greps | Ran each grep from the plan | **Met** | `DIAGRAM_MARKER` count 2; `function pptxxGate` count 1; `phase === 'pptxx'` count 1; `stopBlocks cap` comment count 1 (tests/gates.test.js:304) |

### Milestone Success Criteria (binary)

| Milestone criterion | Verdict |
|---|---|
| Suite passes with all §0 scenarios ⓐ–ⓟ (fabricated JUDGE_BODY receipts) | **Met** — all 30 named checks present and green (run output) |
| planKey unit assertions (abs backslash == rel forward; decks `.md`/`.html` only) | **Met** — 4 checks green; `lib.js:78` regex adds `decks/[^/]+/[^/]+\.(?:md\|html)` alternation only |
| Existing assertions pass unmodified (no crucible/forge/hammer regression) | **Met** — append-only diff; 0 removed lines in `stop-gate.js` pre-existing sections (`git diff -U0` shows no `-` lines; pptxxGate + one dispatch line are pure additions) |
| hooks.json parses, `${ZCODE_PLUGIN_ROOT}`, no `CLAUDE_PLUGIN_ROOT`, route-intent diff 0 | **Met** — see rows 3 and 9 |

## §0 Conformance Findings (line-by-line vs draft-v4 §0)

- **Schema field names** — test fixture `pptxxState` (tests:211–226) reproduces the §0 JSON byte-for-name (`phase/status/deck/design/resume/slides/imagePanel{required,round}/visualQa{required,round}/stopBlocks`); gates read exactly those fields. **Conformant.**
- **Branch × status table ①–④** — `pptxxGate` (stop-gate.js:357–432): ⓪ fail-closed first (armed + `!state.deck` → block, all statuses, *before* done-skip, :365); done-skip `done && !deck` → null (:373); status filter returns null for `scripting/chaining/imaging/building` (:377) = branch ④; ① seal set + `deck/build.md` raw whenever `state.deck` exists (:380–399) — this covers hybrid-`done` since the status filter passes `done` through; ② `visualQa.required===true` → round-addressed judge (:402–413); ③ `imagePanel.required===1` → round-addressed judge + manifest (:416–429). **Conformant** (hybrid-done keyed on `state.deck`, verified live by tests g1–g4 and spot-check A5).
- **Arming ratchet** — deck-gate.js:131–149: `state.phase === 'pptxx'` only (:95, :98, :131); `ip.required !== 1 && LOCAL_IMAGE_REF.test(body)` → set 1, never reset; `vq.required !== true && vq.exempt !== true && body.indexOf(DIAGRAM_MARKER)` → set true. One-way verified by (i2). Exempt marker = `state.visualQa.exempt === true` per plan C-7 #2. **Conformant.**
- **Reset mapping** — deck-gate.js:106–126: keyed on `prevArmed` captured *before* the arming grep (arming write bumps nothing — asserted by (i) round===1); `slides.md → both rounds++`, `index.html → visualQa.round++ only`, `attributions.md → imagePanel.round++ only`. **Conformant** ((k1)/(k2) assert the untouched round explicitly).
- **Manifest verification** — stop-gate.js:283–355: recursive scan of `state.deck` skipping `shots/` (case-insensitive, :314), `IMAGE_EXT = /\.(?:png|jpe?g|gif|webp|svg)$/i`, per-row `sha256File` lowercase comparison (:331–333), `LICENSE_ALLOW = {cc0, pdm, cc-by, cc-by-sa}` or `user-confirmed` token in any cell (:336–340). Row grammar: pipe-lead, ≥5 cells, header/separator skipped, deck-relative forward-slash keys. Scan/parse errors → **fail-closed block** (:348–354). **Conformant.**
- **Attribute-scoped static checks** — deck-gate.js:33–59: unconditional `/<script\b/i`, `/javascript:/i`; REF_CONTEXTS exactly the five frozen contexts; `BAD_REF` matches https?/file/absolute/drive/`../`; srcset comma-split per candidate. Plain-text URLs and `<a href>` are *not* in the contexts → seal proceeds (asserted by (n3), which includes both). Violation → warn + exit 0 with **no seal, no arming, no reset** (:82–90). **Conformant.**
- **Evidence tails** — `deck/visual-qa/round-<vq.round>/visual-qa-critic.md`, `deck/panel/round-<ip.round>/image-suitability-critic.md` (judge, dispatch-backed via existing `receiptProblems`), `deck/build.md` (raw ≥20B), all resolved under `.glm-hammer/evidence/` via `evidencePath`. `deck/fetch.md` correctly *not* gate-enforced (M4 coverage). **Conformant.**
- **Fail-closed rule** — armed + missing `state.deck` → unconditional block before everything (verified by (p) at status `building` and (g4) path); manifest fs errors block (A6 variant: missing attributions.md blocks via seal-missing in branch ①). **Conformant.**
- **done-skip base + stopBlocks cap** — `done && !deck` silent (:373, test g1 with an explicitly unarmed fixture per C-7 #5); `stopBlocks >= 6` cap untouched in common guards (:444); the intended-escape-hatch note persisted as the required one-line comment (tests:304). **Conformant.**
- **Common guard order** — `awaiting-user` handled at :440 before phase dispatch; pptxxGate has no internal awaiting-user branch. (h) is labeled as the guard-order regression. **Conformant.**

## Adversarial Spot-Checks (own scenarios, temp dirs — script in session scratchpad, 6/6 pass)

| # | Scenario (beyond the suite) | Expected per §0 | Observed |
|---|---|---|---|
| A1 | status `exporting` + slides.md seal broken via untracked append | Branch ① applies at `exporting` → block, reason names BROKEN | **PASS** — blocked with BROKEN-seal reason |
| A2 | Manifest row path written with backslashes (`images\a.png`), correct sha, cc0 | Grammar freezes forward-slash; impl normalizes `\`→`/` → accepted | **PASS** — no block (lenient normalization; sha still enforced — see advisory F2) |
| A3 | deck-gate fed `docs/glm-hammer/plans/x.md` (outside any deck dir) | Path filter miss → exit 0, no output, no seal side-effects | **PASS** — empty stdout, plan-seal.json absent |
| A4 | `srcset="images/a.png 1x, https://evil.example/b.png 2x"` | Per-candidate srcset check → seal REFUSED | **PASS** — warned REFUSED, no seal key created |
| A5 | hybrid-`done`, `visualQa.round: 2`, only a round-1 APPROVE receipt on disk | Round-addressed evidence → stale round-1 receipt must not count → block | **PASS** — blocked citing round 2 |
| A6 | `imagePanel.required=1`, APPROVE receipt present, attributions.md never created | Sealed set includes attributions.md when required → block | **PASS** — blocked on attributions.md seal MISSING |

## Findings

1. **[advisory]** `IMAGE_EXT` / `LICENSE_ALLOW` are defined at the top of `stop-gate.js` (:283–284), not `deck-gate.js` as plan C-2's heading prescribes. Names and values are byte-identical to the frozen contract, the placement is self-documented in a comment (manifest verification is a Stop-gate concern), and §0 itself does not prescribe file placement. No behavioral difference.
2. **[advisory]** `manifestRows` normalizes backslashes in the path cell (`stop-gate.js:302`), so a row violating the frozen forward-slash grammar (`images\a.png`) is still accepted (spot-check A2). Lenient on grammar, but sha256 and license checks remain fully enforced, so this cannot admit an unverified image. Consider tightening or documenting at M4.
3. **[advisory]** §0's table places `sealMatches(attributions.md)==='ok'` in branch ③; the implementation folds it into the branch-① seal set when `imagePanel.required===1` (`stop-gate.js:382`). Functionally equivalent (both branches share the same status scope, and ⓪ guarantees `state.deck` exists whenever ③ could fire); only the block-reason ordering differs. Verified equivalent by test (g)/(e) paths and spot-check A6.

No blocking findings.

VERDICT: PASS
