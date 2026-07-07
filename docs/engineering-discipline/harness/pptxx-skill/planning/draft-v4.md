# DRAFT v4 (FINAL) — pptxx Milestone DAG

> v3 대비: 라운드 3 발견 45건 전부 수용 반영 (resolution-log.md Round 3). **주의: 라운드 캡(3) 도달로 v4 수정은 재비판 라운드 없이 적용됨 — 락 제시에 공개.** Integration Verification(M_final) 포함.

## §0. Gate State Contract (동결 인터페이스 — 최종)

### 스키마 (phase pptxx)
```json
{
  "phase": "pptxx",
  "status": "scripting | chaining | imaging | building | visual-qa | awaiting-user | exporting | done",
  "deck": "docs/glm-hammer/decks/YYYY-MM-DD-<name>",
  "design": "docs/glm-hammer/design/YYYY-MM-DD-<name>",
  "resume": null,
  "slides": { "total": 0, "diagrams": 0 },
  "imagePanel": { "required": 0, "round": 1 },
  "visualQa": { "required": false, "round": 1 },
  "stopBlocks": 0
}
```

### 무장(arming) — deck-gate가 권한, 원웨이 래칫 (모델 자기 보고 아님)
- `index.html` 봉인 시 로컬 이미지 참조 grep → `imagePanel.required = 1` (한번 1이면 되돌림 금지).
- `slides.md` 봉인 시 format-spec 도식 블록 grep → `visualQa.required = true` (면제 마커 존재 시 제외).
- `imagePanel.required`의 의미: 1 = 이미지 채택됨. 스킬 프로즈 기준 설정 시점은 "imaging 종료(채택 확정)"이나, 최종 권한은 deck-gate grep.

### 게이트 모델
- 기본 done-skip + **hybrid-done은 `state.deck` 존재에 키잉**: `done && state.deck` → 분기 ① 재검증; ②③은 각 플래그 조건 유지. `awaiting-user`는 공통 가드 통과(PPTX 옵트인 질문 전용 — M5 삽입; M3/M4-시대 플로우는 `building → [visual-qa] → done` 직행).
- 잔여 리스크(수용): `stopBlocks>=6` 캡과 done-시 라우터 카운터 미리셋은 기존 하우스 탈출구 — hammer 선례와 동일.

### 게이트 분기 × status 스코프
| 분기 | 조건 | 요구 | 적용 status |
|---|---|---|---|
| ① 봉인+빌드 | `state.deck` 존재 | 봉인 집합 `sealMatches==='ok'` + `evidence/deck/build.md`(raw) | `visual-qa`, `exporting`, hybrid-`done` |
| ② visual-qa | `visualQa.required===true` | `evidence/deck/visual-qa/round-<visualQa.round>/visual-qa-critic.md` judge APPROVE | `visual-qa`, `exporting`, hybrid-`done` |
| ③ 이미지 패널 | `imagePanel.required===1` | `evidence/deck/panel/round-<imagePanel.round>/image-suitability-critic.md` judge APPROVE + `sealMatches(attributions.md)==='ok'` + **매니페스트 검증**(아래) | `visual-qa`, `exporting`, hybrid-`done` |
| ④ 초기·무장 전 | — | 무요구 (SKILL.md Hard Gate: 대기 시 `awaiting-user`, 포기 시 `done` — 방치 금지) | `scripting`, `chaining`, `imaging`, `building` |

### 분기 ③ 매니페스트 검증 (동결)
- 스캔 집합: deck 디렉토리(− `shots/`)의 확장자 {png,jpg,jpeg,gif,webp,svg} 파일 전부가 attributions.md에 sha256 일치로 존재(`sha256File` 재사용).
- 라이선스 파싱: 각 행의 license ∈ {cc0, pdm, cc-by, cc-by-sa} 이거나 `user-confirmed` 필드 존재 — 아니면 block.
- 예시 행(문법 동결, deck-상대 포워드슬래시 경로): `| images/photo1.jpg | <sha256> | https://... | cc-by | <author> |`
- 명칭: **무결성 매니페스트**(출처는 fetch 영수증이 보강 — sha256은 무결성 증명이지 출처 증명이 아님).

### 봉인 집합
`slides.md` + `index.html` (+ `imagePanel.required===1`일 때만 `attributions.md`). 바이너리·`shots/` 제외.

