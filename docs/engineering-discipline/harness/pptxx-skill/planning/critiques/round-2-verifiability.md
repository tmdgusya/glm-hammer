# Round 2 — Verifiability Critic (vs DRAFT v2)

**[Blocking]** "M5's zero-dep boundary criterion is mathematically unsatisfiable at the time it runs." (dependency와 수렴; hooks/는 오늘도 edit-diagnostics.js가 `python` 매칭) **Fix:** `python-pptx|import pptx|spawn(Sync)?\(['"](python|py)` 마커 grep + 예외.

**[Blocking]** "M1's isolation criterion is verified with a repo-global command while M2 runs in parallel in the same tree." (수렴) **Fix:** M1 자체 footprint로 스코프.

**[Blocking]** "§0 branch ① keys on an ordering ('building 이후') that the frozen contract never defines — the one non-string-exact clause in a contract whose whole justification is string exactness." status는 순서 없는 enum; 포함성 모호(building 자체 포함 시 mid-build 정차가 missing 봉인으로 차단). **Fix:** §0에 집합 동결("봉인 요구 status = [...]" — building 포함 여부 명시), M2 ⓐ가 경계 원소 커버.

**[Blocking]** "The imagePanel contract cannot verify the unanimity it claims — one frozen receipt per round vs. a count-based schema." `{required:5, approved:5}` + 이미지 1만 검토한 수령증 1건이 ⓔ 통과 — forgeGate의 CRITICS[] 매핑(수령증↔승인자)이 여기 없음; 게이트가 읽는 라운드도 미명시. **Fix:** §0 동결 — 라운드당 1디스패치가 전 채택 이미지를 단일 수령증에서 판정, CHECKS 블록이 모든 이미지 경로 열거, required ∈ {0,1}, 게이트는 imagePanel.round의 수령증 검사.

**[Blocking]** "The M1 screenshot spike's decisive criterion is self-graded and satisfiable without the PNGs ever being read." 센티널이 같은 에이전트가 쓴 HTML에 있음 → HTML에서 전사+APPROVE 스탬프 가능, PNG 백지여도 green. **Fix:** 정보 격리 서브에이전트(PNG 경로만 전달, 디스패치 프롬프트 기록) + 랜덤 논스 센티널(판독자 미제공 파일에 기록) + 전사=논스 일치 시에만 충족.

**[Concern]** M4/M5 기준이 M1 결과에 무조건적인데 M1은 스파이크별 실패 허용 — REJECT 시 "M1 증명 명령"이 부재해 M4 기준 충족 불가, 축소 기준 미정의. **Fix:** 각 1줄 조건부 — M4: 면제 시 visual-qa phase 부재 + visualQa.required 미설정을 테스트로 단정; M5: pptx 스파이크 중단 시 마일스톤 취소.

**[Concern]** resume 마커 생존 무보증, M3는 프로즈 존재만 검증. (수렴) **Fix:** crucible State Protocol에 resume 추가/보존 규칙 + grep 단정.

**[Concern]** M4 기계화 교차검증의 추출 규칙 미정의 — tail 2종 grep만으로 자명 통과하며 제3의 미동결 tail 반입 가능. **Fix:** 규칙 명문화 — "SKILL.md 내 `evidence/deck/[^\s)\`]+` 전 매칭(round-N 정규화)이 §0 tail 집합의 원소; 마커 필드명 전부가 §0 스키마 키 집합 원소".

**[Concern]** §0가 `evidence/deck/build.md`를 동결하지만 어떤 분기·시나리오도 요구 안 함 — 죽은 계약. **Fix:** 분기 ①에 부착(+M2 시나리오) 또는 삭제.

**[Nit]** visualQa.required(불린)가 게이트 키 diagrams와 중복 — 드리프트 미끼. **[Nit]** Wikimedia는 익명 rate-limit 헤더 미반환 흔함 — "관측 안 되면 '없음' 명시 시 충족". **[Nit]** 미동결 스칼라: 크기 상한 수치, M5 부정 케이스 위치, 픽스처 ② 문자열, plugin.json 키워드 문자열; M3/M4 Effort 부재.

**Survived:** §0 인용 전부 실코드 일치; fabricated receipt 실현성((h) 선례); route-intent spawn 테스트 가능성; 봉인 집합 건전성+ⓙ; planKey 무충돌.
