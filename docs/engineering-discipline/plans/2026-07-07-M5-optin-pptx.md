# Plan: M5 — Opt-in PPTX Extraction

**Milestone:** `docs/engineering-discipline/harness/pptxx-skill/milestones/M5-optin-pptx.md`
**계약 원천(유일):** `docs/engineering-discipline/harness/pptxx-skill/planning/draft-v4.md` §0 (동결 — status enum·awaiting-user/exporting·deck-gate 모델·마커 시대 상수)
**상속 인터페이스:**
- `checkpoints/M1-checkpoint.md` — pptx 스파이크 **integration 성공**(readback exit 0: 제목 4/4·picture 단정·노트 폴백) → §0 에스컬레이션 지점 3 미발동 → **M5 진행 확정**. 환경 기설치: **python-pptx 1.0.2 · Pillow 12.2.0 · Python 3.14.6**(신규 설치 불필요). 경화 대상 스파이크: `planning/spikes/pptx/md2pptx-spike.py`·`readback.py`·`format-spec.md`(도식 export 정책)·`sample-slides.md`·`tokens.json`.
- `checkpoints/M3-checkpoint.md` — SKILL.md 코어(5섹션·State Protocol §0 verbatim·터미널 `building → done`)·드리프트 s1–s7·기존 93 ok. status enum은 **이미 8종**(s1 무변경).
- `checkpoints/M4-checkpoint.md` — SKILL.md 이미지/visual-qa phase·마커 {scripting,chaining,imaging,building,**visual-qa**,done}·터미널 `building → [visual-qa] → done`·기존 **109 ok**. M4 주석이 이미 예고: **"M5 += awaiting-user·exporting"**. deck-gate 무장/매핑/정적검사·pptxxGate 분기 ①–④는 M2에서 완비 — **exporting/awaiting-user status는 §0 게이트 분기 표에 이미 존재**(exporting ∈ 분기 ①②③ 적용 status; awaiting-user는 공통 가드 통과, pptxx (h)가 이미 단정). **M5는 게이트 무접촉.**

## Goal

deck 완성 후 `awaiting-user` 옵트인 질문과 `exporting` phase를 `skills/pptxx/SKILL.md`에 삽입하고(기본 생성 없음 — 명시 동의만), M1 스파이크를 경화한 **런타임 전용** 컨버터 `skills/pptxx/scripts/md2pptx.py`로 M4-시대 최종 슬라이드 포맷에서 텍스트 편집 가능 .pptx를 생성한다. 마커 시대 상수를 8종 풀셋으로 확장하고, **zero-dep 순수-Node 스위트가 md2pptx.py를 절대 import하지 않음**을 경계 테스트로 못박는다.

## Scope

- **In:**
  - **Create:** `skills/pptxx/scripts/md2pptx.py` (런타임 전용 컨버터 — hooks/tests가 import·require·spawn하지 않음)
  - **Modify:** `skills/pptxx/SKILL.md`(awaiting-user 옵트인 phase + exporting phase + 마커 2종 + pip 안내 + Python 부재 폴백 + 터미널/Anti-Patterns 갱신), `tests/gates.test.js`(마커 시대 상수 **인플레이스 확장** + zero-dep 경계 테스트 **append**)
  - **Modify(스파이크 산출물):** `planning/spikes/pptx/README.md`(거부 부정 케이스 1건 기록), `planning/spikes/pptx/readback.py`(2런 픽스처 하니스로 확장 또는 병설 드라이버) — **런타임/수동 검증용, 스위트 미참조**
- **Out (내 기여 0줄 — git diff 무변경):**
  - `hooks/` 전체(`deck-gate.js`·`stop-gate.js`·`lib.js`·`hooks.json`·`route-intent.js` …) — **M2/M3 착지 완료. exporting/awaiting-user status는 §0 게이트 계약에 이미 존재 → 훅 변경 불요.**
  - `agents/` 전체 — M4 착지, 무접촉. `skills/crucible|forge|hammer|blueprint/SKILL.md` — 무접촉.
  - `.zcode-plugin/plugin.json` · `.claude-plugin/plugin.json` — 키워드 M3 착지, 무접촉.
  - **crucible 미접촉·plugin.json 미접촉** (밀스톤 명시 out).

## Verification Strategy

- **주 명령(자동·구속):** `node tests/gates.test.js` (repo root, **exit 0**).
  - **기존 109 단정 바이트 무수정 통과.** 유일 허용 인플레이스 편집 = **마커 시대 상수 배열 확장**(§0 드리프트 규칙 "M5 += {awaiting-user, exporting}"이 사전 승인 — "기존 단정 무수정"의 명문화된 예외). 이 배열 성장으로 s2 루프가 마커-존재 check를 **6 → 8**로 +2 생성한다(기존 6개 check 문자열은 무수정, 2개 신규 추가).
  - **신규 append check(≥3):** ① zero-dep 경계 grep 0-match, ② md2pptx.py 존재, ③ md2pptx.py가 어떤 hook/test에도 `require()`되지 않음.
  - **기대 출력:** **≈112–114 ok / 0 FAIL**(정보성 앵커 — check 통합/분리로 ±가능; 구속 기준은 "기존 109 green 유지 + 신규 경계 섹션 green + exit 0").
