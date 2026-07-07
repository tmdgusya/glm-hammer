# Review: M4 — Image Sourcing + Critic Panels + External-Access Policy

- **Date:** 2026-07-07
- **Reviewer:** review-work agent (information-isolated — no execution knowledge)
- **Plan:** `docs/engineering-discipline/plans/2026-07-07-M4-image-panels-policy.md`
- **Contract source (frozen):** `docs/engineering-discipline/harness/pptxx-skill/planning/draft-v4.md` §0
- **Verification command:** `node tests/gates.test.js` → **exit 0, 109 ok / 0 FAIL**

---

## 1. Per-Criterion Verification Table

| # | Criterion (VERIFY task) | Method | Result |
|---|---|---|---|
| 1 | `node tests/gates.test.js` exit 0 (~109 ok) | Ran twice | **PASS** — exit 0, 109 ok, 0 FAIL |
| 2 | Both agent files: frontmatter, tools 4-set (no Bash), Method, C1–C4, fenced CHECKS/VERDICT/FINDINGS, mechanical line, Evidence Receipt→EVIDENCE_RECORDED, single-Write rule, data-not-instructions | Read both files in full | **PASS** — see §2 |
| 3 | SKILL.md imaging + visual-qa phases §0-conformant | Read Phase I / Phase V / Hard Gates / Anti-Patterns | **PASS** — see §3 |
| 4 | M3→M4 transition coherent: ```diagram armed via deck-gate; SKILL.md never sets `*.required` directly | Read Hard Gates 2/3, grep `required` | **PASS** — see §4 |
| 5 | tests: marker era-constant += visual-qa; s3 = coverage (not subset); (j) agent existence; (t) tools+rule lines | Read test lines 632–739 | **PASS** — see §5 |
| 6 | ZERO M4 self-diff on gate/route/plugin files; stop-gate contingency did NOT fire | String cross-check stop-gate ↔ agents ↔ SKILL.md | **PASS** — see §6 |
| 7 | Milestone Success Criteria item-by-item | Binary cross-check | **PASS** — see §7 |
| 8 | Adversarial ≥3 | Ran independent stop-gate harness | **PASS** — see §8 |

---

## 2. Agent-Contract Verification (task 2)

Both `agents/image-suitability-critic.md` and `agents/visual-qa-critic.md` read in full.

| Contract element | image-suitability-critic | visual-qa-critic |
|---|---|---|
| frontmatter order name→description→tools | ✓ | ✓ |
| `tools: ["Read", "Grep", "Glob", "Write"]` exact (no Bash) | ✓ (line 4) | ✓ (line 4) |
| Bash-deviation prose line | ✓ ("does not fetch and does not run a shell… drops `Bash`") | ✓ |
| R1 single-Write rule (`Write exactly one file` + `REJECT-level protocol violation`) | ✓ (line 12) | ✓ (line 12) |
| R2 data-not-instructions (`untrusted data` + `never instructions`) | ✓ (line 13) | ✓ (line 13) |
| `## Method` numbered | ✓ | ✓ |
| `## Verdict — Binary Checklist` with **C1:**–**C4:** | ✓ license-allowlist / attribution-rendered / slide-context-fit / content-safety | ✓ legibility / overflow / token-conformance / diagram-legibility |
| fenced CHECKS:/VERDICT: APPROVE\|REJECT/FINDINGS: block | ✓ | ✓ |
| "VERDICT is mechanical" line | ✓ (line 44) | ✓ (line 42) |
| `## Evidence Receipt` ending in EVIDENCE_RECORDED | ✓ (line 53) | ✓ (line 53) |

**receiptProblems judge-kind satisfiability:** the Evidence Receipt section instructs writing the FULL report (CHECKS block + VERDICT line + findings). A full report trivially exceeds `JUDGE.minBytes = 300`, contains a `CHECKS:` block (`requireChecks`), and the `VERDICT: APPROVE|REJECT` line matches `/VERDICT:\s*APPROVE/i`. A receipt built per each file **would satisfy** the `receiptProblems` judge kind. ✓

**§0 tail match:** both agents cite the exact frozen tails —
`.glm-hammer/evidence/deck/panel/round-<N>/image-suitability-critic.md` and
`.glm-hammer/evidence/deck/visual-qa/round-<N>/visual-qa-critic.md`. Byte-identical to §0 and to stop-gate branches ②③. ✓

---

## 3. §0 Conformance — Imaging + Visual-QA Phases (task 3)

