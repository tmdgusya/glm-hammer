# Problem Brief: pptxx — 스크립트 기반 HTML deck → PPTX 프레젠테이션 스킬

> milestone-planning 입력 아티팩트. 원본 Context Brief: `docs/engineering-discipline/context/2026-07-07-pptxx-skill-brief.md` (2026-07-07 승인).

## Goal

발표 스크립트(사용자 제공 또는 신규 작성)를 기반으로, crucible 디자인 토큰을 입힌 간결한 HTML 슬라이드 deck을 만들고, 사용자가 원할 때만 python-pptx로 편집 가능한 PPTX를 추출하는 hook-완전통합형 glm-hammer 스킬 `pptxx`를 추가한다.

## Scope

**In:**
- `skills/pptxx/SKILL.md` 신규 스킬 (자동 인식)
- 파이프라인: 스크립트 확보/작성(`---` 구분 슬라이드 .md) → 토큰 확보(crucible 재사용) → 슬라이드별 이미지 소싱 + critic 패널 → HTML deck 생성 → 도식 슬라이드 visual-qa → PPTX 추출 여부 질문 → 옵트인 시 python-pptx 네이티브 생성
- 토큰: `state.design`/tokens.json 부재 시 crucible 선행 호출 (forge→hammer 체이닝 패턴 준용). pptxx는 design tokens.json을 읽기만, 자기 산출물은 `docs/glm-hammer/decks/YYYY-MM-DD-<name>/`
- 이미지: Openverse/Wikimedia Commons API(키 불필요, 라이선스·출처 메타데이터) + ZCode WebSearch 도구. 출처 자동 소형 표기. insane-search는 차단 페이지 폴백 fetcher로만 선택적 설치
- 신규 critic 에이전트: 이미지 적합성 패널, visual-qa critic (스크린샷 판독)
- visual-qa 인프라: 헤드리스 브라우저(Playwright) 슬라이드별 스크린샷 → 비전 critic 판정. 도식 슬라이드 필수
- hook 완전 통합: stop-gate.js `pptxxGate`, route-intent.js deck 인텐트, lib.js `planKey()` decks/ 확장, deck 봉인 PostToolUse 스크립트(deck-gate.js), hooks.json 배선, plugin.json(양쪽) keywords
- tests/gates.test.js 확장 (신규 게이트 회귀 테스트)

**Out:**
- HTML→PPTX 완전 자동 변환 (python-pptx가 슬라이드 .md + 토큰에서 직접 생성)
- PPTX 기본 생성 (옵트인 전용 — 느려서)
- 유료/키 필요 이미지 API, crucible 스킬 자체 수정

## Technical Context

glm-hammer는 zero-dependency ZCode/Claude Code 플러그인. 스킬은 `skills/<name>/SKILL.md` 자동 인식, 서브에이전트는 `agents/*.md`, 강제력은 `hooks/hooks.json` + `hooks/scripts/*.js`(CommonJS, stdin JSON → stdout JSON)에서 나온다. 상태는 `.glm-hammer/state.json`, 봉인은 `plan-seal.json`(sha256), 증거는 `.glm-hammer/evidence/`, 디스패치 원장은 `dispatch.jsonl`.

## Exploration Digest

### Lens A — 아키텍처·인터페이스 (clarification recon)

