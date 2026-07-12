# glm-hammer 하니스 최적화 감사·연구 보고서

- 기준일: 2026-07-11
- 대상: `blueprint → forge → hammer`와 증거·Stop 게이트
- 목적: 비용·시간 증가를 허용하고 결과물 품질, 검증 압박, 추론시간 연산을 극대화
- 범위 제외: `crucible`·`pptxx`, token/deck 전용 로직, 코드·훅·스킬·테스트 수정, RL·보상학습·파인튜닝
- 판정 언어: **관찰**은 저장소/원문에서 직접 읽은 사실, **해석**은 그 사실에서 도출한 품질 영향이다.

## 범위와 방법

승인된 계획의 A(6단계 전수 워크스루) 뒤 B(7종 위협 교차 점검)를 수행하고, 독립적인 최근 1차 문헌 조사와 단계 역방향 검색을 합쳤다. 저장소 인용은 재현 가능한 `path:line-line` 또는 `path:symbol` 형식으로 고정했다. 연구 후보는 2024-07-11~2026-07-11 사이에 해당 메커니즘을 제안·평가한 공개 1차 출처만 산입했다. 논문이 학습을 사용하더라도, 아래 적응안 자체가 RL·보상모델 학습·파인튜닝·가중치 변경을 요구하면 제외했다.

이 문서는 구현 지시서가 아니다. 모든 적용 스케치는 Skill/Prompt, Subagent 오케스트레이션, 또는 지원되는 `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PostToolUseFailure`, `Stop` 이벤트 경계 안의 설계 가설이다. 임의 stdout 키나 미지원 `SubagentStop`·`PreCompact`는 사용하지 않는다.

## 실행 요약

- 코어 루프는 정확히 6단계로 감사했다: **라우팅, 계획, 구현, 검증·증거, 리뷰, 종료게이트**.
- 발견은 F01~F12다. 핵심 집중점은 인증되지 않은 `state.json` 루트(F01), forge `done` 비대칭(F02), 발화 가능한 context marker(F03), provenance가 얕은 dispatch 원장(F04), plan 수정 후 stale approval 재사용(F05), sealed plan과 분리된 task count(F06), stale final review(F07), 코어 게이트 테스트 공백(F08), cap/reset 긴장(F09), advisory·Write/Edit 한정 피드백(F10), 20바이트 raw E2E(F11), opt-in 라우팅·프롬프트 전용 격리(F12)다.
- 세션 재시작 우회는 **불성립**이다. `session-start.js:19`의 `stopBlocks=0`은 게이트 판정 분기를 건너뛰는 것이 아니라 차단 예산을 재장전(re-arm)한다. `awaiting-user` 상태도 보존되어 재개 금지 브리핑을 낸다(`session-start.js:44-48`). 실질적인 탈출은 state 위조·허용된 마커 발화다.
- 1차 출처 후보 16개를 산입했고, 6단계 모두 하나 이상의 R-ID를 갖는다. G09는 `16 ≥ 12`이므로 PASS다.
- 연구 결과는 검증 독립성, 다중 후보·적대적 반례, provenance·계획 결속, context 보존을 우선하는 백로그로 정렬했다. 측정 없는 품질 상승은 가설이며 구현 전 검증이 필요하다.

## 코어 루프 6단계 감사

