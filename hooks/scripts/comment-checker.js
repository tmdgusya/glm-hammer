'use strict';
// PostToolUse hook (Write|Edit): AI-slop comment checker (pattern from lazycodex/OmO).
// Scans the just-edited file for comments that should never survive an edit:
//   1. elision markers ("... existing code ...", "rest unchanged") — these CORRUPT files
//   2. change-narration comments ("// added X", "// now we...") — PR chatter, not code docs
//   3. placeholder comments ("TODO: implement later") — unfinished work wearing a comment
// Emits additionalContext so the agent fixes them immediately, in the same turn.
const fs = require('fs');
const path = require('path');
const { readStdin, emitContext } = require('./lib');

const C_LIKE = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.java', '.c', '.h', '.cpp', '.hpp', '.cs', '.go', '.rs', '.kt', '.swift', '.php', '.scala', '.css', '.scss', '.less']);
const HASH = new Set(['.py', '.rb', '.sh', '.bash', '.zsh', '.yaml', '.yml', '.toml', '.ps1', '.r', '.pl']);
const SKIP_DIRS = /(^|[\\/])(node_modules|dist|build|vendor|\.git|\.glm-hammer)([\\/]|$)/;

// [regex, category] — tested against the comment TEXT (marker stripped, trimmed)
const SLOP = [
  [/\.\.\..{0,20}(existing|rest|remaining|other|unchanged|omitted|같음|생략|동일)/i, 'elision'],
  [/^(existing|original|previous)\s+(code|content|implementation)/i, 'elision'],
  [/rest of (the )?(file|code|function|class|method)/i, 'elision'],
  [/(remains?|left|stays?)\s+unchanged/i, 'elision'],
  [/^(기존|이하|나머지)\s*(코드|내용)?\s*(생략|동일|유지)/, 'elision'],
  [/^(added|updated|changed|removed|fixed|modified|renamed|refactored|moved|now)\b/i, 'narration'],
  [/^(new|change|fix|update)\s*:/i, 'narration'],
  [/^(추가|수정|변경|삭제|이동)(됨|함|했음|:)/, 'narration'],
  [/^(as requested|per (the )?(request|instructions))/i, 'narration'],
  [/^(todo|fixme)\b.{0,10}(implement|later|add|fill)/i, 'placeholder'],
  [/^placeholder\b/i, 'placeholder'],
  [/implement (this )?(later|properly|for real)/i, 'placeholder'],
];

function commentsOf(ext, source) {
  const out = []; // {line, text}
  const lines = source.split('\n');
  if (C_LIKE.has(ext)) {
    let inBlock = false;
    lines.forEach((raw, i) => {
      let line = raw;
      if (inBlock) {
        const end = line.indexOf('*/');
        const chunk = end === -1 ? line : line.slice(0, end);
        out.push({ line: i + 1, text: chunk.replace(/^\s*\*?\s?/, '').trim() });
        if (end === -1) return;
        inBlock = false;
        line = line.slice(end + 2);
      }
      const block = line.indexOf('/*');
      const sl = line.indexOf('//');
      if (block !== -1 && (sl === -1 || block < sl)) {
        const end = line.indexOf('*/', block + 2);
        const chunk = end === -1 ? line.slice(block + 2) : line.slice(block + 2, end);
        out.push({ line: i + 1, text: chunk.trim() });
        if (end === -1) inBlock = true;
      } else if (sl !== -1) {
        out.push({ line: i + 1, text: line.slice(sl + 2).trim() });
      }
    });
  } else if (HASH.has(ext)) {
    lines.forEach((raw, i) => {
      const m = /(^|\s)#(?!!)(.*)$/.exec(raw);
      if (m) out.push({ line: i + 1, text: m[2].trim() });
    });
  }
  return out;
}

try {
  const input = readStdin();
  const filePath = String((input.tool_input && input.tool_input.file_path) || '');
  if (!filePath || SKIP_DIRS.test(filePath)) process.exit(0);
  const ext = path.extname(filePath).toLowerCase();
  if (!C_LIKE.has(ext) && !HASH.has(ext)) process.exit(0);
  if (filePath.endsWith('.min' + ext)) process.exit(0);

  const stat = fs.statSync(filePath);
  if (!stat.isFile() || stat.size > 512 * 1024) process.exit(0);
  const source = fs.readFileSync(filePath, 'utf8');

  const findings = [];
  for (const { line, text } of commentsOf(ext, source)) {
    if (!text) continue;
    for (const [re, category] of SLOP) {
      if (re.test(text)) {
        findings.push({ line, text: text.slice(0, 80), category });
        break;
      }
    }
    if (findings.length >= 10) break;
  }
  if (findings.length === 0) process.exit(0);

  const hasElision = findings.some((f) => f.category === 'elision');
  const list = findings
    .map((f) => `  L${f.line} [${f.category}] ${f.text}`)
    .join('\n');
  let msg = `[glm-hammer comment-checker] ${path.basename(filePath)} contains comments that must not survive this edit:\n${list}\n`;
  if (hasElision) {
    msg +=
      'ELISION MARKERS LIKELY CORRUPTED THE FILE: an "existing code / rest unchanged" comment means real content was replaced by a note. Re-read the file and restore the full content NOW. ';
  }
  msg +=
    'Fix the rest before moving on: delete change-narration comments (code comments explain WHY the code is as it is, never what you just changed), and replace placeholder comments with the actual implementation or a tracked task.';
  emitContext('PostToolUse', msg);
  process.exit(0);
} catch {
  process.exit(0);
}
