# Round 3 — Verifiability Critic (vs DRAFT v3)

**[Blocking]** "M3's routing fixture ④ is unsatisfiable given M3's own frozen workRequest addition." `발표`가 workRequest에 들어가면 "발표했어요"가 게이트를 통과해 힌트 방출 — 픽스처④(무발화) 실패. **Fix:** 복합 토큰/동사-명사 분리 재설계 + 픽스처 ④b로 의도 고정.

**[Blocking]** "M3's auxiliary drift grep contradicts M3's own flow rule that defers awaiting-user/exporting to M5 — satisfiable only by dead markers." **Fix:** 시대별 부분집합 단정(M3) → 전체 동등성(M5).

**[Blocking]** "§0's approval-reset rule '해당 round 증가' never defines the seal-file → round mapping, so M2's test ⓚ is not binary-decidable and M2/M4 can implement divergent — or livelocking — semantics." 판독 1(전 라운드 증가): building에서 편집마다 패널 무효화 트레드밀; 판독 2(파일별): ⓚ의 기대 필드가 다름. 교차검증은 status·tail만 비교라 미탐. **Fix:** §0에 파일→라운드 매핑 행 동결 + ⓚ에 정확한 필드 + 부정 단정.

**[Concern]** 이미지 API 스파이크만 실패 결과 미정의. **Fix:** 실패 → M4 전 에스컬레이션, 폴백 = WebSearch-only+이미지별 라이선스 확인.
**[Concern]** 논스 기준이 사건 참조 — 사후 판정 불가(전사가 transcript에만). **Fix:** `transcription.md` 영속 + 파일 술어(전사==논스, VERDICT: APPROVE 라인).
**[Concern]** M5 도식-export 정책에 판정 가능한 단정 없음 — 도식 전량 드롭해도 통과. **Fix:** 픽스처 2런: (a) PNG 존재→도식 슬라이드 picture 1개 (b) 부재→제목+노트+0 picture.
**[Nit]** imagePanel.required "imaging 시작 시" vs "채택됨" 정의 모순 — "imaging 완료 시". **[Nit]** 주소화 컨벤션 준수의 판정 부재 — SKILL.md가 README 경로 인용 grep.

**Survived:** build.md 위조(라uw 하우스 패턴); ⓗ 정직 라벨; M1∥M2; planKey 윈도우 경로; M5 환경 판정성; 텍스트-only 무게이트(의도된 done-skip… 단 Security가 반박).
