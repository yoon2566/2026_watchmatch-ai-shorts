# WatchMatch engineering log

Last synchronized: 2026-08-17

## Repository scope

This repository contains the hosted WatchMatch prototype. It is related to, but distinct from, the Windows-only full generation project at `C:\Users\User\Desktop\채민\2_작품\shorts-webapp`.

The local full project and original media folders are not synchronized by this repository. Do not assume a cloud task can access those paths.

## Chronological work record

| Phase | Work completed | Verification or outcome |
|---|---|---|
| Scene experiment | Six supplied vertical images were tested as image-to-video sources through an authenticated Grok Imagine browser workflow. | Established that generation must be delegated to a real external model and that Codex should perform editing and validation. |
| Product definition | Reduced the app to two capabilities: work discovery and Shorts creation. | User rejected a plan-only answer and required an actual web application. |
| Local architecture | Designed and implemented the separate local Node/SQLite worker with OpenRouter, Wan 2.2, Heami, Remotion, and FFmpeg. | Local preflight and worker tests passed; original assets remained protected. |
| Golden sample | Generated three Wan scenes, Korean TTS, captions, and a final MP4. | 1080×1920, 30fps, 25.000s, H.264/AAC, full decode pass, SHA-256 `687019f7183c0ebfbcb65db926aafb394a810459afe5c0104c58131e11d3a24e`. |
| Five-screen UX | Separated the application into main, preferences, recommendation selection, production, and result screens. | User selection is required; no default first-card selection. The local full app previously passed 78 tests plus type, lint, build, browser restore, and video checks. |
| Sites adapter | Built a Vinext-compatible hosted version with the verified sample video and social metadata. | Sites build passed and the first hosted revision was deployed. |
| Expanded Sites video library | Exported all 16 completed Grok batch masters as fast-start 1080x1920 H.264/AAC playback files and mapped them to exact Watchmode IDs. | All 17 mapped videos including the Swapped pilot passed ftyp, stream, duration, caption, and full-decode checks; app lint, TypeScript, build, and tests passed before deployment. |
| Live discovery | Replaced the fixed recommendation list with `/api/recommendations` backed by OpenRouter web search. | Server-only key handling, one search cap, citation extraction, repair without search, and adult-rating tests were added. |
| Search reliability | Diagnosed repeated HTTP 502 responses after OpenRouter had already returned citations. | Root causes included candidate-count conflicts and strict evidence validation, not missing credentials. |
| Partial results | Raised candidate inspection to ten and decoupled search sources from verified recommendation cards. | Build, lint, TypeScript, and 14/14 contract tests passed. |
| URL-only citation preservation | Split displayable URL citations from content-bearing validation evidence. Added public-URL filtering, neutral excerpt fallback, and source-list component rendering. | Lint, TypeScript, Vinext build, and 18/18 tests passed. Six URL-only citations now return `200 + sources_only` without an unnecessary repair call; requests with no public display URL return 502. |
| Live thriller check | Sent one paid local request for `movie + 스릴러 + thrilling`. | HTTP 200 in 10.56s; ten KMDb citations; zero verified cards because rating citations did not identify the selected works strongly enough; UI now shows all sources. |
| GitHub baseline | Connected the local repository to `yoon2566/2026_watchmatch-ai-shorts`. | Private repository, `main` pushed at commit `eb3f006350f79375403a1a511a3eff76aefe6097`, local and remote SHA matched. |
| Manual Netflix catalog | Replaced live search with a human-verified Netflix KR catalog and 14-day availability records. | Phase one was verified, but the zero-approved-entry experience was too burdensome and is now superseded. |
| Three-click general catalog | Replaced OTT verification with movie/TV, one genre, and era choices backed by a 90-work offline catalog. | All 60 combinations contain at least six works; 11/11 tests, lint, TypeScript, Vinext build, Wikidata verification, and local home/API smoke checks passed on `agent/simple-three-step-recommendations`. |
| Watchmode live search | Replaced the offline recommendation route with the separately proven Watchmode KR subscription search. | Six providers and ten genres enabled; live Netflix/movie/action returned three real titles; server-only key, build, lint, TypeScript, and 6/6 tests passed on `agent/watchmode-live-search`. |
| Local work-video binding | Bound Watchmode ID `1901214` to the local-only Swapped MP4 and removed the common-video fallback. | The client checks the same-origin file with `HEAD`; only an existing mapped video can advance to playback, while generated MP4s remain Git-ignored. |
| Grok batch continuation | Added a resume runner that skips completed masters, preserves saved scene pairs, renders one work at a time, and verifies before advancing. | Ten masters were added in the resumed session, nine through the continuation runner after the preflight; the batch is 16/20 with 80 source clips. The next call stopped on Grok HTTP 402 usage exhaustion, was not retried, and the report records `openRouterUsed: false`. |

