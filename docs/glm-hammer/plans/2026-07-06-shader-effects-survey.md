# Plan — Snowy-mountain shader aesthetics via SVG filters

**Date:** 2026-07-06
**Plan path:** `docs/glm-hammer/plans/2026-07-06-shader-effects-survey.md`

## Goal

Apply four shader-style atmospheric effects — turbulent forge smoke, light rays from the forge, a film-grain texture over the night sky, and drifting snow — to the existing inline SVG in the `.journey` section of `index.html` and `index.ko.html`, using only SVG `<filter>` primitives and minimal JS. Zero new runtime dependencies, zero bundler, no WebGL. Inspired by `@paper-design/shaders-react`'s aesthetics (SmokeRing, GodRays, PaperTexture, PerlinNoise) but implemented natively so it composites directly onto the existing SVG scene.

## Architecture

The two landing pages are pure static HTML with inline `<style>` and inline SVG, no JS, no build step. The journey SVG (`viewBox="0 0 900 440"`) already contains mountains, a forge at ~(450,232), two rising smoke paths, 20 falling snowflakes, and CSS keyframe animations. We add SVG `<filter>` definitions into the SVG `<defs>` and apply them to existing/near-existing elements via `filter="url(#…)"`. Two effects (smoke turbulence, god-rays) are animated via SMIL `<animate>`; the grain uses a static filter (no per-frame cost); the snow drift extends the existing CSS `snowfall` keyframe with a horizontal sway. Because SMIL is not stopped by the page's blanket `@media (prefers-reduced-motion: reduce){*{animation:none!important}}` guard, a single tiny inline `<script>` calls `svg.pauseAnimations()` / `.unpauseAnimations()` based on `matchMedia` for that one SVG root only.

## Tech Stack

- SVG `<filter>` primitives: `feTurbulence`, `feDisplacementMap`, `feGaussianBlur`, `feColorMatrix`, `feComposite`, `feFlood`, `feBlend`.
- SMIL `<animate>` for filter-attribute animation (verified: `baseFrequency`, `scale`, `stdDeviation` are SMIL-animatable, not CSS-animatable).
- One inline `<script>` (vanilla JS, no library) scoped to each page's `#journey-scene` SVG — `svg.pauseAnimations()` under reduced-motion.
- Existing `:root` color tokens — no new colors invented; effects sample from `--accent-default`/`--text-ember`/`--accent-cold` and the in-SVG night palette (`#0e1a22`, `#cfe3e8`, `#6b7d85`).

## Work Scope

**In scope:**
- Add 4 SVG filter effects to the journey scene in `index.html` and `index.ko.html`.
- Add `<animate>` SMIL elements for smoke + god-rays.
- Add a static grain filter over the night-sky `<rect>`.
- Extend the `.flake` snow with a horizontal drift.
- Add a minimal inline `<script>` per page for reduced-motion SMIL pausing.
- Give the journey `<svg>` an `id="journey-scene"` for the script hook.

**Out of scope:**
- Any other section of the pages (hero, flow diagram, philosophy cards, etc.).
- The `@paper-design/shaders` / `-react` library itself (investigated, rejected — see Fidelity Notes).
- WebGL, canvas, any external JS/CSS, any build step.
- Performance tuning beyond the documented mitigations (bounded filter regions, numOctaves ≤ 2).

## Verification Strategy

