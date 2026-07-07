# Review: M3 — pptxx SKILL.md Core Pipeline + Chaining + Routing

**Date:** 2026-07-07
**Reviewer:** information-isolated review-work agent
**Plan:** `docs/engineering-discipline/plans/2026-07-07-M3-skill-core-chaining-routing.md`
**Contract source:** `docs/engineering-discipline/harness/pptxx-skill/planning/draft-v4.md` §0 (frozen)
**Verdict:** **PASS** (0 blocking, 1 advisory)

---

## Per-Criterion Verification

| # | Criterion | Method | Result |
|---|---|---|---|
| 1 | `node tests/gates.test.js` exit 0 | ran from repo root | **93 ok / 0 FAIL, exit 0** ✓ |
| 2 | M3 diff surface = 5 modified + 1 untracked | `git status --porcelain` + `git diff --numstat` | ✓ (see below) |
| 2 | M3 zero contribution to stop-gate/deck-gate/lib/hooks.json | numstat vs M2 checkpoint | ✓ stop-gate `158 0` == M2 stated +158; lib `1 1`, hooks.json `7 0`, deck-gate untracked — all M2 pre-existing |
| 3 | crucible diff exactly +2/-0, correct anchors | `git diff --numstat` + read | ✓ `2 0`, both lines placed per C-3 |
| 4 | SKILL.md conformance to §0 + milestone | full read + grep | ✓ (details below) |
| 5 | route-intent.js edits + 4 fixtures | read + spawnSync in `os.tmpdir()` | ✓ all 4 pass, JSON valid |
| 6 | drift tests non-vacuous, append-only | read test bodies + diff | ✓ |
| 7 | Milestone Success Criteria | item-by-item | ✓ all met |
| 8 | Adversarial spot-checks (≥3) | grep + fixture JSON validation | ✓ no issues |

---

## §0 Conformance Findings

