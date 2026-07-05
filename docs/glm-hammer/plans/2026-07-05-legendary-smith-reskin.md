# Plan — Legendary Smith Reskin (index.html + README, EN default + KO variant)

**Date:** 2026-07-05
**Author:** forge (crucible-approved design `docs/glm-hammer/design/2026-07-05-legendary-smith`)

## Goal (one sentence)

Reskin glm-hammer's `index.html` and `README.md` into the "Legendary Smith" visual world (mythic nordic smithy — warm forge dominant, cold snow as journey accent), translating all copy to **English (default)** and producing **separate Korean variants** (`index.ko.html`, `README.ko.md`), driven entirely by the crucible-approved tokens.

## Architecture (2-3 sentences)

A static, dependency-free reskin: the W3C tokens become CSS custom properties on `:root` and structural/typographic decisions in markdown. The landing page gains a Google Fonts `<link>` (Cinzel / Newsreader / IBM Plex Mono) and becomes English-default with a Korean sibling page; Korean glyphs fall back to system faces (Pretendard → Apple SD Gothic → Malgun Gothic) so the smithy voice survives the script switch via weight × tracking × all-caps (per design-spec). No plugin code, hooks, or tests are modified — the reskin is confined to four content artifacts plus the advisory refinement to the two crucible artifacts.

## Tech Stack

- Static HTML5 + inline CSS (no build step, no JS framework — current page is fully self-contained).
- Google Fonts CDN (`<link>` only; no JS). Korean via system font stack.
- Markdown (GitHub Flavored) for the two READMEs.
- Verification runtime: Node.js 18+ (only for the existing gate test suite).

## Work Scope

**In:**
- `index.html` — rewrite to English-default Legendary Smith theme (structure preserved, content translated, tokens applied, SVG recolored, hero motion).
- `index.ko.html` — NEW Korean sibling page (same theme/structure, Korean copy, `lang="ko"`).
- `README.md` — rewrite to English-default with smithy structure.
- `README.ko.md` — NEW Korean sibling (current Korean README content, reskinned structure).
- `docs/glm-hammer/design/2026-07-05-legendary-smith/tokens.json` — advisory label fix (Task 1).
- `docs/glm-hammer/design/2026-07-05-legendary-smith/design-spec.md` — advisory doc additions (Task 1).

**Out:**
- Plugin code (`hooks/`, `agents/`, `skills/`).
- `tests/gates.test.js` (run only, never modify).
- The crucible token *values* — no hex/rem is changed by this plan (the cold-hue advisory is answered in documentation, not by altering a fidelity-traced value; see Task 1 rationale).
- Any build pipeline / CI / GitHub Pages config (none exists; pages served from `main` root).

## Verification Strategy

- **Level:** test-suite + structural review.
- **Automated command:** `node tests/gates.test.js` (from repo root; exit 0 = pass). Proves the reskin did not regress the plugin's gate logic (the suite asserts token/spec validation, contrast, seal/reset behavior). This is a regression guard — the reskin doesn't touch plugin code, so the suite should remain green unchanged.
- **Deterministic token check (real file):**
  `node -e "const r=require('./hooks/scripts/token-lib').validateTokens('docs/glm-hammer/design/2026-07-05-legendary-smith/tokens.json'); console.log(r.ok?'PASS':'FAIL',r.problems)"`
  Proves Task 1's label fix did not break the token contract (it must print `PASS`).
- **Spec-heading check (real file):**
  `node -e "const r=require('./hooks/scripts/token-lib').validateSpec('docs/glm-hammer/design/2026-07-05-legendary-smith/design-spec.md'); console.log(r.ok?'PASS':'FAIL',r.problems)"`
  Proves Task 1's spec edits kept the five required headings.
- **Structural review (manual, no HTML tooling exists in-repo):** the Final Verification Task's checklist — every original section present in both languages, CSS `:root` contains every token value verbatim, SVG recolored per the map, EN↔KO cross-links resolve, no residual old-theme hex in `:root`. No automated HTML validator is introduced (out of scope); well-formedness is assured by the structural review + the worker using the Write tool to produce clean markup.

## File Structure Mapping

| File | Action | Anchors |
|---|---|---|
| `docs/glm-hammer/design/2026-07-05-legendary-smith/tokens.json` | Modify | `typography.size` group `$description`; no value change |
| `docs/glm-hammer/design/2026-07-05-legendary-smith/design-spec.md` | Modify | `## Token Rationale` (size label), `## Fidelity Notes` (cold two-material note + dark-mode stance) |
| `index.html` | Rewrite | `<html lang>` → `en`; `<head>` + fonts; `:root`; all `<section>`s; §01 `<svg>`; `<header>`/`<footer>` |
| `index.ko.html` | Create | mirrors `index.html` structure; `lang="ko"`; Korean copy |
| `README.md` | Rewrite | all `##` sections → English; smithy structure |
| `README.ko.md` | Create | mirrors `README.md`; Korean (reskinned current content) |

