# Review: M1 — De-risk Spikes + 파이프라인 계약 문서

- **Date:** 2026-07-07
- **Milestone:** `docs/engineering-discipline/harness/pptxx-skill/milestones/M1-derisk-spikes.md`
- **Plan:** `docs/engineering-discipline/plans/2026-07-07-M1-derisk-spikes.md`
- **Reviewer:** information-isolated review-work agent (no execution context; all checks re-run from scratch)

Spike root abbreviated below as `spikes/` = `docs/engineering-discipline/harness/pptxx-skill/planning/spikes/`.

## Per-Task Verification (plan Acceptance re-run)

| # | Criterion | Method | Result | Evidence |
|---|---|---|---|---|
| T0 | `## Environment` in all 3 READMEs with python/node versions | `grep -l "## Environment" spikes/*/README.md` | PASS | 3 files returned (image-api, pptx, screenshot); each records Python 3.14.6, pip 26.1.2, node v24.18.0, playwright 1.61.1 |
| T1 | format-spec.md exists; construct greps | `grep -c` on `spikes/pptx/format-spec.md` | PASS | ` ```diagram `=3, `---`=1, `attribution`=3, `notes`=3, `shots`=2, 폴백/fallback=1 — all ≥1. Spec defines separator, single `#` title, ≤2-level bullets, `> attribution: author \| license \| source-URL` with manifest-column mapping, exact-fence-only diagram marker (variants explicitly forbidden, `^```diagram$` gate rationale stated), `> notes:`, and export policy (shots/slide-NN.png raster reuse; fallback = title only + description demoted to speaker notes) |
| T2 | screenshot README contract | `grep -c` on `spikes/screenshot/README.md` | PASS | `shots/slide-NN.png`=1, `javaScriptEnabled`=2, `slide-01`=3; addressing convention (`id="slide-NN"`, 1280×720, element-locator screenshot), frozen output path, and deny-by-default routing all stated as mandatory |
| T3 | deck HTML + nonces | grep + regex on `sample-deck.html`, `nonces.txt` | PASS | `id="slide-0`=3, `<script`=0, external refs (`https?://`/`<link>`)=0; inline SVG shapes present (circle/triangle/hexagon via 4 circle + 4 polygon tokens, 3 `<svg>`); nonce font sizes 24/26px (≥24px); `nonces.txt` has exactly 3 lines matching `^slide-0[1-3]: [A-HJ-NP-Z2-9]{6}$` (5SCNR3 / SPEG2H / KDU39D) |
| T4 | slide PNGs >1KB; Capture Command recorded | `ls -la`, grep, read `capture.cjs` | PASS | slide-01.png 50,626 B; slide-02.png 49,646 B; slide-03.png 48,912 B. README `## Capture Command` records exact command (`NODE_PATH=... node capture.cjs`). capture.cjs implements `javaScriptEnabled: false`, viewport 1280×720, `context.route('**/*')` continuing only `file://...sample-deck.html`, aborting all else, per-slide `page.locator('#slide-NN').screenshot()` |
| T5 | transcription + verdict | read files, compare to nonces.txt; independent visual check | PASS | `transcription.md` present (verbatim subagent message, ≥3 slide lines); `verdict.md` has exactly one `^VERDICT: APPROVE$` line; comparison table 3/3 nonces and 3/3 shapes match nonces.txt. Reviewer independently opened slide-01.png: shows `5SCNR3` and a circle — matches. Dispatch prompt recorded verbatim in README `## Dispatch Prompt` (PNG paths only, no nonce/alphabet hints) |
| T6 | API JSONs ≥3 complete entries; README URLs/UA/rate-limits | `node -e` parse check; grep README | PASS | openverse-sample.json: 5/5 entries with non-empty license+creator+source_url; wikimedia-sample.json: 3/3 — parse script exit 0. README records full query URLs (`api.openverse.org`=2, `commons.wikimedia.org`=3 mentions), descriptive UA `glm-hammer-pptxx-spike/0.1 (contact: dev0jsh@gmail.com)`, Openverse rate-limit headers (20/min burst, 200/day sustained), Commons rate-limit "없음" explicitly. `haslicense:cc0` unsupported ("no valid arguments" warning) → LicenseShortName client-side filter adopted and documented — matches plan's prescribed fallback |
| T7 | download verify + delete; no image binaries | grep sha256; `find` for binaries | PASS | Two 64-hex sha256 values in README (`0e1a0a15...bb71`, `b3701dcc...ac9c`) with final URL, WxH (500x339, 1280x843), `image/jpeg`, byte sizes ≤5MB, Pillow method recorded. Openverse pick is cc0, Commons pick is Public domain. `find` for *.jpg/*.jpeg/*.gif/*.webp under spikes/ = 0; PNGs = slide-01..03.png only (pre-re-run state) |
| T8 | tokens valid; regeneration exit 0; sample-slides greps | re-ran both commands; grep | PASS | See "Re-run Results" below. sample-slides.md: ` ```diagram `=2, `attribution:`=1, `notes:`=2, `^---$`=3 — exercises all format-spec constructs incl. with-shot and without-shot diagram paths |
| T9 | isolation + Completion Note | `git status --porcelain`; read plan | PASS | Plan contains `## Completion Note` with 19-file list matching the actual tree exactly; all M1 outputs under `spikes/` + the plan file. See Scope Check |

## Re-run Results (executed fresh by reviewer)

1. **validateTokens** (repo root, read-only require):
   `node -e "const r=require('./hooks/scripts/token-lib.js').validateTokens('docs/engineering-discipline/harness/pptxx-skill/planning/spikes/pptx/tokens.json'); ..."`
   → output `{"ok":true,"problems":[]}`, **exit 0**.
2. **PPTX spike regeneration** (cwd `spikes/pptx/`, exact README-recorded command):
   `python md2pptx-spike.py && python readback.py`
   → wrote sample.pptx (4 slides); readback asserted title match 4/4 ('Opening Slide', 'Image Slide', 'Diagram With Shot', 'Diagram Without Shot'), image slide picture ≥1, diagram-with-shot picture OK, diagram-without-shot fallback (no picture, notes demotion) OK → `READBACK PASS`, **exit 0**.
   Note: the re-run regenerated `spikes/pptx/sample.pptx` and `spikes/pptx/images/placeholder.png` — expected byproducts of reproducing the spike, not violations (README documents `ensure_placeholder()` regenerates it each build).

## Milestone Success Criteria (6 checkboxes)

| Criterion | Verdict | Evidence |
|---|---|---|
| 1. 계약 문서 (무조건) | **MET** | `spikes/pptx/format-spec.md` — full 1-page spec incl. diagram export policy (raster reuse + title/notes fallback); `spikes/screenshot/README.md` — addressing convention + frozen `<deck>/shots/slide-NN.png` path |
| 2. 스크린샷 | **MET** | 3-slide house-style deck (dark `#1a1410` / amber `#d97b30`, no scripts, no external refs); slide-01..03.png captured via `javaScriptEnabled:false` + deny-by-default routing (verified in capture.cjs source), command in README; nonces (valid alphabet, 6 chars, ≥24px) in nonces.txt; isolated-subagent transcription persisted; transcription == nonces (3/3, plus shapes 3/3); `VERDICT: APPROVE` present; reviewer visually confirmed slide-01 nonce/shape |
| 3. 이미지 API | **MET** | Both JSONs ≥3 entries, license/creator/source_url non-empty (node parse exit 0); query URLs, descriptive UA, rate limits (Commons explicitly '없음') in README; Openverse query used `license=cc0,pdm&mature=false`; 1 download per API with frozen curl flags, ≤5MB, image/jpeg; URL+sha256+dimensions recorded then binaries deleted; no image binaries in tree, no git commits |
| 4. PPTX | **MET** | README-recorded command re-run by reviewer: sample.pptx regenerated from sample-slides.md (all format-spec constructs) + validateTokens-passing tokens.json; readback.py asserted all titles + picture-shape >0 and exited 0 |
| 5. 격리 | **MET** | All 19 M1 files confined to `planning/spikes/` (+ plan document). No M1 writes outside |
| 6. 에스컬레이션 규율 | **MET** | Install commands + versions recorded in all 3 READMEs (python-pptx 1.0.2, Pillow 12.2.0, playwright 1.61.1 global reuse); no env or integration failures occurred, so no escalation was required; env-vs-integration classification discipline documented in plan and followed (the one API deviation — `haslicense` unsupported — was handled by the plan's own prescribed fallback and recorded, not silently scope-cut) |

## Scope Check

`git status --porcelain` at review time:
```
 M hooks/hooks.json
 M hooks/scripts/lib.js
 M hooks/scripts/stop-gate.js
 M tests/gates.test.js
?? docs/engineering-discipline/context/2026-07-07-pptxx-skill-brief.md
?? docs/engineering-discipline/harness/
?? docs/engineering-discipline/plans/
?? hooks/scripts/deck-gate.js
```
The `hooks/`, `tests/`, and context-brief changes belong to a concurrent milestone and are **out of scope** for this review (per review directive). M1's own outputs are fully confined to `docs/engineering-discipline/harness/pptxx-skill/planning/spikes/**` plus the plan file under `docs/engineering-discipline/plans/`. No M1 modification of repo source; `token-lib.js` was only required read-only (re-verified by the reviewer's own invocation).

## Findings

1. **[advisory]** The reproducibility re-run (performed by this review, per the recorded command) leaves `spikes/pptx/images/placeholder.png` (and a rebuilt `sample.pptx`) in the working tree. The pre-review tree did not contain the placeholder, and the pptx README correctly documents that it is a per-build regenerated artifact that should not be committed. Whoever commits M1 should delete `spikes/pptx/images/` (or gitignore it) before staging — the binary-discipline rule ("spikes/ image binaries = slide-0N.png only") holds for the pre-re-run tree but any future run of the recorded command will recreate the placeholder.
2. **[advisory]** `spikes/screenshot/capture.cjs` is not in the plan's Scope "In" file list, but Task 4 explicitly permits placing the capture script under `spikes/screenshot/`, and the Completion Note declares it. No action needed; noted for inventory completeness only.

Blocking findings: **0**. Advisory findings: **2**.

VERDICT: PASS
