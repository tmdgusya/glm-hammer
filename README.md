# 🔨 glm-hammer

ZCode / Claude Code 호환 엔지니어링 하네스 플러그인.
사람이 스킬 이름을 외우거나 프롬프트를 길게 치지 않아도, 에이전트가 의도를 파악해
**강한 계획 → 검증 루프 구현 → 보안/QA 리뷰**를 스스로 돌게 만듭니다.

[tmdgusya/engineering-discipline](https://github.com/tmdgusya/engineering-discipline)의
plan-crafting / run-plan / review-work / clarification 원칙을 기반으로 하되,
**hooks가 게이트를 물리적으로 강제**하고 스킬들이 자동 체이닝된다는 점이 다릅니다.
증거 게이트·세션 복구·컨텍스트 압박 탈출구는 [lazycodex](https://github.com/code-yeongyu/lazycodex)(OmO)의
훅 시스템에서 가져왔습니다.

## 스킬

| 스킬 | 역할 |
|---|---|
| `blueprint` | 경량 계획. 작고 명확한 작업(≤3 파일)용. Self-Review 후 hammer로 핸드오프 |
| `forge` | **강한 계획.** 질문 전에 Explore 서브에이전트로 코드 정찰 → 최소 질문 → 실행 가능한 계획 초안 → **critic 3명 패널**(feasibility / integration / coverage)이 실제 코드베이스 대조로 전원 APPROVE할 때까지 수정-재심사 루프 |
| `hammer` | **구현 루프.** 태스크마다 worker → validator(정보 격리) → **implementation-critic**(스텁·하드코딩·리워드해킹 사냥) 3중 검증. 전체 완료 후 E2E 게이트 → **security-reviewer + qa-reviewer** 패널. FAIL이면 fix task로 변환해 루프 재진입 |

## 에이전트

- `feasibility-critic` / `integration-critic` / `coverage-critic` — forge 계획 심사 패널 (각자 다른 렌즈, 전원 승인 필수)
- `implementation-critic` — validator 통과 후 "정말 구현했는가"를 깐깐하게 검증
- `security-reviewer` / `qa-reviewer` — 구현 완료 후 최종 리뷰 게이트

## Hooks (게이트 강제 장치)

hooks는 서브에이전트를 직접 띄울 수 없으므로, 스킬이 `.glm-hammer/state.json`에
상태를 기록하고 hook 스크립트가 이를 읽어 게이트를 강제합니다:

| Hook | 이벤트 | 동작 |
|---|---|---|
| `session-start.js` | SessionStart | 미완료 런이 있으면 재개 브리핑 주입 — 재시작/clear/컴팩션 후에도 "continue" 없이 루프 자동 복귀 |
| `route-intent.js` | UserPromptSubmit | 작업 요청으로 보이면 forge/blueprint/hammer 라우팅 지침 주입. 진행 중인 런이 있으면 현재 상태를 주입해 루프 복귀 유도 |
| `plan-gate.js` | PostToolUse (Write\|Edit) | forge 중 계획 파일이 수정되면 **critic 승인을 0으로 리셋** → 전체 패널 재심사 강제. hammer 중 수정이면 Plan Amendment Log 기록 요구 |
| `comment-checker.js` | PostToolUse (Write\|Edit) | 방금 수정한 파일에서 AI 슬롭 주석 탐지: **elision 마커**("... existing code ..." — 파일 손상 신호), 변경 나레이션 주석("// added X"), placeholder 주석. 발견 즉시 같은 턴에서 수정 지시 |
| `edit-diagnostics.js` | PostToolUse (Write\|Edit) | LSP-lite: 수정 파일에 빠른 구문 검사(JS `node --check`, JSON parse, Python `py_compile`) — 깨진 파일을 E2E 게이트가 아니라 **수정 직후** 잡아냄 |
| `stop-gate.js` | Stop | state의 주장과 **증거 영수증을 대조**해 턴 종료를 차단. `awaiting-user`(정당한 에스컬레이션)만 통과 |

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

모든 판정자는 총평이 아니라 **고정된 yes/no 체크리스트**에 답합니다. 각 질문에 YES/NO/N-A로
답하고(확인 안 했으면 YES 금지 → NO), VERDICT는 답들의 AND로 기계적으로 도출됩니다.
binary 판정이 LLM judge의 신뢰도를 높인다는 관찰을 반영한 설계입니다.

### 증거 게이트 (Evidence Gates)

state.json의 완료 주장은 신뢰하지 않습니다. 모든 판정자(critic/validator/reviewer)는
자기 검증 리포트를 `.glm-hammer/evidence/` 아래 파일로 직접 남기고
`EVIDENCE_RECORDED: <path>`로 마무리해야 하며, stop-gate가 디스크의 영수증을 대조합니다:

```
.glm-hammer/evidence/
├── critics/round-<N>/<critic>.md   # VERDICT: APPROVE ×3 필요
├── tasks/task-<i>/validator.md     # VERDICT: PASS
├── tasks/task-<i>/critic.md        # VERDICT: APPROVE
├── e2e.md                          # E2E 게이트 원본 출력
└── reviews/{security,qa}.md        # VERDICT: PASS
```

영수증 없는 완료 주장은 차단되고, 반복될수록 directive 톤이 강해집니다.
(lazycodex의 executor-verify 패턴 이식)

무한 루프 방지: 차단 6회 시 양보(다음 사용자 턴/세션에서 카운터 리셋), Claude Code 자체 상한(연속 8회),
그리고 트랜스크립트에 컨텍스트 압박 마커가 보이면 차단을 해제하는 탈출구가 있습니다.

## 흐름

```
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

MIT
