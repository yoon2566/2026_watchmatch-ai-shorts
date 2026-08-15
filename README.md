# WatchMatch Sites demo

Sites에 배포하는 WatchMatch의 소유자 전용 호스팅 데모입니다.

## ChatGPT Pro 인수인계

새 ChatGPT Pro 대화에서 작업을 이어갈 때는 다음 문서를 순서대로 읽게 합니다.

1. [`AGENTS.md`](AGENTS.md)
2. [`PROJECT_STATUS.md`](PROJECT_STATUS.md)
3. [`docs/CHAT_CONTEXT.md`](docs/CHAT_CONTEXT.md)
4. [`docs/ENGINEERING_LOG.md`](docs/ENGINEERING_LOG.md)
5. [`docs/WORKLOG.md`](docs/WORKLOG.md)
6. [`docs/CHATGPT_PRO_HANDOFF.md`](docs/CHATGPT_PRO_HANDOFF.md)

대화 맥락은 개인정보와 비밀값을 제외한 구조화된 기록이며, 기술 변경과 검증
결과는 엔지니어링 로그와 누적 작업일지에 이어서 기록합니다.

검증된 변경은 GitHub에 바로 푸시하고, 사용자가 즉시 확인할 수 있도록 로컬
서버 `http://localhost:3100`의 응답을 확인한 뒤 주소를 함께 안내합니다. 이는
Sites 배포와 별개입니다.

## 제공 범위

- 메인 → 취향 선택 → 작품 3개 선택 → 제작 중 → 영상 보기의 5단계 흐름
- 최근 14일 안에 관리자가 직접 확인한 Netflix 대한민국 구독 작품만 추천
- OpenRouter는 검증 카탈로그 밖의 작품을 만들지 않고 허용된 ID의 순서만 결정
- 로컬 Wan·Heami·Remotion 파이프라인으로 검증한 25초 기술 샘플 재생·다운로드
- 한국어 VTT 자막과 링크 공유용 소셜 카드

추천 요청에는 웹 검색·웹 Fetch를 사용하지 않습니다. `OPENROUTER_API_KEY`는
서버에서 검증 후보의 순위를 정할 때만 사용하며, 실패하거나 비어 있어도
결정론적 추천으로 전환합니다. 브라우저에는 키를 전달하지 않습니다. 새 Wan 영상 생성은 Windows 로컬 앱
`C:\Users\User\Desktop\채민\shorts-webapp`에서만 실행하며, Sites 배포본은
사용자 PC의 ComfyUI, Microsoft Heami, FFmpeg 또는 로컬 SQLite에 연결하지 않습니다.

## 로컬 우선 개발

Windows 사용자 환경변수 `3_openrouter`를 로컬 개발 서버 프로세스에만 연결해
`http://localhost:3100`에서 실행합니다. 키를 파일이나 로그에 복사하지 않습니다.

```powershell
npm.cmd run dev:local
```

화면과 검증 카탈로그 동작을 로컬에서 확인한 뒤, 승인된 최종본만 Sites에 배포합니다.

## Netflix 수동 검증

- 승인 카탈로그: `data/ott-catalog/netflix-kr.json`
- 확인 대기 후보: `data/ott-catalog/netflix-kr.review.json`
- 사용자 확인 양식: `docs/NETFLIX_REVIEW_FORM.md`

확인 대기 후보는 추천에 절대 노출되지 않습니다. 사용자가 Netflix 대한민국에서
현재 재생 가능·구독 포함·청소년 관람가임을 확인한 뒤에만 승인 카탈로그로 이동합니다.

## 검증

```powershell
npm.cmd install
npm.cmd run lint
npm.cmd exec tsc -- --noEmit
npm.cmd test
```

`npm.cmd test`는 Vinext Sites 번들을 만들고 서버 렌더링 결과의 한국어 메타데이터,
공개 데모 표기, 절대 Open Graph 이미지 URL을 확인합니다.
