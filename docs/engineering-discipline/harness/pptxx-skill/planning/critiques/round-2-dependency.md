# Round 2 — Dependency & Ordering Critic (vs DRAFT v2)

**[Blocking]** "M5's zero-dep grep criterion is unsatisfiable by construction — M2's own deliverable guarantees matches." `pptx`는 `pptxx`의 부분 문자열 → M2 이후 stop-gate.js·gates.test.js에서 수십 건 매칭. **Fix:** 의존성 마커 grep으로 교체(`python-pptx|require\(.*pptx|spawn.*python`).

**[Blocking]** "§0 freezes gate branch ② on `slides.diagrams > 0` while the frozen schema carries an unused `visualQa.required` flag — so the visual-qa waiver path that M1 explicitly plans for forces redoing M2." 면제 시 도식 있는 deck은 (a) `diagrams:0` 허위 기재(프로토콜 위반) 또는 (b) M2 재작업. **Fix:** 분기②를 `visualQa.required === true`로 리키잉; SKILL.md 규칙 "diagrams>0이면 required=true, 단 M1 에스컬레이션 면제 시 제외"; diagrams는 정보성.

**[Blocking]** "The frozen resume protocol depends on `state.resume` surviving crucible's run, but crucible's own State Protocol shape omits the field and M3 only edits Phase E." (complexity와 수렴) **Fix:** crucible 수정 2줄로 확대(State Protocol에 resume 보존), grep 테스트가 그 라인도 단정, 락 시 확대 diff 표기.

**[Blocking]** "M1's isolation criterion is defined over global `git status --porcelain`, which M2 — declared parallel — mutates." 검증 술어가 공유 상태. **Fix:** M1 자체 작업 범위로 스코프("M1이 생성·수정한 파일 전부가 spikes/ 하위") 또는 worktree.

**[Concern]** §0 imagePanel required/approved 시맨틱 미정의 vs 라운드당 단일 수령증 tail — M4가 이미지별 패널로 해석하면 이른 REJECT가 후속 APPROVE에 덮임. **Fix:** §0 1문장 — 라운드당 1회 일괄 판정, 수령증이 전 이미지 열거, required 의미 고정.

**[Concern]** M3가 M1의 두 계약 산출물에 의존하는데 M1은 스파이크별 중단권 보유, M3 폴백 미정. **Fix:** "스파이크 중단 시 해당 계약 문서는 M3에서 저작" 1줄.

**[Concern]** 복귀 후 `phase:'crucible', status:'approved'`에서 pptxx로 되돌리는 주체 미지정 — 그 지점 게이트 침묵 + route-intent가 "crucible 재개" 오안내. **Fix:** §0에 "복귀 즉시 pptxx가 `phase:'pptxx', status:'chaining'` 기록" + 드리프트 테스트 커버.

**[Nit]** deck 인텐트의 사다리 위치가 designIntent 상대로만 정의 — executeIntent 대비 미정("발표 슬라이드 계획 실행" + 기존 플랜 존재 → hammer). 전체 위치 명시(executeIntent 뒤, designIntent 앞). **[Nit]** M3·M4 Effort 부재.

**Survived:** M4 컨틴전시 stop-gate 터치(M3 경유 직렬 + 기존 단정 보존 제약); gates.test.js 다중 작성자 직렬화; M4→M2·M5→M2 엣지(M3 경유 이행적); deck-gate 봉인 병합 무충돌(lib.js:94-108 per-key); test (b) 실태 확인.
