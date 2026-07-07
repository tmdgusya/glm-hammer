# Round 1 — Verifiability Critic (vs DRAFT v1)

**[Blocking] Finding:** M1's screenshot spike criterion is satisfiable while the thing it claims to prove is false — a REJECT (or hallucinated APPROVE) verdict on a blank capture still passes every stated check.
**Where:** M1 — "APPROVE/REJECT로 기록됨" and "비어 있지 않은 PNG".
**Failure scenario:** Classic Playwright-on-Windows failure = structurally valid non-empty PNG that is blank white / missing fonts (file:// asset resolution, headless font fallback). Passes "비어 있지 않은 PNG"; verdict criterion accepts either token. M4 inherits "증명된 명령" falsely.
**Smallest fix:** Sentinel string (and one distinct shape/color) in the sample; criterion: verdict.md must quote the sentinel as read from the PNG, and the verdict must be APPROVE.

**[Blocking] Finding:** M4's gate test requires pptxxGate behavior in a file M4 does not modify, and no M2 criterion pins the receipt-path/state-field contract that behavior depends on.
**Failure scenario:** Existing gates hard-code exact tails (stop-gate.js:41 CRUCIBLE_PANEL, :177, :225-226); a one-word mismatch (M2 guesses `visual-qa.md`, M4 names `visual-qa-critic`) fails M4's test against unreachable code → reopen M2. Second-order: M3's abort point requires the branch be correctly conditional; no M2 criterion tests the negative case (no diagram state → not blocked).
**Smallest fix:** Full receipt contract in M2's SC — exact tails, critic names, arming state fields — plus two M2 assertions: (a) no diagram state → no block; (b) diagram state + missing/non-APPROVE receipt → block.

**[Blocking] Finding:** Brief Success Criterion 2's enforcement half — image-suitability panel unanimity as a hard gate — is exercised by no criterion in any milestone.
**Failure scenario:** All milestones complete green while pptxxGate never checks an image-suitability receipt; the panel is prose + agent file but skippable. M4's "성공 기준 2·3 실증 가능" half unbacked.
**Smallest fix:** (h)-mirror in M2 (per contract) and M4's tests: image state armed + missing/REJECT image-suitability receipt → block.

**[Blocking] Finding:** The crucible chaining criterion verifies only the outbound call; the return leg (crucible completes → pptxx resumes) is a cross-milestone interface no criterion exercises — and on current repo facts it fails.
**Failure scenario:** Chaining precedent is one-way: finishing skill names the next skill. Inverted here: crucible Phase E (unmodifiable per Out-scope) chains to forge on approval or sets done on decline (deactivating the run in route-intent.js:21); route-intent.js:16-54 short-circuits rerouting while the run is active. Live: deck request → crucible → offers forge → pptxx never resumes; deck never built. M3's "미러" passes on inspection.
**Smallest fix:** Explicit M3 criterion for the resume mechanism (state marker e.g. `resume: 'pptxx'`; who reads it; checkable assertion). If no mechanism works without touching crucible, that is a scope conflict to resolve before lock.

**[Concern] Finding:** M2's seal test cannot distinguish "planKey extended for decks/" from "planKey untouched" — absolute-path fixtures hit the identical fallback key on both sides and return 'ok' with zero planKey changes.
**Smallest fix:** M2 assertion: planKey(absolute win path) === planKey(relative posix path) === normalized key.

**[Concern] Finding:** The gate lifecycle model decision is flagged as a risk but pinned by no M2 success criterion — no scenario with `status:'done'`.
**Smallest fix:** M2 criterion: one test asserting the chosen behavior at `phase:'pptxx', status:'done'`.

**[Concern] Finding:** M3's prose-drift check ("불일치 0건") has no defined extraction procedure — not mechanically decidable.
**Smallest fix:** (j)-style test parsing `⟨state: …⟩` markers out of skills/pptxx/SKILL.md and asserting each status is a member of the gate's status set.

**[Concern] Finding:** M2's route-intent criterion lets fixture choice mask both the deck/design overlap and the workRequest keyword gap.
**Smallest fix:** Pin three fixtures: deck request without workRequest verbs (→ pptxx), pure design (→ crucible), overlapping "슬라이드 디자인" with the decided winner asserted.

**[Nit]** M5 greps wrong string — import name is `pptx`; grep `pptx|python` or assert no python spawn in suite.
**[Nit]** M3: test (b) covers only hooks.json + .zcode-plugin/plugin.json; say "add to (b)" and define keyword assertion.
**[Nit]** M2 "(a)–(j) 무변경 통과" ambiguous — (a) output necessarily changes; say "existing assertions pass unmodified".

**Survived attacks:** M1∥M2 disjointness; M1 pptx spike criterion properly binary; ${ZCODE_PLUGIN_ROOT} claim; receiptProblems/dispatch fail-open matches (h); M5's Python-env dependence acceptable.
**Summary:** 4 Blocking, 4 Concern, 3 Nit. No Structural.
