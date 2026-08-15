# WatchMatch conversation context

Last synchronized: 2026-08-15

## Purpose of this document

This is a privacy-filtered reconstruction of the product conversation so a new ChatGPT Pro chat can understand why the repository looks the way it does. It is not a verbatim transcript.

Excluded on purpose:

- API key values, tokens, cookies, and account credentials
- private names, email addresses, and unrelated personal chat
- transient browser callback URLs
- raw model responses and long citation excerpts

## Product in one sentence

WatchMatch helps a user choose a movie or TV series and receive a spoiler-free 25-second vertical recommendation short, using real search evidence and clearly identified AI-generated visuals.

## How the request evolved

### 1. Image-to-video experiment

The work began with six vertical scene images and a request to animate each image with Grok Imagine image-to-video. The intended output was six separate 10-second clips rather than a PowerPoint export. This phase established two enduring preferences:

- use a real generation service when generative motion is required;
- preserve source images and existing outputs rather than overwrite them.

The browser workflow proved that authenticated visual upload and download could work, but it was not a scalable application architecture.

### 2. Desired short-form storytelling style

The user clarified that the result should resemble commercial webtoon or movie-review Shorts:

- remove unnecessary detail;
- avoid spoilers;
- raise curiosity and stop at an exciting moment;
- combine narration, captions, and generated visuals;
- let editing, timing, and packaging be handled by the application pipeline.

Reference Shorts supplied during the conversation:

- <https://youtube.com/shorts/9PMuF3TRdwc>
- <https://youtube.com/shorts/GzEo2zrDIMM>

These links are style references only. Their footage, audio, and scripts must not be copied.

### 3. Pivot from clip production to a web application

The request then became a web product with two core functions:

1. search and recommend movies or TV series;
2. create a recommendation Short for the selected work.

The user can provide an OpenRouter API key, but not a commercial video-generation API key. Therefore the architecture split into two environments:

- hosted discovery prototype: web search, recommendation, transparent sources, and a verified technical video sample;
- Windows local production pipeline: Wan 2.2, Microsoft Heami, Remotion, FFmpeg, and SQLite.

### 4. Recommendation data decisions

TMDB was considered because it has structured movie and TV discovery. Its application requirements and AI-related usage concerns made it unsuitable as the only prototype dependency. The hosted prototype therefore uses OpenRouter web search and preserves the returned URL citations.

The search contract was intentionally conservative:

- real, released movie or TV works only;
- match at least one selected genre;
- spoiler-free premise and reason;
- exclude adult or unverified ratings;
- cite title, year, and rating evidence;
- never expose the OpenRouter API key to the browser.

### 5. Local full-pipeline prototype

A separate local project at `C:\Users\User\Desktop\채민\shorts-webapp` implemented the heavier workflow:

- OpenRouter recommendation and spoiler-free script;
- SQLite job persistence;
- Wan 2.2 TI2V 5B scenes through the existing ComfyUI installation;
- Microsoft `Heami Desktop - Korean` narration;
- Remotion captions and composition;
- FFmpeg validation and SHA-256 reporting.

That local system produced a verified 25-second vertical golden sample. The hosted Sites repository does not run the local GPU pipeline.

### 6. Required five-screen interaction

The user explicitly fixed the screen order:

1. main screen;
2. genre and detail selection;
3. choose one of up to three works;
4. video production progress;
5. watch the video.

Only one major stage should be visible at a time. A work must never be selected automatically; the user chooses it explicitly.

### 7. Hosted Sites prototype

The project in this repository, `shorts-webapp-sites`, was prepared for Sites hosting. It keeps the five-screen design but uses a pre-rendered, verified technical sample for the video stage because a hosted worker cannot access the user's Windows GPU, ComfyUI, Heami, or local SQLite database.

The first hosted revision used fixed recommendation examples. The user correctly rejected this because it did not actually search for works. The application was changed to call `/api/recommendations`, which uses OpenRouter server-side web search.

### 8. Live-discovery failures and fixes

Several apparent “search failures” were actually post-search validation failures:

- the API key was available and OpenRouter returned citations;
- the model sometimes returned fewer than exactly three candidates;
- later it returned six candidates while the validator allowed only one to five;
- strict title-to-rating-source binding rejected otherwise useful citations;
- the UI discarded successful searches when three verified cards were not available.

The current behavior separates search success from recommendation verification:

- inspect up to ten candidates;
- keep zero to three verified recommendations;
- attempt one correction call without another web search;
- always return and display every safe search citation;
- show `complete`, `partial`, or `sources_only` honestly;
- disable video production until the user selects a verified work.

### 9. GitHub and ChatGPT Pro collaboration

The current collaboration model is now:

1. GitHub stores the durable source, decisions, work log, and validation evidence.
2. ChatGPT Pro reads the repository and proposes a scoped next change.
3. The user approves or adjusts the proposal.
4. Codex implements locally and runs the checks.
5. Verified changes are committed and pushed immediately.
6. Sites deployment remains a separate, explicit decision.

## Stable user preferences

- Deliver working, verified outcomes rather than plausible plans.
- Work locally first; deploy only after the local result is acceptable.
- Do not show fixed examples as if they were live recommendations.
- Do not hide successful search sources just because recommendation verification is incomplete.
- Preserve originals, existing outputs, and unrelated files.
- Keep the five-screen flow and explicit user selection.
- Use spoiler-free teaser pacing and stop before a major reveal.
- Do not weaken adult-content safeguards merely to force three results.
- After relevant checks pass, commit and push the change to GitHub.

## Current product question

The next important design decision is how to represent content ratings by jurisdiction. A useful recommendation may have a safe Korean rating while the same citation page lists a stricter foreign classification. The preferred direction is a three-state result:

- eligible;
- excluded adult content;
- rating not yet verified.

See `CHATGPT_PRO_HANDOFF.md` before proposing implementation.
