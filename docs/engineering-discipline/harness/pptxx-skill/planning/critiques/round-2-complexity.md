# Round 2 — Hidden Complexity Critic (vs DRAFT v2)

**[Blocking]** "The 'crucible Phase E 조건부 1줄' resume protocol under-scopes the real change — the resume marker does not survive crucible's own state initialization, so the one line M3 is budgeted for can never fire." crucible SKILL.md:27-39가 resume 없는 닫힌 7-키 shape를 유지하라고 지시 → Phase A에서 마커 소거. **Fix:** 사이드카 파일(`.glm-hammer/resume.json`)로 이동, 또는 crucible 수정을 정직하게 2줄로(Phase E 조건 + State Protocol "미지 키 보존" 문장) 확대하고 락 항목에 명시.

**[Blocking]** "M3's mechanized drift check is unimplementable as specified because the house `⟨state: …⟩` marker convention is free-form prose, not a status enum." 실제 마커: `⟨state: prospect.reported⟩`, `⟨state: assay.verdict = "approve"⟩`, `⟨state: approved is set only now⟩` — 전 마커 status 멤버십 단정은 정당한 라인에서 red → 테스트 무력화 또는 관례 파괴. (j)-스타일도 아님(존재 체크 vs 프로즈 파서). **Fix:** State Protocol fenced JSON의 `"status": "a | b | c"` 라인 추출 → §0와 집합 동등성 단정; 보조로 각 §0 status가 어딘가 마커에 등장하는지 grep.

**[Concern]** M3·M4 Effort 미기재; M3 실제 크기는 사이클 천장(~10-12 태스크: heavy SKILL.md, route-intent 수정+**신규 E2E 픽스처 하니스**(현재 route-intent 테스트 전무 — spawn+tmp-dir 격리 신축), crucible 수정, 드리프트 테스트, (j)/(b), plugin.json 2건). **Fix:** M3 Effort Large + 픽스처 하니스를 명명된 태스크로.

**[Concern]** §0가 문자열은 동결했지만 시맨틱 미동결: `imagePanel.required/approved` 의미 미정의(분기 ③은 receipt 존재만, forge 선례는 카운트 비교), `visualQa.required`는 아무도 안 읽는 드리프트 미끼. **Fix:** §0 각 1문장 — required 의미·게이트 판정식 명시, visualQa.required 삭제 또는 정보성 명시.

**[Concern]** M5 "Small" 과소 — python-pptx는 SVG 네이티브 렌더 없음; 도식·이미지 충실도는 어떤 기준도 검증 안 함(제목 readback만). 도식 블록 전량 무손실 드롭해도 기준 통과. **Fix:** format-spec에 도식 export 정책 동결(visual-qa 스크린샷 PNG 래스터 재사용 등), readback에 picture-shape 수>0 단정, M5 Medium 재평가.

**[Concern]** M4 과대 번들(~11-13 태스크) + 스크린샷 에스컬레이션 미결 시 반쪽 정지. **Fix:** 사전 승인된 분할선 명시(M4a 이미지+패널+정책 / M4b visual-qa) — 파일·§0 분기 모두 분리 가능.

**[Nit]** M2 ⓗ는 pptxxGate가 아니라 공통 가드 테스트(가드-순서 회귀 테스트로 라벨). **[Nit]** workRequest에 "발표" 추가는 비작업 문장 오발화 — 부정 픽스처 1건 추가.

**Survived:** planKey 하위호환; M1∥M2 파일 경합; done-skip 결정의 테스트 고정; 봉인 집합 바이너리 제외; PostToolUse 체인 성장 비용.
