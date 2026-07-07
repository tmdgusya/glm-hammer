# Milestone: Opt-in PPTX Extraction

**ID:** M5
**Status:** pending
**Dependencies:** M1 (pptx 스파이크·픽스처 기반), M3 (SKILL.md 파이프라인), M4 (최종 슬라이드 포맷·이미지 지시어·shots/)
**Risk:** Medium
**Effort:** Medium

## Goal

`awaiting-user` 옵트인 질문과 `exporting` phase를 SKILL.md에 삽입하고, M1 스파이크를 경화한 `md2pptx.py`로 M4-시대 최종 슬라이드 포맷에서 텍스트 편집 가능 .pptx를 생성한다.

## Success Criteria

- [ ] `skills/pptxx/scripts/md2pptx.py` 존재(런타임 전용, hooks/tests 미참조). M4-시대 최종 포맷 픽스처(이미지+출처 지시어·도식 블록 포함) 2런: (a) `shots/` PNG 존재 → 도식 슬라이드에 picture-shape 정확 1 (b) PNG 부재 → 도식 슬라이드 제목+비어있지 않은 발표자 노트+picture 0 (format-spec 폴백); 두 런 모두 전 슬라이드 제목 일치 + exit 0
- [ ] 경로 제한: 이미지 참조는 deck 디렉토리(shots/ 포함) 내부만 해석 — 절대 경로·`..`·비이미지 타입 거부; 거부 부정 케이스 1건 `planning/spikes/pptx/README.md`에 기록
- [ ] SKILL.md: deck 완성 후 정확히 `status:'awaiting-user'`(§0)에서 옵트인 질문 삽입(기본 생성 없음) → 동의 시 `exporting`; `pip install python-pptx` 안내 + Python 부재 시 HTML deck으로 종료; 마커 상수 += {awaiting-user, exporting}(유일 허용 단정 변경)
- [ ] `node tests/gates.test.js` 기존 단정 무수정 통과(마커 상수 확장 제외); `grep -rE "python-pptx|import pptx|spawn(Sync)?\(['\"](python|py)" hooks/ tests/` 0건

## Files Affected

- Create: `skills/pptxx/scripts/md2pptx.py`
- Modify: `skills/pptxx/SKILL.md`, `tests/gates.test.js`

## User Value

성공 기준 4 완성 — deck 완료 → 추출 동의 → PowerPoint에서 텍스트 편집 가능한 .pptx.

## Abort Point

Yes — HTML deck 제품은 M4에서 완결; PPTX는 명시적 옵트인.

## Notes

- 착수 전 게이트: M1 pptx 스파이크가 integration 실패였다면 이 마일스톤의 취소/유지는 사용자 결정(state.md 에스컬레이션 지점 3).
- 토큰→pptx 스타일 매핑(폰트·hex·간격) 열화는 라이브 수동 검증 범위 — M_final 체크리스트에 포함.
