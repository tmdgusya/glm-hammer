# Checkpoint: M2 — Hook & Gate Integration

**Completed:** 2026-07-07
**Attempts:** 1

## Plan File
`docs/engineering-discipline/plans/2026-07-07-M2-hook-gate-integration.md`

## Review File
`docs/engineering-discipline/reviews/2026-07-07-M2-hook-gate-integration-review.md` — VERDICT: PASS (blocking 0, advisory 3: IMAGE_EXT/LICENSE_ALLOW가 stop-gate.js에 위치(값 동일), 매니페스트 경로 셀의 백슬래시 관용 정규화, attributions.md 봉인 검사가 분기 ①에 통합(기능 동등))

## Test Results
`node tests/gates.test.js` → exit 0, **73 ok / 0 FAIL** (기존 39 byte-무수정 + 신규 34). 리뷰어 적대적 스팟체크 6/6 §0 합치.

## Files Changed
- Create: `hooks/scripts/deck-gate.js`
- Modify: `hooks/scripts/stop-gate.js`(+158, 순수 추가), `hooks/scripts/lib.js`(planKey decks/ 확장), `hooks/hooks.json`(deck-gate 항목), `tests/gates.test.js`(+383, append-only)
- `hooks/scripts/route-intent.js` diff 0줄 (M3 소유)

## State After Milestone — 하류가 소비하는 인터페이스 계약
- **pptxxGate 활성** (stop-gate.js): §0 분기 ①–④ 전부 구현 — hybrid-done은 `state.deck` 키잉, fail-closed(무장+deck 부재→block)는 done-skip보다 선행 평가, 수령증 tail은 `evidence/deck/panel|visual-qa/round-<N>/<critic>.md` + `build.md`.
- **deck-gate.js 활성** (PostToolUse): 봉인 집합(slides.md/index.html/조건부 attributions.md, shots/·바이너리 제외), 무장 원웨이 래칫(`phase:'pptxx'` 한정 — index.html 이미지 참조→imagePanel.required=1, slides.md의 `^```diagram$`→visualQa.required=true, `visualQa.exempt===true`면 제외), 리셋 매핑(slides.md→양쪽, index.html→visualQa.round, attributions.md→imagePanel.round; 무장 쓰기 자체는 미증가), 속성 스코프 정적 검사(`<a href>`·텍스트 URL 허용).
- **매니페스트 문법 (M4가 생산):** 5열 파이프 행 `| <deck-상대 경로> | <sha256> | <source-url> | <license> | <author> |`; license ∈ {cc0,pdm,cc-by,cc-by-sa} 또는 `user-confirmed` 토큰; 파싱·검증 상수는 stop-gate.js의 IMAGE_EXT/LICENSE_ALLOW.
- **면제 마커:** `state.visualQa.exempt === true` (§0 추가 필드 — M3/M4 프로즈가 이 이름 사용).
- **M3 계약 포인트:** SKILL.md State Protocol은 §0 스키마 그대로; deck-gate가 무장을 소유하므로 SKILL.md는 플래그를 직접 쓰지 말고 게이트 동작을 서술할 것; route-intent.js는 M2에서 무접촉 — M3가 배선.
