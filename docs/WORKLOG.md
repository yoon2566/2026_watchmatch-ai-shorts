# WatchMatch work log

This is an append-only record of material product and engineering work. Do not
rewrite earlier entries to make the project look more complete than it was.
When a change is pushed, add a new entry with the request, decision, evidence,
Git state, deployment state, and remaining limits.

## 2026-08-15 - Preserve URL-only OpenRouter citations

- User request: apply the ChatGPT Pro review so successful search sources do not
  disappear when an OpenRouter `url_citation` has a URL but no excerpt content.
- Root cause: `extractUrlCitations()` discarded citations whose `content` was
  absent or blank. That removed displayable sources before the source-only
  recovery path and could turn a successful search into HTTP 502.
- Decision:
  - keep every normalized public HTTPS citation for display;
  - use only non-empty excerpts for recommendation and rating validation;
  - return `sources_only` immediately when display URLs exist but evidence does
    not, avoiding a correction call that cannot produce grounded cards;
  - use a neutral fallback message rather than claiming an empty excerpt was
    verified;
  - reject credential-bearing, local, loopback, link-local, private-network,
    multicast, and non-HTTPS source URLs.
- Status: verified and pushed on branch `agent/chatgpt-pro-handoff`.
- Commit: `72f7170` (`Preserve URL-only discovery sources`).
- Verification: ESLint and TypeScript passed; the Vinext production build and
  18/18 tests passed. New coverage includes six URL-only sources, mixed display
  and evidence sources, one-search/no-search-repair boundaries, unsafe URLs,
  URL deduplication, and rendered source-list links with neutral copy.
- Paid/live API use: none. The regression uses deterministic mocked OpenRouter
  responses.
- Draft PR: <https://github.com/yoon2566/2026_watchmatch-ai-shorts/pull/1>
- Deployment: not requested and not performed.
- Remaining limitation: jurisdiction-aware content-rating states remain the
  next recommendation-quality decision.

## 2026-08-15 - ChatGPT Pro collaboration handoff

- User request: make the GitHub repository carry enough conversation context
  and progress evidence for a new ChatGPT Pro chat, not source files alone.
- Decision: publish privacy-filtered summaries rather than a raw transcript.
- Status: verified and pushed on branch `agent/chatgpt-pro-handoff`.
- Commit: `f6e33d2` created the handoff set; the follow-up commit records the
  resulting Draft PR and final remote verification.
- Draft PR: <https://github.com/yoon2566/2026_watchmatch-ai-shorts/pull/1>
- Changed:
  - added conversation and decision context;
  - added the chronological engineering record;
  - added ChatGPT Pro read order, starter prompt, role boundaries, and next task;
  - added this cumulative log and a pull-request template;
  - linked the handoff set from the README and project status.
- Privacy: excluded API key values, account details, callback URLs, raw model
  output, private names, and unrelated conversation.
- Verification: ESLint and TypeScript passed; `npm.cmd test` passed the Vinext
  production build and 14/14 contract tests; eight Markdown files had zero
  broken relative links; the staged secret/email scan and diff check passed.
- Deployment: not requested and not performed.
- Remaining limitation: ChatGPT Pro can read only the repository and PR content;
  it cannot see the local GPU project, Windows environment, browser state, or
  the original conversation unless the user shares them separately.

## 2026-08-15 - GitHub baseline and collaboration rules

- User request: push the current WatchMatch state to the private repository and
  push future verified changes promptly.
- Decision: keep `main` as the stable baseline, use `agent/<topic>` branches for
  non-trivial work, and use Draft PRs for review.
- Status: verified and pushed.
- Commit: `eb3f006350f79375403a1a511a3eff76aefe6097`.
- Changed: stabilized live discovery, added secure local startup, documented the
  project state, and added repository collaboration rules.
- Verification: lint, TypeScript, Vinext production build, 14 contract tests,
  secret scan, and local/remote SHA comparison passed.
- Deployment: not performed; the existing Sites revision may lag behind GitHub.

## 2026-08-15 - Live discovery reliability and source transparency

- User request: fix repeated cases where selecting a normal movie genre appeared
  to find nothing, and show the OpenRouter sources instead of hiding them.
- Root cause: web search and authentication succeeded, but candidate-count and
  rating-evidence validation discarded the response after search.
- Decision:
  - keep one paid web search per recommendation attempt;
  - inspect up to ten candidates;
  - return zero to three verified cards;
  - preserve all safe citations even when no card passes;
  - allow one correction request without a second search.
- Status: verified and pushed as part of commit `eb3f006`.
- Live evidence: one bounded `movie + 스릴러 + thrilling` request returned HTTP
  200, ten sources, and zero verified cards. This was honestly represented as a
  source-only result rather than a search outage.
- Deployment: not performed after the final local changes.
- Remaining limitation: rating evidence needs jurisdiction-aware classification.

## 2026-08-15 - Fixed catalog replaced by live discovery

- User request: recommend actual works rather than fixed examples.
- Decision: use server-side OpenRouter web search because the available user
  credential is an OpenRouter key and the browser must never receive it.
- Status: pushed.
- Commit: `7a4f7ad`.
- Changed: added the live recommendation API, citation validation, server secret
  lookup, and a client request path without a silent fake-success fallback.
- Deployment: a later explicit Sites action is required for hosted parity.

## 2026-08-15 - Initial Sites prototype

- User request: provide a hosted WatchMatch web prototype.
- Decision: adapt the five-screen interface for Sites while using the existing
  verified 25-second technical sample for the result screen. Cloud hosting cannot
  directly access the user's Windows ComfyUI, Heami, or local SQLite worker.
- Status: pushed and deployed at that stage.
- Commit: `a861b11`.
- Remaining limitation: the hosted video step is a demonstration, not live Wan
  generation from the selected recommendation.

## Entry template

Copy this section for future material changes:

```markdown
## YYYY-MM-DD - Short title

- User request:
- Root cause or product reason:
- Decision:
- Status: planned / in progress / verified / pushed / deployed
- Changed:
- Verification:
- Branch / commit / PR:
- Deployment:
- Known limits and next task:
```
