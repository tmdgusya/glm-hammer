# Plan: M2 — Hook & Gate Integration (§0 전체 계약)

**Milestone:** `docs/engineering-discipline/harness/pptxx-skill/milestones/M2-hook-gate-integration.md`
**계약 원천(유일):** `docs/engineering-discipline/harness/pptxx-skill/planning/draft-v4.md` §0 (동결)

## Goal

§0 동결 계약 전체 — `pptxxGate` 분기 ①–④(status 스코프·hybrid-done·매니페스트/라이선스 검증), 신규 `deck-gate.js`(봉인·무장 원웨이 래칫·파일→라운드 리셋 매핑·속성 스코프 정적 검사), `planKey` decks/ 확장 — 를 pptxx 스킬이 존재하기 전에 fabricated-receipt 회귀 테스트(ⓐ–ⓟ)와 함께 구현한다. `route-intent.js`는 무접촉(M3 소유). 착지 후 상태는 진짜 휴면: `phase:'pptxx'` 설정자가 없으므로 사용자 노출 변화 0.

## Scope

- **In:**
  - Create: `hooks/scripts/deck-gate.js`
  - Modify: `hooks/scripts/stop-gate.js`, `hooks/scripts/lib.js`, `hooks/hooks.json`, `tests/gates.test.js`
- **Out:**
  - `hooks/scripts/route-intent.js` — **`git diff` 기준 0바이트 변경** (M3 소유)
  - `skills/` · `agents/` 하위 어떤 파일도 생성/수정 금지 (pptxx SKILL.md는 M3, critic 에이전트는 M4)
  - `dispatch-log.js` — 기존 evidence-path 추출이 `deck/…` tail도 이미 커버(변경 불요)
  - `session-start.js`, `plan-gate.js`, `token-gate.js`, `token-lib.js` — 무접촉

## Verification Strategy

- **Command:** `node tests/gates.test.js` (repo root에서 실행, exit 0)
- **What passing proves:** 신규 시나리오 ⓐ–ⓟ 전부 green + planKey 단위 단정 + **기존 crucible/forge/hammer 단정 무수정 통과**(회귀 없음) + `hooks.json` 파싱 + 전 훅 스크립트 `node --check`.
- **Scope check:** `git diff --stat` 이 위 In 목록의 5개 파일만 보임. `git diff -- hooks/scripts/route-intent.js` 출력 없음.
- **Out of automated scope:** 실제 pptxx 스킬 플로우(M3+), 라이브 스크린샷/이미지 fetch(M1/M4). 본 마일스톤의 게이트는 전부 throwaway 프로젝트 + 위조 수령증으로 검증한다.

## Constraints (전 태스크 공통)

1. **Zero-dependency CommonJS.** `'use strict'`, `require('./lib')` 재사용(`node:` 프리픽스·ESM·외부 패키지 금지). 기존 훅과 동일 스타일.
2. **Hook stdout 스키마 엄격.** ZCode는 스키마 외 키를 거부한다 — PostToolUse(deck-gate)는 `{additionalContext}` 만(`emitContext`), Stop(stop-gate)은 `{decision:'block', reason}` 만(`emit`). 항상 `process.exit(0)`.
3. **Fail-open on infra errors, 단 §0 fail-closed 예외.** 최상위 try/catch fail-open은 유지하되, **무장 상태(`visualQa.required===true || imagePanel.required===1`) + `state.deck` 부재 → 무조건 block**. 무장 스코프 내 매니페스트/디렉토리 스캔 오류도 throw 하지 말고 block reason 반환(fail-closed).
4. **Windows 경로.** 모든 경로 비교는 `planKey`/백슬래시 정규화 경유. 테스트는 `path.join`(호스트 구분자)과 포워드슬래시 상대 경로가 동일 키로 수렴함을 단정.
5. **상태 변이는 `writeState` 원자쓰기만.** 직접 `fs.writeFileSync(state.json)` 금지.
6. **기존 테스트 단정 무수정.** `tests/gates.test.js` 의 기존 (a)–(j) 블록은 문자 그대로 보존, 신규 블록은 그 뒤에 append.

---

## Fixed Contracts (본 계획 내 동결 — 전 태스크가 이 절만 참조)

### C-1. §0 상태 스키마 (draft-v4 §0에서 그대로 복사)

```json
{
  "phase": "pptxx",
  "status": "scripting | chaining | imaging | building | visual-qa | awaiting-user | exporting | done",
  "deck": "docs/glm-hammer/decks/YYYY-MM-DD-<name>",
  "design": "docs/glm-hammer/design/YYYY-MM-DD-<name>",
  "resume": null,
  "slides": { "total": 0, "diagrams": 0 },
  "imagePanel": { "required": 0, "round": 1 },
  "visualQa": { "required": false, "round": 1 },
  "stopBlocks": 0
}
```

