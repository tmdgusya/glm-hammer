---
name: hammer
description: Implementation loop. Use when a plan document exists (from forge or blueprint) and implementation should run — including when the user says "implement", "execute the plan", "구현해", "실행해", or approves a plan. Executes tasks through a worker → validator → implementation-critic loop, then a security/QA review gate; any failure loops back to rework. Hooks block turn completion until every task and review passes.
---

# Hammer — Implementation Loop

Strikes until the metal holds. Every task runs a **worker → validator → implementation-critic** cycle; the whole run ends with an E2E gate and a **security + QA review panel**. Any FAIL at any layer sends the work back — the Stop hook will not let the turn end while the loop is open.

## Core Principle

The main agent orchestrates; it never implements or judges inline. Workers build, validators judge the contract, critics hunt fakery, reviewers attack the result. Each role is a separate subagent with only the information its role requires.

All judges answer **fixed binary checklists** (YES/NO per question, verdict = AND) — never holistic impressions. If the runtime does not expose `implementation-critic` / `security-reviewer` / `qa-reviewer` as named agent types, read the definition from this plugin's `agents/<name>.md` and dispatch a general-purpose subagent with that file's body as its instructions.

## Hard Gates (hook-enforced)

1. **Read the plan first.** Review the entire plan critically before executing. Missing Goals or non-decidable criteria → return to `forge`/`blueprint`.
2. **Worker, validator, and critic are separate subagents.** Never inline. Never share the worker's output with the validator or critic.
3. **Criteria are binding; steps are the route.** Workers adapt minimally when reality contradicts a step, and report the deviation. Weakening a criterion to pass is reward hacking — prohibited.
4. **Parallelizable tasks run in parallel.** No shared files, no dependencies → dispatch concurrently. Parallel workers never commit; the main agent commits per task after its gates pass.
5. **Never skip verification.** Per-task tests, the E2E gate, and the review panel are mandatory. Raw E2E output is evidence only; it does not attest Bash execution or close F11.
6. **No verdict without metadata-v1 provenance.** Before every validator, implementation critic, security reviewer, or QA reviewer invocation, preallocate a dispatch ID and include the exact run/generation/role/evidence/plan plus task ID or review kind in approved tool input and prompt. Every judge receipt starts with the ordered metadata-v1 header specified below, then `CHECKS:` and its verdict. The Stop hook grants credit only after a matching journaled `CORE_DISPATCH_COMPLETED`; self-written, legacy, stale, or projection-only evidence earns none.
   - validator → `.glm-hammer/evidence/tasks/task-<i>/validator.md`, role `validator`, `TASK_ID: <i>`, `VERDICT: PASS`
   - implementation critic → `.glm-hammer/evidence/tasks/task-<i>/critic.md`, role `implementation-critic`, `TASK_ID: <i>`, `VERDICT: APPROVE`
   - E2E gate → raw output at `.glm-hammer/evidence/e2e.md` (not a judge receipt and not F11 attestation)
   - reviewers → `.glm-hammer/evidence/reviews/security.md` / `.glm-hammer/evidence/reviews/qa.md`, roles `security-reviewer` / `qa-reviewer`, `REVIEW_KIND: security` / `qa`, `VERDICT: PASS`
7. **Plan edits use Write/Edit only.** A tracked edit creates a new sealed generation with a complete declared-path baseline and invalidates all task/review receipts. Bash edits, missing/broken seals, incomplete baselines, and live-workspace reinterpretation block.
8. **The certified journal is authoritative.** `.glm-hammer/state.json` is only a disposable projection. Request legal transitions through registered core hooks; never manufacture task totals, awaiting-user, review PASS, or done by editing it.

### Metadata-v1 Receipt Header

Every judge writes these lines in this exact order before `CHECKS:`:

```
RECEIPT_VERSION: 1
RUN_ID: <uuid>
ROLE: <validator|implementation-critic|security-reviewer|qa-reviewer>
EVIDENCE_PATH: <exact repository-relative receipt path>
PLAN_SHA256: <64 lowercase hex>
GENERATION: <canonical nonnegative decimal>
<TASK_ID: positive integer | REVIEW_KIND: security|qa>
DISPATCH_ID: <preallocated uuid>
SOURCE_SNAPSHOT_SHA256: <64 lowercase hex; security/qa only>
```

