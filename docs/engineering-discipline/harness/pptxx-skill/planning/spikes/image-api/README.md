# Spike: 이미지 API 메타데이터 쿼리 (Openverse / Wikimedia Commons, keyless)

## Environment

Probed 2026-07-07 (Task 0, PowerShell):

| Command | Output |
|---|---|
| `python --version` | `Python 3.14.6` |
| `pip --version` | `pip 26.1.2 from C:\Python314\Lib\site-packages\pip (python 3.14)` |
| `node --version` | `v24.18.0` |
| `npx playwright --version` | `Version 1.61.1` |

## Queries

요청 헤더(두 요청 공통): `User-Agent: glm-hammer-pptxx-spike/0.1 (contact: dev0jsh@gmail.com)` (`curl -A`).

### Openverse (2026-07-07, HTTP 200)

```
GET https://api.openverse.org/v1/images/?q=mountain&license=cc0,pdm&mature=false&page_size=5
```

결과 5건 → `openverse-sample.json`으로 정규화 저장(필드: license, creator, source_url=foreign_landing_url, image_url, width/height, provider).

### Wikimedia Commons (2026-07-07, HTTP 200)

1차 시도(플랜 템플릿 그대로):

```
GET https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=filetype:bitmap+haslicense:cc0+mountain&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1024
```

→ 응답 경고: `"haslicense keyword contains no valid arguments"` — **`haslicense:` CirrusSearch 키워드 미지원 확인.** 플랜의 폴백 채택: `gsrsearch`에서 `haslicense:cc0` 제거 + `gsrlimit=20`으로 확대 후 **클라이언트 측 필터링** — `extmetadata.LicenseShortName`이 `/^(CC0|Public domain)/i` 매치하는 건만 채택.

2차 시도(채택 쿼리):

```
GET https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=filetype:bitmap+mountain&gsrnamespace=6&gsrlimit=20&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1024
```

→ 20건 중 클라이언트 필터 통과 3건(Public domain) → `wikimedia-sample.json`으로 정규화 저장(매핑: `extmetadata.LicenseShortName`→license, `extmetadata.Artist`(HTML 태그 제거)→creator, `imageinfo.descriptionurl`→source_url).

## Rate Limits

- **api.openverse.org** 관측 응답 헤더:
  - `X-Ratelimit-Limit-Anon_burst: 20/min` / `X-Ratelimit-Available-Anon_burst: 19`
  - `X-Ratelimit-Limit-Anon_sustained: 200/day` / `X-Ratelimit-Available-Anon_sustained: 199`
- **commons.wikimedia.org**: rate-limit 응답 헤더 **없음** (응답 헤더 전수 grep — `ratelimit`/`retry-after` 계열 0건).

## Download Verification

다운로드 명령(동결 플래그, API별 1건):

```
curl --proto '=https' --proto-redir '=https' --max-redirs 3 -sS \
  -A "glm-hammer-pptxx-spike/0.1 (contact: dev0jsh@gmail.com)" \
  -o <tmpfile> --max-filesize 5242880 -w "%{content_type} %{size_download} %{url_effective}" <url>
```

치수 확인 방법: Python Pillow 12.2.0 — `PIL.Image.open(f).size`.

### Openverse 건 (license: cc0, creator: U.S. Geological Survey)

| 항목 | 값 |
|---|---|
| 최종 URL | `https://live.staticflickr.com/5550/13974169513_5e21ce9b9a.jpg` |
| sha256 | `0e1a0a15ab701da1322e10892ac43aa16819f0fec61aafa707b4f43d17acbb71` |
| 치수 | 500x339 (JPEG) |
| Content-Type | `image/jpeg` |
| 바이트 크기 | 68,726 B (≤5MB) |

### Wikimedia Commons 건 (license: Public domain, creator: NASA — File:Himalayas.jpg 1280px 썸네일)

| 항목 | 값 |
|---|---|
| 최종 URL | `https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Himalayas.jpg/1280px-Himalayas.jpg` |
| sha256 | `b3701dcccc9d2f7f49c20cb9d174c5c8a095585626dbc85928150858e8f5ac9c` |
| 치수 | 1280x843 (JPEG) |
| Content-Type | `image/jpeg` |
| 바이트 크기 | 313,493 B (≤5MB) |

두 바이너리 모두 기록 직후 scratchpad에서 **삭제 완료** — spikes/ 및 repo에 이미지 바이트 없음, git 커밋 없음.
