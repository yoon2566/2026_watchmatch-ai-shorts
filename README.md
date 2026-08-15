# WatchMatch Sites demo

세 번의 선택만으로 영화 또는 TV 작품 세 편을 추천하고, 선택한 작품의 쇼츠
제작 흐름을 체험하는 WatchMatch 웹앱입니다.

## 현재 개편 방향

앱은 소개 화면 없이 첫 선택부터 시작합니다.

1. `영화` 또는 `TV`
2. 장르 한 개
3. `고전`·`근래`·`최근`

시대를 누르면 별도의 검색 버튼 없이 작품 세 편이 표시됩니다. 작품은 앱에
포함된 일반 작품 카탈로그에서만 고르므로 실행 중 인터넷 검색이나 API 키가
필요하지 않습니다. 같은 조건으로 다시 추천하면 현재 브라우저 세션에서 아직
보지 않은 다른 세 편을 먼저 보여줍니다.

시대 구분은 `고전` 1999년까지, `근래` 2000~2019년, `최근` 2020년부터입니다.
추천 결과는 특정 OTT의 제공 여부를 의미하지 않으며, 실제 시청 가능 여부는 각
서비스에서 별도로 확인해야 합니다.

## 제공 범위

- 영화·TV → 단일 장르 → 시대의 3클릭 선택
- 정확히 세 편의 오프라인 작품 추천과 세션 단위 재추천
- 추천 카드의 명시적 사용자 선택
- 기존 영상 제작 진행 화면과 25초 기술 샘플 재생·다운로드
- 한국어 VTT 자막과 링크 공유용 소셜 카드

이 Sites 프로젝트는 사용자의 Windows GPU, ComfyUI, Heami, FFmpeg 또는 로컬
SQLite에 연결하지 않습니다. 새 Wan 영상 생성은 별도 로컬 프로젝트
`C:\Users\User\Desktop\채민\shorts-webapp`에서만 처리합니다.

## 외부 서비스 경계

- 추천 실행 시 OpenRouter, `web_search`, `web_fetch`, TMDB, JustWatch,
  Wikidata 또는 OTT 페이지를 호출하지 않습니다.
- 제목·연도·작품 유형은 개발 단계에서 Wikidata로 검증한 뒤 정적 카탈로그에
  저장합니다.
- 포스터·예고편·전체 줄거리·OTT 제공 여부는 저장하거나 표시하지 않습니다.
- 추천 기능은 `OPENROUTER_API_KEY` 없이 동작합니다.

## 로컬 개발과 배포

```powershell
npm.cmd run dev:local
```

로컬 확인 주소는 `http://localhost:3100`입니다. 검증된 변경은 GitHub 브랜치
`agent/simple-three-step-recommendations`에 푸시합니다. Sites 배포는 별도 요청이
있을 때만 수행합니다.

### 화면은 보이지만 버튼이 눌리지 않을 때

큰 소스 변경이나 Vinext 빌드 뒤에 오래 실행 중이던 개발 서버가 남아 있으면
화면 HTML만 보이고 브라우저 스크립트가 연결되지 않을 수 있습니다. 실행 중인
로컬 서버를 종료한 뒤 `npm.cmd run dev:local`을 다시 실행하고 페이지를 새로
고침합니다. 정상 상태에서는 영화/TV 버튼을 누르는 즉시 장르 화면으로
전환됩니다.

## 검증

```powershell
npm.cmd install
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd test
npm.cmd run catalog:verify
```

현재 카탈로그는 90편이며 60개 필터 조합마다 최소 6편을 갖습니다. Vinext
빌드와 11/11 테스트, Wikidata 90개 QID 검증, 첫 재추천 비중복, 로컬 홈·API
응답을 확인했습니다.

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