---

## Task 1: Apply crucible advisory refinements (tokens.json + design-spec.md)

**Goal:** Honor the three non-blocking panel advisories by fixing the one inaccurate label and documenting the two design-stance points — without altering any fidelity-traced token value.

**Dependencies:** None (first task; the reskin references the refined spec).

**Files:**
- Modify `docs/glm-hammer/design/2026-07-05-legendary-smith/tokens.json` (anchors: the `typography.$description` parent string at L37; the `typography.size.xl.$description` child string at L49). NOTE: there is no `typography.size.$description` group key — the "Major-Third 1.250" claim lives on the `typography` parent and is repeated in the `xl` child. Both must be corrected.
- Modify `docs/glm-hammer/design/2026-07-05-legendary-smith/design-spec.md` (anchor: `## Token Rationale` → typography `size` bullet at L105).
- Modify `docs/glm-hammer/design/2026-07-05-legendary-smith/references.md` (anchor: the "Smelter type system (synthesis)" line at L35).

**Acceptance Criteria:**
- [ ] `node -e "const r=require('./hooks/scripts/token-lib').validateTokens('docs/glm-hammer/design/2026-07-05-legendary-smith/tokens.json'); console.log(r.ok?'PASS':'FAIL',r.problems)"` prints `PASS` (token contract intact).
- [ ] `node -e "const r=require('./hooks/scripts/token-lib').validateSpec('docs/glm-hammer/design/2026-07-05-legendary-smith/design-spec.md'); console.log(r.ok?'PASS':'FAIL',r.problems)"` prints `PASS` (five headings intact).
- [ ] `grep -c "Major" docs/glm-hammer/design/2026-07-05-legendary-smith/tokens.json` returns `0` (no "Major-Third" claim remains in either the `typography.$description` parent at L37 or the `typography.size.xl.$description` child at L49).
- [ ] `grep -c "Major" docs/glm-hammer/design/2026-07-05-legendary-smith/design-spec.md` returns `0` (the L105 bullet no longer says "Major Third 1.250").
- [ ] `grep -c "Major" docs/glm-hammer/design/2026-07-05-legendary-smith/references.md` returns `0` (the L35 synthesis line no longer says "Major Third (1.250)").
- [ ] No hex or rem value in `tokens.json` differs from the crucible-approved set: `git diff -- docs/glm-hammer/design/2026-07-05-legendary-smith/tokens.json` shows ONLY `$description` string lines changed (zero `$value` lines in the diff).
- [ ] `design-spec.md` `## Fidelity Notes` contains a sentence explaining `accent.cold` (#84a7b1, verdigris/frost patina) and `line.cold` (#003153, cyanotype Prussian blueprint ink) are intentionally two distinct cold materials (oxidized bronze surface vs blueprint rule), so the hue gap is by design, not an oversight.
- [ ] `design-spec.md` `## Fidelity Notes` contains a one-sentence dark-mode stance: the system is dark-first (forge-floor `#1a1410` is the default surface); a light/parchment inversion is not specified.
- [ ] `design-spec.md` `## Token Rationale` typography `size` bullet (L105) no longer says "Major Third 1.250"; matches the new honest label.

**Steps:**
1. **Step 1.1 — Fix the type-scale label in tokens.json (two locations).** In `tokens.json`:
   - L37 `typography.$description` (parent): change "Three-voice system mined by type-prospector: Cinzel display (smith), Newsreader body (saga prose), IBM Plex Mono (blueprint drafting). Major-Third 1.250 scale; positive tracking on display + uppercase labels." → replace the sentence "Major-Third 1.250 scale;" with "Curated progressive scale (12/14/16/18/20/26/40/52/72px — tight steps for body, wider leaps for display);".
   - L49 `typography.size.xl.$description` (child): change "26px — h2 section heads (Major-Third step)." → "26px — h2 section heads (curated progressive step).".
   Do not touch any `$value` anywhere in the file.
2. **Step 1.2 — Mirror the label in design-spec.md.** In `design-spec.md` L105 under `## Token Rationale` → `### typography`, change the `- **size** — Major Third 1.250 scale, 12/14/16/18/20/26/40/52/72px (patient, unhurried — the rationale anchor).` bullet to: `- **size** — curated progressive scale 12/14/16/18/20/26/40/52/72px (tight steps for body, wider leaps for display; patient and unhurried). Non-geometric by intent.`.
3. **Step 1.3 — Mirror the label in references.md.** In `references.md` L35 (the "Smelter type system (synthesis)" line), change "Major Third (1.250) scale 12/14/16/18/20/26/40/52/72px" → "curated progressive scale 12/14/16/18/20/26/40/52/72px (tight steps for body, wider leaps for display)".
4. **Step 1.4 — Add the cold two-material fidelity note.** In `design-spec.md` `## Fidelity Notes`, append a bullet: `- **Two cold materials, by design.** \`accent.cold #84a7b1\` (verdigris/frost patina — the oxidized-bronze surface accent) and \`line.cold #003153\` (cyanotype Prussian-blueprint ink — the cold border rule) are intentionally distinct hues: two real prospected materials (ref C4 verdigris/frost vs ref C4 Prussian cyanotype), not one cold family drifting apart. The harmony panel flagged the gap as advisory; preserving both honors fidelity to the references over superficial hue-matching.`
5. **Step 1.5 — Add the dark-mode stance.** In `design-spec.md` `## Fidelity Notes`, append a bullet: `- **Dark-first system.** The token set is dark-first — \`color.surface.default #1a1410\` (the forge floor) is the canonical canvas; all contrast ratios are computed against it. A light/parchment inversion is out of scope for this reskin; the \`color.surface.parchment\` token exists only as a localized contrast panel (e.g. blueprint plates with dark ink), never as a site-wide theme.`
6. **Step 1.6 — Verify.** Run the two `node -e` commands above; both must print `PASS`. Run `grep -c "Major" docs/glm-hammer/design/2026-07-05-legendary-smith/{tokens.json,design-spec.md,references.md}` — all three counts must be `0`. Run `git diff -- docs/glm-hammer/design/2026-07-05-legendary-smith/tokens.json` and confirm only `$description` string lines changed (no `$value` lines in the diff).

---

## Task 2: Rewrite `index.html` — English-default Legendary Smith landing page

**Goal:** Replace the current Korean self-contained landing page with an English-default page that applies the full Legendary Smith token system (color, type, spacing, radius, motion) to the existing section structure, adds the three web fonts, recolors the §01 SVG, and gives the hero its one weighted settle + ember-flicker ambience.

**Dependencies:** Task 1 (spec label finalized so design-spec is the stable reference).

**Files:**
- Rewrite `index.html` (anchors: `<html lang>`, `<head>`, `<style>`/`:root`, `<header>`, every `<section>` §00–§07, the §01 `<svg>`, `<footer>`)

**Acceptance Criteria:**
- [ ] `<html lang="en">` (no longer `"ko"`); no Korean (Hangul) appears in the body copy. `grep -cP '[\x{AC00}-\x{D7AF}]' index.html` returns exactly `1`, and the single match is the language-switch anchor `한국어` (the link to `index.ko.html`).
- [ ] `<head>` contains a Google Fonts `<link>` (or preconnect + stylesheet) loading **Cinzel** (weights 600,700,900), **Newsreader** (weights 400,600, ital 400), and **IBM Plex Mono** (weights 400,500,600).
- [ ] The CSS `:root` block defines every token as a custom property with values copied **verbatim** from `tokens.json` — surface (default #1a1410, raised #2a211a, sunken #14100c, ember #2a1a12, parchment #efe7d6), text (default #efe7d6, muted #9a8b73, subtle #7a6b56, ember #ff8e57), accent (default #d97b30, strong #c0421d, cold #84a7b1, gold #c9a227), line (default #3a2e22, strong #5a4634, ember #a6341d, cold #003153), status (ok #7ec97e, no #e06c5a), and the type/spacing/radius/motion tokens. None of the OLD theme hexes (#12100e, #1a1714, #211d19, #ff8c42, #ffb347, #ff5e3a, #e8e0d4, #a89e8e, #6f6558) remain in `:root`.
- [ ] `:root` font stacks match tokens exactly: display `Cinzel, Fraunces, Pretendard, Apple SD Gothic Neo, Malgun Gothic, serif`; body `Newsreader, Pretendard, Apple SD Gothic Neo, Malgun Gothic, Georgia, serif`; mono `IBM Plex Mono, ui-monospace, JetBrains Mono, Cascadia Code, Consolas, D2Coding, monospace`.
- [ ] The `.wrap`/sheet width is widened toward 1120px and side padding is asymmetric (`clamp(20px, 5vw, 112px)`) per Application Guide; a 1px inset hairline "drawing frame" (using `line.default`) is present on `body` or a wrapper.
- [ ] Panel radius dropped: `.card`, `.flow`, `.step`, `.tbl` use 4px (`radius.panel`); `<pre>`, tables, the drawing frame use 0 (`radius.none`); `.pill`/`.badge`/step-counter use 9999px (`radius.pill`) — confirming the current 12–14px panel radii are gone.
- [ ] Section density follows Application Guide: `<header>` hero, §01 `.flow`, §06 verdict get `--sp-4xl` (96px) breathing room vertically (padding-block ≥96px); §00/§02 cards, §03/§04 steps, §05 table, §07 install are dense (≤48px section padding, hairline column rules where side-by-side).
- [ ] §01 SVG recolored: default arrows/nodes use warm `text.default`/`line.default`; active forge/critic nodes use `accent.default`/`accent.strong` borders + `surface.ember` fill; the REJECT loop arrows + marker `#arR` use `line.cold` (#003153, the apprentice's correction); the user-approval + final "✓ 완료/complete" boxes use `status.ok` (#7ec97e); the legendary-sigil detail (header logo or §00 mark) may use `accent.gold` (#c9a227) sparingly. No old hex (#ff8c42/#ffb347/#6f6558) remains in the SVG.
- [ ] Hero motion present via CSS only: `.logo`/header get one `weighty` (700ms) `settle` (`cubic-bezier(0.05,0.7,0.1,1)`) entrance on load; ember accent elements (e.g. a `.ember-glow` radial or decorative spans beside the hero) run an `emberFlicker` keyframe (opacity 0.6→0.9, 3s, ease-in-out alternate). All other interactions use `hammerWeight` easing (`cubic-bezier(0.2,0,0.38,0.9)`) at `quick`/`standard` durations.
- [ ] `@media (prefers-reduced-motion: reduce)` disables the ember-flicker animation and the hero entrance (sets `animation: none`), leaving static.
- [ ] All original sections present and in order: header → §00 philosophy → §01 flow → §02 skills → §03 FORGE → §04 HAMMER → §05 hooks → §06 binary judge → §07 install → footer.
- [ ] External links preserved and valid: GitHub `https://github.com/tmdgusya/glm-hammer`, attribution links to `tmdgusya/engineering-discipline` and `code-yeongyu/lazycodex`.
- [ ] A language-switch link to `index.ko.html` is present in the header (and reciprocated — see Task 3).
- [ ] `node tests/gates.test.js` still exits 0 (regression guard).

**Steps:**
1. **Step 2.1 — Translate the copy inventory.** From the current Korean page, prepare English equivalents for: title/tagline, §00 philosophy card titles + bodies, §02 skill card titles + bodies, §03/§04 step titles + bodies + callout, §05 hook table rows + evidence-gate prose + quote, §06 binary-judge example + rules, §07 install prose. Keep the technical terms (forge/hammer/blueprint/critic/validator/worker/E2E gate) in English as-is; they are the product's vocabulary. (The current Korean text is the source; the worker translates, does not paraphrase the technical claims.)
2. **Step 2.2 — Build the new `<head>`.** Set `<html lang="en">`, `<meta charset="utf-8">`, viewport, English `<title>` ("glm-hammer — an engineering harness that proves its work with evidence"), English `<meta name="description">`. Add `<link rel="preconnect" href="https://fonts.googleapis.com">`, `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`, and the combined Google Fonts stylesheet URL for Cinzel:wght@600;700;900, Newsreader:ital,wght@0,400;0,600;1,400, IBM+Plex+Mono:wght@400;500;600.
3. **Step 2.3 — Author `:root` from tokens.** Define CSS custom properties for every token value (verbatim from `tokens.json`): the five `--surface-*`, four `--text-*`, four `--accent-*`, four `--line-*`, two `--status-*`; `--font-display`/`--font-body`/`--font-mono`; `--fs-caption … --fs-mega`; `--w-*`; `--ls-*`; `--lh-*`; `--sp-3xs … --sp-4xl`; `--r-none/mark/panel/pill`; `--dur-instant/quick/standard/deliberate/weighty`; `--ease-hammer-weight/settle/ember-flicker`. Do NOT define `--ease-snowfall-drift`: there is no snowfall-drift element in scope for this reskin (the cold "snowy pilgrimage" beat is carried by the `line.cold`/`accent.cold` border+correction visual only, per the design-spec Application Guide which scopes snowfall-drift motion to a cold frame this static page does not include). Defining the var without an element that uses it would be dead code. Map the OLD class rules to these vars (e.g. `body { background: var(--surface-default); color: var(--text-default); font-family: var(--font-body); }`).
4. **Step 2.4 — Apply typography.** Headlines (`.logo`, `h1`, `h2 .n`) use `var(--font-display)` with positive `var(--ls-display)` tracking; `h2` at `--fs-xl`, `h1` at `--fs-2xl`, `.logo` at `--fs-mega` weight 900. Body uses `--font-body` at `--fs-body`/`--lh-prose`. Labels (`.card .sub`, `.step .st`, table `th`) use `--font-mono` uppercase `--fs-caption` with `--ls-label`. `code`/`pre` use `--font-mono` on `--surface-sunken`.
5. **Step 2.5 — Restructure layout & radii.** Widen `.wrap` to `max-width: 1120px` with `padding-inline: clamp(20px, 5vw, 112px)`. Add a `body::before` (or a wrapping element) producing the 1px inset drawing frame (`border: 1px solid var(--line-default)`, inset ~16px, `pointer-events: none`, fixed/absolute). Set `.card`/`.flow`/`.step`/`.tbl` `border-radius: var(--r-panel)`; `pre`/`table`/the frame `border-radius: var(--r-none)`; `.pill`/`.badge`/`.step::before` `border-radius: var(--r-pill)`. Replace the header's old `radial-gradient(… rgba(255,140,66,.14) …)` with a `var(--accent-default)`-tinted ember glow at low alpha.
6. **Step 2.6 — Re-rhythm section density.** Add a `.monumental` utility (or target header, §01 `.flow`, §06) giving `padding-block: var(--sp-4xl)`. Keep other sections at `var(--sp-2xl)`. Add hairline column rules between side-by-side cards/steps (`.cards`, `.steps`, `.two`) using a 1px `var(--line-default)` divider.
7. **Step 2.7 — Recolor the §01 SVG.** Within the inline `<svg>`: change marker `#ar` fill to `var(--text-subtle)` (#7a6b56) and `#arR` fill to `var(--line-cold)` (#003153). Replace warm fills `#ff8c42`/`#ffb347` → `var(--accent-default)`/`var(--accent-strong)`; warm-tint box fill `#2a1a12` → `var(--surface-ember)`. Replace default text fills `#e8e0d4` → `var(--text-default)`, gray `#6f6558` → `var(--text-subtle)`. Replace the green approval/complete box stroke+text `#7ec97e` → `var(--status-ok)` and its dark-green fill `#12290f` → `var(--surface-sunken)` (#14100c, the existing darkest surface token — a token-sourced dark fill, no non-token literal). Update each `<text>` to its English equivalent. Add a code comment mapping each recolor. (Note: every hex in the post-reskin SVG is a token var or a `var(--*)` reference; there are no non-token literals.)
8. **Step 2.8 — Add hero motion (CSS only).** Define `@keyframes emberFlicker { 0%,100%{opacity:.6} 50%{opacity:.9} }` and `@keyframes heroSettle { from{opacity:0; transform: translateY(8px)} to{opacity:1; transform:none} }`. Apply `heroSettle` `var(--dur-weighty) var(--ease-settle)` to the header hero block; apply `emberFlicker` `3s var(--ease-ember-flicker) infinite alternate` to a decorative ember element beside the hero (e.g. a `.ember-glow` span or the radial behind the logo). Set all interactive transitions (`a`, `.card`, `.step`, `.pill`) to `transition: <property> var(--dur-quick) var(--ease-hammer-weight)`. Add `@media (prefers-reduced-motion: reduce){ *{animation:none!important; transition:none!important} }`.
9. **Step 2.9 — Translate the body, section by section.** Replace each Korean string with its English equivalent (from Step 2.1), preserving all `<section>` structure, class names, the `.cards`/`.steps`/`.tbl`/`.two` grids, the `<pre>` code fences, and the hook table rows. Keep `<code>` inline tokens. Add the language-switch link (`<a href="index.ko.html" lang="ko">한국어</a>`) in the header badges row.
10. **Step 2.10 — Footer.** Translate the footer; preserve the GitHub + engineering-discipline + lazycodex attribution links verbatim.
11. **Step 2.11 — Verify.** Open the acceptance-criteria checklist; run `node tests/gates.test.js` (exit 0). Grep `:root` for each old hex to confirm none remain: `grep -E '#12100e|#1a1714|#211d19|#2a2520|#ff8c42|#ffb347|#ff5e3a|#e8e0d4|#a89e8e|#6f6558' index.html` should return no `:root` hits. Verify the Hangul count: `grep -cP '[\x{AC00}-\x{D7AF}]' index.html` returns `1` and the single line is the `한국어` switch anchor.

---

## Task 3: Create `index.ko.html` — Korean sibling page

**Goal:** Produce the Korean counterpart of the reskinned landing page, identical in theme/structure/motion, with the original Korean copy restored and `lang="ko"` so system Korean fonts engage.

**Dependencies:** Task 2 (mirrors its CSS/structure/SVG; Korean content is the original Korean text).

**Files:**
- Create `index.ko.html`

**Acceptance Criteria:**
- [ ] `<html lang="ko">`; the body copy is the original Korean text (the current `index.html` content), reskinned — no English-only sentences remain (English is allowed only in technical tokens like `forge`/`hammer`/code).
- [ ] The `:root` custom-property block is identical between the two pages: `diff <(sed -n '/:root{/,/^  }/p' index.html) <(sed -n '/:root{/,/^  }/p' index.ko.html)` returns empty (same token vars, same values, same order).
- [ ] The `@keyframes` definitions are identical between the two pages: `diff <(grep -A6 '@keyframes emberFlicker' index.html) <(grep -A6 '@keyframes emberFlicker' index.ko.html)` returns empty, and the same for `heroSettle`.
- [ ] The radii assignments match: `grep -E 'border-radius|var\(--r-' index.html | sort` and the same on `index.ko.html` produce identical sorted output.
- [ ] Korean font fallback engages: `:root` body/display stacks still list `Pretendard, Apple SD Gothic Neo, Malgun Gothic` after the Latin faces (so Korean renders in a system Korean face when Cinzel/Newsreader lack Hangul).
- [ ] §01 SVG `<text>` nodes are Korean (the original Korean labels), with the same recolor as Task 2: the SVG `fill`/`stroke` hex values are byte-identical between the two pages (`diff <(sed -n '/<svg/,/<\/svg>/p' index.html | grep -oE '#[0-9a-f]{6}' | sort) <(sed -n '/<svg/,/<\/svg>/p' index.ko.html | grep -oE '#[0-9a-f]{6}' | sort)` returns empty).
- [ ] A language-switch link back to `index.html` (`<a href="index.html" lang="en">English</a>`) is present in the header.
- [ ] `node tests/gates.test.js` still exits 0.

**Steps:**
1. **Step 3.1 — Fork the structure.** Copy the Task 2 `index.html` as the base; change `<html lang="en">` → `<html lang="ko">`.
2. **Step 3.2 — Restore Korean copy.** Replace each English string with the corresponding original Korean string from the pre-reskin `index.html` (the §00–§07 headings, card bodies, step bodies, table cells, callout, quote, install prose, footer). Keep the reskinned CSS, fonts, frame, radii, motion, and SVG recolor exactly as Task 2 produced.
3. **Step 3.3 — Korean SVG labels.** In the §01 SVG, set each `<text>` back to its Korean original (e.g. the user-prompt box, "route-intent hook → 의도 라우팅", FORGE/HAMMER inner labels, "✓ 완료", etc.), preserving the Task 2 recolor.
4. **Step 3.4 — Language-switch link.** In the header badges, point the switch link to `<a href="index.html" lang="en">English</a>`.
5. **Step 3.5 — Verify.** Confirm `<html lang="ko">`; grep that the Korean body sections are present; run the four `diff` commands from the acceptance criteria (they must all return empty — the `:root`, `@keyframes`, radii, and SVG-hex sets are identical between the two pages); run `node tests/gates.test.js` (exit 0).

---

## Task 4: Rewrite `README.md` — English-default with smithy structure

**Goal:** Rewrite the plugin README in English (default), carrying the Legendary Smith voice through type-emphasis and structural rhythm (ruled tables, blueprint-plate code fences, a smithy-voiced intro) while preserving every technical claim: the skill table, the crucible stage description, the agent list, the hooks table, the ZCode-compatibility notes, the binary-judge and evidence-gate sections, the flow diagram, install, and license.

**Dependencies:** Task 1 (spec stable). Independent of Tasks 2–3 (different file).

**Files:**
- Rewrite `README.md`

**Acceptance Criteria:**
- [ ] `README.md` is in English (default); no Korean sentence remains (code identifiers and the `crucible → forge → hammer` chain are English already).
- [ ] All nine original `##` sections are present (or their English equivalents, in a sensible English order): intro/skills, crucible stage, agents, hooks (with the 7-row table), binary judge, evidence gates (with the `.glm-hammer/evidence/` tree), flow (with the ASCII diagram), install, state files, license.
- [ ] The skills table (4 rows: blueprint/crucible/forge/hammer) and the hooks table (7 rows: session-start/route-intent/plan-gate/dispatch-log/comment-checker/edit-diagnostics/stop-gate) are preserved with their content intact (translated).
- [ ] The ASCII flow diagram (the crucible→forge→hammer user-journey) is preserved in English, rendered as a fenced code block that reads as a "blueprint plate."
- [ ] The Pages URL `https://tmdgusya.github.io/glm-hammer/` and all attribution links (`tmdgusya/engineering-discipline`, `code-yeongyu/lazycodex`) are preserved. The GitHub repo link `https://github.com/tmdgusya/glm-hammer` is **added** (it is in `index.html` today but NOT in the current README — the reskin adds it to the README header and footer, matching the index page).
- [ ] A language-switch link to `README.ko.md` is present near the top.
- [ ] `node tests/gates.test.js` still exits 0.

**Steps:**
1. **Step 4.1 — Translate the body.** Working from the current Korean `README.md`, translate each section to English. Preserve the heading hierarchy, both tables (same rows/columns, English cell text), the four fenced code blocks (the `crucible → forge → hammer` line, the evidence tree, the ASCII flow diagram, the bash install commands), and the install instructions for both ZCode and Claude Code.
2. **Step 4.2 — Smithy structure.** Lead the README with a one-paragraph English intro that nods to the smithy voice (e.g. "glm-hammer forges a plan the way a smith forges steel — explore the ore, shape the plan, strike only after the blueprint is drawn"). Keep the rest technical and faithful; the voice lives in the intro and in tight, ruled structure, not in ornament.
3. **Step 4.3 — Cross-link.** Add `**한국어 문서 → [README.ko.md](README.ko.md)**` near the top (mirroring the index pages' switch link).
4. **Step 4.4 — Preserve + add links.** Verify the Pages URL and both attribution links (`engineering-discipline`, `lazycodex`) appear and resolve. ADD the GitHub repo link `https://github.com/tmdgusya/glm-hammer` to the README header and footer (it is present in `index.html` today but absent from the current README).
5. **Step 4.5 — Verify.** Grep for the 7 hook names and 4 skill names to confirm the tables are intact; grep for the 3 external URLs; run `node tests/gates.test.js` (exit 0).

---

## Task 5: Create `README.ko.md` — Korean sibling

**Goal:** Produce the Korean README (the reskinned version of the current Korean README content), structurally parallel to the English default.

**Dependencies:** Task 4 (mirrors structure).

**Files:**
- Create `README.ko.md`

**Acceptance Criteria:**
- [ ] `README.ko.md` is in Korean, structurally parallel to the Task 4 English README (same section order, same two tables, same code fences).
- [ ] All technical claims (skill roles, hook events/actions, ZCode-compatibility bullets, evidence-gate triples, binary-judge rule) are preserved in Korean.
- [ ] The Pages URL, GitHub URL (`https://github.com/tmdgusya/glm-hammer`, added in Task 4), and both attribution links are preserved in Korean.
- [ ] A language-switch link back to `README.md` (`[English → README.md](README.md)`) is present near the top.
- [ ] `node tests/gates.test.js` still exits 0.

**Steps:**
1. **Step 5.1 — Mirror in Korean.** Take the Task 4 English structure and restore the original Korean content (the current `README.md` text) into the same section order, with the same tables and code fences. Apply the same smithy-voiced one-paragraph intro (in Korean).
2. **Step 5.2 — Cross-link.** Add `**English → [README.md](README.md)**` near the top.
3. **Step 5.3 — Verify.** Grep for the 7 hook names (English identifiers stay in the Korean doc) and 4 skill names; grep for the 3 external URLs; run `node tests/gates.test.js` (exit 0).

---

## Task 6: Final Verification

**Goal:** Confirm the whole reskin hangs together — both languages, all tokens applied, no regressions, cross-links resolve.

**Dependencies:** Tasks 1–5.

**Files:** None (verification only).

**Acceptance Criteria:**
- [ ] `node tests/gates.test.js` exits 0 (prints the full `ok` block; the suite's contrast/seal/reset assertions are the regression guard).
- [ ] Deterministic token check on the real file prints `PASS`:
      `node -e "const r=require('./hooks/scripts/token-lib').validateTokens('docs/glm-hammer/design/2026-07-05-legendary-smith/tokens.json'); console.log(r.ok?'PASS':'FAIL',r.problems)"`
- [ ] Spec-heading check on the real file prints `PASS`:
      `node -e "const r=require('./hooks/scripts/token-lib').validateSpec('docs/glm-hammer/design/2026-07-05-legendary-smith/design-spec.md'); console.log(r.ok?'PASS':'FAIL',r.problems)"`
- [ ] **Structural review (manual checklist, all must hold):**
  - Both `index.html` (lang=en) and `index.ko.html` (lang=ko) exist and contain all eight sections (header, §00–§07, footer).
  - Both `README.md` (English) and `README.ko.md` (Korean) exist with the nine sections and both tables.
  - `index.html` `:root` contains every token value verbatim; `grep -E '#12100e|#1a1714|#211d19|#ff8c42|#ffb347|#ff5e3a' index.html` returns no `:root` hits (old theme purged).
  - `index.html` body has no Hangul: `grep -cP '[\x{AC00}-\x{D7AF}]' index.html` returns exactly `1`, and that single match is the language-switch anchor text (`한국어`) — verify with `grep -nP '[\x{AC00}-\x{D7AF}]' index.html` showing the one line is the `<a href="index.ko.html" lang="ko">한국어</a>` switch link.
  - §01 SVG in both pages: REJECT/correction arrows use `#003153` (`line.cold`), trusted-result boxes use `#7ec97e` (`status.ok`), active nodes use `#d97b30`/`#c0421d` (`accent.default`/`accent.strong`).
  - Cross-links resolve: `index.html` → `index.ko.html`, `index.ko.html` → `index.html`, `README.md` → `README.ko.md`, `README.ko.md` → `README.md` (all four target files exist).
  - Google Fonts `<link>` present in both index pages; `prefers-reduced-motion` block present in both.
  - The advisory refinements are in place: `tokens.json` `typography.size.$description` no longer says "Major Third"; `design-spec.md` `## Fidelity Notes` has the cold two-material note and the dark-first stance.

**Steps:**
1. **Step 6.1 — Run the suite.** `node tests/gates.test.js` — confirm exit 0 and the expected `ok` count.
2. **Step 6.2 — Run both `node -e` gate checks** (tokens + spec) — confirm both print `PASS`.
3. **Step 6.3 — Grep audits.** Run the old-hex grep on `index.html` `:root`; the Hangul grep on `index.html`; the hook-name/skill-name greps on both READMEs; the URL greps on both READMEs.
4. **Step 6.4 — Cross-link resolution.** Confirm all four cross-link target files exist (`ls index.html index.ko.html README.md README.ko.md`).
5. **Step 6.5 — SVG recolor spot-check.** Open `index.html` §01 SVG source; confirm the REJECT arrow marker, the approval box, and an active node carry the correct token hexes.
6. **Step 6.6 — Record.** Save a short E2E summary to `.glm-hammer/evidence/e2e.md` with the commands run and their PASS results (the hammer E2E-gate convention).

---

## Critic Responses

### Round 1 REJECT findings (resolved in this revision)

- **feasibility F4 — wrong anchor for the type-scale label.** The plan quoted `typography.size.$description`, which does not exist (there is no group-level `$description` on `size`). The actual "Major-Third 1.250" text lives in two places in `tokens.json`: the `typography.$description` parent (L37) and the `typography.size.xl.$description` child (L49), with different surrounding wording than the plan invented. **Resolved:** Task 1 Step 1.1 now names both real anchors (L37 parent + L49 child) and Step 1.3 adds `references.md` L35 (the third occurrence the critic flagged); the acceptance criteria use `grep -c "Major"` (returns 0) instead of quoting an invented "from" string. All four occurrences are now covered.
- **coverage C4 (Task 3) — "byte-identical in intent" was self-contradictory and judgment-based.** **Resolved:** replaced with four deterministic `diff` criteria (`:root` block, both `@keyframes`, sorted radii assignments, sorted SVG hex set) — each returns empty iff the two pages are structurally identical.
- **coverage C4 (Task 6) — "verify visually" for the Hangul exception.** **Resolved:** pinned to `grep -cP '[\x{AC00}-\x{D7AF}]' index.html` returning exactly `1`, with the single line identified as the `한국어` switch anchor. Task 2's matching criterion is updated consistently.

### Round 1 advisory findings (resolved in this revision)

- **feasibility advisory — `--sp-4xl` floor stated as ≥64px (that is `--sp-3xl`).** **Resolved:** Task 2 criterion now states ≥96px (`--sp-4xl` = 96px per tokens.json).
- **feasibility advisory — GitHub link "preserve" but it is absent from the current README.** **Resolved:** Task 4 criterion and Step 4.4 now say "add" (the link is in `index.html` today, not in README); Task 5 criterion mirrors (preserve in Korean).
- **feasibility advisory — `#16290f` non-token literal in the SVG recolor.** **Resolved:** Step 2.7 now uses `var(--surface-sunken)` (#14100c) — an existing darkest-surface token — for the dark green-result fill, eliminating the non-token literal. The acceptance criterion notes every post-reskin SVG hex is a token var.
- **coverage advisory — dead `--ease-snowfall-drift` var (defined, never applied).** **Resolved:** Step 2.3 now explicitly does NOT define `--ease-snowfall-drift`, with the rationale that no snowfall-drift element is in scope (the cold beat is carried by `line.cold`/`accent.cold` visuals only, per design-spec Application Guide). No dead code.

### Pre-emptive responses

- **Why no full crucible re-panel for the Task 1 advisories?** The three findings were explicit *non-blocking* advisories from a crucible panel that returned APPROVE. Task 1 fixes the one factual inaccuracy (the scale label) and answers the other two in documentation — preserving every fidelity-traced token value. Re-paneling would be disproportionate for non-blocking findings on an approved design; the deterministic token gate (the load-bearing check for the contrast posture) is re-run as the receipt. (This matches the user's chosen option: advisories folded into forge, not the heavy standalone re-panel.)
- **Why separate `index.ko.html` instead of an in-page toggle?** The page is static with no JS; a separate file is the cleanest no-JS bilingual pattern and mirrors the `README.md`/`README.ko.md` split the user requested ("문서 별도로 생성"). The cross-links make navigation trivial.
- **Why Google Fonts when the page was self-contained?** The smithy voice is carried by Cinzel/Newsreader/IBM Plex Mono — without them the design collapses to generic UI sans (an anti-reference). The Latin faces load via a single `<link>`; Korean stays on system fonts (Pretendard→Apple SD Gothic→Malgun Gothic) to avoid a second CDN dependency. `font-display: swap` keeps text visible during load.
