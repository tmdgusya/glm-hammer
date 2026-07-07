# DRAFT v1 — pptxx Milestone DAG

> Skeleton: B (risk-first) 기반. A(interface-first)에서 critic 체크리스트 상세 기준(M4)과 게이트-수령증 결합 기준을 접목. Integration Verification 마일스톤은 락 이후 자동 부가되므로 이 드래프트에 없음.

### M1: De-risk Spikes — Visual-QA, Image APIs, PPTX Fidelity

- **Goal:** 세 개의 미검증 외부 통합(Windows Playwright 헤드리스 스크린샷, Openverse/Wikimedia 출처 메타데이터 품질, 슬라이드 md+토큰 → python-pptx 텍스트 편집 가능 출력)을 저장소 통합 전에 일회성 스파이크 아티팩트로 증명한다.
- **Success Criteria:**
  - `docs/engineering-discipline/harness/pptxx-skill/planning/spikes/screenshot/slide-01.png`가 존재하는 비어 있지 않은 PNG이고, 생성 명령이 `spikes/screenshot/README.md`에 기록되어 있으며, 그 PNG를 읽은 비전 판독 결과가 `spikes/screenshot/verdict.md`에 APPROVE/REJECT로 기록됨.
  - `spikes/image-api/openverse-sample.json`·`wikimedia-sample.json` 각각에 최소 3개 결과의 license·creator·source-URL 필드가 비어 있지 않게 존재하고, 사용한 쿼리 URL이 함께 기록됨.
  - `spikes/pptx/README.md`의 기록된 명령 재실행으로 `sample-slides.md` + `validateTokens` 통과 tokens.json에서 `sample.pptx`가 재생성되고, read-back 스크립트가 소스 .md의 모든 슬라이드 제목을 출력하며 exit 0.
  - `node tests/gates.test.js` 통과 (저장소 소스 무접촉).
- **Dependencies:** None
- **Files affected:** Create: [`docs/engineering-discipline/harness/pptxx-skill/planning/spikes/screenshot/{sample-slide.html,slide-01.png,verdict.md,README.md}`, `spikes/image-api/{openverse-sample.json,wikimedia-sample.json,README.md}`, `spikes/pptx/{sample-slides.md,tokens.json,md2pptx-spike.py,readback.py,sample.pptx,README.md}`] / Modify: []
- **Risk:** High — 전부 그린필드; Playwright-on-Windows 캡처·이미지 API 필드 품질·pptx 충실도는 스킬 설계 전체가 기대는 미검증 가정.
- **Effort:** Medium
- **User Value:** 스크린샷 PNG, 라이선스 필드가 채워진 API JSON, PowerPoint로 열리는 sample.pptx — 플러그인 코드 변경 전에 외부 다리가 이 머신에서 작동한다는 실물 증거.
- **Abort Point:** Yes — planning docs만 추가, 저장소 동작 불변. 스파이크 실패 시 통합 비용 0으로 설계 수정/축소.
- **Evidence:** Brief "visual-qa·PPTX·HTML deck·이미지 검색 기존 코드 전무 — 전부 그린필드"; "python-pptx·Playwright는 … 런타임 의존성 … 테스트 스위트는 zero-dep 유지"; "Openverse/Wikimedia Commons API는 키 없이 … 라이선스·저작자·출처 반환"(리서치 단정, 미실행); Verification Strategy "라이브 deck 생성·이미지 API·스크린샷·python-pptx는 수동 검증 범위" — 스파이크가 유일한 저비용 검증 지점; `validateTokens` 요건(token-lib.js:91-159).

### M2: Hook & Gate Integration (pptxxGate, deck-gate, planKey, route-intent)

- **Goal:** 강제 계층 전체 — stop-gate.js `pptxxGate`, 신규 `deck-gate.js` PostToolUse 봉인, `planKey()` decks/ 확장, route-intent deck 인텐트 분기, hooks.json 배선 — 를 스킬이 존재하기 전에 회귀 테스트와 함께 배선한다.
- **Success Criteria:**
  - `node tests/gates.test.js` 통과: 신규 (h)-미러 시나리오 — `phase:'pptxx'` + deck 봉인 없음 → stdout에 `"block"`; 봉인 + APPROVE 수령증 → 차단 없음; deck-gate.js에 stdin `{cwd, tool_input:{file_path: docs/glm-hammer/decks/...}}` 파이프 → plan-seal.json 항목 생성(`sealMatches === 'ok'`).
  - 기존 (a)–(j) 전 섹션 무변경 통과 (crucible/forge/hammer 게이트 회귀 없음).
  - `hooks/hooks.json` 파싱 통과, deck-gate 항목이 `${ZCODE_PLUGIN_ROOT}` 사용 (`CLAUDE_PLUGIN_ROOT` 0건).
  - 활성 런 없는 상태에서 deck형 요청을 `node hooks/scripts/route-intent.js`에 파이프 → 단일 키 `{additionalContext}`에 pptxx 언급; design형 요청은 여전히 crucible 라우팅 (테스트 스위트 내 단정).