### deck-gate.js 동작
- 봉인 대상 파일 Write/Edit 시 `writeSeal` + 무장 grep(위) 실행. `shots/` 하위는 추적·검사 제외.
- **승인 리셋(파일→라운드 매핑 동결):** 무장 상태에서 tracked write 시 — `slides.md → 양쪽 round++`, `index.html → visualQa.round++`, `attributions.md → imagePanel.round++`. round는 **무효화 카운터**이며, ≤3라운드 에스컬레이션은 **REJECT 수령증 개수**로 계산.
- **정적 검사(속성 스코프):** `index.html`에서 `<script`, `javascript:`, 그리고 `src=`/`srcset=`/`<link …href=`/`url(…)`/`@import`/`<iframe|object|embed` 내부의 `https?://`·경로 이탈(`../`·절대·드라이브·`file://`) 참조 → 봉인 거부+경고. **`<a href>`·텍스트 노드의 URL은 허용**(출처 표기).

### 증거 tail (4종)
분기 ②③의 judge 2종 + `evidence/deck/build.md`(raw, building 완료 시 기록) + `evidence/deck/fetch.md`(raw — 이미지별 curl 명령·최종 URL·Content-Type·sha256; 패널 체크리스트가 매니페스트와 교차 확인). **추출 규칙:** SKILL.md 내 `evidence/deck/[^\s)]+` 전 매칭(round-N 정규화)은 이 4종 집합의 원소; M4부터는 4종 전부의 등장(coverage)도 단정.

### 스크린샷 경로 (동결)
`<deck>/shots/slide-NN.png`. Playwright 실행은 **`javaScriptEnabled: false` + deny-by-default 요청 차단 필수**(옵션 아님). md2pptx 경로 allowlist = deck 디렉토리(shots/ 포함).

### 복귀 프로토콜 (동결)
- pptxx가 crucible 호출 전 `state.resume = "pptxx"` 설정.
- **crucible SKILL.md 수정 2줄(스코프 수정 — 락 승인 대상):** (a) State Protocol에 "top-level `resume`·`deck`·`slides` 키는 모든 상태 재기록에서 보존; terminal status(`done`) 기록 시 `resume` 소거" (b) Phase E에 "resume 마커 존재 시 **forge 분기만 생략** — 디자인 제시와 사용자 수락은 유지, 수락 시 `status: approved` 후 마커의 스킬로 즉시 복귀(복귀 시 resume 소거)".
- 복귀 직후 pptxx가 기존 state에 merge로 `phase:'pptxx', status:'chaining', resume:null` + `deck`·`slides` 재기록, `design`은 crucible 출력으로 설정.
- pptxx의 crucible 완료 신호에 **crucible 패널 수령증 APPROVE 확인**(`design/panel/round-N/*.md`, `receiptProblems`) 추가 — 사용자 미승인 토큰으로 deck 진행 금지.
- state에 `deck` 부재인 무장 상태 → 게이트는 **fail-closed block**(fail-open 금지).

### 드리프트 테스트 (동결 규칙)
- fenced JSON `"status"` 라인 → §0 집합 동등성 (M3부터 전 집합).
- `⟨state:⟩` 마커 존재 단정은 **시대별 상수**: M3 = {scripting, chaining, imaging, building, done}; M4 += {visual-qa}(면제 시 제외); M5 += {awaiting-user, exporting}. M5의 "기존 단정 무수정"에서 이 상수 확장만 예외.
- tail 추출 규칙은 위 "증거 tail" 절.

---

### M1: De-risk Spikes + 파이프라인 계약 문서

- **Goal:** 두 계약 문서를 무조건 저작하고, 세 외부 통합을 스파이크로 증명하며, 실패를 env/integration으로 분류해 에스컬레이션한다.
- **Success Criteria:**
  - **계약 문서(무조건):** `spikes/pptx/format-spec.md`(포맷 스펙 + 도식 export 정책: shots PNG 래스터 재사용, 부재 시 제목+발표자 노트 폴백) / `spikes/screenshot/README.md`(주소화 컨벤션 — 스크린샷 출력 `<deck>/shots/slide-NN.png` 포함).
  - **스크린샷:** ≥3슬라이드 하우스 스타일 샘플 deck 슬라이드별 캡처(`javaScriptEnabled:false`+요청 차단 필수, 명령 기록). 논스 센티널: 알파벳 `A-HJ-NP-Z2-9`·6자·≥24px 렌더, `nonces.txt`(판독자 미제공)에 기록; **정보 격리 서브에이전트**(PNG 경로만, 디스패치 프롬프트 기록)의 최종 메시지를 `transcription.md`로 영속 — **파일 술어**: transcription 값==논스 && `VERDICT: APPROVE` 라인. 불일치 시 새 논스 1회 재시도 후 판정.
  - **이미지 API:** 각 ≥3건 license·creator·source-URL + 쿼리 URL·요청 헤더(서술형 UA)·rate-limit 헤더(미관측 시 '없음' 명시). API당 1건 다운로드: `license=cc0|pdm`+`mature=false` 쿼리 한정, `curl --proto '=https' --proto-redir '=https' --max-redirs 3`, ≤5MB, `Content-Type: image/*`; **바이너리는 URL+sha256+치수 README 기록 후 삭제**(git 커밋 금지).
  - **PPTX:** 명령 재실행으로 `sample.pptx` 재생성 + readback 전 제목 일치 + 이미지 슬라이드 picture-shape>0, exit 0.
  - **격리:** M1이 생성·수정한 파일 전부 `…/planning/spikes/` 하위.
  - **에스컬레이션(전 스파이크):** README에 설치 명령·버전 기록; 실패 시 메시지가 **env-setup vs integration** 분류 — env 실패는 M1 일시정지(스코프 절단 금지). integration 실패 시: 스크린샷 → **M4 착수 전** visual-qa 면제 여부 사용자 결정(면제 시 §0 면제 마커·M4 축소 기준); 이미지 API → **M4 착수 전** 사용자 결정(폴백: WebSearch-only+이미지별 라이선스 확인); pptx → **M5 취소 여부 사용자 결정**(재시도/축소/HTML-only 수용).
