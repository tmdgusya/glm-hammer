# Milestone: Integration Verification

**ID:** M6
**Status:** pending
**Dependencies:** M1, M2, M3, M4, M5 (ALL)
**Risk:** Medium
**Effort:** Small

## Goal

모든 마일스톤이 하나의 완전한 시스템으로 함께 동작함을 검증한다.

## Success Criteria

- [ ] `node tests/gates.test.js` 통과 (Verification Strategy 최상위 명령)
- [ ] 전 마일스톤(M1–M5)의 성공 기준이 완전 통합 후에도 유지됨 (각 마일스톤 파일의 체크리스트 재확인)
- [ ] 기존 crucible/forge/hammer 기능 회귀 없음 (기존 테스트 단정 전부 green)
- [ ] 교차 마일스톤 인터페이스(§0 계약: pptxxGate↔deck-gate↔SKILL.md↔에이전트↔crucible 복귀 프로토콜) 실행 경로 점검 — 자동화 불가 항목(라이브 deck 생성, 이미지 API, Playwright 스크린샷, python-pptx 산출, crucible 왕복)은 수동 검증 체크리스트 문서로 작성하여 머지 후 첫 실사용 검증 계획 확정

## Files Affected

- Create/Modify: 없음 (읽기 전용 검증 — 신규 코드 없음; 수동 검증 체크리스트 문서만 harness 디렉토리에 작성 가능)

## User Value

마일스톤별이 아닌 시스템 전체가 동작한다는 신뢰.

## Abort Point

No — 최종 관문.

## Notes

- 발견된 통합 결함은 해당 마일스톤 재개봉이 아니라 이 마일스톤의 FAIL 보고 + 사용자 에스컬레이션으로 처리(long-run 규약).