- **Dependencies:** None (M1과 병렬 — 파일 완전 분리)
- **Files affected:** Create: [`hooks/scripts/deck-gate.js`] / Modify: [`hooks/scripts/stop-gate.js`, `hooks/scripts/lib.js`, `hooks/scripts/route-intent.js`, `hooks/hooks.json`, `tests/gates.test.js`]
- **Risk:** High — 세 스킬이 공유하는 강제 코드(`planKey`, stop-gate 스위치)를 변경; 정규식·라우팅 우선순위 실수는 기존 게이트 회귀. 게이트 모델(forge/crucible식 done-skip vs hammer식 done-recheck)과 designIntent 대비 순서를 여기서 확정해야 함.
- **Effort:** Large
- **User Value:** `node tests/gates.test.js`로 신규 pptxx 게이트 시나리오와 기존 게이트가 함께 통과하는 것을 확인 — 강제 골격이 회귀 없음을 실증.
- **Abort Point:** Yes — 아무것도 `phase:'pptxx'`를 설정하지 않으므로 신규 분기는 phase 스위치 뒤의 휴면 코드; 기존 동작 무결, 테스트 green.
- **Evidence:** Brief Lens B "`stop-gate.js:290-292` phase switch … `pptxxGate(cwd, state)` 계약 … 공통 가드 `:282-287` … pptxx는 어느 모델인지 결정 필요"; "`lib.js:76` `planKey()` … decks/ alternation 추가 필요 … `plan-gate.js:19`·`token-gate.js:20` 미매칭 → 신규 deck-gate.js"; "route-intent 우선순위 사다리(`:77-92`), `emitContext` 단일 키 엄격 스키마(`lib.js:192-197`)"; "루트 변수 `${ZCODE_PLUGIN_ROOT}`"; Lens C "(h)/(i) 미러 — pptxx 테스트 확장 패턴이 그대로 존재"; Constraints "기존 게이트 회귀 금지".

### M3: pptxx SKILL.md Core Pipeline + Crucible Chaining

- **Goal:** 스크립트 확보(`---` 구분 슬라이드 .md), crucible 체이닝 토큰 확보, 토큰 적용 HTML deck 생성(`docs/glm-hammer/decks/YYYY-MM-DD-<name>/`)을 커버하는 heavy-skill 형식의 `skills/pptxx/SKILL.md`를 M2의 `pptxxGate` 기대와 정확히 일치하는 State Protocol로 작성한다.
- **Success Criteria:**
  - `skills/pptxx/SKILL.md` 존재: frontmatter `name`+`description`(한/영 트리거 내장, triggers 필드 없음), Core Principle / Hard Gates (hook-enforced) / State Protocol / Process(phase별 `⟨state: …⟩`) / Anti-Patterns 섹션 (crucible SKILL.md 구조 대조).
  - crucible 선행 조건 로직: 완료 신호 = `state.design` 존재 + tokens.json `validateTokens` 통과 + `sealMatches === 'ok'`; 체이닝 지시문이 crucible→forge 패턴(crucible SKILL.md Phase E) 미러; design tokens.json 읽기 전용 규칙 명시.
  - SKILL.md의 모든 `⟨state⟩` 전이·증거 경로가 M2 테스트 시나리오가 행사하는 분기와 대응 (SKILL.md vs tests/gates.test.js pptxx 케이스 교차 확인 — phase/status 문자열 불일치 0건).
  - `node tests/gates.test.js` 통과: (j) 목록에 `skills/pptxx/SKILL.md` 추가, `.zcode-plugin/plugin.json`·`.claude-plugin/plugin.json` 파싱 통과 + pptxx 키워드 추가.