## Target architecture under active implementation

```text
Browser
  └─ app/WatchMatchHosted.tsx
       ├─ GET /api/options
       └─ POST /api/recommendations
            └─ server-only Watchmode client
                 ├─ KR subscription provider + media type + genre
                 ├─ popularity order + optional 6.5 rating floor
                 └─ up to three Korean title details
```

### Important files

| File | Responsibility |
|---|---|
| `app/WatchMatchHosted.tsx` | OTT/media/genre selection, live results, explicit work selection, demo production, and video result. |
| `app/globals.css` | Responsive black-and-purple WatchMatch design. |
| `app/api/recommendations/route.ts` | Public recommendation endpoint and error mapping. |
| `lib/watchmode.ts` | Validate filters and call Watchmode with KR subscription, provider, media, genre, rating, popularity, and title-detail handling. |
| `lib/runtime-watchmode.ts` | Resolve the server-only Watchmode credential without exposing it to client code. |
| `tests/*.test.mjs` | SSR, live-flow contract, request filters, secret boundary, fallback, explicit selection, and video-stage regressions. |
| `public/demo/watchmatch-demo.mp4` | Verified 25-second technical sample used by the hosted prototype. |

## Target API behavior

Request:

```json
{
  "provider": "netflix",
  "mediaType": "movie",
  "genre": "thriller"
}
```

Successful responses return up to three Watchmode recommendations plus provider,
genre, result-count, rating-filter, and detail-availability metadata. The server
first applies a 6.5 user-rating floor and removes only that floor when fewer than
three candidates exist. Provider, KR region, media type, and genre are never
relaxed.

## Credentials and boundaries

- The repository must never contain the OpenRouter key, even though the new recommendation path does not use it.
- Browser code receives catalog results, not credentials or authenticated OTT data.
- `.env*`, `.wrangler`, `.vinext`, `dist`, build outputs, logs, and local work directories are ignored.
- The current repository is private, but privacy does not justify committing secrets.

## Verification commands

```powershell
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd test
```

`npm.cmd test` also performs the Vinext production build before running the Node contract suite.

## Known limitations

1. The hosted production step is a technical demonstration, not a live Wan generation job.
2. Recommendations do not confirm availability on Netflix, Watcha, or another OTT service.
3. Posters, trailers, full plots, and live popularity data are not included.
4. Session reroll history resets when the browser session ends.
5. An existing Sites deployment can lag behind GitHub; pushing does not deploy.
6. The active branch is pushed, but the existing Sites deployment remains unchanged until separately requested.

## Hosted finished-video mapping

The result player now resolves an exact Watchmode numeric work ID to a dedicated
same-origin MP4 and Korean WebVTT track. It never substitutes a generic sample.
Before enabling a card, the browser sends a same-origin `HEAD` request to the
mapped media path. Generated masters remain in the local output tree; smaller
fast-start playback derivatives are copied into the Sites build only for an
explicit deployment and stay ignored by Git.

## Git workflow

- Stable baseline: `main`
- Non-trivial changes: `agent/<topic>`
- After verification: commit and push immediately
- Default review vehicle: Draft PR
- No force push
- No Sites deployment unless explicitly requested

Each PR should state:

- what changed and why;
- the root cause when fixing a failure;
- user-visible impact;
- tests and live checks performed;
- limitations that remain.
