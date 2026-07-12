# glm-hammer 하니스 강화 엄격 실행 계약

이 파일은 승인된 Ralplan Planner 산출물의 Task 1–7 엄격 문법 블록을 clean-checkout 검증용으로 고정한 사본이다. 런타임 identity 변경은 `2026-07-12-harness-hardening-runtime-amendment.md`가 우선한다.

## File-level changes

### Task 1: Runtime Capability Capture and Approval
**Goal:** Prove exact runtime identity environment propagation, commit sanitized mandatory fixtures, select one question observer, and record stable Architect approval before product changes.
**Dependencies:** None
**Files:**
- Modify: `.zcode-plugin/plugin.json`
- Modify: `.claude-plugin/plugin.json`
- Modify: `README.md`
- Modify: `README.ko.md`
- Create: `docs/glm-hammer/plans/2026-07-12-harness-hardening-execution.md`
- Create: `docs/glm-hammer/plans/2026-07-12-harness-hardening-runtime-amendment.md`
- Create: `tests/fixtures/runtime/README.md`
- Create: `tests/fixtures/runtime/manifest.json`
- Create: `tests/fixtures/runtime/session-start-normal.json`
- Create: `tests/fixtures/runtime/session-start-compact.json`
- Create: `tests/fixtures/runtime/user-prompt-submit.json`
- Create: `tests/fixtures/runtime/stop.jsonl`
- Create: `tests/fixtures/runtime/agent-task-post-tool-use.json`
- Create: `tests/fixtures/runtime/parallel-agent-task-post-tool-use.json`
- Create: `tests/fixtures/runtime/capabilities.json`
- Create: `tests/fixtures/runtime/capability-matrix.json`
- Create: `tests/fixtures/runtime/source/1783832545563-164732-SessionStart.json`
- Create: `tests/fixtures/runtime/source/1783832545584-164739-UserPromptSubmit.json`
- Create: `tests/fixtures/runtime/source/1783832550483-164827-PostToolUse.json`
- Create: `tests/fixtures/runtime/source/1783832553341-164883-Stop.json`
- Create: `tests/fixtures/runtime/source/1783832572766-165331-SessionStart.json`
- Create: `tests/fixtures/runtime/source/1783832593497-165790-SessionStart.json`
- Create: `tests/fixtures/runtime/source/1783832593523-165797-UserPromptSubmit.json`
- Create: `tests/fixtures/runtime/source/1783832597740-165885-PostToolUse.json`
- Create: `tests/fixtures/runtime/source/1783832598122-165899-PostToolUse.json`
- Create: `tests/fixtures/runtime/source/1783832600486-165944-Stop.json`
- Create: `tests/fixtures/runtime/architect-approval-receipt.json`
- Create: `tests/fixtures/runtime/approval.json`
- Create: `tests/runtime-capture.js`
- Create: `tests/runtime-capture.sh`
- Create: `tests/runtime-fixture-contract.test.js`
- Create: `tests/runtime-capture-contract.test.js`
- Modify: `tests/gates.test.js`
**Acceptance Criteria:**
- [ ] Exact exported identity and the exact exported `GLM_HAMMER_CAPTURE_DIR` reach every temporary hook process; capture and promotion consume the same directory value.
- [ ] The exact command sequence starts by creating the capture directory, installs the stated cleanup trap, has no undocumented directory precondition, and removes the directory on failure or success with the stated trap/cleanup commands.
- [ ] Mandatory fixtures pass sanitizer, source/hash, identity, and unknown-field checks.
- [ ] Capabilities select exactly stop-transcript or unavailable by default; Ask and Bash rows remain unsupported without payload files.
- [ ] Stable Architect receipt and approval validate; command prints exactly RUNTIME_CAPABILITY_APPROVED.
- [ ] Propagation, directory validation, or cleanup failure blocks Tasks 2–7.
**Step 1:** Add red fixture, sanitizer, exact-match, mismatch, absent, malformed, inheritance, capture-directory identity, nonempty/out-of-root directory, and trap cleanup tests; run `node tests/runtime-fixture-contract.test.js --approval tests/fixtures/runtime/approval.json`; expect nonzero before capture/approval.
**Step 2:** Run the exact environment, capture, promotion, trap-removal, and cleanup commands in Normative Runtime Contract; expect `CAPTURE_ENVIRONMENT_OK`, `CAPTURE_PLUGIN_READY`, then `RUNTIME_FIXTURES_PROMOTED`, and confirm the capture directory is absent after the final command.
**Step 3:** Run Architect Phase-0 review, create the stable receipt and approval with exact hashes, then rerun `node tests/runtime-fixture-contract.test.js --approval tests/fixtures/runtime/approval.json`; expect exactly `RUNTIME_CAPABILITY_APPROVED`.
**Step 4:** Run `node tests/gates.test.js`; expect exit zero and no FAIL.

