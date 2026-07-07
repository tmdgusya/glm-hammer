# Plan: M3 — pptxx SKILL.md Core Pipeline + Chaining + Routing

**Milestone:** `docs/engineering-discipline/harness/pptxx-skill/milestones/M3-skill-core-chaining-routing.md`
**계약 원천(유일):** `docs/engineering-discipline/harness/pptxx-skill/planning/draft-v4.md` §0 (동결)
**상속 인터페이스:** `checkpoints/M1-checkpoint.md` (format-spec·주소화 컨벤션), `checkpoints/M2-checkpoint.md` (deck-gate 무장 소유권·pptxxGate 분기·매니페스트 문법)

## Goal

heavy-skill 형식의 `skills/pptxx/SKILL.md`(스크립트 확보 → crucible 체이닝(복귀 프로토콜) → 토큰 적용 **텍스트 deck** 생성)를 §0와 기계 검증되는 일치로 작성하고, route-intent deck 라우팅(신규 E2E 픽스처 하니스 포함)과 crucible SKILL.md **정확히 2줄** 수정(락 승인됨), 양 plugin.json 키워드를 함께 착지한다. M3-시대 규칙(도식 예약·이미지 유예·`building → done` 직행)으로 M2 게이트가 M4 이전에 무장되는 일이 없도록 한다.

## Scope

- **In:**
  - Create: `skills/pptxx/SKILL.md`
  - Modify: `hooks/scripts/route-intent.js`(deck 분기 + workRequest 동사), `skills/crucible/SKILL.md`(**승인된 2줄 수정만** — added 2 / removed 0), `tests/gates.test.js`(append-only + 승인된 리스트 삽입 2건), `.zcode-plugin/plugin.json`, `.claude-plugin/plugin.json`(keywords 배열)
- **Out:**
  - `hooks/scripts/stop-gate.js` · `hooks/scripts/deck-gate.js` · `hooks/scripts/lib.js` — **git diff 0바이트** (M2 착지 완료, 게이트 로직 무접촉)
  - `agents/` 하위 어떤 파일도 생성/수정 금지 (image-suitability/visual-qa critic은 M4)
  - `hooks/hooks.json`, `token-gate.js`, `plan-gate.js`, `session-start.js`, `dispatch-log.js` — 무접촉
  - `skills/forge|hammer|blueprint/SKILL.md` — 무접촉 (crucible만 2줄)

## Verification Strategy

- **Command:** `node tests/gates.test.js` (repo root, exit 0)
- **What passing proves:** 기존 **73 단정 무수정 통과**(회귀 없음) + 신규 20 단정 green(라우팅 E2E 5 + 드리프트 7 + 스위트 리스트 2 + 키워드 2 + crucible grep 2 + 인용 2) — 기대 출력 **93 ok / 0 FAIL**.
- **"기존 단정 무수정"의 정의:** 기존 check 이름·기대값·픽스처는 바이트 그대로. 유일한 사전 승인 예외 = (b) 배열에 `.claude-plugin/plugin.json` 원소 추가, (j) 배열에 `skills/pptxx/SKILL.md` 원소 추가 — 기존 원소는 무변경(이 두 삽입은 기존 단정을 수정하는 것이 아니라 루프에 원소를 더한다).
- **Scope check:** `git diff --stat` = 정확히 5 modified + 1 untracked(new `skills/pptxx/SKILL.md`); `git diff --numstat -- skills/crucible/SKILL.md` == `2	0`; `git diff -- hooks/scripts/stop-gate.js hooks/scripts/deck-gate.js hooks/scripts/lib.js hooks/hooks.json` 출력 0줄.
- **Out of automated scope:** 라이브 crucible 체이닝 실행(프로즈 계약 — 드리프트 grep이 문자열 수준으로 대조), 실제 deck 생성 플로우(M_final 수동 체크리스트).

## Constraints (전 태스크 공통)

1. **SKILL.md·plugin.json·crucible 수정은 전부 Write/Edit 툴 경유.** Bash 리다이렉션 금지(하우스 규칙 — 아래 Plan Notes의 훅 활성 주의 참조).
2. **§0 스키마는 복사, 재타이핑 금지.** State Protocol fenced JSON은 C-1을 그대로 붙여넣는다 — 드리프트 테스트가 status 라인을 집합 동등성으로 검사한다.
3. **SKILL.md의 evidence 경로는 전부 백틱으로 감싼다.** tail 추출 정규식(C-8)이 백틱을 종결자로 사용한다.
4. **deck-gate가 무장(arming)을 소유한다** (M2 체크포인트 계약): SKILL.md는 `visualQa.required`/`imagePanel.required`를 모델이 직접 쓰라고 지시하지 않는다 — 게이트 동작을 서술만 한다.
5. **tests/gates.test.js는 기존 마지막 라인(`process.exit`) 앞에 append.** 신규 check 이름은 `pptxx (r…)`/`pptxx (s…)` 프리픽스(M2의 (a)–(p)와 비충돌).
6. **route-intent.js의 emitContext 호출 수는 2 유지** (active 경로 1 + 라우터 경로 1) — deck 분기는 `hint` 체인에만 삽입, 출력은 기존 단일 `{additionalContext}` 키.