Task receipts omit the source-snapshot line. Review receipts require it. Unknown runtime identity, missing Agent observation, legacy core receipts, and tuple mismatches are fail-closed and never earn PASS.

## State Protocol

```json
{
  "phase": "hammer",
  "status": "executing | review | awaiting-user | done",
  "plan": "docs/glm-hammer/plans/YYYY-MM-DD-<feature>.md",
  "tasks": { "total": 0, "completed": 0, "current": "" },
  "reviews": { "security": "pending", "qa": "pending" },
  "stopBlocks": 0
}
```

- Increment projected `tasks.completed` only after both task dispatches are journaled with matching metadata-v1 receipts. Obligations and task count come from strict parsing of the sealed whole plan, not from projection counters.
- Pause only after approved structural question proof. Raw transcript/context-pressure markers never release hammer. With current unconsumed proof, the exact whole trimmed request `glm-hammer override-unverified RUNID GENERATION` may atomically end that run as UNVERIFIED; it never records verified fields or PASS. Without structural proof there is no override.
- Project `status: "done"` only after journal authority records every derived task obligation, a current source snapshot, both snapshot-bound reviews, and run completion.

## Process

### Step 0: Load ⟨state: executing⟩

Read the sealed whole plan (including any `## Plan Amendment Log`). Require strict contiguous task grammar, derive the task count and dependency DAG from it, and evaluate declared paths against the generation's sealed baseline plus virtual task order. Never trust `state.tasks.total` or later live path existence. Missing, malformed, raced, or mismatched seal/baseline data blocks.

### Step 1: Per-Task Cycle

For each task (parallel groups dispatched concurrently):

**1a. Compliance check** — predecessor outputs exist, no in-flight task shares files. Mismatch → resolve before dispatching.

**1b. Worker (subagent).** Prompt = the task verbatim from the plan. The worker follows steps, adapts minimally when a step contradicts reality (stale anchor, renamed symbol), runs each step's verification, and reports deviations. It stops and reports instead of adapting when a fix would change an interface another task consumes, touch files outside its list, or alter a criterion.

**1c. Validator (subagent, information-isolated).** Use this fixed template, filling fields **verbatim from the plan** — never paraphrase, never mention what the worker did:

```
You are an independent validator with no knowledge of how this task was
implemented. Judge whether the codebase currently meets the goal below by
reading files and running tests yourself.

## Task Goal
{TASK_GOAL — verbatim from plan}
## Acceptance Criteria
{CRITERIA — verbatim from plan}
## Files To Inspect
{FILES — verbatim from plan}
## Test Commands
{COMMANDS — verbatim from plan}

Treat each criterion as an ISOLATED yes/no question: "is this criterion
met right now?" — answer PASS or FAIL per criterion from what you read
and ran, never a holistic impression. Verdict = AND of all criteria. No
partial credit. If FAIL, state exactly which criteria failed, with file
paths — describe, don't fix.

Write your full report to {EVIDENCE_PATH} (create parent directories), beginning with the exact metadata-v1 header populated from the approved dispatch:
RECEIPT_VERSION, RUN_ID, ROLE (`validator`), EVIDENCE_PATH, PLAN_SHA256,
GENERATION, TASK_ID (`<i>`), DISPATCH_ID. Follow it with a `CHECKS:`
block listing every criterion with PASS|FAIL and one-line evidence, then
`VERDICT: PASS` or `VERDICT: FAIL`. End your final message with:
EVIDENCE_RECORDED: {EVIDENCE_PATH}
```

Fill `{EVIDENCE_PATH}` with `.glm-hammer/evidence/tasks/task-<i>/validator.md`. Preallocate `DISPATCH_ID` before invocation and include the complete metadata tuple in approved tool input and this prompt.

