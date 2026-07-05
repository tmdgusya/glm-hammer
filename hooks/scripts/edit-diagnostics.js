'use strict';
// PostToolUse hook (Write|Edit): project-tool diagnostics (OmO/lazycodex model:
// "the plugin connects and guides; the project supplies the tools").
//
// After an edit, DISCOVER the best checkers already available for that file —
// project-local node_modules bins, then PATH tools — run them scoped to the
// file, and feed failures back into the conversation so the agent fixes them
// in the same turn. Everything is fail-open: a tool that is absent, has no
// config, or crashes is silently skipped; only genuine findings speak.
//
// Discovery per language (first found wins within a tier, tiers accumulate):
//   JS/TS   syntax: node --check (.js/.cjs/.mjs)
//           lint:   node_modules → biome | eslint | oxlint
//           types:  node_modules typescript tsc --noEmit (OPT-IN, project-wide)
//   Python  ruff (PATH/venv) → else python -m py_compile; pyright (OPT-IN)
//   JSON    JSON.parse (JSONC files skipped)
//   Go      go vet ./<dir> (needs go.mod up-tree)
//   Shell   bash -n; shellcheck (PATH)
//   Ruby    ruby -c        PHP  php -l        YAML  yamllint (PATH)
//   CSS     node_modules stylelint (exit 2 = findings)
//
// Optional config at .glm-hammer/diagnostics.json:
//   { "typecheck": true, "disable": ["eslint"], "timeoutMs": 15000 }
// "typecheck" enables the slow project-wide checkers (tsc, pyright) — off by
// default so the hammer loop stays fast on large repos.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { readStdin, emitContext } = require('./lib');

const SKIP_DIRS = /(^|[\\/])(node_modules|dist|build|out|vendor|\.git|\.glm-hammer)([\\/]|$)/;
const JSONC = /(^|[\\/])(tsconfig[^\\/]*\.json|settings\.json|launch\.json|.*\.jsonc)$/i;
const DEFAULT_TIMEOUT = 10000;
const OUTPUT_CAP = 1600;

function loadConfig(cwd) {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(cwd, '.glm-hammer', 'diagnostics.json'), 'utf8'));
    return {
      typecheck: raw.typecheck === true,
      disable: new Set(Array.isArray(raw.disable) ? raw.disable : []),
      timeoutMs: Number.isInteger(raw.timeoutMs) ? raw.timeoutMs : DEFAULT_TIMEOUT,
    };
  } catch {
    return { typecheck: false, disable: new Set(), timeoutMs: DEFAULT_TIMEOUT };
  }
}

