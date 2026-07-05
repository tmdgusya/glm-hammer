# References — Legendary Smith

Curated ore for the `glm-hammer` landing-page + README reskin, themed to the
"전설의 해머를 든 대장장이" storyline (mythic nordic smithy — craft-folktale
realism, warm forge dominant, cold snow as the journey-frame accent).

Each entry names the prospector that mined it. The full prospect receipts live
at `.glm-hammer/evidence/design/prospect/*.md`.

---

## Color — mined by `color-prospector`

| # | Reference | What it gives | Key hexes (by role) |
|---|---|---|---|
| C1 | **Anders Zorn limited palette** (Swedish warm-earth oil tradition) | Proof the warm side builds from one family — ivory black is the blue, yellow ochre is bronze, vermilion is the ember. No purple/SaaS-blue. | ivory-black `#1A1A1A` · yellow-ochre `#C69A4A` · vermilion `#E34234` · warm-white `#F2E8D5` · bronze-mix `#7A5B3A` |
| C2 | **Forge / ember-blacksmith photography gradient** (iColorPalette, ColorDrop, Media.io) | The actual raking under-light falloff: charcoal → ember-red → molten-orange → hot-core. The under-lighting model for hero/cards. | charcoal `#1A1A1A` · ember-red `#A6341D` · molten-orange `#D97B30` · hot-orange `#FF5A1F` · hot-core `#F7E9C2` |
| C3 | **Falu red + tarred stave-church wood** (Wikipedia Falun red, Atlas Obscura, DIVA portal) | The Nordic structural warm — copper-mine-derived iron-oxide (smithy resonance), matte not steampunk-brass. | Falu-red `#801818` · tarred-wood `#1A1410` · carbon-black `#1A1A1A` · lead-white `#EFE7D6` · earth-brown `#5A3A2A` |
| C4 | **Cyanotype blueprint / Prussian blue** (Wikipedia, Color-Hex, iColorPalette) | The COLD journey-frame accent AND the blueprint-parchment texture — one reference, two load-bearing brief fields. Frost-blue/iron-cyan reserved for borders/warnings/corrections. | Prussian-deep `#003153` · Prussian-light `#003366` · iron-cyan-patina `#84A7B1` · blueprint-ground `#E8E4D8` · snow-shadow `#3A4A55` |
| C5 | **Medieval illuminator palette** (Fitzwilliam Museum) | Parchment + ink-linework surface for README/code, plus a sparing gold-leaf register for the legendary mark. | parchment `#EFE7D6` · ink `#1A1A1A` · minium-red `#9B2D1F` · verdigris `#6F978E` · gold-leaf `#C9A227` |

**Smelter palette family (synthesis):** warm tarred-black `#1A1410` / warm-charcoal `#2A211A` surfaces; parchment `#EFE7D6` light surface; `#EFE7D6` and `#1A1A1A` text (both WCAG-safe); warm accents `#D97B30` / `#A6341D` / `#801818` (large text/icons/borders only — body text never); cold accents `#003153` / `#3A4A55` (≤5% pixel area, journey/correction only); borders `#3A2E22` / `#9A8B73`.

---

## Typography — mined by `type-prospector`

| # | Reference | What it gives | Voice |
|---|---|---|---|
| T1 | **Cinzel** (inscriptional Roman capitals, OFL) | Weighty, hand-cut, slightly archaic display — the smith's voice. The *legible* alternative to the forbidden fraktur. Avoid Cinzel Decorative. | DISPLAY |
| T2 | **IBM Plex system / Carbon** (OFL) | Documented production stack: Plex Serif (humanist body, generous x-height, never thin) + Plex Mono (drafting-table, +0.32px label tracking to steal verbatim). | BODY + MONO |
| T3 | **Newsreader** (Production Type, OFL) | Humanist serif tuned for on-screen saga-prose reading, opsz axis. Warmer body alternative to Plex Serif. | BODY |
| T4 | **Fraunces** (Undercase Type, OFL) | Variable old-style soft-serif with SOFT/WONK axes ("made-by-hand-on-purpose"). Kept as ore in case Cinzel reads too Imperial/cold. | DISPLAY (alt) |

**Smelter type system (synthesis):** Cinzel display + Newsreader body + IBM Plex Mono; curated progressive scale 12/14/16/18/20/26/40/52/72px (tight steps for body, wider leaps for display); positive letter-spacing on Cinzel headlines (`0.06em`) and uppercase mono labels (`0.08em`); Korean fallbacks Pretendard / Apple SD Gothic / Malgun Gothic (display+body) and D2Coding (mono). The smithy voice survives the Korean fallback via **weight × tracking × all-caps treatment**, never via a Korean fraktur/inscriptional face.

---

## Layout — mined by `layout-prospector`