### Task 2: Journal Authority, Platform Certification, and Phase Dispatch
**Goal:** Add certified local concurrent journal authority, router arming, legal core transitions, and exact legacy guard preservation.
**Dependencies:** Task 1
**Files:**
- Create: `tests/journal-stress.test.js`
- Create: `tests/fixtures/runtime/journal-stress-result.json`
- Create: `tests/fixtures/runtime/platform-certification.json`
- Modify: `hooks/scripts/lib.js`
- Modify: `hooks/scripts/route-intent.js`
- Modify: `hooks/scripts/session-start.js`
- Modify: `hooks/scripts/stop-gate.js`
- Modify: `skills/blueprint/SKILL.md`
- Modify: `skills/forge/SKILL.md`
- Modify: `skills/hammer/SKILL.md`
- Modify: `tests/gates.test.js`
**Acceptance Criteria:**
- [ ] Verified matched requests arm; public core idle/done/awaiting/cap cannot disarm.
- [ ] Legal core transitions pass; illegal edge/run/resume and forge done/unknown block.
- [ ] Legacy marker, awaiting, cap, done, resume, deck, and design fixtures preserve current ordering/results.
- [ ] Local stress, ownerless/stale lock, owner-token release, crash repair, rotation, and exact certification pass.
- [ ] Journal deletion plus nonidle state blocks without claiming migration; both-deleted case is labeled undetectable.
**Step 1:** Add red transition, guard, lock, corruption, concurrency, and residual tests; run `node tests/gates.test.js`; expect new failures.
**Step 2:** Implement journal envelope, lock/repair, snapshot rebuild, router arming, core/legacy dispatch split, and transition validation.
**Step 3:** Run `node tests/journal-stress.test.js --platform-contract tests/fixtures/runtime/capabilities.json --fs-kind local --write-result tests/fixtures/runtime/journal-stress-result.json --write-certification tests/fixtures/runtime/platform-certification.json`; expect exactly `JOURNAL_PLATFORM_CERTIFIED`.
**Step 4:** Run syntax checks and `node tests/gates.test.js`; expect exit zero and no FAIL.

### Task 3: Capability-Selected Question Proof and Atomic UNVERIFIED
**Goal:** Remove utterable core pressure escape and implement a reachable fault-safe one-event UNVERIFIED terminal without changing legacy escapes.
**Dependencies:** Task 2
**Files:**
- Create: `hooks/scripts/question-observer.js`
- Modify: `hooks/hooks.json`
- Modify: `hooks/scripts/lib.js`
- Modify: `hooks/scripts/session-start.js`
- Modify: `hooks/scripts/route-intent.js`
- Modify: `hooks/scripts/stop-gate.js`
- Modify: `skills/blueprint/SKILL.md`
- Modify: `skills/forge/SKILL.md`
- Modify: `skills/hammer/SKILL.md`
- Modify: `tests/gates.test.js`
**Acceptance Criteria:**
- [ ] Core assistant/user/tool/raw markers never release; approved structural proof is one-shot.
- [ ] Observer script is always present; Ask registration exists only when Task 1 approved Ask support, otherwise hooks retain supported events only.
- [ ] SessionStart→question→Stop→override→silent Stop→replay→new-run sequence passes.
- [ ] Fault before complete terminal event leaves proof reusable; torn-tail repair then retry emits one terminal event.
- [ ] Projection has no verified fields; absent verified UserPromptSubmit disables override; legacy behavior is unchanged.
**Step 1:** Add red marker, observer selection, exact token, restart, replay, fault-injection, torn-tail, cancel, and next-run tests; run full suite and expect failures.
**Step 2:** Implement selected observer/no-op script, core proof logic, and one composite terminal transaction. Modify hook registration only according to approved selection; if selection changes, stop for plan amendment and reapproval.
**Step 3:** Run `node --check hooks/scripts/question-observer.js`, parse `hooks/hooks.json`, and run `node tests/gates.test.js`; expect exit zero and no FAIL.

