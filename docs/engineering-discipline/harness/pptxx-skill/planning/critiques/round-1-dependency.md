# Round 1 — Dependency & Ordering Critic (vs DRAFT v1)

**[Blocking] Finding:** The visual-qa enforcement logic in `pptxxGate` has no home in the DAG — M4's success criteria test gate behavior that M4 is not allowed to implement, and M2's success criteria never require implementing it.
**Where:** M4 (h)-mirror visual-qa scenario with Files: no `stop-gate.js`; M2 SC covers only seal + anonymous "APPROVE 수령증". Same homeless-logic problem for Brief SC2 (image panel unanimity): no milestone tests that gate branch at all.
**Smallest fix:** Move visual-qa-receipt and image-panel-receipt blocking scenarios into M2's SC (M2 fixes state field names and evidence tails; M4 adds only agent-existence checks), or add stop-gate.js to M4's list and drop the "M2 finalizes enforcement" claim.

**[Blocking] Finding:** M2 wires a live `route-intent.js` deck branch that routes users to a skill that will not exist until M3, contradicting M2's "dormant code" abort-point claim.
**Where:** M2 route-intent SC vs "Abort Point: Yes — 휴면 코드; 기존 동작 무결". route-intent fires on every prompt (hooks.json:16-28).
**Failure scenario:** In the M2→M3 window (or permanent at M2 abort), deck prompts inject "invoke the pptxx skill" for a nonexistent skill → model errors or improvises an ungated deck workflow. "기존 동작 무결" is false.
**Smallest fix:** Move route-intent modification (and test) from M2 to M3 (M3 touches no hook scripts today; edge M2→M3 already exists). Alternative: gate the hint on fs.existsSync(skills/pptxx/SKILL.md).

**[Blocking] Finding:** M5's Dependencies field omits M4 even though both modify `skills/pptxx/SKILL.md` and `tests/gates.test.js`; the ordering exists only as prose in the Execution Order section, not as a DAG edge.
**Failure scenario:** An executor deriving schedule from Dependencies fields dispatches M4∥M5 → same-file clobber. Machine-readable edges contradict prose = defective by construction.
**Smallest fix:** Add M4 to M5's Dependencies (one line).

**[Concern] Finding:** M2 must choose gate model + terminal/opt-in status semantics before M5 exists; no M5 criterion verifies the interaction.
**Smallest fix:** M5 SC: (h)-mirror test — post-deck opt-in state produces no block; M2 SC names the exact status string.

**[Concern] Finding:** M1 ∥ M2 both carry "node tests/gates.test.js 통과" while running concurrently in an unspecified execution environment — M1's suite run can catch M2's half-edited stop-gate.js (suite is repo-global: test (a) node --checks every hooks/scripts/*.js).
**Smallest fix:** State worktree isolation for M1∥M2, or downgrade M1's criterion to "저장소 소스 무접촉 확인" and drop the global test run.

**[Concern] Finding:** M2 is the authority for the entire pptxx state protocol but only encodes it as test scenarios; M3 has a cross-check criterion against it, M4 does not.
**Smallest fix:** Copy M3's cross-check criterion into M4: "M4가 SKILL.md에 추가하는 모든 state 필드·증거 경로가 tests/gates.test.js의 pptxx 케이스와 문자열 불일치 0건."

**[Nit] Finding:** `planKey()` decks/ alternation must cover actual deck extensions (`.html`) or seal keys silently degrade to full-path fallback.
**Smallest fix:** M2 SC: `planKey('docs/glm-hammer/decks/<d>/deck.html')` returns the normalized relative key (unit assertion).

**[Nit] Finding:** M3's "`.claude-plugin/plugin.json` 파싱 통과" implies an undeclared suite change — test (b) parses only hooks.json and .zcode-plugin/plugin.json today.
**Smallest fix:** Reword to "test (b) 목록에 .claude-plugin/plugin.json 추가".

**Survived attacks:** no cycles; M1/M2 disjoint incl. hook path filters; tests/gates.test.js multi-writer serialized by chain (given finding 3 fixed); M1→M5 spike-consumption edge exists; hooks wiring order fine; ${ZCODE_PLUGIN_ROOT} verified.
**Summary:** 3 Blocking, 3 Concern, 2 Nit. No Structural.