| 단계 | 진입·입력 | 강제점 | 증거·양호 근거 | 발견 판정 | 관찰과 해석 | 인용 |
|---|---|---|---|---|---|---|
| 1. 라우팅 | `SessionStart`/`UserPromptSubmit`, stdin의 cwd·prompt·source, `state.json` | `route-intent`는 `additionalContext` 힌트만 주입한다. active 상태는 재개 브리핑, `awaiting-user`는 자체 재개 금지다. work-request 정규식 밖 입력은 침묵한다. | **관찰:** 정규식 및 active/awaiting 분기가 있다. **양호:** 재시작 시 `stopBlocks`만 0으로 되고 상태는 보존된다. **해석:** 진입 자체를 차단하는 물리적 gate는 아니다. | F12, F01 일부 | **관찰:** `route-intent.js:58-60`은 미매칭을 무시한다. **해석:** “디버깅해줘” 같은 표현과 계획 없는 Write가 하니스 밖에 남는다. | `hooks/scripts/route-intent.js:22-60`; `hooks/scripts/session-start.js:13-48`; `hooks/hooks.json:3-30` |
| 2. 계획 | forge/blueprint Skill, `PostToolUse`의 `Write\|Edit\|MultiEdit`와 계획 경로, state | forge 계획은 수정 시 reseal·approval reset과 Stop의 seal+3/3 critic 검증을 받는다. blueprint는 단일 self-review 후 `phase:"blueprint", status:"awaiting-user"`로 전환하며 전용 Stop 분기가 없다. | **관찰:** forge 계획 파일의 reseal·approval reset과 seal fail-closed가 있다. blueprint는 lightweight 경로로 critic panel을 의도적으로 생략한다. **해석:** forge의 receipt가 계획 hash에 묶이지 않고, blueprint 계획 완전성은 프롬프트/self-review에만 의존한다. | F02, F05, F12 | **관찰:** forge는 `approved`만 0이 되고 `round`는 스킬 지시로만 오른다. blueprint는 `awaiting-user` 공통 guard에서 즉시 통과하며 phase별 검증 분기가 없다. **해석:** 이전 forge receipt 재사용과 blueprint 자체검증 편향이 서로 다른 계획 trust boundary다. | `hooks/scripts/plan-gate.js:19-45`; `hooks/scripts/stop-gate.js:104-114,439-452`; `skills/forge/SKILL.md:State Protocol, Phase 4`; `skills/blueprint/SKILL.md:8-26` |
| 3. 구현 | hammer의 worker→validator→critic 사이클, Write/Edit 훅 | comment checker와 edit diagnostics가 C-like/HASH 확장자 및 프로젝트 도구를 검사한다. | **관찰:** Write/Edit/MultiEdit 매처, 권고용 `additionalContext`, 도구 오류 skip이다. **양호:** 편집 피드백 경로와 10건 cap은 존재한다. **해석:** Bash 산출물·HTML/Markdown elision·미해결 finding을 Stop이 모른다. | F10, F12 일부 | **관찰:** 비대상 확장자·512KB 초과·도구 부재는 fail-open이다. **해석:** 구현 품질 신호의 무시 비용이 0이고 validator 격리는 프롬프트 계약에 머문다. | `hooks/scripts/comment-checker.js:13-14,78-107`; `hooks/scripts/edit-diagnostics.js:96-99`; `hooks/hooks.json:31`; `skills/hammer/SKILL.md:1c` |
| 4. 검증·증거 | `.glm-hammer/evidence/**`, dispatch 원장, state counters, sealed plan | judge receipt 300B+`CHECKS`+`VERDICT`, raw 20B, plan sha256, dispatch-backed 검사를 조합한다. | **관찰:** evidence 형식·seal mismatch는 fail-closed다. **양호:** `lib.js:48-63,106-112`의 실체/패턴/seal 층은 명확하다. **해석:** dispatch는 경로 언급과 비어 있지 않음만 보며, task total·raw E2E는 모델 상태/문자열에 의존한다. | F04, F06, F11 | **관찰:** 원장 entry의 `t`는 기록되나 검증에 사용되지 않고, `tasks.total`은 sealed plan의 `### Task N`과 대조되지 않는다. **해석:** 무결성이 가장 강한 아티팩트가 receipt 의무 계산에 쓰이지 않는다. | `hooks/scripts/lib.js:48-63,106-155`; `hooks/scripts/dispatch-log.js:14-40`; `hooks/scripts/stop-gate.js:47-64,225-266` |
| 5. 리뷰 | 격리된 계획 경로·원 요청·증거 경로, feasibility/integration/coverage/implementation/security/qa critic | 6개 critic의 고정 이진 checklist, “미검증=NO”, 모든 항목 AND; forge 계획 수정·hammer FAIL 후 전체 패널 재리뷰 | **관찰:** 렌즈 분리와 기계적 AND는 6개 agent 계약에서 명시된다. **양호:** 자기검증 편향과 정보 누출을 프롬프트 층에서 견제한다. **해석:** final review 파일은 round/hash가 없어 리뷰 후 코드 수정이 stale receipt를 무효화하지 않는다. | F07 | **관찰:** critic은 `round-N`, security/qa 리뷰는 고정 경로다. **해석:** FULL panel 재실행이 스킬 지시일 뿐 hook-enforced trigger가 아니다. 단일 judge에 대한 재샘플·다수결도 없다. | `hooks/scripts/stop-gate.js:117,245-279`; `agents/feasibility-critic.md`; `agents/integration-critic.md`; `agents/coverage-critic.md`; `agents/implementation-critic.md`; `agents/security-reviewer.md`; `agents/qa-reviewer.md`; `skills/hammer/SKILL.md:Step 3` |
| 6. 종료게이트 | `Stop`, state, transcript, evidence, plan seal, dispatch 원장 | idle/awaiting/context marker/cap 공통 guard 후 forge·hammer 분기, block counter와 continuation cap. blueprint 전용 분기는 없다. | **관찰:** forge·hammer의 seal·receipt·task·review 재검사 분기는 있지만 blueprint는 `awaiting-user` 공통 guard에서 통과한다. **양호:** forge/hammer의 missing/broken seal은 차단되고 고정 checklist가 있다. **해석:** 인증되지 않은 상태·발화 가능한 marker와 blueprint의 prompt-only self-review가 검증 강도를 제한한다. | F01, F02, F03, F08, F09, F12 | **관찰:** `BLOCK_CAP=6`; ZCode continuation cap은 3이고 매 user turn/session에 counter를 reset한다. blueprint state는 `phase:"blueprint", status:"awaiting-user"`이며 분기 목록에 blueprint가 없다. **해석:** ZCode에서 6 cap 경로는 도달하기 어렵고, blueprint는 의도적 lightweight 경로지만 독립 Stop 검증이 없다. | `hooks/scripts/stop-gate.js:33,435-467`; `hooks/scripts/lib.js:160-184`; `skills/blueprint/SKILL.md:20-26`; `README.md:94,123`; `tests/gates.test.js:1-803` |

### F01~F12 발견 원장

