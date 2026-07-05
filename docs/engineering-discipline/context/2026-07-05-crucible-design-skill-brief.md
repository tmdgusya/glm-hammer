# Context Brief: `crucible` — 스토리라인 기반 디자인 토큰 스킬

## Goal

유저의 스토리라인/레퍼런스를 입력받아, 멀티 에이전트 레퍼런스 탐사 → hook 강제 검증을 거친 W3C 디자인 토큰 → 깐깐한 디자이너 패널 승인까지 완주하는 새 glm-hammer 스킬을 만든다. 산출물(디자인 스펙)은 forge의 입력이 된다.

## 이름: **crucible** (도가니)

대장간 서사에 맞춘 이름. 광석(레퍼런스)을 캐 와서 도가니에 녹여 합금(토큰)을 만들고, 감정(assay)을 통과한 합금만 forge로 넘어가 hammer로 두들겨진다.

**서사 체인**: 채굴(prospect) → 용해(smelt) → 감정(assay) → 단조(forge) → 망치질(hammer)

## Scope

### In scope

- **`skills/crucible/SKILL.md`** — 4단계 워크플로우 오케스트레이션
- **에이전트 프로필 7개** (`agents/*.md`, 기존 바이너리 체크리스트 + evidence receipt 포맷 준수):
  - `vein-reader` — 스토리라인을 디자인 방향 키워드(무드, 시대, 질감, 톤)로 번역하는 해석 에이전트 (하이브리드 1단계 선두)
  - `color-prospector` / `type-prospector` / `layout-prospector` / `motion-prospector` — vein-reader의 키워드를 받아 각 차원에서 웹 레퍼런스를 병렬 채굴 (WebSearch/WebFetch)
  - `fidelity-critic` — 생성된 토큰이 레퍼런스·정한 방향과 유사한지 심사 (2단계 게이트의 판정자)
  - `harmony-critic` + `rigor-critic` — 깐깐한 디자이너 2인 패널. harmony는 서사·미학 조화를, rigor는 시스템 일관성·접근성·구현 가능성을 공격 (3단계, 만장일치 필수, REJECT 시 재용해 루프)
- **새 hook 스크립트 `token-gate.js`** (결정적 검사):
  - tokens.json 파싱 / W3C Design Tokens 스키마(`$value`/`$type`) 유효성
  - 필수 토큰 그룹(color · typography · spacing · radius) 존재
  - 텍스트/배경 쌍 WCAG 대비율 계산
  - 디자인 스펙 content seal (수정 시 승인 리셋)
- **`stop-gate.js` 확장** — `phase: "crucible"` 분기: fidelity 영수증, 2인 패널 영수증(substance + dispatch-backing), 토큰 파일 존재를 교차 검증. 실패 시 턴 차단 → 재파견 루프
- **`route-intent.js` 확장** — 디자인 요청 패턴 감지 → crucible 라우팅
- **산출물 구조**: `docs/glm-hammer/design/YYYY-MM-DD-<name>/`
  - `references.md` — 채굴 결과 + 출처
  - `tokens.json` — W3C Design Tokens
  - `design-spec.md` — forge가 소비할 적용 가이드

### Out of scope

- hammer/forge 자체 수정 (design-spec은 forge가 일반 입력으로 읽음)
- 이미지 생성
- 실제 UI 구현 (hammer의 몫)

## Technical Context (정찰 결과)

- 게이트 3중 방어가 `hooks/scripts/lib.js`에 재사용 가능하게 존재: content seal(sha256), dispatch ledger(`dispatch.jsonl`), receipt substance(≥300바이트 + `CHECKS:` + `VERDICT:`). crucible 게이트는 전부 이 위에 얹는다.
- 재시도 루프 패턴은 forge critic 패널과 동일: 산출물 수정 시 승인 리셋(plan-gate 패턴) → stop-gate가 미충족 시 턴 차단. crucible에선 tokens.json/design-spec 수정 시 fidelity·패널 승인 리셋.
- 상태 머신: `phase: "crucible"`, status `prospecting → smelting → assay → critique → awaiting-user → approved`
- 에이전트 파견은 Agent 도구 + `agents/<name>.md` 프로필 인라인, 영수증 경로를 프롬프트에 명시(dispatch-log가 자동 기록)

## Constraints

- hook은 결정적 스크립트 — 미적 판단은 전부 에이전트 영수증으로, hook은 실재·substance·dispatch-backing·스키마·대비율만 검증
- 에이전트는 read-only + evidence receipt 쓰기만 허용 (기존 규약)
- 스카우트(prospector)는 웹 접근 필요 (WebSearch/WebFetch) — 유저 제공 URL/이미지도 입력으로 수용
- 토큰 포맷은 W3C Design Tokens (tokens.json) 고정

## Success Criteria

1. 스토리라인 한 문단으로 crucible 호출 → 스카우트 파견 · 토큰 생성 · 패널 승인이 hook 강제 하에 완주
2. 토큰 스키마 위반 · 필수 그룹 누락 · 대비율 미달 시 token-gate가 결정적으로 차단
3. fidelity/패널 영수증 없이(또는 위조로) 턴 종료 시도 시 stop-gate가 차단
4. 승인된 design-spec을 forge에 넘기면 추가 변환 없이 계획 수립 가능

## Open Questions (비차단)

- 스카우트가 수집한 레퍼런스 스크린샷 저장 여부 (기본: URL + 텍스트 묘사만)
- motion 토큰(duration/easing)을 필수 그룹에 포함할지 (기본: 선택 그룹)

## Complexity Assessment

| Signal | 점수 | 근거 |
|---|---|---|
| Scope breadth | 2 | 스킬+에이전트+hooks 세 축이지만 하나의 기능 |
| File impact | 3 | 신규 9개 + 수정 3개 ≈ 12파일 |
| Interface boundaries | 3 | 새 phase, 새 evidence 경로, design-spec→forge 신규 계약 |
| Dependency depth | 2 | 선형 (프로필 → hook → 스킬 본문 → 라우팅) |
| Risk surface | 2 | 내부 통합만 (hook↔state↔skill) |

**Score:** 12
**Verdict:** Complex (10-15)
**Rationale:** 파일 수와 신규 계약(phase/evidence/design-spec)이 지배 요인이나, 대부분 독립적인 마크다운 프로필 저작이라 단일 계획 사이클로 감당 가능.

## Suggested Next Step

**forge** (사용자 확정, 2026-07-05) — 규칙상 Complex → milestone-planning이나, 작업 성격상 이 저장소 자체의 강한 계획 스킬인 forge 한 사이클(3-critic 패널 검증 → hammer 실행)로 진행하기로 결정.