---

## Fixed Contracts (본 계획 내 동결 — 전 태스크가 이 절만 참조)

### C-1. §0 상태 스키마 (draft-v4 §0에서 그대로 복사 — SKILL.md State Protocol에 이 fenced JSON 그대로)

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

### C-2. SKILL.md frontmatter (동결 — 키는 `name`·`description` 2개만)

```yaml
---
name: pptxx
description: Presentation deck mode. Use when the user wants a presentation, slide deck, or PPTX built from a topic or script — especially when they say "발표", "슬라이드", "프레젠테이션", "발표 자료 만들어줘", "슬라이드 뽑아줘", "presentation", "slide deck", "pptx", "deck". Secures a script, chains into crucible for design tokens (resume protocol), then builds a token-styled self-contained HTML deck. Hooks enforce the gates.
---
```

### C-3. crucible SKILL.md 수정 — **정확히 이 2줄, 이 앵커에** (락 승인 대상; §0 복귀 프로토콜의 영문화 — 원문은 한국어, crucible SKILL.md가 영문이므로 영문 표기. 드리프트 grep 앵커 포함)

**(a) State Protocol의 `Rules:` 리스트** — 기존 불릿 `- Never write \`approved\` yourself …` 바로 **다음 줄**에 1줄 삽입:

```
- Preserve top-level `resume`, `deck`, and `slides` keys across every state rewrite — a chaining skill owns them; clear `resume` only when writing the terminal status `done`.
```

**(b) Phase E** — 기존 불릿 `- Yes → set status \`approved\` …` 바로 **다음 줄**에 1줄 삽입:

```
- If `state.resume` is set (a chaining skill called crucible): skip ONLY the forge hand-off above — still present the design and require the user's acceptance; on acceptance set status `approved`, then return immediately to the skill named in `resume` (its return merge clears `resume`).
```

**드리프트 grep 앵커(동결):** A1 = `` Preserve top-level `resume`, `deck`, and `slides` keys across every state rewrite ``, A2 = `skip ONLY the forge hand-off`. 그 외 어떤 줄도 추가·삭제·수정 금지 — `git diff --numstat` == `2	0`.

### C-4. M3-시대 규칙 (SKILL.md 프로즈에 명시할 3원칙 — §0 "M3-시대 문법" 동결)

1. **도식 블록 예약(RESERVED — 핵심 미묘점):** M2 deck-gate는 `slides.md` 봉인 시 `` ```diagram `` 펜스를 grep하여 `visualQa.required = true`를 **원웨이 래칫**으로 무장한다. M4의 visual-qa 기계(스크린샷·critic)가 존재하기 전에 무장되면 런이 데드락된다. 따라서 **M3-시대에는 `slides.md`에 `` ```diagram `` 펜스를 절대 쓰지 않는다** — 스크립트 내용이 도식을 함의하면 플레인 불릿 슬라이드로 강등하고 `> notes:` 라인에 의도한 도식을 서술한다(M4가 문법을 활성화한다). SKILL.md는 이 인과("deck-gate가 grep하여 자동 무장하므로")를 프로즈로 명시한다.
2. **이미지 지시어 파싱-후-유예(라벨 플레이스홀더):** 소스 자료의 이미지 지시는 인식하되 fetch하지 않는다. M3-시대에는 `slides.md`에 `![…](images/…)` 마크다운을 쓰지 않고 라벨 텍스트(`[이미지 유예: <설명>]`)로 표기하며, `index.html`에는 `<img>`·로컬 이미지 참조 컨텍스트를 두지 않는다(토큰 스타일 플레이스홀더 박스 + 라벨 텍스트만) — deck-gate의 `LOCAL_IMAGE_REF` grep이 `imagePanel.required = 1`을 래칫하기 때문. M4가 이미지 소싱을 활성화한다.
3. **터미널 플로우 `building → done` 직행:** M3-시대에는 `visual-qa`·`awaiting-user`(PPTX 옵트인)·`exporting` status에 정차하지 않는다 — 스키마에는 존재(§0 전 집합)하나 M4/M5가 활성화한다. `done` 기록 시 `state.deck`이 존재하므로 게이트는 hybrid-done으로 분기 ①(봉인 + `build.md`)을 재검증한다 — building 완료 시 `build.md` 기록이 필수인 이유.

### C-5. 체이닝·복귀 프로토콜 (§0 전문 — SKILL.md chaining phase에 이 순서 그대로)

