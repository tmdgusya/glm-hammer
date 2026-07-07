# Round 3 — Hidden Complexity Critic (vs DRAFT v3)

**[Blocking]** "M3's router fixture ④ is mutually unsatisfiable with M3's own frozen regex change." (수렴) **Fix(채택안):** deck 명사를 workRequest에 넣지 말 것 — workRequest엔 누락 동사(`뽑|생성|추출|export`)만 추가, 명사는 deck 분기 정규식에만. ①은 동사+명사로 통과, ④는 동사 없어 침묵.

**[Blocking]** "The frozen deck-gate static check (https?:// in index.html) collides with the brief's mandatory in-deck attribution." (수렴) **Fix:** 속성/CSS 스코프 검사 + 양성 시나리오.

**[Blocking]** "M3's mechanized drift test '각 §0 status가 마커 어딘가 등장' is unsatisfiable at M3 time — four of eight statuses don't exist in the M3-era Process." M5의 "기존 단정 무수정"이 강화도 금지. **Fix:** 마일스톤별 마커 집합 상수 명시(M3/M4/M5 단계 확장), M5 예외 문구, fenced-JSON 동등성은 M3부터 전 집합.

**[Blocking]** "Round-increment-on-every-armed-write conflates receipt invalidation with the ≤3-round escalation counter, and branch ③'s building scope forces panel re-runs on every multi-turn build." 빌드 턴마다 존재 불가능한 round-N 수령증 요구→차단→재패널, round가 기계적 편집으로 5-10 도달 → 허위 에스컬레이션. **Fix:** ③에서 building 제외 + "에스컬레이션은 REJECT 수령증 개수로 계산, round는 무효화 카운터" 동결.

**[Concern]** 논스 OCR 취약(0/O·1/l/I·rn/m) — 오독 1회가 영구 아키텍처 결정(분기② 영구 휴면)으로 라우팅. **Fix:** 알파벳 A-HJ-NP-Z2-9·길이 6·≥24px·불일치 시 새 논스 1회 재시도·에스컬레이션 메시지에 렌더 상태 명시.
**[Concern]** M3 정직 태스크 수 12-14 — 라우터 하니스는 패턴 복사가 아닌 신규 인프라(UserPromptSubmit+additionalContext 내용 단정은 전례 없음). M4엔 분할선이 있는데 M3엔 없음. **Fix:** M3a(SKILL.md+체이닝+crucible+드리프트)/M3b(라우팅+하니스+plugin.json) 분할선 추가 — M4는 M3a에만 의존.
**[Nit]** required "imaging 시작 시" 설정 vs 채택 의미 모순 — "imaging 종료 시, 채택≥1이면 1". **[Nit]** 매니페스트 파일명 경로 규약(“deck 기준 상대·포워드슬래시”) 동결 + 서브디렉토리 이미지 M2 시나리오.

**Survived:** planKey 하위호환; M1∥M2; hybrid-done 형상(hammer 선례); 원장 시드; zero-dep grep 신판; crucible 2줄 정직성(훅은 키 보존 — 위협은 모델 재기록뿐, (a)가 해소).