// Walk up from the edited file to the workspace root looking for a marker.
function findUp(fromDir, stopDir, relPath) {
  let dir = fromDir;
  const stop = path.resolve(stopDir);
  for (let i = 0; i < 30; i++) {
    const candidate = path.join(dir, relPath);
    if (fs.existsSync(candidate)) return candidate;
    if (path.resolve(dir) === stop) break;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

// Resolve a node package's real JS entry (the .bin shims are .cmd on Windows
// and cannot be spawned without a shell) — run `node <entry>` instead.
function findNodeBin(fromDir, stopDir, candidates) {
  for (const rel of candidates) {
    const hit = findUp(fromDir, stopDir, path.join('node_modules', rel));
    if (hit) return hit;
  }
  return null;
}

function run(cmd, args, opts) {
  try {
    const r = spawnSync(cmd, args, {
      timeout: (opts && opts.timeoutMs) || DEFAULT_TIMEOUT,
      encoding: 'utf8',
      windowsHide: true,
      cwd: opts && opts.cwd,
    });
    if (r.error) return null; // not installed / not runnable → skip silently
    return { status: r.status, out: `${r.stdout || ''}${r.stderr || ''}`.trim() };
  } catch {
    return null;
  }
}

function runNode(entryJs, args, opts) {
  return run(process.execPath, [entryJs, ...args], opts);
}

// A check returns: null (skipped) | {ok:true} | {ok:false, name, out}
function result(name, r, failStatuses) {
  if (!r) return null;
  const failed = failStatuses ? failStatuses.includes(r.status) : r.status !== 0;
  // unexpected exit codes (tool/config errors) are treated as "skip", not findings
  if (!failed && failStatuses && r.status !== 0) return null;
  return failed ? { ok: false, name, out: r.out } : { ok: true };
}

function buildChecks(ctx) {
  const { file, ext, dir, cwd, cfg } = ctx;
  const JSTS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.mts', '.cts', '.vue', '.svelte'];
  const checks = [];

  // --- JS/TS family ---
  if (['.js', '.cjs', '.mjs'].includes(ext)) {
    checks.push({ name: 'node-syntax', run: () => result('node-syntax', run(process.execPath, ['--check', file])) });
  }
  if (JSTS.includes(ext)) {
    checks.push({
      name: 'biome',
      run: () => {
        const bin = findNodeBin(dir, cwd, [path.join('@biomejs', 'biome', 'bin', 'biome')]);
        return bin ? result('biome', runNode(bin, ['check', '--colors=off', file]), [1]) : null;
      },
    });
    checks.push({
      name: 'eslint',
      run: () => {
        const bin = findNodeBin(dir, cwd, [path.join('eslint', 'bin', 'eslint.js')]);
        return bin ? result('eslint', runNode(bin, [file, '--no-color', '--quiet']), [1]) : null;
      },
    });
    checks.push({
      name: 'oxlint',
      run: () => {
        const bin = findNodeBin(dir, cwd, [path.join('oxlint', 'bin', 'oxlint')]);
        return bin ? result('oxlint', runNode(bin, [file]), [1]) : null;
      },
    });
    checks.push({
      name: 'tsc',
      optIn: true,
      run: () => {
        const tsc = findNodeBin(dir, cwd, [path.join('typescript', 'bin', 'tsc')]);
        const tsconfig = findUp(dir, cwd, 'tsconfig.json');
        if (!tsc || !tsconfig) return null;
        const r = runNode(tsc, ['--noEmit', '-p', path.dirname(tsconfig)], { timeoutMs: 45000 });
        if (!r || r.status === 0) return r ? { ok: true } : null;
        const base = path.basename(file);
        const lines = r.out.split('\n');
        const mine = lines.filter((l) => l.includes(base));
        return { ok: false, name: 'tsc', out: (mine.length ? mine : lines).slice(0, 20).join('\n') };
      },
    });
  }

  // --- JSON ---
  if (ext === '.json' && !JSONC.test(file)) {
    checks.push({
      name: 'json',
      run: () => {
        try {
          JSON.parse(fs.readFileSync(file, 'utf8'));
          return { ok: true };
        } catch (e) {
          return { ok: false, name: 'json', out: String((e && e.message) || e) };
        }
      },
    });
  }

  // --- Python ---
  if (ext === '.py') {
    checks.push({
      name: 'ruff',
      run: () => result('ruff', run('ruff', ['check', '--no-cache', '--quiet', file]), [1]),
    });
    checks.push({
      name: 'py-syntax',
      run: () => {
        // only as fallback when ruff is absent (ruff already catches syntax)
        if (run('ruff', ['--version'])) return null;
        return result('py-syntax', run('python', ['-m', 'py_compile', file]) || run('py', ['-m', 'py_compile', file]));
      },
    });
    checks.push({
      name: 'pyright',
      optIn: true,
      run: () => result('pyright', run('pyright', [file], { timeoutMs: 45000 }), [1]),
    });
  }

  // --- Go ---
  if (ext === '.go') {
    checks.push({
      name: 'go-vet',
      run: () => {
        const mod = findUp(dir, cwd, 'go.mod');
        if (!mod) return null;
        const modRoot = path.dirname(mod);
        const rel = path.relative(modRoot, dir).split(path.sep).join('/') || '.';
        return result('go-vet', run('go', ['vet', `./${rel === '.' ? '' : rel}`.replace(/\/$/, '') || './.'], { cwd: modRoot, timeoutMs: 30000 }));
      },
    });
  }

  // --- Shell ---
  if (ext === '.sh' || ext === '.bash') {
    checks.push({ name: 'bash-syntax', run: () => result('bash-syntax', run('bash', ['-n', file])) });
    checks.push({ name: 'shellcheck', run: () => result('shellcheck', run('shellcheck', ['-f', 'tty', file]), [1]) });
  }

  // --- Ruby / PHP / YAML ---
  if (ext === '.rb') checks.push({ name: 'ruby-syntax', run: () => result('ruby-syntax', run('ruby', ['-c', file])) });
  if (ext === '.php') checks.push({ name: 'php-syntax', run: () => result('php-syntax', run('php', ['-l', file])) });
  if (ext === '.yml' || ext === '.yaml') {
    checks.push({ name: 'yamllint', run: () => result('yamllint', run('yamllint', ['-f', 'parsable', file]), [1]) });
  }

  // --- CSS ---
  if (ext === '.css' || ext === '.scss') {
    checks.push({
      name: 'stylelint',
      run: () => {
        const bin = findNodeBin(dir, cwd, [
          path.join('stylelint', 'bin', 'stylelint.mjs'),
          path.join('stylelint', 'bin', 'stylelint.js'),
        ]);
        // stylelint: exit 2 = lint problems; 1/78 = usage or config errors → skip
        return bin ? result('stylelint', runNode(bin, [file, '--no-color']), [2]) : null;
      },
    });
  }

  return checks.filter((c) => !cfg.disable.has(c.name) && (!c.optIn || cfg.typecheck));
}

try {
  const input = readStdin();
  const cwd = input.cwd || process.cwd();
  const file = String((input.tool_input && input.tool_input.file_path) || '');
  if (!file || SKIP_DIRS.test(file)) process.exit(0);
  const ext = path.extname(file).toLowerCase();
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size > 1024 * 1024) process.exit(0);

  const cfg = loadConfig(cwd);
  const checks = buildChecks({ file, ext, dir: path.dirname(file), cwd, cfg });
  const failures = [];
  for (const c of checks) {
    let r = null;
    try {
      r = c.run();
    } catch {
      r = null;
    }
    if (r && r.ok === false) failures.push(r);
  }
  if (failures.length === 0) process.exit(0);

  let budget = OUTPUT_CAP;
  const parts = [];
  for (const f of failures) {
    const chunk = `── ${f.name} ──\n${(f.out || '(no output)').slice(0, Math.max(200, budget))}`;
    parts.push(chunk);
    budget -= chunk.length;
    if (budget <= 0) break;
  }
  emitContext(
    'PostToolUse',
    `[glm-hammer diagnostics] ${failures.length} check(s) failed for ${file} — fix these now, before any other step:\n${parts.join('\n')}`
  );
  process.exit(0);
} catch {
  process.exit(0);
}
