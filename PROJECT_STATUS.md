# WatchMatch project status

Last updated: 2026-08-15

## Repository and delivery

- GitHub: `https://github.com/yoon2566/2026_watchmatch-ai-shorts`
- Working branch: `agent/simple-three-step-recommendations`
- Local project: `C:\Users\User\Desktop\채민\shorts-webapp-sites`
- Local URL after implementation verification: `http://localhost:3100`
- Sites deployment is intentionally unchanged until a separate request.

## Active product decision

WatchMatch is being simplified into a three-click, general movie and TV
recommendation experience. The app opens directly at the first choice and asks
only for media type, one genre, and an era. Selecting the era immediately returns
exactly three works from a bundled, development-time-verified catalog.

This replaces the Netflix-only manual catalog and earlier live-discovery designs.
The recommendation path will not depend on an OTT service, OpenRouter, runtime web
search, TMDB, JustWatch, or another external catalog. OTT availability is not
claimed and must be checked separately by the user.

## Target interaction flow

1. Choose `영화` or `TV`.
2. Choose one of ten genres.
3. Choose an era:
   - `고전`: 1999 or earlier
   - `근래`: 2000 through 2019
   - `최근`: 2020 or later
4. View exactly three recommendations and explicitly select one work.
5. Run the existing hosted production demonstration.
6. Watch or download the existing verified 25-second technical sample.

Each choice advances immediately. The result screen also provides back and
restart controls. A recommendation is never selected automatically, and the
production button remains disabled until the user selects a card.

## Target recommendation architecture

```text
Browser choice: media type -> one genre -> era
  -> POST /api/recommendations
  -> validate the three filters and optional excluded IDs
  -> filter the bundled general-work catalog
  -> stable priority-and-ID ordering
  -> return exactly three offline recommendations
  -> remember viewed IDs per combination in sessionStorage
```

- The first reroll for the same combination returns three different works.
- When fewer than three unseen candidates remain, the server resets that
  combination's cycle and reports the reset in response metadata.
- Every one of the 60 media-type, genre, and era combinations must have at least
  six eligible catalog entries.
- Catalog titles, years, and work types are checked against Wikidata during
  development only. The running application makes no Wikidata request.
- Posters, trailers, full plots, and OTT availability are outside the catalog.

## Current implementation state

- The three-click implementation is complete on
  `agent/simple-three-step-recommendations` and is pushed with this status record.
- The bundled catalog contains 90 works: 45 movies and 45 TV series. All 60
  media-type, genre, and era combinations contain at least six works.
- Wikidata development verification passed for all 90 unique QIDs, release
  years, and movie/TV types. The runtime remains fully offline.
- The existing hosted production and result screens continue to use the verified
  technical sample; this Sites project does not run Wan generation.

## Security and boundaries

- Recommendation requests do not require or receive an API key.
- Runtime recommendation code must not call OpenRouter, `web_search`,
  `web_fetch`, TMDB, JustWatch, Wikidata, or an OTT page.
- No OTT credentials, authenticated URLs, or availability assertions are stored.
- Real Wan generation remains in the separate Windows-local project.
- No Sites deployment is authorized by this implementation request.

## Verified checks

```powershell
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd test
npm.cmd run catalog:verify
```

All checks pass. `npm.cmd test` completed the Vinext production build and 11/11
contract tests. The local home returned HTTP 200, and two consecutive
`movie + 스릴러 + 최근` API requests returned three works each with zero ID
overlap. The verified branch is available on GitHub; Sites was not redeployed.
