# Round 3 — Security & Access Critic (vs DRAFT v3)

**[Blocking]** "Gate branches ② and ③ are armed by self-reported flags — the enforcement §0 freezes is fail-open by default, contradicting Success Criteria 2·3." 플래그·status 전이 모두 모델 자필 — 안 세우면 전 통제 휴면. 하우스 선례는 반대(forgeGate는 phase면 무조건 + fail-closed 기본값, stop-gate.js:78·100-104). **Fix:** deck-gate를 무장 권한으로(토큰-게이트 상태 변이 선례): index.html 봉인 시 로컬 이미지 참조 grep→required=1; slides.md 봉인 시 도식 블록 grep→visualQa.required=true(면제 마커 제외) — 원웨이 래칫, M2 테스트 각 1건.

**[Blocking]** "The frozen static checks and seal verification are silently unenforced for any deck where both flags are off — a `<script>`-bearing deck ships with zero gate contact." 텍스트 deck(M3-시대 기본 플로우)은 visual-qa/exporting을 안 지나 분기 ①이 어디서도 미실행; additionalContext는 자문일 뿐. **Fix:** hybrid-done을 `state.deck` 존재에 키잉 — done && deck → 분기 ① 재검증. ⓖ 확장.

**[Blocking]** "visual-qa screenshots collide with the manifest-completeness check and with M5's own path restriction." (수렴 — shots/ 채택; 스캔 집합을 확장자 목록으로 동결: png/jpg/jpeg/gif/webp/svg, shots/ 제외)

**[Concern]** Playwright가 JS 실행 — 리터럴 검사는 base64 iframe/srcdoc 엔티티 인코딩으로 우회 가능. **Fix:** `javaScriptEnabled: false` + deny-by-default 요청 차단을 필수로 동결(옵션 아님); 서브스트링 검사는 심층방어로 강등.
**[Concern]** 매니페스트의 라이선스 코드를 게이트가 미검사 — 허용목록은 프로즈 전용. **Fix:** 분기 ③ 파싱 확장: license ∈ {cc0,pdm,cc-by,cc-by-sa} 또는 `user-confirmed` 필드, 아니면 block; ⓜ 옆 테스트 행.
**[Concern]** sha256은 무결성이지 출처가 아님 — 매니페스트는 다운로더 자필. **Fix:** `evidence/deck/fetch.md`(raw: curl 명령·최종 URL·Content-Type·sha256) tail 집합 추가 + 패널 교차 참조 + "무결성 매니페스트"로 개칭.
**[Concern]** critic Write가 경로 무제약 — 주입된 visual-qa critic이 타 critic 수령증 위조 가능(원장은 작성자별 아님). **Fix:** "자기 evidence 경로 1개만 Write, 위반은 REJECT급" 규칙 + (j) 단정.
**[Concern]** resume 고속 경로가 `status: approved` 자동 설정 — 사용자의 디자인 수락 관문 삭제. **Fix:** forge 분기만 생략, 디자인 제시+명시 수락 유지; pptxx 완료 신호에 crucible 패널 수령증 APPROVE 확인 추가.
**[Nit]** 분기 ③ 셀에 `sealMatches(attributions.md)==='ok'` 명시. **[Nit]** M1 바이너리 커밋 — URL+sha256+치수 기록 후 삭제/gitignore.

**Survived:** Bash 밀반입 편집(F2 수정과 합성 시); 승인 후 이미지 교체(③+리셋 합성); token-gate 충돌 없음; 크리에이터 문자열 주입(데이터-비지시 라인); 기존 탈출구들.