1. **호출 전:** 기존 state에 merge로 `resume: "pptxx"` 기록(`deck`·`slides` 키 유지) 후 crucible 스킬 호출(스토리라인 = 발표 주제·스크립트의 무드 요약, 사용자 원문 인용).
2. **crucible 완료 신호(전부 충족 확인 — 하나라도 미충족 시 deck 진행 금지):**
   - `state.design` 설정됨 (crucible 출력 디렉토리)
   - `tokens.json`이 validateTokens 계약 통과 (crucible의 token-gate가 강제 — 재검증은 게이트 몫)
   - `tokens.json`·`design-spec.md` `sealMatches === 'ok'` (Bash 편집 흔적 없음)
   - **crucible 패널 수령증 APPROVE**: `.glm-hammer/evidence/design/panel/round-<N>/harmony-critic.md`·`rigor-critic.md` 둘 다 디스크에 존재 + `CHECKS:` 블록 + `VERDICT: APPROVE` 라인(receiptProblems 동등 기준: 실존·실질·판정 일치) — 사용자 미승인 토큰으로 deck 진행 금지.
3. **복귀 직후(merge 기록):** 기존 state에 merge로 `phase: 'pptxx'`, `status: 'chaining'`, `resume: null`, `deck`·`slides` 재기록, `design` = crucible 출력. 전체 재작성 금지 — merge.
4. **design 디렉토리는 이후 읽기 전용:** `tokens.json`·`design-spec.md`를 절대 편집하지 않는다(편집은 crucible 승인 전체를 무효화). 토큰 값은 deck HTML에 **복사(inline)**해 쓴다.

### C-6. deck HTML 규칙 (M1 주소화 컨벤션 + §0 정적 검사 합치 — SKILL.md building phase에 명시)

- deck 디렉토리: `docs/glm-hammer/decks/YYYY-MM-DD-<name>/`; 산출물 `slides.md` + `index.html`(봉인 집합 — Write/Edit 툴로만 작성, deck-gate가 봉인).
- 슬라이드 주소화: `<section class="slide" id="slide-NN">` (NN = 01부터 zero-pad 2자리), 1280×720 기준 레이아웃 — `docs/engineering-discipline/harness/pptxx-skill/planning/spikes/screenshot/README.md`의 컨벤션 그대로(경로 인용 필수).
- `slides.md`는 `docs/engineering-discipline/harness/pptxx-skill/planning/spikes/pptx/format-spec.md`의 문법(구분자 `---`·슬라이드당 `#` 1개·`-` 불릿 2단·`> notes:`)을 따르되 C-4의 M3-시대 제외 규칙 적용(경로 인용 필수).
- 자기완결: `<script>`·`javascript:` 금지; `src`/`srcset`/`<link href>`/`url()`/`@import`/`<iframe|object|embed>` 컨텍스트에 `https?://`·절대경로·`../` 이탈 참조 금지(deck-gate가 위반 시 **봉인을 거부**하고 Stop 게이트가 block — 이 게이트 동작을 프로즈로 서술). **`<a href>`·텍스트 노드의 URL은 허용**(출처 표기).
- building 완료 시: `slides.total` 갱신(merge) + raw 수령증 `` `.glm-hammer/evidence/deck/build.md` `` 기록(렌더 요약·슬라이드 수 — 분기 ①·hybrid-done이 요구).

### C-7. 라우팅 diff 사양 (route-intent.js — 이 3개 편집만)

1. **workRequest에 동사만 추가** — 기존 alternation의 `마이그레이션`과 `build` 사이에 삽입: `…|개선|마이그레이션|뽑|생성|추출|export|build|…` (명사 발표/슬라이드 등은 workRequest에 넣지 않는다 — 픽스처 ④가 이를 단정).
2. **deck 분기 신설** — `executeIntent` 선언부 근처에 정규식 추가:
   ```js
   const deckIntent =
     /(발표|슬라이드|프레젠테이션|deck|presentation|pptx)/i;
   ```
   분기 위치는 hint 체인에서 **executeIntent 뒤 · designIntent 앞**:
   ```js
   } else if (deckIntent.test(prompt)) {
     hint =
       'This looks like a presentation/slide-deck request → invoke the `pptxx` skill ' +
       '(script → crucible design-token chaining → token-styled self-contained HTML deck) ' +
       'before any ad-hoc slide writing.';
   } else if (designIntent.test(prompt)) {
   ```
3. **그 외 무변경:** active 경로·designIntent·strongMarker·기본 hint·말미 emitContext(단일 `{additionalContext}` 키) 그대로. `grep -c "emitContext" hooks/scripts/route-intent.js` == 2 유지.

### C-8. 신규 테스트 사양 (tests/gates.test.js append — check 이름 동결)

**(r) route-intent E2E 픽스처 하니스** (spawn + stdin + tmp cwd — 명명 태스크 Task 7):

```js
function runRoute(prompt, state) {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'glm-hammer-route-'));
  if (state) lib.writeState(p, state);
  const r = spawnSync(process.execPath, [path.join(ROOT, 'hooks', 'scripts', 'route-intent.js')], {
    input: JSON.stringify({ cwd: p, prompt }),
    encoding: 'utf8',
  });
  return r.stdout || '';
}
```