- **런타임 픽스처(수동/문서화 — 스위트 미배선, 별도 python 명령):**
  - **2런 수용 픽스처** (cwd = `planning/spikes/pptx/`, 또는 harness 내부 `tempfile.mkdtemp()`):
    ```
    python readback.py            # 또는 python m5-fixture.py — 2런을 순차 실행
    ```
    - **run (a)** — 픽스처 deck에 `shots/slide-NN.png` **존재** → 도식 슬라이드 picture-shape **정확 1**.
    - **run (b)** — 동일 deck에서 PNG **부재** → 도식 슬라이드 **제목 + 비어있지 않은 발표자 노트 + picture 0**.
    - 두 런 공통: 전 슬라이드 제목 일치, **exit 0**.
  - **거부 부정 케이스(별도 명령, exit ≠ 0 기대):** `..`/절대/비이미지 이미지 참조를 담은 fixture로 `python md2pptx.py <deck>` → **nonzero exit + 명확한 거부 메시지**. 결과를 `planning/spikes/pptx/README.md`에 1건 기록.
  - **⚠ 이 python 픽스처는 절대 `tests/gates.test.js`에 배선하지 않는다** — 스위트는 순수-Node zero-dependency 유지(md2pptx.py를 import/require/spawn 금지). gates.test.js는 md2pptx.py의 **존재**와 **zero-dep grep 0-match**만 검사한다.
- **zero-dep 경계 grep (동결 — 밀스톤 SC 4):**
  ```
  grep -rE "python-pptx|import pptx|spawn(Sync)?\(['\"](python|py)" hooks/ tests/
  ```
  → **0 matches**. (스코프 = `hooks/`·`tests/`만. `skills/pptxx/scripts/md2pptx.py`는 `skills/` 하위라 **비대상** — 이것이 컨버터가 python-pptx를 import해도 무해한 이유. SKILL.md의 `pip install python-pptx` 안내도 `skills/` 하위라 비대상.)
- **Scope check:**
  - `git diff --stat` = **2 modified**(`skills/pptxx/SKILL.md`, `tests/gates.test.js`) + **1 untracked**(`skills/pptxx/scripts/md2pptx.py`) + **spikes 산출물**(`README.md`, `readback.py`/`m5-fixture.py` — planning 하위).
  - `git diff -- hooks/ agents/ skills/crucible/ .zcode-plugin/ .claude-plugin/` 출력 **0줄**.

## Constraints (전 태스크 공통)

1. **md2pptx.py는 런타임 전용 — hooks/tests 미참조.** 어떤 훅·테스트도 이 파일을 `require()`·`import`·`spawn(python …)` 하지 않는다. gates.test.js는 **존재 확인 + zero-dep grep**만. (이 경계가 스위트의 zero-dependency 불변식을 지킨다.)
2. **SKILL.md·테스트 편집은 Write/Edit 툴 경유.** 이 저장소 자신의 glm-hammer 훅이 활성이나 경로 필터로 무해(아래 Plan Notes).
3. **status enum은 §0 verbatim 이미 8종(M4 착지) — State Protocol JSON 무수정.** s1(status set-equal to §0)은 **무변경 green**. M5가 추가하는 것은 **마커(⟨state:⟩)** 2종과 **시대 상수 배열**의 확장뿐.
4. **마커 시대 상수 확장이 유일한 인플레이스 테스트 편집.** 그 외 모든 신규 check는 `process.exit` 앞 **append**. 기존 s1·s3–s12·(a)–(p)·planKey·crucible·(t) 등은 바이트 무수정.
5. **실제 `docs/glm-hammer/decks/` 콘텐츠 생성 금지.** 2런 픽스처 deck은 반드시 `tempfile.mkdtemp()` 또는 `planning/spikes/pptx/` 하위에서만. 실제 decks/ 파일을 쓰면 이 저장소 자신의 deck-gate가 무장하여 `.glm-hammer/state.json`을 오염시킨다(HAZARD).
6. **이미지 바이너리·pptx 비커밋 규율(M1 선례).** 픽스처가 생성하는 shots PNG·pptx는 tmpdir 또는 빌드 시 재생성 산출물 — 트리에 남기지 않는다.
7. **경계 grep의 자기-매치 방지(CRITICAL).** gates.test.js 안에서 zero-dep 패턴을 **연속 리터럴로 쓰지 않는다** — 프래그먼트 조립(`'python' + '-pptx'`, `'import ' + 'pptx'`, `'spawn' + …`)으로 RegExp를 만들어, `tests/`를 스캔할 때 테스트 자신이 자기 패턴에 매치되지 않게 한다. 마찬가지로 존재-확인 라인의 `'skills/pptxx/scripts/md2pptx.py'` 문자열이 not-require 스캔에 걸리지 않도록, not-require는 `require(` 문맥으로 한정한다.

---

## Fixed Contracts (본 계획 내 동결 — 전 태스크가 이 절만 참조)

### C-1. `md2pptx.py` CLI/호출 계약 (스파이크 경화 — §0 미명시라 본 계획이 동결)

M1 스파이크는 경로를 `HERE`에 하드코딩했다(`MD_PATH`/`OUT_PATH`/`SHOTS_DIR = ../screenshot`). M5 런타임 컨버터는 **deck 디렉토리를 인자로 받는다:**

```
python md2pptx.py <deck-dir> [<tokens.json>]
```

