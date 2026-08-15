# ChatGPT Pro handoff guide

## Current priority: three-click offline recommendations

The active branch is `agent/simple-three-step-recommendations`. WatchMatch is
being simplified from Netflix/manual verification to a general offline catalog.
The app must start at movie/TV, then ask for one genre, then classic/modern/recent.
The third click immediately returns exactly three works.

The running recommendation feature must not use an OTT service, Netflix data,
OpenRouter, web search, web fetch, TMDB, JustWatch, or Wikidata. Basic work
identity may be checked against Wikidata during development and stored in the
bundled catalog. Recommendations make no streaming-availability claim.

Implementation, local validation, commit, and branch push are complete. Sites
deployment was intentionally not performed and still requires a separate
explicit request.

## Read these files first

1. `AGENTS.md`
2. `PROJECT_STATUS.md`
3. `docs/CHAT_CONTEXT.md`
4. `docs/ENGINEERING_LOG.md`
5. `docs/WORKLOG.md`
6. the current branch diff or Draft PR

The original conversation is intentionally not required after these files are read.

## Division of responsibility

### ChatGPT Pro

- read repository state and the current branch or PR;
- distinguish the approved design from earlier live-search and Netflix phases;
- propose only the next smallest useful change;
- define acceptance criteria and verification;
- wait for user approval before expanding scope.

### Local Codex

- inspect and modify the live Windows workspace;
- verify catalog integrity across all 60 combinations;
- run lint, TypeScript, build, tests, and proportionate local checks;
- commit and push only the verified change;
- keep the verified local preview reachable at `http://localhost:3100`;
- update project status and engineering records when state changes materially.

### User

- choose product direction and acceptable trade-offs;
- approve external deployment or a future OTT-specific feature;
- provide credentials only through secret settings, never through Git or chat.

## Starter prompt for a new ChatGPT Pro chat

```text
Read AGENTS.md, PROJECT_STATUS.md, docs/CHAT_CONTEXT.md, docs/ENGINEERING_LOG.md,
docs/WORKLOG.md, and the current branch diff in
yoon2566/2026_watchmatch-ai-shorts.

Act as the product and engineering director for WatchMatch. Do not modify code.
First report:
1. the currently verified state,
2. which parts of the three-click implementation remain incomplete,
3. one smallest recommended next change,
4. exact acceptance criteria,
5. tests and local checks required,
6. any decision that requires my approval.

Preserve this interaction: movie/TV -> one genre -> classic/modern/recent ->
exactly three recommendations -> explicit work selection -> existing production
demo -> existing video sample. The first reroll for the same combination must
return three unseen works within the browser session. Recommendation runtime
must be offline and API-key-free. Do not claim OTT availability, request API
keys, or deploy Sites unless I explicitly approve deployment.
```

## Verified implementation checkpoint

The completed redesign satisfies all of the following:

- the app opens at movie/TV and advances after each choice;
- a single genre is accepted;
- era boundaries are 1999/2000 and 2019/2020;
- every one of 60 combinations contains at least six eligible works;
- every valid request returns exactly three distinct works;
- the first reroll has no overlap and exhausted cycles reset explicitly;
- session history is combination-specific and browser-session-only;
- no recommendation request performs an external fetch or uses OpenRouter;
- work cards are not automatically selected;
- the existing production and video-sample stages still work;
- lint, TypeScript, tests, Vinext build, and local home/API smoke checks pass;
- the verified commit is pushed on `agent/simple-three-step-recommendations`.

Evidence: 90 catalog works, 90 unique QIDs, all 60 buckets at six or more
works, 11/11 contract tests, a successful Wikidata QID/year/type check, HTTP 200
for the local home, and two disjoint three-work API responses for the same
filter combination.

## Definition of done for future changes

- The requested behavior works locally.
- The three-click selection and explicit work selection remain intact.
- No invented work or OTT-availability claim appears.
- No secret appears in tracked files, logs, API responses, or browser bundles.
- Relevant tests pass.
- The current branch is pushed and `http://localhost:3100` returns successfully.
- Project status and engineering logs reflect the verified state.
- Sites deployment occurs only after a separate explicit request.

## Instructions that must not be inferred

GitHub access does not authorize any of the following without an explicit user request:

- Sites deployment;
- changing hosting secrets;
- adding runtime web search or another paid API;
- claiming OTT availability;
- publishing the repository;
- deleting original media or local generation artifacts;
- starting a large paid generation or search batch.

## What ChatGPT Pro cannot see automatically

- files outside this repository;
- the Windows user environment;
- the sibling local project unless separately shared;
- current browser sessions;
- Sites secrets;
- the user's GPU, ComfyUI state, or local generated artifacts.

When any of those are required, ChatGPT Pro should write a precise, bounded
instruction for local Codex rather than assume the resource is available.