### Task 4: Plan Generation, Receipt and Dispatch Provenance, and Migration
**Goal:** Bind current plan approvals to normative receipt/dispatch schemas, seal generation-relative declared-path baselines, and migrate legacy core runs without old approval credit.
**Dependencies:** Task 3
**Files:**
- Create: `tests/dispatch-stress.test.js`
- Create: `tests/migration-contract.test.js`
- Create: `tests/fixtures/receipts/positive.json`
- Create: `tests/fixtures/receipts/negative.json`
- Create: `tests/fixtures/dispatch/positive.json`
- Create: `tests/fixtures/dispatch/negative.json`
- Create: `tests/fixtures/migration/legacy-core-run/state.json`
- Create: `tests/fixtures/migration/legacy-core-run/plan-seal.json`
- Create: `tests/fixtures/migration/legacy-core-run/plan.md`
- Create: `tests/fixtures/migration/legacy-core-run/evidence/critics/round-1/feasibility.md`
- Create: `tests/fixtures/migration/legacy-core-run/evidence/critics/round-1/integration.md`
- Create: `tests/fixtures/migration/legacy-core-run/evidence/critics/round-1/coverage.md`
- Create: `tests/fixtures/migration/legacy-core-run/evidence/tasks/task-1/validator.md`
- Create: `tests/fixtures/migration/legacy-core-run/evidence/tasks/task-1/critic.md`
- Create: `tests/fixtures/migration/legacy-core-run/evidence/e2e.md`
- Create: `tests/fixtures/migration/legacy-core-run/evidence/reviews/security.md`
- Create: `tests/fixtures/migration/legacy-core-run/evidence/reviews/qa.md`
- Create: `tests/fixtures/migration/legacy-core-run/expected.json`
- Create: `tests/fixtures/migration/corrupt-state/state.json`
- Create: `tests/fixtures/migration/corrupt-state/expected.json`
- Create: `tests/fixtures/migration/corrupt-seal/state.json`
- Create: `tests/fixtures/migration/corrupt-seal/plan.md`
- Create: `tests/fixtures/migration/corrupt-seal/plan-seal.json`
- Create: `tests/fixtures/migration/corrupt-seal/expected.json`
- Create: `tests/fixtures/migration/corrupt-plan/state.json`
- Create: `tests/fixtures/migration/corrupt-plan/plan-seal.json`
- Create: `tests/fixtures/migration/corrupt-plan/plan.md`
- Create: `tests/fixtures/migration/corrupt-plan/expected.json`
- Create: `tests/fixtures/migration/corrupt-journal/state.json`
- Create: `tests/fixtures/migration/corrupt-journal/plan.md`
- Create: `tests/fixtures/migration/corrupt-journal/plan-seal.json`
- Create: `tests/fixtures/migration/corrupt-journal/control-events.jsonl`
- Create: `tests/fixtures/migration/corrupt-journal/expected.json`
- Create: `tests/fixtures/migration/unreadable-state/error.json`
- Create: `tests/fixtures/migration/unreadable-state/expected.json`
- Modify: `hooks/scripts/lib.js`
- Modify: `hooks/scripts/plan-gate.js`
- Modify: `hooks/scripts/dispatch-log.js`
- Modify: `hooks/scripts/stop-gate.js`
- Modify: `skills/forge/SKILL.md`
- Modify: `skills/hammer/SKILL.md`
- Modify: `agents/feasibility-critic.md`
- Modify: `agents/integration-critic.md`
- Modify: `agents/coverage-critic.md`
- Modify: `agents/implementation-critic.md`
- Modify: `agents/security-reviewer.md`
- Modify: `agents/qa-reviewer.md`
- Modify: `tests/gates.test.js`
**Acceptance Criteria:**
- [ ] Preallocated dispatch IDs correlate prompt, receipt, and completion; duplicate semantics are exact.
- [ ] All timestamp future/order and stable stat/hash/stat cases return deterministic codes.
- [ ] Plan tracked edit reseals, advances generation, and records complete canonical `PLAN_PATH_BASELINE`; missing/broken seal, missing baseline, and Bash edit block.
- [ ] Legacy approvals receive no credit; valid migration blocks for fresh redispatch.
- [ ] Malformed/unreadable fixtures quarantine unchanged bytes and append no migration event; migration command prints MIGRATION_CONTRACT_OK.
**Step 1:** Add red receipt, dispatch, seal, path-baseline, stress, migration, fs-adapter, and quarantine tests; expect failures.
**Step 2:** Implement generation, syntax-first path enumeration, sealed `PLAN_PATH_BASELINE`, preallocated ID contracts, receipt/dispatch validators, migration/quarantine, and agent instructions.
**Step 3:** Run `node tests/dispatch-stress.test.js`; expect exit zero. Run `node tests/migration-contract.test.js`; expect exactly `MIGRATION_CONTRACT_OK`.
**Step 4:** Run syntax checks and full suite; expect exit zero and no FAIL.

