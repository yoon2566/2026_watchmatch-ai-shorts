# WatchMatch collaboration rules

## Source control

- After every user-requested code, documentation, or configuration change, run the relevant verification, commit the verified change, and push the current branch to `origin` unless the user explicitly asks to keep the work local.
- Use `agent/<topic>` branches for non-trivial follow-up changes and push them immediately after verification so ChatGPT and GitHub can review the current state.
- Do not push failing, incomplete, or unverified work as if it were complete. Report the blocker instead.
- Never force-push, rewrite shared history, or deploy the application unless the user explicitly requests it.

## Secrets and generated data

- Never commit API keys, bearer tokens, `.env.local`, local user-environment values, logs, build caches, or OpenRouter response payloads containing private data.
- Keep `OPENROUTER_API_KEY` in the local Windows user environment or the hosting provider's secret storage only.
- Do not add newly generated final videos to Git history by default. Use release assets or external artifact storage when a video deliverable must be shared.

## Product invariants

- Preserve the explicit five-screen flow: main, preferences, recommendation selection, video production, and video result.
- Preserve spoiler-free copy, adult-content exclusion, source transparency, and one paid web-search request per recommendation attempt.
- A recommendation may return zero to three verified works, but every safe OpenRouter search citation must remain visible to the user.
- Keep deployment separate from implementation. Local verification and GitHub push do not authorize a Sites deployment.

## Verification

- For application changes, run `npm.cmd run lint`, `npx.cmd tsc --noEmit`, and `npm.cmd test` before committing.
- Record material validation results and known limitations in `PROJECT_STATUS.md`.
