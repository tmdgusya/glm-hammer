# Checkpoint: M3 — pptxx SKILL.md Core Pipeline + Chaining + Routing

**Completed:** 2026-07-07
**Attempts:** 1 (1차 실행이 Fable 5 한도로 첫 태스크 전 중단 → Opus 4.8 재개, 작업 손실 0)

## Plan File
`docs/engineering-discipline/plans/2026-07-07-M3-skill-core-chaining-routing.md`

## Review File
`docs/engineering-discipline/reviews/2026-07-07-M3-skill-core-chaining-routing-review.md` — VERDICT: PASS (blocking 0, advisory 1: 무해한 `⟨state: deck⟩` 키셋 주석 마커 — 드리프트 테스트가 무시)

## Test Results
`node tests/gates.test.js` → exit 0, **93 ok / 0 FAIL** (기존 73 무수정 + 신규 20: 라우팅 픽스처 r0–r4, 드리프트 s1–s7, 리스트 삽입 2, 키워드 2). crucible diff = `2 0` (정확히 2줄 추가).

## Files Changed
- Create: `skills/pptxx/SKILL.md`
- Modify: `hooks/scripts/route-intent.js`(workRequest 동사 추가 + deck 분기), `skills/crucible/SKILL.md`(+2/-0 스코프 수정), `tests/gates.test.js`(append + (b)/(j) 리스트 삽입), `.zcode-plugin/plugin.json`·`.claude-plugin/plugin.json`(keywords +4)

## State After Milestone — 하류가 소비하는 인터페이스 계약
- **skills/pptxx/SKILL.md 활성:** heavy-skill 5섹션; State Protocol = §0 스키마 verbatim; **무장은 서술만(모델이 required 플래그 직접 안 씀 — deck-gate 소유)**; M3-시대 규칙: 도식 블록은 slides.md에 미기입(M4가 활성화 — deck-gate `^```diagram$` 조기 무장 방지), 이미지 지시어 파싱-후-유예, 터미널 `building → done` 직행; 마커 = {scripting,chaining,imaging,building,done}만.
- **route-intent 라우팅 활성:** workRequest에 동사(`뽑|생성|추출|export`)만 추가, deck 명사 분기는 executeIntent 뒤·designIntent 앞. 픽스처 검증: 발표 요청→pptxx, 순수 디자인→crucible, "슬라이드 디자인"→pptxx(deck 우선), 비작업 "발표했어요"→무발화.
- **crucible 복귀 프로토콜 활성 (2줄 수정):** State Protocol이 `resume`·`deck`·`slides` 키 보존 + terminal done 시 resume 소거; Phase E가 resume 마커 시 forge 분기만 생략(디자인 사용자 수락 유지)·approved·복귀. **M4/M5는 이 복귀 계약에 의존하지 않음(M4는 SKILL.md 확장, M5는 export)** — 라이브 체이닝은 M6 수동 검증 항목.
- **M4 계약 포인트:** M4가 SKILL.md에 이미지/visual-qa phase 추가 + 도식 블록 문법 활성화(deck-gate 무장 grep 발화) + 마커 상수 += {visual-qa}; agents 2종(image-suitability-critic, visual-qa-critic) 신규; 드리프트 테스트를 tail coverage로 승격. deck-gate 무장/매핑/정적검사·pptxxGate 분기는 M2에서 이미 완비 — M4는 SKILL.md 프로즈·에이전트·테스트만.
