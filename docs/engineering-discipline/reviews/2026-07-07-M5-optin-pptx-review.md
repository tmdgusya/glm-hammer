# Review: M5 — Opt-in PPTX Extraction

**Date:** 2026-07-07
**Reviewer:** information-isolated review-work agent (verified from scratch)
**Plan:** `docs/engineering-discipline/plans/2026-07-07-M5-optin-pptx.md`
**Milestone:** `docs/engineering-discipline/harness/pptxx-skill/milestones/M5-optin-pptx.md`
**Frozen contract:** `docs/engineering-discipline/harness/pptxx-skill/planning/spikes/pptx/` is at `.../planning/spikes/pptx/` (draft-v4.md §0)

---

## Per-criterion verification

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | `node tests/gates.test.js` exit 0 | **PASS** | `114 ok / 0 FAIL`, exit 0. All 109 prior assertions present; s2 grew 6→8 markers (+awaiting-user, +exporting); z1–z3 new. |
| 2 | zero-dep invariant | **PASS** | Frozen grep `python-pptx\|import pptx\|spawn(Sync)?\(['"](python\|py)` over `hooks/ tests/` → **0 matches**. `md2pptx` in `hooks/`: **0**. In `tests/`: only comment (l744), z2 exists-check path literal (l785–786), z3 assembled pattern (l793) — all allowed. z1 pattern fragment-assembled (l772–773) → does not self-match. |
| 3 | two-run python fixture | **PASS** | `python readback.py` from spikes/pptx/: run(a) shots present → diagram slide **1 picture**; run(b) shots removed → **0 pictures + non-empty notes**; all titles match; exit 0 (`M5 FIXTURE PASS`). Also M1 `READBACK PASS`. |
| 4 | md2pptx.py path restriction + parsing + diagram policy | **PASS** | Ran 5 negative cases in tempdir: `../evil.png`, `C:/Windows/evil.png`, `images/note.txt`, `https://…`, `/etc`-style → all **exit 3** with clear REFUSED messages. Valid `images/ok.png` (deck-relative, image ext) → allowlist accepted, exit 0. Parses M4 grammar (title/body/`![](…)`+`> attribution:`/```diagram `slide: NN`/`---`/`> notes:`). C-4 policy: shots raster → 1 picture; absent → title+notes+0. |
| 5 | SKILL.md additions | **PASS** | Phase A `⟨state: awaiting-user⟩` opt-in only (l120–127, refuse→done), Phase X `⟨state: exporting⟩` runs `md2pptx.py`, `pip install python-pptx`, Python-absent HTML fallback (l129–145). Both markers present. Fenced-JSON `"status"` line (l32) byte-identical to §0 8-enum. Marker set = full 8 (s2). Terminal flow coherent (l147–149). |
| 6 | M5 zero self-diff on out-of-scope | **PASS (with advisory)** | No `md2pptx` in any out-of-scope file. `exporting`/`awaiting-user` tokens in stop-gate.js / session-start.js / crucible are **M2/M3-era gate contract**, not M5 — milestone Files-Affected excludes them and §0 assigns exporting-gate support to M2. M5-owned files present & correct. See advisory [A1]. |
| 7 | Milestone Success Criteria | **PASS** | All 4 met (below). |
| 8 | Adversarial (≥3) | **PASS** | (a) diagram block, no shot → title+notes fallback, exit 0 (no crash). (b) absolute Windows drive path → exit 3 REFUSED. (c) suite is pure-Node: z1–z3 use `fs.readFileSync` only, no `spawnSync('python'…)` wired anywhere (frozen grep 0). |

---

## §0 conformance

- **status enum** (SKILL.md l32) == §0 8-enum verbatim: `scripting | chaining | imaging | building | visual-qa | awaiting-user | exporting | done`. s1 green, unmodified.
- **marker era-constant** (gates.test.js l636) = full 8-set — the sole in-place edit, pre-approved by §0 drift rule "M5 += {awaiting-user, exporting}". All other assertions appended before `process.exit` (l803).
- **gate branch table**: exporting ∈ branches ①②③; awaiting-user passes common guard (pptxx (h) green). M5 hooks-untouched, consistent with §0 (M2 owns gate support).

## Fixture + negative-case results

- **Two-run (readback.py):** run(a) picture==1 / run(b) picture==0 + non-empty notes; titles match; exit 0.
- **Negatives (tempdir, self-run):** parent-escape / drive-letter / non-image / URL / file-scheme all → exit 3 + `md2pptx: REFUSED: …`. Valid deck-relative image ref → exit 0.
- **README** records the frozen `../evil.png` → exit 3 case plus a 6-row rejection table (`spikes/pptx/README.md` §거부 부정 케이스).

## Adversarial results

- **A-diagram-no-shot:** `slide: 07` block, no `shots/slide-07.png` → title + demoted notes, 0 pictures, exit 0. No crash.
- **B-absolute-path:** `C:/Windows/evil.png` → exit 3, drive-letter refusal.
- **C-node-purity:** md2pptx.py structurally un-importable by Node; z1–z3 read files with `fs.readFileSync`; zero `spawnSync`/require of the converter. python-pptx cannot leak into the Node suite.

---

## Findings

- **[advisory A1]** Out-of-scope files (`hooks/scripts/stop-gate.js`, `session-start.js`, `skills/crucible/SKILL.md`) carry `awaiting-user`/`exporting` tokens and stop-gate.js has an `exporting` guard (l377). These are **pre-existing uncommitted M2/M3 diffs**, not M5's — the milestone Files-Affected list excludes them and no `md2pptx` (the M5-unique token) appears in any out-of-scope file. M5's own contribution to those files is confirmed zero. Not a fault against M5; flagged for the committer to attribute correctly.
- **[advisory A2]** C-9 records 6 §0-unspecified interpretations frozen by the plan (md2pptx CLI signature `<deck-dir> [<tokens.json>]`, output `<basename>.pptx`; tokens best-effort exit 0; single-diagram two-run; not-require = `require(` context; gate support = M2-complete; rejection case suite-unwired). All reasonable and internally consistent — noted for reviewer awareness, no defect.
- **[advisory A3]** In the reviewer's valid-image negative check, the PIL pre-stage wrote to a Git-Bash `/tmp` path the Windows Python could not resolve, so md2pptx hit its "valid-but-missing local image" best-effort branch (exit 0) rather than embedding. The path *allowlist* still correctly accepted the deck-relative ref (no REFUSED). Does not affect the verdict; the two-run fixture already proves real embedding.

No blocking findings.

---

## VERDICT: PASS

All 4 milestone success criteria met; zero blocking findings. `node tests/gates.test.js` 114 ok / 0 FAIL / exit 0; frozen zero-dep grep 0 matches; two-run fixture exit 0 (picture 1 / picture 0 + notes); path-restriction negatives exit 3; SKILL.md awaiting-user/exporting phases + markers + fallback landed; §0 status enum & marker era-constant conform.