- `<deck-dir>/slides.md`를 파스한다.
- 이미지·도식 참조는 **오직 `<deck-dir>` 내부(포함 `<deck-dir>/shots/`)에서만** 해석한다(C-3 경로 제한).
- 출력 = `<deck-dir>/<deckname>.pptx`(deckname = deck 디렉토리 basename). 기존 파일 덮어쓰기 허용.
- `<tokens.json>` 인자는 **선택** — 미지정 시 `<deck-dir>/tokens.json` 시도, 그마저 없거나 파스 실패면 **기본 스타일로 진행**(best-effort, §0/밀스톤 "토큰 스타일 best-effort"). 스타일 열화는 라이브 수동 검증 범위(M_final).
- 성공 시 **exit 0** + 요약 stdout(슬라이드 수). 경로 제한 위반 시 **nonzero exit + 명확한 거부 메시지**(C-3).

### C-2. 파싱 계약 (M4-시대 최종 포맷 — format-spec 합치)

`format-spec.md`의 5구성요소를 스파이크 `parse_slides` 기반으로 경화:

- **슬라이드 구분자:** 단독 줄 `---`(펜스 내부 제외 — in-fence 토글로 보호, 스파이크 로직 유지).
- **제목:** 슬라이드당 첫 `# <title>` 1개(readback이 슬라이드별 첫 텍스트박스와 대조).
- **본문:** 마크다운 문단/불릿(`-`, 최대 2단 중첩) — 텍스트박스로 렌더.
- **이미지+출처 지시어:** `![alt](images/<file>)` **직후 줄** `> attribution: <author> | <license> | <source-URL>` — picture shape + attribution 캡션(accent 색, best-effort).
- **도식 블록:** 정확히 `` ```diagram `` 펜스, 첫 줄 `slide: NN`(NN=01부터 zero-pad 2자리), 이후 자유 텍스트 → C-4 정책.
- **발표자 노트:** `> notes:` → notes_slide.
- **경화 가드(스파이크 대비 추가):** 제목 부재 슬라이드·빈 도식 블록·attribution 없는 이미지에 대해 크래시 대신 방어적 처리(제목 없으면 빈 문자열 대신 placeholder title로 exit 0 유지 — 단, 2런 픽스처는 전 슬라이드 제목 보유).

### C-3. 경로 제한 (동결 — 밀스톤 SC 2, §0 "md2pptx 경로 allowlist = deck 디렉토리(shots/ 포함)")

이미지·shots 참조 해석 시:

1. **허용 = `<deck-dir>` 서브트리(포함 `<deck-dir>/shots/`)만.** 조인 후 정규화 경로가 deck-dir 밖이면 거부.
2. **거부 조건:** 참조 문자열이 (a) 절대 경로(`/…`·드라이브 문자 `C:`·`file://`·`http(s)://`), (b) `..` 상위 이탈 포함, (c) 확장자가 이미지 집합 `{png,jpg,jpeg,gif,webp,svg}` 밖(비이미지 타입).
3. **구현:** `os.path.realpath(os.path.join(deck, ref))`가 `os.path.realpath(deck)` 하위인지 `os.path.commonpath`로 검증 + 확장자 화이트리스트 + 원시 문자열 프리픽스 검사(`..`·절대·스킴).
4. **거부 동작:** 즉시 **exit ≠ 0** + `image ref escapes deck directory / non-image type rejected: <ref>` 류 메시지.
5. **부정 케이스 1건 README 기록(동결 예시):** `![x](../evil.png)`(상위 이탈) → 거부. (대체 가능 등가 케이스: `![x](/etc/passwd.png)` 절대, `![x](images/note.txt)` 비이미지 — 최소 1건 기록.)

### C-4. 도식 export 정책 (format-spec §도식 export 정책 — 동결)

- **기본 경로:** `<deck-dir>/shots/slide-<NN>.png`(블록 첫 줄 `slide: NN` 값 verbatim, 2자리) **존재 시** → 그 래스터를 **picture shape 정확 1개**로 삽입. 본문 텍스트로 변환하지 않는다.
- **폴백:** 해당 PNG **부재 시** → 슬라이드 본문엔 **제목만** 남기고, 도식 설명 텍스트를 **발표자 노트로 강등**(picture **0**개). 노트는 **반드시 비어있지 않게**(설명이 비어도 `[diagram fallback — slide NN] …` 프리픽스로 보장 — 스파이크 로직 유지·강화).

### C-5. SKILL.md — awaiting-user 옵트인 phase (deck 완성 후 삽입)

터미널 `building → [visual-qa] → done` 직행 흐름 **사이에**, deck이 완성된 지점(building green / visual-qa APPROVE 후, `done` 직전)에 삽입:

1. **⟨state: awaiting-user⟩** — deck HTML 제품이 완성되면, **PPTX 추출을 원하는지 사용자에게 질문**한다. **기본 생성 없음(opt-in only)** — 묻지 않고 pptx를 만들지 않는다. §0: `awaiting-user`는 공통 가드를 통과(pptxx (h) 단정)하므로 이 대기 상태에서 Stop 훅이 차단하지 않는다(방치 금지 — `awaiting-user`가 정당한 대기 표식).
2. **사용자 거부/무응답 → `done`**(HTML deck으로 종료 — M4에서 이미 완결된 제품).
3. **사용자 동의 → ⟨state: exporting⟩**(C-6).

### C-6. SKILL.md — exporting phase (신규)

