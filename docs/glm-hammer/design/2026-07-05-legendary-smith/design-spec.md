# Legendary Smith — Design Spec

Reskin of `glm-hammer`'s `index.html` (landing page) and `README.md` into the
visual world of the user's "전설의 해머를 든 대장장이" storyline. The story IS
a metaphor for glm-hammer itself, so the technical substance stays — it is wrapped
in the smithy's atmosphere, not replaced by it.

**Language deliverables:** English is the default for both files; a separate
Korean variant is produced from the same tokens (see Application Guide §Korean).

---

## Story & Direction

> 옛날 옛적 전설의 해머를 든 대장장이가 있었다. … 항상 꼼꼼하게 설계도(블루 프린트)를
> 만들어 작업하는 것으로 유명했다. … 불 앞에서 꾸준히 작업을 한다. … 어린 친구도 하나
> 있다. … 너무나 깐깐해서 … 깊은 설원을 지나가야 해서 너무나도 힘들다. 하지만 … 작업은
> 항상 잘 끝난다. … 멋진 형제다.

**One-line essence:** A legendary smith who never strikes before drawing the
blueprint, working fire-side under a mountain of plans, paired with an exacting
apprentice who re-checks every pass — reachable only across a brutal snowy
pilgrimage, the result always sound.

**Design direction (from the vein-reader Direction Brief):**

- **Era/genre — mythic nordic smithy.** Craft-folktale realism, *not* fantasy
  RPG, *not* steampunk. The old-ness lives in gravity and craft, not ornament.
- **Color — warm forge DOMINANT, cold snow as the journey-frame accent only.**
  You LIVE in the forge; you only CROSS the snow. Light source is the forge
  fire, low and raking. Asymmetric on purpose.
- **Type — three voices.** A monumental hand-cut display (the smith), a sturdy
  legible humanist body (saga prose + craft), a drafting mono (the blueprint).
  Discipline and patience before beauty.
- **Layout — monumental core + dense accumulated periphery.** The anvil/hammer
  at center; blueprint piles in the margins. Whitespace is *earned* via the
  snowy approach, never sterile.
- **Motion — three registers, never mixed.** Steady hammer-rhythm (base),
  ember-flicker (warm ambience, subtle), snowfall-drift (cold frame only).
  Finished/trusted results hold STILL — stillness is the visual of trustworthiness.

**Explicit anti-references (this is NOT):** glossy SaaS dashboard · neon
cyberpunk / dark-fantasy RPG · minimalist white gallery · ornamental blackletter
/ fantasy-logo · steampunk / Victorian brass-gadget.

---

## References

Curated from the five crucible prospect receipts
(`.glm-hammer/evidence/design/prospect/*.md`). Full citation table lives in
`references.md`; summary by dimension:

- **Color (color-prospector, 5 refs):** Zorn limited palette · forge/ember
  photography gradient · Falu red + tarred stave-church wood · cyanotype blueprint
  Prussian blue · medieval illuminator parchment + ink + gold-leaf.
- **Type (type-prospector, 4 refs):** Cinzel (display) · IBM Plex Serif/Mono
  (Carbon) · Newsreader (body) · Fraunces (alt display).
- **Layout (layout-prospector, 4 refs):** engineering-drawing grid
  (BS EN ISO 5457 / NASA) · Van de Graaf/Tschichold canon · broadsheet 6-column ·
  ANSI Z535 safety signage.
- **Motion (motion-prospector, 5 refs):** IBM Carbon duration/easing · Material 3
  tiers · Montoro CSS snowfall · CodeMyUI flicker · Atlassian staggered entrance.

---

## Token Rationale

Every top-level group traces to a prospected reference. Contrast ratios are
computed against `color.surface.default` (`#1a1410`, the forge floor).

### color
- **surface** — the forge itself. `default #1a1410` (tarred stave-church pine-tar,
  ref C3) is the floor the fire rakes across; `raised #2a211a` lifts panels one
  step (Zorn ivory-black + yellow-ochre, C1/C2); `sunken #14100c` deepens code
  blocks; `ember #2a1a12` tints the hottest cards (forge falloff, C2);
  `parchment #efe7d6` is the light blueprint canvas (lead-white, C5).
- **text** — parchment-on-forge. `default #efe7d6` (14.8:1, AAA) and `muted
  #9a8b73` (5.5:1) carry body; `subtle #7a6b56` (3.5:1, subtle tier) carries
  captions; `ember #ff8e57` (8.1:1) caps the hot-orange highlight at the
  neon-guard ceiling (C2 hot-orange, never brighter).
