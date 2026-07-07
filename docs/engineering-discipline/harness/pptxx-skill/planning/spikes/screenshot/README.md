# Spike: Playwright 슬라이드별 스크린샷 캡처

## Environment

Probed 2026-07-07 (Task 0, PowerShell):

| Command | Output |
|---|---|
| `python --version` | `Python 3.14.6` |
| `pip --version` | `pip 26.1.2 from C:\Python314\Lib\site-packages\pip (python 3.14)` |
| `node --version` | `v24.18.0` |
| `npx playwright --version` | `Version 1.61.1` |

## Addressing Convention (contract — valid regardless of spike outcome)

1. **주소화 컨벤션:** deck HTML의 각 슬라이드는 `<section class="slide" id="slide-NN">` (NN = 01부터 zero-pad 2자리; 예: 첫 슬라이드 `id="slide-01"`). 뷰포트 고정 **1280×720**. 캡처는 요소 단위 — `page.locator('#slide-NN').screenshot()` (예: `page.locator('#slide-01').screenshot()`) — 스크롤 좌표 의존 금지.
2. **출력 경로 (동결):** `<deck>/shots/slide-NN.png` (NN = 01부터 zero-pad 2자리).
3. **필수 실행 조건 (동결 — 옵션 아님):**
   - `javaScriptEnabled: false` — 컨텍스트 생성 시 항상 적용.
   - **deny-by-default 요청 차단** — `context.route('**/*', ...)`에서 대상 deck 파일 자신(`file://` 로컬)만 `route.continue()`, 그 외 모든 요청은 `route.abort()`. 이 두 조건은 옵션이 아니라 필수 실행 조건이다.

논스 센티널 규격: 알파벳 `A-HJ-NP-Z2-9` (I·O·0·1 제외), 6자, 렌더 크기 ≥24px 모노스페이스 고대비.

## Capture Command

Playwright는 전역 설치본(playwright@1.61.1, `C:\Users\tmdgu\AppData\Roaming\npm\node_modules`)을 사용 — 신규 설치 불필요, chromium 바이너리(chromium-1228) 기존재. repo 파일(package.json 등) 무수정.

실행한 정확한 명령 (Git Bash, cwd = `spikes/screenshot/`):

```
NODE_PATH="C:\\Users\\tmdgu\\AppData\\Roaming\\npm\\node_modules" node capture.cjs
```

스크립트: `capture.cjs` — `chromium.launch()` → `newContext({ javaScriptEnabled: false, viewport: {width:1280, height:720} })` → `context.route('**/*', ...)` deny-by-default(sample-deck.html file:// URL만 continue, 그 외 abort) → `page.goto(file://.../sample-deck.html)` → `page.locator('#slide-NN').screenshot({ path: 'slide-NN.png' })` (NN = 01..03).

결과: `slide-01.png` (50,626 B), `slide-02.png` (49,646 B), `slide-03.png` (48,912 B) — 전부 >1KB, exit 0.

## Dispatch Prompt

정보 격리 서브에이전트(general-purpose)에 전달한 프롬프트 전문 — PNG 절대 경로 3개 외에 deck HTML·nonces.txt·플랜·논스 알파벳 힌트 일절 미포함:

```
Look at these three PNG images:

1. C:\Users\tmdgu\glm-hammer\docs\engineering-discipline\harness\pptxx-skill\planning\spikes\screenshot\slide-01.png
2. C:\Users\tmdgu\glm-hammer\docs\engineering-discipline\harness\pptxx-skill\planning\spikes\screenshot\slide-02.png
3. C:\Users\tmdgu\glm-hammer\docs\engineering-discipline\harness\pptxx-skill\planning\spikes\screenshot\slide-03.png

For each image, transcribe the 6-character code you see and the geometric shape shown. Output exactly one line per image in this format:

slide-NN: <code> / <shape>

Then, if you could clearly and unambiguously read a 6-character code in every image, output a final line `VERDICT: APPROVE`; if any code was unreadable or ambiguous, output `VERDICT: REJECT`.
```

## Verdict

`verdict.md` 참조 — 전사 3/3 논스 완전 일치 + 도형 3/3 일치, 1차 시도 성공.

**VERDICT: APPROVE**
