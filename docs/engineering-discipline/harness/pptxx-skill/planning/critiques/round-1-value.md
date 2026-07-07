# Round 1 — Value & Sequencing Critic (vs DRAFT v1)

**[Blocking] Finding:** M2's abort point is falsified by its own route-intent change — stopping after M2 leaves the router live-directing users to a skill that does not exist.
**Where:** M2 Abort Point "휴면 코드; 기존 동작 무결" vs SC "deck형 요청 → additionalContext에 pptxx 언급". route-intent.js:56-98 emits hints unconditionally on regex match; only existence guard in file is plansDirHasFiles (:67), hammer-only.
**Failure scenario:** During M2→M3 window and at M2 abort, deck requests are routed worse than today's catch-all — model told to invoke a nonexistent skill.
**Smallest fix:** Move the route-intent deck branch (and test) to M3; or gate on existsSync mirroring plansDirHasFiles. Moving is cleaner.

**[Blocking] Finding:** M5 can pass every stated success criterion while shipping a converter that fails on real decks, because it validates only against M1's spike fixture — a slide-.md format invented before M3 defines the real one.
**Where:** M5 SC (M1 fixture only); M1 creates sample-slides.md with Dependencies: None; M3 defines the real format with no dependency on M1.
**Failure scenario:** Three milestones touch the slide-md format, nothing forces agreement. M3/M4 add diagram markers, image references with attribution, speaker notes → md2pptx.py exits 0 on the stale fixture, M5 closes green, first real deck→PPTX extraction fails post-merge where nobody is looking.
**Smallest fix:** M5's first SC runs md2pptx.py against a fixture in the exact format M3's SKILL.md specifies; M3 SC: the slide-md format is explicitly specified in SKILL.md. M1's sample stays spike evidence only.

**[Concern] Finding:** pptxxGate's receipt-enforcement branches are frozen in M2 but the phases they gate are designed in M4, which cannot touch stop-gate.js — any M4-discovered mismatch reopens a completed milestone.
**Smallest fix:** M2's gate contract section enumerates exact state fields and dispatch agent names as a frozen interface; add stop-gate.js to M4's Modify list as a bounded allowance ("receipt branch only, guarded by existing (h) regressions").

**[Concern] Finding:** M2's gate-model decision must also fix the post-deck opt-in state machine, but the opt-in flow is designed in M5, which cannot touch stop-gate.js.
**Smallest fix:** M2 SC: opt-in question asked under `status:'awaiting-user'` (guard :283 passes); define terminal statuses; name M5 as consumer.

**[Concern] Finding:** M1's and M2's "User Value" claims are developer value relabeled, which corrupts the abort-point calculus.
**Failure scenario:** If execution stalls after M1∥M2 (both Risk: High), user received zero value despite two completed milestones; inflated labels hide that all value is behind M3.
**Smallest fix:** Relabel M1 as "risk retirement / decision information"; M2 as "regression safety for existing users". No reordering needed.

**[Nit] Finding:** M1's screenshot verdict criterion proves the PNG is readable, not that the M4 visual-qa contract can act on it; a REJECT has no defined consequence.
**Smallest fix:** M1 states: screenshot-spike REJECT triggers descoping decision for the visual-qa hard gate before M2 finalizes that branch.

**Survived attacks:** risk-first infra-heavy opening defensible (value-of-information argument holds; value-first shape would violate hook-enforcement house pattern); M3 abort point honest (token-styled text deck ships a talk); M1∥M2 disjoint; M4∥M5 correctly serialized in prose; brief criteria 1→M3, 2·3→M4, 4→M5, 5→M2–M5 complete.
**Summary:** 2 Blocking, 3 Concern, 1 Nit. No Structural.