| ID | 등급 | 관찰(사실) | 해석/품질 영향 |
|---|---|---|---|
| F01 | 높음 | `stop-gate.js:439-446`은 state 없음/idle/awaiting-user/`stopBlocks≥6`이면 0으로 종료한다. state는 seal 대상이 아니며 seal은 plan/design/deck에만 적용된다(`lib.js:79-83`). | 모델이 `phase:idle`, `status:awaiting-user`, `stopBlocks:99`를 쓰면 receipt·seal·원장 전에 종료된다. hook 소유 counter와 질문 증명이 최우선이다. |
| F02 | 높음 | forge/crucible은 `status !== done`일 때만 gate를 부르고(`stop-gate.js:447-448`), hammer의 done은 영수증으로 재검증한다(`stop-gate.js:449`). forge 상태 enum에는 합법적인 done이 없다(`skills/forge/SKILL.md:State Protocol`). | 계약 밖 `done` 한 번으로 forge gate 전체가 빠진다. unknown/done은 재검증하거나 차단해야 한다. |
| F03 | 높음 | `lib.js:160-184`는 transcript 마지막 64KB를 소문자화해 `context low` 등 substring을 찾고 `stop-gate.js:441`이 통과시킨다. | 모델 발화·툴 출력이 marker를 포함할 수 있으므로 escape가 utterable하다. 구조화된 runtime provenance와 role 필터가 필요하다. |
| F04 | 중간 | `dispatch-log.js:19,36`은 JSON 문자열에서 evidence 경로를 추출하고 timestamp·description·paths를 원장에 기록한다. `receiptProblems`는 path 존재만 보며 entry의 `t`·subagent 종류·receipt mtime을 결속하지 않는다(`lib.js:139-155`). 원장 공백이면 enforcement 자체가 꺼진다(`stop-gate.js:47-64`). | trivial dispatch 후 Bash로 receipt를 쓰거나 dispatch 없이 receipt를 쓰는 경로가 남는다. 빈 원장 fail-open은 런타임 미지원과 미실행을 구분해야 한다. |
| F05 | 중간 | `plan-gate.js:29-36`은 계획 수정 때 approved/verdicts를 0으로 만들지만 round는 보존한다. forge gate는 approved 수와 receipt 경로를 본다(`stop-gate.js:104-114`). | 이전 plan의 round receipt가 자작 state counter로 되살아난다. receipt마다 plan sha256과 round를 함께 요구해야 한다. |
| F06 | 중간 | `hammerGate`는 `state.tasks.total`만큼 `taskEntries`를 만든다(`stop-gate.js:225-243`). sealed plan의 `### Task N`과 대조하지 않는다. | 계획 10개를 total 1로 주장해 한 task만 검증받을 수 있다. sealed plan에서 의무 수를 도출해야 한다. |
| F07 | 중간 | critic은 `round-N`이지만 security/qa 리뷰는 고정 `reviews/*.md`다(`stop-gate.js:245-279`). | 리뷰 PASS 후 소스 수정이 receipt를 stale로 만들지 않는다. PostToolUse에서 review round/hash를 무효화해야 한다. |
| F08 | 높음(테스트) | `tests/gates.test.js:1-803`에는 forgeGate/hammerGate/plan-gate/session-start/comment-checker/edit-diagnostics/BLOCK_CAP/context-pressure의 직접 시나리오가 없다. crucible 테스트(`tests/gates.test.js:104-190`)와 pptxx 테스트(`tests/gates.test.js:207-803`) 비중이 높다. | README가 핵심이라 부르는 forge→hammer가 회귀 보호 최약이다. 이번 보고서에서는 테스트를 수정하지 않고 backlog로 남긴다. |
| F09 | 낮음 | `BLOCK_CAP=6`(`stop-gate.js:33`), ZCode Stop cap 3(`README.md:94`), reset은 `route-intent.js:25`·`session-start.js:19`다. | ZCode에서는 cap-6 경로가 사실상 사문이고, reset 이벤트가 없는 런타임에서는 cap 후 잔여 실행이 조용히 풀린다. cap 소진 경고가 필요하다. |
| F10 | 낮음 | comment checker와 diagnostics는 `Write\|Edit\|MultiEdit`만 받고(`hooks/hooks.json:31`), 권고를 state에 저장하지 않는다. C-like/HASH만 검사(`comment-checker.js:13-14`), 도구 실패는 skip(`edit-diagnostics.js:96-99`)이다. | Bash·HTML/Markdown elision과 미해결 경고가 종료 검증에 반영되지 않는다. elision만이라도 persistent finding으로 승격할 후보가 된다. |
| F11 | 낮음 | `receiptProblems`는 raw receipt에 20B만 요구하고(`stop-gate.js:48-64`), hammer review 목록은 `e2e.md`를 raw로 분류한다(`stop-gate.js:249-254`). orchestrator가 원출력을 저장한다(`skills/hammer/SKILL.md:23-28,103-105`). | 임의 20바이트가 통과한다. sealed plan의 Verification Strategy 문자열과 실제 실행 증명을 결속해야 한다. |
| F12 | 낮음 | route-intent는 힌트만 내며 미매칭 prompt는 침묵한다(`route-intent.js:58-60`). state 없으면 Stop도 비활성이다(`stop-gate.js:439`). blueprint는 self-review 후 `phase:"blueprint", status:"awaiting-user"`를 쓰지만(`skills/blueprint/SKILL.md:8-26`), `stop-gate.js:439-452`에는 blueprint 검증 분기가 없다. hammer validator·정보 격리도 Skill prompt에만 있다(`skills/hammer/SKILL.md:1c`). | “물리적으로 gate”라는 원칙이 loop entry와 blueprint lightweight 계획에는 적용되지 않는다. 지원되는 `PreToolUse` soft/hard gate, blueprint의 최소 독립 검증, validator 계약 파일화가 보강점이다. |

**재시작 판정:** `session-start.js:13-19`은 세션 시작에 카운터만 0으로 만들고 active/awaiting 상태·계획·증거를 지우지 않는다. 따라서 Stop 판정 로직을 건너뛰는 bypass가 아니라 새 턴에서 다시 차단할 예산을 re-arm하는 동작이다. `session-start.js:44-48`은 `awaiting-user`를 재개하지 말라는 브리핑을 보존한다. 다만 F01의 state 위조, F03의 marker 발화, F09의 cap/reset 경계는 별개의 실제 우회 위험이다.

## 횡단 위협 점검

| 위협 | 판정 | 단계·근거 |
|---|---|---|
| 자기검증 편향 | 프롬프트 완화, 기계 강제 부재 | 리뷰의 분리 좌석과 “Not your reasoning”은 양호하나 validator/격리는 F12처럼 prompt-only다(`skills/forge/SKILL.md:Phase 4`; `skills/hammer/SKILL.md:1c`). |
| 상태 과신 | receipt 대조는 있으나 루트 미보호 | seal·receipt 검사는 존재하지만 F01의 비인증 state, F02의 done, F06의 tasks.total이 상태 과신을 만든다(`stop-gate.js:104-114,225-243,449-453`). |
| receipt 위조 | 3중 방어 뒤 관통 경로 존재 | 실체·seal·dispatch는 `lib.js:48-63,106-117`; path-only/empty-ledger F04, stale round F05, raw F11이 잔여 경로다. |
| judge 비결정성 | 이진 AND는 양호, 다중 판단은 미흡 | 6개 agent의 “미검증=NO”와 AND는 양호(`agents/implementation-critic.md:Verdict` 및 동급 계약). 그러나 단일 샘플 judge·재샘플 없는 F07 경계는 최적화 대상이다. |
| fail-open | 의도적·다층적으로 존재 | 훅 예외, comment/diagnostics, empty dispatch, idle/awaiting/cap guard가 각각 0 종료한다(`edit-diagnostics.js:96-99`; `stop-gate.js:47-64,435-446`). seal mismatch만 명시적 fail-closed다(`lib.js:106-112`). |
| 조기 종료 | 차단은 있으나 세 탈출구 | Stop 차단과 attempt 경화(`stop-gate.js:455-465`)는 양호하나 F01·F03·F09가 검증 전 종료를 허용한다. |
| 단계 간 정보 누출 | 명문화는 양호, 강제는 프롬프트 층 | 계획 경로·원 요청·증거 경로 격리와 verbatim-from-plan 규칙은 `skills/forge/SKILL.md:Phase 4`, `skills/hammer/SKILL.md:1c`에 있다. dispatch가 prompt hygiene를 검사하지 않아 F12의 강제 공백은 남는다. |