### Diff surface (criterion 2)
M3-owned changes present and correctly scoped:
- Modified: `.claude-plugin/plugin.json` (5/1), `.zcode-plugin/plugin.json` (5/1), `hooks/scripts/route-intent.js` (8/1), `skills/crucible/SKILL.md` (2/0), `tests/gates.test.js` (470/1)
- Untracked (new): `skills/pptxx/SKILL.md`
- **Out of scope, confirmed untouched by M3:** `stop-gate.js` (158/0 = M2 checkpoint's stated +158, byte-identical to M2 landing), `lib.js` (1/1, M2 planKey), `hooks/hooks.json` (7/0, M2 deck-gate entry), `deck-gate.js` (untracked, M2). These are pre-existing uncommitted M1/M2 work — M3 made zero contribution.

### crucible SKILL.md (criterion 3)
`git diff --numstat` == `2 0`. Exactly two added lines, zero removed:
- **(a)** `- Preserve top-level \`resume\`, \`deck\`, and \`slides\` keys across every state rewrite …clear \`resume\` only when writing the terminal status \`done\`.` — placed in the State Protocol **Rules** list, immediately after the `Never write \`approved\`` bullet. ✓
- **(b)** `- If \`state.resume\` is set …skip ONLY the forge hand-off above — still present the design and require the user's acceptance; on acceptance set status \`approved\`, then return immediately to the skill named in \`resume\`…` — placed in **Phase E**, immediately after the `- Yes →` bullet. ✓ Preserves user design acceptance, sets approved, returns to resume skill. Nothing else in crucible changed.

### pptxx SKILL.md (criterion 4)
- **Frontmatter:** exactly `name` + `description` (2 keys). Korean triggers 발표/슬라이드/프레젠테이션 present; English presentation/pptx/deck present. ✓
- **5 sections:** Core Principle / Hard Gates (hook-enforced) / State Protocol / Process / Anti-Patterns — all present. "방치 금지" present verbatim (Hard Gate 7). ✓
- **State Protocol fenced JSON:** `"status"` line == §0 enum byte-for-byte (`scripting | chaining | imaging | building | visual-qa | awaiting-user | exporting | done`). ✓
- **Arming ownership (critical M3-era rule):** grep of `required` — every mention describes deck-gate behavior or prohibits the model from setting the flags (Hard Gate 2: "never write the flags yourself"; line 46: "read-only"; Phase I: "the deck-gate owns the flag"). No model instruction to set `imagePanel.required`/`visualQa.required`. ✓
- **Diagram deferral:** documented as never-written-to-`slides.md`-until-M4 with the causal reason (deck-gate greps `` ```diagram `` → auto-arms visualQa). Demoted to plain bullet + `> notes:`. ✓
- **Image directives:** parsed-but-deferred as `[이미지 유예: <설명>]` labels; no `![…]` / `<img>` / local image ref. ✓
- **Terminal flow:** `building → done` direct; no stop at visual-qa/awaiting-user/exporting in M3-era. ✓
- **Markers:** era-set {scripting, chaining, imaging, building, done} all present; NO awaiting-user/exporting/visual-qa `⟨state:⟩` markers. ✓
- **Evidence tails:** only `evidence/deck/build.md` appears (×4), ∈ §0's 4-tail set. ✓
- **Chaining/resume:** 4-step protocol in order (Phase C). Completion signal cites harmony-critic + rigor-critic receipts with `VERDICT: APPROVE`. Merge return names 6 fields (phase, status:'chaining', resume:null, deck, slides, design). ✓
- **Contract citations:** both `planning/spikes/pptx/format-spec.md` and `planning/spikes/screenshot/README.md` cited. ✓
- **Anti-Patterns:** 10 data rows (≥8). ✓

### route-intent.js (criterion 5)
- `workRequest` got VERBS only (뽑|생성|추출|export added between 마이그레이션 and build); deck nouns 발표/슬라이드/프레젠테이션 are NOT in workRequest. ✓
- `deckIntent` branch sits after `executeIntent` (line 79) and before `designIntent` (line 86). ✓
- Output stays single-key `additionalContext` via `emitContext`; `grep -c emitContext(` == 2 (active path + router path). ✓

---

## Fixture Results (run via spawnSync, stdin, os.tmpdir cwd)

| # | Prompt | Expected | Actual |
|---|---|---|---|
| ① | 이 스크립트로 발표 슬라이드 뽑아줘 | pptxx mentioned | pptxx ✓, valid JSON |
| ② | 브랜드 디자인 토큰 만들어줘 | crucible, not pptxx | crucible ✓, no pptxx ✓, valid JSON |
| ③ | 슬라이드 디자인해줘 | pptxx (deck beats design) | pptxx ✓, valid JSON |
| ④ | 팀에게 결과를 발표했어요 | empty output | `""` ✓ (noun-only, no workRequest verb) |

All four pass. No malformed JSON on any fixture.

---

## Adversarial Results (≥3)

1. **Real `` ```diagram `` fenced block in SKILL.md?** `grep '^```diagram'` → NONE. Only fences are `` ```json `` (line 29) and its closer (line 41). All `` ```diagram `` mentions are inline-code within prose. deck-gate's fence grep would never fire on this file. ✓
2. **Does crucible amendment break existing crucible tests?** No crucible-specific check regressed — full suite is 93 ok / 0 FAIL. The 2 added lines are pure insertions; drift checks (s4/s5) confirm the anchors present without disturbing prior assertions. ✓
3. **route-intent malformed JSON on any fixture?** All non-empty outputs `JSON.parse` cleanly; empty fixture is exactly `""`. ✓
4. **Drift tests vacuous?** No — s1 does genuine bidirectional set-equality (size 8 + both-direction inclusion) against a parsed `"status"` match; s2 loops `M3_MARKERS` with real regex; s3 extracts `evidence/deck/…` and asserts `tailSet.has`; s4/s5 `indexOf` the exact frozen anchor strings in crucible; s6/s7 `indexOf` the contract paths. All read the actual files (`readFileSync`). ✓
5. **tests append-only?** Only ONE deletion line in `tests/gates.test.js` diff — the `(b)` array literal at line 22 (adding `.claude-plugin/plugin.json` element). `(j)` `skills/pptxx/SKILL.md` added at line 194 (append within multiline array). No existing check string deleted. ✓
6. **plugin.json scope creep?** Both diffs are keyword-only (single deletion = `"design-tokens"` line gaining a trailing comma); version and all other fields untouched; 4 keywords `pptxx/deck/presentation/슬라이드` added to both, files remain identical. ✓

---

## Milestone Success Criteria (binary)

- [x] SKILL.md exists: frontmatter (KR/EN triggers) + 5 sections + 방치 금지 + both contract path citations — **met**
- [x] Drift tests: status set-equality + marker era-constant {scripting,chaining,imaging,building,done} + tail ⊆ 4-set — **met**
- [x] Format M3-era rules: diagram reserved / image deferred / building→done direct — **met**
- [x] deck HTML rules: addressing (slide-NN, 1280×720) + self-contained + `<script>` forbidden + external-resource forbidden + `<a href>`/text URL allowed — **met**
- [x] Chaining/return: resume set, crucible 2-line amendment, merge return (6 fields), completion signal cites panel APPROVE; grep tests assert crucible 2 lines + pptxx resume — **met**
- [x] Routing: workRequest verbs only, deck noun regex in deck branch (after executeIntent, before designIntent), 4 E2E fixtures, single-key output — **met**
- [x] Suite: (j) SKILL.md + (b) `.claude-plugin/plugin.json` added, both plugin.json keyword membership asserted — **met**

---

## Findings

- **[advisory]** SKILL.md contains an extra `⟨state: deck⟩` marker (line 54) beyond the era-set five. This is a checkpoint annotation marking the point where `state.deck` becomes set (during directory creation), not a status-enum marker, and it is not one of the forbidden `awaiting-user`/`exporting`/`visual-qa` statuses. The drift test (s2) only asserts presence of the five era markers and is unaffected. It matches the plan's Task 3 wording ("⟨state: deck⟩"). No action required.

No blocking findings.

---

**VERDICT: PASS**
