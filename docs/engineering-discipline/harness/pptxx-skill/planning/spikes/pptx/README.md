# Spike: md + tokens → python-pptx → readback

## Environment

Probed 2026-07-07 (Task 0, PowerShell):

| Command | Output |
|---|---|
| `python --version` | `Python 3.14.6` |
| `pip --version` | `pip 26.1.2 from C:\Python314\Lib\site-packages\pip (python 3.14)` |
| `node --version` | `v24.18.0` |
| `npx playwright --version` | `Version 1.61.1` |

## python-pptx Install

기설치 확인 — 신규 설치 불필요:

- `python -c "import pptx; print(pptx.__version__)"` → `1.0.2`
- Pillow 동반 확인: `python -c "import PIL; print(PIL.__version__)"` → `12.2.0`

## tokens.json Validation

repo 루트에서 (읽기 전용 require):

```
node -e "const r=require('./hooks/scripts/token-lib.js').validateTokens('docs/engineering-discipline/harness/pptxx-skill/planning/spikes/pptx/tokens.json'); console.log(JSON.stringify(r)); process.exit(r.ok?0:1)"
```

→ `{"ok":true,"problems":[]}`, exit 0.

## Regeneration Command

cwd = `spikes/pptx/`:

```
python md2pptx-spike.py && python readback.py
```

- `md2pptx-spike.py`: sample-slides.md 파스 + tokens.json 적용(서피스/텍스트/액센트 색, 폰트 패밀리·크기) → `sample.pptx` 4슬라이드 생성. 이미지 슬라이드는 Pillow로 생성한 로컬 placeholder(`images/placeholder.png`, 단색 320×320) picture shape 삽입; diagram-with-shot는 Task 4 산출물(`../screenshot/slide-01.png`)을 shots 래스터로 재사용 삽입; diagram-without-shot(slide: 99, 래스터 부재)는 제목만 + 설명을 발표자 노트로 강등(폴백).
- `readback.py`: sample.pptx 재개방 → 전 슬라이드 제목 == sample-slides.md `#` 제목 단정, 이미지·diagram-with-shot 슬라이드 picture ≥1 단정, 폴백 슬라이드 picture 0 + 노트 강등 단정 → `READBACK PASS`, exit 0.

실행 결과: exit 0 (READBACK PASS).

참고: `images/placeholder.png`는 빌드 시 `md2pptx-spike.py`의 `ensure_placeholder()`가 매번 재생성하는 산출물이라 트리에 남기지 않는다(이미지 바이너리 비커밋 규율). sample.pptx에는 임베드되어 있다.

## M5 런타임 컨버터 — `skills/pptxx/scripts/md2pptx.py`

M5는 이 스파이크(`md2pptx-spike.py`)를 경화한 **런타임 전용** 컨버터를 `skills/pptxx/scripts/md2pptx.py`에 착지시킨다(hooks/tests 미참조 — `node tests/gates.test.js`는 이 파일을 import/require/spawn하지 않고 존재·zero-dep 경계만 검사).

### 진입점 (CLI)

```
python skills/pptxx/scripts/md2pptx.py <deck-dir> [<tokens.json>]
```

- `<deck-dir>/slides.md`(M4-시대 format-spec 문법)를 파스 → `<deck-dir>/<basename>.pptx` 생성, exit 0 + 슬라이드 수 stdout.
- `<tokens.json>` 인자 선택 — 미지정 시 `<deck-dir>/tokens.json` 시도, 부재/파스실패 시 **기본 스타일 best-effort로 exit 0**(크래시 없음).
- 도식 export 정책: `<deck-dir>/shots/slide-<NN>.png` 존재 → picture-shape 정확 1개; 부재 → 제목만 + 설명을 발표자 노트로 강등(비어있지 않은 노트) + picture 0개.

### 경로 allowlist (path restriction)

이미지·shots 참조 해석은 **`<deck-dir>` 서브트리(포함 `<deck-dir>/shots/`) 내부로만** 제한된다. 다음은 즉시 거부(nonzero exit)한다:

- 절대 경로 (`/…`), 드라이브 문자 (`C:…`)
- URL/스킴 (`file://`, `http(s)://`)
- 상위 이탈 (`..`)
- 이미지 집합 `{png,jpg,jpeg,gif,webp,svg}` 밖의 확장자(비이미지 타입)

### 거부 부정 케이스 (재현 — exit ≠ 0)

임시 deck에 상위 이탈 참조를 담아 컨버터를 직접 호출:

```
python skills/pptxx/scripts/md2pptx.py <tmp-deck>     # slides.md 에 ![x](../evil.png)
```

| 참조 문자열 | 거부 메시지 (stderr) | exit code |
|---|---|---|
| `![x](../evil.png)` | `md2pptx: REFUSED: parent-escape ('..') image ref rejected: ../evil.png` | **3** |
| `![x](/etc/passwd.png)` | `md2pptx: REFUSED: absolute-path image ref rejected: /etc/passwd.png` | 3 |
| `![x](C:/Windows/evil.png)` | `md2pptx: REFUSED: absolute (drive-letter) image ref rejected: …` | 3 |
| `![x](file:///etc/passwd.png)` | `md2pptx: REFUSED: URL / scheme image ref rejected: …` | 3 |
| `![x](https://evil.example/x.png)` | `md2pptx: REFUSED: URL / scheme image ref rejected: …` | 3 |
| `![x](images/note.txt)` | `md2pptx: REFUSED: non-image type image ref rejected: images/note.txt` | 3 |

동결 부정 케이스(SC 2) = `![x](../evil.png)`(상위 이탈) → 거부, exit 3. 정상 `images/<file>.png` 참조는 거부되지 않는다(deck 서브트리 내부·이미지 확장자).

### 2런 수용 픽스처

`readback.py`가 M1 스파이크 readback에 더해 **M5 2런 수용 픽스처**를 실행한다(`tempfile.mkdtemp()` deck — 실제 `docs/glm-hammer/decks/` 미사용). run(a) `shots/slide-01.png` 존재 → 도식 슬라이드 picture 1; run(b) shots 제거 → picture 0 + 비어있지 않은 노트. 두 런 전 슬라이드 제목 일치·exit 0(`M5 FIXTURE PASS`). 생성 바이너리(image·shot PNG·pptx)는 tempdir에서만 살고 삭제된다.

### 의존성 (엔드유저)

컨버터는 python-pptx(및 Pillow)에 의존한다. 개발 환경은 M1대로 **기설치**(python-pptx 1.0.2 · Pillow 12.2.0 · Python 3.14.6 — 위 환경 표). 엔드유저 설치:

```
pip install python-pptx
```

python 또는 python-pptx가 없으면 pptx export를 생략하고 **HTML deck으로 종료**(SKILL.md exporting phase 폴백 — HTML 제품은 M4에서 완결).
