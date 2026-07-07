# Round 2 — Integration & Risk Critic (vs DRAFT v2)

**[Blocking]** "§0 has no approval-reset-on-edit semantics and M2's scenario list omits the '승인 리셋' regression scenarios the Problem Brief's Verification Strategy explicitly requires — an automatic contradiction finding." 승인 후 index.html 편집 → deck-gate 재봉인 → 낡은 round-N 수령증으로 ②③ 통과. crucible은 token-gate.js:29-45로 정확히 이 구멍을 막았고 테스트 (i)가 단정. **Fix:** §0에 리셋 조항(승인 후 slides.md/index.html tracked write → approved 0화·round 증가) + M2 시나리오 ⓚ ((i) 미러).

**[Blocking]** "The crucible Phase E '1줄' scope amendment's blast radius is underestimated — the resume marker will not survive to Phase E, and the return-side state write is unspecified." (수렴) **Fix:** 2접점 명시((a) crucible State Protocol 보존 규칙 (b) §0에 복귀 직후 pptxx의 상태 기록) + 락 항목 재라벨.

**[Blocking]** "§0 gate branches are not status-scoped, leaving pre-`building` statuses either silently ungated or prematurely blocked — and a silently-abandoned pptxx run hijacks route-intent forever." 필드 늦게 설정 시 초기 status에서 게이트 전무 → 방치 런이 route-intent를 영구 납치; 일찍 설정 시 존재 불가능한 수령증 조기 요구. **Fix:** §0에 분기별 적용 status와 각 필드의 설정 시점 명시 + M2 초기-status 정차 시나리오.

**[Blocking]** "`format-spec.md` — the slide-md contract that M3, M4, and M5 all consume — is a deliverable of the individually-abortable PPTX spike." (수렴) **Fix:** 무조건 M1 산출물로(스파이크는 소비자); 실패는 M5만 축소.

**[Blocking]** "The visual-qa descope escalation is placed after M3 has already shipped the diagram-counting prose." "M4 착수 전" 에스컬레이션인데 M3가 이미 diagrams 설정 프로즈를 출하 — 면제 결정이 완료된 M3 수정을 강제. **Fix:** 에스컬레이션을 M1→M3 경계로 이동 + M3 기준에 "diagrams 카운팅은 M1 스크린샷 verdict 조건부".

**[Blocking]** "M5's zero-dep grep criterion is mechanically unsatisfiable." (수렴) **Fix:** 의도 기반 재서술 + 제외 목록.

**[Concern]** M2 fabricated 수령증 테스트는 dispatch-ledger fail-open 경로만 행사 — 실제 런은 crucible 체이닝으로 원장이 비어 있지 않아 unbacked 분기가 라이브에서 첫 행사. **Fix:** 원장 시드 시나리오 1건(backed→통과, unbacked→차단).

**[Concern]** M1∥M2가 M1 자체 격리 기준을 위조. (수렴) **Fix:** 스코프 조정/worktree/병렬 주장 철회 중 택1.

**[Concern]** done-skip + done 재검증 부재 = 자가 기록 `done`이 전부 침묵 — 성공 기준 3의 "완료 불가"보다 약함. **Fix:** required 플래그 무장 시 hammer식 done 재검증, 또는 §0에 crucible-parity 수용 근거 기록.

**[Concern]** 승인 후 이미지 바이트 교체 무가시(설계상) — 보상 통제 무명. **Fix:** build.md가 전 로컬 이미지 sha256 기록, visual-qa 수령증이 반향.

**[Nit]** M3(6파일+2매니페스트+공유 라우터+타 스킬 수정 = 최광폭 통합)에 Effort 부재. **[Nit]** 마커 드리프트 테스트가 필드-할당 마커에서 오탐 — 비-status 마커 화이트리스트 필요.

**Survived:** 스파이크-우선 실질성; 게이트-선행 순서; 수동 검증 스코프(crucible 선례 + 자동 부가 Integration Verification).
