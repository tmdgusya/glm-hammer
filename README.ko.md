# 🔨 glm-hammer

**📖 워크플로우 설명 페이지 → [tmdgusya.github.io/glm-hammer](https://tmdgusya.github.io/glm-hammer/)**
**📦 소스 & 이슈 → [github.com/tmdgusya/glm-hammer](https://github.com/tmdgusya/glm-hammer)**

**English → [README.md](README.md)**

glm-hammer는 대장장이가 강철을 제련하듯 계획을 빚습니다 — 광석을 캐고, 계획을 빚고, 설계도가 그려진 뒤에야 내려칩니다. ZCode / Claude Code 호환 엔지니어링 하네스 플러그인으로, 스킬 이름을 외우거나 프롬프트를 길게 치지 않아도 에이전트가 의도를 스스로 파악해 **강한 계획 → 검증 구현 → 보안/QA 리뷰**의 셀프 주행 루프를 돕니다.

[tmdgusya/engineering-discipline](https://github.com/tmdgusya/engineering-discipline)의 plan-crafting / run-plan / review-work / clarification 원칙을 기반으로 하되, **hooks가 게이트를 물리적으로 강제**하고 스킬들이 자동 체이닝된다는 점이 다릅니다. 증거 게이트·세션 복구·컨텍스트 압박 탈출구는 [lazycodex](https://github.com/code-yeongyu/lazycodex)(OmO)의 훅 시스템에서 가져왔습니다.

## 스킬

| 스킬 | 역할 |
|---|---|
| `blueprint` | 경량 계획. 작고 명확한 작업(≤3 파일)용. Self-Review 후 hammer로 핸드오프 |
| `crucible` | **디자인 토큰 제련 (선택 스테이지, forge 앞).** 스토리라인/레퍼런스 → 프로스펙팅 → W3C 디자인 토큰 → fidelity assay → **디자이너 2인 패널** 전원 승인 → forge로 핸드오프 |
| `forge` | **강한 계획.** 질문 전에 Explore 서브에이전트로 코드 정찰 → 최소 질문 → 실행 가능한 계획 초안 → **critic 3명 패널**(feasibility / integration / coverage)이 실제 코드베이스 대조로 전원 APPROVE할 때까지 수정-재심사 루프 |
| `hammer` | **구현 루프.** 태스크마다 worker → validator(정보 격리) → **implementation-critic**(스텁·하드코딩·리워드해킹 사냥) 3중 검증. 전체 완료 후 E2E 게이트 → **security-reviewer + qa-reviewer** 패널. FAIL이면 fix task로 변환해 루프 재진입 |

## crucible — 스토리라인 기반 디자인 토큰 스테이지

"이 무드로", "이 스토리 느낌으로" 같은 디자인 요청이 오면 forge 앞에 crucible이 먼저 돕니다:

```
crucible → forge → hammer
```

광석을 캐고(프로스펙팅), 도가니에서 제련하고(토큰), 합금을 검정한 뒤(assay), forge로 보냅니다:

1. **프로스펙팅** — `vein-reader`가 스토리라인을 방향 브리프로 번역 → color/type/layout/motion **프로스펙터 4명 병렬**로 실제 레퍼런스 채굴 (각자 증거 영수증 필수)
2. **제련** — `docs/glm-hammer/design/` 아래에 W3C 디자인 토큰 `tokens.json` + `design-spec.md` 작성
3. **게이트 3중** (hook 강제):
   - **token-gate** — 토큰 저장 즉시 결정적 검사(스키마·필수 그룹·WCAG 대비). 토큰/스펙 수정 시 assay·패널 승인 전체 리셋 + 콘텐츠 실 재기록
   - **fidelity assay** — `fidelity-critic`이 모든 토큰이 레퍼런스/방향 브리프로 소급되는지 대조 (지어낸 레퍼런스 차단)
   - **디자이너 2인 패널** — `harmony-critic`(아트 디렉터 렌즈) + `rigor-critic`(디자인 시스템 엔지니어 렌즈) 전원 APPROVE까지 수정-재심사 루프
4. **핸드오프** — 사용자 승인 1회("이 디자인으로 forge를 진행할까요?") 후 design-spec/tokens를 forge 계획의 선언 입력으로 넘김

## 에이전트

- `feasibility-critic` / `integration-critic` / `coverage-critic` — forge 계획 심사 패널 (각자 다른 렌즈, 전원 승인 필수)
- `implementation-critic` — validator 통과 후 "정말 구현했는가"를 깐깐하게 검증
- `security-reviewer` / `qa-reviewer` — 구현 완료 후 최종 리뷰 게이트

## Hooks (게이트 강제 장치)

hooks는 서브에이전트를 직접 띄울 수 없으므로, 스킬이 `.glm-hammer/state.json`에 상태를 기록하고 hook 스크립트가 이를 읽어 게이트를 강제합니다:

| Hook | 이벤트 | 동작 |
|---|---|---|
| `session-start.js` | SessionStart | 미완료 런이 있으면 재개 브리핑 주입 — 재시작/clear/컴팩션 후에도 "continue" 없이 루프 자동 복귀 |
| `route-intent.js` | UserPromptSubmit | 작업 요청으로 보이면 forge/blueprint/hammer 라우팅 지침 주입. 진행 중인 런이 있으면 현재 상태를 주입해 루프 복귀 유도 |
| `plan-gate.js` | PostToolUse (Write\|Edit) | 계획 파일 저장 시 **콘텐츠 실(seal, sha256) 기록**. forge 중 수정이면 critic 승인 0 리셋 → 전체 패널 재심사 강제. hammer 중이면 Amendment Log 기록 요구 |
| `dispatch-log.js` | PostToolUse (Agent\|Task) | 서브에이전트 디스패치 원장 — 디스패치 입력에 언급된 evidence 경로를 기록. stop-gate가 영수증의 디스패치 근거를 대조 |
| `comment-checker.js` | PostToolUse (Write\|Edit) | 방금 수정한 파일에서 AI 슬롭 주석 탐지: **elision 마커**("... existing code ..." — 파일 손상 신호), 변경 나레이션 주석("// added X"), placeholder 주석. 발견 즉시 같은 턴에서 수정 지시 |
| `edit-diagnostics.js` | PostToolUse (Write\|Edit) | 프로젝트 도구 진단: 프로젝트에 이미 설치된 검사기(로컬 `node_modules` + PATH 도구)를 발견해 수정 파일에 실행 — 깨진 코드를 E2E 게이트가 아니라 **수정 직후** 잡아냄. 상세는 아래 |
| `stop-gate.js` | Stop | state의 주장과 **증거 영수증을 대조**해 턴 종료를 차단. `awaiting-user`(정당한 에스컬레이션)만 통과 |

### Edit diagnostics — 프로젝트 도구 발견

`edit-diagnostics.js`는 OmO의 철학을 따릅니다 — *연결과 안내는 플러그인, 도구는 프로젝트가 공급한다*. Write/Edit 직후 프로젝트에 이미 있는 최적의 검사기를 발견해 수정된 파일에 실행합니다. 전부 fail-open: 도구가 없거나, 설정이 없거나, 도구 자체가 죽으면 조용히 스킵하고 — 진짜 발견(findings)만 같은 턴에 피드백으로 주입됩니다.

| 언어 | 발견 대상 |
|---|---|
| JS/TS | `node --check`(구문) + 로컬 `node_modules`의 biome / eslint / oxlint; `tsc --noEmit`(옵트인, 프로젝트 전체) |
| Python | PATH의 `ruff` → 없으면 `py_compile` 폴백; `pyright`(옵트인) |
| JSON | `JSON.parse` (tsconfig.json 같은 JSONC는 스킵) |
| Go | 파일이 속한 패키지에 `go vet` (상위에 `go.mod` 필요) |
| Shell | `bash -n` + `shellcheck` |
| Ruby / PHP / YAML / CSS | `ruby -c` / `php -l` / `yamllint` / 로컬 `stylelint` |

- Node 도구는 `.bin` 심이 아니라 실제 JS 엔트리(`node_modules/eslint/bin/eslint.js` 등)로 실행 — Windows `.cmd` 심 문제를 원천 회피합니다.
- exit code를 도구별로 해석: lint 발견(eslint/ruff는 1, stylelint는 2)만 보고하고, 도구·설정 오류는 파일 문제가 아니라 "스킵"으로 처리합니다.
- OmO와 마찬가지로 **검사기 본체는 번들하지 않습니다** — 프로젝트에 설치된 것만 쓰고, 없으면 침묵합니다.

`.glm-hammer/diagnostics.json`으로 선택 설정:

```json
{ "typecheck": true, "disable": ["eslint"], "timeoutMs": 15000 }
```

- `typecheck` — 느린 프로젝트 전체 검사기(`tsc --noEmit`, `pyright`) 활성화. 대형 저장소에서 hammer 루프 속도를 지키기 위해 **기본 OFF**이며, tsc 출력은 수정한 파일 관련 줄로 필터링됩니다.
- `disable` — 끌 검사기 이름 목록: `node-syntax`, `biome`, `eslint`, `oxlint`, `tsc`, `json`, `ruff`, `py-syntax`, `pyright`, `go-vet`, `bash-syntax`, `shellcheck`, `ruby-syntax`, `php-syntax`, `yamllint`, `stylelint`.
- `timeoutMs` — 검사당 타임아웃(ms, 기본 10000; 타입체커는 45000).

### ZCode 호환성 (엔진 실증 기준)

ZCode 설치본(`zcode.cjs` v3.2.x)과 내장 `diagnosing-hooks` 가이드로 직접 검증한 내용:

- 지원 이벤트는 **정확히 7개**: SessionStart, UserPromptSubmit, PreToolUse, PermissionRequest, PostToolUse, PostToolUseFailure, Stop. **SubagentStop/PreCompact/Notification 미지원** → 이 플러그인은 Stop 게이트만 사용
- `${CLAUDE_PLUGIN_ROOT}` 치환, `statusMessage`, matcher(대소문자 구분 정규식) 지원. `Write`/`Edit` ← `ApplyPatch` 별칭 자동 매핑
- **훅 stdout은 strict 스키마** — 허용 키 외에는 검증 실패. 그래서 모든 훅이 `additionalContext` 단일 키(또는 Stop의 `decision`/`reason`)만 출력
- 크로스플랫폼 권장인 **`type: "process"`**(셸 미경유, `timeoutMs` 단위) 사용
- Stop 차단으로 인한 연속 계속은 ZCode 런타임이 **최대 3회**로 제한 (자체 카운터와 별개)
- 매니페스트는 `.zcode-plugin` → `.claude-plugin` → `.codex-plugin` 순으로 탐색 — 본 저장소의 `.claude-plugin/plugin.json` 그대로 인식됨
- 플러그인 번들 **agents/lspServers는 현재 diagnostic-only**(UI 표시만, 미실행) → 스킬에 에이전트 정의 인라인 폴백 내장, LSP는 네이티브 컴포넌트 대신 `edit-diagnostics.js` 훅으로 구현

### Binary Judge (LLM-as-Judge)

모든 판정자는 총평이 아니라 **고정된 yes/no 체크리스트**에 답합니다. 각 질문에 YES/NO/N-A로 답하고(확인 안 했으면 YES 금지 → NO), VERDICT는 답들의 AND로 기계적으로 도출됩니다. binary 판정이 LLM judge의 신뢰도를 높인다는 관찰을 반영한 설계입니다.

### 증거 게이트 (Evidence Gates)

state.json의 완료 주장은 신뢰하지 않습니다. 모든 판정자(critic/validator/reviewer)는 자기 검증 리포트를 `.glm-hammer/evidence/` 아래 파일로 직접 남기고 `EVIDENCE_RECORDED: <path>`로 마무리해야 하며, stop-gate가 디스크의 영수증을 대조합니다:

```
.glm-hammer/evidence/
├── critics/round-<N>/<critic>.md   # VERDICT: APPROVE ×3 필요
├── tasks/task-<i>/validator.md     # VERDICT: PASS
├── tasks/task-<i>/critic.md        # VERDICT: APPROVE
├── e2e.md                          # E2E 게이트 원본 출력
└── reviews/{security,qa}.md        # VERDICT: PASS
```

영수증 없는 완료 주장은 차단되고, 반복될수록 directive 톤이 강해집니다. (lazycodex의 executor-verify 패턴 이식)

여기에 3중 방어선이 추가로 얹혀 있습니다:

1. **실질 검사** — 영수증은 최소 분량 + `CHECKS:` 블록 + `VERDICT:` 라인을 갖춰야 유효. 한 줄짜리 "VERDICT: PASS"는 통하지 않음
2. **콘텐츠 실(seal)** — 계획 파일은 Write/Edit 도구 저장 시 sha256으로 실링. Bash 리다이렉션·sed 등 우회 경로로 고치면 실이 깨져 승인 전체 무효
3. **디스패치 원장** — 판정자 영수증은 실제 Agent 디스패치가 그 경로를 언급한 기록이 있어야 유효. 오케스트레이터가 영수증을 직접 써넣는 위조 차단 (원장에 기록이 하나라도 있어야 강제되는 fail-open 설계 — 런타임이 Agent 이벤트를 안 쏘면 자동 비활성)

무한 루프 방지: 차단 6회 시 양보(다음 사용자 턴/세션에서 카운터 리셋), Claude Code 자체 상한(연속 8회), 그리고 트랜스크립트에 컨텍스트 압박 마커가 보이면 차단을 해제하는 탈출구가 있습니다.

## 흐름

```
사용자: "이 스토리 무드로 만들어줘"  ← 디자인 요청이면 선택 스테이지 crucible이 먼저
  └─ route-intent hook → crucible 라우팅
       └─ crucible: 프로스펙팅 → 토큰 제련 → fidelity assay → 디자이너 패널×2 (stop-gate 강제)
            └─ 사용자 승인 1회 ("forge 진행?") → 아래 forge로 핸드오프

사용자: "X 기능 제대로 만들어줘"
  └─ route-intent hook → forge 라우팅
       └─ forge: 정찰(질문 전) → 최소 질문 → 계획 → critic×3 전원 승인 (stop-gate 강제)
            └─ 사용자 승인 1회 ("hammer 진행?")
                 └─ hammer: [worker → validator → critic] × 태스크 → E2E → 보안/QA 리뷰
                      └─ FAIL → fix task → 루프 재진입 (stop-gate 강제) → 전부 green → 완료 보고
```

사용자 개입 지점은 **질문 응답과 계획 승인 한 번**뿐입니다.

## 설치

요구사항: Node.js 18+ (hook 스크립트 실행용)

**ZCode**: Marketplace 탭 → 커스텀 소스 추가 → 이 저장소의 GitHub URL 또는 로컬 경로 등록 → glm-hammer 설치

**Claude Code**:
```bash
claude plugin marketplace add tmdgusya/glm-hammer   # 또는 로컬 경로
claude plugin install glm-hammer@glm-hammer
```

## 상태 파일

런타임 상태는 프로젝트 루트의 `.glm-hammer/state.json`에 기록됩니다.
계획/리뷰 문서는 `docs/glm-hammer/plans/`, `docs/glm-hammer/reviews/`에 저장됩니다.
`.glm-hammer/`는 gitignore를 권장합니다.

## License

MIT · 소스는 [github.com/tmdgusya/glm-hammer](https://github.com/tmdgusya/glm-hammer)