**Level:** build-only (no test suite targets the HTML; the repo's `tests/gates.test.js` is for plugin hooks and is unaffected — confirmed in recon, not re-run). These are static `.html` files served raw.

**Command:**
```sh
# (1) Confirm both files parse as well-formed XML/HTML (filters live inside <svg><defs>):
node -e "const fs=require('fs');for(const f of ['index.html','index.ko.html']){const s=fs.readFileSync(f,'utf8');const opens=(s.match(/<svg\b/g)||[]).length,closes=(s.match(/<\/svg>/g)||[]).length;if(opens!==closes)throw new Error(f+': svg tag mismatch '+opens+'/'+closes);const fo=(s.match(/<filter\b/g)||[]).length,fc=(s.match(/<\/filter>/g)||[]).length;if(fo!==fc)throw new Error(f+': filter tag mismatch '+fo+'/'+fc);}console.log('tag-balance OK')"
# (2) Confirm the four effect anchors (filter ids + svg id) exist in both files:
node -e "const fs=require('fs');for(const f of ['index.html','index.ko.html']){const s=fs.readFileSync(f,'utf8');for(const id of ['smoke-filter','godrays','grain-filter','journey-scene']){if(!s.includes('id=\"'+id+'\"'))throw new Error(f+': missing #'+id);}console.log(f+' effect anchors present')}"
# (3) Confirm the reduced-motion SMIL pause script is present:
node -e "const fs=require('fs');for(const f of ['index.html','index.ko.html']){const s=fs.readFileSync(f,'utf8');if(!s.includes('pauseAnimations'))throw new Error(f+': missing pauseAnimations guard');console.log(f+' reduced-motion guard present')}"
# (4) Confirm each filter is APPLIED by an in-scene element (id defined is not enough — must be consumed):
node -e "const fs=require('fs');const expect={smoke:2,godrays:1,grain:1};for(const f of ['index.html','index.ko.html']){const s=fs.readFileSync(f,'utf8');const sm=(s.match(/filter=\"url\(#smoke-filter\)\"/g)||[]).length;if(sm!==expect.smoke)throw new Error(f+': smoke-filter applied '+sm+' times, expected '+expect.smoke);if(!(s.includes('filter=\"url(#godrays)\"')))throw new Error(f+': godrays filter not applied');if(!(s.includes('filter=\"url(#grain-filter)\"')))throw new Error(f+': grain-filter not applied');console.log(f+' filters applied')}"
# (5) Confirm both snow animations are wired on distinct elements (wrapper-group sway + circle snowfall):
node -e "const fs=require('fs');for(const f of ['index.html','index.ko.html']){const s=fs.readFileSync(f,'utf8');if(!s.includes('class=\"flake-sway\"'))throw new Error(f+': no flake-sway wrapper group');if(!/\.flake-sway\{[^}]*flakeSway/.test(s))throw new Error(f+': flakeSway not bound to .flake-sway');if(!s.includes('animation:snowfall'))throw new Error(f+': snowfall dropped from .flake');console.log(f+' snow dual-animation wired')}"
```

**What passing proves:** the SVG/filter/SMIL/script structure is well-formed (1); the three filters and the scene id are defined (2); the reduced-motion guard is wired (3); **each filter is actually consumed by an in-scene element** (4 — covers the four effects at the structural level: smoke applied to 2 paths, godrays to its group, grain to the sky rect); and the snow carries both animations on distinct elements so neither clobbers the other (5). Visual fidelity (how the effects *look*) is confirmed by the worker opening the page in a browser during implementation and is reported in the final summary, but is NOT an acceptance criterion — the criteria are all command-decidable.

---

## File structure mapping

Both files share identical structure for the affected regions; `index.ko.html` differs only in translated copy/`aria-label`. Anchors use symbol names, never line numbers.

### `index.html` (and identically `index.ko.html`)

**Modify — `<style>` block** (additions to the existing journey CSS, near the `.flake`/`.forge-glow` rules):
- `.flake-sway` — new class applied to a **wrapper `<g>` around each snowflake** (NOT to the `<circle>` itself). This avoids the CSS `animation` shorthand cascade problem: the circle keeps `.flake`'s `snowfall`, the wrapper `<g>` gets `flakeSway`. Two animations on two distinct elements — no clobbering.
- `@keyframes flakeSway` — `0%{transform:translateX(-3px)} 50%{transform:translateX(3px)} 100%{transform:translateX(-3px)}`.

**Modify — journey `<svg>`** (open tag at the scene `<figure>`):
- Add `id="journey-scene"` to the `<svg>` element (currently has none).

**Modify — journey `<svg><defs>`** (currently holds `moonHalo`, `forgeFire` radialGradients):
- Add filter `id="smoke-filter"` — `feTurbulence` (fractalNoise, baseFrequency ~0.02, numOctaves 2, SMIL-animated baseFrequency 0.015↔0.025) → `feDisplacementMap` (scale ~12) → `feGaussianBlur` (stdDeviation 1). Bounded region around the chimney.
- Add filter `id="godrays"` — a `feTurbulence`-distorted cone of light: a `<feFlood>`/polygon-driven ray shape composited through `feColorMatrix` + `feGaussianBlur`, OR a simpler `radialGradient` cone with `feTurbulence`+`feDisplacementMap` warping. See Task 2 for the chosen geometry.
- Add filter `id="grain-filter"` — `feTurbulence` (static, baseFrequency 0.9, numOctaves 2) → `feColorMatrix type="luminanceToAlpha"` → `feFlood flood-color="#ffffff"` → `feComposite operator="in"` → final `feComposite operator="over"` onto `SourceGraphic`.

**Modify — smoke `<path class="smoke">` elements** (two of them, near the chimney at x=447–450, y=200):
- Add `filter="url(#smoke-filter)"` to both existing smoke paths (keep their `class="smoke"` and existing `smokeRise` animation).

**Modify — the forge glow `<circle class="forge-glow">` region**:
- Add a god-rays group (new `<g id="godrays-group">`) behind/around the forge, applying `filter="url(#godrays)"`, emitting rays upward/outward from ~(450,232).

**Modify — night-sky `<rect width="900" height="440" fill="#0e1a22">`**:
- Add `filter="url(#grain-filter)"` to this rect so the sky gets a static grain overlay.

**Modify — the 20 `<circle class="flake">` elements**:
- Wrap each `<circle class="flake">` in a new `<g class="flake-sway">…</g>`. The circle keeps its `flake` class, its inline `style="animation-duration:…"`, and its `snowfall` animation untouched. The wrapper `<g>` carries the `flakeSway` animation. (This is the only snow-drift structure — there is no alternative path; the worker does not choose.)

**Add — inline `<script>`** (just before `</body>`):
- Vanilla JS: `const svg=document.getElementById('journey-scene'); if(svg){const mq=matchMedia('(prefers-reduced-motion: reduce)'); const apply=()=>{if(mq.matches)svg.pauseAnimations();else svg.unpauseAnimations();}; apply(); mq.addEventListener('change',apply);}`

---

## Tasks

### Task 1: Add turbulent forge-smoke filter (both files)

**Goal:** The two chimney smoke paths render with live turbulent distortion instead of straight fading strokes, implemented as an SVG `<filter>` applied to the existing smoke paths.

**Dependencies:** None (can run in parallel with Tasks 2–4 if file-edit ordering is coordinated — but all four tasks edit the same `<defs>` block, so they are serialized in practice; Task 1 first).

**Files:**
- Modify `/Users/roach/glm-hammer/index.html` — `<svg>` defs block + the two `<path class="smoke">` elements.
- Modify `/Users/roach/glm-hammer/index.ko.html` — identical changes.

**Acceptance Criteria:**
- [ ] AC1.1: Both files contain `<filter id="smoke-filter">` inside the journey SVG `<defs>`, with child `<feTurbulence>`, `<feDisplacementMap>`, and `<feGaussianBlur>` primitives (grep confirms all three element names present within that filter).
- [ ] AC1.2: The `<feTurbulence>` in `smoke-filter` has `numOctaves="2"` (not more — perf guard) and contains an `<animate attributeName="baseFrequency" .../>` child element.
- [ ] AC1.3: Both `<path class="smoke">` elements in the journey scene carry `filter="url(#smoke-filter)"` (grep of the smoke paths confirms the attribute) AND retain their existing `class="smoke"` and inline `style` animation properties.
- [ ] AC1.4: The `smoke-filter` element has explicit `x`, `y`, `width`, `height` attributes bounding its region (not left at default -10%/120%) — perf mitigation confirmed by grep for `width=` and `height=` on the `<filter id="smoke-filter">` element.
- [ ] AC1.5: Running the Verification Strategy command (1), (2), and (4) passes with no throw.

**Steps:**
1. In `index.html`, inside the journey `<svg><defs>` (after the `forgeFire` radialGradient), insert:
   ```xml
   <filter id="smoke-filter" x="420" y="150" width="60" height="80" filterUnits="userSpaceOnUse">
     <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="3" result="turb">
       <animate attributeName="baseFrequency" values="0.015;0.025;0.015" dur="6s" repeatCount="indefinite"/>
     </feTurbulence>
     <feDisplacementMap in="SourceGraphic" in2="turb" scale="12"/>
     <feGaussianBlur stdDeviation="1"/>
   </filter>
   ```
2. On both `<path class="smoke">` elements (and the one with `style="animation-delay:-3s"`), add the attribute `filter="url(#smoke-filter)"`.
3. Mirror steps 1–2 exactly in `index.ko.html`.
4. Run Verification command (1), (2), and (4); confirm pass.

### Task 2: Add god-rays emanating from the forge (both files)

**Goal:** Soft, turbulence-warped light rays radiate upward and outward from the forge glow at ~(450,232), giving the impression of light piercing the snow air.

**Dependencies:** Task 1 (both edit `<defs>`; serialize).

**Files:** Same two files.

**Acceptance Criteria:**
- [ ] AC2.1: Both files contain `<filter id="godrays">` inside the journey SVG `<defs>`.
- [ ] AC2.2: A new `<g id="godrays-group">` exists in the journey scene, positioned around the forge (translate/elements near x≈450, y≈232), with `filter="url(#godrays)"` applied (grep confirms the literal `filter="url(#godrays)"` appears on the group).
- [ ] AC2.3: The `godrays` filter contains an `<feTurbulence>` child element with `numOctaves="2"` (grep confirms `<feTurbulence` and `numOctaves="2"` appear between the `<filter id="godrays">` open tag and its close `</filter>`).
- [ ] AC2.4: The god-rays use palette colors from the existing token set only — `#ff8e57` (text-ember), `#d97b30` (accent-default), or `#cfe3e8` (moon/snow). No new hex values invented (grep the godrays group/filter for hex literals; all must be in that set).
- [ ] AC2.5: Running Verification command (1), (2), and (4) passes.

**Steps:**
1. In `index.html` `<defs>`, add after `smoke-filter`:
   ```xml
   <filter id="godrays" x="380" y="120" width="140" height="140" filterUnits="userSpaceOnUse">
     <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="7" result="gturb">
       <animate attributeName="baseFrequency" values="0.01;0.016;0.01" dur="8s" repeatCount="indefinite"/>
     </feTurbulence>
     <feDisplacementMap in="SourceGraphic" in2="gturb" scale="18"/>
     <feGaussianBlur stdDeviation="2"/>
   </filter>
   ```
2. Immediately before the `<circle class="forge-glow">` element (so rays sit behind the glow), insert the god-rays group — a set of thin elongated triangles/polygons radiating up-and-out from (450,232), filled with a vertical linearGradient from `#ff8e57` (top) fading to transparent, low opacity, wrapped in:
   ```xml
   <g id="godrays-group" filter="url(#godrays)" opacity="0.5" transform="translate(450 232)">
     <!-- 5-7 ray polygons, each a thin triangle from origin fanning upward -->
     <polygon points="0,0 -40,-120 -28,-120" fill="#ff8e57" opacity="0.35"/>
     <polygon points="0,0 -18,-140 -8,-140" fill="#ff8e57" opacity="0.45"/>
     <polygon points="0,0 6,-150 16,-150" fill="#d97b30" opacity="0.4"/>
     <polygon points="0,0 28,-135 40,-135" fill="#ff8e57" opacity="0.35"/>
     <polygon points="0,0 60,-110 72,-110" fill="#d97b30" opacity="0.25"/>
   </g>
   ```
3. Mirror in `index.ko.html`.
4. Run Verification command (1), (2), and (4).

### Task 3: Add static film-grain over the night sky (both files)

**Goal:** The night-sky `<rect>` gains a static, subtle film-grain texture overlay via an SVG filter, compositing grain over the existing fill (not replacing it).

**Dependencies:** Task 2 (serialize on `<defs>`).

**Files:** Same two files.

**Acceptance Criteria:**
- [ ] AC3.1: Both files contain `<filter id="grain-filter">` inside the journey SVG `<defs>`.
- [ ] AC3.2: The grain filter pipeline is exactly: `<feTurbulence>` → `<feColorMatrix type="luminanceToAlpha">` → `<feFlood>` → `<feComposite operator="in">` → terminal `<feComposite operator="over">` onto `SourceGraphic`. Grep confirms `luminanceToAlpha` present and the terminal primitive is `operator="over"` with `in2="SourceGraphic"` (or `SourceGraphic` referenced).
- [ ] AC3.3: The night-sky `<rect width="900" height="440" fill="#0e1a22">` carries `filter="url(#grain-filter)"`.
- [ ] AC3.4: The `<feTurbulence>` in `grain-filter` is STATIC — it contains no `<animate>` child (perf: full-frame turbulence must not animate per-frame). Grep confirms absence of `<animate` between the `grain-filter` open and close tags.
- [ ] AC3.5: The `<feTurbulence>` has `numOctaves="2"` and a high `baseFrequency` (≥0.7) to produce fine grain, not large blobs.
- [ ] AC3.6: Running Verification command (1), (2), and (4) passes.

**Steps:**
1. In `index.html` `<defs>`, add after `godrays`:
   ```xml
   <filter id="grain-filter" x="0" y="0" width="900" height="440" filterUnits="userSpaceOnUse">
     <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="2" result="noise"/>
     <feColorMatrix in="noise" type="luminanceToAlpha" result="alpha"/>
     <feFlood flood-color="#cfe3e8" result="tint"/>
     <feComposite in="tint" in2="alpha" operator="in" result="grain"/>
     <feComposite in="grain" in2="SourceGraphic" operator="over"/>
   </filter>
   ```
2. On the night-sky `<rect width="900" height="440" fill="#0e1a22">`, add `filter="url(#grain-filter)"`.
3. Mirror in `index.ko.html`.
4. Run Verification command (1), (2), and (4).

### Task 4: Add snowflake horizontal drift (both files)

**Goal:** The 20 falling snowflakes also sway horizontally as they fall, via a CSS animation on a wrapper `<g>` element — NOT on the `<circle>` itself, so the existing `snowfall` animation and its per-flake inline `animation-duration` are untouched. No filter, no SMIL.

**Dependencies:** Task 1 (serialize to avoid edit-region overlap on the SVG body).

**Files:** Same two files.

**Rationale (why a wrapper, not a second class on the circle):** the CSS `animation` shorthand does not merge across rules of equal specificity — declaring `.flake-sway{animation:flakeSway…}` on the same element as `.flake{animation:snowfall…}` would make `flakeSway` (last in source) override `snowfall` entirely, stopping the snow from falling. The wrapper-element approach places each animation on a distinct element (`flakeSway` on the `<g>`, `snowfall` on the `<circle>`), so both run independently with zero cascade conflict.

**Acceptance Criteria:**
- [ ] AC4.1: Both files define `@keyframes flakeSway` in the inline `<style>` (grep confirms the literal `@keyframes flakeSway`).
- [ ] AC4.2: Both files define a `.flake-sway` rule that binds the `flakeSway` animation (the regex `\.flake-sway\{[^}]*flakeSway` matches).
- [ ] AC4.3: Every one of the 20 snowflakes is wrapped in `<g class="flake-sway">…</g>`, and the inner `<circle>` retains `class="flake"` and its existing inline `style="animation-duration:…"` (grep confirms exactly 20 occurrences of `<g class="flake-sway">` AND the existing `.flake` rule still contains `animation:snowfall` — proving the fall animation was not removed or renamed).
- [ ] AC4.4: The `.flake` rule's `animation:snowfall` declaration is unchanged (grep confirms `animation:snowfall` still present; the rule was not edited to drop or rename it).
- [ ] AC4.5: Running Verification command (1) and (5) passes.

**Steps:**
1. In `index.html` `<style>`, near the `.flake` rule (do NOT modify the `.flake` rule itself), add:
   ```css
   .flake-sway{animation:flakeSway 4s var(--ease-ember-flicker) infinite alternate}
   @keyframes flakeSway{0%{transform:translateX(-3px)}50%{transform:translateX(3px)}100%{transform:translateX(-3px)}}
   ```
2. In the journey SVG, wrap each of the 20 `<circle class="flake" …/>` elements in a `<g class="flake-sway">` … `</g>`. The circle's attributes (`cx`, `cy`, `r`, `fill`, `class="flake"`, inline `style`) stay exactly as-is. Example of one:
   ```xml
   <g class="flake-sway"><circle class="flake" cx="60" cy="-10" r="1.6" style="animation-duration:8s;animation-delay:-2s"/></g>
   ```
3. Mirror steps 1–2 exactly in `index.ko.html`.
4. Run Verification command (1) and (5).

### Task 5: Reduced-motion SMIL guard + journey-scene id (both files)

**Goal:** SMIL animations in the journey SVG freeze when the user prefers reduced motion, via `svg.pauseAnimations()` driven by `matchMedia`. This is the project's first `<script>` tag.

**Dependencies:** Tasks 1–4 (must exist first so there's something to pause).

**Files:** Same two files.

**Acceptance Criteria:**
- [ ] AC5.1: The journey `<svg>` element in both files has `id="journey-scene"` (grep confirms; this is the anchor the script reads).
- [ ] AC5.2: Both files contain an inline `<script>` (immediately before `</body>`) whose body references `document.getElementById('journey-scene')` and calls `.pauseAnimations()` / `.unpauseAnimations()` (grep for `pauseAnimations` passes).
- [ ] AC5.3: The script is gated by `matchMedia('(prefers-reduced-motion: reduce)')` — grep confirms `prefers-reduced-motion` appears inside the `<script>` (not only in the CSS).
- [ ] AC5.4: The script calls `.addEventListener('change', …)` on the media query so toggling the OS preference live-updates (grep confirms `change` listener).
- [ ] AC5.5: Running Verification command (3) passes.

**Steps:**
1. In `index.html`, add `id="journey-scene"` to the journey `<svg viewBox="0 0 900 440" ...>` open tag.
2. Immediately before `</body>`, insert:
   ```html
   <script>
     (function(){
       var svg=document.getElementById('journey-scene');
       if(!svg)return;
       var mq=window.matchMedia('(prefers-reduced-motion: reduce)');
       function apply(){ if(mq.matches){svg.pauseAnimations();}else{svg.unpauseAnimations();} }
       apply();
       mq.addEventListener('change',apply);
     })();
   </script>
   ```
3. Mirror both changes in `index.ko.html`.
4. Run Verification command (3).

### Task 6: Final Verification

**Goal:** Run the full Verification Strategy against both files and confirm the journey scene's effect anchors, tag balance, and reduced-motion guard are all in place.

**Dependencies:** Tasks 1–5.

**Files:** Read-only check of both files.

**Acceptance Criteria:**
- [ ] AC6.1: Verification command (1) — tag balance — prints `tag-balance OK` and exits 0.
- [ ] AC6.2: Verification command (2) — effect anchors (`smoke-filter`, `godrays`, `grain-filter`, `journey-scene`) — prints the "present" line for both files and exits 0.
- [ ] AC6.3: Verification command (3) — `pauseAnimations` guard — prints the "guard present" line for both files and exits 0.
- [ ] AC6.4: Verification command (4) — filters applied — prints the "filters applied" line for both files and exits 0 (smoke-filter applied exactly 2×, godrays + grain-filter each applied ≥1×).
- [ ] AC6.5: Verification command (5) — snow dual-animation — prints the "snow dual-animation wired" line for both files and exits 0.

**Steps:**
1. Run all five Verification Strategy commands in sequence.
2. Report the exact stdout of each. (No manual visual step is an acceptance criterion — all criteria are command-decidable. The worker may open the page in a browser for their own confidence, but pass/fail is determined by the commands above.)

---

## Fidelity Notes

- **Why not the library?** `@paper-design/shaders-react` and its vanilla sibling `@paper-design/shaders` are WebGL2-only background generators. They draw their own `<canvas>` and cannot apply effects to existing SVG elements — so they could not enhance the smoke/rays/snow, which are SVG shapes. The vanilla package is 58 KB gzip, would add an external CDN dependency (breaking the page's offline-capable, Google-Fonts-only external surface), and throws on WebGL2-unsupported browsers. The shader *aesthetics* (SmokeRing → turbulent smoke filter; GodRays → ray group; PaperTexture → grain filter; PerlinNoise → snow drift) are fully reproducible with SVG filters that composite natively onto the existing scene. This plan implements the aesthetics, not the library.
- **Performance guards are acceptance criteria:** animated turbulence is bounded to small filter regions (smoke ~60×80, godrays ~140×140 — never the full 900×440) and `numOctaves ≤ 2`. The full-frame grain filter is STATIC (no per-frame turbulence). These are enforced by AC1.4, AC1.2, AC2.3, AC3.4, AC3.5.
- **Reduced motion is non-trivial:** the page's existing `*{animation:none!important}` CSS guard does NOT stop SMIL. Task 5 adds the `svg.pauseAnimations()` guard specifically for the SMIL animations introduced here. The pre-existing CSS-keyframe effects (snowfall, smokeRise, forgeFlicker, torchFlicker) continue to be handled by the existing CSS guard.
- **Two files, identical structure:** every change is mirrored verbatim between `index.html` and `index.ko.html` except translated comments/aria-label. Acceptance criteria apply to both files equally.

## Critic Responses (Round 1 → Round 2)

Round 1 verdicts: feasibility REJECT, integration APPROVE, coverage REJECT. The three critics converged on a single root cause — **Task 4 (snow drift)** — plus non-binary/placeholder ACs. Responses:

- **[feasibility + coverage, REJECT] Task 4 "pick whichever" placeholder + cascade clobber.** The original plan put `.flake-sway` on the same `<circle>` as `.flake`, which (because the CSS `animation` shorthand does not merge across equal-specificity rules) would override `snowfall` and stop the snow from falling, and left the structure as an undecided "worker picks" fork. **Fixed:** Task 4 now specifies a single path — wrap each flake in a `<g class="flake-sway">` so the sway animation lives on the wrapper and snowfall stays on the circle. No fork, no clobber. AC4.3 now requires exactly 20 wrapper groups AND that `animation:snowfall` is still present in the `.flake` rule.
- **[coverage, REJECT] AC6.4 non-binary escape.** "Manual visual confirmation" was the sole coverage for effect behavior. **Fixed:** AC6.4 removed; replaced by Verification command (4) which greps that each filter is actually applied by an in-scene element (smoke-filter ×2, godrays, grain-filter), and command (5) which checks the snow dual-animation wiring. All acceptance criteria are now command-decidable.
- **[coverage, REJECT] AC4.3 undecidable grep.** `animation:.*flakeSway` could pass even if `snowfall` were clobbered. **Fixed:** AC4.3 now checks two distinct facts — 20 wrapper groups present AND `animation:snowfall` unchanged in the `.flake` rule.
- **[coverage, REJECT] AC2.3 fuzzy "reachable".** **Fixed:** AC2.3 now requires `<feTurbulence` and `numOctaves="2"` literally present between the `godrays` filter's open/close tags.
- **[coverage, advisory] asymmetric perf guard.** numOctaves="2" was enforced for smoke/grain but not godrays. **Fixed:** AC2.3 now enforces `numOctaves="2"` on the godrays turbulence too.
- **[coverage, advisory] verification never asserted filters were applied.** **Fixed:** new command (4) asserts consumption, not just definition.
- **[feasibility/integration, advisory] z-order of rays under chimney/smoke/hut.** Intended (rays glow behind the hut). Not changed; noted here for transparency.
- **[integration, advisory] Task 1 `Dependencies: None` vs "serialized in practice".** Left as-is — the real serialization is encoded by T2/T3 depending on T1; harmless. Task 4's dependency now explicitly says Task 1.
