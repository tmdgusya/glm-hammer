# Critique Resolution Log — pptxx Milestone Planning

## Skeleton Decision

**Skeleton: B (risk-first)** — 자동 검증 범위 밖의 그린필드 외부 통합 3종(Playwright 스크린샷, Openverse/Wikimedia 출처 필드, python-pptx 충실도)을 M1 스파이크로 선행 검증하고 M1∥M2 병렬성을 확보. Skeleton A(interface-first)는 스파이크 없이 미검증 가정 위에 M5까지 직렬 축조하는 약점.
**Grafts from A:** M4 성공 기준에 critic 체크리스트 내용 검증 상세화; 수령증 포맷-`receiptProblems` 결합을 명시적 기준으로 유지.

## Task-specific Critic Selection

코어 4종(Hidden Complexity / Dependency & Ordering / Verifiability / Integration & Risk) + **Value & Sequencing**(M3까지 사용자 가시 가치 부재가 쟁점), **Security & Access**(웹 이미지 수집·bot-회피 도구 insane-search·Playwright 실행이라는 외부 접촉면).

## Round 1 (vs DRAFT v1) — 원문: critiques/round-1-*.md

Blocking 12건(수렴 후 6클러스터), Concern 12건, Nit 7건. Structural 0건. 전 critic이 5-마일스톤 risk-first 형상 자체는 유효 판정.

