'use strict';
// PostToolUse hook (Write|Edit|MultiEdit): pptxx deck integrity gate — the
// deck-phase analog of token-gate.js.
// - every tracked write to a sealed deck file (slides.md / index.html /
//   attributions.md, deck-directory direct children only) RESEALS it.
// - index.html first passes an attribute-scoped static check: <script>,
//   javascript:, and remote/escaping references inside src/srcset/link-href/
//   url()/@import/iframe-object-embed REFUSE the seal (the Stop gate then
//   blocks on seal missing/broken). Plain-text URLs and <a href> attribution
//   links are deliberately allowed.
// - pptxx phase only: arming is a one-way ratchet grepped from the written
//   content (never un-armed), and writes while already armed invalidate
//   rounds via the frozen file→round reset mapping. The write that first
//   arms a flag does not bump any round.
const fs = require('fs');
const path = require('path');
const { readStdin, readState, writeState, emitContext, writeSeal } = require('./lib');

// ⚠ CROSS-MILESTONE CONTRACT: M1's spikes/pptx/format-spec.md must define
// diagram blocks with exactly this fenced opener. M1 runs in parallel —
// cross-verify at M3 kickoff.
const DIAGRAM_MARKER = '```diagram';

// Local image reference that trips the imagePanel ratchet when index.html seals.
const LOCAL_IMAGE_REF = /(?:src|srcset)\s*=\s*["']?(?!https?:|data:)[^"'\s>]*\.(?:png|jpe?g|gif|webp|svg)\b/i;

// Sealed-set file names (deck-directory direct children only — the planKey
// decks extension's single-segment match keeps subdirectories out).
const SEALED_NAMES = ['slides.md', 'index.html', 'attributions.md'];

// Static-check reference contexts (attribute-scoped — §0 frozen). <a href>
// and text-node URLs are intentionally NOT in this list (source attribution).
const REF_CONTEXTS = [
  /(?:src|srcset)\s*=\s*["']([^"']*)["']/gi,
  /<link\b[^>]*href\s*=\s*["']([^"']*)["']/gi,
  /url\(\s*["']?([^"')]+)["']?\s*\)/gi,
  /@import\s+["']([^"']+)["']/gi,
  /<(?:iframe|object|embed)\b[^>]*(?:src|data)\s*=\s*["']([^"']*)["']/gi,
];
const BAD_REF = /^(?:https?:|file:|\/|[a-zA-Z]:[\\/])|(?:^|[\\/])\.\.(?:[\\/]|$)/;

function staticProblems(body) {
  const problems = [];
  if (/<script\b/i.test(body)) problems.push('<script> element');
  if (/javascript:/i.test(body)) problems.push('javascript: URL');
  for (const ctx of REF_CONTEXTS) {
    ctx.lastIndex = 0;
    let m;
    while ((m = ctx.exec(body))) {
      // srcset values hold comma-separated "url [descriptor]" candidates;
      // deck-relative paths never contain commas, so splitting is safe here.
      const refs = m[1].split(',').map((c) => c.trim().split(/\s+/)[0]).filter(Boolean);
      for (const ref of refs) {
        if (BAD_REF.test(ref)) problems.push(`non-local reference "${ref}"`);
      }
    }
  }
  return problems;
}

try {
  const input = readStdin();
  const cwd = input.cwd || process.cwd();
  const filePath = String((input.tool_input && input.tool_input.file_path) || '');
  if (!filePath) process.exit(0);

  const normalized = path.normalize(filePath).replace(/\\/g, '/');
  const m = normalized.match(/docs\/glm-hammer\/decks\/[^/]+\/([^/]+)$/i);
  if (!m) process.exit(0); // subdirectories (shots/ etc.) are out of scope
  const base = m[1].toLowerCase();
  if (SEALED_NAMES.indexOf(base) === -1) process.exit(0); // binaries etc.

  let body = '';
  try {
    body = fs.readFileSync(path.resolve(cwd, filePath), 'utf8');
  } catch {
    body = '';
  }

  if (base === 'index.html') {
    const problems = staticProblems(body);
    if (problems.length) {
      emitContext(
        'PostToolUse',
        `[glm-hammer deck-gate] seal REFUSED for ${normalized} — static check failed: ${problems.slice(0, 8).join('; ')}. ` +
          'Deck HTML must be self-contained: no <script>, no javascript: URLs, and every src/srcset/link-href/url()/@import/iframe reference must be a deck-relative path. ' +
          'Plain-text source URLs and <a href> attribution links are fine. Fix and re-save — the Stop gate blocks while the seal is missing or broken.'
      );
      process.exit(0); // refused: no seal, no arming, no round reset
    }
  }

  const messages = [];
  const state = readState(cwd);
  const inPptxx = !!(state && state.phase === 'pptxx');
  let changed = false;

  if (inPptxx) {
    if (!state.visualQa || typeof state.visualQa !== 'object') state.visualQa = { required: false, round: 1 };
    if (!state.imagePanel || typeof state.imagePanel !== 'object') state.imagePanel = { required: 0, round: 1 };
    const vq = state.visualQa;
    const ip = state.imagePanel;

    // Round reset mapping — keyed on the armed state BEFORE this write's own
    // arming grep below, so the write that first arms a flag bumps nothing.
    const prevArmed = vq.required === true || ip.required === 1;
    if (prevArmed) {
      const bumped = [];
      if (base === 'slides.md') {
        vq.round = (vq.round || 1) + 1;
        ip.round = (ip.round || 1) + 1;
        bumped.push(`visualQa.round -> ${vq.round}`, `imagePanel.round -> ${ip.round}`);
      } else if (base === 'index.html') {
        vq.round = (vq.round || 1) + 1;
        bumped.push(`visualQa.round -> ${vq.round}`);
      } else if (base === 'attributions.md') {
        ip.round = (ip.round || 1) + 1;
        bumped.push(`imagePanel.round -> ${ip.round}`);
      }
      if (bumped.length) {
        changed = true;
        messages.push(
          `${base} changed while quality gates were armed — prior approvals are void (${bumped.join(', ')}). Re-dispatch the affected critics against the new round's evidence path.`
        );
      }
    }
  }

  writeSeal(cwd, filePath); // content-integrity record — phase-independent

  if (inPptxx) {
    const vq = state.visualQa;
    const ip = state.imagePanel;
    if (base === 'index.html' && ip.required !== 1 && LOCAL_IMAGE_REF.test(body)) {
      ip.required = 1; // one-way ratchet: never reset back to 0 here
      changed = true;
      messages.push(
        'index.html references local images — imagePanel.required is now 1. The image-suitability panel and the attributions.md manifest are required before stopping.'
      );
    }
    if (base === 'slides.md' && vq.required !== true && vq.exempt !== true && body.indexOf(DIAGRAM_MARKER) !== -1) {
      vq.required = true; // one-way ratchet
      changed = true;
      messages.push(
        'slides.md contains diagram blocks — visualQa.required is now true. A visual-qa-critic APPROVE receipt is required before stopping.'
      );
    }
    if (changed) writeState(cwd, state);
  }

  if (messages.length) emitContext('PostToolUse', `[glm-hammer deck-gate] ${messages.join(' ')}`);
  process.exit(0);
} catch {
  process.exit(0);
}
