# Round 1 — Hidden Complexity Critic (vs DRAFT v1)

**[Blocking] Finding:** The pptxxGate receipt/state contract is split across M2 and M4 such that M4's success criteria require stop-gate behavior that M4's file list cannot produce and M2's success criteria never demand.
**Where:** M2 SC — "`phase:'pptxx'` + deck 봉인 없음 → stdout에 `"block"`; 봉인 + APPROVE 수령증 → 차단 없음" vs M4 SC — "도식 슬라이드 런에 APPROVE visual-qa 수령증 없으면 pptxxGate 차단하는 (h)-미러 시나리오", with M4 Files: no `stop-gate.js`.
**Failure scenario:** M2 can ship a seal-plus-one-receipt gate and go green; M4's test then fails against gate code M4 cannot touch, or M4 silently expands into shared enforcement code. The gate needs a state schema (diagram slides? panel rounds? deck complete?) — nothing pins the `state.deck.*` equivalent.
**Smallest fix:** Enumerate the full pptxxGate contract in M2's SC (deck state schema, exact evidence tails, critic names, conditional enforcement); M2 tests fabricate receipts like (h)'s JUDGE_BODY. M4 consumes the strings verbatim.

**[Blocking] Finding:** M1's screenshot spike de-risks the wrong thing — it proves single-file capture of one sample slide, while M4 needs per-slide capture of a multi-slide deck, and the deck HTML structure that makes that possible is committed in M3 with no contract.
**Where:** M1 SC — "`spikes/screenshot/slide-01.png`" (from `sample-slide.html`, singular); M4 SC — "M1 증명 Playwright 스크린샷 명령 내장".
**Failure scenario:** Screenshotting slide N of a deck requires per-slide addressability (files, fragments, params, viewport paging). M3 designs the deck HTML with no screenshot-ability requirement; M4 discovers the "proven command" doesn't apply; fix = deck-format change = rework of shipped M3.
**Smallest fix:** M1 screenshot SC: ≥3-slide sample deck in house style, per-slide capture `slide-01..03.png`, structural convention recorded in README. M3 SC: deck HTML follows the M1-recorded convention.

**[Concern] Finding:** M1 "Effort: Medium" underestimates three unrelated toolchains, each with environment setup and a model-in-the-loop step, on a machine where none are installed.
**Smallest fix:** Re-rate M1 Large; state per-spike independence: each spike has its own success criterion and its own abort/descope decision.

**[Concern] Finding:** M5 lacks a dependency on M4, but M4 changes the slides.md input format that M5's converter parses.
**Smallest fix:** Add M4 to M5's dependencies + SC: md2pptx.py runs against slides.md containing M4-format image/attribution directives, exits 0.

**[Concern] Finding:** The gate model decided in M2 (done-skip vs done-recheck) interacts with M5's post-completion opt-in question, but no M2 scenario covers the "deck done, awaiting PPTX answer" state.
**Smallest fix:** M2 SC: terminal-seam test — post-deck opt-in-pending state passes the gate (e.g. `awaiting-user`); M5 SC: SKILL.md opt-in prose uses exactly that status.

**[Concern] Finding:** M2's routing test presumes deck requests trip the router, but the `workRequest` pre-gate regex contains no deck vocabulary.
**Smallest fix:** M2 SC: `workRequest` extended with deck vocabulary (발표|슬라이드|deck|presentation|pptx) + negative-control design prompt → crucible + deck-noun-only prompt → pptxx.

**[Nit] Finding:** Deck sealing scope unspecified (slides.md, HTML, image binaries) — images fetched via Bash/curl never pass PostToolUse; naive "all deck files" verification deadlocks.
**Smallest fix:** "sealed set = *.md and *.html under the deck dir; binaries excluded" in M2's SC.

**Survived attacks:** digest line refs all verified; M2 size 7-9 tasks in band; M1∥M2 file disjointness holds; zero-dep boundary genuine; dispatch-ledger fail-open matches (h) precedent; hooks-before-skill ordering not structural.
**Summary:** 2 Blocking (boundary-contract), 4 Concern, 1 Nit. Shape sound.