- **Dependencies:** None / **Files:** Create: spikes/ (nonces.txt, transcription.md 포함; 이미지 바이너리는 검증 후 삭제) / **Risk:** High / **Effort:** Large
- **User Value:** 리스크 소거·결정 정보 + 하류 계약 문서. / **Abort Point:** Yes — planning docs + 스파이크 산출물만(삭제 무해).

### M2: Hook & Gate Integration (§0 전체 계약)

- **Goal:** §0 전체 — pptxxGate 분기 ①–④, deck-gate.js(봉인·무장 래칫·리셋 매핑·속성 스코프 정적 검사), planKey 확장 — 를 fabricated receipt 회귀 테스트와 함께 구현한다 (route-intent 무접촉).
- **Success Criteria:**
  - `node tests/gates.test.js` 통과, 시나리오: ⓐ `visual-qa`+봉인 없음 → block ⓑ 완비 → 통과 ⓒ `visualQa.required=true`+수령증 없음 → block ⓓ false → 불요구 ⓔ `imagePanel.required=1`+누락/REJECT → block, APPROVE+매니페스트(라이선스 허용목록 포함) 일치 → 통과 ⓕ 0 → 불요구; **required=0 + attributions.md 미존재 + 2파일 봉인 → 통과** ⓖ done 4분지(deck 없음→침묵 / deck 있음+봉인 green→통과 / deck 있음+봉인 broken→block / 플래그+수령증 부재→block; ⓖ 근거에 stopBlocks 캡=의도된 탈출구 1줄) ⓗ `awaiting-user` → 통과(가드-순서 회귀 라벨) ⓘ slides.md Write → 봉인+도식 grep 무장 ⓘ′ index.html Write(로컬 이미지 참조) → `imagePanel.required=1` 래칫 ⓙ deck PNG(shots/ 포함) → 봉인·검사 제외 ⓚ 무장 후 index.html 재편집 → `visualQa.round`만 증가(`imagePanel.round` 불변 단정), attributions.md 편집 → `imagePanel.round`만 증가 ⓛ 원장 시드: backed→통과, unbacked→block ⓜ 매니페스트 sha256 불일치/비허용 라이선스(무 user-confirmed)/서브디렉토리 이미지 → block·통과 각 단정 ⓝ `<script`·`src="https://…"` → 봉인 거부→block; **텍스트/`<a href>` 출처 URL → 봉인 OK** ⓞ 초기 status 정차 → 무차단 ⓟ 무장 상태 + `state.deck` 부재 → fail-closed block.
  - planKey 단정(절대/상대 동일 키, decks/의 .md·.html), 기존 단정 무수정 통과, hooks.json `${ZCODE_PLUGIN_ROOT}`, route-intent diff 없음.
- **Dependencies:** None (M1∥) / **Files:** Create: [`hooks/scripts/deck-gate.js`] Modify: [`hooks/scripts/stop-gate.js`, `hooks/scripts/lib.js`, `hooks/hooks.json`, `tests/gates.test.js`] / **Risk:** High / **Effort:** Large
- **User Value:** 기존 사용자 회귀 안전 + 강제 골격 무회귀 착지. / **Abort Point:** Yes — 진짜 휴면.

### M3: pptxx SKILL.md Core Pipeline + Chaining + Routing

