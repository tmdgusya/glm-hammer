---
name: forge
description: Strong planning mode. Use when the user requests a non-trivial feature, refactor, or system change — especially when the request is ambiguous, spans multiple files, or says "제대로", "강하게", "빡세게", "thoroughly", "strong plan". Runs deep codebase recon BEFORE asking any question, drafts an executable plan, then requires unanimous approval from a panel of 3+ critic subagents before the plan may be presented. Hooks enforce the critic gate.
---

# Forge — Strong Planning

Forges a plan the way steel is forged: heat it with recon, shape it into a draft, then hammer it on the anvil of a critic panel until it holds. A plan leaves the forge only when **at least 3 independent critic subagents unanimously confirm it is actually implementable** against the real codebase.

## Core Principle

Exploration precedes questions; critics precede presentation. The user should never be asked something the codebase can answer, and never be shown a plan that has not survived adversarial review.

## Hard Gates (hook-enforced)

1. **Recon before questions.** Dispatch exploration subagents FIRST. Ask the user only what recon provably cannot answer, and cite recon findings in every question.
2. **Critic panel is mandatory.** Before the plan is presented to the user, dispatch the three critic agents (`feasibility-critic`, `integration-critic`, `coverage-critic`) in parallel. All must return `APPROVE`. The Stop hook blocks turn completion while approvals are missing.
3. **Any plan edit creates a new generation.** A tracked edit reseals the whole plan, records the complete declared-path baseline, advances the generation, and invalidates every earlier approval. Re-run the full panel after every revision. Later live filesystem state must never be used to reinterpret the sealed generation.
4. **No verdict without metadata-v1 provenance.** Preallocate a unique dispatch ID before invoking each critic and include `runId`, `generation`, `role`, `evidencePath`, `planSha256`, `forgeRound`, and `dispatchId` in the approved tool input and prompt. Each critic writes its receipt under `.glm-hammer/evidence/critics/round-<N>/<critic-name>.md`, ends with `EVIDENCE_RECORDED: <path>`, and uses this exact ordered header before `CHECKS:`:
   `RECEIPT_VERSION: 1`, `RUN_ID: <uuid>`, `ROLE: <critic-name>`, `EVIDENCE_PATH: <path>`, `PLAN_SHA256: <64 lowercase hex>`, `GENERATION: <canonical nonnegative decimal>`, `FORGE_ROUND: <positive integer>`, `DISPATCH_ID: <uuid>`.
   The Stop hook accepts only a matching journaled `CORE_DISPATCH_COMPLETED`; a projection claim or self-written receipt earns no credit.
5. **The plan file is written via the Write/Edit tools only.** Every tracked write reseals its complete bytes and declared-path baseline. Editing via Bash, a missing/broken seal, an incomplete baseline, or an untracked generation blocks.
6. **No placeholders.** TBD / TODO / "implement later" / criteria requiring interpretation are plan failures.
7. **The certified journal is authoritative.** `.glm-hammer/state.json` is a disposable projection only. Request legal phase transitions through the registered core hook flow; never edit the projection to manufacture approval, awaiting-user, or completion.

## State Protocol

The certified journal is the authority for run ID, generation, legal transitions, critic dispatch completion, question proof, and terminal state. Keep `.glm-hammer/state.json` only as the hook-maintained projection shown below; direct edits do not confer credit:

```json
{
  "phase": "forge",
  "status": "recon | drafting | critique | awaiting-user | approved",
  "plan": "docs/glm-hammer/plans/YYYY-MM-DD-<feature>.md",
  "critics": {
    "required": 3,
    "approved": 0,
    "round": 1,
    "verdicts": [
      { "critic": "feasibility-critic", "verdict": "APPROVE|REJECT", "round": 1 }
    ]
  },
  "stopBlocks": 0
}
```

Rules:
- Request the legal `awaiting-user` transition only when a user answer is genuinely required and the structural question proof exists. Do not write the projection to create it.
- Request approval only after all required current-generation `CORE_DISPATCH_COMPLETED` events and matching APPROVE receipts exist. The journal computes the projected approval; never write it yourself.
- Add `.glm-hammer/` to `.gitignore` if the project has one and it is not already listed.

- A question round may pause only after the approved structural question observer records proof. Raw transcript markers never release forge. With current unconsumed proof, the exact whole trimmed request `glm-hammer override-unverified RUNID GENERATION` may atomically end that run as UNVERIFIED, never PASS. Without structural proof or approved runtime identity there is no override; remain fail-closed.

## Process

### Phase 1: Deep Recon (before any question) ⟨state: recon⟩

Dispatch **2-4 Explore subagents in parallel**, sliced by concern, e.g.:

- **Structure**: file layout, module boundaries, naming conventions in the affected area
- **Patterns**: how the codebase already does the closest existing thing (error handling, state, data flow)
- **Boundaries**: interfaces, dependencies, shared state the change will touch
- **Verification**: test infrastructure — e2e / integration / unit / build+lint, exact commands

Prompt template per subagent:

```
subagent_type: Explore
prompt: |
  The user requested: [summarized request].
  Investigate [concern slice] and report:
  1. Related files and each one's role
  2. Existing patterns to follow or conflict with
  3. Boundaries/dependencies this work will touch
  4. Recent related changes; existing test coverage and exact test commands
  Report key findings concisely. Do not dump file contents.
```