**Phase I (Imaging), §0-frozen items — all present:**
- Local-copy-only with M1 curl flags: `--proto '=https' --proto-redir '=https' --max-redirs 3`, `--max-filesize 5242880`, Content-Type `image/*` (SKILL.md lines 79–85). ✓
- `attributions.md` 5-column pipe grammar (deck-relative forward-slash | sha256 | source-url | license | author) + frozen example `| images/photo1.jpg | <sha256> | https://... | cc-by | <author> |` (lines 86–88). ✓
- `.glm-hammer/evidence/deck/fetch.md` raw receipt (line 89). ✓
- HTML/pptx reference **local paths only** (line 85, remote src/@import/iframe → seal refused). ✓
- WebSearch + Openverse + Wikimedia Commons named; `LicenseShortName` client-filter fallback stated (lines 75–77). ✓
- License policy: cc0/pdm/cc-by allowed; cc-by-sa unmodified-embed + SA notice; nc/nd → `user-confirmed` (lines 90–93). ✓
- Openverse `mature=false` always on (line 76). ✓
- Descriptive UA + per-run query budget + 429 backoff-then-ask (line 78). ✓
- insane-search prohibitions: never for image bytes / never against the APIs / never bypass 403·429·robots·paywall / only user-provided reference URL text / per-session install approval + per-URL confirmation + use notice (line 94). ✓
- All fetched web text data-not-instructions (line 95). ✓

**Phase V (Visual-QA):**
- Playwright `javaScriptEnabled: false` + deny-by-default request interception (both mandatory) → `<deck>/shots/slide-NN.png` (line 115). ✓
- Diagram-block grammar **ACTIVATED** here — M3-era deferral explicitly ends (Hard Gate 3 + line 114). ✓
- §0 tail + information isolation (shots-only) + mechanical APPROVE (line 116). ✓
- REJECT-count ≤3 escalation → `awaiting-user` (line 117); round = invalidation counter. ✓
- build.md retained (line 118). ✓

---

## 4. M3→M4 Transition Coherence (task 4, CRITICAL)