- **accent** — the live forge. `default #d97b30` molten orange (5.9:1, C2) is
  the primary CTA; `strong #c0421d` (3.5:1) is hover/pressed — lifted from the
  prospected `#A6341D` (2.7:1 ✗) precisely to clear the 3.0:1 accent gate;
  `cold #84a7b1` iron-cyan patina (7.0:1) is the journey/apprentice accent — the
  deep Prussian `#003153` (1.36:1 ✗) was moved to `line.cold` because it cannot
  pass as a fill on the dark forge floor; `gold #c9a227` (7.4:1) is the
  legendary-sigil leaf only.
- **line** — hairline rules. `default #3a2e22` (carbon-black + umber, C5),
  `strong #5a4634`, `ember #a6341d` (the prospected ember-red, demoted to border
  since it fails as text), `cold #003153` (cyanotype rule, C4, demoted to border).
- **status** — Z535 severity (layout-prospector ref L4). `ok #7ec97e` PASS,
  `no #e06c5a` FAIL/REJECT.

**Contrast guardrails honored:** warm accents are reserved for large
text/icons/borders (never body text — body uses `text.default`); the deep cold
Prussian and ember-red are borders only; gilding is a leaf detail, never a fill;
cold accent stays ≤5% pixel area to preserve the warm-dominant asymmetry.

### typography
- **font** — three voices. `display` Cinzel + Fraunces + Pretendard fallback
  (ref T1); `body` Newsreader + Pretendard (ref T3); `mono` IBM Plex Mono +
  D2Coding for fixed-width 한글 (ref T2). Korean cadence survives via weight ×
  tracking × all-caps, never a Korean fraktur (anti-ref).
- **size** — curated progressive scale 12/14/16/18/20/26/40/52/72px (tight steps
  for body, wider leaps for display; patient and unhurried). Non-geometric by
  intent.
- **fontWeight / letterSpacing / lineHeight** — Cinzel display positive-tracked
  `0.06em` (carved breath, T1); uppercase mono labels `0.08em` (drafting plate,
  T2); prose `0em` at `1.75` leading; display `1.25`.

### spacing
- 4px baseline / 8px layout split (ref L1) → 10 tokens `3xs` 2px → `4xl` 96px.
  `4xl` is reserved for the monumental hero negative space — the earned "snow"
  around the anvil.

### radius
- Sharp-first (ref L1/L4). `none 0` on blueprints/tables/code/frame;
  `mark 2px` hammered-edge whisper; `panel 4px` max on cards; `pill 9999px`
  ONLY as a Z535 status-signal (never decoration). The current 12–14px panel
  radius is intentionally killed.

### motion
- Three registers (ref M1–M5). `duration` instant 70ms → weighty 700ms;
  `easing` hammerWeight `cubic-bezier(0.2,0,0.38,0.9)` (productive, default),
  settle `cubic-bezier(0.05,0.7,0.1,1)` (hammer-land decelerate), emberFlicker
  ease-in-out (opacity 0.6→0.9, forge only), snowfallDrift linear (cold frame
  only — the sole linear curve). Trusted-result blocks never move.

---

## Application Guide

### Landing page (`index.html`) — English default

The page becomes a single scrolling sheet, framed like a blueprint drawing.

- **Frame & grid** — 1120px sheet, 12-col blueprint grid, 24px gutter, asymmetric
  `clamp(20px,5vw,112px)` side padding, plus a 1px inset hairline "drawing frame"
  with zone-tick section breaks. Background `surface.default`; raking radial
  ember gradient low-center on the header only.
- **Header (hero — monumental core)** — 🔨 logomark in Cinzel `mega` 900
  positive-tracked; H1 `glm-hammer` with `accent.default` highlight; tagline in
  Newsreader; badges as mono `caption` labels inside hairline pills. One
  `weighty` 700ms `settle` entrance on load; ember accents beside the hero run
  the `emberFlicker` ambient loop. Once landed, the hero holds STILL.
- **§00 Philosophy / §02 Skills (dense periphery)** — `.cards` grid, `panel 4px`
  radius, hairline column rules between cards, mono `caption` sub-labels
  (PRINCIPLE 1 / skills/blueprint), Newsreader body.
