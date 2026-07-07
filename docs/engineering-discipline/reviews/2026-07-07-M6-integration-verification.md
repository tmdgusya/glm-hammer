# M6 — Integration Verification (Final Gate)

**Feature:** pptxx presentation-deck skill
**Milestone:** M6 (Integration Verification — final gate; depends on M1–M5, all completed)
**Date:** 2026-07-07
**Scope:** Whole-system cross-milestone integration. NOT a re-review of individual milestones — this verifies the full contract chain and that the assembled system works together from scratch.
**Frozen contract:** `docs/engineering-discipline/harness/pptxx-skill/planning/draft-v4.md` §0 (single source of truth).

---

## 1. Top-level suite result

Project verification command (state.md → Verification Strategy):

```
node tests/gates.test.js
```

| Metric | Expected | Observed |
|---|---|---|
| Exit code | 0 | **0** |
| `ok` assertions | 114 | **114** |
| `FAIL` assertions | 0 | **0** |

**Result: PASS.** Suite validates all hook script syntax (`node --check`), hooks.json/plugin.json validity, pptxxGate + deck-gate stdin→stdout regression scenarios (block/pass/seal/arm/reset), authored SKILL.md/agents contract assertions, and the drift suite.

---

## 2. Per-milestone success-criteria retention (post-integration spot-check)

Each milestone's key deliverable still exists and its gated assertions remain green inside the 114-ok suite.

| MS | Key deliverable | Exists | Suite anchor | Status |
|---|---|---|---|---|
| M1 | `planning/spikes/pptx/format-spec.md`, `planning/spikes/screenshot/README.md`, spike artifacts under `planning/spikes/` | Yes | s6/s7 cite both contract paths | RETAINED |
| M2 | `hooks/scripts/deck-gate.js`, `pptxxGate` in `stop-gate.js`, `planKey` `decks/` extension in `lib.js` | Yes | gate scenario block (ⓐ–ⓟ), planKey, static-check assertions | RETAINED |
| M3 | `skills/pptxx/SKILL.md`, route-intent `deckIntent` branch, crucible +2 lines | Yes | route fixtures ①–④+r0, drift s1/s2, s4/s5 crucible anchors | RETAINED |
| M4 | `agents/image-suitability-critic.md`, `agents/visual-qa-critic.md`, SKILL.md imaging + visual-qa phases | Yes | t1–t8 agent contract, s8–s12 imaging drift, s3 tail coverage | RETAINED |
| M5 | `skills/pptxx/scripts/md2pptx.py`, SKILL.md `awaiting-user` + `exporting` | Yes | z1–z3 zero-dep boundary, s1 8-status enum, marker era (s2) | RETAINED |

All deliverable files confirmed present on disk (existence probe: 7/7 EXISTS).

---

## 3. Regression — pre-existing functionality

- **39 original assertions (crucible / forge / hammer / token):** GREEN. Baseline arithmetic: M2 suite = 73 ok (34 new pptxx + 39 pre-existing); current suite = 114 ok / 0 FAIL, so all 39 pre-existing assertions still pass.
- **crucible/SKILL.md diff:** `git diff HEAD` = **+2 / -0** (2 insertions, 0 deletions), exactly the locked scope amendment:
  - (a) "Preserve top-level `resume`, `deck`, and `slides` keys across every state rewrite … clear `resume` only when writing the terminal status `done`."
  - (b) Phase E: "If `state.resume` is set … skip ONLY the forge hand-off … on acceptance set status `approved`, then return immediately to the skill named in `resume`."