1. **⟨state: exporting⟩** — `skills/pptxx/scripts/md2pptx.py <deck-dir> [<design>/tokens.json]`을 실행해 편집 가능 .pptx를 생성한다. §0 게이트 분기 표: `exporting`은 분기 ①(봉인+build.md)·②(visual-qa)·③(image-panel) 적용 status — 즉 **exporting 동안에도 deck 봉인·수령증 요건이 유지**된다(게이트가 M2에서 이미 강제, 훅 무변경).
2. **`pip install python-pptx` 안내** — 컨버터는 python-pptx(및 Pillow) 의존. 엔드유저용 설치 명령을 명시(개발 환경엔 M1대로 기설치 — python-pptx 1.0.2·Pillow 12.2.0).
3. **Python 부재 폴백:** python 또는 python-pptx가 없으면 **HTML deck으로 종료**(pptx 생략, `done`). PPTX는 부가물 — HTML 제품은 M4에서 완결이므로 폴백이 무해.
4. **경로 제한 준수:** md2pptx.py가 deck 디렉토리 밖 이미지·비이미지·`..`를 거부함을 서술(C-3) — 컨버터 자체가 방어선.
5. 완료 → **⟨state: done⟩**.

### C-7. SKILL.md — 마커·터미널·Anti-Patterns 갱신

1. **마커 += `awaiting-user`·`exporting`:** Process에 위 두 절 신설로 `⟨state: awaiting-user⟩`·`⟨state: exporting⟩` 등장(s2 시대 상수가 단정). **status enum JSON은 §0 verbatim 무수정**(이미 8종 — s1 무변경).
2. **터미널 흐름 갱신:** `building → [visual-qa] → done` → `building → [visual-qa] → awaiting-user →(동의)→ exporting → done` / `→(거부/Python부재)→ done`. hybrid-done 재검증 서술 유지.
3. **Anti-Patterns 표 갱신(하우스 형식) — 최소 추가 행:**
   - 묻지 않고 기본으로 pptx 생성 → 옵트인 위반(명시 동의만; 기본은 HTML deck 종료).
   - md2pptx.py를 훅/테스트에서 import·require → zero-dep 스위트 오염(런타임 전용 경계 위반).
   - deck 디렉토리 밖(절대/`..`/비이미지) 이미지 참조 → md2pptx.py 경로 제한 거부(exit≠0).
   - python-pptx 부재인데 export 강행 → HTML 폴백으로 종료해야(방치·크래시 금지).

### C-8. 테스트 사양 (tests/gates.test.js — check 이름 동결)

**(A) 인플레이스 승격 1건 (§0/밀스톤 사전 승인 — 유일 허용 기존-단정 편집):**

| 편집 | 규칙 |
|---|---|
| **(s2)** 마커 시대 상수 | 기존 `M3_MARKERS` 배열에 `'awaiting-user'`·`'exporting'` 2원소 추가 → 풀 8종 `['scripting','chaining','imaging','building','visual-qa','awaiting-user','exporting','done']`. 주석 갱신(예: "M5: full 8-status set — marker grep과 fenced-JSON status enum이 이제 풀 enum에서 정렬"). 루프가 `pptxx (s2) marker ⟨state: awaiting-user⟩ present`·`… exporting present` **+2 check** 생성. 정규식 `⟨state:\s*awaiting-user`·`⟨state:\s*exporting`(하이픈 리터럴). |

**(B) 신규 zero-dep 경계 (append, `process.exit` 앞 — 프래그먼트 조립으로 자기-매치 방지):**

| check 이름 | 규칙 |
|---|---|
| `pptxx (z1) zero-dep boundary: no python refs in hooks/ + tests/` | `hooks/`·`tests/`의 모든 `.js`(및 `.json`) 파일을 재귀 판독, **프래그먼트 조립** RegExp(`['python'+'-pptx', 'import '+'pptx', 'spawn'+'(Sync)?\\('+"['\"]"+'(python|py)'].join('|')`)로 매치 → **0 matches**. (조립 덕에 이 테스트 파일 자신은 스캔에서 자기 패턴에 매치되지 않는다.) |
| `pptxx (z2) md2pptx.py exists` | `fs.existsSync(path.join(ROOT,'skills','pptxx','scripts','md2pptx.py'))` === true. |
| `pptxx (z3) md2pptx.py is never require()'d by any hook/test` | `hooks/`·`tests/`의 모든 `.js`를 판독, `require\([^)]*md2pptx` 패턴(프래그먼트 조립) → **0 matches**. (존재-확인 라인의 경로 리터럴은 `require(` 문맥이 아니므로 비매치. python 파일은 본질적으로 require 불가 — 경계를 문서화.) |

- 신규 check 이름 프리픽스 `pptxx (z1..z3)` — M2·M3·M4의 (a)–(p)·(r)·(s)·(t)와 비충돌.
- **금지:** 이 절 어디에도 md2pptx.py를 `require()`·`spawnSync(python …)` 하지 않는다. 파일 판독은 `fs.readFileSync`(순수-Node).

### C-9. §0가 명시하지 않아 본 계획이 동결한 해석 (리뷰어 주목 — 전부 플래그)