- **Dependencies:** M2 (게이트 모델·상태 문자열이 거기서 확정 — SKILL.md가 일치해야 함)
- **Files affected:** Create: [`skills/pptxx/SKILL.md`] / Modify: [`tests/gates.test.js`, `.zcode-plugin/plugin.json`, `.claude-plugin/plugin.json`]
- **Risk:** Medium — 체이닝은 지시문 전용("스킬 체이닝은 코드가 아닌 SKILL.md 지시문")이라 프로즈-게이트 드리프트가 주 실패 모드; 체인 런 간 `state.design` carry-over 의미론 준수 필요.
- **Effort:** Medium
- **User Value:** 스킬이 발견·호출 가능해지고 코어 플로우 완성: 주제/스크립트 입력 → 슬라이드 .md + 토큰 적용 HTML deck (이미지·visual-qa는 M4에서, deck 자체는 실물).
- **Abort Point:** Yes — 이미지/visual-qa/pptx 없이도 스크립트→HTML deck 스킬로 독립적으로 유용; 테스트 green.
- **Evidence:** Brief Lens A "heavy SKILL.md 컨벤션·섹션 목록"; Lens B "체이닝 선례 `skills/crucible/SKILL.md:100-106`·`skills/forge/SKILL.md:125`, 공유 `state.design`"; "crucible 완료 신호 정의"; "state.json 실례 — design 키가 체인 런에 계속 실림"; Lens A "index.html 자기완결 HTML+인라인 SVG 하우스 스타일"; Lens B "design tokens.json 재작성 시 승인 리셋 트립 — 읽기 전용"; Lens D "decks/ 대칭 구조".

### M4: Image Sourcing + Critic Panels (image-suitability, visual-qa)

- **Goal:** 신규 critic 에이전트 2종을 추가하고, M1에서 증명된 명령·API 필드를 사용해 SKILL.md에 이미지 소싱 phase(Openverse/Wikimedia + WebSearch, 자동 소형 출처 표기)와 도식 슬라이드 필수 스크린샷 visual-qa phase를 확장한다.
- **Success Criteria:**
  - `agents/image-suitability-critic.md`·`agents/visual-qa-critic.md` 존재, 정확한 에이전트 계약 준수: frontmatter `name`/`description`/`tools`(읽기 전용), `## Method`, `## Verdict — Binary Checklist`(`**C1:**` 형식), fenced 최종 메시지 포맷(`CHECKS:`/`VERDICT: APPROVE|REJECT`/`FINDINGS:`), "VERDICT is mechanical" 규칙, `## Evidence Receipt (mandatory)` + `EVIDENCE_RECORDED: <path>` (agents/fidelity-critic.md와 구조 대조).
  - image-suitability 체크리스트에 라이선스/출처 메타데이터 존재·표기 검증 항목 포함; visual-qa 체크리스트에 스크린샷 가독성·오버플로우·토큰 준수·도식 판독 항목 포함 (체크리스트 항목 직접 확인).
  - SKILL.md 이미지 phase: Openverse/Wikimedia 엔드포인트와 M1 `spikes/image-api/*.json`과 일치하는 필수 출처 필드 명시, ZCode WebSearch 명시적 의무화, deck HTML 내 출처 렌더링 규칙 명시; insane-search는 차단 페이지 폴백으로만 등장.
  - SKILL.md visual-qa phase: M1 증명 Playwright 스크린샷 명령 내장, judge 수령증 경로 `evidence/deck/panel/round-<N>/<critic>.md` (`receiptProblems` `kind:'judge'` 요건 일치: ≥300바이트, `CHECKS:`, verdict 정규식).
  - `node tests/gates.test.js` 통과: 신규 에이전트 2종 (j) 목록 추가 + 도식 슬라이드 런에 APPROVE visual-qa 수령증 없으면 pptxxGate 차단하는 (h)-미러 시나리오.
- **Dependencies:** M1 (증명된 명령·필드), M3 (확장할 SKILL.md)
- **Files affected:** Create: [`agents/image-suitability-critic.md`, `agents/visual-qa-critic.md`] / Modify: [`skills/pptxx/SKILL.md`, `tests/gates.test.js`]
- **Risk:** Medium — 에이전트 계약·패널 역학은 선례 풍부(기존 에이전트 14종)하나, 수령증 포맷이 `receiptProblems`와 어긋나면 stop-gate가 조용히 깨짐; 이미지 품질·출처 표기는 수동 검증만 가능.
- **Effort:** Medium
- **User Value:** deck에 라이선스·출처 표기된 이미지가 만장일치 패널 검증을 거쳐 들어가고, 도식 슬라이드는 스크린샷 APPROVE 없이 통과 불가 — 성공 기준 2·3 실증 가능.
- **Abort Point:** Yes — M3 코어 deck 플로우는 계속 동작; 신규 phase는 부가적이며 해당 state 필드가 나타날 때만 게이트됨.
- **Evidence:** Brief Lens A "critic 패널 패턴: 읽기 전용, 병렬, 정보 격리, 만장일치, ≤3라운드, general-purpose 폴백"; "agents/*.md 정확 계약"; Lens B "`receiptProblems`(stop-gate.js:46-62) judge = ≥300바이트+`CHECKS:`+verdict 정규식(`:42-43`)"; "증거 경로 제안 `evidence/deck/panel/round-<N>/<critic>.md`"; Success Criteria 2·3; Constraints "ZCode WebSearch 명시"; Lens D "insane-search 폴백 전용".