- SKILL.md 컨벤션: frontmatter `name`+`description`(한/영 트리거 내장, triggers 필드 없음). 무거운 스킬(crucible/forge/hammer, ~120–140줄): Core Principle / Hard Gates (hook-enforced) / State Protocol / Process(phase별 `⟨state: …⟩`) / Anti-Patterns. 경량(blueprint, ~30줄): When To Use / Process / Escalation만.
- critic 패널 패턴: `agents/*.md` 읽기 전용(`tools: ["Read","Grep","Glob","Bash"]`), 병렬 디스패치, 정보 격리(아티팩트 경로 + 원 요청 verbatim + evidence 출력 경로만), 고정 binary checklist(`**C1:**`… YES/NO/N-A), 만장일치 APPROVE, REJECT 시 전체 패널 재실행 ≤3라운드 후 사용자 에스컬레이션. 러ntime에 named agent 없으면 agents/<name>.md 본문을 general-purpose에 주입하는 폴백 지시 존재.
- agents/*.md 정확 계약: frontmatter `name`/`description`/`tools` 순. 본문: 역할 문단 → `## Method` → `## Verdict — Binary Checklist` → 최종 메시지 포맷 fenced block(`CHECKS:` / `VERDICT: APPROVE|REJECT`(critic) 또는 `PASS|FAIL`(reviewer) / `FINDINGS:` `[REJECT-level]`·`[advisory]`) → "VERDICT is mechanical" 규칙 → `## Evidence Receipt (mandatory)` → `EVIDENCE_RECORDED: <path>`.
- visual-qa·PPTX·HTML deck·이미지 검색 기존 코드 전무 — 전부 그린필드. 랜딩 페이지(index.html)의 자기완결 HTML + 인라인 SVG + crucible 토큰이 deck HTML 하우스 스타일 준거.

### Lens B — 의존성·체이닝·hook 강제 체계 (clarification recon)

- 스킬 체이닝은 코드가 아닌 SKILL.md 지시문: 종료 스킬이 terminal status 설정 후 다음 스킬을 즉시 호출. 선례: crucible→forge (`skills/crucible/SKILL.md:100-106` Phase E — Yes→`approved`+forge 호출 / 거절→`done` / 수정→Phase C·D 재실행), forge→hammer (`skills/forge/SKILL.md:125`). 공유 연결 필드 `state.design`, `state.plan`.
- stop-gate 디스패치: `hooks/scripts/stop-gate.js:290-292` phase switch (`forgeGate`/`crucibleGate`/`hammerGate`). `pptxxGate(cwd, state)` 계약: `state.phase === 'pptxx'` 분기 추가, 차단 사유 string 또는 null 반환. 공통 가드(`:282-287`): phase 없음/idle, `awaiting-user`, context pressure, `stopBlocks >= 6`이면 통과. 주의: forge/crucible은 `status !== 'done'`일 때만 게이트, hammer는 done도 재검증 — pptxx는 어느 모델인지 결정 필요.
- 수령증 검사: `receiptProblems(cwd, entries)` (`stop-gate.js:46-62`) 재사용. `kind:'judge'` = ≥300바이트 + `CHECKS:` 블록 + verdict 정규식(APPROVE/PASS `:42-43`), `kind:'raw'` = ≥20바이트. dispatch 원장 비어 있으면 fail-open.
- 봉인: `lib.js:76` `planKey()` 정규식이 `plans/*.md`·`design/<dir>/*.{md,json}`만 정규화 — decks/ alternation 추가 필요. 봉인 기록은 PostToolUse 경로 필터가 담당: `plan-gate.js:19`, `token-gate.js:20` 어느 쪽도 decks/ 미매칭 → 신규 deck-gate.js(PostToolUse, `writeSeal` 호출) 필요, pptxxGate가 `sealMatches`로 검증.
- token-gate 충돌: `docs/glm-hammer/design/<dir>/tokens.json`만 매칭하므로 pptxx가 decks/에 쓰면 무해. design tokens.json을 pptxx가 재작성하면 승인 리셋 트립 — 읽기 전용 준수.
- crucible 완료 신호: `state.design` 존재 + `<design>/tokens.json`이 `validateTokens` 통과 + `sealMatches === 'ok'` (status만 믿지 않기).
- route-intent.js: 활성 런 단락(`:16-54`, 재라우팅 안 함) → `workRequest` 게이트(`:57`) → 우선순위 사다리(`:77-92`): executeIntent+plans존재→hammer / designIntent(`:62`, "디자인|design tokens|…")→crucible / strongMarker→forge / catch-all. 출력은 `emitContext` → `{additionalContext}` 단일 키(스키마 엄격 — 여분 키는 검증 실패, `lib.js:192-197`). deck 인텐트 분기 추가 위치와 designIntent와의 순서/중복 설계 필요.
- hooks.json 형식: `{type:"process", command:"node", args:["${ZCODE_PLUGIN_ROOT}/hooks/scripts/<f>.js"], timeoutMs, statusMessage:"(glm-hammer) …"}`. **루트 변수는 `${ZCODE_PLUGIN_ROOT}`** (CLAUDE_PLUGIN_ROOT 아님). PostToolUse `Write|Edit|MultiEdit` 그룹에 스크립트 4개 체인 — deck-gate.js는 이 배열 추가 또는 신규 matcher 그룹.
- lib.js 헬퍼: `readStdin`(6) `readState`(23) `writeState`(32, atomic) `evidencePath`(19) `evidenceOk`(48) `emit`(188) `emitContext`(195) `sha256File`(68) `planKey`(76) `writeSeal`(94) `sealMatches`(110) `readDispatchedTails`(140) 등. 신규 스크립트는 `require('./lib')`.
- 증거 경로 컨벤션: judge 수령증 `<agent-name>.md`, 라운드형 `round-<N>/`, 태스크형 `task-<i>/`. deck용 제안: `evidence/deck/panel/round-<N>/<critic>.md`(judge), 빌드/스크린샷 수령증은 raw.
- state.json 실례(완료 런): `{phase:"hammer", status:"done", plan:…, design:…, tasks:{…}, reviews:{…}, stopBlocks:3}` — 체이닝 시 design 키가 계속 실려 다님.

### Lens C — 검증 인프라

- **package.json 없음, CI 없음, lint 설정 없음.** 유일한 검증: `node tests/gates.test.js` (198줄, zero-dep 수제 스위트, 수동 실행, 실패 시 exit 1).
- 스위트 커버: (a) `hooks/scripts/*.js` 전체 `node --check` 루프 — **신규 스크립트 자동 커버**; (b) hooks.json/plugin.json JSON 파싱; (c–f) token-lib 검증 픽스처; (h) stop-gate.js를 stdin `{cwd}` 파이프로 E2E 호출해 stdout `"block"` 유무 단정(임시 디렉토리); (i) token-gate.js stdin `{cwd, tool_input:{file_path}}` → state.json 변이 단정; (j) authored 파일 존재 체크.
- **pptxx 테스트 확장 패턴이 그대로 존재**: (j) 목록에 SKILL.md/agents 추가, (h)/(i) 미러로 deck-gate.js·pptxxGate 시나리오 추가.
- hook 스크립트는 전부 CLI 단독 실행 가능(stdin JSON → stdout JSON, 항상 exit 0, 차단은 stdout `{decision:'block', reason}` — `stop-gate.js:306`). 인프라 오류는 fail-open.
- `validateTokens`(token-lib.js:91-159) 요건: 필수 그룹 color/typography/spacing/radius, `color.text|surface|accent` 서브그룹, `color.text.default`·`color.surface.default`, 토큰별 `$type` 필수, hex/dimension 형식, typography.size≥3·spacing≥4, WCAG 대비(text≥4.5:1, accent≥3.0:1). deck이 소비할 tokens.json의 보증 범위.
- 선례(crucible 계획 `docs/glm-hammer/plans/2026-07-05-crucible-design-skill.md:22-27`): Verification Strategy 섹션 명시, 라이브 모델 실행이 필요한 부분은 "머지 후 첫 실사용에서 수동 검증"으로 자동화 범위 밖 선언. pptxx도 동일 접근(라이브 deck 생성·이미지 검색·스크린샷은 수동 검증 범위).

### Lens D — 컨벤션·이력

- 커밋 이력: crucible 기능이 Tasks 1–11 계획 주도로 구축, QA 발견 → 수정 + 부정 테스트 추가 루프(`3c7c6f2`) 선례.
- docs 레이아웃: `docs/glm-hammer/plans/YYYY-MM-DD-<slug>.md`(flat), `docs/glm-hammer/design/YYYY-MM-DD-<name>/{design-spec.md,references.md,tokens.json}`. decks도 `docs/glm-hammer/decks/YYYY-MM-DD-<name>/` 대칭 구조 제안.
- Python은 저장소 필수 의존성이 아님(edit-diagnostics.js의 선택적 외부 진단만). python-pptx·Playwright는 pptxx 스킬이 최초 사용 시 설치 안내하는 **런타임 의존성**으로 남고, 저장소 테스트 스위트는 zero-dep 유지해야 함.
- 외부 리서치(확정): insane-search는 이미지 검색 아님 — TLS 위장 공개 페이지 fetcher, 폴백 전용. Openverse/Wikimedia Commons API는 키 없이 이미지 검색 + 라이선스·저작자·출처 반환.

## Constraints

- 저장소 zero-dependency 원칙 유지: hook 스크립트·테스트에 npm/pip 의존성 추가 금지. Python(python-pptx)·Playwright는 스킬 런타임에서 사용자 환경에 설치 안내.
- hook stdout은 스키마 엄격(`additionalContext` 또는 `{decision:'block',reason}`만). hooks.json 변수는 `${ZCODE_PLUGIN_ROOT}`.
- 이미지는 라이선스·출처 메타데이터 있는 소스 우선, 출처 자동 표기 필수. ZCode WebSearch 도구를 명시적으로 사용(Claude 내장 가정 금지).
- PPTX는 옵트인 전용. 슬라이드는 스크립트 기반 간결·심플 — 발표 용이성 최우선.
- 기존 crucible/forge/hammer 게이트 회귀 금지 (`node tests/gates.test.js` 통과 유지).

## Success Criteria

1. 발표 주제/스크립트 입력 → `---` 구분 슬라이드 .md + 토큰 적용 HTML deck이 `docs/glm-hammer/decks/YYYY-MM-DD-<name>/`에 생성된다.
2. 웹 이미지에 출처 자동 소형 표기 + 이미지 적합성 critic 패널 만장일치 승인 없이는 통과 불가.
3. 도식 슬라이드는 스크린샷 기반 visual-qa APPROVE 없이 완료 불가 (stop-gate 강제).
4. deck 완성 후 PPTX 추출 여부를 묻고, 옵트인 시 PowerPoint에서 텍스트 편집 가능한 .pptx 생성.
5. `node tests/gates.test.js` 통과 — 기존 게이트 회귀 없음 + 신규 pptxx 게이트 시나리오 테스트 포함.

## Verification Strategy

- **Level:** test-suite
- **Command:** `node tests/gates.test.js` (repo 루트)
- **What it validates:** 전체 hook 스크립트 구문(`node --check` 루프 — 신규 deck-gate.js 자동 포함), hooks.json/plugin.json 유효성, 신규 pptxxGate·deck-gate의 stdin→stdout 회귀 시나리오(차단/통과/봉인/승인 리셋), authored SKILL.md·agents/*.md 존재. **자동화 범위 밖(수동, crucible 선례):** 라이브 deck 생성, 이미지 API 호출, Playwright 스크린샷, python-pptx 산출 — 머지 후 첫 실사용에서 수동 검증.