1. **md2pptx.py 호출 계약 = `python md2pptx.py <deck-dir> [<tokens.json>]`, 출력 `<deck-dir>/<basename>.pptx`.** §0는 "경로 allowlist = deck 디렉토리"만 명시하고 CLI 시그니처는 미명시 → 본 계획이 deck-dir 인자·tokens 선택 인자·출력 위치를 동결(C-1).
2. **tokens 부재 = best-effort 기본 스타일로 exit 0.** 밀스톤 "토큰 스타일 best-effort" 해석 — 스타일 열화는 크래시가 아니라 라이브 수동 검증 항목(M_final).
3. **2런 픽스처 = 단일 도식 슬라이드(`slide: 01`)에 대해 shots 유/무 대조.** M1의 sample-slides는 한 deck에 slide:01(shot 있음)·slide:99(없음)를 **동시** 배치했으나, M5는 **동일 도식 슬라이드**에 대해 run(a) shots 존재→picture 1 / run(b) 부재→picture 0+노트를 대조하는 **더 강한 2런** — sample-slides 문법 재사용, `tempfile.mkdtemp()` deck에서 shots를 넣고/빼며 md2pptx.py를 2회 호출(C-1 CLI).
4. **경계 grep의 not-require 판정 = `require(` 문맥 한정.** 밀스톤 "md2pptx.py가 require()되지 않음"을 바 `md2pptx` 전역 grep이 아니라 `require\([^)]*md2pptx`로 해석 — 존재-확인 라인의 경로 리터럴(정당) 오탐 방지(C-8 z3).
5. **exporting/awaiting-user 게이트 지원은 M2 완비 — M5 훅 무접촉.** §0 분기 표가 exporting을 분기 ①②③ 적용 status로, awaiting-user를 공통 가드 통과로 이미 규정(pptxx (h) green). 따라서 M5는 status 소비 프로즈(SKILL.md)만 추가하고 stop-gate/deck-gate 코드는 건드리지 않는다 — exporting-status 정지 시나리오 신규 테스트는 **out of scope**(M2 소유; 추가 시 append-only지만 밀스톤이 요구하지 않아 미포함).
6. **거부 부정 케이스는 별도 python 명령·README 기록 — 스위트 미배선.** gates.test.js는 거부를 실행하지 않는다(zero-dep). 거부는 `python md2pptx.py <bad-fixture>` nonzero exit로 수동 재현·README 1건 기록(C-3 #5).

---

## File Structure Mapping

| Action | File | Anchor |
|---|---|---|
| Create | `skills/pptxx/scripts/md2pptx.py` | `planning/spikes/pptx/md2pptx-spike.py` 경화(C-1·C-2·C-3·C-4) — deck-dir CLI·경로 제한·도식 정책 |
| Modify | `skills/pptxx/SKILL.md` | Process에 awaiting-user 절(C-5)·exporting 절(C-6) 삽입; 마커·터미널·Anti-Patterns(C-7) |
| Modify | `tests/gates.test.js` | (s2) `M3_MARKERS` 배열 인플레이스(:634) +2 원소·주석; (z1–z3) `process.exit`(:741) 앞 append |
| Modify | `planning/spikes/pptx/README.md` | 거부 부정 케이스 1건 기록(C-3 #5) |
| Modify | `planning/spikes/pptx/readback.py` (또는 병설 `m5-fixture.py`) | 2런 하니스로 확장(C-1·C-4·C-9 #3) — 런타임/수동 검증, 스위트 미참조 |

Task 1(md2pptx.py) → Task 2·3(픽스처·README, md2pptx.py에 의존). Task 4·5(SKILL.md) 순차. Task 6(마커 인플레이스) ← SKILL.md 마커 존재. Task 7·8(경계 append) ← md2pptx.py 존재. Task 9 회귀.

---

## Tasks

### Task 1: `skills/pptxx/scripts/md2pptx.py` 신설 (스파이크 경화)
> ✔ 완료 — deck-dir CLI·C-3 경로제한(절대/드라이브/URL/`..`/비이미지 모두 exit 3)·C-4 도식정책·tokens best-effort. 6개 거부 케이스 + 정상 참조 실측.

**Files:** Create `skills/pptxx/scripts/md2pptx.py`
**Dependencies:** None

C-1 CLI 계약 + C-2 파싱 + C-3 경로 제한 + C-4 도식 정책으로 `md2pptx-spike.py`를 경화. deck-dir 인자화(하드코딩 HERE 제거), shots 해석을 `<deck-dir>/shots/slide-<NN>.png`로, tokens best-effort, 경로 제한 거부.

**Acceptance:**
- [x] `python md2pptx.py <deck-dir> [<tokens.json>]` 계약: `<deck-dir>/slides.md` 파스 → `<deck-dir>/<basename>.pptx` 생성, exit 0 + 슬라이드 수 stdout
- [x] M4-시대 포맷 전 구성요소 파싱: 제목/본문(불릿 2단)/`![alt](images/…)`+`> attribution:`/`` ```diagram ``(첫 줄 `slide: NN`)/`---`/`> notes:` (C-2)
- [x] 도식: `<deck-dir>/shots/slide-<NN>.png` 존재 → picture **정확 1**; 부재 → 제목만+설명 노트 강등(**비어있지 않은 노트**)+picture **0** (C-4)
- [x] 경로 제한(C-3): 이미지·shots 참조는 `<deck-dir>` 서브트리(포함 `shots/`)만 해석; 절대·`file://`·`http(s)`·`..`·비이미지 확장자 → **exit ≠ 0 + 거부 메시지**
- [x] tokens 미지정/부재/파스실패 → 기본 스타일 best-effort로 **exit 0**(크래시 금지)
- [x] hooks/tests 미참조(런타임 전용): 어떤 훅·테스트도 이 파일을 import/require/spawn하지 않음(구조적)

### Task 2: 2런 수용 픽스처 하니스 (readback.py 확장 / 병설 드라이버)
> ✔ 완료 — readback.py 확장(스코프락 준수: 병설 파일 대신 명명 파일 확장). tempdir deck, run(a) picture 1 / run(b) picture 0+비어있지않은 노트, 전 제목 일치, exit 0 (M5 FIXTURE PASS).

**Files:** `planning/spikes/pptx/readback.py`(확장) 또는 신설 `planning/spikes/pptx/m5-fixture.py`
**Dependencies:** Task 1

C-9 #3대로 `tempfile.mkdtemp()`(또는 `spikes/pptx/` 하위) deck에 M4-시대 slides.md(이미지+출처 지시어 + 도식 슬라이드 `slide: 01`) 스테이징. run(a): `shots/slide-01.png`(Pillow 생성) 존재 → md2pptx.py → readback 도식 슬라이드 picture 1 단정. run(b): shots 제거 → md2pptx.py → 도식 슬라이드 picture 0 + 비어있지 않은 노트 단정. 두 런 전 제목 일치·exit 0. **실제 `docs/glm-hammer/decks/` 미사용**(HAZARD).

**Acceptance:**
- [x] run(a) shots 존재 → 도식 슬라이드 picture-shape **정확 1**, 전 슬라이드 제목 일치, exit 0
- [x] run(b) shots 부재 → 도식 슬라이드 **제목 + 비어있지 않은 발표자 노트 + picture 0**, 전 제목 일치, exit 0
- [x] 픽스처 deck은 `tempfile.mkdtemp()` 또는 `spikes/pptx/` 하위 — `docs/glm-hammer/decks/` 미생성
- [x] 생성 바이너리(shots PNG·pptx)는 tmpdir 또는 재생성 산출물 — 트리 비커밋(M1 규율)
- [x] **스위트 미배선:** 이 python 하니스는 `tests/gates.test.js`에서 실행·import되지 않음

### Task 3: 거부 부정 케이스 README 기록
> ✔ 완료 — README에 M5 컨버터 진입점·경로 allowlist·거부 케이스 표(6종, `../evil.png`→exit 3 동결)·pip 안내 추가.

**Files:** `planning/spikes/pptx/README.md`
**Dependencies:** Task 1

C-3 #5 거부 케이스 1건을 `python md2pptx.py <bad-fixture>` nonzero exit로 재현하고 README에 기록(참조 문자열·거부 사유·exit code). 예: `![x](../evil.png)`(상위 이탈) 또는 절대/비이미지 등가 케이스.

**Acceptance:**
- [x] README에 거부 부정 케이스 1건: 참조 예(`..`/절대/비이미지)·거부 메시지·nonzero exit 명시
- [x] 경로 allowlist = deck 디렉토리(포함 `shots/`) 규칙과 M5 md2pptx.py 진입점 설명 추가
- [x] python-pptx 1.0.2·Pillow 12.2.0 기설치·엔드유저 `pip install python-pptx` 안내 언급(M1 환경 표 인접)

### Task 4: SKILL.md — awaiting-user 옵트인 + exporting phase 삽입
> ✔ 완료 — Phase A(awaiting-user, 옵트인 only·공통가드 통과·거부→done)·Phase X(exporting, md2pptx.py 실행·pip 안내·Python부재 HTML 폴백·경로제한) 삽입. 마커 2종 정확 등장.

**Files:** `skills/pptxx/SKILL.md`
**Dependencies:** None (테스트와 서로소; 논리상 Task 1과 짝)

C-5·C-6대로 Process의 터미널 직전에 **⟨state: awaiting-user⟩**(옵트인 질문·기본 생성 없음·공통 가드 통과)와 **⟨state: exporting⟩**(md2pptx.py 실행·`pip install python-pptx`·Python 부재 HTML 폴백·경로 제한 준수) 절을 신설.

**Acceptance:**
- [x] `⟨state: awaiting-user⟩` 절: deck 완성 후 PPTX 추출 **옵트인 질문**, **기본 생성 없음**(명시 동의만), 거부/무응답 → `done`(HTML 종료)
- [x] `⟨state: exporting⟩` 절: `skills/pptxx/scripts/md2pptx.py <deck-dir>` 실행 서술; `pip install python-pptx` 안내; **Python/python-pptx 부재 → HTML deck으로 종료** 폴백
- [x] awaiting-user가 §0 공통 가드 통과(방치 아님)임을 서술; exporting이 분기 ① 봉인·build.md 요건 유지 하에 진행됨을 서술(게이트 무접촉)
- [x] `⟨state: awaiting-user⟩`·`⟨state: exporting⟩` 마커 문자열 정확 등장(s2 단정 대상)

### Task 5: SKILL.md — 마커·터미널·Anti-Patterns 갱신
> ✔ 완료 — 터미널 `building → [visual-qa] → awaiting-user →(동의)→ exporting → done`(+거부/Python부재 분기). Anti-Patterns +4행. status JSON 라인 §0 바이트 무수정(s1 green).

**Files:** `skills/pptxx/SKILL.md`
**Dependencies:** Task 4

C-7대로 터미널 흐름을 `building → [visual-qa] → awaiting-user →(동의)→ exporting → done`으로 확장 서술, Anti-Patterns에 M5 행 추가. **State Protocol JSON `"status"` 라인은 §0 verbatim 무수정**(이미 8종 — s1 안전).

**Acceptance:**
- [x] 터미널 절이 `building → [visual-qa] → awaiting-user → exporting → done`(+거부/Python부재 폴백 분기) 서술; hybrid-done 재검증 유지
- [x] Anti-Patterns 신규 행 ≥3: 기본 pptx 생성(옵트인 위반)·md2pptx.py 훅/테스트 import(zero-dep 오염)·deck 밖 이미지 참조(경로 제한 거부)·python-pptx 부재 강행(HTML 폴백)
- [x] State Protocol fenced JSON `"status"` 라인 §0 바이트 일치(무수정) — s1 green 유지
- [x] Hard Gate 7(대기 시 awaiting-user·포기 시 done — 방치 금지)과 정합; 마커 8종 전부 등장

### Task 6: 테스트 — 마커 시대 상수 인플레이스 확장 (s2 += awaiting-user·exporting)
> ✔ 완료 — `M3_MARKERS` = 8종 풀셋, 주석 M5 갱신. s2가 +2 check(awaiting-user·exporting) 생성·ok. 유일 인플레이스 편집.

**Files:** `tests/gates.test.js` (인플레이스)
**Dependencies:** Tasks 4–5 (SKILL.md 마커 존재)

C-8 (A): `M3_MARKERS` 배열에 `'awaiting-user'`·`'exporting'` 2원소 추가(풀 8종), 주석 갱신. 그 외 s1·s3–s12·(a)–(p)·(r)·(t)·crucible·planKey 무수정.

**Acceptance:**
- [x] `M3_MARKERS` = 8종 풀셋 `['scripting','chaining','imaging','building','visual-qa','awaiting-user','exporting','done']`; 주석 M5 시대 갱신
- [x] 루프가 `pptxx (s2) marker ⟨state: awaiting-user⟩ present`·`… exporting present` +2 check 생성·ok; 기존 6개 마커 check 무변경 green
- [x] s1(status set-equal 8종)·s3(coverage)·s4–s12·(a)–(p)·(r0–r4)·(t1–t8)·crucible·planKey 바이트 무수정 green
- [x] 이 배열 확장이 **유일한 인플레이스 편집**(§0 드리프트 규칙 예외)

### Task 7: 테스트 — zero-dep 경계 grep (z1) append
> ✔ 완료 — 프래그먼트 조립 RegExp로 hooks/+tests/ 재귀 판독 0-match, ok. 자기-매치 없음(순수-Node fs.readFileSync). 셸 등가 grep도 0 확인.

**Files:** `tests/gates.test.js` (append)
**Dependencies:** Task 1

C-8 (B) z1: `hooks/`·`tests/` 재귀 판독 + **프래그먼트 조립** RegExp(`python-pptx`·`import pptx`·`spawn(Sync)?\((python|py`)로 0-match 단정. 자기-매치 방지(C-7 제약).

**Acceptance:**
- [x] `pptxx (z1) zero-dep boundary …` = hooks/+tests/ 전 `.js`/`.json`에서 프래그먼트 조립 패턴 **0 matches** → ok
- [x] 패턴을 연속 리터럴이 아닌 프래그먼트(`'python'+'-pptx'` 등)로 조립 — 테스트 파일 자기-매치 없음
- [x] 순수-Node `fs.readFileSync` 판독 — md2pptx.py를 require/spawn하지 않음
- [x] 셸 등가 명령 `grep -rE "python-pptx|import pptx|spawn(Sync)?\(['\"](python|py)" hooks/ tests/` = 0 (수동 대조 문서화)

### Task 8: 테스트 — md2pptx.py 존재 + not-require (z2·z3) append
> ✔ 완료 — z2(존재) ok, z3(`require([^)]*md2pptx` 0-match) ok. 둘 다 순수-Node, 컨버터 미실행.

**Files:** `tests/gates.test.js` (append)
**Dependencies:** Task 1

C-8 (B) z2·z3: md2pptx.py 존재 확인 + `require\([^)]*md2pptx` 문맥 0-match(프래그먼트 조립).

**Acceptance:**
- [x] `pptxx (z2) md2pptx.py exists` = `skills/pptxx/scripts/md2pptx.py` 존재 → ok
- [x] `pptxx (z3) md2pptx.py is never require()'d …` = hooks/+tests/ 전 `.js`에서 `require\([^)]*md2pptx` **0 matches** → ok(존재-확인 경로 리터럴은 require 문맥 아니라 비매치)
- [x] 두 check 모두 순수-Node — md2pptx.py 실행/import 없음

### Task 9: 전체 회귀 + 2런 픽스처 + 스코프 확정
> ✔ 완료 — `node tests/gates.test.js` exit 0, **114 ok / 0 FAIL**. 2런 픽스처 exit 0. 거부 케이스 exit 3. 프로즌 grep 0-match. out-of-scope 파일 내 기여 0(304줄은 전부 기존 uncommitted M1–M4).

**Files:** 없음 (읽기 전용 검증)
**Dependencies:** Tasks 1–8

**Acceptance:**
- [x] `node tests/gates.test.js` **exit 0** — 기존 109 green 유지 + s2 +2 마커 + z1–z3 → **≈112–114 ok / 0 FAIL**
- [x] **2런 python 픽스처 exit 0**(run a picture 1 / run b picture 0+노트) — 별도 명령, 스위트 미배선
- [x] **거부 부정 케이스 nonzero exit** 재현 + README 기록 확인
- [x] zero-dep grep `grep -rE "python-pptx|import pptx|spawn(Sync)?\(['\"](python|py)" hooks/ tests/` = **0 matches**
- [x] `git diff --stat`: `skills/pptxx/SKILL.md`·`tests/gates.test.js` modified + `skills/pptxx/scripts/md2pptx.py` untracked + spikes(README/픽스처); `git diff -- hooks/ agents/ skills/crucible/ .zcode-plugin/ .claude-plugin/` **0줄**
- [x] s1·s3–s12·(a)–(p)·(r)·(t)·crucible·planKey 기존 단정 바이트 무수정 green

---

## 마일스톤 성공 기준 → 착지 지점 대조표

review-work는 이 표로 기계 대조한다.

| 마일스톤 체크박스 | 착지 지점 | Task |
|---|---|---|
| md2pptx.py 존재(런타임 전용, hooks/tests 미참조) + 2런(shots→picture 1 / 부재→제목+노트+picture 0) + 전 제목·exit 0 | C-1·C-2·C-4 + 2런 하니스 + (z2)(z3) | 1, 2, 8 |
| 경로 제한(deck 디렉토리·shots/ 내부만; 절대·`..`·비이미지 거부) + 거부 부정 케이스 1건 README | C-3 + README 기록 | 1, 3 |
| SKILL.md: awaiting-user 옵트인(기본 생성 없음)→exporting; pip 안내+Python 부재 HTML 폴백; 마커 += {awaiting-user, exporting} | C-5·C-6·C-7 + (s2) | 4, 5, 6 |
| 스위트 기존 단정 무수정 통과(마커 상수 확장 제외) + zero-dep grep 0건 | (s2) 인플레이스 + (z1) + 회귀 | 6, 7, 9 |
| (조건부) M1 스파이크 실패 시 취소/유지 사용자 결정 | **미적용** — M1 pptx integration 성공(에스컬레이션 미발동) → M5 진행 확정 | — |

## Plan Notes

- **⚠ 실행 환경 주의 — 이 저장소 자신의 glm-hammer 훅이 활성이다.** Write/Edit는 PostToolUse 훅을 발화시키나 경로 필터로 무해: **deck-gate 경로 필터 `/docs\/glm-hammer\/decks\/[^/]+\/([^/]+)$/i`는 `skills/pptxx/SKILL.md`·`skills/pptxx/scripts/md2pptx.py`·`tests/gates.test.js`·`planning/spikes/…` 어느 것도 매치하지 않아 즉시 exit 0.** plan-gate는 `docs/glm-hammer/plans/` 전용(본 계획 파일은 `docs/engineering-discipline/plans/` — 비추적). **절대 실제 `docs/glm-hammer/decks/` 콘텐츠를 만들지 말 것** — 2런 픽스처 deck은 `tempfile.mkdtemp()`/`spikes/pptx/` 하위에서만. repo cwd로 python spawn하면 state 오염 금지(픽스처는 tmpdir cwd).
- **zero-dependency 불변식이 M5의 핵심 계약.** md2pptx.py는 python-pptx·Pillow를 import하지만 **`skills/` 하위**라 zero-dep grep(`hooks/`·`tests/` 스코프)의 대상이 아니다. 스위트는 md2pptx.py를 **존재·not-require로만** 검사 — 절대 import/spawn하지 않아 `node tests/gates.test.js`가 python 없이도 순수-Node로 완주한다. 2런 실행 검증은 **별도 python 명령**(수동/M_final 라이브 체크).
- **게이트 무접촉 재확인:** exporting은 §0 분기 표에서 분기 ①②③ 적용 status, awaiting-user는 공통 가드 통과(pptxx (h) green) — **M2에서 이미 게이트 지원 완비.** M5는 SKILL.md 프로즈(status 소비)·md2pptx.py·테스트 경계만. 이것이 M5가 훅 회귀 리스크 없이 착지하는 이유.
- **자기-매치 해저드(C-7 제약 #7)가 z1/z3의 유일한 함정.** 패턴을 연속 리터럴로 쓰면 `tests/gates.test.js` 자신이 매치되어 grep 0-match가 깨진다 → 프래그먼트 조립 필수. `md2pptx` 바 grep도 존재-확인 경로 리터럴에 걸리므로 z3는 `require(` 문맥 한정.
- **단정 수 ~112는 정보성 앵커** — check 통합/분리로 ±될 수 있으나, "기존 109 무수정 green + s2 +2 마커 + 경계 z1–z3 green + exit 0 + git diff 스코프 준수 + 2런 python 픽스처 exit 0"이 구속 기준이다.
- **format 동결 해석 6건(C-9)** — md2pptx.py CLI 시그니처·tokens best-effort·2런 단일 도식 슬라이드·not-require 판정 문맥·게이트 M2 완비·거부 케이스 스위트 미배선 — §0 미명시 지점을 본 계획이 동결. 리뷰어는 이 6건을 플래그로 검토.
