# Plan: M1 — De-risk Spikes + 파이프라인 계약 문서

**Milestone:** `docs/engineering-discipline/harness/pptxx-skill/milestones/M1-derisk-spikes.md`
**Contract source:** `docs/engineering-discipline/harness/pptxx-skill/planning/draft-v4.md` §0 (동결 인터페이스)

## Goal

pptxx 파이프라인의 두 계약 문서(슬라이드 md 포맷 스펙, deck 스크린샷 주소화 컨벤션)를 무조건 저작하고, 세 외부 통합(Playwright 슬라이드별 캡처, Openverse/Wikimedia 이미지 API, md+토큰→python-pptx)을 실물 스파이크로 증명하며, 실패를 env/integration으로 분류해 에스컬레이션한다.

## Scope

- **In:** `docs/engineering-discipline/harness/pptxx-skill/planning/spikes/**` 하위 파일 생성만.
  - `spikes/screenshot/` — sample-deck.html, slide-01..03.png, nonces.txt, transcription.md, verdict.md, README.md
  - `spikes/image-api/` — openverse-sample.json, wikimedia-sample.json, README.md
  - `spikes/pptx/` — format-spec.md, sample-slides.md, tokens.json, md2pptx-spike.py, readback.py, sample.pptx, README.md
- **Out (금지):** 저장소 소스 무접촉 — `hooks/`, `skills/`, `agents/`, `tests/`, `index.html`, `plugin.json` 등 spikes/ 밖의 모든 파일 생성·수정 금지. 다운로드한 이미지 바이너리는 검증 후 삭제(git 커밋 금지). `hooks/scripts/token-lib.js`는 **읽기/require만** 허용(fixture 검증용).
- **Out (범위):** deck-gate 구현(M2), SKILL.md 저작(M3), 이미지 패널/visual-qa phase(M4), export phase(M5).

## Verification Strategy

- **Level:** file-predicate — 태스크별 이진 술어(파일 존재 / 명령 exit 0 / grep 매치)로 검증. 각 태스크의 **Acceptance** 절이 검증 명령 그 자체다.
- 저장소 스위트 `node tests/gates.test.js`는 **M1이 실행하지 않는다** — M1은 repo 소스를 건드리지 않으므로 회귀 표면이 없다. (실행해도 무해하나 M1의 합격 조건이 아니다.)
- 예외적으로 Task 8의 tokens.json fixture만 `hooks/scripts/token-lib.js`의 `validateTokens`를 **읽기 전용 require**로 호출해 검증한다(아래 명령 참조).

## Environment Context

- Windows 11 Home, PowerShell 7+ 및 Git Bash 사용 가능. Node.js 존재(hooks가 Node 기반).
- **Python / pip / Playwright 가용성 미확인** — Task 0가 프로브하고 각 스파이크 README에 버전을 기록한다.
- **env-setup 실패는 마일스톤 일시정지 사유다(스코프 절단 금지)** — milestone Notes 준수: env 실패를 integration 실패로 위장 분류하지 말 것. 설치 자체가 불가능하면 M1을 pause하고 사용자에게 env 문제로 에스컬레이션한다.
- 네트워크: Openverse·Wikimedia Commons 엔드포인트는 2026-07-07 플랜 작성 시점에 **라이브 검증 완료**(아래 Task 6 참조). Playwright 브라우저 바이너리 다운로드, pip 패키지 설치에 네트워크 필요.

## Fixed Contracts (§0 동결 문자열 — 모든 태스크가 준수)

