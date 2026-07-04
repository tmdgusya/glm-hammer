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
3. **Any plan edit invalidates approvals.** The PostToolUse hook resets the approval count when the plan file changes. Re-run the full panel after every revision.
4. **No verdict without a receipt.** Each critic writes its own verdict file under `.glm-hammer/evidence/critics/round-<N>/<critic-name>.md` and ends its final message with `EVIDENCE_RECORDED: <path>`. The Stop hook verifies the receipts on disk — an approval claimed in state without a matching `VERDICT: APPROVE` receipt blocks the turn. Receipts are also checked for substance (`CHECKS:` block + real content) and must be **dispatch-backed**: each critic's dispatch prompt must contain its evidence path — the hooks record every subagent dispatch and reject receipts no critic was pointed at. Writing a receipt yourself therefore does not work.
5. **The plan file is written via the Write/Edit tools only.** Every tracked write reseals its content hash; editing the plan via Bash (redirection, sed, heredoc) breaks the seal, voids all approvals, and the Stop hook blocks until the plan is re-saved via Write.
6. **No placeholders.** TBD / TODO / "implement later" / criteria requiring interpretation are plan failures.
7. **Keep `.glm-hammer/state.json` current.** Hooks read it to enforce the gates — see State Protocol below.

## State Protocol

Maintain `.glm-hammer/state.json` at the project root. Update it at every checkpoint marked ⟨state⟩ in the process below. Shape:

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
- Set `status: "awaiting-user"` **before ending a turn that needs a user answer** (question rounds, plan approval). Otherwise the Stop hook will bounce you back.
- Never write `approved` yourself unless `critics.approved >= critics.required` with all verdicts `APPROVE` in the current round. The hooks cross-check this; falsifying state is a protocol violation.
- Add `.glm-hammer/` to `.gitignore` if the project has one and it is not already listed.

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

After recon returns, list remaining ambiguities. For each, first check: *can recon answer this?* If yes, answer it yourself. Bundle the survivors (max 4, independent only) into ONE AskUserQuestion round, each grounded in findings ("recon shows X in `services/y.ts` — follow or replace?"). If nothing survives, ask nothing and proceed. Prefer proposing a defensible default over asking.

### Phase 3: Draft the Plan ⟨state: drafting⟩

Write the plan to `docs/glm-hammer/plans/YYYY-MM-DD-<feature>.md`. The plan must be executable by a worker with zero context:

**Header:** Goal (one sentence), Architecture (2-3 sentences), Tech Stack, Work Scope (in/out), and a **Verification Strategy** (level: e2e | integration | test-suite | build-only, exact command, what passing proves — discovered in recon; if none exists, add Task 0 creating minimal verification).

**File structure mapping:** every file to create/modify, anchored by symbol names (never line numbers).

**Tasks**, each with:

```markdown
### Task N: [Name]
**Goal:** [one sentence — copied verbatim into validator prompts later]
**Dependencies:** [Task K | None (can run in parallel)]
**Files:** Create/Modify (anchor: symbol)/Test — exact paths
**Acceptance Criteria:**
- [ ] [binary-decidable: "`pytest tests/x.py::test_y` passes", "POST /api/users without email returns 400"]
- [ ] **Step 1..N:** one action each, with actual code blocks and exact commands + expected output
```

Criteria rules: every task has ≥1 criterion; every criterion is decidable by reading code and running commands with zero judgment; verdict is the AND of criteria; criteria state outcomes, not implementation. Parallel tasks must not touch the same file. The last task is always a **Final Verification Task** running the Verification Strategy command plus the full test suite.

### Phase 4: The Anvil — Critic Panel ⟨state: critique⟩

Dispatch the three critics **in parallel**, each as a subagent via the Agent tool:

| Agent | Lens |
|---|---|
| `feasibility-critic` | Can each task actually be implemented as written against the real codebase? |
| `integration-critic` | Dependencies, interface contracts, parallel-task file conflicts, shared state |
| `coverage-critic` | Spec coverage, criteria decidability, placeholder scan, verification completeness |

Each critic receives ONLY: the plan file path, the original user request (verbatim), and its **evidence output path** `.glm-hammer/evidence/critics/round-<N>/<critic-name>.md`. Not your reasoning, not recon summaries — critics re-verify against the codebase themselves.

Each critic answers a **fixed binary checklist** (YES/NO per question defined in its agent file; verdict = APPROVE iff all YES/N-A — computed, not felt), writes its full report to its evidence path, and ends with `EVIDENCE_RECORDED: <path>`. Before recording a verdict in state, confirm the receipt exists and its `VERDICT:` line matches what the critic reported — a critic that returned APPROVE but wrote no file (or wrote REJECT) has not approved anything. Record every verified verdict in state ⟨state: critics.verdicts, critics.approved⟩.

If the runtime does not expose the critics as named agent types, read each definition from this plugin's `agents/<name>.md` and dispatch a general-purpose subagent with that file's body as its instructions plus the three inputs above.

- **All APPROVE** → panel passed. ⟨state: approved is set only now⟩
- **Any REJECT** → revise the plan addressing every finding (the PostToolUse hook resets approvals when you edit the plan), increment `critics.round`, re-dispatch the FULL panel. Findings you disagree with are answered in a `## Critic Responses` section of the plan, not ignored.
- **Round > 3** → stop, present the deadlock to the user with the unresolved findings. ⟨state: awaiting-user⟩

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
