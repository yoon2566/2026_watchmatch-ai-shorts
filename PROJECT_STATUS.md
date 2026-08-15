# WatchMatch project status

Last updated: 2026-08-15

## Repository and delivery

- GitHub: `https://github.com/yoon2566/2026_watchmatch-ai-shorts`
- Working branch: `agent/netflix-curated-catalog`
- Local project: `C:\Users\User\Desktop\채민\shorts-webapp-sites`
- Local URL: `http://localhost:3100`
- Sites deployment is intentionally unchanged until a separate request.

## Current product decision

WatchMatch no longer treats OpenRouter web search as an OTT database. The MVP
supports only Netflix 대한민국 subscription titles that a human administrator
checked within the previous 14 days. TMDB, JustWatch, OTT-page scraping, and
automated web fetch are not used.

## Five-screen flow

1. Main
2. Media type, genre, mood, and Netflix KR scope
3. Select one manually verified work
4. Video production demonstration
5. Watch the verified 25-second technical sample

## Recommendation architecture

```text
Browser preferences
  -> POST /api/recommendations
  -> validate Netflix / KR / subscription request
  -> load server-only verified catalog
  -> remove expired and unsafe entries
  -> deterministic score, maximum 12 candidates
  -> optional OpenRouter ID-only ranking, no tools
  -> validate IDs and build reasons from verified tags
  -> deterministic fallback on every model or credential failure
```

- `complete`: three valid cards
- `partial`: one or two valid cards
- `sources_only`: related manual records exist but are expired
- `empty`: no related approved record exists
- All four states return HTTP 200.

## Catalog state

- Approved public catalog: `data/ott-catalog/netflix-kr.json`
- Approved entries: 0, intentionally, until the user performs Netflix KR checks
- Pending review file: `data/ott-catalog/netflix-kr.review.json`
- Pending candidates: 16 (8 movie, 8 TV)
- Review form: `docs/NETFLIX_REVIEW_FORM.md`

Pending entries are never imported by the runtime and cannot appear as cards.
The next commit will move only user-confirmed, non-adult entries into the approved
catalog with exact checked and expiry timestamps plus public evidence URLs.

## Security and boundaries

- The OpenRouter key stays in Windows user variable `3_openrouter` locally and
  the `OPENROUTER_API_KEY` secret binding on Sites.
- The browser, Git, catalog, logs, and API responses never receive the key.
- User recommendation calls contain neither `web_search` nor `web_fetch`.
- No Netflix credentials or authenticated URLs are stored.
- Hosted video remains a technical sample; real Wan generation stays in the
  separate Windows-local app.

## Verification commands

```powershell
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd test
```

Latest phase-one verification:

- ESLint: pass
- TypeScript: pass
- Vinext production build: pass
- Catalog/API/UI contract tests: 14/14 pass
- Local home: HTTP 200 and `VERIFIED OTT CATALOG` present
- Local API: HTTP 200, `empty`, zero unverified cards, deterministic mode
- Candidate discovery command: bounded to one movie and one TV web search; the
  first live response was not valid candidate JSON, so the original 16 pending
  suggestions were preserved and no availability claim was promoted.

## Next user action

Use `docs/NETFLIX_REVIEW_FORM.md` to confirm any pending candidates in Netflix
대한민국. The second implementation commit will validate and publish only those
confirmed records. Do not claim that a pending candidate is currently available.