- **Goal:** heavy-skill SKILL.md(스크립트→체이닝(복귀)→텍스트 deck)를 §0와 기계 검증 일치로 작성, route-intent deck 라우팅과 crucible 2줄 수정을 착지한다.
- **Success Criteria:**
  - SKILL.md: frontmatter(한/영 트리거)+5섹션; Hard Gate에 방치 금지; State Protocol은 §0 JSON 그대로; `spikes/screenshot/README.md`·`spikes/pptx/format-spec.md` 경로 인용(grep 단정).
  - 드리프트 테스트: JSON status 전 집합 동등성 + 마커 시대 상수 {scripting, chaining, imaging, building, done} + tail ⊆ 4종.
  - 포맷: format-spec 합치 정의. M3-시대 규칙: 도식 블록 예약(플레인 렌더, deck-gate의 도식 grep이 참조하는 마커를 M3-시대 문법에서 제외 — M4가 문법 활성화), 이미지 지시어 파싱-후-유예(플레이스홀더), 터미널 `building → done` 직행.
  - deck HTML: 주소화 컨벤션+자기완결+`<script>` 금지+외부 리소스 금지(§0 정적 검사와 합치).
  - 체이닝·복귀: §0 프로토콜 전문 — resume 설정, crucible 2줄 수정(**락 승인 대상**), 복귀 merge 기록, 완료 신호에 crucible 패널 수령증 확인; grep 테스트가 crucible 2줄+pptxx resume 규칙 단정.
  - 라우팅: workRequest에 **동사만** 추가(`뽑|생성|추출|export`), deck 명사 정규식(`발표|슬라이드|프레젠테이션|deck|presentation|pptx`)은 deck 분기 전용, 위치는 executeIntent 뒤 designIntent 앞; **신규 E2E 픽스처 하니스**(명명 태스크): ① "이 스크립트로 발표 슬라이드 뽑아줘"→pptxx ② "브랜드 디자인 토큰 만들어줘"→crucible ③ "슬라이드 디자인해줘"→pptxx ④ "팀에게 결과를 발표했어요"→무발화.
  - 스위트: (j)에 SKILL.md, (b)에 `.claude-plugin/plugin.json` 추가, 키워드 `"pptxx","deck","presentation","슬라이드"` 멤버십.
  - **분할선(사전 승인):** 계획 12태스크 초과 시 M3a(SKILL.md+체이닝+crucible+드리프트)/M3b(라우팅+하니스+plugin.json) — M4는 M3a에만 의존.
- **Dependencies:** M1(계약 문서 2종), M2 / **Files:** Create: [`skills/pptxx/SKILL.md`] Modify: [`hooks/scripts/route-intent.js`, `skills/crucible/SKILL.md`(2줄), `tests/gates.test.js`, `.zcode-plugin/plugin.json`, `.claude-plugin/plugin.json`] / **Risk:** Medium / **Effort:** Large
- **User Value:** 텍스트 deck 코어 플로우 완성(실제 발표 가능). / **Abort Point:** Yes.

### M4: Image Sourcing + Critic Panels + External-Access Policy

- **Goal:** critic 2종과 이미지 소싱·visual-qa phase를 §0 그대로 추가하고 외부 접촉면 정책을 명문화한다.
- **Success Criteria:**
  - 에이전트 2종: 하우스 계약 + `tools: ["Read","Grep","Glob","Write"]`(의도적 편차) + **"자기 evidence 경로 1개만 Write — 위반은 REJECT급"** + 데이터-비지시 라인; 체크리스트(image-suitability 4항목: 정책 내 라이선스/출처 표기 렌더링/맥락 적합성/콘텐츠 안전; visual-qa: 가독성/오버플로우/토큰 준수/도식 판독); (j)에 tools·Write 규칙 라인 단정.
  - 이미지 phase: 로컬 사본만(M1 명령), `attributions.md`(§0 예시 행 문법) Write 작성, `evidence/deck/fetch.md` 기록, HTML·pptx 로컬 경로만, 패널은 매니페스트+fetch.md 교차+사본 직접 판독; 라이선스 정책(§0 허용목록, by-sa 무수정, nc/nd 사용자 확인=`user-confirmed` 필드); mature 필터 on; UA·쿼리 예산·429 backoff-후-질문; insane-search(세션별 설치 승인+URL별 확인+금지 목록+고지); fetched 웹 텍스트 데이터-비지시(SKILL.md 본문).
  - visual-qa phase: M1 명령(JS off+요청 차단) → `shots/`, `visualQa.required` 문법 활성화(도식 grep 마커), §0 tail·라운드, 만장일치·격리·**REJECT 수령증 ≤3 에스컬레이션**; building 완료 시 `build.md` 기록 지시.
  - 드리프트: 마커 상수 += {visual-qa}(면제 시 제외), tail **coverage**(4종 전부 등장)로 승격, M3 규칙과 문자열 불일치 0건.
  - 스위트 통과: 에이전트 (j) 추가, M2 시나리오 green 유지.
  - **면제 시 축소 기준:** visual-qa phase 부재+required 미설정+마커 상수에서 visual-qa 제외를 테스트로 단정.