| 항목 | 동결 값 |
|---|---|
| 스크린샷 출력 경로 | `<deck>/shots/slide-NN.png` (NN = 01부터 zero-pad 2자리) |
| Playwright 필수 옵션 | `javaScriptEnabled: false` + **deny-by-default 요청 차단**(옵션 아님) |
| 논스 알파벳 | `A-HJ-NP-Z2-9` (I·O·0·1 제외), 6자, 렌더 크기 ≥24px |
| 도식 블록 마커 | 펜스드 블록 여는 줄 `` ```diagram `` (Task 1에서 정의 — M2 deck-gate가 `slides.md`를 이 문자열로 grep해 `visualQa.required`를 무장) |
| 매니페스트 행 문법 | `| images/photo1.jpg | <sha256> | https://... | cc-by | <author> |` (deck-상대 포워드슬래시 경로) |
| 증거 tail 4종 | visual-qa judge, image-suitability judge, `evidence/deck/build.md`(raw), `evidence/deck/fetch.md`(raw) — M1 문서가 경로를 인용할 때 이 표기 그대로 |
| 다운로드 명령 | `curl --proto '=https' --proto-redir '=https' --max-redirs 3`, ≤5MB, `Content-Type: image/*` |

스파이크 루트(이하 `spikes/`로 축약): `docs/engineering-discipline/harness/pptxx-skill/planning/spikes/`

---

## Tasks

- [x] **Task 0: 환경 프로브 + 기록** — Python 3.14.6, pip 26.1.2, node v24.18.0, Playwright 1.61.1 모두 존재; 3개 README에 `## Environment` 기록(grep -l 3파일 확인)
  - PowerShell에서 실행·기록: `python --version`, `pip --version`, `npx playwright --version` (실패 시 `npm ls playwright`도), `node --version`.
  - 결과(버전 문자열 또는 "미설치")를 이후 각 스파이크 README(screenshot/image-api/pptx)의 `## Environment` 절에 그대로 옮겨 적는다.
  - Python 또는 pip 부재 시: 설치를 1회 시도하고, 설치가 사용자 개입 없이 불가하면 **여기서 M1 pause + env 에스컬레이션** (integration 실패로 분류 금지).
  - **Acceptance:** 세 README 각각에 `## Environment` 절이 존재하고 `python --version`·`node --version` 출력이 기록됨 — `grep -l "## Environment" spikes/*/README.md`가 3개 파일 반환.

- [x] **Task 1: format-spec.md 저작 (무조건 — 어떤 스파이크보다 먼저)** — 작성 완료; grep: ```` ```diagram ````=3, `---`=1, attribution=3, notes=3, shots=2, 폴백=1 (전부 ≥1)
  - `spikes/pptx/format-spec.md` — 슬라이드 md 포맷 1페이지 스펙. 구성요소 전부 정의:
    1. **슬라이드 구분자:** 단독 줄 `---`.
    2. **제목:** 슬라이드당 첫 `# <title>` 1개.
    3. **본문:** 마크다운 문단/불릿(`-` 리스트, 최대 2단 중첩).
    4. **이미지+출처 지시어:** `![alt](images/<file>)` 직후 줄에 `> attribution: <author> | <license> | <source-URL>` 인용 라인 — 필드 순서·구분자 `|` 고정, 매니페스트 행 문법(§0)과 필드 대응 명시.
    5. **도식 블록:** 여는 줄이 정확히 `` ```diagram ``인 펜스드 블록, 닫는 줄 `` ``` ``. **이것이 단일 무결 마커다** — M2 deck-gate가 `slides.md`에서 `^```diagram$`을 grep해 `visualQa.required=true`를 무장하므로, 스펙에 "도식은 반드시 이 펜스로만 표기하며 변형(`~~~diagram`, `diagram:` 등) 금지"를 명문화한다. 블록 내부 첫 줄은 `slide: NN`(래스터 참조 대상 슬라이드 번호), 이후 자유 텍스트 설명.
    6. **발표자 노트:** 슬라이드 말미 `> notes:` 인용 라인(선택).
  - **도식 export 정책** 절: pptx 변환 시 도식 블록은 `shots/slide-NN.png` 래스터를 재사용해 그림으로 삽입; 해당 PNG 부재 시 폴백 = 제목 + 도식 설명 텍스트를 발표자 노트로 강등(슬라이드 본문에는 제목만).
  - **Acceptance:** `spikes/pptx/format-spec.md` 존재; `` grep -c '```diagram' `` 결과 ≥1; `---`·attribution·notes·"shots" 문자열 각각 grep 매치; "폴백" 또는 "fallback" grep 매치.

