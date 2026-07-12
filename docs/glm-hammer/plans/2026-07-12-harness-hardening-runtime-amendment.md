# 하니스 강화 실행 계획 수정 기록

## 상태

- 승인: 사용자 위임("뭐 알아서 하세요")에 따라 실제 설치 런타임을 조사하고 독립 Architect 검증을 거쳐 적용
- 원 계획: `.gjc/_session-019f548a-57bd-7000-8a45-aeb9d45b42c8/plans/ralplan/019f548a-57bd-7000-8a45-aeb9d45b42c8/stage-01-planner.md`
- 범위 변경: 없음. Phase 0의 런타임 identity 값과 캡처 절차만 관측된 사실로 교체

## 관측된 정확한 런타임

- Engine name: `zcode-cli`
- Engine version: `0.15.2`
- Engine artifact: `/opt/ZCode/resources/glm/zcode.cjs`
- SHA-256: `0f2ab95e39876fd639a15eb207fd42ca692d145f44ae5093714071a07de9c16e`
- `doctor --json`: `processName=zcode-cli`, `version=0.15.2`
- Desktop wrapper `/opt/ZCode/zcode`의 `3.3.4`는 엔진 artifact identity로 사용하지 않음

원 계획의 예시값 `zcode` / `3.2.x` / `$HOME/bin/zcode`는 이 환경에 존재하지 않으며 wildcard identity라서 fail-closed validator를 통과할 수 없다. 위 관측값이 이 실행의 유일한 승인 identity다.

## 캡처 절차 수정

1. 빈 외부 임시 디렉터리를 `GLM_HAMMER_CAPTURE_DIR`로 생성한다.
2. `tests/runtime-capture.sh --output-dir "$GLM_HAMMER_CAPTURE_DIR" --run-headless`가 안전한 임시 hook/workspace 구성을 만들고 정확한 engine artifact를 실행한다.
3. 스크립트가 headless `--prompt`/`--resume` 시퀀스로 normal/compact `SessionStart`, `UserPromptSubmit`, `Stop`, 단일 Agent/Task `PostToolUse`, 병렬 2개 `PostToolUse`를 실제 관측한 뒤 `CAPTURE_SEQUENCE_VERIFIED`를 출력한다.
4. 원시 프롬프트·응답·경로·비밀 값은 보존하지 않고 필드명과 원시 타입만 보존한다.
5. `tests/runtime-capture.js --promote`가 source bytes, manifest, canonical fixtures를 결속한다.
6. 독립 Architect receipt `agent://44-RuntimeGateArchitectFinal`의 `CLEAR/APPROVE`와 다음 해시를 사용한다.

## 승인 해시

- `manifest.json`: `0068fb81665c4591fc1ff89e52d1a74c4e868a90d710bcb78429357f4d18e56a`
- `capabilities.json`: `b5c9a69fb328ba5657e5b6a5650fa7769456a55ac0b51f3016473dfbd17f8bab`
- `capability-matrix.json`: `4a4f75bf50beb875671414eda5b84325cdd1e0083fc1e6ac55bb1e2c69146cad`

## 유지되는 경계

- 지원 이벤트는 정확히 7종이다.
- `AskUserQuestion`과 `Bash`는 미관측/unsupported이며 release credit을 얻지 못한다.
- 질문 증명은 승인된 `Stop` transcript shape를 사용한다.
- F11은 `OPEN`으로 유지한다.
- 원 계획의 Tasks 2–7, crucible/pptxx 호환성, zero-dependency Node 경계는 변경하지 않는다.