| # | Critic | Severity | Finding (verbatim 1문장) | Resolution | Draft change (v2) |
|---|--------|----------|--------------------------|-----------|-------------------|
| 1 | Complexity | Blocking | "The pptxxGate receipt/state contract is split across M2 and M4 such that M4's success criteria require stop-gate behavior that M4's file list cannot produce and M2's success criteria never demand." | Accepted | **Gate State Contract를 드래프트에 동결**(상태 필드·critic 이름·증거 tail·터미널 모델). M2가 전체 게이트 분기를 fabricated receipt로 구현·테스트, M4는 문자열 그대로 소비. |
| 2 | Dependency | Blocking | "The visual-qa enforcement logic in pptxxGate has no home in the DAG." | Accepted | #1과 동일 해소 + M4 Files에 stop-gate.js를 한정적 컨틴전시로 추가(수령증 분기 조정만, 기존 회귀 가드). |
| 3 | Verifiability | Blocking | "M4's gate test requires pptxxGate behavior in a file M4 does not modify, and no M2 criterion pins the receipt-path/state-field contract." | Accepted | #1과 동일 + M2에 부정 케이스 테스트 명시(diagrams=0 → visual-qa 수령증 불요구, 이미지 미사용 → 패널 불요구). |
| 4 | Verifiability | Blocking | "Brief Success Criterion 2's enforcement half — image-suitability panel unanimity as a hard gate — is exercised by no criterion in any milestone." | Accepted | M2 SC에 (h)-미러 추가: imagePanel 무장 + 수령증 누락/REJECT → block, 만장일치 APPROVE → 통과. |
| 5 | Integration | Blocking | "M2 freezes the entire pptxxGate contract … while M4/M5 Files lists forbid touching stop-gate.js; any mismatch forces reopening a completed milestone." | Accepted | #1·#2 + M2에 터미널/옵트인 시나리오 테스트(status:'done' → 무차단(done-skip 확정), 옵트인은 `awaiting-user`) 추가, M5를 소비자로 명명. |
| 6 | Dependency | Blocking | "M2 wires a live route-intent.js deck branch that routes users to a skill that will not exist until M3." | Accepted | route-intent 변경(어휘·분기·테스트) 전체를 M2→M3 이동. M2 Abort Point 서술 수정(이제 진짜 휴면). |
| 7 | Value | Blocking | "M2's abort point is falsified by its own route-intent change." | Accepted | #6과 동일 해소. |
| 8 | Integration | Blocking | "M2's 'dormant code' and Abort Point claims are false — the route-intent deck branch is live the moment M2 lands." | Accepted | #6과 동일 해소. |
| 9 | Complexity | Blocking | "M1's screenshot spike de-risks the wrong thing — it proves single-file capture of one sample slide, while M4 needs per-slide capture of a multi-slide deck." | Accepted | M1 스크린샷 스파이크: ≥3슬라이드 하우스 스타일 샘플 deck, 슬라이드별 캡처(slide-01..03.png), 구조 컨벤션 README 기록; M3 SC에 "deck HTML은 M1 기록 컨벤션 준수" 추가. |
| 10 | Verifiability | Blocking | "M1's screenshot spike criterion is satisfiable while the thing it claims to prove is false — a REJECT verdict on a blank capture still passes." | Accepted | 슬라이드마다 센티널 텍스트+고유 도형 삽입; verdict.md가 PNG에서 판독한 센티널을 전사하고 verdict가 APPROVE여야 충족. REJECT/실패 시 → visual-qa 하드게이트 축소 여부 사용자 에스컬레이션(M4 전). |
| 11 | Verifiability | Blocking | "The crucible chaining criterion verifies only the outbound call; the return leg is a cross-milestone interface no criterion exercises — and on current repo facts it fails." | Accepted | 복귀 프로토콜 신설: `state.resume='pptxx'` 마커 + **crucible Phase E에 조건부 1줄 추가(스코프 수정 — 사용자 락 시 확인 항목)** + grep 레벨 테스트. M3 소유. |
| 12 | Integration | Blocking | "The pptxx→crucible chain has no return path — the precedent M3 says it will 'mirror' actively routes the run to the wrong skill, and the fix surface is declared out of scope." | Accepted | #11과 동일 해소. 프로즈-오버라이드 단독은 취약 판정 → 스코프 수정 요청을 명시적으로 표면화. |
| 13 | Value | Blocking | "M5 can pass every stated success criterion while shipping a converter that fails on real decks, because it validates only against M1's spike fixture." | Accepted | M1이 `format-spec.md`(슬라이드 md 포맷 1페이지 스펙) 산출 → M3 SKILL.md가 포맷을 명시적 정의·준수 → M5는 M4-시대 최종 포맷 픽스처(이미지+출처·도식 지시어 포함)로 검증. M5 Deps에 M4 추가. |
| 14 | Security | Blocking | "No milestone owns the act of fetching image bytes — hotlink-vs-local-copy is never decided, and no URL validation exists anywhere in the DAG." | Accepted | M1 이미지 스파이크에 다운로드 기준 추가(https-only, Content-Type image/*, 크기 상한, 명령 기록); M4: 채택 이미지는 deck 디렉토리 내 로컬 사본(검증 통과)만, HTML·pptx는 로컬 경로만 참조, 패널은 로컬 사본을 Read로 직접 판독. |
| 15 | Security | Blocking | "License compliance is reduced to attribution; NC/ND/SA terms are unhandled, and the WebSearch source has no license metadata at all." | Accepted | M4 라이선스 정책: 기본 허용목록 cc0/pdm/by(+by-sa는 SA 고지), nc/nd는 사용자 명시 확인 후만; WebSearch 이미지는 원 페이지가 사용 가능 라이선스를 명시할 때만 허용; 체크리스트를 "정책 내 라이선스"와 "표기 렌더링" 2항목으로 분리. |
| 16 | Security | Blocking | "The insane-search fallback has no stated negative policy — the draft encodes when it appears but never when it must NOT be used." | Accepted | M4 SC: SKILL.md 명시 금지 — 이미지 바이트 획득에 사용 금지, Openverse/Wikimedia API 대상 금지, 403/429/robots/페이월 우회 금지; 사용자 제공 참조 URL의 텍스트 판독에만 허용 + 사용 시 세션 내 고지. |
| 17 | Complexity | Concern | "M1 'Effort: Medium' underestimates three unrelated toolchains." | Accepted | M1 Effort → Large; 스파이크별 독립 성공 기준·독립 중단/축소 결정 명시. |
| 18 | Complexity | Concern | "M5 lacks a dependency on M4, but M4 changes the slides.md input format that M5's converter parses." | Accepted | #13에 포함 (M5 Deps에 M4). |
| 19 | Dependency | Blocking | "M5's Dependencies field omits M4; the ordering exists only as prose, not as a DAG edge." | Accepted | #13에 포함. |
| 20 | Complexity/Dependency/Value/Verifiability | Concern | 터미널 seam: "no M2 scenario covers the 'deck done, awaiting PPTX answer' state" / "gate lifecycle model pinned by no criterion". | Accepted | #5에 포함: done-skip 모델 확정, done·awaiting-user 시나리오 테스트를 M2 SC에 명시, M5 SC가 `awaiting-user` 문자열을 그대로 사용. |
| 21 | Dependency | Concern | "M1 ∥ M2 both carry 'node tests/gates.test.js 통과' while running concurrently" (스위트는 repo-global이라 경합). | Accepted | M1에서 스위트 실행 기준 삭제 → "git status 기준 변경이 planning/spikes 하위에만 존재"로 대체. 경합 소멸. |
| 22 | Dependency | Concern | "M2 is the authority for the state protocol; M3 has a cross-check criterion, M4 does not." | Accepted | M4에 M3와 동일한 기계화 교차검증 기준 추가(문자열 불일치 0건). |
| 23 | Verifiability | Concern | "M2's seal test cannot distinguish 'planKey extended' from 'planKey untouched'" (절대경로 픽스처는 폴백 키로도 ok). | Accepted | M2 SC: planKey 단위 단정 — 절대(백슬래시)·상대(포워드) 경로가 동일 정규화 키, `.html` 포함. |
| 24 | Verifiability | Concern | "M3's prose-drift check has no defined extraction procedure." | Accepted | (j)-스타일 테스트로 기계화: SKILL.md의 `⟨state:⟩` 마커 파싱 → 게이트 status 집합 멤버십 단정. M4에도 동일 적용(#22). |
| 25 | Verifiability/Complexity/Integration | Concern/Nit | route-intent 픽스처 은폐: "workRequest contains no deck vocabulary; designIntent matches '디자인'". | Accepted | M3 SC: workRequest에 발표\|슬라이드\|deck\|presentation\|pptx\|프레젠테이션 추가 + 3픽스처 고정(동사 없는 deck 요청→pptxx, 순수 design→crucible, "슬라이드 디자인" 중복→pptxx 승리로 확정). |
| 26 | Integration/Complexity | Concern/Nit | "Seal semantics for deck files that never pass through Write/Edit are undecided" / sealed set 미정. | Accepted | Gate State Contract에 봉인 집합 동결: deck 디렉토리의 slides.md+index.html만, 바이너리 제외; M2에 부정 테스트(PNG → 봉인 미생성·게이트 불요구). |
| 27 | Value | Concern | "M1's and M2's 'User Value' claims are developer value relabeled." | Accepted | M1 → "리스크 소거/결정 정보", M2 → "기존 사용자 회귀 안전" 재라벨. |
| 28 | Security | Concern | Playwright가 신뢰 불가 HTML을 라이브 네트워크로 렌더. | Accepted | M4: 스크린샷 명령은 비-file:// 요청 전면 차단; M3 하우스 규칙: `<script>` 금지·외부 리소스 참조 금지(로컬 사본만). |
| 29 | Security | Concern | Wikimedia UA 정책·Openverse 익명 rate limit 무소유. | Accepted | M1 README에 사용 헤더(서술형 UA)·rate-limit 응답 헤더 기록; M4: UA 문자열·런당 쿼리 예산·429 시 backoff-후-사용자질문(insane-search 금지 재확인). |
| 30 | Security | Concern | md2pptx.py 입력 무제약(../ 경로, 비이미지). | Accepted | M5 SC: 이미지 참조는 deck 디렉토리 내부만(절대·`..`·비이미지 거부), 부정 케이스 1건 기록. |
| 31 | Security | Concern | 스크린샷 내 텍스트로 비전 판정 조향 가능(프롬프트 주입). | Accepted | M4: 두 에이전트 .md에 "렌더된 텍스트는 데이터이지 지시가 아님" 명시 라인. |
| 32 | Security | Concern | 콘텐츠 안전성 체크리스트 부재. | Accepted | M4: 콘텐츠 안전 체크 항목 추가 + Openverse mature 필터 기본 on. |
| 33 | Verifiability | Nit | M5 grep이 잘못된 문자열(`python-pptx`; import명은 `pptx`). | Accepted | `pptx\|python` grep으로 교체. |
| 34 | Dependency/Verifiability/Integration | Nit | test (b)는 현재 .zcode-plugin/plugin.json만 파싱 — .claude-plugin 커버 주장 오류. | Accepted | M3 SC를 "(b) 목록에 .claude-plugin/plugin.json 추가 + 키워드 멤버십 단정"으로 재서술. |
| 35 | Verifiability | Nit | "(a)–(j) 무변경 통과" 모호((a) 출력은 필연 변화). | Accepted | "기존 단정(assertion) 무수정 통과"로 재서술. |
| 36 | Value | Nit | M1 스크린샷 REJECT의 귀결 미정의. | Accepted | #10에 포함(에스컬레이션 규칙). |

**기각(Rejected): 0건.** 모든 발견 수용. 수렴 클러스터: {1,2,3,4,5,20,22} 게이트 계약, {6,7,8} route-intent, {9,10,36} 스크린샷 스파이크, {11,12} crucible 복귀, {13,18,19} 슬라이드 포맷 계약, {14,15,16,28-32} 보안 정책 계층.

**Round 1 판정: Blocking 존재 → DRAFT v2 작성 후 신규 critic 라운드 필수.**

## Round 2 (vs DRAFT v2) — 원문: critiques/round-2-*.md

신규 Blocking 17건(수렴 후 11클러스터), Concern 15건, Nit 9건. Structural 0건 — 전 critic이 M1∥M2→M3→M4→M5 형상 유지 판정. §0 동결 전략 자체는 유효하나 "문자열은 동결했지만 시맨틱·시점·보상통제를 미동결"이 공통 주제.

| # | Critic(s) | Severity | Finding (verbatim 1문장) | Resolution | Draft change (v3) |
|---|-----------|----------|--------------------------|-----------|-------------------|
| R2-1 | Security (+Integration Concern) | Blocking | "Panel approval is not bound to image bytes — the frozen seal set excludes images and no provenance manifest exists, so a post-approval image swap ships with zero gate resistance, defeating Success Criterion 2." | Accepted | §0 봉인 집합에 `attributions.md`(파일명·sha256·source·라이선스·저작자) 추가; 분기 ③이 deck 내 전 이미지의 매니페스트 sha256 일치 검증; critic은 봉인 매니페스트+자체 해시로 판정. M2 시나리오 ⓜ. |
| R2-2 | Integration | Blocking | "§0 has no approval-reset-on-edit semantics and M2's scenario list omits the '승인 리셋' regression scenarios the Problem Brief's Verification Strategy explicitly requires." | Accepted | §0 리셋 조항: 무장 상태에서 봉인 대상 파일 tracked write 시 deck-gate가 해당 round 증가(낡은 수령증 자동 무효). M2 시나리오 ⓚ (test (i) 미러). approved 필드 삭제 — 수령증이 유일한 진실 원천. |
| R2-3 | HiddenComplexity + Dependency + Verifiability + Integration | Blocking | "The 'crucible Phase E 조건부 1줄' resume protocol under-scopes the real change — the resume marker does not survive crucible's own state initialization." | Accepted | crucible 수정을 정직하게 **2줄**로: (a) State Protocol에 "`resume` 키 보존" 규칙 (b) Phase E 조건부. §0에 복귀 직후 pptxx의 상태 기록(`phase:'pptxx', status:'chaining', resume:null`) 명시. 락 항목 "crucible 2줄 수정"으로 재라벨. grep 테스트가 두 라인 모두 단정. |
| R2-4 | Dependency + Value + Integration | Blocking | "§0 freezes gate branch ② on `slides.diagrams > 0` while the frozen schema carries an unused `visualQa.required` flag — so the visual-qa waiver path forces redoing M2." / "M3's abort point is broken for exactly the decks its User Value claim advertises." | Accepted | 분기 ②를 `visualQa.required === true`로 리키잉(diagrams는 정보성). M3-시대 SKILL.md는 도식 블록 예약 + required 미설정(M4가 활성화, 면제 시 영구 미설정). 면제 에스컬레이션을 **M1→M3 경계**로 이동. |
| R2-5 | Value + Dependency + Integration | Blocking | "`format-spec.md` — the slide-md contract that M3, M4, and M5 all consume — is a deliverable of the individually-abortable PPTX spike." | Accepted | format-spec.md·스크린샷 주소화 컨벤션을 **무조건 M1 산출물**(저작 계약)로 — 스파이크는 소비자. 스파이크 실패는 M5 취소/visual-qa 면제만 야기. |
| R2-6 | Verifiability | Blocking | "The M1 screenshot spike's decisive criterion is self-graded and satisfiable without the PNGs ever being read." | Accepted | 랜덤 논스 센티널(판독자 미제공 파일에 기록) + 정보 격리 서브에이전트(PNG 경로만 전달, 디스패치 프롬프트 기록) + 전사=논스 일치 && APPROVE 시에만 충족. |
| R2-7 | Verifiability + Dependency + HiddenComplexity | Blocking | "The imagePanel contract cannot verify the unanimity it claims — one frozen receipt per round vs. a count-based schema." | Accepted | §0 시맨틱 동결: 라운드당 1디스패치가 전 채택 이미지를 단일 수령증에서 일괄 판정, CHECKS 블록이 모든 이미지 경로+sha256 열거, `required ∈ {0,1}`, 게이트는 `round-<imagePanel.round>` 수령증 검사. |
| R2-8 | Verifiability + Integration | Blocking | "§0 branch ① keys on an ordering ('building 이후') that the frozen contract never defines." / "§0 gate branches are not status-scoped." | Accepted | §0에 분기별 적용 status 집합과 필드 설정 시점 테이블 동결; 초기 status 정차는 무요구(M2 시나리오로 문서화) + SKILL.md Hard Gate로 방치 금지; build.md를 분기 ①에 부착(죽은 계약 해소). |
| R2-9 | Dependency + Verifiability + Integration | Blocking | "M5's zero-dep grep criterion is unsatisfiable by construction — `pptx` is a substring of `pptxx`." | Accepted | 의존성 마커 grep으로 교체: `grep -rE "python-pptx\|import pptx\|spawn(Sync)?\(['\"](python\|py)" hooks/ tests/` 0건. |
| R2-10 | Dependency + Verifiability + Integration | Blocking | "M1's isolation criterion is defined over global `git status --porcelain`, which M2 — declared parallel — mutates." | Accepted | "M1이 생성·수정한 파일 전부가 spikes/ 하위"로 스코프 재정의. |
| R2-11 | HiddenComplexity (+Integration Nit) | Blocking | "M3's mechanized drift check is unimplementable as specified because the house `⟨state: …⟩` marker convention is free-form prose, not a status enum." | Accepted | State Protocol fenced JSON의 `"status"` 라인 추출 → §0 집합 동등성 단정으로 재정의; tail 추출 규칙(`evidence/deck/[^\s)]+` 전 매칭 ⊆ §0 tail 집합) 명문화; 마커는 보조 grep. |
| R2-12 | Integration | Concern | done-skip이면 자가 기록 done이 전부 침묵 — 성공 기준 3 약화. | Accepted | 하이브리드로 강화: `visualQa.required \|\| imagePanel.required===1`이면 done에서도 수령증 재검증(hammer식), 아니면 침묵. M2 ⓖ 3분지 시나리오. |
| R2-13 | Security | Concern | script/외부참조 금지가 프로즈 전용 + 비-file:// 차단은 file:// 유출 못 막음. | Accepted | deck-gate 정적 검사: `<script`·`javascript:`·`https?://` 참조·경로 이탈 발견 시 봉인 거부+경고 → 게이트 ①이 차단. M2 시나리오 ⓝ. |
| R2-14 | Security | Concern | M1 다운로드가 정책 없이 git에 바이트 커밋. | Accepted | 스파이크 쿼리 `license=cc0\|pdm`+`mature=false` 한정, `--proto '=https' --proto-redir '=https' --max-redirs 3`, 크기 상한 5MB, README 출처 표기. |
| R2-15 | Security | Concern | insane-search 설치 동의 부재 + fetched 웹 텍스트 주입 채널 미커버. | Accepted | 설치는 세션별 명시 승인+URL별 확인; 데이터-비지시 조항을 SKILL.md의 모든 fetched 웹 텍스트(WebSearch·insane-search)로 확장. |
| R2-16 | Security | Concern | 두 critic이 Bash 상속 — 주입 압력 하 불필요 능력. | Accepted (수정) | Bash 제거하되 수령증 기록을 위해 Write로 대체: `tools: ["Read","Grep","Glob","Write"]` — 하우스 계약과의 의도적 편차를 M4에 명시. |
| R2-17 | HiddenComplexity + Value + Dependency + Integration | Concern/Nit | M3·M4 Effort 부재; M3 ~10-12태스크(route-intent 픽스처 하니스 신축 포함); M4 과대 번들. | Accepted | M3 Effort Large(하니스 명명 태스크), M4 Effort Large + 사전 승인 분할선(M4a 이미지+패널+정책 / M4b visual-qa). |
| R2-18 | HiddenComplexity | Concern | M5 Small 과소 — python-pptx SVG 미지원, 도식 무손실 드롭해도 기준 통과. | Accepted | format-spec에 도식 export 정책 동결(visual-qa 스크린샷 PNG 재사용, 부재 시 제목+노트 폴백); readback에 picture-shape>0 단정; M5 Medium. |
| R2-19 | Verifiability | Concern | M4/M5 기준이 M1 결과에 무조건 — 스파이크 실패 시 충족 불가·축소 기준 미정의. | Accepted | 조건부 축소 기준 명문화: M4 면제 시 visual-qa phase 부재+required 미설정을 테스트로 단정; M5는 pptx 스파이크 중단 시 취소. |
| R2-20 | Verifiability | Concern | M4 교차검증 추출 규칙 미정의. | Accepted | #R2-11의 규칙을 M4에도 동일 적용. |
| R2-21 | Integration | Concern | fabricated 수령증은 원장 fail-open만 행사 — unbacked 분기 라이브 첫 행사. | Accepted | M2 시나리오 ⓛ: 원장 시드(backed→통과, unbacked→차단). |
| R2-22 | Dependency | Concern | 복귀 후 phase 되돌리는 주체 미지정. | Accepted | #R2-3에 포함(복귀 직후 pptxx 기록 §0 명시 + 드리프트 테스트의 `chaining` 커버). |
| R2-23 | Value | Concern | M3/M4-시대 awaiting-user 정차 모호. | Accepted | M3 SC: M3/M4-시대 터미널 플로우 `building → [visual-qa] → done` 직행; `awaiting-user`/`exporting`은 M5 삽입. |
| R2-24 | Value | Concern | M3의 M1 의존이 데이터 플로우보다 거침. | Accepted | M3 의존을 계약 문서 2종으로 축소(무조건 산출물이므로 스파이크 지연 무관). |
| R2-25 | Value | Concern | "코어 플로우 완성" 과대 — 이미지 지시어 이행 불가. | Accepted | 파싱-후-유예(라벨 플레이스홀더) + User Value "텍스트 deck" 한정. |
| R2-26 | Security + Verifiability | Nit | BY-SA 수정 여부 미정 / rate-limit 헤더 미관측 시 미결정 / 미동결 스칼라들 / 사다리 위치 / ⓗ 라벨 / "발표" 오발화. | Accepted | BY-SA 무수정 임베드만; "관측 없으면 '없음' 명시"; 크기 상한 5MB·픽스처 문자열·키워드("pptxx","deck","presentation","슬라이드") 고정; 사다리 위치 "executeIntent 뒤, designIntent 앞"; ⓗ 가드-순서 회귀로 라벨; 비작업 "발표" 부정 픽스처 추가. |

**기각: 0건** (R2-16은 수정 수용 — Bash 제거 대신 Write 대체, 수령증 기록 능력 보존).

**Round 2 판정: Blocking 존재 → DRAFT v3 작성 후 라운드 3(최종 라운드 — cap 3).**

## Round 3 (vs DRAFT v3, 최종 라운드) — 원문: critiques/round-3-*.md

신규 Blocking 20건(수렴 후 11클러스터), Concern 15건, Nit 10건. **Structural 0건, 분쟁(disputed) 0건** — 전 발견 수용. 공통 근원: §0가 통제의 문자열은 동결했으나 활성화 조건·저장 위치·카운터 매핑 등 일부 셀이 상호 모순이거나 미동결. 전부 §0/기준 텍스트 수준 수정 — DAG 형상 변경 없음.

| # | Critic(s) | Severity | Finding (verbatim 1문장) | Resolution | Draft change (v4) |
|---|-----------|----------|--------------------------|-----------|-------------------|
| R3-1 | Value + Integration | Blocking | "The frozen seal set makes the M4-era and M5-era product deadlock for decks that have no web images." | Accepted | attributions.md는 `imagePanel.required===1`일 때만 봉인 집합 멤버. M2 시나리오: required=0 + 2파일 봉인 → 통과. |
| R3-2 | Value + Verifiability + Complexity + Dependency | Blocking | "M3's mechanized drift-grep demands markers for statuses whose phases M3 explicitly defers to M4/M5 — satisfiable only by dead markers." | Accepted | 마커 grep 시대 스코프: M3={scripting,chaining,imaging,building,done}→M4 +{visual-qa(면제 시 제외)}→M5 +{awaiting-user,exporting}; M5 "기존 단정 무수정"에 마커 상수 확장 예외; fenced-JSON status 동등성은 M3부터 전 집합. |
| R3-3 | Verifiability + Complexity + Dependency (+Integration Concern) | Blocking | "M3's routing fixture ④ is unsatisfiable given M3's own frozen workRequest addition." | Accepted | deck 명사를 workRequest에 넣지 않음 — workRequest엔 동사(`뽑|생성|추출|export`)만 추가, 명사는 deck 분기 정규식 전용. 픽스처 재검: ① 동사+명사→pptxx, ④ 동사 없음→침묵. |
| R3-4 | Verifiability + Integration + Complexity (+Dependency Concern) | Blocking | "§0's approval-reset rule '해당 round 증가' never defines the seal-file → round mapping … the composed gate livelocks or fails to void stale approvals." | Accepted | 파일→라운드 매핑 동결: `slides.md→양쪽`, `index.html→visualQa.round`, `attributions.md→imagePanel.round`; 분기 ③ 적용을 `visual-qa`부터로(building 제외); ≤3라운드 에스컬레이션은 REJECT 수령증 개수 기준(round는 무효화 카운터); ⓚ에 정확한 필드+부정 단정. |
| R3-5 | Integration + Security + Dependency | Blocking | "The visual-qa screenshots have no legal place to live — branch ③, the screenshot pipeline, and M5's path restriction form a three-way contradiction." | Accepted | 스크린샷 경로 `<deck>/shots/slide-NN.png` 동결(M1 README); 분기 ③ 스캔 = 확장자 목록(png/jpg/jpeg/gif/webp/svg) × deck 디렉토리 − shots/; deck-gate 추적 제외; M5 allowlist는 shots/ 포함. M2 시나리오. |
| R3-6 | Integration + Complexity (+Security Concern) | Blocking | "deck-gate's frozen static check bans https?:// from index.html, but the product requirement is to render source URLs in index.html." | Accepted | 속성 스코프 검사로 동결: `src=`/`srcset=`/`<link href=`/`url()`/`@import`/`<iframe|object|embed` 내부의 `https?://`·`<script`·`javascript:`만 차단, `<a href>`·텍스트 노드 허용; M2 양성 시나리오(텍스트 출처 URL → 봉인 OK). Playwright는 `javaScriptEnabled:false`+deny-by-default 요청 차단 필수(옵션 아님). |
| R3-7 | Integration + Dependency (+HC R2 잔여) | Blocking | "The resume marker is immortal … an abandoned pptxx chain silently hijacks a future standalone crucible run." / "resume protocol preserves only resume — deck and slides are lost." | Accepted | 보존 규칙을 `resume`·`deck`·`slides`로 확대(여전히 crucible 1줄); consume-on-read(복귀 시 소거)+terminal(done) 기록 시 소거; 복귀 기록은 merge로 `phase/status/resume:null/deck/slides/design` 기록; M2 픽스처(deck 부재 state → fail-closed block). |
| R3-8 | Security | Blocking | "Gate branches ② and ③ are armed by self-reported flags — the enforcement §0 freezes is fail-open by default, contradicting Success Criteria 2·3." | Accepted | deck-gate가 무장 권한(원웨이 래칫): index.html 봉인 시 로컬 이미지 참조 grep→`imagePanel.required=1`; slides.md 봉인 시 도식 블록 grep→`visualQa.required=true`(면제 마커 시 제외). M2 테스트 각 1건. |
| R3-9 | Security | Blocking | "The frozen static checks and seal verification are silently unenforced for any deck where both flags are off — a `<script>`-bearing deck ships with zero gate contact." | Accepted | hybrid-done을 `state.deck` 존재에 키잉: done && deck → 분기 ①(봉인+build.md) 재검증; ②③은 플래그 조건 유지. ⓖ 확장. |
| R3-10 | Security | Concern→수용 | "The manifest carries license codes but the gate never checks them." / "sha256 gives integrity, not provenance." | Accepted | 분기 ③ 파싱 확장: license ∈ {cc0,pdm,cc-by,cc-by-sa} 또는 `user-confirmed` 필드 필수, 아니면 block; `evidence/deck/fetch.md`(raw) tail 4종째 추가(curl 명령·최종 URL·Content-Type·sha256), 패널 교차 참조; "무결성 매니페스트"로 개칭. |
| R3-11 | Security | Concern→수용 | "Giving critics Write re-opens the forgery channel." / "resume fast path auto-sets approved, deleting the user's design-approval checkpoint." | Accepted | 에이전트 파일에 "자기 evidence 경로 1개만 Write — 위반은 REJECT급" 규칙+(j) 단정; Phase E 조건부는 forge 분기만 생략 — 디자인 제시+사용자 수락 후 approved·복귀; pptxx 완료 신호에 crucible 패널 수령증 APPROVE 확인 추가. |
| R3-12 | Value + Verifiability + Dependency | Concern | 에스컬레이션 경로 정비(면제 데드라인 M3→M4 경계 모순 / M5 무단 취소 / 이미지 API 스파이크 무결과 / env-integration 미분류). | Accepted | 면제 데드라인 "M4 착수 전"으로; M5 취소·이미지 API 실패 모두 사용자 에스컬레이션(폴백: WebSearch-only+이미지별 라이선스 확인); README에 설치 명령·버전, 에스컬레이션 메시지가 env/integration 분류 — env 실패는 M1 일시정지. |
| R3-13 | Verifiability + Complexity | Concern | 논스 판정(사건 참조·OCR 취약) / M5 도식 단정 부재 / build.md 생산자 무배정. | Accepted | `transcription.md` 영속+파일 술어; 논스 A-HJ-NP-Z2-9·6자·≥24px·재시도 1회; M5 픽스처 2런(PNG 존재→picture 1 / 부재→제목+노트+0); M4 기준에 build.md 기록 지시+drift를 coverage로 승격. |
| R3-14 | Complexity + Dependency | Concern/Nit | M3 분할선 부재 / required 설정 시점 모순 / 매니페스트 행 문법·경로 규약 / building(무장 전) 무소속 / M4-M2 직접 엣지 / stopBlocks 캡 잔여 / M1 바이너리 커밋 / 주소화 준수 grep. | Accepted | M3a/M3b 분할선 추가(M4는 M3a 의존); required는 "imaging 종료 시(채택 확정)"; §0에 매니페스트 예시 행(5열, deck-상대 포워드슬래시)+서브디렉토리 M2 시나리오; 분기 ④에 building(무장 전) 명시; M4 deps에 M2 표기; ⓖ 근거에 캡=의도된 탈출구 1줄+§0 잔여 리스크 기록; 스파이크 이미지 바이너리는 URL+sha256+치수 기록 후 삭제; SKILL.md의 README 경로 인용 grep. |

**기각: 0건. Round 3 판정: 신규 Blocking 존재하나 전 건 무분쟁 수용 — 라운드 캡(3) 도달로 v4 수정은 재비판 없이 적용. 이 사실은 사용자 락 제시에 명시 공개한다.**