## 최신 연구 후보 카탈로그

### 산입·적응 원칙

R-ID는 논문 단위가 아니라 **품질 메커니즘의 행동 단위**로 부여했다. 두 논문이 모두 “여러 샘플”을 말해도, (a) 후보 생성/수정 순서, (b) 정보 흐름, (c) 종료·선택 조건 중 하나가 다르고 원문이 그 증분을 제시할 때만 별도 R-ID로 유지했다. 단순 benchmark 재명명, 동일한 self-consistency의 표현 변경, 블로그·제품 문서·간접 인용은 병합 또는 제외했다. 아래 적응은 모두 비학습 적응이며, 논문 자체에 선택적인 학습 실험이 있어도 하니스에 들이는 경로는 prompt/orchestration only로 제한한다.

| ID | 1차 출처·날짜·링크 | 메커니즘·품질 가설 | 단계 | 이식 표면·근거 | 한계 |
|---|---|---|---|---|---|
| R01 | Chen et al., **SETS**, 2025-01-31, [arXiv:2501.19306](https://arxiv.org/abs/2501.19306) | 병렬 후보→self-verification→순차 correction을 결합. 여러 독립 경로와 수정 라운드가 단일 시도의 오류·포화를 줄인다는 가설. | 라우팅·리뷰·종료 | Skill/상태별 Subagent fan-out·Stop round. 원문 실험과 무학습 적응 경로를 확인했다. | self-verification이 같은 편향을 반복할 수 있고 토큰 비용이 증가한다. |
| R02 | Wang et al., **MCTS-Judge**, 2025-02-18, [arXiv:2502.12468](https://arxiv.org/abs/2502.12468) | judge가 후보를 노드로 보고 MCTS로 다중 관점·line-level 평가를 탐색. 품질 판정이 한 번의 전체 답변 인상보다 세밀해진다는 가설. | 검증·증거·리뷰·종료 | critic Subagent 트리와 `Stop`의 budget으로 이식. | 실행 가능한 unit test/reward가 없으면 tree score가 주관적이다. |
| R03 | He et al., **Property-Generated Solver (PGS)**, 2025-06-23, [arXiv:2506.18315](https://arxiv.org/abs/2506.18315) | semantic property와 구조적으로 최소인 failing counterexample을 피드백. 큰 로그 대신 원인 격리가 수정 성공률을 높인다는 가설. | 구현·검증·증거 | 성공한 도구 호출은 `PostToolUse`, 실패한 호출은 `PostToolUseFailure` 결과를 property·최소 반례 prompt로 전달. | property 생성 자체가 틀리거나 범위를 놓치면 false confidence가 생긴다. |
| R04 | Foster et al., **ACH**, 2025-01-22, [arXiv:2501.12862](https://arxiv.org/abs/2501.12862) | 관심 실패를 겨냥한 소수 mutant를 만들고 이를 죽이는 회귀 테스트를 생성. 기존 gate 경계의 미검출 우회가 드러난다는 가설. | 구현·검증·증거·종료 | Subagent attacker/fixture를 `PostToolUseFailure`와 다음 Stop 검증에 연결. | mutant 동등성 판정과 테스트 실행 환경이 필요하고, 논문 규모의 자동화는 범위 밖이다. |
| R05 | Gallego, **Specification Self-Correction**, 2025-07-24, [arXiv:2507.18742](https://arxiv.org/abs/2507.18742) | 명세로 답 생성→명세의 loophole 비판→명세 수정→최종 생성. rubric gaming과 F01/F02 같은 계약 악용을 먼저 찾는다는 가설. | 라우팅·계획·리뷰·종료 | 별도 critic Skill, `UserPromptSubmit`/`Stop` 전에 실행. | 자기비판 모델이 원 명세의 숨은 모호성을 모두 찾는다는 보장은 없다. |
| R06 | Kang et al., **ACON**, 2025-10-01, [arXiv:2510.00615](https://arxiv.org/abs/2510.00615) | 자연어 guideline을 실패 분석으로 반복 개선해 관찰·history를 압축하되 critical state를 보존. 긴 세션의 계획·receipt 손실을 줄인다는 가설. | 라우팅·계획·종료 | `SessionStart` 요약 Skill, context-pressure 전후 Subagent를 이용하는 prompt-space 적응. | 압축기가 critical marker를 잘못 삭제할 수 있고, 품질-토큰 trade-off가 남는다. |
| R07 | Deshpande et al., **TRACE**, 2026-01-27, [arXiv:2601.20103](https://arxiv.org/abs/2601.20103) | 단독 판정 대신 정상/의심 trajectory를 contrastive하게 함께 보여 anomaly를 찾는다. F01/F03/F04의 미묘한 위조를 더 잘 식별한다는 가설. | 라우팅·검증·증거·리뷰 | 두 Subagent receipt/trajectory를 Prompt로 병렬 비교. | synthetic/human-verified 분포가 실제 저장소 공격과 다를 수 있다. |
| R08 | Choi et al., **IRT-GRM judge reliability diagnostics**, 2026-01-31, [arXiv:2602.00521](https://arxiv.org/abs/2602.00521) | prompt 변형별 judge 일관성과 human-alignment를 분리 측정. checklist가 안정적으로 같은 결론을 내는지 사전 진단한다는 가설. | 리뷰·종료 | `Stop` 전 judge prompt 변형·합의표를 Subagent로 생성. | 사람 기준점과 충분한 항목 집합이 없으면 IRT 추정이 약하다. |
| R09 | Zhou & Tan, **AutoChecklist**, 2026-03-07, [arXiv:2603.07019](https://arxiv.org/abs/2603.07019) | Generator→Refiner→Scorer의 composable checklist pipeline을 prompt template로 구성. F별 acceptance를 더 세밀하고 재사용 가능하게 만든다는 가설. | 계획·검증·리뷰·종료 | Skill 섹션과 critic Subagent의 템플릿 체인. | checklist 생성기가 누락된 기준을 만들면 정교한 오판이 된다. |
| R10 | Feng et al., **AgentSwing**, 2026-03-29, [arXiv:2603.27490](https://arxiv.org/abs/2603.27490) | context 관리 방식별 branch를 병렬 확장하고 lookahead로 다음 경로를 선택. 상태별로 요약/원문/재질문을 고르면 장기 루프 품질이 오른다는 가설. | 라우팅·계획·종료 | `UserPromptSubmit`/`SessionStart`에서 branch Subagent, Stop에서 선택. | web-agent 실험을 코드 하니스에 옮길 때 branch 비용과 선택 오류가 크다. |
| R11 | Li et al., **AdverMCTS**, 2026-04-12, [arXiv:2604.10449](https://arxiv.org/abs/2604.10449) | Solver 후보와 Attacker 반례 생성기를 minimax/MCTS로 교대. 공개 테스트에 맞춘 pseudo-correctness와 gate bypass를 공격한다는 가설. | 구현·검증·증거·종료 | attacker/solver Subagent와 `PostToolUseFailure`/Stop 반례 루프. | 숨은 intent를 완전히 대표하는 공격 테스트를 만들기 어렵다. |
| R12 | Dughmi et al., **ADAP generate-rank-verify**, 2026-05-17, [arXiv:2605.17609](https://arxiv.org/abs/2605.17609) | cheap score로 shell별 후보를 늘리고 상위만 costly verifier에 보낸다. 고정 N보다 검증 예산을 어려운 사례에 배분한다는 가설. | 계획·검증·리뷰·종료 | prompt score + critic Subagent + Stop budget; 학습 없이 적응 shell 규칙 구현. | score-success 단조성 가정이 깨지면 상위 후보를 놓친다. |
| R13 | Wang et al., **The Verification Horizon**, 2026-06-24, [arXiv:2606.26300](https://arxiv.org/abs/2606.26300) | verifier를 scalability·faithfulness·robustness의 세 축으로 설계하고 intent에 맞춰 targeted verification. F11 raw receipt를 실제 의도 검증으로 끌어올린다는 가설. | 구현·검증·증거·종료 | sealed plan의 Verification Strategy를 critic prompt와 `PostToolUseFailure`에 전달. | 고정 reward/검증기는 새 능력에 다시 포화될 수 있다. |
| R14 | Mehta & Datta, **Plans Don’t Persist**, 2026-06-22, [arXiv:2606.22953](https://arxiv.org/abs/2606.22953) | replay pairing으로 plan 포함/제외 trajectory를 비교하고 strict stripping으로 reasoning-trace confound를 제거. 계획이 context에 실제 보존되는지 검증한다는 가설. | 계획·라우팅·종료 | `SessionStart`/context-pressure에서 plan replay/재삽입을 prompt orchestration. | hidden-state probe 자체는 이식하지 않고, 텍스트 replay 진단만 채택한다. |
| R15 | Norman et al., **Reliability without Validity**, 2026-06-17, [arXiv:2606.19544](https://arxiv.org/abs/2606.19544) | test-retest consistency와 bias를 분리한 Minimum Viable Validation Protocol. 같은 PASS가 안정적이어도 위치·표현 편향일 수 있음을 찾는다. | 리뷰·종료 | `Stop`에서 순서 교환·prompt 변형·재채점 Subagent. | 인간 validity 데이터 없이 bias만 부분적으로 보인다. |
| R16 | Zhao et al., **SpecBench**, 2026-05-20, [arXiv:2605.21384](https://arxiv.org/abs/2605.21384) | visible test와 held-out composition test의 pass-rate gap으로 reward hacking을 측정. “CHECKS+VERDICT”가 의도 충족을 대리하는지 검증한다. | 계획·구현·검증·종료 | Skill이 공개/구성/holdout fixture를 분리하고 Stop receipt에 gap을 기록. | benchmark fixture를 만드는 비용이 크며 실제 사용자 의도는 여전히 부분 관측이다. |

### 검증한 목록 중 병합·제외

- **배경으로 확인했으나 별도 R-ID로 산입하지 않음:** Sys2Bench([2502.12521](https://arxiv.org/abs/2502.12521), 2025-02-18)은 inference-time benchmark/분석이라 R01의 방법과 중복되는 평가 배경이다. Code as Agent Harness([2605.18747](https://arxiv.org/abs/2605.18747), 2026-05-18)은 survey라 개별 메커니즘의 최초 1차 출처가 아니다.
- **학습/파인튜닝 의존으로 제외:** Multi-Sequence Verifier([2603.03417](https://arxiv.org/abs/2603.03417), 2026-03-03)은 제안 verifier 학습을 요구하는 경로를 갖고, AdaCoM([2605.30785](https://arxiv.org/abs/2605.30785), 2026-05-29)은 외부 context manager의 end-to-end RL을 핵심으로 한다. 이는 G04 위반이다.
- **중복 규칙:** R01(병렬+순차 self-correction)과 R10(상태별 context branch), R02(판정 tree)와 R11(공격 반례 tree)는 행동 단위·종료 조건이 달라 유지했다. 단순 best-of-N 재표현은 R01에 병합했다. 모든 산입 후보는 arXiv 원문/초록과 날짜를 확인했으며 블로그만으로는 산입하지 않았다.

## 단계×기법 커버리지

| 단계 | 적용 후보 | 적용 의미 |
|---|---|---|
| 라우팅 | R05, R06, R07, R10, R14 | 명세 loophole 사전 점검, context 상태별 branch, contrastive route, plan 재삽입 진단 |
| 계획 | R06, R09, R10, R12, R14, R16 | critical plan 보존, checklist 생성/정제, 비용 적응형 후보 수, holdout 의도 점검 |
| 구현 | R03, R04, R11, R13, R16 | 최소 반례, mutation 회귀, attacker, targeted verification, 공개/구성/holdout 테스트 |
| 검증·증거 | R02, R03, R04, R07, R11, R12, R13, R16 | 다중 관점 judge, property feedback, mutant/attacker, contrastive 및 비용 적응형 검증 |
| 리뷰 | R01, R05, R08, R09, R12, R15 | self-correction, 명세 비판, IRT 안정성, checklist pipeline, 순서·prompt 변형 재리뷰 |
| 종료게이트 | R01, R02, R08, R11, R12, R13, R15, R16 | multi-candidate 선택, verification horizon, judge reliability, 공격/holdout gap 후에만 Stop 허용 |

따라서 G08의 최소 조건인 6/6 및 단계당 1개 이상을 충족한다. 연구 후보 수와 단계 매핑은 동일 기법의 이름을 반복해 채운 것이 아니라 위의 정보 흐름·종료 조건 차이를 기준으로 했다.

## 우선순위 개선 백로그

품질 상승폭 기준으로 정렬했다. 등급이 같으면 독립 방어선 추가, 근거 강도, 영향 단계 수 순이다. 비용과 난이도는 순위를 뒤집지 않는다. 모든 스케치는 구현 명령이 아니라 대상 symbol/Skill/event 수준의 설계 경계다.

| 우선도 | 단계 | 근거 | 기대 효과 | 구체 스케치(대상·표면) | 비용/난이도 | 위험·검증 신호 |
|---|---|---|---|---|---|---|
| 매우 큼 | 라우팅·종료 | F01, F12, R05, R07 | 인증되지 않은 state 한 줄로 전 루프를 끝내는 최악의 탈출 제거 | `stop-gate.js`의 counter/phase와 모델 작성 `state.json`을 분리한 hook-owned 상태; `UserPromptSubmit`에서 active intent를 기록하고 `PreToolUse`에서 계획 없는 source edit를 차단; `awaiting-user`는 실제 질문 이벤트/구조화 transcript 증거가 있을 때만 허용 | 저장소·핸드오프 추가, 난이도 높음 | 런타임별 상태 영속성 차이. active→idle, awaiting-user→Stop 표본에서 receipt 없이 0 종료가 없어야 함 |
| 매우 큼 | 계획·종료 | F02, R05, R09 | forge `done` 우회와 명세 loophole 차단 | `stop-gate.js:449-453`에서 forge의 unknown/done도 forgeGate 재검증; `skills/forge` State Protocol과 AutoChecklist/SSC critic을 `Stop` 직전 호출 | 낮은 실행비, 난이도 중간 | 합법 enum 변화와 충돌. done/unknown/awaiting 각 branch가 seal·3/3 receipt를 요구하는지 확인 |
| 매우 큼 | 종료게이트 | F03, R06, R07, R14 | 모델이 utterable context marker로 검증을 해제하는 탈출 축소 | `lib.js:160-184`를 raw substring 대신 runtime event/role-filtered marker로 제한; ACON식 요약은 marker를 생성하지 않게 하고 Plans replay를 context-pressure에서 점검; `Stop`은 marker 출처가 없으면 계속 검증 | 낮은 토큰, 난이도 중간 | 정상 context pressure를 놓칠 위험. assistant/tool 텍스트에 marker를 넣은 표본은 bypass하지 않고, 구조화 pressure event만 bypass해야 함 |
| 매우 큼 | 검증·증거·리뷰 | F08, R01, R02, R09 | 코어 forge/hammer gate의 회귀와 단일 judge 누락을 동시에 줄임 | `tests/gates.test.js`에 대응하는 별도 승인 작업에서 forgeGate/hammerGate, plan reset, BLOCK_CAP, marker, dispatch를 시나리오화하고, `implementation-critic` 계약에 R01 다중 후보·R02 다중 관점·R09 checklist 정제를 추가 | 테스트·추론 비용 높음, 난이도 높음 | 여러 시나리오 receipt/branch가 필요. 현재는 코드 변경 없이 backlog만 기록하며, 각 F08 branch 탐지율과 다중 후보 간 판정 일치율을 signal로 삼음 |
| 매우 큼 | 검증·증거 | F04, R04, R07, R11, R13 | dispatch를 가장한 receipt와 pseudo-correctness를 독립 공격으로 탐지 | `dispatch-log.js`의 path-only entry를 judge subagent/type와 결속하고 dispatch 시각≤receipt mtime을 확인; Attacker/ACH mutant가 `PostToolUseFailure`로 반례를 만들고 Verification Horizon의 faithfulness/robustness 체크를 `Stop`에 요구 | 추가 subagent·fixture, 난이도 높음 | 시계·파일시스템 정밀도와 미지원 Agent hook. no-op dispatch, 빈 원장, Bash 자작 receipt 표본이 모두 차단되는지 확인 |
| 매우 큼 | 계획·리뷰·종료 | F05, R09, R14 | plan 수정 후 stale round approval 재사용 제거 | `plan-gate.js:29-45`에서 edit마다 round를 증가시키고 seal sha를 critic receipt에 기록; AutoChecklist가 새 plan hash용 checklist를 만들고 plan replay로 critical 항목 보존 확인 | receipt metadata 추가, 난이도 중간 | hash drift와 의도적 rebase 혼동. 동일 receipt의 plan hash 변경 표본은 PASS가 아니어야 함 |
| 큼 | 계획·검증·증거 | F06, R04, R12, R16 | sealed plan의 전체 task가 검증되도록 해 task count 축소를 방지 | `stop-gate.js:225-243`이 `state.tasks.total` 대신 sealed plan의 `### Task N` 하한을 도출; ADAP으로 쉬운 task 먼저, SpecBench식 composition/holdout을 마지막 receipt에 포함 | 파서·fixture 비용 중간, 난이도 중간 | headings가 비표준인 계획. total을 낮춘 state와 10-heading plan 표본에서 task 10개 미만이면 차단 |
| 큼 | 리뷰·종료 | F07, R01 | final security/qa receipt의 stale PASS 방지 | `stop-gate.js:245-279`의 `reviews/*.md`를 source snapshot/hash 또는 review round에 결속; `PostToolUse`에서 review 이후 source edit를 stale로 표시하고 전체 패널을 다시 실행 | 저장소 인덱스·재리뷰 비용 높음, 난이도 높음 | generated/ignored 파일 처리와 hash 비용. PASS 후 각 source edit가 review receipt를 무효화해야 함 |
| 큼 | 구현·검증 | F10, R03, R04 | advisory-only elision/diagnostic을 해결 의무로 승격해 조용한 품질 저하 감소 | `comment-checker`의 HTML/Markdown marker와 Bash 성공 결과는 `PostToolUse`, 실패 결과는 `PostToolUseFailure` finding으로 정규화; PGS 최소 반례를 state finding에 저장하고 unresolved finding이 `Stop`에서 block | 로그·상태 증가, 난이도 중간 | pre-existing 주석 false positive. diff scope, elision만 blocking, finding 해결 후 재검증을 signal로 사용 |
| 중간 | 검증·증거 | F11, R03, R13, R16 | 20B 임의 raw E2E를 실제 의도·실행 결과로 교체 | `skills/hammer/SKILL.md:23-28,103-105`와 `stop-gate.js:48-64,249-266`의 E2E receipt 계약이 sealed plan의 Verification Strategy 문자열, 실행 결과 구조, holdout/targeted property를 요구하도록 확장 | receipt 크기·실행 비용 중간, 난이도 중간 | 명령 문자열만 echo하는 위조. 실제 결과와 plan 문자열·mtime·dispatch provenance의 동시 일치가 signal |
| 중간 | 종료게이트 | F09, R01, R12 | ZCode cap과 plugin cap의 사문/영구 해제 상태를 가시화 | `stop-gate.js:444`의 cap 종료에 visible warning receipt를 남기고, `SessionStart`/`UserPromptSubmit`가 지원되지 않는 런타임에서는 세션 식별자를 `Stop`에서 보수적으로 갱신 | 런타임 호환성 비용 낮음, 난이도 중간 | ZCode 3회와 CC 8회, reset 없는 mock runtime 각각에서 cap 도달·재장전 신호 확인 |
| 중간 | 라우팅·계획·구현 | F12, R03, R05, R09 | work-request 정규식 밖 요청, blueprint 자체검증 편향, validator drift를 줄임 | `route-intent.js`의 힌트에만 의존하지 않고 지원 `PreToolUse`에서 계획/state 없는 source edit을 soft/hard gate; blueprint는 lightweight 성격을 유지하되 plan checklist를 독립 Subagent가 1회 판정하고 그 receipt를 hammer handoff에 결속; validator prompt를 `agents/` 계약으로 분리해 hammer Skill 1c와 동기화 | 사용자 마찰·추가 judge 비용 중간, 난이도 높음 | 질문·조사 요청 오탐, 작은 작업의 과도한 지연이 위험. 계획 없는 Write/Edit 기록률, blueprint self-review와 독립 판정 불일치율, validator 계약 drift를 측정 |
| 작음 | 리뷰·종료 | R10, R14 | context 압축/재개 때 plan과 active intent의 소실을 관찰 | `SessionStart` 브리핑에 plan 핵심 불변식·현재 task를 재삽입하고, AgentSwing식 두 context 요약 branch를 critic이 비교. 원문 plan을 무조건 보존하지 않고 critical field만 재현 | 토큰 증가 낮음, 난이도 낮음 | 요약이 plan hash/approval을 바꾸는지, replay 전후 핵심 task 보존 여부 |
| 작음 | 리뷰 | R08, R15 | 이진 checklist의 위치·표현 편향을 조기에 드러냄 | `implementation/security/qa` critic prompt의 항목 순서와 evidence 표현을 교환해 재판정하고 결과를 review receipt에 요약 | 추가 judge 호출, 난이도 낮음 | 불일치율·position bias 상승 시 사람 검토로 승격; 모든 변형을 무조건 평균내어 숨기지 않음 |

## 한계와 후속 검증

1. 이 감사는 읽기 전용 정적 감사다. 실제 공격 실행, 성능 향상, 비용·지연 측정은 하지 않았다. F01~F12는 관찰과 해석을 분리했으며, 백로그 효과는 검증 신호로 남겼다.
2. 연구의 실험 수치는 각 논문의 주장이지 glm-hammer의 성능 보장이 아니다. 최신 원문/초록이 제시한 메커니즘을 하니스에 비학습 방식으로 적응한 것이므로, 직접적인 저장소 효과는 별도 실험으로 검증해야 한다.
3. 논문 적응은 학습 없는 prompt/orchestration 경로만 인정했다. AdaCoM과 MSV처럼 핵심 경로가 RL/학습에 의존하는 후보는 제외했으며, excluded 후보를 산입 수에 섞지 않았다.
4. subagent dispatch 및 dispatch-log 메커니즘의 실제 런타임 제공 범위와 파일 mtime 정밀도는 환경 검증이 필요하다. 이는 ZCode 지원 7종 훅 이벤트와 별도인 오케스트레이션 표면이다. 미지원이면 fail-open을 넓히지 말고 런타임 capability를 별도 신호로 기록해야 한다.
5. context marker를 모두 폐쇄하면 실제 압박에서 루프가 멈출 수 있다. 구조화된 pressure event와 transcript 발화를 구분하는 회귀 표본이 필수다.
6. 이후 구현 전의 **의존성 기반 검증 순서(백로그 우선순위와 별개)**는 F01→F02/F03→F04/F05/F06→F07/F08이다. 각 항목에서 receipt·plan hash·dispatch provenance·review stale 신호를 수집한다. 이번 문서에는 패치·명령·테스트 실행 결과를 포함하지 않는다.

## 출처

### 저장소 1차 근거

- `hooks/scripts/stop-gate.js:33,47-64,80-135,225-279,435-467`
- `hooks/scripts/lib.js:48-63,79-83,106-117,139-184`
- `hooks/scripts/dispatch-log.js:14-40`
- `hooks/scripts/plan-gate.js:19-45`
- `hooks/scripts/session-start.js:13-48`
- `hooks/scripts/route-intent.js:22-60`
- `hooks/scripts/comment-checker.js:13-14,78-107`
- `hooks/scripts/edit-diagnostics.js:96-99`
- `hooks/hooks.json:3-31`
- `skills/forge/SKILL.md:State Protocol, Phase 4`
- `skills/hammer/SKILL.md:1c, Step 3, 23-28,103-119`
- `agents/feasibility-critic.md`, `integration-critic.md`, `coverage-critic.md`, `implementation-critic.md`, `security-reviewer.md`, `qa-reviewer.md`의 Verdict 계약
- `tests/gates.test.js:1-803`
- `README.md:10,88,94,99-101,123`

### 연구 1차 근거

- [SETS, arXiv:2501.19306](https://arxiv.org/abs/2501.19306), 2025-01-31
- [Mutation-Guided LLM-based Test Generation at Meta, arXiv:2501.12862](https://arxiv.org/abs/2501.12862), 2025-01-22
- [MCTS-Judge, arXiv:2502.12468](https://arxiv.org/abs/2502.12468), 2025-02-18
- [Effective LLM Code Refinement via Property-Oriented and Structurally Minimal Feedback, arXiv:2506.18315](https://arxiv.org/abs/2506.18315), 2025-06-23
- [Specification Self-Correction, arXiv:2507.18742](https://arxiv.org/abs/2507.18742), 2025-07-24
- [ACON, arXiv:2510.00615](https://arxiv.org/abs/2510.00615), 2025-10-01
- [TRACE, arXiv:2601.20103](https://arxiv.org/abs/2601.20103), 2026-01-27
- [Diagnosing Reliability via IRT, arXiv:2602.00521](https://arxiv.org/abs/2602.00521), 2026-01-31
- [AutoChecklist, arXiv:2603.07019](https://arxiv.org/abs/2603.07019), 2026-03-07
- [AgentSwing, arXiv:2603.27490](https://arxiv.org/abs/2603.27490), 2026-03-29
- [AdverMCTS, arXiv:2604.10449](https://arxiv.org/abs/2604.10449), 2026-04-12
- [ADAP, arXiv:2605.17609](https://arxiv.org/abs/2605.17609), 2026-05-17
- [SpecBench, arXiv:2605.21384](https://arxiv.org/abs/2605.21384), 2026-05-20
- [Reliability without Validity, arXiv:2606.19544](https://arxiv.org/abs/2606.19544), 2026-06-17
- [Plans Don’t Persist, arXiv:2606.22953](https://arxiv.org/abs/2606.22953), 2026-06-22
- [The Verification Horizon, arXiv:2606.26300](https://arxiv.org/abs/2606.26300), 2026-06-24

## 자체 검증 체크리스트

### S1~S6

- [x] **S1 / G06** — 정확히 6개 단계 표와 각 단계의 진입·강제·증거·발견·양호 근거·인용이 있다. 앵커: `## 코어 루프 6단계 감사`, 표 6행.
- [x] **S2 / G07** — F01~F12 모든 발견에 파일·라인 또는 심볼 인용이 있다. 앵커: `### F01~F12 발견 원장`.
- [x] **S3 / G08** — 6단계 각각 R-ID와 primary URL이 있다. 앵커: `## 단계×기법 커버리지`.
- [x] **S4 / G09** — 산입 후보는 R01~R16의 16개이며, G02~G05(기간·구별성·무학습·이식성)를 통과한 수는 16으로 재계산된다. 앵커: `## 최신 연구 후보 카탈로그`.
- [x] **S5 / G10** — 백로그는 매우 큼→큼→중간→작음 순이고, 각 행에 단계·F/R 근거·효과·대상 symbol/Skill/event 스케치·비용·난이도·위험/검증 신호가 있다. 앵커: `## 우선순위 개선 백로그`.
- [x] **S6 / G11** — 최종 산출물은 이 한국어 문서 한 개이며 이번 작업에서 코드·설정·테스트·`.gjc/`·`.glm-hammer/` 파일을 변경하지 않았다. 앵커: 문서 경로와 본 절.

### G01~G12 원장

| 게이트 | 판정 | 근거/앵커 |
|---|---|---|
| G01 핸드오프 완전성 | PASS | 6단계 집합, 6/6, 각 행 필수 필드. `코어 루프 6단계 감사` |
| G02 최근성 | PASS | R01~R16의 최초 arXiv 날짜가 2025-01-22~2026-06-24로 창 안. `최신 연구 후보 카탈로그` |
| G03 구별성 | PASS | 행동 단위·정보 흐름·종료 조건의 증분과 병합 규칙을 명시. `산입·적응 원칙` |
| G04 무학습 | PASS | 적응안은 Skill/Prompt/Subagent/event only; AdaCoM·MSV는 제외. `병합·제외` |
| G05 이식성 | PASS | 7종 지원 이벤트와 Skill/Subagent로 표현; 미지원 이벤트·임의 stdout key 없음. `범위와 방법` |
| G06 6단계 기록 | PASS | S1 및 6행 감사표 |
| G07 인용 완전성 | PASS | S2 및 F01~F12 원장 |
| G08 단계 커버리지 | PASS | 6/6, 단계별 R-ID≥1. `단계×기법 커버리지` |
| G09 고유 후보 수 | **PASS** | 산입 16개 `≥12`; 제외 후보를 세지 않음. S4 |
| G10 백로그 | PASS | 상승폭 단조 정렬과 필수 열. S5 |
| G11 단일 산출물 | PASS | 지정 target 경로의 문서 1개. S6 |
| G12 독립 critic | **PENDING** | 이 문서의 S1~S6 자체 검사는 PASS이나, 별도 읽기 전용 critic receipt(`CHECKS`, `SM1..`, `VERDICT`)는 이 산출물에 영구 파일로 만들지 않았으므로 독립 영수증은 후속 승인 단계에서 확인해야 한다. |

**자체 결론:** 내용·범위·후보 수 기준은 PASS이며 G09는 명시적으로 PASS다. 독립 critic receipt를 문서 안에 날조하지 않기 위해 G12만 PENDING으로 표시했다. 이는 연구·감사 사실을 완료로 위장하지 않기 위한 정직성 경계다.
