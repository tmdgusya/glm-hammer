---
name: crucible
description: Storyline-driven design mode. Use when the user makes a storyline- or reference-driven design request — design tokens, mood/visual identity, a style guide — especially when they say "디자인", "무드", "스토리", "레퍼런스", "design tokens", "style guide". Prospects real references with a multi-agent panel, smelts them into W3C design tokens, assays fidelity to the story, then requires approval from a 2-designer critic panel before handing off to forge. Hooks enforce the gates.
---

# Crucible — Storyline-Driven Design Tokens

Turns a story into an alloy the way a smith turns ore into steel: prospect the ore (references), smelt it in the crucible (tokens + spec), assay the alloy (fidelity), then send it to the forge. A design leaves the crucible only when it survives a deterministic token check, a fidelity assay, and **unanimous approval from a 2-designer critic panel**.

## Core Principle

References precede tokens; assay precedes taste. Every token traces to something real — a prospected reference or the Direction Brief — and no design reaches the user that has not survived adversarial review against the story it claims to tell.

## Hard Gates (hook-enforced)

1. **Prospect before smelting.** The Stop hook blocks until all five prospect receipts exist: the vein-reader's Direction Brief and the four dimension prospectors' reports, each ≥20 bytes at its evidence path. No token is written before the ore is in.
2. **Design artifacts are written via the Write/Edit tools only.** Every tracked write to `tokens.json` / `design-spec.md` / `references.md` reseals its content hash. Editing them via Bash (redirection, sed, heredoc) breaks the seal, voids the assay and all panel approvals, and the Stop hook blocks until the file is re-saved via Write and the assay + full panel re-run.
3. **Deterministic token validation.** `tokens.json` must pass a mechanical check before any turn completes: W3C-style leaves (every token carries its own `$value` and `$type`; aliases resolve, no cycles); required top-level groups `color`, `typography`, `spacing`, `radius` (`motion` optional); `color.text`, `color.surface`, `color.accent` subgroups each non-empty, with `color.text.default` and `color.surface.default` present; per-`$type` value formats (`color` → hex `#RGB`/`#RRGGBB`/`#RRGGBBAA`, `dimension` → number + `px|rem|em|%`, `duration` → number + `ms|s`, `cubicBezier` → 4 numbers, `fontFamily` → string or non-empty string array); WCAG contrast vs `color.surface.default` — every `color.text.*` token ≥4.5:1 (≥3.0:1 if named `muted|subtle|disabled|placeholder`) and every `color.accent.*` token ≥3.0:1. Contrast failures are validation failures, not advice.
4. **Fidelity assay is mandatory.** Before the panel sits, `fidelity-critic` must return `APPROVE` with a receipt at `.glm-hammer/evidence/design/assay/round-<N>/fidelity-critic.md`. The Stop hook blocks while the assay is not green.
5. **Designer panel is mandatory, and edits reset it.** Both panel critics (`harmony-critic`, `rigor-critic`) must return `APPROVE` with receipts under `.glm-hammer/evidence/design/panel/round-<N>/`. The PostToolUse hook resets the assay verdict and panel approvals whenever `tokens.json` or `design-spec.md` changes — after every revision, re-run the assay, then the FULL panel.
6. **No verdict without a dispatch-backed receipt.** Judge receipts are checked for substance (`CHECKS:` block, ≥300 bytes, `VERDICT: APPROVE`) and must be dispatch-backed: each judge's dispatch prompt must contain its evidence path — the hooks record every subagent dispatch and reject receipts no critic was pointed at. Writing a receipt yourself therefore does not work.
7. **No placeholder tokens.** Every token in `tokens.json` is traceable to a specific reference or a Direction Brief field via the spec's Token Rationale. Values invented to fill a slot are design failures.
8. **Keep `.glm-hammer/state.json` current.** Hooks read it to enforce the gates — see State Protocol below.

## State Protocol

Maintain `.glm-hammer/state.json` at the project root. Update it at every checkpoint marked ⟨state⟩ in the process below. Shape:

```json
{
  "phase": "crucible",
  "status": "prospecting | smelting | assay | critique | awaiting-user | approved",
  "design": "docs/glm-hammer/design/YYYY-MM-DD-<name>",
  "prospect": { "required": 5, "reported": 0 },
  "assay": { "verdict": "pending", "round": 1 },
  "panel": { "required": 2, "approved": 0, "round": 1, "verdicts": [] },
  "stopBlocks": 0
}
```

`assay.verdict` is `"pending"` or `"approve"`. `panel.verdicts` entries are `{ "critic": "harmony-critic", "verdict": "APPROVE|REJECT", "round": 1 }`.

Rules:
- Set `status: "awaiting-user"` **before ending a turn that needs a user answer** (direction confirmation, deadlock, handoff). Otherwise the Stop hook will bounce you back.
- Never write `approved` yourself unless `assay.verdict` is `"approve"` AND `panel.approved >= panel.required` in the current round with matching receipts on disk. The hooks cross-check this; falsifying state is a protocol violation.
- Add `.glm-hammer/` to `.gitignore` if the project has one and it is not already listed.

## Process

### Phase A: Prospecting ⟨state: prospecting⟩

Dispatch `vein-reader` **FIRST**, alone. It receives ONLY: the user's storyline/references **verbatim** and its evidence output path `.glm-hammer/evidence/design/prospect/vein-reader.md`. It returns the **Direction Brief** — mood keywords, era/genre, texture, color stance, typography voice, motion character, anti-references. Do not ask the user for direction the storyline can answer.

