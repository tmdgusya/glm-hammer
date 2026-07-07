# 슬라이드 md 포맷 스펙 (format-spec)

pptxx 파이프라인의 `slides.md` 저작 포맷. 1페이지 계약 — 모든 구성요소는 아래 정의대로만 표기한다.

## 1. 슬라이드 구분자

단독 줄 `---` (앞뒤 공백 없이 하이픈 3개만 있는 줄). 이 줄이 슬라이드 경계다. 파일 첫 슬라이드 앞에는 구분자를 두지 않는다.

## 2. 제목

슬라이드당 첫 `# <title>` 정확히 1개. `#` 헤딩이 슬라이드의 제목이며, 슬라이드당 2개 이상의 `#` 헤딩은 금지.

## 3. 본문

마크다운 문단 및 불릿. 불릿은 `-` 리스트만 사용하며 최대 2단 중첩(들여쓰기 2칸 단위)까지 허용.

```
- 1단 불릿
  - 2단 불릿 (최대 깊이)
```

## 4. 이미지 + 출처(attribution) 지시어

이미지는 `![alt](images/<file>)` 형식(deck-상대 포워드슬래시 경로). **직후 줄**에 attribution 인용 라인이 반드시 따라온다:

```
![alt text](images/photo1.jpg)
> attribution: <author> | <license> | <source-URL>
```

- 필드 순서 고정: author, license, source-URL. 구분자는 ` | ` 고정.
- 매니페스트 행 문법과의 필드 대응 (§0 동결):
  `| images/photo1.jpg | <sha256> | https://... | cc-by | <author> |`
  - `images/<file>` ↔ 매니페스트 1열 (deck-상대 경로)
  - `<source-URL>` ↔ 매니페스트 3열 (URL)
  - `<license>` ↔ 매니페스트 4열
  - `<author>` ↔ 매니페스트 5열
  - sha256(매니페스트 2열)은 md에 표기하지 않고 fetch 단계가 매니페스트에만 기록한다.

## 5. 도식(diagram) 블록

여는 줄이 **정확히** ` ```diagram `(펜스드 코드 블록, info string `diagram`)인 블록. 닫는 줄은 ` ``` `.

````
```diagram
slide: NN
<자유 텍스트 도식 설명>
```
````

- 블록 내부 첫 줄은 `slide: NN` — 래스터(`shots/slide-NN.png`)가 참조할 슬라이드 번호(NN = 01부터 zero-pad 2자리).
- 이후 줄은 자유 텍스트 설명.
- **단일 무결 마커 규칙:** 도식은 반드시 이 펜스(` ```diagram `)로만 표기한다. 변형 표기(`~~~diagram`, `diagram:`, ` ``` diagram `(공백 포함), 대문자 `DIAGRAM` 등)는 **금지**. M2 deck-gate가 `slides.md`에서 `^```diagram$`을 grep하여 `visualQa.required=true`를 무장하므로, 이 문자열 외의 표기는 게이트를 우회하게 되어 무결성을 깨뜨린다.

## 6. 발표자 노트 (선택)

슬라이드 말미에 `> notes:` 인용 라인:

```
> notes: 발표자에게만 보이는 노트 텍스트.
```

## 도식 export 정책

pptx 변환 시 도식 블록은 텍스트로 변환하지 않는다:

- **기본 경로:** 해당 슬라이드의 래스터 `shots/slide-NN.png`(블록의 `slide: NN`이 가리키는 파일)를 그림(picture shape)으로 재사용해 삽입한다.
- **폴백(fallback):** 해당 PNG가 부재하면 — 슬라이드 본문에는 제목만 남기고, 도식 설명 텍스트는 발표자 노트로 강등한다(제목 + notes 폴백). 도식 설명을 본문 텍스트로 승격하지 않는다.
