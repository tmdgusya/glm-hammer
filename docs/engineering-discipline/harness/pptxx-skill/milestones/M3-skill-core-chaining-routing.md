# Milestone: pptxx SKILL.md Core Pipeline + Chaining + Routing

**ID:** M3
**Status:** pending
**Dependencies:** M1 (계약 문서 2종 — format-spec.md·주소화 컨벤션; 스파이크 실행 증명과 무관), M2 (§0 구현체)
**Risk:** Medium
**Effort:** Large (~10-12태스크; route-intent E2E 픽스처 하니스 신축 포함)

## Goal

heavy-skill 형식 `skills/pptxx/SKILL.md`(스크립트 확보 → crucible 체이닝(복귀 프로토콜 포함) → 토큰 적용 **텍스트 deck** 생성)를 §0와 기계 검증되는 일치로 작성하고, route-intent deck 라우팅과 crucible SKILL.md 2줄 수정(락 승인됨)을 함께 착지한다.

## Success Criteria

- [ ] `skills/pptxx/SKILL.md` 존재: frontmatter `name`+`description`(한/영 트리거), Core Principle / Hard Gates(hook-enforced, "대기 시 `awaiting-user`·포기 시 `done` — 방치 금지" 포함) / State Protocol(§0 스키마 fenced JSON 그대로) / Process(`⟨state:⟩`) / Anti-Patterns; `spikes/screenshot/README.md`·`spikes/pptx/format-spec.md` 경로 인용(grep 단정)
- [ ] 기계화 드리프트 테스트: fenced JSON `"status"` 라인 → §0 전 집합 동등성 + 마커 시대 상수 `{scripting, chaining, imaging, building, done}` 존재 단정 + `evidence/deck/` tail 전 매칭 ⊆ §0 4종 집합
- [ ] 포맷: format-spec.md 합치 정의. M3-시대 규칙: 도식 블록 예약(플레인 렌더; deck-gate 도식 grep이 참조하는 마커를 M3-시대 문법에서 제외 — M4가 활성화), 이미지 지시어 파싱-후-유예(라벨 플레이스홀더), 터미널 플로우 `building → done` 직행
- [ ] deck HTML 규칙: M1 주소화 컨벤션 준수 + 자기완결 + `<script>` 금지 + 외부 리소스 참조 금지(§0 정적 검사와 합치)
- [ ] 체이닝·복귀: §0 프로토콜 전문 반영 — `state.resume` 설정 후 crucible 호출; 완료 신호 = `state.design` + `validateTokens` 통과 + `sealMatches==='ok'` + **crucible 패널 수령증 APPROVE**; design tokens.json 읽기 전용; `skills/crucible/SKILL.md` 2줄 수정(보존 규칙 + Phase E 조건부 — forge 분기만 생략, 디자인 사용자 수락 유지); 복귀 직후 merge 기록(`phase/status:'chaining'/resume:null/deck/slides/design`); grep 테스트가 crucible 2줄 + pptxx resume 규칙 단정
- [ ] 라우팅: `workRequest`에 동사만 추가(`뽑|생성|추출|export`), deck 명사 정규식(`발표|슬라이드|프레젠테이션|deck|presentation|pptx`)은 deck 분기 전용, 위치는 executeIntent 뒤·designIntent 앞; 신규 E2E 픽스처 하니스(spawn+stdin+tmp cwd — 명명 태스크): ① "이 스크립트로 발표 슬라이드 뽑아줘"→pptxx ② "브랜드 디자인 토큰 만들어줘"→crucible ③ "슬라이드 디자인해줘"→pptxx ④ "팀에게 결과를 발표했어요"→무발화; 출력은 단일 키 `{additionalContext}`
- [ ] 스위트 통과: (j)에 SKILL.md 추가, (b)에 `.claude-plugin/plugin.json` 추가, 양 plugin.json 키워드 `"pptxx","deck","presentation","슬라이드"` 멤버십 단정

## Files Affected

- Create: `skills/pptxx/SKILL.md`
- Modify: `hooks/scripts/route-intent.js`, `skills/crucible/SKILL.md`(2줄), `tests/gates.test.js`, `.zcode-plugin/plugin.json`, `.claude-plugin/plugin.json`

## User Value

스킬 발견·호출 가능 + 텍스트 deck 코어 플로우 완성 — 주제/스크립트 입력으로 실제 발표 가능한 토큰 적용 HTML deck.

## Abort Point

Yes — 도식·이미지·pptx 없이 독립적으로 유용; 라우터와 스킬이 같은 마일스톤에 착지(유령 스킬 구간 없음); M3-시대 도식 예약 규칙으로 게이트 데드락 없음.

## Notes

- 분할선(사전 승인): 계획 12태스크 초과 시 M3a(SKILL.md+체이닝+crucible 수정+드리프트 테스트) / M3b(라우팅+픽스처 하니스+plugin.json) — M4는 M3a에만 의존.
- visual-qa 면제 에스컬레이션 데드라인은 M3가 아닌 **M4 착수 전** — M3의 도식 규칙은 면제 여부와 무관하게 동일.
