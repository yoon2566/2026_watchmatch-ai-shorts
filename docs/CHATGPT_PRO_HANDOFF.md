# ChatGPT Pro handoff guide

## Current priority update: Netflix manual verification MVP

The active branch is `agent/netflix-curated-catalog`. The recommendation path is
being changed from live web discovery to a human-verified Netflix 대한민국 catalog.
Read `PROJECT_STATUS.md` and `docs/NETFLIX_REVIEW_FORM.md` before proposing the
next change. The approved catalog is intentionally empty until the user confirms
availability and rating; the 16 pending candidates are suggestions, not claims.
Do not propose TMDB, JustWatch scraping, OTT web fetch, or exposing pending works
as recommendations. Preserve the five screens and do not deploy without a new
explicit user request.

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

- read repository state and the current PR;
- identify the next smallest useful product change;
- explain assumptions and trade-offs;
- define acceptance criteria and verification;
- wait for user approval before expanding scope.

### Local Codex

- inspect the live Windows workspace;
- implement approved changes;
- run lint, TypeScript, build, tests, and proportionate live checks;
- commit and push the verified change;
- keep the verified local preview reachable at `http://localhost:3100` and give
  that address to the user after each change;
- update `PROJECT_STATUS.md` and `docs/ENGINEERING_LOG.md` when the state changes materially.

### User

- choose product direction and acceptable trade-offs;
- approve external deployment and meaningful changes to safety policy;
- provide credentials only through local or hosting secret settings, never through Git or chat.

## Starter prompt for a new ChatGPT Pro chat

Copy the following prompt and attach or connect this GitHub repository:

```text
Read AGENTS.md, PROJECT_STATUS.md, docs/CHAT_CONTEXT.md, docs/ENGINEERING_LOG.md,
and the current open Draft PR in yoon2566/2026_watchmatch-ai-shorts.

Act as the product and engineering director for WatchMatch. Do not modify code yet.
First report:
1. the current verified state,
2. the most important unresolved problem,
3. one smallest recommended change,
4. exact acceptance criteria,
5. files likely to change,
6. tests and live checks required,
7. risks or policy decisions that require my approval.

Preserve the five-screen flow, explicit work selection, spoiler-free behavior,
adult-content safeguards, one paid web search per recommendation attempt, and
source transparency. Do not request or expose API keys. Do not deploy unless I
explicitly approve deployment.
```

## Recommended next task

The strongest next task is to redesign rating evidence into three states:

1. `eligible`
2. `excluded_adult`
3. `unverified`

Minimum policy direction:

- Korean classifications take precedence when present.
- Korean `전체`, `12`, and `15` can be eligible.
- Korean youth-restricted classifications are excluded.
- A US `R` rating alone is not automatically equivalent to Korean adult-only content; it should be unverified unless jurisdiction-aware evidence resolves it.
- A foreign adult classification elsewhere on a multi-country page must not automatically invalidate a clearly bound safe Korean classification.
- Unknown, mixed, or borrowed ratings remain unverified rather than eligible.
- `sources_only` must remain a valid honest result if no card is verified.

ChatGPT Pro should propose the schema, migration path, test matrix, and UI labels before Codex edits the implementation.

## Definition of done for future changes

- The requested behavior works locally.
- Existing five-screen navigation remains intact.
- No fixed or invented recommendation is presented as live discovery.
- No secret appears in tracked files, logs, API responses, or browser bundles.
- Relevant tests pass.
- Any bounded live API check and its cost are disclosed.
- The current branch is pushed and `http://localhost:3100` returns a successful response.
- `PROJECT_STATUS.md` and this engineering log reflect the new state.
- The verified commit is pushed and a Draft PR is available for review.

## Instructions that must not be inferred

GitHub access does not authorize any of the following without an explicit user request:

- Sites deployment;
- changing hosting secrets;
- weakening adult-content rules;
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

When any of those are required, ChatGPT Pro should write a precise, bounded instruction for local Codex rather than assume the resource is available.
