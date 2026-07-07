# Round 3 — Dependency & Ordering Critic (vs DRAFT v3)

**[Blocking]** "M3's frozen router change makes M3's own fixture ④ unsatisfiable." (수렴 — 동일 채택안: 동사만 workRequest, 명사는 deck 분기)

**[Blocking]** "The frozen resume protocol preserves only `resume` across the crucible round-trip — `deck` and `slides` are lost, and the return-record clause doesn't restore them." 복귀 후 분기 ①·③이 해석할 디렉토리 부재 → 전면 fail-open 또는 충족 불가 차단. **Fix:** 보존 규칙을 `resume`·`deck`·`slides`로 확대(여전히 crucible 1줄) + 복귀 기록은 merge로 deck·slides 재기록 + M2 픽스처(state에 deck 부재 → fail-closed block).

**[Blocking]** "M3's marker-coverage drift test demands ⟨state:⟩ markers for statuses whose phases M3 explicitly defers to M4/M5." (수렴)

**[Blocking]** "Branch ③'s 'all image files in the deck directory' scope collides with M5's reuse of visual-qa screenshots." (수렴 — shots/ 동결 채택)

**[Concern]** build.md의 생산자 무배정 — 소비자(분기①)만 존재, drift test는 ⊆라 공허 통과. **Fix:** M4 기준에 기록 지시 존재 + M4에서 membership→coverage 승격.
**[Concern]** 파일→라운드 매핑 미동결(수렴). **Fix:** `slides.md→both; index.html→visualQa; attributions.md→imagePanel` 표 행.
**[Concern]** M1의 외부 런타임 설치 실패가 통합 실패로 오분류 — pip 에러가 스코프 절단으로 기록됨. **Fix:** 설치 명령·버전 기록 + 에스컬레이션 메시지가 env/integration 분류, env 실패는 M1 일시정지.
**[Concern]** attributions.md 파싱 문법 무정의 — M2 파서와 M4 프로즈가 다른 포맷 발명 가능. **Fix:** §0에 예시 행 1개 동결(5열 테이블).
**[Nit]** M4 deps에 M2 직접 엣지 미표기(이행적으로 정당하나 재계획 위험). **[Nit]** hybrid-done의 stopBlocks 미리셋(라우터가 done 비활성 취급) — ⓖ 근거에 캡이 의도된 탈출구임을 1줄.

**Survived:** M1∥M2 스윕; 사이클 없음; M2 휴면; M5 grep 신판 vs 자체 테스트 편집; awaiting-user 스코핑.
