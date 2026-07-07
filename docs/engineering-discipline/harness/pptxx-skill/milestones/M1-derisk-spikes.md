# Milestone: De-risk Spikes + 파이프라인 계약 문서

**ID:** M1
**Status:** pending
**Dependencies:** None (M2와 병렬)
**Risk:** High
**Effort:** Large

## Goal

두 계약 문서(슬라이드 md 포맷 스펙, deck HTML 스크린샷 주소화 컨벤션)를 무조건 저작하고, 세 외부 통합(Playwright 슬라이드별 스크린샷, Openverse/Wikimedia 메타데이터+다운로드, md+토큰→python-pptx)을 스파이크로 증명하며, 실패를 env/integration으로 분류해 에스컬레이션한다.

## Success Criteria

- [ ] **계약 문서(무조건 — 스파이크 성공과 무관):** `planning/spikes/pptx/format-spec.md` 존재 — 슬라이드 md 포맷 1페이지 스펙(제목/본문/이미지+출처 지시어/도식 블록/`---`) + 도식 export 정책(shots PNG 래스터 재사용, 부재 시 제목+발표자 노트 폴백); `planning/spikes/screenshot/README.md` 존재 — 주소화 컨벤션 + 스크린샷 출력 경로 `<deck>/shots/slide-NN.png` 명시
- [ ] **스크린샷:** ≥3슬라이드 하우스 스타일 샘플 deck에서 슬라이드별 캡처 `slide-01..03.png`(`javaScriptEnabled:false`+deny-by-default 요청 차단 필수, 명령 README 기록). 논스 센티널(알파벳 `A-HJ-NP-Z2-9`·6자·≥24px)이 `nonces.txt`(판독자 미제공)에 기록되고, 정보 격리 서브에이전트(PNG 경로만 전달, 디스패치 프롬프트 기록)의 최종 메시지가 `transcription.md`로 영속 — 파일 술어: transcription 값==논스 && `VERDICT: APPROVE` 라인 존재. 불일치 시 새 논스 1회 재시도 후 판정
- [ ] **이미지 API:** `openverse-sample.json`·`wikimedia-sample.json` 각 ≥3건 license·creator·source-URL 비어 있지 않음 + 쿼리 URL·요청 헤더(서술형 UA)·rate-limit 응답 헤더 기록(미관측 시 '없음' 명시). API당 1건 다운로드: `license=cc0|pdm`+`mature=false` 쿼리 한정, `curl --proto '=https' --proto-redir '=https' --max-redirs 3`, ≤5MB, `Content-Type: image/*`; 바이너리는 URL+sha256+치수를 README에 기록 후 삭제(git 커밋 금지)
- [ ] **PPTX:** README 명령 재실행으로 `sample-slides.md`(format-spec 전 구성요소 행사)+`validateTokens` 통과 토큰에서 `sample.pptx` 재생성; `readback.py`가 전 슬라이드 제목 일치 + 이미지 슬라이드 picture-shape>0 단정 후 exit 0
- [ ] **격리:** M1이 생성·수정한 파일 전부가 `planning/spikes/` 하위
- [ ] **에스컬레이션 규율:** README에 설치 명령·버전 기록; 실패 시 메시지가 env-setup vs integration 분류 — env 실패는 M1 일시정지(스코프 절단 금지); integration 실패는 state.md의 3개 에스컬레이션 지점 규칙 준수

## Files Affected

- Create: `docs/engineering-discipline/harness/pptxx-skill/planning/spikes/**` (screenshot/{sample-deck.html,slide-01..03.png,nonces.txt,transcription.md,verdict.md,README.md}, image-api/{openverse-sample.json,wikimedia-sample.json,README.md}, pptx/{format-spec.md,sample-slides.md,tokens.json,md2pptx-spike.py,readback.py,sample.pptx,README.md})
- Modify: 없음 (저장소 소스 무접촉; 다운로드 바이너리는 검증 후 삭제)

## User Value

리스크 소거·결정 정보 — 실패 시 통합 비용 0에서 설계 수정/축소를 결정할 실물 증거 + 하류 3개 마일스톤(M3/M4/M5)이 준수할 계약 문서.

## Abort Point

Yes — planning docs + 스파이크 산출물만(삭제 무해). 저장소 동작 불변.

## Notes

- 세 스파이크는 독립 판정 — 하나가 막혀도 나머지 진행, M2 비차단.
- 스파이크 실패의 자동 스코프 절단 금지: state.md 에스컬레이션 지점 참조.
- 논스 OCR 오독 방어: 모호 글리프 제외 알파벳 + 재시도 1회 + 에스컬레이션 메시지에 렌더 상태(캡처 실패 vs 전사 불일치) 명시.
