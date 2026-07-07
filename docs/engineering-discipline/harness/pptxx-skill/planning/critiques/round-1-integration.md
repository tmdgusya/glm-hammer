# Round 1 — Integration & Risk Critic (vs DRAFT v1)

**[Blocking] Finding:** The pptxx→crucible chain has no return path — the precedent M3 says it will "mirror" actively routes the run to the wrong skill, and the fix surface (crucible SKILL.md) is declared out of scope.
**Where:** M3 "체이닝 지시문이 crucible→forge 패턴 미러"; Brief Out-scope "crucible 스킬 자체 수정". Verified crucible Phase E (100-106): on Yes invokes forge; on decline sets done (deactivates run per route-intent.js:21).
**Failure scenario:** Call-and-return is unprecedented; executing model inside crucible follows crucible's terminal prose — forge question mid-deck-run; decline kills the run; pptxx never resumes. Riskiest novel integration exercised live, post-merge, in front of the user.
**Smallest fix:** Explicit M3 criterion for the return protocol (invocation directive overriding Phase E handoff; who restores phase/status; mid-chain stop-gate behavior). If prose-override too fragile, surface a scope-amendment request (one conditional line in crucible Phase E) rather than silently mirroring.

**[Blocking] Finding:** M2 freezes the entire pptxxGate contract — including receipt branches whose producers don't exist until M4 and terminal-status semantics not consumed until M5 — while M4/M5 Files lists forbid touching stop-gate.js; any mismatch forces reopening a completed milestone.
**Failure scenario:** M2 invents blind: diagram-run state field, panel round structure, exact tails — before critic/checklist/phase exist. M4 test fails → no sanctioned surface → reopen M2. M5: done-skip → post-deck PPTX phase runs ungated; done-recheck → wrong choreography; M5 can't fix (no hook files). Compounding: M2 "Dependencies: None" but its visual-qa branch is only meaningful if M1's screenshot spike succeeds — "스파이크 실패 시 통합 비용 0" is false for M2.
**Smallest fix:** Split gate ownership along receipt seams: M2 = skeleton (phase entry, deck seal, gate model, route-intent) + written state-contract table (every phase/status string, state field, evidence tail, terminal model incl. M5 opt-in states) as milestone artifact; add stop-gate.js to M4's Modify list (visual-qa/panel branches land with their producers); M2 (h)-mirror for opt-in/terminal states.

**[Blocking] Finding:** M2's "dormant code" and Abort Point claims are false — the route-intent deck branch is live the moment M2 lands, advertising a skill that won't exist until M3.
**Failure scenario:** From M2 to M3, deck prompts inject "invoke the pptxx skill" (no such skill; agents fallback exists for agents, not skills) → improvised ungated deck. Poisons the abort centerpiece: M1 spikes fail → plan aborts → repo permanently ships a ghost-skill router. M2 is not a shippable green checkpoint.
**Smallest fix:** Move route-intent deck branch (and suite assertion) to M3; or guard on existsSync(skills/pptxx/SKILL.md) and correct M2's Abort Point text.

**[Concern] Finding:** No milestone owns the slide `.md` format contract — M1's PPTX spike and M5's criterion validate against a sample invented before the format exists (M3 defines it; M4 adds image-attribution and diagram constructs).
**Smallest fix:** M1 additionally emits a one-page slide-md format spec exercised by sample-slides.md; M3/M4 SC reference conformance; M5 adds a fixture in the final M4-era format.

**[Concern] Finding:** Seal semantics for deck files that never pass through Write/Edit (curl-downloaded images, Playwright PNGs) are undecided in M2 and only exercised live after merge — broad sealMatches on "the deck" deadlocks every real run at the stop gate.
**Smallest fix:** M2 SC enumerates sealed artifact set (slides .md + index.html only), constrains planKey alternation to those extensions, adds negative test: deck-path PNG → no seal, gate does not demand one.

**[Nit]** workRequest pre-filter lacks deck verbs ("발표자료 준비해줘" never reaches the ladder) — M2 must list the vocabulary decision.
**[Nit]** Test (b) currently parses only .zcode-plugin/plugin.json; M3 must explicitly add .claude-plugin/plugin.json to the loop.

**Survived attacks:** spike-first not theater; gates-before-skill matches house philosophy (defect is contract completeness, not ordering); never-live-tested pipeline scoped to manual per Verification Strategy + auto-appended Integration Verification milestone.
**Summary:** 3 Blocking, 2 Concern, 2 Nit. No Structural.
