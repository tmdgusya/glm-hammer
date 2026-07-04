'use strict';
// PostToolUse hook (Write|Edit): LSP-lite diagnostics (pattern from lazycodex/OmO).
// ZCode's plugin `lspServers` component is currently declared-but-not-executed
// (diagnostic-only), so instead of bundling a language server we run fast,
// dependency-free syntax checks on the just-edited file and feed failures back
// into the conversation — the agent fixes them in the same turn instead of
// discovering them at the E2E gate.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { readStdin, emitContext } = require('./lib');

const SKIP_DIRS = /(^|[\\/])(node_modules|dist|build|vendor|\.git|\.glm-hammer)([\\/]|$)/;
const JSONC = /(^|[\\/])(tsconfig[^\\/]*\.json|settings\.json|launch\.json|.*\.jsonc)$/i;
const TIMEOUT_MS = 8000;

function run(cmd, args) {
  try {
    const r = spawnSync(cmd, args, { timeout: TIMEOUT_MS, encoding: 'utf8', windowsHide: true });
    if (r.error) return null; // tool not installed / not runnable → skip silently
    return { ok: r.status === 0, out: `${r.stderr || ''}${r.stdout || ''}`.trim() };
  } catch {
    return null;
  }
}

function checkFile(filePath, ext) {
  if (ext === '.js' || ext === '.cjs' || ext === '.mjs') {
    return run(process.execPath, ['--check', filePath]);
  }
  if (ext === '.json') {
    if (JSONC.test(filePath)) return null;
    try {
      JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return { ok: true, out: '' };
    } catch (e) {
      return { ok: false, out: String(e.message || e) };
    }
  }
  if (ext === '.py') {
    // try python, then the Windows launcher
    return run('python', ['-m', 'py_compile', filePath]) || run('py', ['-m', 'py_compile', filePath]);
  }
  return null;
}

try {
  const input = readStdin();
  const filePath = String((input.tool_input && input.tool_input.file_path) || '');
  if (!filePath || SKIP_DIRS.test(filePath)) process.exit(0);
  const ext = path.extname(filePath).toLowerCase();
  const stat = fs.statSync(filePath);
  if (!stat.isFile() || stat.size > 1024 * 1024) process.exit(0);

  const result = checkFile(filePath, ext);
  if (!result || result.ok) process.exit(0);

  const detail = result.out.slice(0, 1200);
  emitContext(
    'PostToolUse',
    `[glm-hammer diagnostics] Syntax check FAILED for ${filePath} — the file you just wrote does not parse. Fix it now, before any other step:\n${detail}`
  );
  process.exit(0);
} catch {
  process.exit(0);
}
