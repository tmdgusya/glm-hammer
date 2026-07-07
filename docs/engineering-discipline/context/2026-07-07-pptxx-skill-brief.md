# Context Brief: pptxx — 스크립트 기반 HTML deck → PPTX 프레젠테이션 스킬

> Approved: 2026-07-07. clarification 스킬 산출물 — plan-crafting/milestone-planning 입력용.

## Goal

발표 스크립트(사용자 제공 또는 신규 작성)를 기반으로, crucible 디자인 토큰을 입힌 간결한 HTML 슬라이드 deck을 만들고, 사용자가 원할 때만 python-pptx로 편집 가능한 PPTX를 추출하는 hook-완전통합형 glm-hammer 스킬을 추가한다.

## Scope

### In scope

- `skills/pptxx/SKILL.md` — 신규 스킬 (디렉토리 컨벤션 자동 인식, 매니페스트 수정 불필요)
- **파이프라인**:
  1. 스크립트 확보/작성 → `---` 구분 슬라이드 `.md`
  2. 토큰 확보 (crucible 재사용)
  3. 슬라이드별 이미지 소싱 + critic 패널 토론
  4. HTML deck 생성
  5. 도식 슬라이드 visual-qa
  6. 사용자에게 PPTX 추출 여부 질문 → 옵트인 시 python-pptx 네이티브 생성
- **토큰 단계**: `state.design`/tokens.json 부재 시 crucible을 선행 호출 (forge→hammer 체이닝 패턴 준용, `skills/crucible/SKILL.md:104` 선례). pptxx는 `docs/glm-hammer/design/<dir>/tokens.json`을 **읽기만** 하고 자기 산출물은 `docs/glm-hammer/decks/YYYY-MM-DD-<name>/`에 쓴다 — token-gate 충돌 회피.
- **이미지 소싱**: Openverse/Wikimedia Commons API (키 불필요, 라이선스·저작자·출처 메타데이터 반환) + ZCode WebSearch 도구. 출처는 슬라이드 하단에 자동 소형 표기. 동일 에셋 재사용 허용. insane-search(`fivetaku/insane-search`)는 차단된 공개 페이지 폴백 fetcher로만 선택적 설치 — 이미지 검색 도구가 아님(확정).
- **신규 critic 에이전트** (기존 binary-checklist + evidence receipt 패턴 준수):
  - 이미지 적합성 패널 — 슬라이드-이미지 매칭·출처 표기 검증, 만장일치 APPROVE
  - visual-qa critic — 스크린샷을 읽어 오버플로우·대비·토큰 준수·도식 가독성 판정
- **visual-qa 인프라**: 헤드리스 브라우저(Playwright)로 슬라이드별 스크린샷 → 비전 critic 판정. 도식 포함 슬라이드는 필수.
- **hook 완전 통합**:
  - `hooks/scripts/stop-gate.js:292` 부근에 `pptxxGate(cwd, state)` 분기 추가 (`receiptProblems` 헬퍼 재사용)
  - `hooks/scripts/route-intent.js` 우선순위 사다리에 발표/슬라이드/deck/pptx 인텐트 추가
  - `hooks/scripts/lib.js` `planKey()` 정규식에 `decks/` 경로 확장
  - deck 산출물 봉인용 PostToolUse 스크립트 추가 + `hooks/hooks.json` 배선
  - `.zcode-plugin/plugin.json` + `.claude-plugin/plugin.json` keywords 갱신

### Out of scope

- HTML→PPTX 완전 자동 변환 (신뢰할 오픈소스 부재; python-pptx가 슬라이드 .md + 토큰에서 직접 생성)
- PPTX 기본 생성 — 옵트인 전용 ("PPTX까지 만들면 너무 느려서")
- 유료/키 필요 이미지 API
- crucible 스킬 자체 수정

## Technical Context

