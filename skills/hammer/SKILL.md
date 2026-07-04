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
5. **Never skip verification.** Per-task tests, the E2E gate, and the review panel are all mandatory. The Stop hook blocks completion until state shows all tasks done and all reviews `pass`.
6. **No verdict without a receipt.** Every judge writes its own verdict file under `.glm-hammer/evidence/` and ends its final message with `EVIDENCE_RECORDED: <path>`. The Stop hook cross-checks state claims against these receipts — a completion claim without its receipt on disk blocks the turn:
   - validator → `evidence/tasks/task-<i>/validator.md` (must contain `VERDICT: PASS`)
   - implementation-critic → `evidence/tasks/task-<i>/critic.md` (must contain `VERDICT: APPROVE`)
   - E2E gate → you (the orchestrator) save the raw command output to `evidence/e2e.md`
   - reviewers → `evidence/reviews/security.md` / `evidence/reviews/qa.md` (must contain `VERDICT: PASS`)
   Before advancing state, confirm the receipt exists and matches the reported verdict. `<i>` is the plan's task number.
7. **Keep `.glm-hammer/state.json` current** at every ⟨state⟩ checkpoint.

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

- Increment `tasks.completed` only when a task passes **both** validator and critic.
- Set `status: "awaiting-user"` only for genuine escalations (3-strike failures, plan deadlocks) — this is the sole legitimate way to pause the loop.
- Set `status: "done"` only when tasks are complete AND both reviews are `pass`.

## Process

### Step 0: Load ⟨state: executing, tasks.total set⟩

Read the plan (including any `## Plan Amendment Log`). Verify dependencies, file paths, criteria decidability. Build the task DAG; identify parallel groups.

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

Write your full report (verdict line first: "VERDICT: PASS" or
"VERDICT: FAIL", then per-criterion results and what you ran) to
{EVIDENCE_PATH}, creating parent directories. End your final message with:
EVIDENCE_RECORDED: {EVIDENCE_PATH}
```

Fill `{EVIDENCE_PATH}` with `.glm-hammer/evidence/tasks/task-<i>/validator.md`.

**1d. Implementation critic (subagent).** After the validator passes, dispatch `implementation-critic` with the task's Goal, Files, and Criteria (verbatim from plan — still not the worker's output) plus its evidence path `.glm-hammer/evidence/tasks/task-<i>/critic.md`. The critic hunts what validators miss: stub bodies, hardcoded values shaped to pass the listed tests, swallowed errors, dead config, tests that assert nothing. Verdict APPROVE / REJECT with evidence, written to its receipt file.

**1e. Verdict handling:**
- Validator PASS + critic APPROVE → main agent commits the task's files (parallel tasks) or confirms the worker's commit (sequential). ⟨state: tasks.completed++⟩
- Any FAIL/REJECT → **triage first**:
  - *Worker defect* (plan right, code wrong): re-dispatch the worker with ALL accumulated verdict feedback, verbatim.
  - *Plan defect* (code cannot meet the plan as written): amend the plan file itself — affected tasks only, within the plan's Goal; append to `## Plan Amendment Log`. A criterion may be corrected only if factually stale and only to verify the SAME outcome. Then fresh worker.
- **3 strikes** (retries + amendments combined) on one task → escalate to the user with the full history. ⟨state: awaiting-user⟩

### Step 2: E2E Gate

After all tasks: run the plan's Verification Strategy command, then the full test suite. **Save the raw output to `.glm-hammer/evidence/e2e.md`** — the Stop hook requires this receipt. Failure = integration problem: diagnose → targeted fix via a worker → re-run (overwrite the receipt with the latest run). Two failed fix attempts → escalate. ⟨state: awaiting-user⟩

### Step 3: Review Panel ⟨state: review⟩

Dispatch **in parallel**, each receiving only the plan path, the diff scope (changed files list), and its evidence path (`.glm-hammer/evidence/reviews/security.md` / `qa.md`):

| Agent | Attack surface |
|---|---|
| `security-reviewer` | Injection, authz/authn gaps, secrets, unsafe deserialization, path traversal, dependency risk in the changed code |
| `qa-reviewer` | Behavior vs plan's success criteria, edge cases, error paths, regression risk, test adequacy |

Each returns PASS or FAIL with findings ranked by severity. ⟨state: reviews.security / reviews.qa⟩

- **Both PASS** → ⟨state: done⟩ report: tasks completed, retries, amendments, review outcomes, verification evidence.
- **Any FAIL** → convert each blocking finding into a fix task appended to the plan (with binary criteria), ⟨state: executing⟩, run them through the full Step 1 cycle, then **re-run the E2E gate and the FULL review panel**. Advisory (non-blocking) findings are reported, not looped.
- A reviewer failing the same finding 3 times → escalate. ⟨state: awaiting-user⟩

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
