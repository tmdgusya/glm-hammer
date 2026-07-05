# 🔨 glm-hammer

**📖 Workflow walkthrough → [tmdgusya.github.io/glm-hammer](https://tmdgusya.github.io/glm-hammer/)**
**📦 Source & issues → [github.com/tmdgusya/glm-hammer](https://github.com/tmdgusya/glm-hammer)**

**한국어 문서 → [README.ko.md](README.ko.md)**

glm-hammer forges a plan the way a smith forges steel — explore the ore, shape the plan, strike only after the blueprint is drawn. It is a ZCode / Claude Code–compatible engineering-harness plugin: no memorizing skill names, no long prompts. The agent reads the intent itself and runs a self-driving loop of **strong planning → verified implementation → security/QA review**.

It builds on the plan-crafting / run-plan / review-work / clarification principles from [tmdgusya/engineering-discipline](https://github.com/tmdgusya/engineering-discipline) — with the difference that **hooks physically enforce the gates** and the skills auto-chain. The evidence gates, session recovery, and context-pressure escape hatches are lifted from the hook system of [lazycodex](https://github.com/code-yeongyu/lazycodex) (OmO).

## Skills

| Skill | Role |
|---|---|
| `blueprint` | Lightweight planning. For small, clear tasks (≤3 files). Self-Review, then hand off to hammer |
| `crucible` | **Design-token smelting (optional stage, before forge).** Storyline/reference → prospecting → W3C design tokens → fidelity assay → **two-designer panel** unanimous approval → hand off to forge |
| `forge` | **Strong planning.** Recon the codebase with Explore subagents *before* asking questions → minimal questions → draft an actionable plan → **three-critic panel** (feasibility / integration / coverage) revise-and-recheck against the real codebase until all APPROVE |
| `hammer` | **Implementation loop.** Per task: worker → validator (information isolation) → **implementation-critic** (hunts stubs, hardcoding, reward hacking) triple check. After all tasks: E2E gate → **security-reviewer + qa-reviewer** panel. On FAIL, convert to a fix task and re-enter the loop |

## crucible — storyline-driven design-token stage

When a design request arrives — "in this mood", "with this story feel" — crucible runs first, ahead of forge:

```
crucible → forge → hammer
```

Mine the ore (prospecting), smelt it in the crucible (tokens), assay the alloy (assay), then send it to the forge:

1. **Prospecting** — `vein-reader` translates the storyline into a direction brief → color/type/layout/motion **four prospectors in parallel** mine real references (each must attach an evidence receipt)
2. **Smelting** — write W3C design tokens `tokens.json` + `design-spec.md` under `docs/glm-hammer/design/`
3. **Triple gate** (hook-enforced):
   - **token-gate** — deterministic check the instant tokens are saved (schema, required groups, WCAG contrast). Editing tokens/spec resets the entire assay + panel approval and forces a real rewrite of content
   - **fidelity assay** — `fidelity-critic` checks every token traces back to a reference / direction brief (blocks fabricated references)
   - **two-designer panel** — `harmony-critic` (art-director lens) + `rigor-critic` (design-system-engineer lens) revise-and-recheck until both APPROVE
4. **Handoff** — one user approval ("shall I take this design to forge?"), then design-spec/tokens pass as the declared input to the forge plan

## Agents

- `feasibility-critic` / `integration-critic` / `coverage-critic` — the forge plan-review panel (each a different lens; unanimous approval required)
- `implementation-critic` — after the validator passes, rigorously checks "was it *actually* implemented"
- `security-reviewer` / `qa-reviewer` — the final review gate after implementation completes

## Hooks (gate-enforcement devices)

Hooks cannot spawn subagents directly, so the skill writes state to `.glm-hammer/state.json` and the hook scripts read it to enforce the gates:

| Hook | Event | Action |
|---|---|---|
| `session-start.js` | SessionStart | If an unfinished run exists, inject a resume briefing — the loop auto-resumes after restart/clear/compaction with no "continue" needed |
| `route-intent.js` | UserPromptSubmit | If the input looks like a work request, inject forge/blueprint/hammer routing guidance. If a run is in progress, inject the current state to steer back into the loop |
| `plan-gate.js` | PostToolUse (Write\|Edit) | On saving a plan file, **record a content seal (seal, sha256)**. If edited during forge, reset critic approvals to 0 → force full panel re-review. If during hammer, require an Amendment Log entry |
| `dispatch-log.js` | PostToolUse (Agent\|Task) | Subagent dispatch ledger — records the evidence paths named in the dispatch input. stop-gate cross-checks a receipt's dispatch provenance |
| `comment-checker.js` | PostToolUse (Write\|Edit) | Detect AI-slop comments in the file just edited: **elision markers** ("... existing code ..." — a file-corruption signal), change-narration comments ("// added X"), placeholder comments. On detection, order a fix in the same turn |
| `edit-diagnostics.js` | PostToolUse (Write\|Edit) | LSP-lite: quick syntax check on the edited file (JS `node --check`, JSON parse, Python `py_compile`) — catches a broken file **right after the edit**, not at the E2E gate |
| `stop-gate.js` | Stop | Cross-checks the state's claims against **evidence receipts** to block turn end. Only `awaiting-user` (a legitimate escalation) passes |

### ZCode compatibility (per engine verification)

Verified directly against the ZCode distribution (`zcode.cjs` v3.2.x) and the built-in `diagnosing-hooks` guide:

- Supported events are **exactly seven**: SessionStart, UserPromptSubmit, PreToolUse, PermissionRequest, PostToolUse, PostToolUseFailure, Stop. **SubagentStop/PreCompact/Notification are unsupported** → this plugin uses only the Stop gate
- `${CLAUDE_PLUGIN_ROOT}` substitution, `statusMessage`, matcher (case-sensitive regex) are supported. `Write`/`Edit` ← `ApplyPatch` alias auto-mapping
- **Hook stdout is a strict schema** — any key outside the allowed set fails validation. So every hook emits only the single `additionalContext` key (or `decision`/`reason` for Stop)
- Uses the cross-platform-recommended **`type: "process"`** (no shell hop, `timeoutMs` unit)
- Continued runs from a Stop block are capped at **3 by the ZCode runtime** (separate from this plugin's own counter)
- Manifest is searched in order `.zcode-plugin` → `.claude-plugin` → `.codex-plugin` — this repo's `.claude-plugin/plugin.json` is recognized as-is
- The plugin bundle's **agents/lspServers are currently diagnostic-only** (UI display, not executed) → skills carry an inline agent-definition fallback; LSP is implemented via the `edit-diagnostics.js` hook instead of a native component

### Binary Judge (LLM-as-Judge)

Every judge answers a **fixed yes/no checklist**, not a free-form essay. Each question gets YES/NO/N-A (if you didn't verify it, YES is forbidden → NO), and the VERDICT is derived mechanically as the AND of the answers. The design reflects the observation that binary judgments raise the reliability of an LLM judge.

### Evidence Gates

Completion claims in state.json are not trusted. Every judge (critic/validator/reviewer) writes its own verification report to a file under `.glm-hammer/evidence/`, ends with `EVIDENCE_RECORDED: <path>`, and stop-gate cross-checks the receipts on disk:

```
.glm-hammer/evidence/
├── critics/round-<N>/<critic>.md   # VERDICT: APPROVE ×3 required
├── tasks/task-<i>/validator.md     # VERDICT: PASS
├── tasks/task-<i>/critic.md        # VERDICT: APPROVE
├── e2e.md                          # E2E gate raw output
└── reviews/{security,qa}.md        # VERDICT: PASS
```

A completion claim without a receipt is blocked, and the directive tone hardens on repeat. (Ported from lazycodex's executor-verify pattern.)

Three further lines of defense are layered on top:

1. **Substantive check** — a receipt must carry a minimum length + a `CHECKS:` block + a `VERDICT:` line to be valid. A one-liner "VERDICT: PASS" does not pass
2. **Content seal** — plan files are sealed with sha256 on save via the Write/Edit tool. Editing through a bypass path (Bash redirection, sed, etc.) breaks the seal and voids all approvals
3. **Dispatch ledger** — a judge receipt is valid only if a real Agent dispatch mentions that path. Blocks the orchestrator from forging receipts itself (a fail-open design that requires at least one ledger entry to engage — auto-disables if the runtime never fires Agent events)

Infinite-loop prevention: after 6 blocks it yields (counter resets next user turn/session), Claude Code's own cap (8 consecutive), and an escape hatch that releases the block when a context-pressure marker appears in the transcript.

## Flow

```
User: "make it with this story mood"  ← if it's a design request, the optional stage crucible runs first
  └─ route-intent hook → crucible routing
       └─ crucible: prospecting → token smelting → fidelity assay → designer panel ×2 (stop-gate enforced)
            └─ one user approval ("proceed to forge?") → hand off to forge below

User: "properly build feature X"
  └─ route-intent hook → forge routing
       └─ forge: recon (before questions) → minimal questions → plan → critic ×3 unanimous approval (stop-gate enforced)
            └─ one user approval ("proceed to hammer?")
                 └─ hammer: [worker → validator → critic] × tasks → E2E → security/QA review
                      └─ FAIL → fix task → re-enter loop (stop-gate enforced) → all green → completion report
```

The user touches the loop at only two points: **answering a question, and approving the plan once**.

## Install

Requirement: Node.js 18+ (to run the hook scripts).

**ZCode**: Marketplace tab → add a custom source → register this repo's GitHub URL or a local path → install glm-hammer.

**Claude Code**:
```bash
claude plugin marketplace add tmdgusya/glm-hammer   # or a local path
claude plugin install glm-hammer@glm-hammer
```

## State files

Runtime state is written to `.glm-hammer/state.json` in the project root.
Plan/review documents are saved under `docs/glm-hammer/plans/` and `docs/glm-hammer/reviews/`.
`.glm-hammer/` is recommended for gitignore.

## License

MIT · source at [github.com/tmdgusya/glm-hammer](https://github.com/tmdgusya/glm-hammer)