- 스킬 등록: `skills/<name>/SKILL.md` 자동 인식. frontmatter는 `name` + `description`(한/영 트리거 문구 내장, 별도 triggers 필드 없음). 본문 구조: Core Principle / Hard Gates (hook-enforced) / State Protocol / Process (phase별 `⟨state: …⟩` 체크포인트) / Anti-Patterns 테이블 (~120–140줄).
- critic 패널 패턴: `agents/*.md` 읽기 전용 subagent(`tools: ["Read","Grep","Glob","Bash"]`), 병렬 디스패치, 정보 격리(아티팩트 경로 + 원 요청 verbatim + evidence 출력 경로만 전달), 고정 binary checklist, `EVIDENCE_RECORDED: <path>` 수령증, 만장일치 APPROVE, REJECT 시 전체 패널 재실행(≤3라운드 후 사용자 에스컬레이션).
- `pptxxGate` 계약: `state.phase === 'pptxx'`에서 호출, 차단 사유 string 또는 null 반환. `awaiting-user` status / context-pressure / BLOCK_CAP(6) 탈출구는 stop-gate 공통 가드가 처리. evidence 수령증은 `receiptProblems(cwd, entries)`로 검사 (`kind: 'judge'` = ≥300바이트 + `CHECKS:` 블록 + verdict 정규식).
- 스킬 체이닝: 코드가 아닌 SKILL.md 지시문 기반 — 종료 스킬이 terminal status 설정 후 다음 스킬을 즉시 호출. 공유 연결 필드는 `state.design`, `state.plan`.
- crucible 완료 신호: `state.design` 존재 + `tokens.json` 유효(`token-lib.js` `validateTokens`) + 봉인 일치(`sealMatches`) — `status`만 믿지 않음.
- `token-gate.js:20`은 `docs/glm-hammer/design/<dir>/(tokens.json|design-spec.md|references.md)`만 매칭 → pptxx가 `decks/`에 쓰면 충돌 없음.
- visual-qa·PPTX·HTML deck·이미지 검색 관련 기존 코드 전무 — 전부 그린필드.
- 참고: 랜딩 페이지(`index.html`)의 자기완결 HTML + 인라인 SVG + crucible 토큰 스타일이 deck HTML의 하우스 스타일 준거.

## Constraints

- insane-search는 이미지 검색 기능·출처/라이선스 메타데이터가 없음 (리서치 확정). TLS 위장 기반 공개 페이지 fetcher — 폴백 역할만.
- 이미지는 라이선스·출처 메타데이터가 있는 소스(Openverse/Wikimedia) 우선. 웹 이미지 사용 시 출처 자동 표기 필수.
- PPTX 생성은 Python + python-pptx, 스크린샷은 Playwright 의존 — 최초 사용 시 설치 안내 필요.
- 슬라이드는 스크립트 기반으로 간결·심플하게 — 발표 용이성이 최우선.
- ZCode 환경 기준: Claude 내장 도구를 가정하지 말고 WebSearch 도구를 명시적으로 사용.

## Success Criteria

1. 발표 주제/스크립트를 주면 `---` 구분 슬라이드 `.md` + 토큰 적용 HTML deck이 `docs/glm-hammer/decks/YYYY-MM-DD-<name>/`에 생성된다.
2. 웹에서 가져온 이미지에는 출처가 자동 소형 표기되고, 이미지 적합성 critic 패널이 만장일치 승인해야 통과한다.
3. 도식 슬라이드는 스크린샷 기반 visual-qa APPROVE 없이 완료 불가 (stop-gate 강제).
4. deck 완성 후 PPTX 추출 여부를 묻고, 옵트인 시 PowerPoint에서 텍스트 편집 가능한 .pptx가 생성된다.
5. 기존 crucible/forge/hammer 게이트가 회귀 없이 동작한다.

## Open Questions (non-blocking)

- deck 디렉토리명 `docs/glm-hammer/decks/` 가정 — 계획 단계에서 변경 가능.
- visual-qa critic을 pptxx 전용으로 둘지, 향후 랜딩페이지 등에도 쓸 범용 에이전트로 둘지.

## Complexity Assessment

| Signal | 점수 | 근거 |
|--------|-----|------|
| Scope breadth | 3 | 스킬 + 에이전트 3~4개 + hook 4파일 + visual-qa 인프라 + 이미지 소싱 + PPTX 익스포터 |
| File impact | 3 | 10개 이상, skills/·agents/·hooks/scripts/ 3개 디렉토리 이상 |
| Interface boundaries | 3 | 신규 gate 계약, planKey 봉인 확장, 신규 아티팩트 계약 정의 |
| Dependency depth | 2 | 토큰→스크립트→이미지→deck→QA→PPTX 선형 축 + 이미지/도식 병렬 분기 |
| Risk surface | 3 | 외부 API(Openverse/Wikimedia)·Playwright·python-pptx·기존 gate 회귀 리스크 |

**Score: 14** / **Verdict: Complex (10–15)**

**Rationale:** hook 완전 통합이 기존 강제 체계(stop-gate/seal/ledger) 4개 파일을 건드리고, visual-qa·이미지 소싱·PPTX 익스포터가 전부 그린필드 신규 인터페이스라 단일 계획 사이클로는 무리.

## Suggested Next Step

`milestone-planning`으로 진행 — 마일스톤 분해 후 실행. 예상 축:

1. hook/gate 골격 + SKILL.md
2. 스크립트·토큰·deck 생성 코어
3. 이미지 소싱 + critic 패널
4. visual-qa 인프라
5. PPTX 익스포터
