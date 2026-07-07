# Round 2 — Security & Access Critic (vs DRAFT v2)

**[Blocking]** "Panel approval is not bound to image bytes — the frozen seal set excludes images and no provenance manifest exists, so a post-approval image swap (or late-added image) ships with zero gate resistance, defeating Success Criterion 2." 봉인 집합이 바이너리를 제외(정당)하지만 보상 통제가 없음: 승인 후 curl 재다운로드로 무라이선스/NC/불안전 이미지 교체 가능 — stop-gate.js:8-9의 저장소 자체 위협 모델("Bash로 밀반입된 편집은 봉인을 깬다")과 모순. 또한 JPEG엔 라이선스가 없어 critic의 체크 ⓐ는 오케스트레이터 주장에 의존(위조-증거 패턴). **Fix:** 봉인되는 출처 매니페스트 `decks/<d>/attributions.md`(파일명·sha256·source URL·라이선스·저작자)를 §0 봉인 집합에 추가; 게이트 분기 ③이 deck 내 모든 이미지가 매니페스트에 sha256 일치로 존재함을 검증(sha256File 기존 존재); critic은 봉인된 매니페스트+직접 해시로 판정.

**[Concern]** "no `<script>` / no external refs" 규칙이 프로즈 전용 — deck-gate.js가 이미 파일을 읽으므로 결정적 강제 지점이 존재; "비-file:// 차단"은 `file://` 로컬 파일 렌더(스크린샷으로의 유출)를 못 막음. **Fix:** deck-gate가 `<script`, `javascript:`, `https?://` 참조, 경로 이탈(`../`·절대·드라이브·`file://`)을 차단; M2 부정 테스트 1건.

**[Concern]** M1이 프로젝트 최초의 실제 웹 이미지 다운로드를 정책 없이 수행해 git 이력에 바이트 커밋 — NC-ND 이미지가 무표기로 저장소 이력에 남을 수 있음. **Fix:** 스파이크 다운로드는 `license=cc0|pdm` + `mature=false` 쿼리 한정, README에 출처 표기.

**[Concern]** insane-search 금지가 사용은 다루지만 설치를 안 다룸; "사용자 제공 URL" 예외는 사용자 전달 문서 내 공격자 URL도 포함; 주입 통제가 두 critic 파일에만 있고 오케스트레이터가 소비하는 fetched 웹 텍스트(최대 대역폭 채널)는 미커버. **Fix:** 설치는 세션별 명시 승인 + URL별 확인; "데이터-비지시" 조항을 SKILL.md의 모든 fetched 웹 텍스트로 확장.

**[Concern]** 두 신규 critic이 하우스 계약의 Bash를 상속 — 주입 압력 하의 에이전트에 불필요 능력. **Fix:** tools에서 Bash 제거.

**[Nit]** BY-SA는 무수정 임베드만(크롭/틴트는 파생물). **[Nit]** https-only가 리다이렉트 미보증 — `curl --proto '=https' --proto-redir '=https' --max-redirs 3`.

**Survived:** awaiting-user 게이트 우회(기존 저장소 전역 탈출구, exporting 게이트 유지로 재진입); rate-limit/UA 예절; M5 경로 제한; planKey 회귀.