### C-2. 동결 상수 (deck-gate.js 상단에 이 이름 그대로 정의)

```js
// ⚠ CROSS-MILESTONE CONTRACT: M1의 spikes/pptx/format-spec.md 는 도식 블록을
// 정확히 이 fenced 오프너로 정의해야 한다. M1은 병렬 진행 중 — M3 착수 시 교차 검증 필수.
const DIAGRAM_MARKER = '```diagram';

// index.html 봉인 시 imagePanel 래칫을 발화시키는 로컬 이미지 참조
const LOCAL_IMAGE_REF = /(?:src|srcset)\s*=\s*["']?(?!https?:|data:)[^"'\s>]*\.(?:png|jpe?g|gif|webp|svg)\b/i;

// 봉인 집합 파일명 (deck 디렉토리 직속만 — planKey 확장이 1-세그먼트 매칭으로 이를 보장)
const SEALED_NAMES = ['slides.md', 'index.html', 'attributions.md'];

// 분기 ③ 매니페스트 스캔 대상 확장자 / 라이선스 허용목록 (§0 동결)
const IMAGE_EXT = /\.(?:png|jpe?g|gif|webp|svg)$/i;
const LICENSE_ALLOW = new Set(['cc0', 'pdm', 'cc-by', 'cc-by-sa']);
```

### C-3. 정적 검사 (속성 스코프 — §0 동결)

`index.html` 이 deck 경로에 Write/Edit 될 때만 실행. 위반 시 **봉인 거부**(writeSeal·무장·리셋 전부 생략) + `additionalContext` 경고. block 자체는 Stop 게이트가 seal `missing|broken` 으로 수행한다.

- **무조건 거부:** `/<script\b/i`, `/javascript:/i` (문서 어디든).
- **속성 스코프 거부:** 아래 컨텍스트에서 추출한 참조 값이 `https?://` · `file://` · 절대경로(`/…`, `C:\…`) · `../` 이탈이면 거부:
  ```js
  const REF_CONTEXTS = [
    /(?:src|srcset)\s*=\s*["']([^"']*)["']/gi,
    /<link\b[^>]*href\s*=\s*["']([^"']*)["']/gi,
    /url\(\s*["']?([^"')]+)["']?\s*\)/gi,
    /@import\s+["']([^"']+)["']/gi,
    /<(?:iframe|object|embed)\b[^>]*(?:src|data)\s*=\s*["']([^"']*)["']/gi,
  ];
  const BAD_REF = /^(?:https?:|file:|\/|[a-zA-Z]:[\\/])|(?:^|[\\/])\.\.(?:[\\/]|$)/;
  ```
  `srcset` 값은 콤마 분리 후 각 URL 토큰을 개별 검사.
- **명시적 허용:** `<a href="https://…">` 와 텍스트 노드의 URL(출처 표기) — 위 컨텍스트에 해당하지 않으므로 자동 통과. 테스트 ⓝ이 이를 단정한다.

### C-4. deck-gate.js 처리 순서 (동결)

tracked Write/Edit/MultiEdit 입력 `{cwd, tool_input:{file_path}}` 에 대해:

1. **경로 필터:** 정규화 후 `/docs\/glm-hammer\/decks\/[^/]+\/([^/]+)$/i` 매칭 실패 → exit 0. (1-세그먼트 매칭이므로 `shots/` 하위·서브디렉토리는 자동 제외 — ⓙ)
2. **파일명 필터:** basename ∉ `SEALED_NAMES` → exit 0 (PNG 등 바이너리 제외 — ⓙ).
3. **정적 검사:** `index.html` 이면 C-3 실행. 위반 → 경고 emitContext 후 exit 0 (**봉인·무장·리셋 없음** — ⓝ).
4. **리셋 매핑:** `state.phase==='pptxx'` 이고 **이번 write 이전에 이미 무장**(`prevArmed = visualQa.required===true || imagePanel.required===1`)이면 파일→라운드 매핑을 문자 그대로 적용:
   - `slides.md` → `visualQa.round++` **및** `imagePanel.round++`
   - `index.html` → `visualQa.round++` 만 (ⓚ: `imagePanel.round` 불변)
   - `attributions.md` → `imagePanel.round++` 만
   round 는 무효화 카운터 — ≤3 에스컬레이션은 REJECT 수령증 개수 기준(M4 소관, 게이트는 관여 안 함).
5. **봉인:** `writeSeal(cwd, filePath)` (phase 무관 — 봉인은 콘텐츠 무결성 기록일 뿐).
6. **무장 grep (원웨이 래칫, phase==='pptxx' 한정):** 방금 쓰인 파일 내용 기준:
   - `index.html` + `LOCAL_IMAGE_REF` 매치 → `imagePanel.required = 1` (이미 1이면 유지, 0으로 되돌림 금지)
   - `slides.md` + `DIAGRAM_MARKER` 포함 → `visualQa.required = true` (단 `state.visualQa.exempt === true` 면 생략; 이미 true면 유지)
   - `prevArmed` 는 4단계에서 이 단계 **이전** 값으로 캡처 — 무장을 처음 발화시킨 그 write 자체는 round 를 올리지 않는다 (ⓘ에서 round 1 유지 단정).
7. 상태가 변했을 때만 `writeState` 1회. 무장/리셋 발생 시 짧은 `additionalContext` 안내 emit.

### C-5. pptxxGate 분기 × status 스코프 (§0 표 그대로)

| 분기 | 조건 | 요구 | 적용 status |
|---|---|---|---|
| ⓪ fail-closed | 무장 + `state.deck` 부재 | 무조건 block (모든 status, done-skip 보다 먼저) | ALL |
| ① 봉인+빌드 | `state.deck` 존재 | `slides.md`·`index.html` (+`imagePanel.required===1` 시 `attributions.md`) 전부 `sealMatches==='ok'` + `deck/build.md` raw 수령증 | `visual-qa`, `exporting`, hybrid-`done` |
| ② visual-qa | `visualQa.required===true` | `deck/visual-qa/round-<visualQa.round>/visual-qa-critic.md` judge APPROVE (dispatch-backed) | `visual-qa`, `exporting`, hybrid-`done` |
| ③ 이미지 패널 | `imagePanel.required===1` | `deck/panel/round-<imagePanel.round>/image-suitability-critic.md` judge APPROVE (dispatch-backed) + `sealMatches(attributions.md)==='ok'` + 매니페스트 검증(C-6) | `visual-qa`, `exporting`, hybrid-`done` |
| ④ 초기·무장 전 | — | 무요구 → return null | `scripting`, `chaining`, `imaging`, `building` |

- **done-skip + hybrid-done:** `done && !state.deck` → return null(침묵). `done && state.deck` → ①②③ 재검증.
- `awaiting-user` 는 stop-gate 공통 가드(:283)가 **phase 디스패치 이전에** 처리 — pptxxGate 내부에 분기 두지 않는다 (ⓗ가 가드-순서 회귀 라벨로 단정).
- `stopBlocks >= 6` 캡 = 기존 하우스 탈출구(의도됨) — ⓖ 테스트 주석에 1줄 기록.
- 수령증 검증은 기존 `receiptProblems` 재사용: judge = `{minBytes:300, CHECKS:, VERDICT: APPROVE}` + 원장 backing(원장 비어있으면 fail-open — ⓛ은 시드로 활성화), raw = `{minBytes:20}`.
- **M2 게이트가 강제하지 않는 tail:** `deck/fetch.md` 는 §0 4종 tail 의 원소지만 패널의 교차 확인 대상(M4 coverage 승격) — 게이트 요구사항 아님.

### C-6. 분기 ③ 매니페스트 검증 (§0 동결)

- **스캔 집합:** `path.resolve(cwd, state.deck)` 를 재귀 순회하되 `shots/` 디렉토리는 스킵. `IMAGE_EXT` 매칭 파일 전부가 대상(서브디렉토리 포함 — ⓜ).
- **행 문법(동결):** `| images/photo1.jpg | <sha256> | https://... | cc-by | <author> |` — attributions.md 에서 `|` 로 시작하는 라인을 셀 분해(trim), 헤더/구분선(셀이 `-`·공백뿐이거나 `path|sha256|license` 류 헤더어) 스킵, 셀 ≥5 인 라인만 행으로 인정. `path` 는 deck-상대 **포워드슬래시**.
- **판정:** 스캔된 각 이미지에 대해 (a) rel 경로 일치 행 존재, (b) `sha256File(abs) === row.sha256`(소문자 비교), (c) `LICENSE_ALLOW.has(row.license)` **또는** 행에 `user-confirmed` 토큰 존재(6번째 셀 또는 라이선스 셀 병기 — C-7 #3). 하나라도 실패 → block(사유에 파일·실패 종류 명시).
- 스캔/파싱 중 fs 오류 → block reason 반환 (Constraint 3 fail-closed).

### C-7. §0 이 명시하지 않아 본 계획이 동결한 해석 (리뷰어 주목 — 전부 플래그)

1. **도식 마커 문자열** = `` ```diagram `` (C-2). §0는 "format-spec 도식 블록 grep"만 명시. **M1 format-spec.md 가 이 문자열을 그대로 써야 하며 M3 착수 시 교차 검증**(불일치 시 상수 1줄 수정 + 테스트 픽스처 동기화가 유일 diff).
2. **visual-qa 면제 마커** = `state.visualQa.exempt === true`. §0/M1은 "면제 마커" 존재만 언급, 필드명 미동결 — M4 축소 기준 착지 시 교차 검증.
3. **`user-confirmed` 필드 표현** = 매니페스트 행 내 `user-confirmed` 리터럴 토큰(추가 셀 또는 라이선스 셀 병기). §0 예시 행은 5열이며 필드 위치 미동결.
4. **리셋 매핑 적용 조건** = `prevArmed`(이번 write 의 무장 grep **이전** 상태) 가 true 일 때, 파일→라운드 매핑을 개별 플래그 무장 여부와 무관하게 문자 그대로 적용. 미무장 플래그의 round 가 선행 증가해도 게이트가 그 플래그를 요구하지 않으므로 무해.
5. **fail-closed 의 status 스코프** = 전 status, done-skip 판정보다 먼저 (ⓖ의 "done+deck 없음→침묵" 픽스처는 반드시 미무장 상태로 구성).
6. **deck-gate 의 phase 의존** = 봉인·정적 검사는 phase 무관(콘텐츠 무결성), 무장 래칫·리셋 매핑은 `state.phase==='pptxx'` 에서만(타 phase 상태 오염 방지).

---

## File Structure Mapping

| Action | File | Anchor |
|---|---|---|
| Modify | `hooks/scripts/lib.js` | `function planKey` (:76–80) 정규식 alternation |
| Create | `hooks/scripts/deck-gate.js` | — (token-gate.js 를 골격 선례로) |
| Modify | `hooks/scripts/stop-gate.js` | `hammerGate` 뒤에 `pptxxGate` 추가; phase 디스패치(:290–292)에 분기 1줄 |
| Modify | `hooks/hooks.json` | `"matcher": "Write|Edit|MultiEdit"` hooks 배열에 deck-gate 항목 |
| Modify | `tests/gates.test.js` | 기존 (j) 블록 뒤에 pptxx 섹션 append |

Task 1–4는 서로소 파일(병렬 가능). Task 5–10은 전부 `tests/gates.test.js` — 순차 append.

---

## Tasks

### Task 1: `lib.js` — planKey decks/ 확장

**Files:** `hooks/scripts/lib.js`
**Dependencies:** None

`planKey` 정규식에 decks alternation 추가 (deck 디렉토리 **직속**의 `.md`/`.html` 만 — 서브디렉토리·바이너리 비매칭):

```js
const m = n.match(/docs\/glm-hammer\/(?:plans\/[^/]+\.md|design\/[^/]+\/[^/]+\.(?:md|json)|decks\/[^/]+\/[^/]+\.(?:md|html))$/i);
```

**Acceptance:**
- [x] `node --check hooks/scripts/lib.js` exit 0 — passed
- [x] `node -e` 원라이너 단정: `planKey('C:\\proj\\docs\\glm-hammer\\decks\\2026-07-07-x\\slides.md') === planKey('docs/glm-hammer/decks/2026-07-07-x/slides.md') === 'docs/glm-hammer/decks/2026-07-07-x/slides.md'` — abs backslash == rel forward == key (script-file run; first bash one-liner false-failed on shell escaping only)
- [x] `planKey('docs/glm-hammer/decks/d/shots/slide-01.png')` 와 `…/decks/d/img.png` 은 정규화 원문(비매칭 fallback) 반환 — decks 키 미생성 확인
- [x] 기존 plans/design 입력의 키가 바이트 동일 (변경 전후 동일 입력 비교) — plans/.md 및 design/tokens.json 키 동일 확인

### Task 2: `deck-gate.js` 신규 (봉인·정적 검사·리셋·무장 래칫)

**Files:** Create `hooks/scripts/deck-gate.js`
**Dependencies:** Task 1 (planKey 가 decks 봉인 키를 생성해야 writeSeal/sealMatches 가 맞물림)

C-2 상수 + C-3 정적 검사 + C-4 처리 순서를 그대로 구현. `token-gate.js` 의 골격(stdin 파싱, 정규화, emitContext, 최상위 try/catch fail-open)을 따른다. 상태 변이는 `writeState` 1회.

**Acceptance:**
- [x] `node --check hooks/scripts/deck-gate.js` exit 0 — passed
- [x] `grep -c "DIAGRAM_MARKER" hooks/scripts/deck-gate.js` ≥ 2 (정의 + grep 사용) — count 2
- [x] `grep -c "additionalContext\|emitContext" hooks/scripts/deck-gate.js` ≥ 1 이고 `emit({decision` 0건 (PostToolUse 스키마 준수) — emitContext 3건, emit({decision 0건
- [x] 수동 spawn 스모크: pptxx 상태의 throwaway 프로젝트에서 `<script>` 포함 index.html 입력 시 stdout 에 경고 additionalContext, plan-seal.json 에 index.html 키 부재 (본 검증은 Task 8·10 스위트로 대체 가능 — 스위트 green 이면 충족) — Task 10 (n1) green 으로 충족

### Task 3: `stop-gate.js` — pptxxGate 분기 ①–④ + 배선

**Files:** `hooks/scripts/stop-gate.js`
**Dependencies:** Task 1 (sealMatches 가 decks 키 조회)

C-5 표를 함수 하나(`pptxxGate(cwd, state)`)로 구현 — 순서: ⓪ fail-closed → done-skip(`done && !deck` → null) → status 스코프(④ → null) → ① 봉인+build.md → ② visualQa → ③ imagePanel(+C-6 매니페스트). 수령증은 전부 기존 `receiptProblems` 경유(unbacked 사유는 기존 `unbackedNote` 재사용). 배선은 기존 디스패치 체인에 1줄:

```js
else if (state.phase === 'pptxx') reason = pptxxGate(cwd, state); // done은 hybrid로 내부 재검증
```

공통 가드(:282–287 — awaiting-user, context pressure, BLOCK_CAP)는 **무변경**.

**Acceptance:**
- [x] `node --check hooks/scripts/stop-gate.js` exit 0 — passed
- [x] `grep -c "function pptxxGate" hooks/scripts/stop-gate.js` == 1; `grep -c "phase === 'pptxx'"` == 1 — both 1
- [x] forgeGate/crucibleGate/hammerGate/receiptProblems/공통 가드 라인 diff 0 (git diff 육안 + 기존 테스트 (h)(h2)(i) green) — git diff -U0 removed-lines 0건, 스위트 39 ok / 0 FAIL / exit 0
- [x] block reason 문자열이 누락 tail·round·다음 행동을 명시 (기존 게이트 문체) — 각 분기 reason 에 tail·round·재디스패치 지시 포함

### Task 4: `hooks.json` — deck-gate 등록

**Files:** `hooks/hooks.json`
**Dependencies:** Task 2

`Write|Edit|MultiEdit` 매처의 hooks 배열, `token-gate.js` 항목 바로 뒤에 추가:

```json
{
  "type": "process",
  "command": "node",
  "args": ["${ZCODE_PLUGIN_ROOT}/hooks/scripts/deck-gate.js"],
  "timeoutMs": 10000,
  "statusMessage": "(glm-hammer) Deck integrity gate"
}
```

**Acceptance:**
- [x] `node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8'))"` exit 0 — PARSE_OK
- [x] `grep -c "deck-gate.js" hooks/hooks.json` == 1; `grep -c "CLAUDE_PLUGIN_ROOT" hooks/hooks.json` == 0 — 1 / 0

### Task 5: 테스트 스캐폴딩 + planKey 단위 단정

**Files:** `tests/gates.test.js` (append)
**Dependencies:** Task 1

기존 (j) 블록 뒤에 pptxx 섹션 시작. 헬퍼 동결:

- `mkDeckProj()` — `fs.mkdtempSync` throwaway 프로젝트 + `docs/glm-hammer/decks/2026-07-07-test/` 생성, `{proj, deckRel, deckAbs}` 반환. 시나리오(그룹)마다 새로 생성해 상태 누출 차단.
- `pptxxState(overrides)` — C-1 스키마 기반 기본 상태(`phase:'pptxx'`, `deck: deckRel`, `stopBlocks:0`) + 오버라이드 merge.
- `runStop(proj)` / `runDeck(proj, filePath)` — 기존 (h)/(i)와 동일한 `spawnSync(process.execPath, [script], {input: JSON.stringify({cwd, tool_input:{file_path}}), encoding:'utf8'})` 패턴.
- `writeDeckFile(deckAbs, name, body)` + `sealVia(proj, abs)`(=`runDeck` 경유 봉인) / `lib.writeSeal` 직접 봉인(게이트 단독 시나리오용).
- judge 위조는 기존 `JUDGE_BODY` 상수 재사용, REJECT 변형은 `JUDGE_BODY.replace('VERDICT: APPROVE', 'VERDICT: REJECT')`.
- planKey 단정 4건: `planKey decks: abs backslash == rel forward`, `planKey decks: html tracked`, `planKey decks: png/shots not tracked`, `planKey legacy keys unchanged`.

**Acceptance:**
- [x] `node --check tests/gates.test.js` exit 0 — passed
- [x] planKey 체크 4건 green; 기존 (a)–(j) 체크 개수·이름 무변경(diff 로 확인) — 4건 ok, git diff removed-lines 0건(순수 append)

### Task 6: 시나리오 ⓐⓑⓖⓗⓞⓟ — 봉인/빌드·done 4분지·가드·fail-closed

**Files:** `tests/gates.test.js` (append)
**Dependencies:** Tasks 3, 5

| 체크 이름 | 구성 | 기대 |
|---|---|---|
| `pptxx (a) visual-qa no seals blocks` | status `visual-qa`, 봉인·수령증 없음 | `"block"` 포함 |
| `pptxx (b) all green passes` | slides.md+index.html 작성·봉인, `deck/build.md` raw(≥20B), 플래그 미무장, status `visual-qa` | block 미포함 |
| `pptxx (g1) done without deck is silent` | status `done`, `deck` 필드 삭제, **미무장** | block 미포함 |
| `pptxx (g2) done with deck + green seals passes` | (b) 픽스처 + status `done` | block 미포함 |
| `pptxx (g3) done with deck + broken seal blocks` | 봉인 후 `fs.writeFileSync` 로 직접 변조(비추적 경로) | `"block"` |
| `pptxx (g4) done + armed flag + no receipt blocks` | status `done`, `visualQa.required:true`, 수령증 없음 | `"block"` |
| `pptxx (h) awaiting-user passes (guard-order regression)` | status `awaiting-user`, 봉인·수령증 없음 | block 미포함 |
| `pptxx (o) early statuses pass` | `scripting`·`chaining`·`imaging`·`building` 4회 루프, 무봉인 | 전부 block 미포함 |
| `pptxx (p) armed without deck fail-closed blocks` | `visualQa.required:true`, `deck` 필드 삭제, status `building` | `"block"` |

ⓖ 블록 주석에 1줄 기록: `// stopBlocks cap(6) = 의도된 하우스 탈출구 (hammer 선례와 동일) — 캡 초과 시 침묵은 회귀 아님`.

**Acceptance:**
- [x] 위 9개 체크 전부 green (`node tests/gates.test.js`) — 9/9 ok, exit 0
- [x] ⓖ 주석의 stopBlocks 캡 1줄이 grep 으로 존재(`grep -c "stopBlocks cap" tests/gates.test.js` ≥ 1) — count 1

### Task 7: 시나리오 ⓘⓘ′ⓙⓚ — 무장 래칫·제외·리셋 매핑 (deck-gate E2E)

**Files:** `tests/gates.test.js` (append)
**Dependencies:** Tasks 2, 4, 5

| 체크 이름 | 구성 | 기대 |
|---|---|---|
| `pptxx (i) slides.md write arms visualQa` | pptxx 상태 시드 후 `runDeck` 으로 `DIAGRAM_MARKER` 포함 slides.md write | `visualQa.required===true`, `visualQa.round===1`(무장 write 는 리셋 없음), plan-seal 에 키 존재 |
| `pptxx (i2) index.html local image ref ratchets imagePanel` | `<img src="images/a.png">` 포함 index.html write | `imagePanel.required===1`, round 1; 이후 이미지 참조 없는 재작성에도 `required===1` 유지(원웨이) |
| `pptxx (j) deck png and shots excluded` | `decks/<d>/logo.png` 와 `decks/<d>/shots/slide-01.png` 를 `runDeck` 입력 | plan-seal 무변화, state 무변화, stdout 무경고 |
| `pptxx (k1) index.html re-edit bumps only visualQa.round` | (i)+(i2)로 양쪽 무장 후 index.html 재-write | `visualQa.round===2` **&& `imagePanel.round===1` 불변 단정** |
| `pptxx (k2) attributions.md edit bumps only imagePanel.round` | 이어서 attributions.md write | `imagePanel.round` +1 && `visualQa.round` 불변 |

**Acceptance:**
- [x] 위 5개 체크 green; (k1)은 `imagePanel.round` 불변을 **명시적 단정**으로 포함 — 5/5 ok; (k1) `imagePanel.round === 1` 명시 단정. 픽스처 노트: (k1)은 양쪽 무장 상태를 round 1 로 직접 시드 — (i)→(i2) 순차 실행 시 §0 리셋 매핑 자체가 두 번째 무장 write 에서 visualQa.round 를 선증가시키므로(계약상 올바른 동작), 매핑 단정을 격리하기 위함

### Task 8: 시나리오 ⓒⓓⓛ — visual-qa 수령증 + dispatch 원장

**Files:** `tests/gates.test.js` (append)
**Dependencies:** Tasks 3, 5

| 체크 이름 | 구성 | 기대 |
|---|---|---|
| `pptxx (c) visualQa required + no receipt blocks` | (b) green 픽스처 + `visualQa:{required:true,round:1}`, 수령증 없음 | `"block"` |
| `pptxx (d) visualQa not required passes` | 동일 픽스처, `required:false`, 수령증 없음 | block 미포함 |
| `pptxx (l1) ledger-backed receipt passes` | `deck/visual-qa/round-1/visual-qa-critic.md` = JUDGE_BODY; `.glm-hammer/dispatch.jsonl` 에 `{"paths":["deck/visual-qa/round-1/visual-qa-critic.md"]}` 시드 | block 미포함 |
| `pptxx (l2) unbacked receipt blocks` | 동일 수령증, 원장에는 **다른** tail 만 시드(원장 비어있지 않음 → 강제 활성) | `"block"` + reason 에 `unbacked`/`dispatch` 문구 |

**Acceptance:**
- [x] 위 4개 체크 green; (l2)는 원장 fail-open 규칙(빈 원장이면 미강제)을 깨지 않도록 반드시 시드 후 검증 — 4/4 ok; (l2)는 타 tail 시드로 강제 활성 후 unbacked block + reason 에 dispatch 문구 단정

### Task 9: 시나리오 ⓔⓕⓜ — 이미지 패널·매니페스트·라이선스

**Files:** `tests/gates.test.js` (append)
**Dependencies:** Tasks 3, 5

픽스처: deck 에 `images/photo1.jpg`(임의 바이트) + 서브디렉토리 `images/sub/photo2.png` 생성, `lib.sha256File` 로 실제 해시 계산해 C-6 문법의 attributions.md 생성·봉인.

| 체크 이름 | 구성 | 기대 |
|---|---|---|
| `pptxx (e1) imagePanel armed + missing receipt blocks` | `imagePanel:{required:1,round:1}`, 패널 수령증 없음 | `"block"` |
| `pptxx (e2) REJECT receipt blocks` | 수령증 = JUDGE_BODY 의 REJECT 변형 | `"block"` |
| `pptxx (e3) APPROVE + matching manifest passes` | APPROVE 수령증 + 두 이미지 모두 정확한 sha256·`cc-by` 행 + attributions 봉인 | block 미포함 (서브디렉토리 이미지 매칭이 여기서 ⓜ의 통과 단정 겸함) |
| `pptxx (f1) imagePanel 0 not required` | `required:0`, 패널 수령증·attributions 없음, 이미지 없음 | block 미포함 |
| `pptxx (f2) required=0 + no attributions + 2-file seal passes` | slides.md·index.html 만 봉인, attributions.md 미존재 | block 미포함 |
| `pptxx (m1) sha256 mismatch blocks` | photo1 행의 해시를 뒤집은 값으로 교체 후 재봉인 | `"block"` |
| `pptxx (m2) disallowed license without user-confirmed blocks` | license 셀 `cc-by-nc`, user-confirmed 없음 | `"block"` |
| `pptxx (m3) disallowed license + user-confirmed passes` | 같은 행에 `user-confirmed` 토큰 추가 | block 미포함 |
| `pptxx (m4) unmanifested subdirectory image blocks` | photo2 행 삭제 | `"block"` |

**Acceptance:**
- [x] 위 9개 체크 green; 매니페스트 픽스처가 C-6 예시 행 문법(5열 파이프·deck-상대 포워드슬래시)과 문자 그대로 합치 — 9/9 ok; 픽스처 행 `| images/photo1.jpg | <sha256> | https://... | cc-by | Author One |` 문법 그대로, 실해시 `lib.sha256File` 산출

### Task 10: 시나리오 ⓝ — 정적 검사 (봉인 거부 → Stop block)

**Files:** `tests/gates.test.js` (append)
**Dependencies:** Tasks 2, 3, 4, 5

| 체크 이름 | 구성 | 기대 |
|---|---|---|
| `pptxx (n1) <script> refuses seal` | `runDeck` 으로 `<script>` 포함 index.html write | stdout 에 경고 additionalContext; plan-seal 에 index.html 키 부재/구해시 유지 |
| `pptxx (n2) remote src refuses seal, stop blocks` | `<img src="https://evil/x.png">` write 후 `runStop` (status `visual-qa`) | deck-gate 경고 + stop-gate `"block"` (seal missing/broken 경유) |
| `pptxx (n3) attribution link and text URL seal OK` | `<a href="https://unsplash.com/...">출처</a>` + 텍스트 노드 `https://…` 포함, 참조 컨텍스트는 전부 로컬 | 경고 없음, 봉인 생성, (b) 조건 하에서 stop 통과 |

**Acceptance:**
- [x] 위 3개 체크 green; (n3)이 `<a href>` 허용을 명시 단정 — 3/3 ok; (n3) 픽스처에 `<a href="https://…">` + 텍스트 URL 포함, 무경고·봉인 생성·stop 통과 단정

### Task 11: 전체 회귀 + 스코프 확정

**Files:** 없음 (읽기 전용 검증)
**Dependencies:** Tasks 1–10

**Acceptance:**
- [x] `node tests/gates.test.js` exit 0 — 기존 (a)–(j) 단정 무수정 green + 신규 pptxx 섹션 전부 green — 73 ok / 0 FAIL / exit 0
- [x] `git diff --stat` 출력이 정확히 5개 파일: `hooks/hooks.json`, `hooks/scripts/deck-gate.js`(new), `hooks/scripts/lib.js`, `hooks/scripts/stop-gate.js`, `tests/gates.test.js` — 4 modified + deck-gate.js untracked(new), 계획 파일 외 여타 변경 없음
- [x] `git diff -- hooks/scripts/route-intent.js` 출력 0줄; `git status` 에 `skills/`·`agents/` 신규 파일 없음 — route-intent diff 0줄, skills/·agents/ 무변경
- [x] `grep -c "CLAUDE_PLUGIN_ROOT" hooks/hooks.json` == 0 — count 0 (`${ZCODE_PLUGIN_ROOT}` 사용)

---

## §0 계약 준수 표 (마일스톤 시나리오 → 테스트 체크 이름)

review-work 는 이 표의 체크 이름을 `tests/gates.test.js` 및 실행 출력에서 grep 으로 기계 대조한다.

| 시나리오 | 마일스톤 요구 | 테스트 체크 이름 | Task |
|---|---|---|---|
| ⓐ | `visual-qa`+봉인 없음→block | `pptxx (a) visual-qa no seals blocks` | 6 |
| ⓑ | 완비→통과 | `pptxx (b) all green passes` | 6 |
| ⓒ | visualQa required+수령증 없음→block | `pptxx (c) visualQa required + no receipt blocks` | 8 |
| ⓓ | false→불요구 | `pptxx (d) visualQa not required passes` | 8 |
| ⓔ | required=1 누락/REJECT→block; APPROVE+매니페스트→통과 | `pptxx (e1) …missing receipt blocks` / `(e2) REJECT receipt blocks` / `(e3) APPROVE + matching manifest passes` | 9 |
| ⓕ | 0→불요구; required=0+attributions 미존재+2파일 봉인→통과 | `pptxx (f1) imagePanel 0 not required` / `(f2) required=0 + no attributions + 2-file seal passes` | 9 |
| ⓖ | done 4분지 (+stopBlocks 캡 1줄) | `pptxx (g1) done without deck is silent` / `(g2) done with deck + green seals passes` / `(g3) done with deck + broken seal blocks` / `(g4) done + armed flag + no receipt blocks` | 6 |
| ⓗ | awaiting-user→통과(가드-순서) | `pptxx (h) awaiting-user passes (guard-order regression)` | 6 |
| ⓘ | slides.md→봉인+도식 무장 | `pptxx (i) slides.md write arms visualQa` | 7 |
| ⓘ′ | index.html 로컬 이미지→required=1 래칫 | `pptxx (i2) index.html local image ref ratchets imagePanel` | 7 |
| ⓙ | PNG·shots/ 제외 | `pptxx (j) deck png and shots excluded` | 7 |
| ⓚ | index.html→visualQa.round 만(불변 단정); attributions→imagePanel.round 만 | `pptxx (k1) index.html re-edit bumps only visualQa.round` / `(k2) attributions.md edit bumps only imagePanel.round` | 7 |
| ⓛ | 원장 backed→통과, unbacked→block | `pptxx (l1) ledger-backed receipt passes` / `(l2) unbacked receipt blocks` | 8 |
| ⓜ | sha 불일치/비허용 라이선스/서브디렉토리 | `pptxx (m1) sha256 mismatch blocks` / `(m2) disallowed license without user-confirmed blocks` / `(m3) …user-confirmed passes` / `(m4) unmanifested subdirectory image blocks` (+통과측은 e3) | 9 |
| ⓝ | script·원격 src 봉인 거부→block; `<a href>`·텍스트 URL OK | `pptxx (n1) <script> refuses seal` / `(n2) remote src refuses seal, stop blocks` / `(n3) attribution link and text URL seal OK` | 10 |
| ⓞ | 초기 status 정차→무차단 | `pptxx (o) early statuses pass` | 6 |
| ⓟ | 무장+deck 부재→fail-closed block | `pptxx (p) armed without deck fail-closed blocks` | 6 |
| planKey | 절대/상대 동일 키, decks .md/.html 만 | `planKey decks: *` 4건 | 5 |

## Plan Notes

- **M1 교차 계약:** `DIAGRAM_MARKER`(C-2)와 visual-qa 면제 필드(C-7 #2)는 M1/M4 산출물과 문자열 일치 필요 — **M3 착수 시 교차 검증**이 후속 마일스톤 체크리스트 항목이다.
- **M4 컨틴전시:** draft-v4 상 M4가 stop-gate 수령증 분기를 조정할 수 있으나 "기존 단정 무수정" 제약 — 본 계획의 체크 이름·기대값이 그 앵커다.
- ⓖ 근거: `stopBlocks>=6` 캡은 의도된 하우스 탈출구(hammer 선례 동일) — Task 6 주석으로 영속.