- **No other pre-existing skill/hook logic altered beyond pptxx additions.** Working-tree modifications: `stop-gate.js`, `lib.js`, `route-intent.js`, `hooks.json`, both `plugin.json`, `tests/gates.test.js`, `crucible/SKILL.md` — every change is a pptxx additive extension; forge/hammer/token skill files untouched. (Note: the whole pptxx feature is currently uncommitted in the working tree, as flagged in state.md's M4 log — commit is a post-verification step, not an integration defect.)

---

## 4. Cross-milestone interface chain (seams a–g)

Each seam traced at the string level across every milestone that produces or consumes it.

| Seam | Contract | Evidence | Verdict |
|---|---|---|---|
| **(a) Diagram marker** | The ` ```diagram ` fence must be byte-identical everywhere | M1 `format-spec.md:42,53` (`^```diagram$`, "single integrity marker"); M2 `deck-gate.js:22` `const DIAGRAM_MARKER = '```diagram'`; M4 `SKILL.md` Phase V `line 114` activates the `` ```diagram `` grammar; M5 `md2pptx.py:132` `elif line == "```diagram"`. All four = `` ```diagram ``. | **PASS** |
| **(b) Evidence tails (4)** | build.md, fetch.md, visual-qa/round-N/visual-qa-critic.md, panel/round-N/image-suitability-critic.md match across gate / agents / SKILL | Gate checks 3 directly — `stop-gate.js:392` `deck/build.md`, `:404` `deck/visual-qa/round-${round}/visual-qa-critic.md`, `:418` `deck/panel/round-${round}/image-suitability-critic.md`. Agents write their own: `visual-qa-critic.md:48`, `image-suitability-critic.md:50`. SKILL.md carries all 4 (s3 coverage test, size-4 set, round-N normalized). fetch.md is consumed by the image-suitability-critic panel (`image-suitability-critic.md:7,17`) not the gate directly — per §0 "패널 체크리스트가 매니페스트와 교차 확인" (by design). All strings byte-identical modulo `round-${round}`↔`round-<N>` normalization and the `.glm-hammer/evidence/` prefix `receiptProblems` prepends. | **PASS** |
| **(c) Manifest grammar (5-col pipe)** | `\| path \| sha256 \| source-url \| license \| author \|` same order/count | §0 draft-v4 `:42` example row; M4 `SKILL.md:87` identical row; M2 `stop-gate.js:288` comment + `manifestRows()`/`:336` parses col[3]=license, col-scan for `user-confirmed`, `:345` error message re-states the 5-column row. Same 5 columns, same order. | **PASS** |
| **(d) Critic names** | `image-suitability-critic` / `visual-qa-critic` identical as tail constant, filename, dispatch | M2 tail constants `stop-gate.js:404,418`; M4 agent filenames `agents/visual-qa-critic.md`, `agents/image-suitability-critic.md`; SKILL.md dispatch `:96` (`image-suitability-critic`), `:116` (`visual-qa-critic`). Identical. | **PASS** |
| **(e) State schema (8-status enum)** | scripting, chaining, imaging, building, visual-qa, awaiting-user, exporting, done | M2 gate branches on these statuses (`stop-gate.js:377,440`); M3 `SKILL.md:32` JSON status enum lists all 8; drift test `tests/gates.test.js:628` set-equal size-8 + `:636` `M3_MARKERS` era set = same 8. All aligned. | **PASS** |
| **(f) shots/ path** | `<deck>/shots/slide-NN.png` convention shared | M1 `screenshot/README.md:17` `<deck>/shots/slide-NN.png`; M4 `SKILL.md:115` same; M5 `md2pptx.py:8,11` allowlist resolves `<deck-dir>/shots/` and `shots/slide-<NN>.png`; deck-gate `:69` treats `shots/` as out-of-scope subdirectory. Same convention. | **PASS** |
| **(g) crucible resume protocol** | A resume marker set by pptxx is preserved and consumed round-trip | pptxx sets `resume:"pptxx"` before calling crucible (`SKILL.md:62`), merges `resume:null` + re-records `deck`/`slides` on return (`:68`); crucible amendment (a) preserves `resume`/`deck`/`slides` across all rewrites and clears only on `done`; amendment (b) Phase E skips ONLY the forge hand-off and returns to the skill named in `resume`. Logic trace: marker survives every crucible state rewrite → Phase E branches on it → control returns to pptxx → pptxx clears it. Chain closed. (Live round-trip = manual scope.) | **PASS** |

**All 7 seams string-compatible.**

---

## 5. Static end-to-end dispatch trace

