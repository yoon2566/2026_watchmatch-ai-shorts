# WatchMatch work log

This is an append-only record of material product and engineering work. Do not
rewrite earlier entries to make the project look more complete than it was.
When a change is pushed, add a new entry with the request, decision, evidence,
Git state, deployment state, and remaining limits.

## 2026-08-15 - Require GitHub push and local preview handoff

- User request: after every task, push the verified change to GitHub and provide
  a local server address that can be tested immediately.
- Decision:
  - GitHub push is a required completion step after relevant checks pass;
  - the local handoff URL is `http://localhost:3100`;
  - reuse a healthy existing server or start `npm.cmd run dev:local` when absent;
  - keep Sites deployment separate and require explicit authorization.
- Status: verified and pushed on branch `agent/chatgpt-pro-handoff`.
- Commit: `a28474d` (`Require GitHub and local preview handoff`).
- Verification: documentation links and diff checks passed; the existing local
  server returned HTTP 200 at `http://localhost:3100`.
- Draft PR: <https://github.com/yoon2566/2026_watchmatch-ai-shorts/pull/1>
- Deployment: not requested and not performed.

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

## 2026-08-15 - Manual Netflix KR catalog MVP, phase 1

- User request: replace unreliable web-search recommendations with a Netflix
  대한민국 recommendation flow based on recently human-verified availability.
- Decision: separate pending discovery candidates from the public verified
  catalog; use a 14-day TTL and allow OpenRouter to rank only server-approved IDs.
- Status: implementation verified on `agent/netflix-curated-catalog`; commit and
  push follow this log entry. Sites deployment not requested.
- Changed: catalog schema and validator, ID-only ranker with deterministic
  fallback, four HTTP 200 result states, Netflix UI labels and availability
  details, 16 pending candidates, and a manual review form.
- Human gate: approved catalog intentionally remains empty until Netflix KR and
  rating checks are returned by the user.
- Verification: ESLint, TypeScript, Vinext build, and 14/14 contract tests pass;
  local home and recommendation API both return HTTP 200 at port 3100.
- Candidate collection: the bounded live command reached OpenRouter but its first
  result was not valid candidate JSON. The script parser was hardened without
  another paid retry, and the existing 16 pending suggestions were preserved.

## 2026-08-15 - Three-click general-catalog redesign

- User request: make WatchMatch easy to use by reducing recommendation input to
  movie or TV, one genre, and classic/modern/recent.
- Product reason: the manual Netflix availability workflow made a normal search
  appear broken while the approved catalog was empty and required too much user
  effort for the intended experience.
- Decision:
  - open directly at the movie/TV choice;
  - advance automatically after each of the three choices;
  - return exactly three works from a bundled general catalog;
  - define classic as 1999 or earlier, modern as 2000–2019, and recent as 2020 or later;
  - keep at least six works in every one of 60 filter combinations;
  - use `sessionStorage` excluded IDs so the first reroll is entirely different;
  - remove OTT/Netflix, mood, runtime OpenRouter, web search, and web fetch from recommendations;
  - preserve explicit work selection and the existing hosted video demonstration.
- Status: verified and pushed on `agent/simple-three-step-recommendations`.
- Changed: added a 90-work offline catalog, strict schema and 60-bucket coverage
  validation, stable three-result API, session-scoped rerolls, and the automatic
  movie/TV → genre → era interface. Removed the retired Netflix catalog,
  runtime OpenRouter recommendation path, mood selector, and live-search UI.
- Verification: ESLint and TypeScript passed; the Vinext build and 11/11 tests
  passed; all 60 combinations have at least six works; Wikidata confirmed all
  90 unique QIDs, years, and movie/TV types; local home/API returned HTTP 200;
  the first repeated thriller/recent request had zero overlapping IDs.
- Branch / commit / PR: verified branch pushed; see the current branch head and
  GitHub Draft PR for the immutable commit identifier.
- Deployment: not requested and not performed.
- Known limit: recommendations do not assert that a work is available on any OTT service.

## 2026-08-15 - Restore local client interaction after a stale dev session

- User report: the first movie/TV screen rendered at `localhost:3100`, but its
  buttons did not react to clicks.
- Root cause: the long-running Vinext development process failed to load its
  virtual browser entry after the preceding build and source replacement. The
  server-rendered HTML remained visible, but React client hydration never ran.
- Fix: stopped only the process tree serving this project's port 3100 and
  restarted the existing local startup script in a hidden process.
- Verification: the local home returned HTTP 200; the browser advanced through
  movie → thriller → recent; three recommendation cards rendered; the production
  button stayed disabled until an explicit card choice; no new console error
  appeared after the restart.
- Changed: added this incident record and a README recovery note. Application
  source and recommendation data were unchanged.
- Deployment: not requested and not performed.

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

## 2026-08-16 - Replace the offline catalog with verified Watchmode live search

- User request: transplant the successful real-search approach from the
  separate `채민2` prototype and show the working WatchMatch site.
- Root cause or product reason: the previous three-click app filtered a bundled
  90-work catalog and therefore could not discover actual OTT inventory.
- Decision: use Watchmode only for recommendations; select one KR subscription
  provider, movie/TV, and one genre; automatically return up to three real
  titles ranked by popularity and rating. Keep OpenRouter out of search and
  preserve explicit work selection plus the existing video demonstration.
- Status: verified locally; commit and push follow this entry.
- Changed: added server-only Watchmode client and runtime binding, `/api/options`,
  a live `/api/recommendations`, six-OTT UI, ratings, attribution, local secret
  aliasing, tests, metadata, and handoff documentation.
- Verification: lint and TypeScript pass; Vinext build and 6/6 tests pass;
  local home HTTP 200; KR region, six providers, and ten genres enabled; live
  Netflix/movie/action search returned three titles; no credential names occur
  in rendered HTML.
- Branch / commit / PR: `agent/watchmode-live-search`; commit and push pending.
- Deployment: not requested and not performed.
- Known limits and next task: Watchmode inventory can change and must be checked
  in the OTT app; the video step still shows the common technical sample.

## 2026-08-15 - Howl's Moving Castle Grok CLI golden sample

- User request: generate one real 30-second shorts sample with the installed Grok
  Build CLI before connecting video generation to WatchMatch.
- Decision: create five original six-second vertical shots with Grok, stop on a
  ZDR/permission/quota/safety failure, and use only local Heami, synthesized
  effects, Remotion, and FFmpeg for narration and editing. Do not use OpenRouter,
  browser Grok, movie assets, OST, or Sites deployment.
- Status: generated, visually reviewed, fully validated, and prepared for GitHub
  handoff on `agent/howls-grok-pilot`.
- Changed: added an isolated Grok launcher, a fixed 30-second Remotion composition,
  a media verifier, a range-capable preview server, and a concise run report.
- Verification: five source MP4 files passed `ftyp`, vertical, duration, and full
  decode checks. The final is 1080x1920, 30 fps, 900 frames, exactly 30 seconds,
  H.264/AAC, fully decodable, and SHA-256 verified. Ten caption cues, title,
  disclosure, spoiler boundary, and no-OpenRouter trace boundary passed. Browser
  media readiness and HTTP range playback passed.
- Branch / commit / PR: branch created; commit and push follow this entry.
- Deployment: not requested and not performed.
- Known limits and next task: generated media stays local; app integration requires
  a separately approved local project API and real job polling.
