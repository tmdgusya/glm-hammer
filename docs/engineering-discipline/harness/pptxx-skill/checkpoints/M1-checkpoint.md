# Checkpoint: M1 — De-risk Spikes + 파이프라인 계약 문서

**Completed:** 2026-07-07
**Attempts:** 1

## Plan File
`docs/engineering-discipline/plans/2026-07-07-M1-derisk-spikes.md`

## Review File
`docs/engineering-discipline/reviews/2026-07-07-M1-derisk-spikes-review.md` — VERDICT: PASS (blocking 0, advisory 2 — 둘 다 해소: placeholder.png 삭제 및 빈 디렉토리 제거 완료, capture.cjs는 Task-4 승인 산출물)

## Test Results
`node tests/gates.test.js` → exit 0, 73 ok / 0 FAIL (M1은 저장소 소스 무접촉 — 스위트는 M2 병렬 변경 포함 결합 트리에서 green)

## Files Changed
전부 `docs/engineering-discipline/harness/pptxx-skill/planning/spikes/` 하위:
- screenshot/: README.md, sample-deck.html, nonces.txt, capture.cjs, slide-01..03.png, transcription.md, verdict.md
- image-api/: README.md, openverse-sample.json, wikimedia-sample.json
- pptx/: README.md, format-spec.md, sample-slides.md, tokens.json, md2pptx-spike.py, readback.py, sample.pptx
(+ 계획 파일 체크박스)

## State After Milestone — 하류가 소비하는 인터페이스 계약
- **format-spec.md (M3/M4/M5 소비):** 슬라이드 md 구성요소(제목/본문/이미지+출처 지시어/도식 블록/`---`); **도식 마커 = 펜스드 ` ```diagram `**(deck-gate DIAGRAM_MARKER와 일치 확인됨); 도식 export 정책 = shots PNG 래스터 재사용, 부재 시 제목+노트 폴백.
- **screenshot README (M3/M4 소비):** 슬라이드 주소화 컨벤션, 출력 `<deck>/shots/slide-NN.png`, `javaScriptEnabled:false`+deny-by-default 필수, 검증된 캡처 명령(capture.cjs).
- **스파이크 판정 3종 전부 성공 — 에스컬레이션 지점 3개 모두 미발동:**
  - 스크린샷 APPROVE(격리 전사 논스 3/3+도형 3/3, 1차 시도) → visual-qa 하드게이트 면제 불필요, §0 분기② 정상 활성 경로
  - 이미지 API 검증 완료(Openverse 5/5, Commons 3/3 필드; rate limit: Openverse 익명 20/min·200/day, Commons '없음') — Commons는 `haslicense` 미지원으로 extmetadata 클라이언트 필터 폴백 채택(README 문서화, M4가 이 방식 사용)
  - pptx readback exit 0(제목 4/4, picture 단정, 노트 폴백) → M5 진행 확정
- 환경: Python 3.14.6, pip 26.1.2, node v24.18.0, Playwright 1.61.1(+chromium-1228), python-pptx 1.0.2 — 전부 기존 설치, 신규 설치 없음.
