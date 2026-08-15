# WatchMatch project status

Last updated: 2026-08-15

## Repository and delivery

- GitHub: `https://github.com/yoon2566/2026_watchmatch-ai-shorts`
- Repository visibility: private
- Local project: `C:\Users\User\Desktop\채민\shorts-webapp-sites`
- Local development URL: `http://localhost:3100`
- Existing Sites deployment: `https://watchmatch-ai-shorts-ochre-raven-7562.chatgpt.site`
- The deployed Sites revision can lag behind local and GitHub changes. Deployment requires a separate explicit request.

## Handoff documents

- Conversation and product decisions: `docs/CHAT_CONTEXT.md`
- Chronological technical record: `docs/ENGINEERING_LOG.md`
- Append-only request, verification, and Git record: `docs/WORKLOG.md`
- ChatGPT Pro read order and starter prompt: `docs/CHATGPT_PRO_HANDOFF.md`
- Repository rules: `AGENTS.md`

## Current user flow

1. Main screen
2. Genre and detail selection
3. Select one of up to three verified works
4. Video production progress
5. Watch the video

## Current implementation

- Mobile-first WatchMatch UI with the five-screen flow.
- Live movie and TV discovery through the OpenRouter Chat Completions API and the `openrouter:web_search` server tool.
- Exactly one paid Exa search request per recommendation attempt, capped at ten results.
- A no-search correction pass is allowed when the first model answer is incomplete.
- The API returns zero to three verified works plus every safe search citation.
- Partial and source-only results are shown instead of discarding a successful search.
- OpenRouter keys remain in local or hosting secrets and are not written to Git, logs, SQLite, or browser code.
- The video result screen currently uses the verified 25-second Sintel technical sample in the hosted prototype.

## Latest verification

- ESLint: pass
- TypeScript: pass
- Vinext production build: pass
- Contract and rendered HTML tests: 14/14 pass
- Live local request `movie + 스릴러 + thrilling`: HTTP 200 in 10.56 seconds
- That live request returned ten KMDb citations and zero verified cards because the rating citations did not identify the model-selected works strongly enough. The UI now exposes all ten sources rather than reporting a false search failure.

## Known next decision

The next recommendation-quality change should introduce jurisdiction-aware rating states:

- eligible
- excluded adult content
- rating not yet verified

Do not weaken adult-content filtering simply to force three cards. Prefer Korean classification evidence and show unresolved candidates or sources honestly.

## Local verification commands

```powershell
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd test
```
