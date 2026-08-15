# WatchMatch engineering log

Last synchronized: 2026-08-15

## Repository scope

This repository contains the hosted WatchMatch prototype. It is related to, but distinct from, the Windows-only full generation project at `C:\Users\User\Desktop\채민\shorts-webapp`.

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
| Live discovery | Replaced the fixed recommendation list with `/api/recommendations` backed by OpenRouter web search. | Server-only key handling, one search cap, citation extraction, repair without search, and adult-rating tests were added. |
| Search reliability | Diagnosed repeated HTTP 502 responses after OpenRouter had already returned citations. | Root causes included candidate-count conflicts and strict evidence validation, not missing credentials. |
| Partial results | Raised candidate inspection to ten and decoupled search sources from verified recommendation cards. | Build, lint, TypeScript, and 14/14 contract tests passed. |
| URL-only citation preservation | Split displayable URL citations from content-bearing validation evidence. Added public-URL filtering, neutral excerpt fallback, and source-list component rendering. | Lint, TypeScript, Vinext build, and 18/18 tests passed. Six URL-only citations now return `200 + sources_only` without an unnecessary repair call; requests with no public display URL return 502. |
| Live thriller check | Sent one paid local request for `movie + 스릴러 + thrilling`. | HTTP 200 in 10.56s; ten KMDb citations; zero verified cards because rating citations did not identify the selected works strongly enough; UI now shows all sources. |
| GitHub baseline | Connected the local repository to `yoon2566/2026_watchmatch-ai-shorts`. | Private repository, `main` pushed at commit `eb3f006350f79375403a1a511a3eff76aefe6097`, local and remote SHA matched. |
| Manual Netflix catalog | Replaced live search with a human-verified Netflix KR catalog and 14-day availability records. | Phase one was verified, but the zero-approved-entry experience was too burdensome and is now superseded. |
| Three-click general catalog | Replaced OTT verification with movie/TV, one genre, and era choices backed by a 90-work offline catalog. | All 60 combinations contain at least six works; 11/11 tests, lint, TypeScript, Vinext build, Wikidata verification, and local home/API smoke checks passed on `agent/simple-three-step-recommendations`. |

## Target architecture under active implementation

```text
Browser
  └─ app/WatchMatchHosted.tsx
       └─ POST /api/recommendations
            └─ bundled general-work catalog
                 ├─ media type + one genre + era filter
                 ├─ stable priority and ID ordering
                 └─ exactly three results, with excluded-ID cycling
```

### Important files

| File | Responsibility |
|---|---|
| `app/WatchMatchHosted.tsx` | Three-click client selection, session rerolls, explicit work selection, demo production, and video result. |
| `app/globals.css` | Responsive black-and-purple WatchMatch design. |
| `app/api/recommendations/route.ts` | Public recommendation endpoint and error mapping. |
| Recommendation contracts and catalog modules | Validate movie/TV, one genre, era, excluded IDs, catalog integrity, stable ordering, and cycle metadata. |
| Bundled catalog data | Stores basic work identity, genres, spoiler-free premise, tags, priority, and Wikidata provenance without runtime network access. |
| `tests/rendered-html.test.mjs` | SSR, three-click flow, all 60 catalog combinations, reroll, offline boundaries, explicit selection, and video-stage regressions. |
| `public/demo/watchmatch-demo.mp4` | Verified 25-second technical sample used by the hosted prototype. |

## Target API behavior

Request:

```json
{
  "mediaType": "movie",
  "genre": "스릴러",
  "era": "recent",
  "excludeIds": ["example-id-1", "example-id-2", "example-id-3"]
}
```

Successful responses return exactly three distinct recommendations plus
`meta.remaining` and `meta.cycleReset`. If a valid filter combination has fewer
than six catalog entries, the server reports a catalog-integrity error rather
than inventing a result. `sessionStorage` holds viewed IDs by combination; it is
not durable user data.

The runtime recommendation path performs no external fetch and does not require
OpenRouter or another secret.

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
