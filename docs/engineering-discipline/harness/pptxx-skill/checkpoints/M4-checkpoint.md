# Checkpoint: M4 — Image Sourcing + Critic Panels + External-Access Policy

**Completed:** 2026-07-07
**Attempts:** 1

## Plan File
`docs/engineering-discipline/plans/2026-07-07-M4-image-panels-policy.md`

## Review File
`docs/engineering-discipline/reviews/2026-07-07-M4-image-panels-policy-review.md` — VERDICT: PASS (blocking 0, advisory 2: pptxx 기능 전체 uncommitted라 zero-self-diff가 문자열 일관성에 의존(성립 확인); M2의 non-line-anchored 도식 마커 매치)

## Test Results
`node tests/gates.test.js` → exit 0, **109 ok / 0 FAIL** (M3 baseline 93 + 신규 16: 에이전트 계약 t1–t8, 정책 s8–s12, 드리프트 승격 s2/s3, (j) 존재 2). 적대적 하니스: cc-by 통과, cc-by-nd·unbacked 차단 독립 확인.

## Files Changed
- Create: `agents/image-suitability-critic.md`, `agents/visual-qa-critic.md` (둘 다 tools `["Read","Grep","Glob","Write"]`, Bash 없음)
- Modify: `skills/pptxx/SKILL.md`(이미지 phase + visual-qa phase + M4-시대 활성화 + Anti-Patterns 5행), `tests/gates.test.js`(append + s2/s3/(j) 승격)
- stop-gate.js 컨틴전시 미발동 (계약 문자열 이미 정합)

## State After Milestone — 하류가 소비하는 인터페이스 계약
- **critic 에이전트 2종 활성:** image-suitability-critic(C1–C4: 라이선스 허용목록/출처 렌더링/맥락 적합/콘텐츠 안전), visual-qa-critic(C1–C4: 가독성/오버플로우/토큰 준수/도식 판독). 둘 다 Bash 제거·단일 Write 경로 규칙·데이터-비지시 라인; 수령증은 receiptProblems judge kind 충족, tail은 §0 동결.
- **SKILL.md 이미지 phase:** 로컬 사본만(M1 curl 플래그), attributions.md 5열 매니페스트, fetch.md raw 영수증, WebSearch+Openverse+Commons(LicenseShortName 폴백), 라이선스 정책(cc0/pdm/cc-by; cc-by-sa 무수정+SA; nc/nd는 user-confirmed), mature 필터 on, UA+쿼리 예산+429 backoff, insane-search 금지 규정, fetched 텍스트 데이터-비지시.
- **SKILL.md visual-qa phase:** Playwright JS-off+deny-by-default → `<deck>/shots/slide-NN.png`; **도식 블록 문법 활성화(M3-시대 유예 종료)** — 이제 slides.md에 ` ```diagram ` 등장 가능, deck-gate가 이를 grep해 visualQa.required 무장; REJECT ≤3 에스컬레이션. 무장은 여전히 deck-gate 소유(모델이 required 직접 안 씀).
- **M5 계약 포인트:** M5는 `awaiting-user` 옵트인 질문 + `exporting` phase를 SKILL.md에 삽입, 마커 상수 += {awaiting-user, exporting}, `skills/pptxx/scripts/md2pptx.py`를 M1 스파이크(md2pptx-spike.py/readback.py, format-spec 도식 export 정책=shots PNG 재사용/부재 시 제목+노트)에서 경화. 최종 슬라이드 포맷은 M4-시대(이미지+출처 지시어·도식 블록 포함). zero-dep grep은 `python-pptx|import pptx|spawn...python` 형태(부분 문자열 pptx 회피).
