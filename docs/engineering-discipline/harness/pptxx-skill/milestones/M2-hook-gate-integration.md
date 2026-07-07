# Milestone: Hook & Gate Integration (§0 전체 계약)

**ID:** M2
**Status:** pending
**Dependencies:** None (M1과 병렬 — 파일 완전 분리, M1은 테스트 스위트 미실행)
**Risk:** High
**Effort:** Large

## Goal

`planning/draft-v4.md` §0 동결 계약 전체 — pptxxGate 분기 ①–④(status 스코프·hybrid-done·매니페스트/라이선스 검증), deck-gate.js(봉인·무장 원웨이 래칫·파일→라운드 리셋 매핑·속성 스코프 정적 검사), planKey decks/ 확장 — 를 스킬이 존재하기 전에 fabricated receipt 회귀 테스트와 함께 구현한다. route-intent.js는 무접촉(M3 소유).

## Success Criteria

- [ ] `node tests/gates.test.js` 통과 — §0 기반 신규 시나리오 전부: ⓐ `visual-qa`+봉인 없음→block ⓑ 완비→통과 ⓒ `visualQa.required=true`+수령증 없음→block ⓓ false→불요구 ⓔ `imagePanel.required=1`+누락/REJECT→block, APPROVE+매니페스트 일치→통과 ⓕ 0→불요구 + required=0·attributions.md 미존재·2파일 봉인→통과 ⓖ done 4분지(deck 없음→침묵/deck+봉인 green→통과/deck+봉인 broken→block/플래그+수령증 부재→block) ⓗ `awaiting-user`→통과(가드-순서 회귀 라벨) ⓘ slides.md Write→봉인+도식 grep 무장, index.html Write(로컬 이미지 참조)→`imagePanel.required=1` 래칫 ⓙ deck PNG(shots/ 포함)→봉인·검사 제외 ⓚ 무장 후 index.html 재편집→`visualQa.round`만 증가(imagePanel.round 불변 단정), attributions.md 편집→`imagePanel.round`만 증가 ⓛ dispatch.jsonl 시드: backed→통과, unbacked→block ⓜ 매니페스트 sha256 불일치/비허용 라이선스(무 user-confirmed)/서브디렉토리 이미지 케이스 단정 ⓝ `<script`·`src="https://"`→봉인 거부→block; 텍스트/`<a href>` 출처 URL→봉인 OK ⓞ 초기 status 정차→무차단 ⓟ 무장+`state.deck` 부재→fail-closed block. 수령증은 기존 (h) JUDGE_BODY 방식 위조
- [ ] planKey 단위 단정: 절대(백슬래시)·상대(포워드) 경로 동일 정규화 키, decks/의 `.md`·`.html`만 매칭
- [ ] 기존 테스트 단정 무수정 통과 (crucible/forge/hammer 회귀 없음)
- [ ] `hooks/hooks.json` 파싱 통과, deck-gate 항목 `${ZCODE_PLUGIN_ROOT}` 사용(`CLAUDE_PLUGIN_ROOT` 0건), `git diff` 기준 `route-intent.js` 무변경

## Files Affected

- Create: `hooks/scripts/deck-gate.js`
- Modify: `hooks/scripts/stop-gate.js`, `hooks/scripts/lib.js`, `hooks/hooks.json`, `tests/gates.test.js`

## User Value

기존 crucible/forge/hammer 사용자에 대한 회귀 안전 + pptxx 강제 골격의 실증된 무회귀 착지.

## Abort Point

Yes — 진짜 휴면: `phase:'pptxx'` 설정자가 없고 route-intent 무접촉이므로 사용자 노출 변화 0. 테스트 green.

## Notes

- §0(draft-v4.md)가 유일한 계약 원천 — 상태 필드·tail·매핑·status 스코프를 §0 표에서 그대로 복사할 것.
- ⓖ 근거에 stopBlocks 캡(6)=의도된 하우스 탈출구 1줄 기록.
- M1 스크린샷 스파이크 실패 시 분기②는 조건부 휴면으로 무해(무장 grep이 M3-시대 문법에선 발화하지 않음).