- **§01 Flow diagram (monumental core — "the anvil")** — full 12-col span,
  `radius none`, ruled frame, generous `xl` padding. The SVG recolors: warm forge
  fills, ember borders on active nodes, frost `line.cold` on REJECT/correction
  arrows (the apprentice), `status.ok` green on the trusted result. The diagram
  draws in 3 deliberate passes, then holds still.
- **§03 FORGE / §04 HAMMER (dense step register)** — `.steps` as numbered panels;
  the counter stays a `pill` (status-signal, Z535); each step `panel 4px`.
  Staggered entrance `standard` 210ms + 60ms per sibling reads as the
  apprentice's countable re-check sequence. The callout keeps its 3px ember
  left-band.
- **§05 Hooks table** — broadsheet hairline row rules, `caption` mono headers,
  `radius none`, severity pills (`.pill.ok/.no/.hook`) carry Z535 color-severity.
- **§06 Binary Judge (monumental core)** — sparse, weighted verdict surface; the
  "what NEVER moves" stillness is the point. Mono code block in `surface.sunken`.
- **§07 Install** — dense `.two` code blocks, `radius none` on `pre`,
  `accent.default` inline code.
- **Footer** — hairline top rule, `text.subtle`, smithy sign-off.

### README (`README.md`) — English default

Markdown carries no motion; the smithy voice is carried by **type + structure**.
The README becomes the "blueprint pile" — dense, ruled, drafted:

- Render with the body font (Newsreader) and mono (IBM Plex Mono) where the
  renderer allows; otherwise the structure below carries the voice.
- Section heads use the display weight/rhythm; code fences read as blueprint
  plates (0 radius, sunken surface).
- Tables keep hairline rules and `caption`-weight mono headers; status language
  (PASS/FAIL, forge/cold) maps to the status tokens.
- The "흐름" (flow) ASCII diagram becomes a ruled drafting plate — the forge
  arrow warm, the REJECT/correction arrow cold.

### Korean

A separate Korean `README.ko.md` (and `lang="ko"` hero variant) is generated
from the **same tokens**. Korean fallbacks activate (Pretendard body/display,
D2Coding mono). The smithy cadence is preserved by the weight × tracking ×
all-caps treatment baked into the tokens — *not* by switching to a Korean
decorative face (which would trip the blackletter/fraktur anti-reference).

---

## Fidelity Notes

- **Every token traces to a prospected reference.** Surface/ember/bronze family
  ← color-prospector refs C1–C3, C5. Cold family ← C4. Type ← T1–T3. Spacing/
  radius/grid ← L1–L4. Motion ← M1–M5. No token was invented to fill a slot.
- **Contrast is enforced, not advised.** Two prospected values (`#A6341D` ember
  red, `#003153` Prussian blue) failed the WCAG gate as accent fills on the dark
  surface; both were *demoted to `line.*` borders* rather than dropped or
  lightened past the neon-guard. `accent.strong` was lifted from `#A6341D` to
  `#c0421d` explicitly to clear 3.0:1. The deterministic gate (`OK: true`) is the
  receipt.
- **Asymmetry is load-bearing.** The cold accent is ≤5% pixel area by design;
  using it as a fill breaks the "live in the forge, cross the snow" reading. The
  Application Guide scopes frost strictly to correction arrows, journey framing,
  and the cold border rule.
- **Stillness is a token, not an absence.** The "what NEVER moves" list
  (trusted-result blocks, headlines, body copy, resolved status pills) is the
  motion system's load-bearing commitment to "작업은 항상 잘 끝난다."
- **The technical substance is preserved.** This is a reskin, not a rewrite —
  the README's hooks table, the landing page's flow SVG, the install steps all
  remain; they are re-rhythmed and recolored, never stripped.
- **Two cold materials, by design.** `accent.cold #84a7b1` (verdigris/frost patina — the oxidized-bronze surface accent) and `line.cold #003153` (cyanotype Prussian-blueprint ink — the cold border rule) are intentionally distinct hues: two real prospected materials (ref C4 verdigris/frost vs ref C4 Prussian cyanotype), not one cold family drifting apart. The harmony panel flagged the gap as advisory; preserving both honors fidelity to the references over superficial hue-matching.
- **Dark-first system.** The token set is dark-first — `color.surface.default #1a1410` (the forge floor) is the canonical canvas; all contrast ratios are computed against it. A light/parchment inversion is out of scope for this reskin; the `color.surface.parchment` token exists only as a localized contrast panel (e.g. blueprint plates with dark ink), never as a site-wide theme.
