---
name: blueprint
description: Light planning mode. Use when the user requests a small, clearly-scoped change (roughly ≤3 files, no new interfaces, no ambiguity) that still deserves a written plan before code. For ambiguous or multi-component work, use the forge skill instead. Produces an executable plan with binary acceptance criteria and a self-review, then hands off to hammer.
---

# Blueprint — Light Planning

A quick, single-pass plan for small, well-understood work. Same plan format as `forge`, minus the critic panel — a rigorous self-review stands in for the anvil.

## When To Use / Not Use

- **Use:** clear scope, ≤3 files touched, existing interfaces only, you could describe the diff before writing it.
- **Don't use:** any ambiguity about goal or approach, 4+ files, new/changed interfaces, cross-cutting concerns → invoke `forge` instead. When in doubt, forge. Trivial one-liners need no plan at all — just fix them.

## Process

1. **Quick recon (inline or one Explore subagent).** Confirm the affected files, the existing pattern to follow, and the exact test command. Never plan against an unverified assumption about the code.
2. **Write the plan** to `docs/glm-hammer/plans/YYYY-MM-DD-<feature>.md` using forge's strict sealed-plan grammar. Tasks are contiguous `### Task N: Title` sections beginning at 1. `**Dependencies:**` is exactly `None` or a comma-space-separated, strictly ascending unique list of lower `Task N` references. Under `**Files:**`, every entry is exactly `- Create: \`path\``, `- Modify: \`path\``, or `- Test: \`path\``. `**Acceptance Criteria:**` contains column-one unchecked checkboxes, and steps are contiguous exact `**Step N:**` markers. No placeholders. End with a Final Verification Task. Declare every path before sealing; the generation's path baseline, not later live path existence, determines whether Create/Modify/Test is legal.
3. **Self-review with fresh eyes:** spec coverage (every requirement maps to a task), placeholder scan, type/signature consistency across tasks, dependency and file-conflict check, criteria decidability (could a hostile validator judge each criterion without interpretation?). Fix findings inline.
4. **Journal-backed handoff.** Request the blueprint→awaiting-user transition through the registered core hook flow. `.glm-hammer/state.json` is only a disposable projection of the certified journal, never authority and never proof of a legal transition. The projected shape is:

```json
{ "phase": "blueprint", "status": "awaiting-user", "plan": "docs/glm-hammer/plans/....md", "stopBlocks": 0 }
```

Do not manufacture `awaiting-user` by editing the projection. It is released only by approved structural question proof. If that capability or runtime identity is not approved, stop fail-closed; unknown facts never earn PASS. Blueprint remains lightweight: it adds no critic panel and does not change crucible/pptxx behavior.

Present a 3-line summary and ask one question: **proceed with `hammer` now?** On yes, invoke the `hammer` skill immediately.

## Escalation

If during recon or writing you discover hidden complexity (new interface, 4+ files, an ambiguity only the user can resolve), stop and switch to `forge` — say so in one line. A blueprint that grows critics' work is a forge plan in disguise.