- **Dependencies:** M1, M2(직접 — stop-gate 컨틴전시·시나리오 참조), M3(M3a) / **Files:** Create: [agents 2종] Modify: [`skills/pptxx/SKILL.md`, `tests/gates.test.js`, (컨틴전시: `stop-gate.js` — 수령증 분기 조정만·기존 단정 무수정)] / **Risk:** Medium / **Effort:** Large — **분할선:** 12태스크 초과 또는 에스컬레이션 미결 시 M4a(이미지+패널+정책)/M4b(visual-qa).
- **User Value:** 성공 기준 2·3 실증. / **Abort Point:** Yes.

### M5: Opt-in PPTX Extraction

- **Goal:** `awaiting-user` 옵트인+`exporting` phase 삽입, M4-시대 최종 포맷에서 `md2pptx.py`로 편집 가능 .pptx 생성.
- **Success Criteria:**
  - `skills/pptxx/scripts/md2pptx.py`: M4-시대 최종 포맷 픽스처 **2런** — (a) `shots/` PNG 존재 → 도식 슬라이드에 picture-shape 정확 1 (b) PNG 부재 → 제목+비어있지 않은 노트+picture 0; 전 제목 일치, exit 0. 경로 allowlist = deck 디렉토리(shots/ 포함), 절대·`..`·비이미지 거부 — 부정 케이스 1건 `spikes/pptx/README.md`에 기록.
  - SKILL.md: `awaiting-user` 옵트인 질문 삽입(기본 생성 없음)→동의 시 `exporting`; python-pptx 설치 안내+부재 시 HTML로 종료; 마커 상수 += {awaiting-user, exporting}(유일 허용 단정 변경).
  - 스위트 기존 단정 무수정 통과(마커 상수 확장 제외); `grep -rE "python-pptx|import pptx|spawn(Sync)?\(['\"](python|py)" hooks/ tests/` 0건.
  - **조건부:** M1 pptx 스파이크 실패 시 이 마일스톤의 취소/유지는 **사용자 결정**(락 기록).
- **Dependencies:** M1, M3, M4 / **Files:** Create: [`skills/pptxx/scripts/md2pptx.py`] Modify: [`skills/pptxx/SKILL.md`, `tests/gates.test.js`] / **Risk:** Medium / **Effort:** Medium
- **User Value:** 성공 기준 4. / **Abort Point:** Yes — HTML deck 제품은 M4에서 완결.

### M_final: Integration Verification

- **Goal:** 모든 마일스톤이 하나의 시스템으로 동작함을 검증한다.
- **Success Criteria:**
  - [ ] `node tests/gates.test.js` 통과 (Verification Strategy 명령)
  - [ ] 전 마일스톤 성공 기준이 통합 후에도 유지
  - [ ] 기존 crucible/forge/hammer 기능 회귀 없음
  - [ ] 교차 마일스톤 인터페이스(§0 계약: 게이트↔SKILL.md↔에이전트↔crucible 복귀) 실행 경로 점검 — 라이브 항목은 수동 검증 체크리스트로 문서화
- **Dependencies:** ALL / **Files:** None (읽기 전용) / **Risk:** Medium / **Effort:** Small / **User Value:** 시스템 전체 신뢰 / **Abort Point:** No (최종 관문)

## Execution Order

**M1 ∥ M2 → M3 → M4 → M5 → M_final** (M3←{M1,M2}; M4←{M1,M2,M3}; M5←{M1,M3,M4}; M_final←ALL). 병렬은 M1∥M2만.

## Design Rationale

- 라운드 3의 공통 근원("통제 문자열은 동결, 활성화 조건은 명예 제도")을 해소: 무장은 deck-gate 기계 grep(원웨이 래칫), hybrid-done은 state.deck 키잉, 스크린샷·매핑·문법·시대 상수까지 표 수준 동결.
- 사용자 관문 보존: crucible 복귀는 forge 분기만 생략(디자인 수락은 유지), 스파이크 실패로 인한 스코프 절단은 전부 사용자 에스컬레이션.
- 라운드 캡 도달 — v4 수정은 재비판 없이 적용되었음을 락에 공개.