### Task 5: Strict Plan Obligation Derivation
**Goal:** Derive complete hammer obligations from whole sealed-plan SHA using exact task, dependency, generation-relative file, acceptance, and step grammar.
**Dependencies:** Task 4
**Files:**
- Create: `tests/fixtures/plans/positive.json`
- Create: `tests/fixtures/plans/negative.json`
- Create: `tests/fixtures/plans/generation-baseline.json`
- Create: `tests/plan-contract.test.js`
- Modify: `hooks/scripts/lib.js`
- Modify: `hooks/scripts/plan-gate.js`
- Modify: `hooks/scripts/stop-gate.js`
- Modify: `skills/blueprint/SKILL.md`
- Modify: `skills/forge/SKILL.md`
- Modify: `skills/hammer/SKILL.md`
- Modify: `agents/implementation-critic.md`
- Modify: `tests/gates.test.js`
**Acceptance Criteria:**
- [ ] Parser accepts this Task 1–7 structure both immediately after generation sealing and after Tasks 1–4 materialize declared Create paths; it never substitutes later live filesystem state for the sealed baseline.
- [ ] Create requires baseline/virtual ABSENT and transitions virtual state to FILE; Modify/Test require baseline or earlier virtual FILE/SYMLINK; missing/incomplete baseline blocks deterministically.
- [ ] Parser rejects noncontiguous IDs, invalid dependencies, files, acceptance, steps, baseline entries, or virtual transitions.
- [ ] Cross-task path writers require deterministic transitive dependencies, and consumers of prior virtual creation depend transitively on its creating task.
- [ ] Ten tasks require twenty receipts regardless of public counters.
- [ ] No generated flag or duplicated self-hash exists.
**Step 1:** Add red positive/negative table-driven fixtures including CRLF, BOM, Unicode, fences, dependencies, sealed baseline states/types/hashes, same-task and cross-task virtual transitions, path conflicts, acceptance, and steps; include self-parse before execution and after earlier files materialize; expect failures.
**Step 2:** Implement pure parser over the sealed baseline and virtual task-order map; align blueprint/forge/hammer templates and implementation critic.
**Step 3:** Run syntax checks and `node tests/gates.test.js`; expect exit zero and no FAIL.

### Task 6: Source Snapshot and Review Freshness
**Goal:** Bind final reviews to the current generation and exact recorded bounded declared, dirty-baseline, and committed-diff source snapshot.
**Dependencies:** Task 5
**Files:**
- Create: `hooks/scripts/review-snapshot.js`
- Modify: `hooks/hooks.json`
- Create: `tests/snapshot.test.js`
- Modify: `hooks/scripts/lib.js`
- Modify: `hooks/scripts/plan-gate.js`
- Modify: `hooks/scripts/stop-gate.js`
- Modify: `skills/hammer/SKILL.md`
- Modify: `agents/security-reviewer.md`
- Modify: `agents/qa-reviewer.md`
- Modify: `tests/gates.test.js`
**Acceptance Criteria:**
- [ ] Every baseline-dirty path is type/content hashed; unchanged stays valid and changed invalidates.
- [ ] Edit→commit→clean, rename/delete→commit, reset/rebase, and ABSENT→content follow exact contract.
- [ ] Security/QA receipts contain ordered required `SOURCE_SNAPSHOT_SHA256`; approved tool input, prompt, receipt, and `CORE_DISPATCH_COMPLETED.sourceSnapshotSha256` equal the same generation's recorded review snapshot.
- [ ] Review dispatch requires `invocationMs >= SOURCE_REVIEW_SNAPSHOT_RECORDED.atMs`; pre-snapshot receipt/dispatch returns `CORE_REVIEW_PREDATES_SNAPSHOT`, missing binding returns `CORE_REVIEW_SNAPSHOT_MISSING`, and hash/run/generation disagreement returns `CORE_REVIEW_SNAPSHOT_MISMATCH`.
- [ ] Post-snapshot source mutation invalidates the bound reviews and requires a new snapshot plus security/QA redispatch before completion.
- [ ] Fixed exclusions are labeled outside assurance; no generated exception exists.
- [ ] Snapshot/read/history/bounds errors block; no-Git is declared-only; F11 remains open.
**Step 1:** Add red Git/no-Git, committed diff, exclusion, race, bound, ordered review-header, missing/mismatch, structurally valid pre-snapshot receipt/dispatch, and post-snapshot mutation tests; expect failures.
**Step 2:** Implement canonical snapshot, baseline/current HEAD union, exact snapshot propagation through review prompt/receipt/dispatch event, timing rule, deterministic error precedence, and completion-time source revalidation.
**Step 3:** Run `node tests/snapshot.test.js`; expect exactly `SNAPSHOT_CONTRACT_OK`. Run syntax/full suite; expect exit zero and no FAIL.

