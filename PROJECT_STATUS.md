# WatchMatch project status

Last updated: 2026-08-17

## Repository and delivery

- GitHub: `https://github.com/yoon2566/2026_watchmatch-ai-shorts`
- Working branch: `agent/swapped-grok-pilot`
- Local project: `C:\Users\User\Desktop\채민\2_작품\shorts-webapp-sites`
- Local URL: `http://localhost:3100`
- Sites deployment is unchanged; this work is local and GitHub-only.

## Active product decision

WatchMatch now uses the successful Watchmode search approach proven in the
separate `C:\Users\User\Desktop\채민2` prototype. The bundled 90-work catalog
remains in repository history but is no longer used by the recommendation API.

```text
OTT -> movie/TV -> one genre
  -> Watchmode KR subscription search
  -> popularity-desc candidates with a 6.5 rating floor
  -> if fewer than three, retry without only the rating floor
  -> fetch up to three title details in Korean
  -> explicit work selection -> hosted video demonstration
```

Supported providers are Netflix, Watcha, Disney+, TVING, Wavve, and Prime
Video. Supported genres are action, comedy, drama, thriller, romance, science
fiction, fantasy, horror, mystery, and animation.

## Security and service boundaries

- The server reads `WATCHMODE_API_KEY` or the existing Windows user variable
  `4_WATCHMODE_API_KEY`; the value is not stored in source or sent to the browser.
- The Watchmode credential is sent only as an `X-API-Key` request header.
- Recommendation requests do not use OpenRouter, web search, web fetch, TMDB,
  or JustWatch.
- Watchmode availability may change. The UI instructs the user to confirm final
  availability in the selected OTT application.
- Watchmode work ID `1901214` is connected to the local-only Swapped pilot.
  The app confirms that the MP4 exists before enabling playback. Other works
  show `쇼츠 준비 중` and never fall back to a common sample.

## Verified live result

The local server returned HTTP 200. Watchmode reported KR enabled, all six
providers available, and all ten genres mapped. A live
`Netflix + movie + action` request returned three works:

1. `스파이더맨: 홈커밍 (2017)`
2. `스파이더맨: 파 프롬 홈 (2019)`
3. `스파이더맨: 뉴 유니버스 (2018)`

The rendered HTML contained no Watchmode credential names. Automated checks
cover request validation, KR/provider/media/genre query construction, header
authentication, rating-floor fallback, partial detail failure, explicit card
selection, and the existing playable video sample.

## Verification commands

```powershell
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd test
```

## Next step

Add more verified `work ID -> local MP4` entries, then replace the static local
mapping with a local project API when per-work generation is approved.

## Swapped Grok CLI pilot

A second standalone golden sample was completed for `뒤바뀐 친구들의 신비한
모험` (`Swapped`, 2026). Five original vertical Grok clips were assembled with
local Heami narration, synthetic effects, Remotion, and FFmpeg. The finished
MP4 is 1080x1920, 30 fps, 900 frames, 30.037 seconds, H.264/AAC, fully
decodable, and SHA-256 verified. The run used no OpenRouter service or key and
did not start a standalone preview server. Generated media remains local and
is not part of Git history.

The WatchMatch local app now maps this pilot to Watchmode ID `1901214`. A live
`Netflix + movie + animation` request returned the title as one of three
recommendations. The same-origin MP4 endpoint returned HTTP 200 for `HEAD` and
HTTP 206 for a byte-range request, while Git ignores the 36,082,137-byte file.
