# claude-hammer — Claude Code conversion of glm-hammer (design spec)

Date: 2026-07-07
Status: approved design, pre-implementation

## Problem

glm-hammer is a ZCode-native engineering-harness plugin. Its enforcement backbone
lives in `hooks/hooks.json` + `hooks/scripts/*.js`, written against ZCode's hook
runtime. Claude Code's hook runtime differs in three ways, so the plugin does **not**
work under Claude Code as-is:

1. Path substitution: ZCode substitutes `${ZCODE_PLUGIN_ROOT}`; Claude Code only
   substitutes `${CLAUDE_PLUGIN_ROOT}`.
2. Hook entry schema: ZCode uses `{"type":"process","command":"node","args":[...],
   "timeoutMs":N,"statusMessage":"..."}`; Claude Code uses
   `{"type":"command","command":"<shell string>","timeout":<seconds>}` (no
   `statusMessage`).
3. Context-injection stdout schema: the scripts emit top-level `{additionalContext}`
   (ZCode's strict schema); Claude Code expects
   `{hookSpecificOutput:{hookEventName, additionalContext}}`.

The `{decision:'block', reason}` shape emitted by `stop-gate.js:306` is **already**
identical to Claude Code's Stop-hook schema — the most important gate needs no change.

## Goal

Ship `claude-hammer`: a separate repository that reuses glm-hammer's skills, agents,
and hook scripts unchanged, adapting only what the two hook runtimes disagree on, so
that the same harness (strong planning → verified implementation → security/QA review)
runs under Claude Code.

## Design decisions (resolved in brainstorming)

- **Reference mechanism: git submodule.** glm-hammer is embedded in claude-hammer as a
  submodule (the single source of truth). Chosen over local symlink (breaks on GitHub
  clone) and standalone fork (diverges over time).
- **Conversion location: glm-hammer `lib.js`, additive + explicit switch.** The entire
  engine-portability surface is the single `emitContext` function. It gains one additive
  branch, gated on an explicit env var `GLM_HAMMER_EMIT=claude` that claude-hammer sets.
  The existing `else` branch is byte-for-byte the current ZCode code, so ZCode output
  cannot regress. Chosen over per-hook wrapper scripts (8 wrappers + double process
  spawn + drift risk).
- **skills/agents: symlinks at claude-hammer root → submodule.** Claude Code
  auto-discovers `skills/` and `agents/` at the plugin root; the submodule places them
  at `glm-hammer/skills/`. Since both are pure markdown (zero engine-path references),
  root symlinks reuse them with no conversion and no divergence.
- **Deployment: symlinks now; vendor-copy later.** Symlinks are correct for local /
  personal install. IF the plugin is later published for others to install from GitHub,
  add a `sync.sh` release step that materializes submodule content into a committed
  vendor tree (removes install-time submodule-init and symlink-resolution risk). YAGNI:
  not built until public distribution is actually needed.

## Repo layout

```
~/claude-hammer/
├── .gitmodules                    # glm-hammer submodule reference
├── glm-hammer/                    # submodule — source of truth, unmodified from here
│   └── skills/ agents/ hooks/scripts/ ...
├── .claude-plugin/
│   ├── plugin.json                # name: claude-hammer, Claude Code manifest
│   └── marketplace.json
├── skills   -> glm-hammer/skills  # symlink
├── agents   -> glm-hammer/agents  # symlink
├── hooks/
│   └── hooks.json                 # Claude Code-native — the only new/converted file
└── README.md
```

## The one glm-hammer change

`hooks/scripts/lib.js` — `emitContext` becomes:

```js
function emitContext(eventName, text) {
  if (process.env.GLM_HAMMER_EMIT === 'claude') {
    emit({ hookSpecificOutput: { hookEventName: eventName, additionalContext: text } });
  } else {
    emit({ additionalContext: text });   // unchanged ZCode path
  }
}
```

The scripts already pass the event name as the first arg to `emitContext`, so no
caller changes. Add one regression test to `tests/gates.test.js`: assert that without
`GLM_HAMMER_EMIT` the output is `{additionalContext}`, and with `GLM_HAMMER_EMIT=claude`
it is `{hookSpecificOutput:{hookEventName, additionalContext}}`.

## Hook conversion table (claude-hammer/hooks/hooks.json)

| ZCode (glm-hammer)                                             | Claude Code (claude-hammer)                                                                     |
|---------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| `"type": "process"`                                           | `"type": "command"`                                                                             |
| `"command":"node"`, `"args":["${ZCODE_PLUGIN_ROOT}/hooks/scripts/x.js"]` | `"command":"GLM_HAMMER_EMIT=claude node ${CLAUDE_PLUGIN_ROOT}/glm-hammer/hooks/scripts/x.js"` |
| `"timeoutMs": 10000`                                          | `"timeout": 10`  (seconds)                                                                       |
| `"statusMessage": "..."`                                      | (omitted — not a Claude Code field)                                                             |
| event names + matchers (`PostToolUse`, `Write\|Edit\|MultiEdit`, `Agent\|Task`, `Stop`, etc.) | identical                                       |

All 8 hooks across SessionStart / UserPromptSubmit / PostToolUse (Write|Edit|MultiEdit
and Agent|Task) / Stop convert mechanically via this table. `stop-gate.js`'s
`{decision:'block'}` output passes through unchanged.

## Components inventory (portability)

- `skills/` (blueprint, crucible, forge, hammer) — pure markdown, no engine refs → symlink, no change.
- `agents/` (14 `.md` profiles) — pure markdown, no engine refs → symlink, no change.
- `hooks/scripts/*.js` (8 scripts + lib.js + token-lib.js) — run from submodule; only
  `lib.js` `emitContext` changes.
- No `commands/` directory exists.
- Project state lives in the user's cwd (`.glm-hammer/state.json`), not plugin root —
  identical under both engines, no change.

## Verification gates (the only unproven points)

1. **Local install of claude-hammer into Claude Code** and drive the real flow:
   - SessionStart + UserPromptSubmit (route-intent) actually inject context.
   - PostToolUse gates (plan-gate, token-gate, comment-checker, edit-diagnostics) fire.
   - Stop gate (stop-gate) actually blocks.
2. **`${CLAUDE_PLUGIN_ROOT}/glm-hammer/...` resolves into the submodule** correctly.
3. **glm-hammer `tests/gates.test.js` stays green** — proves ZCode path did not regress.
4. **Open question to resolve during implementation:** whether a Claude Code
   marketplace/GitHub install performs `git submodule update --init`. If it does not,
   trigger the vendor-copy fallback for public distribution. (Local path install is the
   near-term target and is expected to work with symlinks + user-inited submodule.)

## Out of scope

- Publishing claude-hammer to a public marketplace (vendor pipeline deferred, YAGNI).
- Any change to glm-hammer skills/agents/other scripts beyond `emitContext`.
- Rewriting glm-hammer as dual-engine at the manifest level (`.zcode-plugin` stays the
  ZCode home; claude-hammer is the Claude Code home).