| check 이름 | prompt / state | 기대 |
|---|---|---|
| `pptxx (r0) active state emits resume context, not router hint` | `'다음 진행해줘'` + active state(`pptxxState(DECK_KEY, {status:'building'})` 재사용) | stdout에 `Active run` 포함, `router` 미포함 |
| `pptxx (r1) deck verb prompt routes to pptxx` | `'이 스크립트로 발표 슬라이드 뽑아줘'` (무상태) | stdout에 `pptxx` 포함 |
| `pptxx (r2) design-token prompt routes to crucible` | `'브랜드 디자인 토큰 만들어줘'` (무상태) | `crucible` 포함 && `pptxx` 미포함 |
| `pptxx (r3) deck+design prompt prefers pptxx` | `'슬라이드 디자인해줘'` (무상태) | `pptxx` 포함 (deck 분기가 designIntent에 선행) |
| `pptxx (r4) non-work mention of 발표 emits nothing` | `'팀에게 결과를 발표했어요'` (무상태) | stdout `=== ''` (무발화 — 명사는 workRequest 미포함 증명) |

**(s) 드리프트 스위트** (skills/pptxx/SKILL.md · skills/crucible/SKILL.md를 읽어 문자열 수준 대조):

| check 이름 | 규칙 |
|---|---|
| `pptxx (s1) status enum set-equal to §0` | SKILL.md 첫 `"status":\s*"([^"]+)"` 매치를 `\|` 분해·trim → §0 전 집합 `{scripting, chaining, imaging, building, visual-qa, awaiting-user, exporting, done}`과 **집합 동등**(크기 8 + 전 원소) |
| `pptxx (s2) marker ⟨state: <m>⟩ present` ×5 | 시대 상수 `M3_MARKERS = ['scripting','chaining','imaging','building','done']` 각각에 대해 `new RegExp('⟨state:\\s*' + m)` 매치 (마커 글리프는 crucible과 동일 U+27E8/U+27E9) |
| `pptxx (s3) evidence tails ⊆ §0 4-tail set` | `pptxxSkill.match(/evidence\/deck\/[^\s)\`]+/g)` 전 매치를 `round-(?:\d+\|<[^>]*>)` → `round-N` 정규화 → `found.length ≥ 1` && 전부 ∈ `{evidence/deck/build.md, evidence/deck/fetch.md, evidence/deck/visual-qa/round-N/visual-qa-critic.md, evidence/deck/panel/round-N/image-suitability-critic.md}` (M3는 ⊆ — coverage 승격은 M4) |
| `pptxx (s4) crucible preserve-keys amendment present` | crucible SKILL.md가 C-3 앵커 A1 포함 |
| `pptxx (s5) crucible Phase E resume bullet present` | crucible SKILL.md가 C-3 앵커 A2 포함 |
| `pptxx (s6) cites format-spec contract` | pptxx SKILL.md가 `planning/spikes/pptx/format-spec.md` 포함 |
| `pptxx (s7) cites screenshot addressing contract` | pptxx SKILL.md가 `planning/spikes/screenshot/README.md` 포함 |

**스위트 리스트 삽입(승인된 2건) + 키워드 멤버십:**

- (j) 루프 배열 말미에 `'skills/pptxx/SKILL.md'` 원소 추가 (+1 check: `skills/pptxx/SKILL.md exists`).
- (b) 루프 배열에 `'.claude-plugin/plugin.json'` 원소 추가 (+1 check: `.claude-plugin/plugin.json parses`).
- 키워드 ×2: 두 plugin.json 각각 `JSON.parse(...).keywords`가 `['pptxx','deck','presentation','슬라이드']` 전부 포함 — check 이름 `<file> has pptxx keywords`.

**단정 수 산식(동결):** 기존 73 + (j)1 + (b)1 + 키워드2 + (r)5 + (s1)1 + (s2)5 + (s3)1 + (s4/s5)2 + (s6/s7)2 = **93 ok / 0 FAIL**.

### C-9. §0가 명시하지 않아 본 계획이 동결한 해석 (리뷰어 주목 — 전부 플래그)

