# Round 3 — Value & Sequencing Critic (vs DRAFT v3)

**[Blocking]** "The frozen seal set makes the M4-era and M5-era product deadlock for decks that have no web images." attributions.md는 이미지 채택 시에만 작성되는데 분기 ①은 "항상" 3파일 봉인 요구 — 이미지 0 + 도식 deck이 visual-qa에서 `'missing'`으로 차단, 6회 후 fail-open(성공 기준 3이 조용히 열화). M5 텍스트 deck 옵트인도 동일 벽. **Fix:** attributions.md는 `imagePanel.required===1`일 때만 봉인 집합 멤버; M2 시나리오(visual-qa, required=0, 2파일 봉인 → 통과).

**[Blocking]** "M3's own success criteria are mutually unsatisfiable: the drift test requires every §0 status to appear as a process marker, but the M3-era flow explicitly excludes awaiting-user/exporting." 죽은 마커를 심으면 M3-시대 런이 유령 export 경로를 즉흥 실행. **Fix:** 마커 grep 시대 스코프: M3={scripting,chaining,imaging,building,done}… (M5가 확장); fenced-JSON 동등성은 전 집합 유지.

**[Concern]** `building`+무장 전이 어느 분기에도 없음 — 텍스트 deck 전 시대 완전 무게이트가 우연이 됨. **Fix:** 분기 ④에 building(무장 전) 명시 + M2 시나리오로 문서화.
**[Concern]** visual-qa 면제 에스컬레이션이 "M3 착수 전"인데 M3 의존 노트("스파이크 지연 무관")와 모순 — M3는 답이 필요 없음. **Fix:** 데드라인을 "M4 착수 전"으로.
**[Concern]** M5 취소가 사용자 에스컬레이션 없이 brief 성공 기준 4를 삭제 — 스크린샷 면제와 비대칭. **Fix:** pptx 스파이크 중단 → 락 전 사용자 결정.
**[Concern]** 승인-리셋이 두 라운드를 모두 결합 — 정상 visual-qa 반복이 이미지 패널 무효화, ≤3라운드가 라운드 필드 기준이면 허위 에스컬레이션. **Fix:** "해당" 정의 + 에스컬레이션은 REJECT verdict 수 기준.
**[Nit]** M1 abort "planning docs만"이 다운로드 바이너리 2건·nonces.txt 커밋과 불일치.

**Survived:** M3-before-M2 역전 기각(훅 강제가 가치 핵심); M2 휴면; M4-시대 일관성; awaiting-user 남용.
