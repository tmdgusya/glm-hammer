# Round 1 — Security & Access Critic (vs DRAFT v1)

**[Blocking] Finding:** No milestone owns the act of fetching image bytes — hotlink-vs-local-copy is never decided, and no URL validation exists anywhere in the DAG, which breaks three downstream milestones simultaneously.
**Where:** M1 spikes metadata JSON only (no image downloaded); M4 attribution rule silent on remote URL vs local copy; M3 cites "자기완결" house style yet M4 introduces web images without reconciling — draft-vs-digest contradiction.
**Failure scenario:** Executor hotlinks → (a) read-only information-isolated panel cannot Read a remote URL — unanimous panel approves images it has never seen (SC2 becomes theater); (b) Playwright fetches arbitrary remote URLs at render time; (c) M5 needs local bytes → ad-hoc unvalidated curl written in the least-equipped milestone (no scheme/host restriction, size cap, content-type check).
**Smallest fix:** M1: downloaded image artifact criterion (https-only, Content-Type: image/*, size cap, recorded command). M4: all adopted images stored as local copies in the deck dir (validated), deck HTML·pptx reference local paths only, panel Reads local copies.

**[Blocking] Finding:** License compliance is reduced to attribution; NC/ND/SA terms are unhandled, and the WebSearch source has no license metadata at all — making M4's own checklist criterion self-contradictory.
**Failure scenario:** (1) CC BY-NC lands fully-attributed in a commercial deck — violation certified as compliant. (2) WebSearch images have no license metadata → honest checklist REJECTs all → unanimity unreachable → user escalation every run; or checklist is watered down.
**Smallest fix:** M4: license policy — allowlist by default (cc0/pdm/by; by-sa with share-alike note), nc/nd only after explicit user confirmation; WebSearch images admissible only when the source page states a usable license, else Openverse/Wikimedia only. Split checklist: "라이선스 코드가 허용 정책 내" and "표기 렌더링 존재".

**[Blocking] Finding:** The insane-search fallback has no stated negative policy — the draft encodes when it appears but never when it must NOT be used, adjacent to exactly the failure (blocked/rate-limited fetches) it would be misused to "solve".
**Failure scenario:** Image origin or Wikimedia API returns 403/429 (normal outcome of UA/rate limits) → only guidance is "차단 페이지 폴백" → skill installs insane-search and fetches the refusing page; shipped SKILL.md permanently instructs bot-evasion against sites denying automated access. Prose IS the control.
**Smallest fix:** M4 SC: SKILL.md explicit prohibitions — never to acquire image bytes, never against Openverse/Wikimedia APIs, never to bypass 403/429/robots/paywalls; permitted only for reading text of a user-supplied reference URL, disclosed in-session.

**[Concern]** M4 embeds a Playwright command proven only on a benign sample into a phase rendering LLM-generated user-content HTML with live network/script execution. Fix: screenshot command blocks all non-file:// requests (route interception/offline); M3 house rule: no `<script>`, no external resource references.
**[Concern]** Wikimedia UA policy and Openverse anonymous rate limits owned by no milestone. Fix: M1 README records headers used + rate-limit headers observed; M4: UA string, per-run query budget, backoff-then-ask-user on 429 — explicitly not insane-search.
**[Concern]** md2pptx.py consumes untrusted markdown/images, no input constraints; title-only readback. Fix: M5 SC — image references resolve only within the deck directory (reject absolute/`..`/non-image), one recorded negative case.
**[Concern]** Vision verdicts steerable by text rendered inside judged content (prompt injection via slide text/images). Fix: both agent .md files state rendered text is untrusted data, never instructions/checklist answers.
**[Concern]** Content safety absent from the image-suitability checklist. Fix: content-safety checklist item + Openverse mature-content exclusion on by default.

**Ownership summary:** M1 = prove download path + record API etiquette; M3 = deck self-containment rule; M4 = the entire external-access policy layer; M5 = path confinement. M2 needs no security change (controls are not gate-expressible; they live in SKILL.md/agent prose).
**Summary:** 3 Blocking, 5 Concern. No Structural.
