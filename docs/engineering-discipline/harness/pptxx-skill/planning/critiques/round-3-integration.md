# Round 3 — Integration & Risk Critic (vs DRAFT v3)

**[Blocking]** "The visual-qa screenshots have no legal place to live — branch ③, the screenshot pipeline, and M5's path restriction form a three-way contradiction." deck 안이면 매니페스트 미등재로 차단+매니페스트 재작성이 패널 라운드 무효화 루프; 밖이면 M5 경로 제한이 재사용 거부. **Fix:** §0에 `<deck>/shots/`(또는 evidence) 동결, 분기 ③ 스캔·deck-gate 추적에서 제외, M5 allowlist 포함, M2 시나리오.

**[Blocking]** "deck-gate's frozen static check bans https?:// from index.html, but the product requirement is to render source URLs in index.html." 출처 표기 deck 전부 봉인 거부 → 모델이 출처를 지우도록 기계적 압박. **Fix:** 속성 스코프 검사(src=/srcset=/link href=/url()/@import만 차단, `<a href>`·텍스트 허용) + M2 양성 시나리오.

**[Blocking]** "The approval-reset rule doesn't say which round a given file increments — and branch ③ is live during building, so the natural reading voids the image panel on every HTML edit." **Fix:** 매핑 동결(attributions→imagePanel; index/slides→visualQa) + 분기 ③를 visual-qa부터로.

**[Blocking]** "The resume marker is immortal — amendment (a) preserves it in '모든 상태 재기록', so an abandoned pptxx chain silently hijacks a future standalone crucible run." 몇 주 후 순수 디자인 런의 Phase E가 낡은 마커로 강제 approved+pptxx 복귀. **Fix:** consume-on-read(복귀 시 소거) + terminal(done) 기록 시 소거.

**[Concern]** 복귀 기록이 phase/status/resume만 — deck·slides가 crucible 왕복에서 소실. **Fix:** 복귀 기록에 deck·slides 재기록 + design 설정.
**[Concern]** 이미지 0 deck의 attributions.md 봉인 요구(Value와 수렴). **Fix:** 빈 매니페스트 규칙 또는 조건부 멤버십.
**[Concern]** workRequest `발표` vs 픽스처④(수렴).
**[Nit]** hybrid-done 강제가 stopBlocks 6에서 영구 침묵(라우터가 done을 비활성으로 봐 카운터 미리셋) — §0에 잔여 리스크 기록.

**Survived:** M1 선행 배치; M2 휴면 안전; M1∥M2; awaiting-user 행; §0 인용 전부 실코드 일치.
