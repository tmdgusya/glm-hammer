# Round 2 — Value & Sequencing Critic (vs DRAFT v2)

**[Blocking]** "M3's abort point is broken for exactly the decks its User Value claim advertises — a diagram-bearing deck made in the M3-era hits gate branch ② with no possible receipt, because the visual-qa critic and the visual-qa phase both ship in M4." M3가 §0 스키마 그대로 + 도식 블록 포맷을 정의하므로 정직한 런은 `slides.diagrams>0` 설정 → M2 게이트가 수령증 요구 → critic 부재(파일 없으면 폴백도 없음) → 6회 차단 후 fail-open. **Fix:** M3-시대 SKILL.md는 도식 블록을 예약어로 두고 `slides.diagrams`를 0으로 기록(M4가 카운팅 활성화); M3 User Value에서 "SVG" 제거.

**[Blocking]** "M3 — the first user-value milestone — hard-depends on two contract artifacts that live inside spike deliverables, and M1's spike-failure clause defines a continuation path for M2 only, leaving M3 undefined if either spike is aborted." format-spec.md·스크린샷 컨벤션은 저작 계약 문서이지 환경 의존 증거가 아님. **Fix:** 두 계약 문서를 스파이크 성공과 무관한 무조건 M1 산출물로; §0 분기② 활성화와 M5만 스파이크 성공에 인질.

**[Concern]** `awaiting-user` 옵트인 단계의 M3/M4-시대 소유권 미정 — §0 문자 그대로 따르면 M3-시대 deck이 답 없는 질문에 영구 정차. **Fix:** M3 SC 1줄: M3/M4-시대 플로우는 `building → [visual-qa] → done` 직행, `awaiting-user`/`exporting`은 M5가 삽입.

**[Concern]** M3의 M1 의존이 실제 데이터 플로우보다 거침 — 첫 사용자 가치가 M4/M5만 소비하는 스파이크 증명을 기다림. **Fix:** M3 의존을 두 계약 문서로 좁힘(문서 존재 즉시 착수 가능).

**[Concern]** "코어 플로우 완성"이 이미지 경로 과대 — M3-시대 이미지 지시어는 이행 불가. **Fix:** 파싱-후-유예(라벨된 플레이스홀더), User Value를 "텍스트 deck"으로 한정.

**[Nit]** M3·M4에 Effort 필드 부재.

**Survived:** M1∥M2 병렬(M1이 스위트 미실행); M2 휴면 주장(pre-M3 구간); M2 가치 재라벨 정직; M5→M4 엣지; 라우터-스킬 동시 착지; brief 성공 기준 5종 매핑 완전.