When the brief is in, dispatch the **four prospectors IN PARALLEL**, each receiving: the Direction Brief content, the user's own references (if any), and its evidence output path `.glm-hammer/evidence/design/prospect/<name>.md`:

| Agent | Vein |
|---|---|
| `color-prospector` | Palettes — dominant/surface/accent hexes from real references |
| `type-prospector` | Typography — families, pairings, scale ratios, weights |
| `layout-prospector` | Spatial systems — grid, spacing rhythm, radius language, density |
| `motion-prospector` | Motion — durations, easing character, what moves and what never does |

Each prospector reports ≥3 real references with concrete values. When all five receipts are on disk ⟨state: prospect.reported⟩, curate the keepers into `references.md` in the design directory — every entry names which prospector (or the user) supplied it.

### Phase B: Smelting ⟨state: smelting⟩

Create the design directory `docs/glm-hammer/design/YYYY-MM-DD-<name>/` ⟨state: design⟩ and write, **via the Write tool**:

- `tokens.json` — W3C design tokens satisfying the deterministic contract in Hard Gate 3. Every value is pulled from a prospected reference or derived from the Direction Brief; the derivation lives in the spec.
- `design-spec.md` — must contain ALL of these exact headings: `## Story & Direction`, `## References`, `## Token Rationale`, `## Application Guide`, `## Fidelity Notes`. The Token Rationale covers every top-level token group; the Application Guide shows the tokens applied to concrete component treatments.

The PostToolUse hook validates `tokens.json` on every write — fix reported problems same-turn.

### Phase C: Assay ⟨state: assay⟩

Dispatch `fidelity-critic` as a subagent. It receives ONLY: the design directory path, the prospect receipt paths, the original user request verbatim, and its evidence output path `.glm-hammer/evidence/design/assay/round-<N>/fidelity-critic.md`. It answers a fixed binary checklist (does every token trace to a reference or the brief? are the references real?) and writes its receipt.

- **APPROVE** → ⟨state: assay.verdict = "approve"⟩ proceed to the panel.
- **REJECT** → revise the tokens/spec addressing every finding (the token-gate hook resets approvals on edit), increment `assay.round`, re-dispatch.

### Phase D: Critique — The Designer Panel ⟨state: critique⟩

Dispatch the two panel critics **IN PARALLEL**, each as a subagent:

| Agent | Lens |
|---|---|
| `harmony-critic` | Art direction — does the alloy hold together and express the story? |
| `rigor-critic` | Design systems — naming, scale completeness, contrast recomputed, aliases |

Each receives ONLY: the design directory path, the vein-reader receipt path, the original user request verbatim, and its evidence output path `.glm-hammer/evidence/design/panel/round-<N>/<critic-name>.md`. Not your reasoning — critics re-verify against the artifacts themselves.

Before recording a verdict in state, confirm the receipt exists on disk and its `VERDICT:` line matches what the critic reported — a critic that returned APPROVE but wrote no file (or wrote REJECT) has not approved anything. Record every verified verdict ⟨state: panel.verdicts, panel.approved⟩.

If the runtime does not expose the critics as named agent types, read each definition from this plugin's `agents/<name>.md` and dispatch a general-purpose subagent with that file's body as its instructions plus the inputs above. The same fallback applies to the prospecting agents in Phase A and the assay in Phase C.

- **All APPROVE** → panel passed.
- **Any REJECT** → revise addressing every finding. The revision voids the assay too → return to **Phase C**, re-run the assay, then re-dispatch the FULL panel; increment `panel.round`.
- **Round > 3** → stop, present the deadlock to the user with the unresolved findings. ⟨state: awaiting-user⟩

### Phase E: Present and Hand Off ⟨state: awaiting-user⟩

Present a compact summary: the direction (one line), reference count, token group counts, and how many assay/panel rounds the design survived — with the design directory path. Ask ONE question: **이 디자인으로 forge를 진행할까요?**

- Yes → set status `approved` ⟨state: approved is set only now⟩, then invoke the `forge` skill immediately with the design directory as a declared input. Forge's plan must list `design-spec.md` and `tokens.json` as inputs so hammer implements against them.
- User declines (design-only run) → set status `done` so the resume/router hooks stop treating the run as active.
- Revisions requested → apply them (this voids assay + panel), re-run Phase C and Phase D, re-present.

## Anti-Patterns

| Anti-Pattern | Why It Fails |
|---|---|
| Asking the user for direction before the vein-reader/prospectors return | Generic questions the storyline could answer; the whole point of prospecting |
| Inventing references no prospector reported | Untraceable ore; the fidelity assay checks every reference against a receipt |
| Hand-tuning tokens after panel approval without re-running assay + panel | A "small tweak" can break contrast or coherence; the hooks void approvals on edit anyway |
| Treating contrast failures as advisory | WCAG thresholds are part of the deterministic contract; the Stop hook blocks while they fail |
| Writing tokens.json via Bash redirection | Breaks the content seal, voids every approval, and the Stop hook blocks until re-saved via Write |
| Softening the Direction Brief to make the panel approve | Reward hacking — the panel verifies fidelity to the story, not agreeableness |
| Writing `status: approved` to state without real verdicts | Falsified state; hooks exist because this is tempting |