Hypothetical request: *"이 스크립트로 발표 슬라이드 뽑아줘 / make me a deck from this script."*

| Hop | Contract satisfied by | Status |
|---|---|---|
| **Route** | `route-intent.js:56` workRequest matches `뽑` → `:62` `deckIntent` matches `발표/슬라이드` → `:81` routes to `pptxx` (positioned after executeIntent, before designIntent per §0). | OK |
| **scripting** | SKILL.md Phase S secures the script (mould); status `scripting`. | OK |
| **chaining** (crucible) | SKILL.md `:62` sets `resume:"pptxx"`, invokes crucible; crucible amendment returns on user acceptance; `:68` merges back `resume:null` + confirms panel receipts (`harmony-critic`/`rigor-critic` APPROVE, Hard Gate 5). | OK |
| **imaging** (deck-gate arms) | SKILL.md Phase I sources local image copies; `index.html` local-image ref → deck-gate `:134` ratchets `imagePanel.required=1`; `attributions.md` 5-col manifest + `fetch.md` written. | OK |
| **building** | SKILL.md Phase B authors self-contained `index.html` (deck-gate static check `:42` — no `<script>`/remote refs), records `build.md`. | OK |
| **visual-qa** | `slides.md` `` ```diagram `` fence → deck-gate `:141` arms `visualQa.required=true`; pptxxGate `:404` requires visual-qa-critic APPROVE; image panel `:418` requires image-suitability-critic APPROVE + manifest `:427`. | OK |
| **awaiting-user** | pptxxGate `:440` `awaiting-user` passes the guard (PPTX opt-in question; default no generation). | OK |
| **exporting** | On consent → `exporting`; `md2pptx.py` parses `` ```diagram `` fences, enforces `<deck-dir>` (+`shots/`) allowlist, nonzero exit on escape. pptxxGate `:377` still enforces branch ①/②/③ while `exporting`. | OK |
| **done** | Hybrid-done: `state.deck` present → re-verifies seal set + `build.md`; `resume` cleared. | OK |

**No broken hops.** Every seam consumed downstream is produced upstream with a matching string contract.

---

## 6. Manual-verification checklist (post-merge, first-use)

The zero-dependency suite cannot exercise live external integrations. These are **planned first-use manual checks, NOT failures** (documented per state.md Verification Strategy — same convention as crucible):

- [ ] **Live deck generation:** run a real "make a deck" request end-to-end; confirm state advances scripting→…→done with real receipts on disk.
- [ ] **Real image API calls:** Openverse + Wikimedia queries return license/creator/source-URL; `cc0|pdm` + `mature=false` download succeeds; sha256 recorded; binary deleted (not committed).
- [ ] **Playwright screenshot capture:** run against a real rendered deck with `javaScriptEnabled:false` + deny-by-default request block; confirm `<deck>/shots/slide-NN.png` output.
- [ ] **python-pptx output:** run `md2pptx.py` on a real M4-era deck; open the `.pptx` in PowerPoint; verify diagram slide has exactly one picture-shape (or title+notes fallback when PNG absent).
- [ ] **Full crucible→pptxx round-trip:** live-verify `resume` marker preservation through the crucible panel and return to pptxx (seam g executed, not just traced).

---

## 7. Findings

- **[advisory]** Seam (b): `fetch.md` is the one evidence tail the Stop gate does not check directly — it is consumed by the image-suitability-critic panel that the gate DOES gate on (§0 design: the panel cross-checks fetch.md against the manifest). This is contract-correct, not a gap; noted only so a future reader does not mistake the asymmetry for a missing gate check.
- **[advisory]** The entire pptxx feature is uncommitted in the working tree (12 modified/untracked paths). Integration is verified against the working tree; a commit is the recommended next step (already anticipated in state.md's M4 log).
- **[blocking]** None.

---

## VERDICT: PASS

Suite exit 0, 114 ok / 0 FAIL; zero blocking integration findings; all 7 cross-milestone seams (a–g) string-compatible; static E2E dispatch trace has no broken hops; pre-existing 39 assertions green and crucible diff exactly +2/-0.
