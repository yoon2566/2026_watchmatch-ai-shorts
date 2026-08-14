# WatchMatch Sites demo

Sites에 배포하는 WatchMatch의 소유자 전용 호스팅 데모입니다.

## 제공 범위

- 메인 → 취향 선택 → 작품 3개 선택 → 제작 중 → 영상 보기의 5단계 흐름
- 영화/TV 고정 추천 샘플과 출처 링크
- 로컬 Wan·Heami·Remotion 파이프라인으로 검증한 25초 기술 샘플 재생·다운로드
- 한국어 VTT 자막과 링크 공유용 소셜 카드

실제 OpenRouter 검색과 새 Wan 영상 생성은 Windows 로컬 앱
`C:\Users\User\Desktop\채민\shorts-webapp`에서만 실행합니다. Sites 배포본은
사용자 PC의 ComfyUI, Microsoft Heami, FFmpeg 또는 로컬 SQLite에 연결하지 않습니다.

## 검증

```powershell
npm.cmd install
npm.cmd run lint
npm.cmd exec tsc -- --noEmit
npm.cmd test
```

`npm.cmd test`는 Vinext Sites 번들을 만들고 서버 렌더링 결과의 한국어 메타데이터,
공개 데모 표기, 절대 Open Graph 이미지 URL을 확인합니다.
