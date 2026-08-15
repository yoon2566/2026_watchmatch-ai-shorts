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

## Current hosted architecture

```text
Browser
  └─ app/WatchMatchHosted.tsx
       └─ POST /api/recommendations
            └─ lib/catalog-recommendations.ts
                 ├─ lib/netflix-catalog.ts
                 │    └─ data/ott-catalog/netflix-kr.json
                 └─ lib/catalog-ranker.ts
                      └─ OpenRouter Chat Completions (ID-only, no tools)
```

### Important files

| File | Responsibility |
|---|---|
| `app/WatchMatchHosted.tsx` | Five-screen client flow, partial/source-only results, work selection, demo production, and video result. |
| `app/globals.css` | Responsive black-and-purple WatchMatch design. |
| `app/api/recommendations/route.ts` | Public recommendation endpoint and error mapping. |
| `lib/recommendation-contracts.ts` | Request and result types and allowed filters. |
| `lib/netflix-catalog.ts` | Strict catalog schema, 14-day availability, filtering, scoring, public cards, and result states. |
| `lib/catalog-ranker.ts` | Optional allowed-ID ranking without web tools and deterministic failure fallback. |
| `data/ott-catalog/netflix-kr.json` | Server-only approved catalog; currently empty pending human confirmation. |
| `data/ott-catalog/netflix-kr.review.json` | Non-public pending candidates; never loaded by recommendation runtime. |
| `tests/rendered-html.test.mjs` | SSR, request scope, catalog validity, expiry, filtering, status, no-tool ranking, fallback, and five-stage regressions. |
| `scripts/start-local.ps1` | Maps Windows user variable `3_openrouter` into the dev process as `OPENROUTER_API_KEY` without writing the value to disk. |
| `public/demo/watchmatch-demo.mp4` | Verified 25-second technical sample used by the hosted prototype. |

## Current API behavior

Request:

```json
{
  "mediaType": "movie",
  "genres": ["스릴러"],
  "mood": "thrilling",
  "ottProvider": "netflix",
  "region": "KR",
  "accessMode": "subscription"
}
```

Successful responses return:

- `recommendations`: zero to three manually verified, unexpired cards;
- `sources`: matching manual availability records;
- `status`: `complete`, `partial`, `sources_only`, or `empty`;
- `summary`: citation, candidate, and rejection counts;
- `message` and the model identifier.

OpenRouter receives only IDs and verified tags for at most twelve eligible
candidates. It cannot add titles, URLs, premises, or facts. Missing keys, HTTP
errors, timeouts, invalid JSON, and out-of-catalog IDs all fall back to the same
deterministically scored ordering.

## Credentials and boundaries

- The repository must never contain the OpenRouter key.
- Local development reads Windows user environment variable `3_openrouter` and aliases it only inside the server process.
- Sites uses `OPENROUTER_API_KEY` as a secret environment binding.
- Browser code never receives the key.
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
2. The approved Netflix catalog is intentionally empty until the user completes
   the first manual availability and rating checks.
3. Availability records expire after 14 days and require another human check.
4. An existing Sites deployment can lag behind the GitHub branch; pushing does not deploy.
5. OpenRouter ranking can change ordering, but it cannot change the approved set;
   deterministic scoring remains the fallback.

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
