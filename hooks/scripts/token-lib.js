'use strict';
// Deterministic design-token validation (contract shared by token-gate.js and
// stop-gate.js). Everything here must be decidable without model judgment:
// schema shape, required groups, value formats, WCAG contrast.
const fs = require('fs');

function isToken(node) {
  return !!node && typeof node === 'object' && !Array.isArray(node) && '$value' in node;
}

function flattenTokens(tree, prefix, out) {
  prefix = prefix || [];
  out = out || {};
  if (!tree || typeof tree !== 'object') return out;
  for (const [k, v] of Object.entries(tree)) {
    if (k.startsWith('$')) continue;
    if (isToken(v)) out[prefix.concat(k).join('.')] = v;
    else if (v && typeof v === 'object' && !Array.isArray(v)) flattenTokens(v, prefix.concat(k), out);
  }
  return out;
}

const ALIAS = /^\{([^}]+)\}$/;

function resolveTokenValue(tokens, name) {
  const seen = new Set([name]);
  let cur = tokens[name];
  for (let hops = 0; hops <= 10; hops++) {
    if (!cur) return undefined;
    const v = cur.$value;
    const m = typeof v === 'string' && v.match(ALIAS);
    if (!m) return v;
    const ref = m[1];
    if (seen.has(ref)) return undefined; // cycle
    seen.add(ref);
    cur = tokens[ref];
  }
  return undefined;
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const DIMENSION = /^-?\d+(\.\d+)?(px|rem|em|%)$/;
const DURATION = /^\d+(\.\d+)?m?s$/;

function hexToRgb(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16), // alpha (8-digit hex) intentionally ignored
  };
}

function channelLum(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channelLum(r) + 0.7152 * channelLum(g) + 0.0722 * channelLum(b);
}

function contrast(hexA, hexB) {
  const la = luminance(hexA);
  const lb = luminance(hexB);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function typeCheck(name, type, value, problems) {
  if (type === 'color') {
    if (typeof value !== 'string' || !HEX.test(value)) problems.push(`${name}: $type color must resolve to hex (#RGB/#RRGGBB/#RRGGBBAA), got ${JSON.stringify(value)}`);
  } else if (type === 'dimension') {
    if (typeof value !== 'string' || !DIMENSION.test(value)) problems.push(`${name}: $type dimension must match <number>px|rem|em|%, got ${JSON.stringify(value)}`);
  } else if (type === 'duration') {
    if (typeof value !== 'string' || !DURATION.test(value)) problems.push(`${name}: $type duration must match <number>ms|s, got ${JSON.stringify(value)}`);
  } else if (type === 'cubicBezier') {
    if (!Array.isArray(value) || value.length !== 4 || value.some((n) => typeof n !== 'number')) problems.push(`${name}: $type cubicBezier must be an array of 4 numbers`);
  } else if (type === 'fontFamily') {
    const ok = typeof value === 'string' || (Array.isArray(value) && value.length > 0 && value.every((s) => typeof s === 'string'));
    if (!ok) problems.push(`${name}: $type fontFamily must be a string or non-empty string array`);
  }
}

function groupTokens(tokens, prefix) {
  return Object.keys(tokens).filter((n) => n.startsWith(prefix + '.'));
}

function validateTokens(tokensPath) {
  const problems = [];
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
  } catch (e) {
    return { ok: false, problems: [`tokens.json missing or invalid JSON: ${e.message}`] };
  }
  const tokens = flattenTokens(doc);

  for (const g of ['color', 'typography', 'spacing', 'radius']) {
    if (!doc[g] || typeof doc[g] !== 'object') problems.push(`required top-level group missing: ${g}`);
  }
  for (const sub of ['color.text', 'color.surface', 'color.accent']) {
    if (groupTokens(tokens, sub).length < 1) problems.push(`required subgroup has no tokens: ${sub}`);
  }
  for (const req of ['color.text.default', 'color.surface.default']) {
    if (!tokens[req]) problems.push(`required token missing: ${req}`);
  }

  for (const [name, t] of Object.entries(tokens)) {
    if (!t.$type) {
      problems.push(`${name}: every token must carry its own $type (group inheritance unsupported)`);
      continue;
    }
    const value = resolveTokenValue(tokens, name);
    if (value === undefined) {
      problems.push(`${name}: alias does not resolve (missing target or cycle)`);
      continue;
    }
    typeCheck(name, t.$type, value, problems);
  }

  const expectType = (prefix, type, min) => {
    const names = groupTokens(tokens, prefix);
    if (min && names.length < min) problems.push(`${prefix} needs at least ${min} token(s), found ${names.length}`);
    for (const n of names) {
      if (tokens[n].$type !== type) problems.push(`${n}: tokens under ${prefix} must be $type ${type}`);
    }
  };
  expectType('typography.font', 'fontFamily', 1);
  expectType('typography.size', 'dimension', 3);
  expectType('spacing', 'dimension', 4);
  expectType('radius', 'dimension', 1);
  if (doc.motion) {
    expectType('motion.duration', 'duration', 0);
    expectType('motion.easing', 'cubicBezier', 0);
  }

  const surface = resolveTokenValue(tokens, 'color.surface.default');
  if (typeof surface === 'string' && HEX.test(surface)) {
    const pairRule = (prefix, minDefault) => {
      for (const n of groupTokens(tokens, prefix)) {
        const v = resolveTokenValue(tokens, n);
        if (typeof v !== 'string' || !HEX.test(v)) continue; // format problem already reported
        const min = /muted|subtle|disabled|placeholder/i.test(n) ? 3.0 : minDefault;
        const ratio = contrast(v, surface);
        if (ratio < min) problems.push(`${n}: contrast vs color.surface.default is ${ratio.toFixed(2)}:1, below the required ${min}:1`);
      }
    };
    pairRule('color.text', 4.5);
    pairRule('color.accent', 3.0);
  }

  return { ok: problems.length === 0, problems };
}

const SPEC_HEADINGS = ['## Story & Direction', '## References', '## Token Rationale', '## Application Guide', '## Fidelity Notes'];

function validateSpec(specPath) {
  let body;
  try {
    body = fs.readFileSync(specPath, 'utf8');
  } catch (e) {
    return { ok: false, problems: [`design-spec.md missing: ${e.message}`] };
  }
  const problems = SPEC_HEADINGS.filter((h) => !body.includes(h)).map((h) => `design-spec.md missing required heading: ${h}`);
  return { ok: problems.length === 0, problems };
}

module.exports = { validateTokens, validateSpec, contrast, flattenTokens, resolveTokenValue };