### Phase 2: Minimal Question Round ⟨state: awaiting-user if asked⟩

After recon returns, list remaining ambiguities. For each, first check: *can recon answer this?* If yes, answer it yourself. Bundle the survivors (max 4, independent only) into ONE AskUserQuestion round, each grounded in findings ("recon shows X in `services/y.ts` — follow or replace?"). If nothing survives, ask nothing and proceed. Prefer proposing a defensible default over asking. A pause is valid only after the capability-selected observer records approved structural question proof; raw prompt/transcript text is not proof.

### Phase 3: Draft the Plan ⟨state: drafting⟩

Write the plan to `docs/glm-hammer/plans/YYYY-MM-DD-<feature>.md`. The plan must be executable by a worker with zero context:

**Header:** Goal (one sentence), Architecture (2-3 sentences), Tech Stack, Work Scope (in/out), and a **Verification Strategy** (level: e2e | integration | test-suite | build-only, exact command, what passing proves — discovered in recon; if none exists, Task 1 creates minimal verification).

**Declared paths:** every path appears in a task's Files list. At seal time, the hook records the complete normalized path map as ABSENT, FILE, or SYMLINK. Do not add generated flags, self-hashes, directories, special files, duplicate-normalized paths, or out-of-root paths.

**Tasks** use this strict grammar:

```markdown
### Task N: [Name]
**Goal:** [one sentence — copied verbatim into validator prompts later]
**Dependencies:** None
**Files:**
- Create: `path/to/new-file`
- Modify: `path/to/existing-file`
- Test: `path/to/test-file`
**Acceptance Criteria:**
- [ ] [binary-decidable outcome]
**Step 1:** [one concrete action with actual code/command and expected output]
```

Tasks are contiguous from 1. Dependencies are exactly `None` or comma-space-separated, strictly ascending unique lower `Task N` references; every repeated writer and consumer of an earlier creation has a transitive dependency. File entries are exactly `- Create: \`path\``, `- Modify: \`path\``, or `- Test: \`path\`` with one repository-relative path. Acceptance items are column-one unchecked checkboxes, and steps are contiguous exact `**Step N:**` markers. Create/Modify/Test legality is evaluated against the sealed generation baseline plus virtual task order, never the later live workspace. Every task has at least one criterion; criteria are decidable outcomes, not implementation choices. The last task is Final Verification and runs the Verification Strategy plus the full suite.

### Phase 4: The Anvil — Critic Panel ⟨state: critique⟩

Dispatch the three critics **in parallel**, each as a subagent via the Agent tool:

| Agent | Lens |
|---|---|
| `feasibility-critic` | Can each task actually be implemented as written against the real codebase? |
| `integration-critic` | Dependencies, interface contracts, parallel-task file conflicts, shared state |
| `coverage-critic` | Spec coverage, criteria decidability, placeholder scan, verification completeness |

For each critic, first preallocate the dispatch ID. The approved tool input and prompt receive ONLY the plan path, original request verbatim, evidence path, and the exact metadata tuple `runId`, `generation`, `role`, `evidencePath`, `planSha256`, `forgeRound: <N>`, `dispatchId`. Not your reasoning or recon summaries. All tuple values must describe the same sealed generation.

Each critic answers its fixed checklist, writes the ordered metadata-v1 header followed by its full `CHECKS:` report, and ends with `EVIDENCE_RECORDED: <path>`. Before projecting a verdict, confirm that the receipt and journaled `CORE_DISPATCH_COMPLETED` match byte-for-byte provenance, timing, stat, and hash requirements. A missing dispatch, late allocation, stale generation, mismatched role/path/hash, or self-written receipt has not approved anything.

If the runtime does not expose named critic types, a general-purpose subagent may use the corresponding `agents/<name>.md` body, but it still receives the same preallocated approved input and metadata-v1 contract. Unsupported Agent observation or unapproved runtime identity is fail-closed; it never enables a legacy/degraded forge PASS.

- **All APPROVE** → request the legal journal transition to approved; the hook projects it only after all current-generation receipts validate.
- **Any REJECT** → revise the plan addressing every finding. The tracked edit creates the next sealed generation and invalidates approvals; re-dispatch the FULL panel using the next positive forge round. Findings you disagree with are answered in a `## Critic Responses` section, not ignored.
- **Round > 3** → present the deadlock only after structural question proof permits the legal awaiting-user transition.

### Phase 5: Present and Hand Off ⟨state: awaiting-user⟩

Present a compact summary (goal, task count, verification strategy, critic rounds survived) with the plan path. Ask one question: **proceed with `hammer` now?**

- Yes → invoke the `hammer` skill immediately. Do not wait for further instructions.
- Revisions requested → apply, re-run the panel (Phase 4), re-present.

## Anti-Patterns

| Anti-Pattern | Why It Fails |
|---|---|
| Asking the user before recon returns | Generic questions the code could answer; burns user trust |
| Presenting the plan before the panel passes | The whole point of forge; also the Stop hook will block you |
| Re-running only the rejecting critic after a revision | A revision can break what another critic approved; full panel or nothing |
| Softening a criterion so a critic approves | Reward hacking — critics verify implementability, not agreeableness |
| Writing `status: approved` to state without real verdicts | Falsified state; hooks exist because this is tempting |
| Treating critic REJECT as noise ("plan is fine") | If 1 of 3 independent reviewers can't see how to implement it, a worker won't either |
