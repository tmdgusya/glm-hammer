# Checkpoint: M5 — Opt-in PPTX Extraction

**Completed:** 2026-07-07
**Attempts:** 1

## Plan File
`docs/engineering-discipline/plans/2026-07-07-M5-optin-pptx.md`

## Review File
`docs/engineering-discipline/reviews/2026-07-07-M5-optin-pptx-review.md` — VERDICT: PASS (blocking 0, advisory 3 비차단: 미커밋 트리의 pre-existing 토큰, §0-gap 해석 6건 타당, 리뷰어측 /tmp 경로 특이점(허용목록은 정상))

## Test Results
`node tests/gates.test.js` → exit 0, **114 ok / 0 FAIL** (M4 baseline 109 + 마커 상수 +2(awaiting-user·exporting) + zero-dep z1/z2/z3). 2런 python 픽스처(별도 명령, 스위트 미연결): run(a) picture 1 / run(b) picture 0+노트, 전 제목 일치, exit 0. 경로 제한 5종 negatives 전부 exit 3.

## Files Changed
- Create: `skills/pptxx/scripts/md2pptx.py` (런타임 전용 — hooks/tests가 import 안 함)
- Modify: `skills/pptxx/SKILL.md`(awaiting-user 옵트인 + exporting phase + 마커 2종 + Anti-Patterns 4행), `tests/gates.test.js`(마커 상수 in-place + z1–z3 append), `planning/spikes/pptx/README.md`·`readback.py`(런타임 2런 하니스)

## State After Milestone — 최종 시스템 상태
- **md2pptx.py 활성(런타임):** deck-dir CLI, M4-시대 포맷 파싱(제목/본문/이미지 지시어/```diagram/---), 도식 export(shots PNG 래스터→picture 1 / 부재→제목+노트+0), best-effort 토큰 스타일링, 경로 제한(절대·`..`·드라이브·`file://`·`https://`·비이미지 → exit 3).
- **SKILL.md 종단 플로우 완성:** `building → [visual-qa] → awaiting-user →(동의)→ exporting → done` (+거부→done, Python 부재→HTML 폴백). 옵트인 전용, 기본 생성 없음. 마커 상수 = 전 8-status(§0 enum 일치).
- **zero-dep 경계 유지:** hooks/·tests/에 python-pptx 의존성 0; md2pptx.py는 skills/ 하위 런타임 전용.
- **파이프라인 전체 완결:** 스크립트→토큰(crucible 체이닝)→텍스트 deck(M3)→이미지 소싱+패널+도식 visual-qa(M4)→옵트인 PPTX(M5). 성공 기준 1·2·3·4 전부 코드/테스트 레벨 충족.
