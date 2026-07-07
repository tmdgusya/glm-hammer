# claude-hammer Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `claude-hammer`, a separate repo that runs glm-hammer's harness under Claude Code by reusing its skills/agents/scripts via a git submodule and converting only the hook-runtime differences.

**Architecture:** glm-hammer gains one additive branch in `emitContext` (gated on `GLM_HAMMER_EMIT=claude`, ZCode path byte-identical). A new `~/claude-hammer` repo embeds glm-hammer as a submodule, symlinks `skills/` and `agents/` from it, and owns a single Claude Code-native `hooks/hooks.json` that runs the submodule's scripts with the env switch set.

**Tech Stack:** Node.js (zero-dependency hook scripts), git submodules, Claude Code plugin manifest + hooks format.

## Global Constraints

- glm-hammer `emitContext` change MUST be additive — the existing `else` branch stays byte-for-byte identical so ZCode output cannot regress.
- Only ONE glm-hammer file changes logic: `hooks/scripts/lib.js`. No caller changes (all callers already pass the correct `hookEventName`).
- claude-hammer plugin `name`: `claude-hammer`.
- Claude Code hook entries use `"type":"command"`, a single shell-string `command`, integer `timeout` in SECONDS, and NO `statusMessage` field.
- Every claude-hammer hook command is exactly: `GLM_HAMMER_EMIT=claude node ${CLAUDE_PLUGIN_ROOT}/glm-hammer/hooks/scripts/<script>.js`.
- Event names + matchers are preserved verbatim from glm-hammer's `hooks/hooks.json`.
- Tests are zero-dependency, run with `node <file>`, and use the existing `check(name, cond, detail)` / `failures` pattern in `tests/gates.test.js`.
- glm-hammer work happens on the current `claude-hammer-conversion` branch in `/Users/roach/glm-hammer`. claude-hammer is a NEW repo at `/Users/roach/claude-hammer`.

---

### Task 1: glm-hammer — dual-mode `emitContext`

**Files:**
- Modify: `/Users/roach/glm-hammer/hooks/scripts/lib.js` (the `emitContext` function, ~line 195)
- Modify (test): `/Users/roach/glm-hammer/tests/gates.test.js` (append a new check block before the final failures summary)

**Interfaces:**
- Consumes: nothing new.
- Produces: `emitContext(eventName, text)` — when `process.env.GLM_HAMMER_EMIT === 'claude'`, writes `{"hookSpecificOutput":{"hookEventName":eventName,"additionalContext":text}}`; otherwise writes `{"additionalContext":text}` (unchanged). `lib.js` already exports `emitContext`.

- [ ] **Step 1: Write the failing test**

Append to `/Users/roach/glm-hammer/tests/gates.test.js`, immediately before the final block that prints the summary and calls `process.exit` (search for the last `check(` / the `failures` summary and insert above it):

```js
// (k) emitContext dual-mode: ZCode default vs explicit Claude switch
function emitOnce(extraEnv) {
  const code = "require(process.argv[1]).emitContext('PostToolUse','hello')";
  const r = spawnSync(process.execPath, ['-e', code, path.join(ROOT, 'hooks', 'scripts', 'lib.js')], {
    env: Object.assign({}, process.env, extraEnv),
    encoding: 'utf8',
  });
  return JSON.parse(r.stdout);
}
const zcodeOut = emitOnce({ GLM_HAMMER_EMIT: '' });
check(
  'emitContext ZCode schema (default)',
  zcodeOut.additionalContext === 'hello' && zcodeOut.hookSpecificOutput === undefined,
  JSON.stringify(zcodeOut)
);
const claudeOut = emitOnce({ GLM_HAMMER_EMIT: 'claude' });
check(
  'emitContext Claude schema (switch on)',
  !!claudeOut.hookSpecificOutput &&
    claudeOut.hookSpecificOutput.hookEventName === 'PostToolUse' &&
    claudeOut.hookSpecificOutput.additionalContext === 'hello' &&
    claudeOut.additionalContext === undefined,
  JSON.stringify(claudeOut)
);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/roach/glm-hammer && node tests/gates.test.js`
Expected: the `emitContext Claude schema (switch on)` check prints `FAIL` (current `emitContext` ignores `GLM_HAMMER_EMIT` and always emits `{additionalContext}`, so `claudeOut.hookSpecificOutput` is undefined). The `emitContext ZCode schema (default)` check prints `ok`.

- [ ] **Step 3: Write minimal implementation**