**1d. Implementation critic (subagent).** After the validator passes, preallocate a new dispatch ID and dispatch `implementation-critic` with the task's Goal, Files, and Criteria verbatim plus `runId`, `generation`, role `implementation-critic`, evidence path `.glm-hammer/evidence/tasks/task-<i>/critic.md`, `planSha256`, positive `taskId: <i>`, and `dispatchId`. Do not include worker output. Its metadata-v1 receipt must match the dispatch and end in APPROVE or REJECT.

**1e. Verdict handling:**
- Validator PASS + critic APPROVE → after both matching completion events exist, let journal replay project that task complete; then the main agent commits the task's files (parallel tasks) or confirms the worker's commit (sequential).
- Any FAIL/REJECT → **triage first**:
  - *Worker defect* (plan right, code wrong): re-dispatch the worker with ALL accumulated verdict feedback, verbatim.
  - *Plan defect* (code cannot meet the plan as written): amend the plan file itself — affected tasks only, within the plan's Goal; append to `## Plan Amendment Log`. A criterion may be corrected only if factually stale and only to verify the SAME outcome. Then fresh worker.
- **3 strikes** (retries + amendments combined) on one task → escalate to the user with the full history. ⟨state: awaiting-user⟩

### Step 2: E2E Gate

After all tasks, run the plan's Verification Strategy command, then the full test suite. Save the raw output to `.glm-hammer/evidence/e2e.md`. Failure loops through targeted worker repair and a fresh run; two failed fix attempts escalate through structural question proof. This raw receipt does not prove that Bash was observed and does not close F11.

### Step 3: Source Snapshot and Review Panel ⟨state: review⟩

After E2E passes, record a canonical source-review snapshot for the current run and generation. Preallocate one dispatch ID per reviewer only after `SOURCE_REVIEW_SNAPSHOT_RECORDED`. Each approved tool input and prompt receives only the plan path, diff scope, evidence path, and exact metadata tuple: `runId`, `generation`, reviewer role, `evidencePath`, `planSha256`, `reviewKind` (`security` or `qa`), `dispatchId`, `sourceSnapshotSha256`, and `invocationMs`. The invocation time must not predate the snapshot event.

Dispatch in parallel:

| Agent | Attack surface |
|---|---|
| `security-reviewer` | Injection, authz/authn gaps, secrets, unsafe deserialization, path traversal, dependency risk in the changed code |
| `qa-reviewer` | Behavior vs plan's success criteria, edge cases, error paths, regression risk, test adequacy |

Each receipt repeats the same snapshot hash in the required `SOURCE_SNAPSHOT_SHA256` header. Missing binding, mismatch, or pre-snapshot invocation blocks. Both matching PASS receipts are only provisional until completion recomputes the source snapshot and proves byte equality.

- **Both PASS and unchanged recomputation** → project done only after the journal records run completion.
- **Any FAIL or post-snapshot mutation** → append strict fix tasks to a newly sealed plan generation, run the full task/E2E flow, record a fresh snapshot, and redispatch the FULL panel. Old review receipts never carry forward.
- A reviewer failing the same finding 3 times escalates only through approved structural question proof; otherwise the run remains blocked or terminal UNVERIFIED.

## Anti-Patterns

| Anti-Pattern | Why It Fails |
|---|---|
| Main agent writing code or judging inline | Confirmation bias; defeats independent verification |
| Passing worker output/diff to validator or critic | Anchors the judge on the builder's framing |
| Paraphrasing plan content into the validator prompt | Leaks post-worker understanding; verbatim only |
| Weakening a criterion so a failing implementation passes | Reward hacking — the binary verdict exists to catch this |
| Retrying a worker against a plan defect | Burns strikes on an impossible task; triage first |
| Validator running the full suite per task | N redundant runs; regressions belong to the E2E gate, once |
| Re-running only the failed reviewer after fixes | A security fix can break behavior and vice versa; full panel |
| Marking `done` in state while a review is `fail` | Falsified state; the hooks cross-check and the loop reopens |
| Advancing state on a verdict with no evidence receipt | A PASS you cannot show a receipt for did not happen; the Stop hook blocks it |
| Writing a judge's receipt file yourself | The receipt proves the judge ran; forging it defeats the audit trail |
| Stopping mid-loop without `awaiting-user` escalation | The Stop hook bounces you back; escalate properly instead |