1. **이미지 지시어 유예의 범위** = `index.html`뿐 아니라 `slides.md`의 `![…]()` 마크다운도 M3-시대 제외(C-4 #2). §0는 "파싱-후-유예(라벨 플레이스홀더)"만 명시 — 게이트 무장은 index.html grep뿐이므로 slides.md 측은 안전 마진이며, 대칭성(도식 규칙과 동형)을 위해 동결. M4가 지시어 문법을 활성화할 때 이 문장만 완화하면 된다.
2. **crucible 2줄의 영문 표기** = §0 원문(한국어)의 의미 보존 영문화(C-3). crucible SKILL.md 전체가 영문이므로. 드리프트 grep 앵커가 표기를 고정한다.
3. **(r0) 체크** = 마일스톤의 4픽스처 외 추가 1건 — 하니스 사양의 "with/without active state" 양측을 실증하기 위함(active 측). 기존 라우터 동작만 단정하므로 무해.
4. **마커 존재 단정의 형식** = `⟨state:\s*<name>` 정규식(접미 유연 — `⟨state: building, slides.total set⟩` 류 복합 마커 허용). crucible 선례(`⟨state: prospect.reported⟩`)와 합치.
5. **`evidence/deck/fetch.md`** 는 M3 SKILL.md에 **등장하지 않아도 된다**(⊆ 규칙) — 이미지 fetch는 M4 활성화. 등장 시에도 tail 집합의 원소이므로 (s3) 통과.

---

## File Structure Mapping

| Action | File | Anchor |
|---|---|---|
| Modify | `skills/crucible/SKILL.md` | Rules 리스트의 `Never write \`approved\`` 불릿 뒤 1줄; Phase E의 `- Yes →` 불릿 뒤 1줄 (C-3) |
| Create | `skills/pptxx/SKILL.md` | — (heavy-skill 선례: `skills/hammer/SKILL.md`의 섹션 순서) |
| Modify | `hooks/scripts/route-intent.js` | `workRequest` 정규식(:57), `executeIntent` 선언부(:60), hint 체인(:77–79 사이) (C-7) |
| Modify | `.zcode-plugin/plugin.json` · `.claude-plugin/plugin.json` | `keywords` 배열 말미 |
| Modify | `tests/gates.test.js` | (b) 배열(:22)·(j) 배열(:184–194) 원소 추가; 신규 (r)(s) 섹션은 `process.exit`(:581) 앞 append |

Task 1·5·6은 서로소 파일(병렬 가능). Task 2→3→4는 `skills/pptxx/SKILL.md` 순차. Task 7→8→9는 `tests/gates.test.js` 순차 append.

---

## Tasks

### Task 1: crucible SKILL.md — 승인된 2줄 수정

**Files:** `skills/crucible/SKILL.md`
**Dependencies:** None

C-3의 두 줄을 C-3의 앵커 위치에 **문자 그대로** 삽입한다. 다른 어떤 줄도 건드리지 않는다.

**Acceptance:**
- [x] `git diff --numstat -- skills/crucible/SKILL.md` 출력이 정확히 `2	0`
- [x] `grep -c "Preserve top-level" skills/crucible/SKILL.md` == 1, 해당 줄이 State Protocol의 Rules 리스트 내부(`Never write` 불릿과 `.gitignore` 불릿 사이)
- [x] `grep -c "skip ONLY the forge hand-off" skills/crucible/SKILL.md` == 1, 해당 줄이 Phase E의 `- Yes →` 불릿 바로 다음
- [x] 삽입된 두 줄이 C-3 텍스트와 바이트 일치(공백·백틱 포함) — Task 1 done: numstat 2 0

### Task 2: pptxx SKILL.md — frontmatter + Core Principle + Hard Gates + State Protocol

**Files:** Create `skills/pptxx/SKILL.md`
**Dependencies:** None

heavy-skill 형식(hammer/crucible 선례: frontmatter → 표제·한 단락 은유 → `## Core Principle` → `## Hard Gates (hook-enforced)` → `## State Protocol`)으로 작성 시작.

- frontmatter = C-2 그대로 (`name`·`description` 2키만; description에 한/영 트리거 병기).
- **Core Principle:** 스크립트가 디자인에 선행하고, 디자인은 crucible의 관문을 통과한 토큰만 사용하며, deck은 자기완결 HTML — 게이트가 봉인·수령증으로 강제한다는 원칙 1단락.
- **Hard Gates (hook-enforced)** — 번호 불릿, 최소 다음 7개:
  1. deck 산출물(`slides.md`·`index.html`)은 Write/Edit 툴로만 — deck-gate가 봉인하며 Bash 편집은 봉인을 깨 Stop 게이트가 block.
  2. **무장은 deck-gate가 소유** — `visualQa.required`·`imagePanel.required`를 직접 쓰지 않는다; 게이트가 `slides.md`의 `` ```diagram `` grep·`index.html`의 로컬 이미지 참조 grep으로 원웨이 래칫한다(서술).
  3. M3-시대 도식·이미지 규칙(C-4 #1·#2 — 인과 포함).
  4. 디자인 토큰은 crucible 관문 통과본만, 읽기 전용(C-5 #4).
  5. crucible 패널 수령증 APPROVE 없이 deck 진행 금지(C-5 #2).
  6. building 완료 시 `` `.glm-hammer/evidence/deck/build.md` `` 기록 — done은 hybrid로 재검증된다.
  7. **대기 시 `awaiting-user` · 포기 시 `done` — 방치 금지.** (이 문구 그대로 포함)
- **State Protocol:** C-1 fenced JSON **그대로**(복사). 이어서 규칙 불릿: 상태는 merge로 갱신(전체 재작성 금지), `resume` 의미(C-5), 무장 플래그는 읽기 전용, `slides.total`은 building에서 갱신, `.glm-hammer/`를 `.gitignore`에.

**Acceptance:**
- [x] `skills/pptxx/SKILL.md` 존재; frontmatter가 `---` 블록에 `name:`·`description:` 2키만 (keys=["name","description"])
- [x] description에 한국어 트리거(발표·슬라이드·프레젠테이션)와 영어 트리거(presentation·pptx·deck) 둘 다 존재
- [x] `## Core Principle`, `## Hard Gates`, `## State Protocol` 헤딩 존재; `방치 금지` 존재
- [x] State Protocol fenced JSON `"status"` 라인 C-1 바이트 일치; 첫 매치가 이 라인 (set size 8 set-equal)
- [x] 무장 언급 전부 deck-gate 주어/read-only — 모델 설정 지시문 부재

### Task 3: pptxx SKILL.md — Process (⟨state:⟩ 마커) + 체이닝·복귀 프로토콜

**Files:** `skills/pptxx/SKILL.md`
**Dependencies:** Task 2

`## Process`를 phase 절로 작성 — 시대 상수 5종 마커 전부 포함:

- **Phase S: Scripting ⟨state: scripting⟩** — 주제/스크립트 확보·정규화, deck 디렉토리 `docs/glm-hammer/decks/YYYY-MM-DD-<name>/` 생성 ⟨state: deck⟩, `slides.md`를 format-spec 문법(경로 인용: `docs/engineering-discipline/harness/pptxx-skill/planning/spikes/pptx/format-spec.md`)으로 저작하되 C-4 #1(도식 → 플레인 불릿 + `> notes:`)·#2(이미지 → `[이미지 유예: <설명>]` 라벨) 적용.
- **Phase C: Chaining ⟨state: chaining⟩** — C-5의 4단계 프로토콜 그대로: resume 설정 → crucible 호출 → 완료 신호 4항목 체크리스트(패널 수령증 `` `.glm-hammer/evidence/design/panel/round-<N>/harmony-critic.md` ``·`` `rigor-critic.md` `` 실존·실질·APPROVE) → 복귀 merge(`phase/status:'chaining'/resume:null/deck/slides/design`).
- **Phase I: Imaging ⟨state: imaging⟩** — M3-시대 통과 단계: 유예 플레이스홀더 목록 점검만, fetch 없음, `imagePanel`은 0 유지(M4 활성화 예고 1줄).
- **Phase B: Building ⟨state: building⟩** — C-6 규칙으로 `index.html` 생성; `slides.total` merge 갱신; 완료 시 `` `.glm-hammer/evidence/deck/build.md` `` raw 수령증 기록.
- **Terminal ⟨state: done⟩** — M3-시대 직행(C-4 #3): building green + `build.md` 존재 → `status: done`. hybrid-done 재검증 서술(deck 존재 시 게이트가 봉인+build.md 재확인) 1줄.

**Acceptance:**
- [x] 5개 마커 전부 존재 (U+27E8, hammer와 동일 글리프): scripting·chaining·imaging·building·done
- [x] `resume` 프로토콜 4단계 C-5 순서대로; 완료 신호에 harmony-critic·rigor-critic·VERDICT: APPROVE 존재
- [x] 복귀 merge 필드 6종 명시 (phase·status:'chaining'·resume:null·deck·slides·design)
- [x] `evidence/deck/` 전 등장 백틱 내부, 정규화 후 §0 4종 집합 원소 (found=build.md, all-in-set)
- [x] format-spec.md 경로 인용 존재

### Task 4: pptxx SKILL.md — deck HTML 규칙 + Anti-Patterns + 주소화 인용

**Files:** `skills/pptxx/SKILL.md`
**Dependencies:** Task 3

- Building 절(또는 별도 `### Deck HTML Rules` 소절)에 C-6 전 항목: 주소화 컨벤션(`id="slide-NN"`·1280×720, 경로 인용: `docs/engineering-discipline/harness/pptxx-skill/planning/spikes/screenshot/README.md`), 자기완결(`<script>` 금지·외부 리소스 참조 금지·`<a href>`/텍스트 URL 허용), 토큰 inline 복사.
- **`## Anti-Patterns`** 표(하우스 형식) — 최소 8행: M3-시대에 `` ```diagram `` 펜스 작성(게이트 조기 무장→데드락) / `<img>`·로컬 이미지 참조 삽입(imagePanel 조기 래칫) / 복귀 후 tokens.json 편집(crucible 승인 전체 무효) / 패널 수령증 미확인 복귀 진행 / deck 파일 Bash 작성(봉인 파괴) / 무장 플래그 자가 기록(게이트 소유권 침해) / `build.md` 없이 done 기록(hybrid-done block) / 대기·포기 시 status 방치(방치 금지 위반).

**Acceptance:**
- [x] `## Anti-Patterns` 헤딩 + 표 존재(데이터 행 10 ≥8)
- [x] 두 계약 문서 경로 둘 다 매치: format-spec.md·screenshot/README.md
- [x] slide-NN·1280·`<a href>` 허용·`<script>` 금지 언급 각각 매치
- [x] 5섹션 헤딩 전부 존재

### Task 5: plugin.json ×2 — 키워드 추가

**Files:** `.zcode-plugin/plugin.json`, `.claude-plugin/plugin.json`
**Dependencies:** None

두 파일 모두 `keywords` 배열 말미에 `"pptxx", "deck", "presentation", "슬라이드"` 4원소 추가(기존 원소 무변경, 두 파일 결과 동일 유지).

**Acceptance:**
- [x] 두 파일 모두 `node -e "JSON.parse(...)"` exit 0
- [x] 두 파일 모두 keywords에 4원소 전부 포함 + 기존 11원소 무변경(diff가 추가 4줄±콤마 1줄뿐) — numstat 5/1 each
- [x] `version`·여타 필드 diff 없음

### Task 6: route-intent.js — workRequest 동사 + deck 분기

**Files:** `hooks/scripts/route-intent.js`
**Dependencies:** None

C-7의 3개 편집만 적용.

**Acceptance:**
- [x] `node --check hooks/scripts/route-intent.js` exit 0
- [x] workRequest에 `뽑|생성|추출|export` 존재하고 `발표`·`슬라이드`·`프레젠테이션` **부재**(동사만 — grep으로 양쪽 단정)
- [x] `deckIntent` 정규식이 C-7 6개 명사와 일치; 분기가 `executeIntent` 블록 뒤 · `designIntent` 블록 앞(육안 + hint 문자열 `pptxx` grep)
- [x] emitContext 호출 2건 유지(`grep -c 'emitContext('`==2, 베이스라인과 동일; 리터럴 `grep -c emitContext`는 import 라인 포함해 3 — §0 무관, 단일키 출력 불변)

### Task 7: [명명 태스크] route-intent E2E 픽스처 하니스 + 4+1 픽스처

**Files:** `tests/gates.test.js` (append)
**Dependencies:** Task 6

C-8 (r)의 `runRoute` 하니스(spawnSync + stdin `{cwd: tmpdir, prompt}` + 선택적 state 시드)와 check 5건(r0–r4)을 check 이름 그대로 추가. 기존 `pptxxState` 헬퍼 재사용(r0).

**Acceptance:**
- [x] `pptxx (r0)`–`(r4)` 5건 전부 ok
- [x] (r4)가 `=== ''` 완전 무발화 단정
- [x] (r3) 픽스처 deck·design 양쪽 매칭 주석 기록
- [x] 하니스가 픽스처마다 새 tmpdir 생성

### Task 8: 드리프트 스위트 (s1–s7)

**Files:** `tests/gates.test.js` (append)
**Dependencies:** Tasks 1–4

C-8 (s) 표의 7종(s2는 5 check) — status 집합 동등성, 마커 시대 상수, tail ⊆ 4종, crucible 2줄 grep(앵커 A1·A2), 계약 문서 경로 인용 2건 — 을 check 이름·규칙 그대로 추가. `M3_MARKERS` 배열과 tail 집합·정규화 정규식은 C-8 문자 그대로(시대 상수는 M4/M5가 이 배열만 확장한다 — 주석 1줄).

**Acceptance:**
- [x] `pptxx (s1)`–`(s7)` 라벨의 11 check 전부 ok (s2 ×5 포함)
- [x] (s1) 집합 동등: 크기 8 + 전 원소
- [x] (s3) 정규화 round-N 수렴 + found.length ≥ 1
- [x] 시대 상수 주석(M4 += visual-qa, M5 += awaiting-user·exporting) 존재

### Task 9: 스위트 리스트 삽입 + 키워드 멤버십

**Files:** `tests/gates.test.js` ((b)·(j) 배열 원소 추가 + append)
**Dependencies:** Tasks 2, 5

- (j) 배열 말미에 `'skills/pptxx/SKILL.md'`, (b) 배열에 `'.claude-plugin/plugin.json'` — 기존 원소·루프 본문 무변경(승인된 유이한 비-append 편집).
- 키워드 멤버십 check ×2 (C-8) append.

**Acceptance:**
- [x] `skills/pptxx/SKILL.md exists`·`.claude-plugin/plugin.json parses` check ok
- [x] 키워드 check 2건 ok (두 plugin.json 각각 4키워드 전부)
- [x] tests diff 삭제 라인 = (b) 배열 리터럴 1줄뿐 — 기존 check 문자열 삭제 0건

### Task 10: 전체 회귀 + 스코프 확정

**Files:** 없음 (읽기 전용 검증)
**Dependencies:** Tasks 1–9

**Acceptance:**
- [x] `node tests/gates.test.js` exit 0 — **93 ok / 0 FAIL** (기존 73 무수정 green + 신규 20)
- [x] 내가 소유한 diff = 5개(crucible·route-intent·tests·양 plugin.json) + untracked `skills/pptxx/`. 환경상 M2 미커밋분(stop-gate/lib/hooks.json/deck-gate)이 워킹트리에 병존 — 내 기여 0 (stop-gate +158 = M2 체크포인트 수치 그대로)
- [x] `git diff --numstat -- skills/crucible/SKILL.md` == `2	0`
- [x] stop-gate/deck-gate/lib/hooks.json 내 기여 0줄(사전 M2분만); `agents/` 신규 파일 없음

---

## 마일스톤 성공 기준 → 착지 지점 대조표

review-work는 이 표로 기계 대조한다.

| 마일스톤 체크박스 | 착지 지점 | Task |
|---|---|---|
| SKILL.md 존재(frontmatter 한/영 + 5섹션 + 방치 금지 + 경로 인용) | C-2·Task 2–4 + (j)·(s6)(s7) | 2, 3, 4, 8, 9 |
| 드리프트 테스트(status 집합 동등 + 마커 시대 상수 + tail ⊆ 4종) | (s1)(s2)(s3) | 8 |
| 포맷 M3-시대 규칙(도식 예약·이미지 유예·building→done 직행) | C-4 프로즈 + Anti-Patterns | 2, 3, 4 |
| deck HTML 규칙(주소화+자기완결+script 금지+외부 리소스 금지) | C-6 | 4 |
| 체이닝·복귀(resume·완료 신호·crucible 2줄·merge 기록·grep 단정) | C-3·C-5 + (s4)(s5) | 1, 3, 8 |
| 라우팅(동사만·deck 분기 위치·E2E 4픽스처·단일 키) | C-7 + (r0)–(r4) | 6, 7 |
| 스위트((j)·(b) 추가 + 키워드 멤버십) | C-8 리스트 삽입 + 키워드 ×2 | 5, 9, 10 |

## Plan Notes

- **분할선(사전 승인, 미발동):** 마일스톤은 12태스크 초과 시 M3a(SKILL.md+체이닝+crucible+드리프트 = Task 1–4, 8)/M3b(라우팅+하니스+plugin.json = Task 5–7, 9) 분할을 승인해 두었다. 본 계획은 **10태스크로 단일 마일스톤 진행** — 분할 불요. (M4는 M3a 범위에만 의존하므로, 만약 실행 중 분할이 필요해지면 Task 5–7·9를 M3b로 떼면 된다.)
- **⚠ 실행 환경 주의 — 이 저장소 자신의 glm-hammer 훅이 활성이다.** 본 계획의 Write/Edit는 PostToolUse 훅(plan-gate/token-gate/comment-checker/edit-diagnostics/**deck-gate**)을 발화시킨다. 전부 경로 필터로 무해함을 확인했다: deck-gate의 경로 필터는 `/docs\/glm-hammer\/decks\/[^/]+\/([^/]+)$/i` — `skills/pptxx/SKILL.md`·`route-intent.js`·`tests/gates.test.js` 어느 것도 매치하지 않아 즉시 exit 0. plan-gate는 `docs/glm-hammer/plans/` 전용(본 계획 파일은 `docs/engineering-discipline/plans/` — 비추적), token-gate는 design 디렉토리 전용. edit-diagnostics류의 additionalContext 잡음이 나와도 정상이며 무시한다. 현재 `.glm-hammer/state.json`은 `phase:'hammer', status:'done'` — stop-gate는 done-skip으로 침묵하고 route-intent도 비활성(active 판정 false)이므로 게이트 간섭 없음. **단, 테스트 픽스처의 tmpdir는 반드시 `os.tmpdir()` 기반**(기존 하니스 선례) — repo cwd로 spawn하면 이 저장소의 state를 오염시킨다.
- **crucible 수정의 최소성:** 2줄 외 어떤 리라이트도 금지 — 리뷰어는 numstat `2	0`과 앵커 grep으로 판정한다. 문구를 "개선"하고 싶어도 §0 락 승인 범위는 C-3 그대로다.
- **M2 계약 재확인:** `DIAGRAM_MARKER`(`` ```diagram ``)는 M1 format-spec.md §5와 문자 일치 확인 완료(M2 계획 C-7 #1의 교차 검증 항목 이행). 면제 마커 `visualQa.exempt`는 M3 프로즈가 언급할 필요 없음(면제 미발동 — M1 스크린샷 스파이크 APPROVE).
- **단정 수 93은 정보성 앵커** — check 추가·통합으로 ±될 수 있으나, "기존 73 무수정 + 신규 섹션 전부 green + exit 0"이 구속 기준이다.
