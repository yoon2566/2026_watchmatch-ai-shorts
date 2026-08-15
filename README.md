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

## 제공 범위

- 메인 → 취향 선택 → 작품 3개 선택 → 제작 중 → 영상 보기의 5단계 흐름
- OpenRouter 웹 검색으로 찾은 실제 영화·TV 작품 3개와 검증된 출처 링크
- 로컬 Wan·Heami·Remotion 파이프라인으로 검증한 25초 기술 샘플 재생·다운로드
- 한국어 VTT 자막과 링크 공유용 소셜 카드

Sites 배포본은 `OPENROUTER_API_KEY` 서버 비밀값으로 실제 작품을 검색합니다.
브라우저에는 키를 전달하지 않습니다. 새 Wan 영상 생성은 Windows 로컬 앱
`C:\Users\User\Desktop\채민\shorts-webapp`에서만 실행하며, Sites 배포본은
사용자 PC의 ComfyUI, Microsoft Heami, FFmpeg 또는 로컬 SQLite에 연결하지 않습니다.

## 로컬 우선 개발

Windows 사용자 환경변수 `3_openrouter`를 로컬 개발 서버 프로세스에만 연결해
`http://localhost:3100`에서 실행합니다. 키를 파일이나 로그에 복사하지 않습니다.

```powershell
npm.cmd run dev:local
```

화면과 실제 검색을 로컬에서 확인한 뒤, 승인된 최종본만 Sites에 배포합니다.

## 검증

```powershell
npm.cmd install
npm.cmd run lint
npm.cmd exec tsc -- --noEmit
npm.cmd test
```

`npm.cmd test`는 Vinext Sites 번들을 만들고 서버 렌더링 결과의 한국어 메타데이터,
공개 데모 표기, 절대 Open Graph 이미지 URL을 확인합니다.
