# WatchMatch collaboration rules

## Source control

- After every user-requested code, documentation, or configuration change, run the relevant verification, commit the verified change, and push the current branch to `origin` unless the user explicitly asks to keep the work local.
- Use `agent/<topic>` branches for non-trivial follow-up changes and push them immediately after verification so ChatGPT and GitHub can review the current state.
- Do not push failing, incomplete, or unverified work as if it were complete. Report the blocker instead.
- Never force-push, rewrite shared history, or deploy the application unless the user explicitly requests it.

## Secrets and generated data

- Never commit API keys, bearer tokens, `.env.local`, local user-environment values, logs, build caches, or OpenRouter response payloads containing private data.
- The recommendation runtime uses `WATCHMODE_API_KEY` server-side only. Accept the existing local user variable `4_WATCHMODE_API_KEY`, but never expose either value to browser code, logs, Git, or generated artifacts.
- Do not add newly generated final videos to Git history by default. Use release assets or external artifact storage when a video deliverable must be shared.

## Product invariants

- Preserve the explicit interaction flow: one OTT, movie/TV, one genre, actual recommendation selection, video production, and video result.
- Preserve spoiler-free copy, source transparency, and the rule that no work is selected automatically.
- Recommendation requests use Watchmode's KR subscription source, media type, and genre filters and return up to three real candidates ranked by popularity, with a 6.5 user-rating floor when possible.
- Recommendation requests must not use OpenRouter, web search, web fetch, TMDB, or JustWatch.
- Keep deployment separate from implementation. Local verification and GitHub push do not authorize a Sites deployment.

## Verification

- For application changes, run `npm.cmd run lint`, `npx.cmd tsc --noEmit`, and `npm.cmd test` before committing.
- Record material validation results and known limitations in `PROJECT_STATUS.md`.
- Append every material user-requested change to `docs/WORKLOG.md` with its request, decision, verification, commit or PR, deployment state, and remaining limits.
- Update `docs/ENGINEERING_LOG.md` when architecture, API behavior, or verified system capabilities materially change.

## Required handoff after every change

- After the relevant checks pass, commit and push the current branch to GitHub.
- Ensure the current local application is reachable at `http://localhost:3100` and report that exact test URL to the user.
- Reuse a healthy existing local server. If the server is not running, start it with `npm.cmd run dev:local` and keep it available for the user's testing.
- Never terminate an unrelated process merely because it owns port 3100. Report the conflict and choose a safe next step.
- A GitHub push and local preview do not authorize a Sites deployment; deployment still requires a separate explicit request.