In `/Users/roach/glm-hammer/hooks/scripts/lib.js`, replace the `emitContext` function body:

```js
// Context injection. ZCode validates hook stdout against a STRICT schema
// (extra keys fail validation) and accepts top-level `additionalContext`.
// Claude Code expects `hookSpecificOutput.{hookEventName,additionalContext}`.
// The Claude path is opt-in via GLM_HAMMER_EMIT=claude (set by claude-hammer),
// so the default (ZCode) branch below is unchanged.
function emitContext(eventName, text) {
  if (process.env.GLM_HAMMER_EMIT === 'claude') {
    emit({ hookSpecificOutput: { hookEventName: eventName, additionalContext: text } });
  } else {
    emit({ additionalContext: text });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/roach/glm-hammer && node tests/gates.test.js`
Expected: ALL checks print `ok` (including both new `emitContext` checks). Final summary shows 0 failures. This also proves the ZCode default path is unchanged.

- [ ] **Step 5: Commit**

```bash
cd /Users/roach/glm-hammer
git add hooks/scripts/lib.js tests/gates.test.js
git commit -m "feat: make emitContext dual-mode for Claude Code via GLM_HAMMER_EMIT

Additive branch: GLM_HAMMER_EMIT=claude emits hookSpecificOutput schema;
default emits ZCode {additionalContext} unchanged. Regression test covers both.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: claude-hammer — scaffold repo + glm-hammer submodule

**Files:**
- Create: `/Users/roach/claude-hammer/` (new git repo)
- Create: `/Users/roach/claude-hammer/.gitmodules` (via `git submodule add`)
- Create: `/Users/roach/claude-hammer/glm-hammer/` (submodule content)

**Interfaces:**
- Consumes: glm-hammer at commit from Task 1 (must be committed first so the submodule pins the dual-mode `emitContext`).
- Produces: submodule at `glm-hammer/` containing `hooks/scripts/*.js`, `skills/`, `agents/`.

- [ ] **Step 1: Create the repo and add the submodule**

```bash
mkdir -p /Users/roach/claude-hammer
cd /Users/roach/claude-hammer
git init
git submodule add /Users/roach/glm-hammer glm-hammer
git -C glm-hammer checkout claude-hammer-conversion
```

(Note: the submodule URL is the local path for now. Publishing to GitHub is out of scope; at that point repoint `.gitmodules` to `https://github.com/tmdgusya/glm-hammer` and pin a pushed commit.)

- [ ] **Step 2: Verify the submodule carries the dual-mode change**

Run:
```bash
cd /Users/roach/claude-hammer
grep -c "GLM_HAMMER_EMIT" glm-hammer/hooks/scripts/lib.js
```
Expected: `1` (the submodule includes Task 1's change).

- [ ] **Step 3: Verify the submodule's own tests are green through claude-hammer**

Run: `node /Users/roach/claude-hammer/glm-hammer/tests/gates.test.js`
Expected: 0 failures — proves the referenced scripts are intact.

- [ ] **Step 4: Commit**

```bash
cd /Users/roach/claude-hammer
git add .gitmodules glm-hammer
git commit -m "chore: scaffold claude-hammer with glm-hammer submodule

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: claude-hammer — Claude Code manifest

**Files:**
- Create: `/Users/roach/claude-hammer/.claude-plugin/plugin.json`
- Create: `/Users/roach/claude-hammer/.claude-plugin/marketplace.json`

**Interfaces:**
- Produces: a plugin named `claude-hammer` discoverable by Claude Code.

- [ ] **Step 1: Write `.claude-plugin/plugin.json`**

```json
{
  "name": "claude-hammer",
  "description": "Claude Code build of the glm-hammer engineering harness: storyline-driven design tokens verified by a designer panel (crucible), recon-first strong planning verified by a 3-critic panel, and a worker-validator-critic implementation loop with security/QA review gates enforced by hooks.",
  "version": "0.3.1",
  "author": {
    "name": "tmdgusya",
    "url": "https://github.com/tmdgusya"
  },
  "repository": "https://github.com/tmdgusya/claude-hammer",
  "license": "MIT",
  "keywords": [
    "planning",
    "critic",
    "worker-validator",
    "hooks",
    "engineering-discipline",
    "review",
    "security",
    "qa",
    "loop",
    "design",
    "design-tokens"
  ]
}
```

- [ ] **Step 2: Write `.claude-plugin/marketplace.json`**

```json
{
  "name": "claude-hammer",
  "owner": {
    "name": "tmdgusya",
    "url": "https://github.com/tmdgusya"
  },
  "metadata": {
    "description": "claude-hammer marketplace: Claude Code build of the glm-hammer harness",
    "version": "0.3.1"
  },
  "plugins": [
    {
      "name": "claude-hammer",
      "source": "./",
      "description": "Storyline-driven design tokens verified by a designer panel (crucible), recon-first strong planning (forge) verified by a 3-critic panel, plus a worker-validator-critic implementation loop (hammer) with security/QA review gates. Hooks enforce the gates so the agent cannot skip verification.",
      "category": "engineering",
      "tags": ["planning", "critic", "worker-validator", "hooks", "review", "loop", "design", "design-tokens"]
    }
  ]
}
```

- [ ] **Step 3: Verify both manifests parse and name is correct**

Run:
```bash
cd /Users/roach/claude-hammer
node -e "const p=require('./.claude-plugin/plugin.json'), m=require('./.claude-plugin/marketplace.json'); if(p.name!=='claude-hammer') throw new Error('plugin name'); if(m.plugins[0].name!=='claude-hammer') throw new Error('mp name'); console.log('ok')"
```
Expected: prints `ok`.

- [ ] **Step 4: Commit**

```bash
cd /Users/roach/claude-hammer
git add .claude-plugin
git commit -m "feat: add Claude Code plugin + marketplace manifest

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: claude-hammer — Claude Code-native hooks.json + smoke test

**Files:**
- Create: `/Users/roach/claude-hammer/hooks/hooks.json`
- Create: `/Users/roach/claude-hammer/tests/smoke.test.js`

**Interfaces:**
- Consumes: submodule scripts at `glm-hammer/hooks/scripts/*.js` (Task 2).
- Produces: a hooks registration that Claude Code loads; all 8 hooks run the submodule scripts with `GLM_HAMMER_EMIT=claude`.

- [ ] **Step 1: Write the failing smoke test**

Create `/Users/roach/claude-hammer/tests/smoke.test.js`:

```js
'use strict';
// Zero-dep smoke test for claude-hammer. Run from repo root: node tests/smoke.test.js
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let failures = 0;
function check(name, cond, detail) {
  console.log(`${cond ? 'ok  ' : 'FAIL'} - ${name}${!cond && detail ? ` :: ${detail}` : ''}`);
  if (!cond) failures++;
}

// hooks.json parses
let hooks;
try { hooks = JSON.parse(fs.readFileSync(path.join(ROOT, 'hooks', 'hooks.json'), 'utf8')); }
catch (e) { check('hooks.json parses', false, String(e)); }

if (hooks) {
  const entries = [];
  for (const event of Object.keys(hooks.hooks)) {
    for (const group of hooks.hooks[event]) {
      for (const h of group.hooks) entries.push({ event, h });
    }
  }
  check('exactly 8 hook entries', entries.length === 8, `got ${entries.length}`);

  for (const { event, h } of entries) {
    check(`[${event}] type is command`, h.type === 'command', h.type);
    check(`[${event}] timeout is integer seconds`, Number.isInteger(h.timeout) && h.timeout < 1000, String(h.timeout));
    check(`[${event}] no statusMessage`, !('statusMessage' in h), 'has statusMessage');
    check(`[${event}] sets GLM_HAMMER_EMIT=claude`, /^GLM_HAMMER_EMIT=claude /.test(h.command), h.command);
    check(`[${event}] uses CLAUDE_PLUGIN_ROOT`, h.command.includes('${CLAUDE_PLUGIN_ROOT}/glm-hammer/hooks/scripts/'), h.command);

    const m = h.command.match(/scripts\/([\w-]+\.js)/);
    const scriptExists = m && fs.existsSync(path.join(ROOT, 'glm-hammer', 'hooks', 'scripts', m[1]));
    check(`[${event}] referenced script exists in submodule`, !!scriptExists, h.command);
  }
}

console.log(failures ? `\n${failures} FAILED` : '\nall ok');
process.exit(failures ? 1 : 0);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/roach/claude-hammer && node tests/smoke.test.js`
Expected: FAIL — `hooks.json parses` fails (file does not exist yet).

- [ ] **Step 3: Write `hooks/hooks.json`**

Create `/Users/roach/claude-hammer/hooks/hooks.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          { "type": "command", "command": "GLM_HAMMER_EMIT=claude node ${CLAUDE_PLUGIN_ROOT}/glm-hammer/hooks/scripts/session-start.js", "timeout": 10 }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          { "type": "command", "command": "GLM_HAMMER_EMIT=claude node ${CLAUDE_PLUGIN_ROOT}/glm-hammer/hooks/scripts/route-intent.js", "timeout": 10 }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          { "type": "command", "command": "GLM_HAMMER_EMIT=claude node ${CLAUDE_PLUGIN_ROOT}/glm-hammer/hooks/scripts/plan-gate.js", "timeout": 10 },
          { "type": "command", "command": "GLM_HAMMER_EMIT=claude node ${CLAUDE_PLUGIN_ROOT}/glm-hammer/hooks/scripts/token-gate.js", "timeout": 10 },
          { "type": "command", "command": "GLM_HAMMER_EMIT=claude node ${CLAUDE_PLUGIN_ROOT}/glm-hammer/hooks/scripts/comment-checker.js", "timeout": 10 },
          { "type": "command", "command": "GLM_HAMMER_EMIT=claude node ${CLAUDE_PLUGIN_ROOT}/glm-hammer/hooks/scripts/edit-diagnostics.js", "timeout": 15 }
        ]
      },
      {
        "matcher": "Agent|Task",
        "hooks": [
          { "type": "command", "command": "GLM_HAMMER_EMIT=claude node ${CLAUDE_PLUGIN_ROOT}/glm-hammer/hooks/scripts/dispatch-log.js", "timeout": 10 }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "GLM_HAMMER_EMIT=claude node ${CLAUDE_PLUGIN_ROOT}/glm-hammer/hooks/scripts/stop-gate.js", "timeout": 15 }
        ]
      }
    ]
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/roach/claude-hammer && node tests/smoke.test.js`
Expected: all checks `ok`, `all ok`, exit 0.

- [ ] **Step 5: Confirm Claude Code hook discovery mechanism**

Claude Code plugins may require hooks to be referenced from `plugin.json` rather than auto-discovered. Check the current behavior against the plugin-dev hook docs:

Run: `cat /Users/roach/.claude/CLAUDE.md >/dev/null; echo "consult superpowers plugin-dev:hook-development for discovery rule"`

If Claude Code does NOT auto-discover `hooks/hooks.json`, add this key to `/Users/roach/claude-hammer/.claude-plugin/plugin.json` and re-run Task 3 Step 3:

```json
  "hooks": "./hooks/hooks.json"
```

(Leave out if auto-discovery works — verified in Task 6.)

- [ ] **Step 6: Commit**

```bash
cd /Users/roach/claude-hammer
git add hooks/hooks.json tests/smoke.test.js
git commit -m "feat: add Claude Code-native hooks.json + smoke test

Converts all 8 ZCode hooks to CC format (type=command, timeout seconds),
running submodule scripts with GLM_HAMMER_EMIT=claude.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: claude-hammer — skills/agents symlinks + README

**Files:**
- Create: `/Users/roach/claude-hammer/skills` (symlink → `glm-hammer/skills`)
- Create: `/Users/roach/claude-hammer/agents` (symlink → `glm-hammer/agents`)
- Create: `/Users/roach/claude-hammer/README.md`

**Interfaces:**
- Consumes: submodule `skills/` and `agents/` (Task 2).
- Produces: root-level `skills/` and `agents/` for Claude Code auto-discovery.

- [ ] **Step 1: Create the symlinks**

```bash
cd /Users/roach/claude-hammer
ln -s glm-hammer/skills skills
ln -s glm-hammer/agents agents
```

- [ ] **Step 2: Verify symlinks resolve to real content**

Run:
```bash
cd /Users/roach/claude-hammer
test -f skills/forge/SKILL.md && test -f agents/security-reviewer.md && echo ok
```
Expected: prints `ok` (symlinks resolve into the submodule; `forge/SKILL.md` and `security-reviewer.md` exist).

- [ ] **Step 3: Write `README.md`**

Create `/Users/roach/claude-hammer/README.md`:

```markdown
# claude-hammer

Claude Code build of [glm-hammer](https://github.com/tmdgusya/glm-hammer) — a
forge-and-hammer engineering harness: storyline-driven design tokens verified by a
designer panel (crucible), recon-first strong planning verified by a 3-critic panel,
and a worker-validator-critic implementation loop with security/QA review gates
enforced by hooks.

## How it relates to glm-hammer

glm-hammer is ZCode-native. claude-hammer reuses its skills, agents, and hook scripts
**unchanged** via a git submodule (`glm-hammer/`), converting only the hook-runtime
differences between ZCode and Claude Code:

- `hooks/hooks.json` is Claude Code-native (`type: command`, `timeout` in seconds).
- Hook commands run the submodule scripts with `GLM_HAMMER_EMIT=claude`, which switches
  glm-hammer's `emitContext` to Claude Code's `hookSpecificOutput` schema.
- `skills/` and `agents/` are symlinks into the submodule (pure markdown, no conversion).

## Install (local)

    git clone --recurse-submodules <this-repo> ~/claude-hammer
    # In Claude Code: /plugin → add local marketplace → path ~/claude-hammer → install claude-hammer

If you cloned without `--recurse-submodules`:

    git -C ~/claude-hammer submodule update --init

## License

MIT
```

- [ ] **Step 4: Commit**

```bash
cd /Users/roach/claude-hammer
git add skills agents README.md
git commit -m "feat: symlink skills/agents from submodule + add README

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Verification gate — install into Claude Code and drive the flow

**Files:** none (integration verification).

**Interfaces:**
- Consumes: the full claude-hammer repo (Tasks 2–5) and glm-hammer submodule (Task 1).

This task cannot be unit-tested; it is the real-engine proof from the design spec. Perform each check and record the observation.

- [ ] **Step 1: Confirm glm-hammer has not regressed**

Run: `cd /Users/roach/glm-hammer && node tests/gates.test.js`
Expected: 0 failures (ZCode path intact).

- [ ] **Step 2: Install claude-hammer locally into Claude Code**

Suggest to the user (interactive step — plugin install is not scriptable here):
> Type `/plugin` in Claude Code → add a local marketplace pointing at `/Users/roach/claude-hammer` → install `claude-hammer`. Then start a fresh session in a scratch project.

- [ ] **Step 3: Verify `${CLAUDE_PLUGIN_ROOT}` resolves into the submodule**

In an installed session, confirm the SessionStart hook ran without a "cannot find module" error. If it errors, the path `${CLAUDE_PLUGIN_ROOT}/glm-hammer/...` did not resolve — inspect the installed plugin dir and confirm the submodule content is present (this is the submodule-init open question from the spec).
Expected: no module-not-found error; SessionStart status/context appears.

- [ ] **Step 4: Verify each hook fires**

In a scratch project under Claude Code, drive a work request and observe:
- SessionStart / UserPromptSubmit: routing/context is injected (the harness nudges toward forge/blueprint/hammer).
- PostToolUse (edit a file): plan-gate / token-gate / comment-checker / edit-diagnostics run.
- Stop: with an incomplete run, the Stop gate blocks and prints its reason.
Expected: all three categories observably fire. Record any that do not.

- [ ] **Step 5: If discovery failed, apply the plugin.json hooks reference**

If Step 4 shows hooks never ran, add `"hooks": "./hooks/hooks.json"` to `.claude-plugin/plugin.json` (Task 4 Step 5), re-install, and repeat Steps 3–4.

- [ ] **Step 6: Record results and commit any fix**

Append a short "Verification results" note to `/Users/roach/claude-hammer/README.md` (or a `docs/` note) describing what fired and whether the submodule-init/discovery fallbacks were needed. Commit.

```bash
cd /Users/roach/claude-hammer
git add -A
git commit -m "docs: record Claude Code verification results

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Reference mechanism = submodule → Task 2. ✅
- emitContext additive + explicit switch → Task 1. ✅
- skills/agents symlinks → Task 5. ✅
- CC-native hooks.json conversion table → Task 4. ✅
- Manifest (`claude-hammer`) → Task 3. ✅
- Verification gates (local install, path resolution, gate firing, glm-hammer green, submodule-init open question) → Task 6. ✅
- Deployment: symlinks now, vendor later (YAGNI) → honored; no vendor task. ✅

**Placeholder scan:** All hooks.json, manifest, test, and README content is shown in full. The only conditional is Task 4 Step 5 / Task 6 Step 5 (plugin.json `hooks` key), which is an explicitly-gated fallback with exact content, not a placeholder.

**Type consistency:** `emitContext(eventName, text)` signature and the `GLM_HAMMER_EMIT` / `${CLAUDE_PLUGIN_ROOT}/glm-hammer/hooks/scripts/` strings are identical across Tasks 1, 4, and the smoke test's assertions. Hook count (8) matches between the conversion source, hooks.json, and the smoke test.