| # | Reference | What it gives |
|---|---|---|
| L1 | **Engineering drawing grid** (BS EN ISO 5457 / ASME Y14.1, NASA GSFC-X-673-64-1F) | Monumental central field + dense labelled zone-grid periphery, 0 radii, hairline double frame. Serves BOTH the spatial stance AND the blueprint texture. |
| L2 | **Van de Graaf / Tschichold canon** (Wikipedia, Retinart) | 2:3 page with asymmetric 2:3:4:6 margins — earned negative space that is deliberately *not* a sterile gallery. |
| L3 | **Broadsheet 6-column grid** (SJSU newspaper design) | 6-col + 1pt hairline column rules + modular blocks → permission for dense, meticulous tables/steps/cards. |
| L4 | **ANSI Z535 safety signage** (BradyID, Clarion) | Multi-panel severity language, signal-word ≥1.5× cap height, colour-as-severity. Drives the FORGE/HAMMER/Hooks/Install placard energy and the status-pill treatment. |

**Smelter spatial system (synthesis):** 1120px sheet with 12-col blueprint grid, 24px gutter, asymmetric `clamp(20px,5vw,112px)` side padding + 1px inset drawing frame; 4px baseline / 8px layout → 10 named spacing tokens (`--sp-3xs` 2px → `--sp-4xl` 96px); radius `0` on blueprints/tables/code, `4px` max on panels, `99px` ONLY as status-signal pills; one 1px hairline rule weight everywhere + 3px left-band callouts; monumental cores (header hero, §01 flow-diagram, §06 verdict) breathe at `--sp-4xl`, dense periphery (cards, steps, tables, install) stacks tight.

---

## Motion — mined by `motion-prospector`

| # | Reference | What it gives | Register served |
|---|---|---|---|
| M1 | **Carbon Design System (IBM)** | 70/110/150/210/400/700ms token scale; productive `cubic-bezier(0.2,0,0.38,0.9)`; entrance `cubic-bezier(0,0,0.2,1)`. Anti-bounce proof. | Steady hammer-rhythm (base) |
| M2 | **Material Design 3 token spec** | Long tier 500/600ms; emphasized-decelerate `cubic-bezier(0.05,0.7,0.1,1)`; short/standard for state toggles. | Weight + apprentice re-check micro-states |
| M3 | **Alvaro Montoro CSS snowfall** (DEV.to) | Layered 12s/8s/5s `linear infinite`, translateY; linear timing = drift, never ease-bounce. | Snowfall-drift, cold frame only |
| M4 | **CodeMyUI flicker gist** | Keyframes opacity 0.4→1→0.4 (tightened to 0.6→0.9), 3s ease-in-out alternate, staggered delays. | Ember-flicker, low amplitude |
| M5 | **Atlassian Motion / Staggered Entrance** | ~100ms base + 60ms stagger per sibling. | Apprentice re-check iterative-return cascade |

**Smelter motion system (synthesis):** duration tokens `--instant` 70ms → `--weighty` 700ms; easing tokens `--hammer-weight` `cubic-bezier(0.2,0,0.38,0.9)`, `--settle` `cubic-bezier(0.05,0.7,0.1,1)`, `--ember-flicker` (ease-in-out, opacity 0.6→0.9, 3s alternate, forge only), `--snowfall-drift` (linear, cold frame only — the only linear easing); trusted-result blocks, headlines, body copy, resolved status pills NEVER move. Pure CSS / minimal JS; `prefers-reduced-motion` kills the ambient loops.

---

## How the ore maps to the storyline

| Storyline beat | Ore that carries it |
|---|---|
| 전설의 해머 (legendary hammer) | C3 Falu-red structural mark · T1 Cinzel display weight · L1 monumental central field · M1 weighted settle |
| 꼼꼼하게 설계도(블루 프린트) (meticulous blueprints) | C4 cyanotype · T2 IBM Plex Mono drafting-table · L1 engineering-drawing grid · M2 exacting state toggles |
| 설계도가 한쪽에 쌓여 (blueprints piled) | L3 broadsheet column rules · dense periphery spacing |
| 불 앞에서 꾸준히 작업 (always works before the fire) | C2 forge gradient · C1 Zorn warm family · M1 hammer-rhythm · M4 ember-flicker |
| 멋진 브론즈 비어드 (magnificent bronze beard) | C1 bronze-mix · C5 gold-leaf sparing detail · T1 inscriptional sheen |
| 맥주를 마시며 (drinking ale) | C5 warm parchment ground · optional ale-warmth accent detail |
| 어린 친구… 너무나 깐깐해서 (exacting young apprentice) | C4 frost-blue correction accent · T2 mono label precision · L4 Z535 severity pills · M5 staggered re-check cascade |
| 몇 번씩이나 돌아보며 (reviews several times over) | M2 + M5 iterative-return micro-motion · looping validation states |
| 깊은 설원 (deep snowfield) | C4 Prussian-blue journey frame · L2 earned negative space · M3 snowfall-drift (cold frame only) |
| 작업은 항상 잘 끝난다 (work always finishes well) | STILLNESS — M1 "what never moves" list · L1 monumental core solidity |
| 멋진 형제다 (wonderful brothers) | paired duo composition (worker-validator / smith-apprentice) · warm hearth palette |