### M5: Opt-in PPTX Extraction

- **Goal:** 옵트인 종단 phase 추가 — deck 완성 후 SKILL.md가 PPTX 추출 여부를 묻고, 옵트인 시 M1 스파이크 스크립트를 경화한 python-pptx 빌드로 슬라이드 .md + 토큰에서 텍스트 편집 가능 .pptx를 생성한다(런타임 설치 안내 포함).
- **Success Criteria:**
  - `skills/pptxx/scripts/md2pptx.py` 존재(런타임 전용, hooks/tests에서 미참조), 헤더 사용법대로 M1 `spikes/pptx/sample-slides.md`+토큰에 실행 시 exit 0, read-back(M1 `readback.py`)이 모든 슬라이드 제목 일치.
  - `skills/pptxx/SKILL.md`에서 PPTX는 deck 완성 후 옵트인 전용(기본 생성 없음), `pip install python-pptx` 안내 + Python 부재 시 폴백 경로 명시.
  - `node tests/gates.test.js` (a)–(i) 무변경 통과 — hook/test가 Python 의존성을 획득하지 않음 확인.
  - `grep -r "python-pptx" hooks/ tests/` 0건 (zero-dep 경계 유지).
- **Dependencies:** M1 (pptx 충실도 스파이크), M3 (확장할 SKILL.md 파이프라인)
- **Files affected:** Create: [`skills/pptxx/scripts/md2pptx.py`] / Modify: [`skills/pptxx/SKILL.md`, `tests/gates.test.js` ((j) 목록이 신규 스크립트를 추적하는 경우만)]
- **Risk:** Medium — 충실도 리스크는 M1에서 소거됐으나 토큰→pptx 스타일 매핑(폰트·hex·간격)은 여전히 열화 가능; 옵트인 배치가 M2 게이트의 terminal-status 처리와 어긋나면 안 됨.
- **Effort:** Small
- **User Value:** 성공 기준 4 완성: deck 완료 → 추출 동의 → PowerPoint에서 편집 가능한 .pptx.
- **Abort Point:** Yes — 이 마일스톤 없이도 HTML deck 제품은 완결·출하 가능; PPTX는 명시적 옵트인.
- **Evidence:** Brief Out "HTML→PPTX 완전 자동 변환 제외; PPTX 옵트인 전용 — 느려서"; Lens D "Python은 저장소 의존성 아님, 런타임 설치 안내, 스위트 zero-dep 유지"; Success Criteria 4 "PowerPoint에서 텍스트 편집 가능"; Verification Strategy "python-pptx 산출은 수동 검증 범위 — 따라서 스파이크 아티팩트 기반 검사".

## Execution Order

- 위상 순서: **M1 ∥ M2 → M3 → M4 → M5**
- 병렬: **M1 ∥ M2** — 파일 완전 분리(M1은 planning/spikes 문서만, M2는 hooks/·tests/). 동시 시작.
- M4 ∥ M5 불가 — 둘 다 `skills/pptxx/SKILL.md`·`tests/gates.test.js` 수정. M4 선행(잔여 리스크 높음: 수령증-게이트 결합).

## Design Rationale

- 자동 스위트가 영원히 커버 못 하는 세 그린필드 통합(Playwright/이미지 API/python-pptx)을 M1 스파이크로 선행 — 실패 비용이 문서 폴더 하나.
- 두 번째 리스크(공유 강제 코드 변경)를 M2에서 휴면 코드 상태로 착지 — 어떤 동작도 의존하기 전에 무회귀 증명, 게이트 모델 결정을 조기 강제.
- 경계는 기능이 아닌 실패 모드를 따름: M2/M3 = "hook 문자열 오류" vs "프로즈-hook 드리프트" 분리; M3/M4 = "코어 deck 동작" vs "수령증 포맷이 패널 게이트 파괴" 분리; M5 = 유일한 Python 아티팩트를 zero-dep 경계 뒤에 격리.
- 트레이드오프: 사용자는 M3까지 deck을 못 보지만 M1∥M2 병렬로 달력 비용 낮음; 모든 마일스톤이 테스트 green 중단점.
