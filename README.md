# WatchMatch Sites demo

OTT·영화/TV·장르를 세 번 선택하면 Watchmode 대한민국 구독형 데이터에서
실제 작품을 검색해 최대 세 편을 추천하고, 선택한 작품의 쇼츠 제작 흐름을
체험하는 WatchMatch 웹앱입니다.

## 현재 추천 흐름

1. 넷플릭스·왓챠·디즈니+·티빙·웨이브·프라임 비디오 중 하나를 선택합니다.
2. 영화 또는 TV 시리즈를 선택합니다.
3. 장르를 선택하면 실제 작품 검색이 자동으로 시작됩니다.
4. 평점·인기도와 함께 표시된 작품 중 하나를 선택합니다.
5. 영상 단계는 현재 검증된 기술 샘플을 보여줍니다. 작품별 Grok 생성 연결은 후속 범위입니다.

이 Sites 프로젝트는 사용자의 Windows GPU, ComfyUI, Heami, FFmpeg 또는 로컬
SQLite에 연결하지 않습니다. 새 Wan 영상 생성은 별도 로컬 프로젝트
`C:\Users\User\Desktop\채민\shorts-webapp`에서만 처리합니다.

## 외부 서비스 경계

- 검색에는 Watchmode API만 사용합니다.
- OpenRouter, `web_search`, `web_fetch`, TMDB, JustWatch를 사용하지 않습니다.
- 포스터·예고편·전체 줄거리는 저장하거나 표시하지 않습니다.
- Windows 사용자 환경 변수 `WATCHMODE_API_KEY` 또는 `4_WATCHMODE_API_KEY`를
  서버에서만 읽으며 브라우저·소스·Git에 저장하지 않습니다.

## 로컬 개발과 배포

```powershell
npm.cmd run dev:local
```

로컬 확인 주소는 `http://localhost:3100`입니다. 검증된 변경은 GitHub 브랜치
`agent/watchmode-live-search`에 푸시합니다. Sites 배포는 별도 요청이
있을 때만 수행합니다.

### 화면은 보이지만 버튼이 눌리지 않을 때

큰 소스 변경이나 Vinext 빌드 뒤에 오래 실행 중이던 개발 서버가 남아 있으면
화면 HTML만 보이고 브라우저 스크립트가 연결되지 않을 수 있습니다. 실행 중인
로컬 서버를 종료한 뒤 `npm.cmd run dev:local`을 다시 실행하고 페이지를 새로
고침합니다. 정상 상태에서는 OTT 버튼을 누르는 즉시 영화/TV 화면으로
전환됩니다.

## 검증

```powershell
npm.cmd install
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd test
```

## ChatGPT Pro 인수인계

새 ChatGPT Pro 대화에서 작업을 이어갈 때는 다음 문서를 순서대로 읽게 합니다.

1. [`AGENTS.md`](AGENTS.md)
2. [`PROJECT_STATUS.md`](PROJECT_STATUS.md)
3. [`docs/CHAT_CONTEXT.md`](docs/CHAT_CONTEXT.md)
4. [`docs/ENGINEERING_LOG.md`](docs/ENGINEERING_LOG.md)
5. [`docs/WORKLOG.md`](docs/WORKLOG.md)
6. [`docs/CHATGPT_PRO_HANDOFF.md`](docs/CHATGPT_PRO_HANDOFF.md)

대화 맥락은 비밀값과 개인정보를 제외한 기록입니다. 현재 검증된 구현은
`agent/simple-three-step-recommendations` 브랜치에 있습니다.