### Task 7: Final Verification
**Goal:** Prove all enabled runtime, journal, provenance, migration, generation-relative grammar, snapshot-bound review, seal, compatibility, and honesty contracts in one clean-checkout release gate.
**Dependencies:** Task 6
**Files:**
- Test: `tests/runtime-fixture-contract.test.js`
- Test: `tests/journal-stress.test.js`
- Test: `tests/dispatch-stress.test.js`
- Test: `tests/migration-contract.test.js`
- Test: `tests/snapshot.test.js`
- Test: `tests/gates.test.js`
**Acceptance Criteria:**
- [ ] Every command below exits zero and produces the stated output.
- [ ] Runtime capture tests prove the exact exported mktemp directory is passed to capture and promotion and removed by the exact trap/success cleanup sequence.
- [ ] Plan self-parse passes before task execution and after Tasks 1–4 create files, using the sealed generation baseline plus virtual task order; missing baseline blocks.
- [ ] Review tests prove ordered snapshot headers/correlation, pre-snapshot rejection, post-snapshot mutation invalidation, and all three deterministic core review error codes.
- [ ] No existing crucible/pptxx assertion is removed, skipped, weakened, or tightened.
- [ ] Plan/contract scanner reports no unfinished-work markers and validates this Task 1–7 grammar.
- [ ] Seal missing/broken/tracked-reseal/Bash-edit and commit/reset/rebase scenarios all pass.
- [ ] Findings disposition remains honest and F11 remains open.
**Step 1:** Run `node tests/runtime-fixture-contract.test.js --approval tests/fixtures/runtime/approval.json`; expect exactly `RUNTIME_CAPABILITY_APPROVED`.
**Step 2:** Run `node --check tests/runtime-capture.js`; `node --check hooks/scripts/lib.js`; `node --check hooks/scripts/session-start.js`; `node --check hooks/scripts/route-intent.js`; `node --check hooks/scripts/plan-gate.js`; `node --check hooks/scripts/dispatch-log.js`; `node --check hooks/scripts/question-observer.js`; `node --check hooks/scripts/stop-gate.js`; `node --check tests/gates.test.js`; expect every command exit zero with no stderr.
**Step 3:** Run `node tests/journal-stress.test.js --platform-contract tests/fixtures/runtime/capabilities.json --fs-kind local --verify-result tests/fixtures/runtime/journal-stress-result.json --verify-certification tests/fixtures/runtime/platform-certification.json`; expect exactly `JOURNAL_PLATFORM_CERTIFIED`.
**Step 4:** Run `node tests/dispatch-stress.test.js`; expect exit zero. Run `node tests/migration-contract.test.js`; expect exactly `MIGRATION_CONTRACT_OK`. Run `node tests/snapshot.test.js`; expect exactly `SNAPSHOT_CONTRACT_OK`.
**Step 5:** Run `node tests/gates.test.js`; expect exit zero and no line beginning `FAIL`.
**Step 6:** Run `node tests/gates.test.js --scan-plan-and-contracts`; expect exactly `PLAN_AND_CONTRACTS_CLEAN`; scanner rejects the unfinished-work marker words defined in its fixture, angle-bracket substitution tokens, noncontiguous tasks, invalid dependencies, missing generation path baselines, and missing steps without embedding those rejected words in this executable plan.
**Step 7:** Inspect final diff and test output; confirm only Task 1–6 files changed, platform/runtime approvals exact-match, strict stdout has no extra keys, all seven supported-event assumptions remain valid, both reviews bind the final unchanged snapshot and postdate its event, the plan self-parses independently of later file materialization, and no F11 completion claim exists.