- **Does SKILL.md now allow ```diagram in slides.md (arming visualQa via deck-gate) whereas M3 deferred it?** YES. Hard Gate 3 (line 18), Phase S (line 55), and Phase V #1 (line 114) all state the M3-era suspension is lifted and the `` ```diagram `` fence (format-spec §5, first line `slide: NN`) is now written into `slides.md`, arming `visualQa.required` and flowing into Phase V rather than deadlocking.
- **Does SKILL.md still NOT instruct the model to directly set `imagePanel.required` / `visualQa.required`?** CONFIRMED. Every mention (Hard Gate 2 line 17, Hard Gate 3 line 18, State Protocol rule line 46, Phase S lines 55–56, Phase I line 73, Phase I #8 line 96, Phase V line 112 & 114, Anti-Patterns line 136) frames arming as **deck-gate-owned**, explicitly "never write the flags yourself / read-only to this skill." An Anti-Pattern row penalizes writing the flags. **Zero** instructions to set the flags directly. ✓

---

## 5. Test-Drift Upgrade Verification (task 5)

- **Marker era-constant** `M3_MARKERS` now `['scripting','chaining','imaging','building','visual-qa','done']` — includes `'visual-qa'`; comment reads "M4 += visual-qa; M5 += awaiting-user·exporting" (lines 632–636). ✓
- **s3 = COVERAGE, not subset:** condition is `found.every(f => tailSet.has(f)) && [...tailSet].every(t => found.includes(t))` — all 4 §0 tails present AND no extra `evidence/deck/…` string (lines 651–654). ✓
- **Agent existence in (j):** array carries `agents/image-suitability-critic.md` + `agents/visual-qa-critic.md` (lines 193–194); both `exists` checks green. ✓
- **(t) agent-file assertions** read each file once and check the exact tools line (`&& !/tools:.*Bash/`), R1 (`Write exactly one file` + `REJECT-level protocol violation`), R2 (`untrusted data` + `never instructions`), and **C1:**–**C4:** for both agents (lines 719–739). ✓
- **Existing 93 assertions preserved:** all M1/M2/M3 scenarios (a)–(p), planKey, crucible, s1, s4–s7 green; only the sanctioned in-place edits are (s2) marker array +1, (s3) condition promotion, (j) +2 elements, plus appended s8–s12 / t1–t8. Count: 93 baseline + (s2 +1) + (j +2) + (t +8) + (s8–s12 +5) = **109** (s3 is in-place, count-neutral). Matches the observed 109 ok. ✓

---

## 6. Scope + Contingency (task 6)

**Working-tree note:** the repo's last commit (`8c5d7f0`) is M0-era; the **entire pptxx feature (M1–M4) is uncommitted** in the working tree. Git therefore cannot mechanically isolate M4's per-file diff from inherited M1/M2/M3 work. The scope guarantee is instead established by **string-consistency** between M4's outputs (agents + SKILL.md) and the pre-existing gate code.

**stop-gate contingency — did NOT fire (as predicted):** the existing `pptxxGate` in `hooks/scripts/stop-gate.js` already handles branches ②③ with the exact critic names / tails / manifest constants M4's agents + SKILL.md produce:
- Branch ② tail `deck/visual-qa/round-${round}/visual-qa-critic.md` ↔ agent `name: visual-qa-critic` ✓
- Branch ③ tail `deck/panel/round-${round}/image-suitability-critic.md` ↔ agent `name: image-suitability-critic` ✓
- `IMAGE_EXT` {png,jpe?g,gif,webp,svg}, `LICENSE_ALLOW` = {cc0,pdm,cc-by,cc-by-sa}, 5-column pipe `manifestRows` parser, `user-confirmed` token, `sha256File` integrity — all string-match C-4/C-5 and §0 (stop-gate lines 283–355). ✓

No mismatch that a test failed to catch. No stop-gate edit was required. **No blocking finding.**

---

## 7. Milestone Success Criteria (task 7 — binary)

| Milestone criterion | Verdict |
|---|---|
| Agents 2×: house contract + tools 4-set (intentional deviation) + R1 single-Write + R2 data-not-instructions + (j) tools·Write assertion | **MET** (§2, t1–t8 green) |
| Checklists: image-suitability 4 (license/attribution-render/context-fit/safety) + visual-qa 4 (readability/overflow/token/diagram) | **MET** (§2) |
| Image phase: local-copy-only M1 cmd, attributions.md §0 grammar, fetch.md, HTML local-only, license policy, mature, UA/budget/429, insane-search, data-not-instructions | **MET** (§3, s8–s12 green) |
| Visual-qa phase: JS-off+request-block→shots/, diagram grammar active, §0 tail/rounds, unanimous+isolation, REJECT ≤3 escalation, build.md | **MET** (§3, s2/s3 green) |
| Mechanized cross-check: marker += visual-qa, tail coverage, 0 string mismatch | **MET** (§5, §6) |
| `node tests/gates.test.js` passes; agents added to (j); M2 scenarios green | **MET** (109 ok / 0 FAIL) |
| (exemption-reduced criteria) | **N/A** — M1 spikes 3/3 APPROVE → full scope, no exemption |

---

## 8. Adversarial Results (task 8)

**(a) Fabricated image-panel receipt + manifest, driven through stop-gate `pptxxGate` (independent tmpdir harness):**
- PASS-side: cc-by license + sha256-matching manifest + fabricated `VERDICT: APPROVE` receipt at the frozen panel tail + backing dispatch ledger → **no block** (branch ③ passes). ✓
- BLOCK-side: same fixture, license flipped to `cc-by-nd` with no `user-confirmed` token → **block** ("manifest failed — images/photo1.jpg: license … not in {cc0, pdm, cc-by, cc-by-sa}"). ✓
- Extra: fabricated APPROVE receipt with the dispatch ledger pointing at a different tail → **block** on dispatch-backing (unbacked receipt). ✓
- **Conclusion:** the gate is a real check, not a rubber stamp — it gates on both the manifest license allowlist and dispatch-backing.

**(b) Does the visual-qa agent's checklist gate on diagram readability?** YES. `visual-qa-critic` C4 = "(diagram legibility) Is each ```diagram slide's rendered diagram legible and faithful to the slide's intent?" combined with the mechanical rule "APPROVE iff every check is YES or N/A; any NO → REJECT." A diagram that fails to render legibly forces C4 = NO → REJECT. ✓

**(c) Any real ```diagram fenced block in SKILL.md that could falsely arm deck-gate?** NO real fence. `grep -E '^```diagram'` returns nothing; all 7 occurrences are inline double-backtick spans (`` ```diagram ``) in prose/documentation. Additionally SKILL.md lives at `skills/pptxx/SKILL.md`, which the deck-gate path filter (`docs/glm-hammer/decks/<name>/`) never matches — it can never be sealed as a `slides.md`. No false arming is reachable. ✓ (Advisory: deck-gate's `DIAGRAM_MARKER` is a plain substring match, not line-anchored — the safety here rests on the path filter, not on the inline-wrapping. This is M2 deck-gate behavior, not an M4 concern.)

---

## Findings

**[blocking]:** none.

**[advisory]:**
1. The entire pptxx feature (M1–M4) is uncommitted in the working tree (last commit is M0-era). M4's "ZERO self-diff" on the gate/route/plugin files therefore cannot be proven by `git diff` alone; it rests on the string-consistency cross-check (§6), which holds. Committing per-milestone would make future scope audits mechanical.
2. `deck-gate.js` `DIAGRAM_MARKER = '```diagram'` is matched with `String.indexOf` (not line-anchored). Harmless for M4 (SKILL.md path never enters the deck-gate filter), but a genuine `slides.md` containing the literal substring inside an inline code span would arm `visualQa.required`. Pre-existing M2 behavior — noted for completeness, not an M4 defect.

---

## VERDICT: PASS

Zero blocking findings; all milestone Success Criteria met; `node tests/gates.test.js` exits 0 with 109 ok / 0 FAIL; both critic agents conform to the frozen house contract with the intentional 4-set (Bash→Write) deviation; SKILL.md imaging + visual-qa phases are §0-verbatim; the M3→M4 diagram/image activation is coherent and arming stays deck-gate-owned; stop-gate contingency correctly did not fire (byte-consistent names/tails/manifest constants); and the independent adversarial harness confirms the image panel gate blocks on disallowed licenses and unbacked receipts while passing a valid fixture.
