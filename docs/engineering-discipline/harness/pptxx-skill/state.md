# Long Run State: pptxx-skill

**Created:** 2026-07-07
**Last Updated:** 2026-07-07
**Status:** completed

**Verification Strategy:**
- **Level:** test-suite
- **Command:** `node tests/gates.test.js` (repo 루트)
- **What it validates:** 전체 hook 스크립트 구문(`node --check` 루프), hooks.json/plugin.json 유효성, pptxxGate·deck-gate stdin→stdout 회귀 시나리오(차단/통과/봉인/무장/리셋), authored SKILL.md·agents/*.md 존재·계약, 드리프트 테스트. 자동화 범위 밖(수동, crucible 선례): 라이브 deck 생성, 이미지 API 호출, Playwright 스크린샷, python-pptx 산출.

**Frozen Contract:** `planning/draft-v4.md` §0 (Gate State Contract) — 전 마일스톤이 이 문자열·표를 준수. 계획 변경 시 §0가 단일 진실 원천.

**Scope amendment (locked):** `skills/crucible/SKILL.md` 2줄 수정 승인됨 — ① 상태 재기록 시 `resume`·`deck`·`slides` 키 보존 + terminal 시 resume 소거 ② Phase E resume 조건부(forge 분기만 생략, 디자인 사용자 수락 유지).

**Escalation points (user decision required during execution):**
1. M1 스크린샷 스파이크 integration 실패 → M4 착수 전 visual-qa 하드게이트 면제 여부
2. M1 이미지 API 스파이크 integration 실패 → M4 착수 전 WebSearch-only 폴백 여부
3. M1 pptx 스파이크 integration 실패 → M5 취소/유지 여부
(env-setup 실패는 에스컬레이션 대상 아님 — M1 일시정지 후 환경 해결)

## Milestones

| ID | Name | Status | Attempts | Dependencies | Plan File | Review File |
|----|------|--------|----------|-------------|-----------|-------------|
| M1 | De-risk Spikes + 계약 문서 | completed | 1 | — | docs/engineering-discipline/plans/2026-07-07-M1-derisk-spikes.md | docs/engineering-discipline/reviews/2026-07-07-M1-derisk-spikes-review.md |
| M2 | Hook & Gate Integration | completed | 1 | — (M1과 병렬) | docs/engineering-discipline/plans/2026-07-07-M2-hook-gate-integration.md | docs/engineering-discipline/reviews/2026-07-07-M2-hook-gate-integration-review.md |
| M3 | SKILL.md Core + Chaining + Routing | completed | 1 | M1, M2 | docs/engineering-discipline/plans/2026-07-07-M3-skill-core-chaining-routing.md | docs/engineering-discipline/reviews/2026-07-07-M3-skill-core-chaining-routing-review.md |
| M4 | Image Sourcing + Critic Panels + Policy | completed | 1 | M1, M2, M3 | docs/engineering-discipline/plans/2026-07-07-M4-image-panels-policy.md | docs/engineering-discipline/reviews/2026-07-07-M4-image-panels-policy-review.md |
| M5 | Opt-in PPTX Extraction | completed | 1 | M1, M3, M4 | docs/engineering-discipline/plans/2026-07-07-M5-optin-pptx.md | docs/engineering-discipline/reviews/2026-07-07-M5-optin-pptx-review.md |
| M6 | Integration Verification | completed | 1 | M1–M5 (ALL) | — | docs/engineering-discipline/reviews/2026-07-07-M6-integration-verification.md |

Status values: pending | planning | executing | validating | completed | failed | skipped

## Execution Log

| Timestamp | Event | Details |
|-----------|-------|---------|
| 2026-07-07 | milestones-locked | 6 milestones approved by user (crucible 2줄 스코프 수정 포함, 라운드 캡 도달 공개 후 승인) |
| 2026-07-07 | long-run-start | Fresh start. M1∥M2 병렬 그룹 진입 — plan-crafting 개시 |
| 2026-07-07 | plans-crafted | M1(10태스크)·M2(11태스크) 계획 완성. M2가 §0 모호점 6건 명시 해결(plan §C-7): 도식 마커 ```diagram, 면제 마커 visualQa.exempt, user-confirmed 행 토큰, 무장-이전-쓰기 리셋, fail-closed 전 status 평가, phase:'pptxx' 한정 무장/리셋. M1이 이미지 API 엔드포인트 라이브 검증(Openverse 익명 20/min·200/day 관측) |
| 2026-07-07 | execution-start | M1∥M2 동시 실행 (Attempts=1). Worktree 격리 의도적 생략 — 파일 집합 3라운드 critic 검증으로 완전 분리(M1은 planning/spikes/** 전용), Windows worktree+도구체인 설치 실패 모드 회피. 근거 기록 |
| 2026-07-07 | M1-completed | 실행 10/10 태스크 PASS, 리뷰 PASS(blocking 0), 통합 체크 통과(스위트 73 ok, 도식 마커 계약 일치 확인). 스파이크 3종 전부 성공 — 에스컬레이션 3개 지점 전부 미발동. advisory 2건 해소(placeholder.png 삭제). 체크포인트 기록 |
| 2026-07-07 | M2-completed | 실행 11/11 태스크, 스위트 73 ok(기존 단정 무수정, 신규 34), 리뷰 PASS(blocking 0, 적대적 스팟체크 6/6 §0 합치). 병렬 그룹 종료 — M3 게이트 체크 통과(M1✓ M2✓), plan-crafting 개시 |
| 2026-07-07 | rate-limit-recover | M3 실행 1차가 Fable 5 한도로 첫 태스크 전 중단(작업 손실 0). Opus 4.8로 전환·재개, Attempts=1 유지 |
| 2026-07-07 | M3-executed | 실행 10/10 태스크 PASS, 스위트 93 ok/0 FAIL, crucible +2/-0, 라우팅 픽스처 ①-④+r0 PASS. validating 진입 |
| 2026-07-07 | M3-completed | 리뷰 PASS(blocking 0, advisory 1 무해), 통합 체크 통과(스위트 93 ok, crucible 2/0, 4픽스처 독립 재현). 체크포인트 기록. M4 게이트 통과(M1✓M2✓M3✓), plan-crafting 개시 |
| 2026-07-07 | M4-completed | 실행 10/10 태스크, 스위트 109 ok/0 FAIL, 리뷰 PASS(blocking 0, 적대적 게이트 검증: cc-by 통과·cc-by-nd/unbacked 차단), stop-gate 컨틴전시 미발동. 체크포인트 기록. 미커밋 상태 리스크는 완료 시 커밋 제안으로 처리. M5 게이트 통과, plan-crafting 개시 |
| 2026-07-07 | M5-completed | 실행 9/9 태스크, 스위트 114 ok/0 FAIL, 2런 픽스처 검증, 경로 제한 exit 3, 리뷰 PASS(blocking 0). 체크포인트 기록. 전 구현 마일스톤 완료 — M6 Integration Verification 진입 |
| 2026-07-07 | M6-completed | 통합 검증 PASS(7 seam 전부 문자열 호환, 정적 E2E 트레이스 끊긴 hop 없음). Final E2E Gate 통과(114 ok/0 FAIL, 기존 39 회귀 없음). 수동 검증 체크리스트 5항목 작성 |
| 2026-07-07 | long-run-complete | 6/6 마일스톤 완료. 총 시도 6(전부 1회 통과). Fable 5 한도로 M3 1회 중단·Opus 4.8 재개(작업 손실 0). 미커밋 — 사용자 커밋 결정 대기 |