- [x] **Task 2: 스크린샷 주소화 컨벤션 README 저작 (무조건)** — 계약 절 + Environment + 자리표시 헤딩 작성; grep `shots/slide-NN.png`·`javaScriptEnabled`·`slide-01` 각 1 매치
  - `spikes/screenshot/README.md` — 계약 절 먼저 작성(스파이크 결과와 무관하게 유효):
    1. **주소화 컨벤션:** deck HTML의 각 슬라이드는 `<section class="slide" id="slide-NN">` (NN = 01부터 zero-pad), 뷰포트 고정 1280×720; 캡처는 `page.locator('#slide-NN').screenshot()` 요소 단위(스크롤 좌표 의존 금지).
    2. **출력 경로(동결):** `<deck>/shots/slide-NN.png`.
    3. **필수 실행 조건(동결):** `javaScriptEnabled: false` + deny-by-default 요청 차단 — `context.route('**/*', ...)`에서 대상 deck 파일 자신(file:// 로컬)만 continue, 그 외 전부 abort. 옵션이 아님을 명기.
  - `## Environment` 절(Task 0), `## Capture Command`·`## Dispatch Prompt`·`## Verdict` 절은 Task 4·5가 채운다(자리 표시 헤딩만 미리 둠).
  - **Acceptance:** `spikes/screenshot/README.md` 존재; `shots/slide-NN.png`·`javaScriptEnabled`·`slide-01` 문자열 각각 grep 매치.

- [x] **Task 3: ≥3슬라이드 샘플 deck HTML + 논스 센티널** — Node crypto.randomInt로 논스 생성; grep: `id="slide-0`=3, `<script`=0, nonces.txt 정규식 매치 3줄
  - `spikes/screenshot/sample-deck.html` — 하우스 스타일(repo `index.html` 참조: 다크 서피스 `#1a1410`, 앰버 액센트 `#d97b30`, serif 디스플레이) 자기완결 단일 파일. **`<script>` 태그 0개, 외부 리소스 참조 0개**(웹폰트 포함 — 시스템 폰트 스택 사용; §0 정적 검사와 합치). 인라인 SVG 허용.
  - 슬라이드 3개, 각각 Task 2 컨벤션(`id="slide-01..03"`, 1280×720 고정 박스).
  - 논스 센티널: 슬라이드당 1개, 알파벳 `A-HJ-NP-Z2-9`에서 무작위 6자, `font-size ≥ 24px` 모노스페이스 고대비 렌더. 생성은 스크립트로(예: Node one-liner) — 손으로 고르지 말 것.
  - 슬라이드마다 **고유 도형** 1개(예: slide-01 원, slide-02 삼각형, slide-03 육각형 — 인라인 SVG)로 슬라이드 오배치 판별 가능하게.
  - `spikes/screenshot/nonces.txt`에 `slide-01: <nonce>` 형식 3줄 기록. **이 파일은 Task 5 판독자에게 절대 제공 금지.**
  - **Acceptance:** `sample-deck.html` 존재하고 `grep -c 'id="slide-0'` ≥3, `grep -c '<script'` == 0; `nonces.txt` 존재하고 정규식 `^slide-0[1-3]: [A-HJ-NP-Z2-9]{6}$` 매치 3줄.

- [x] **Task 4: Playwright 설치(부재 시) + 슬라이드별 캡처** — 전역 playwright@1.61.1 재사용(설치 불필요); capture.cjs exit 0; slide-01..03.png 각 48–51KB(>1KB); README `## Capture Command` 기록
  - Playwright 부재 시 스크래치/전역에 설치(`npm i -D playwright` 또는 `npx playwright install chromium`) — **spikes/ 밖 repo 파일(package.json 등)을 수정하지 않는 위치에서** 실행. 설치 명령·버전을 README `## Environment`에 기록. 설치 실패 = env 실패 → M1 pause.
  - 캡처 스크립트(Node, spikes/screenshot/ 하위에 두어도 무방): `chromium.launch()` → `browser.newContext({ javaScriptEnabled: false, viewport: {width:1280, height:720} })` → `context.route('**/*', route => route.request().url().startsWith('file://') && route.request().url().includes('sample-deck.html') ? route.continue() : route.abort())` → `page.goto(file://…/sample-deck.html)` → 슬라이드별 `page.locator('#slide-NN').screenshot({ path: 'slide-NN.png' })`.
  - 실행한 **정확한 명령 전문**을 README `## Capture Command`에 기록.
  - 실패 분류: 설치/브라우저 다운로드 실패 = env; 설치 성공 후 캡처 실패(렌더 오류·빈 이미지) = integration.
  - **Acceptance:** `spikes/screenshot/slide-01.png`·`slide-02.png`·`slide-03.png` 존재, 각 파일 크기 >1KB; README에 `## Capture Command` 절 아래 명령 텍스트 존재(grep `playwright` 또는 스크립트 파일명 매치).

- [x] **Task 5: 정보 격리 전사(transcription) + 판정** — 격리 서브에이전트 전사 3/3 논스·도형 완전 일치(1차 시도); verdict.md `VERDICT: APPROVE`; 프롬프트 전문 README 기록
  - 정보 격리 서브에이전트 디스패치: 프롬프트에 **PNG 3개의 절대 경로만** 제공 — deck HTML·nonces.txt·본 플랜·논스 알파벳 힌트 일절 금지. 지시: "각 이미지에서 보이는 6자 코드와 도형을 전사하라. 형식: `slide-NN: <code> / <shape>`."
  - 디스패치 프롬프트 전문을 README `## Dispatch Prompt`에 기록.
  - 서브에이전트의 **최종 메시지를 그대로(verbatim)** `spikes/screenshot/transcription.md`에 영속.
  - 판정(오케스트레이터가 수행, `spikes/screenshot/verdict.md`에 기록): 전사된 3개 값 == `nonces.txt`의 3개 값(완전 일치) → `VERDICT: APPROVE` 라인 기록. 불일치 → **새 논스 재생성(Task 3 재실행) + 재캡처(Task 4) + 재전사 1회만** 허용, 재차 불일치면 `VERDICT: REJECT` + 실패 지점(캡처 실패 vs 전사 불일치) 명시 후 integration 에스컬레이션(아래 규칙).
  - **Acceptance:** `transcription.md` 존재(≥3줄); `verdict.md` 존재하고 `grep '^VERDICT: \(APPROVE\|REJECT\)$'` 매치 1줄; APPROVE인 경우 verdict.md에 기록된 대조표의 3쌍이 nonces.txt와 일치.

- [x] **Task 6: 이미지 API 스파이크 — 메타데이터 쿼리 (keyless)** — Openverse 5건/Commons 3건(라이선스·creator·source 전부 non-empty, node 파스 exit 0); `haslicense:cc0` 미지원 확인 → LicenseShortName 클라이언트 필터 채택·README 기록; rate-limit(OV 20/min·200/day, Commons 없음) 기록
  - **Openverse (플랜 시점 라이브 검증 완료 — 2026-07-07, HTTP 200):**
    - `GET https://api.openverse.org/v1/images/?q=<query>&license=cc0,pdm&mature=false&page_size=5`
    - 관측된 rate-limit 헤더: `X-Ratelimit-Limit-Anon_burst: 20/min`, `X-Ratelimit-Limit-Anon_sustained: 200/day` (+ `X-Ratelimit-Available-*`).
  - **Wikimedia Commons (플랜 시점 라이브 검증 완료 — imageinfo 응답 확인):**
    - `GET https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=filetype:bitmap+haslicense:cc0+<query>&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1024`
    - `haslicense:cc0`/`haslicense:pd` CirrusSearch 키워드는 **실행 시 재검증** — 미지원이면 `gsrsearch`에서 제거하고 응답의 `extmetadata.LicenseShortName`으로 CC0/Public domain을 클라이언트 측 필터링(README에 채택 방식 기록).
  - 두 요청 모두 서술형 UA 헤더 필수: `-A "glm-hammer-pptxx-spike/0.1 (contact: dev0jsh@gmail.com)"`.
  - 저장: `spikes/image-api/openverse-sample.json`·`wikimedia-sample.json` — 각 ≥3건, 건마다 license·creator·source-URL 필드 비어 있지 않게(Commons는 extmetadata의 `LicenseShortName`·`Artist`·`descriptionurl`을 매핑해 정규화 JSON으로 저장).
  - README(`spikes/image-api/README.md`)에 기록: 실제 쿼리 URL 전문, 요청 헤더, 관측한 rate-limit 응답 헤더(Commons에서 미관측 시 **'없음'** 명시).
  - 실패 분류: DNS/프록시/방화벽 = env; 200인데 필터·필드 부재 = integration.
  - **Acceptance:** 두 JSON 파일 존재, 각각 `license`·`creator`(또는 artist)·source-URL 필드가 3건 이상에서 non-empty (`node -e` 파스 검사 exit 0); README에 `api.openverse.org`·`commons.wikimedia.org` 쿼리 URL과 rate-limit 절(값 또는 '없음') grep 매치.

- [x] **Task 7: API당 1건 다운로드 → 검증 → 삭제** — OV cc0 500x339/68,726B·WM PD 1280x843/313,493B 모두 image/jpeg·sha256·치수 README 기록 후 삭제; spikes/ 하위 비-PNG 바이너리 0건, PNG는 slide-01..03만
  - Task 6 결과에서 API별 1건(cc0 또는 pdm 라이선스 건만) 선택, 다운로드:
    `curl --proto '=https' --proto-redir '=https' --max-redirs 3 -A "<Task 6 UA>" -o <tmpfile> --max-filesize 5242880 -w "%{content_type} %{size_download}" <url>`
  - 검증: Content-Type이 `image/*`, 크기 ≤5MB, sha256 산출(`Get-FileHash -Algorithm SHA256` 또는 `sha256sum`), 픽셀 치수 확인(Python Pillow 가용 시 `PIL.Image.open(...).size`, 아니면 PNG/JPEG 헤더 파싱 스크립트 — 방법도 README에 기록).
  - `spikes/image-api/README.md`에 건별 기록: 최종 URL·sha256·치수(WxH)·Content-Type·바이트 크기.
  - **기록 완료 후 바이너리 즉시 삭제.** 어떤 이미지 바이트도 git에 커밋 금지 — 다운로드 위치는 scratchpad 권장.
  - **Acceptance:** README에 API별 1건씩 `sha256`(64-hex grep `[a-f0-9]{64}`)·치수·URL 기록 존재; `spikes/` 하위에 `Get-ChildItem -Recurse -Include *.jpg,*.jpeg,*.gif,*.webp` 결과 0건이고 PNG는 Task 4의 slide-0N.png 3개뿐.

- [x] **Task 8: PPTX 스파이크 — md+tokens → sample.pptx → readback** — python-pptx 1.0.2/Pillow 12.2.0 기설치; validateTokens `{"ok":true}` exit 0; `python md2pptx-spike.py && python readback.py` 재실행 exit 0(READBACK PASS, 4슬라이드·폴백 검증 포함); sample-slides.md greps: diagram=2·attribution=1·notes=2·`---`=3
  - `pip install python-pptx` (부재 시; Pillow 동반 설치됨). 실패 = env → M1 pause. 설치 명령·버전(`python -c "import pptx; print(pptx.__version__)"`)을 `spikes/pptx/README.md`에 기록.
  - `spikes/pptx/sample-slides.md`: format-spec **전 구성요소** 행사 — 제목+본문 슬라이드, 이미지+attribution 지시어 슬라이드(이미지는 스파이크 내 생성한 로컬 placeholder PNG 사용 — 예: Pillow로 단색 PNG 생성; Task 7의 웹 이미지 재사용 금지, 이미 삭제됨), `` ```diagram `` 블록 슬라이드(+ 폴백 경로도 행사: shots PNG가 있는 경우 1개·없는 경우 1개), `> notes:` 라인, `---` 구분자.
  - `spikes/pptx/tokens.json`: **validateTokens 통과 fixture** — 요구사항: 최상위 그룹 `color`/`typography`/`spacing`/`radius`; 서브그룹 `color.text`(≥1)·`color.surface`(≥1)·`color.accent`(≥1); `color.text.default`·`color.surface.default` 필수; 모든 리프가 자체 `$type` 보유; color는 hex; `typography.font` ≥1 `fontFamily`; `typography.size` ≥3 `dimension`; `spacing` ≥4 `dimension`; `radius` ≥1 `dimension`; 대비 — `color.text.*` vs `color.surface.default` ≥4.5:1(muted 계열은 ≥3.0), `color.accent.*` ≥3.0:1. repo `index.html` 팔레트(`#1a1410`/`#efe7d6`/`#d97b30`) 재사용 권장(대비 기준 충족).
  - 검증 명령(repo 루트에서, 읽기 전용): `node -e "const r=require('./hooks/scripts/token-lib.js').validateTokens('docs/engineering-discipline/harness/pptxx-skill/planning/spikes/pptx/tokens.json'); console.log(JSON.stringify(r)); process.exit(r.ok?0:1)"`
  - `spikes/pptx/md2pptx-spike.py`: sample-slides.md 파스 + tokens.json 적용(서피스/텍스트 색, 폰트 크기) → `sample.pptx` 생성. 이미지 슬라이드는 picture shape 삽입, diagram-with-shot 슬라이드는 shots PNG(스파이크에선 Task 4 산출물 경로 재사용 가능) 삽입, diagram-without-shot 슬라이드는 제목+발표자 노트 폴백.
  - `spikes/pptx/readback.py`: `sample.pptx` 재개방 → 전 슬라이드 제목이 sample-slides.md의 `#` 제목과 일치 단정 + 이미지 슬라이드 picture-shape 개수 >0 단정 → 전부 통과 시 exit 0.
  - 재생성 명령 전문(예: `python md2pptx-spike.py && python readback.py`)을 README에 기록하고 **실제로 그 명령으로 재실행해 exit 0 확인**.
  - 실패 분류: pip/import 실패 = env; 생성·readback 단정 실패 = integration.
  - **Acceptance:** 위 `node -e` validateTokens 명령 exit 0; README 기록 명령 그대로 실행 시 `sample.pptx` 재생성 + `readback.py` exit 0; `sample-slides.md`에 `` ```diagram ``·`attribution:`·`notes:`·`---` grep 각 ≥1.

- [x] **Task 9: 격리 점검 + 플랜 완료 노트** — M1 생성 파일 19개 전부 `spikes/` 하위(+본 플랜 체크박스); 비-PNG 이미지 바이너리 0건; hooks/·tests/ 변경분은 동시 진행 중인 타 마일스톤 소유로 M1 무관
  - `git status --porcelain`으로 M1이 생성·수정한 전 파일 나열 — **전부** `docs/engineering-discipline/harness/pptxx-skill/planning/spikes/` 하위(및 본 플랜 문서 자신)인지 확인. 이미지 바이너리(slide-0N.png·sample.pptx 내장분 제외) 미커밋 확인.
  - 파일 목록을 플랜 완료 노트(본 문서 말미 `## Completion Note` 절 추가)에 기록하고, 세 스파이크의 판정(APPROVE/REJECT/paused-env)을 요약.
  - **Acceptance:** `git status --porcelain` 출력의 모든 경로가 `spikes/` 접두 또는 본 플랜 파일; 본 문서에 `## Completion Note` 절과 파일 목록 존재.

---

## Escalation Rules (milestone 규율 전사)

**분류 원칙 — env-setup vs integration:**
- 각 README에 설치 명령·버전을 기록한다. 실패 시 에스컬레이션 메시지가 **env-setup 실패인지 integration 실패인지 반드시 분류**한다.
- **env 실패**(Python/pip/Playwright/네트워크 설치·접근 불가): **M1 일시정지** — 스코프를 잘라 우회하는 것 금지. 사용자에게 env 문제로 보고.
- **integration 실패**(설치는 됐으나 통합이 증명 실패): 해당 스파이크만 REJECT 판정하고 나머지 스파이크는 계속 진행(세 스파이크는 독립 판정, M2 비차단). 자동 스코프 절단 금지 — 아래 3개 사용자 에스컬레이션 지점 준수.

**3개 사용자 에스컬레이션 지점 (state.md/draft-v4 규칙):**
1. **스크린샷 스파이크 integration 실패** → **M4 착수 전** visual-qa 면제 여부를 사용자가 결정 (면제 시 §0 면제 마커 적용 + M4 축소 기준). 에스컬레이션 메시지에 렌더 상태 명시: 캡처 실패인지 전사 불일치인지.
2. **이미지 API 스파이크 integration 실패** → **M4 착수 전** 사용자 결정 (폴백 후보: WebSearch-only + 이미지별 수동 라이선스 확인).
3. **pptx 스파이크 integration 실패** → **M5 취소 여부 사용자 결정** (선택지: 재시도 / 축소 / HTML-only 수용).

**논스 오독 방어(재확인):** 모호 글리프 제외 알파벳(`A-HJ-NP-Z2-9`) + 신규 논스 재시도 1회 + 에스컬레이션 메시지에 캡처 실패 vs 전사 불일치 구분 명시.

## Completion Note

**실행일:** 2026-07-07. 전 태스크(0–9) 완료, 재시도 0회, env 실패 없음.

**세 스파이크 판정:**

| 스파이크 | 판정 | 근거 |
|---|---|---|
| screenshot | **APPROVE** | 정보 격리 전사 3/3 논스(`5SCNR3`/`SPEG2H`/`KDU39D`)·도형(circle/triangle/hexagon) 완전 일치, 1차 시도 |
| image-api | **APPROVE** | Openverse 5건·Commons 3건 license/creator/source non-empty; `haslicense:cc0` 미지원 → LicenseShortName 클라이언트 필터 채택(README 기록); API별 1건 다운로드 검증(sha256·치수·image/jpeg·≤5MB) 후 삭제 |
| pptx | **APPROVE** | validateTokens `{"ok":true}` exit 0; `python md2pptx-spike.py && python readback.py` exit 0 — 제목 4/4 일치, picture 단정, 폴백(노트 강등) 단정 통과 |

**M1 생성 파일 (전부 `spikes/` 하위, 19개 + 본 플랜 체크박스/본 절):**

- `spikes/screenshot/`: README.md, sample-deck.html, nonces.txt, capture.cjs, slide-01.png, slide-02.png, slide-03.png, transcription.md, verdict.md
- `spikes/image-api/`: README.md, openverse-sample.json, wikimedia-sample.json
- `spikes/pptx/`: README.md, format-spec.md, sample-slides.md, tokens.json, md2pptx-spike.py, readback.py, sample.pptx

**바이너리 규율:** 다운로드 이미지 2건은 scratchpad에서 검증 후 삭제. `images/placeholder.png`는 빌드 시 재생성되므로 트리 비잔류. spikes/ 하위 이미지 바이너리는 slide-0N.png 3개(+sample.pptx 내장분)뿐. git 커밋 없음.

**git status 참고:** `hooks/hooks.json`·`hooks/scripts/lib.js`·`hooks/scripts/stop-gate.js`·`hooks/scripts/deck-gate.js`·`tests/gates.test.js`·`docs/engineering-discipline/context/2026-07-07-pptxx-skill-brief.md` 변경분은 동시 진행 중인 타 마일스톤 소유 — M1은 해당 파일을 건드리지 않았다(`token-lib.js`는 읽기 전용 require만 수행).
