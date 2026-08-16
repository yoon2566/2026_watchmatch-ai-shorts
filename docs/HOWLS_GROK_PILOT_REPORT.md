# Howl's Moving Castle Grok CLI pilot report

## Outcome

One complete 30-second vertical WatchMatch sample was generated and validated on
2026-08-15. Grok Build CLI created five original image-to-video clips. Microsoft
Heami, locally synthesized non-musical effects, Remotion, and FFmpeg produced the
final narrated short.

The local deliverable is:

`C:\Users\User\Desktop\채민\2_작품\output\howls_grok_pilot\run-20260815-210220\final\howls_moving_castle_watchmatch_30s.mp4`

The media itself is intentionally excluded from Git.

## Generation evidence

- Grok CLI: `grok 1.0.4 (d846eb93d9) [stable]`
- Grok model: `grok-4.6`, medium reasoning
- Web search and cross-session memory: disabled
- OpenRouter: not used; matching inherited variables were removed only from each
  Grok child process without reading or changing user-scope values
- Grok shots: five successful calls, zero retries, zero ZDR/quota/permission errors
- Each Grok MP4: H.264/AAC, 720x1280, 24 fps, 6.041667 seconds, `ftyp` present,
  full decode successful
- TTS: Microsoft Heami Desktop - Korean, rate 2, volume 100
- Music: none; only four locally synthesized non-musical effects

## Final validation

- MP4 bytes: 30,646,745
- SHA-256: `9e7b9a2eddb8f8a992572ea7a499f5d2e32f8487c10f5e63204b2116a9ed1e02`
- Video: H.264, 1080x1920, 30 fps, 900 frames
- Audio: AAC
- Duration: exactly 30.000 seconds
- `ftyp`: present
- Full FFmpeg decode: PASS
- Caption cues: 10, monotonic and ordered
- Title, year, and disclosure: present
- Listed ending spoilers: absent
- OpenRouter URL, credential names, bearer data, and call traces in Grok prompts
  and session logs: absent
- Browser media check: ready state 4, 30 seconds, 1080x1920, no media error
- Preview HTTP: page 200; video byte range 206 with `ftyp` signature

The complete machine-readable evidence remains beside the media as
`howls_grok_pilot_report.json`, `validation-report.json`, and `sha256.txt`.

## Visual review

The five shots use an invented mirror scene, an original compact brass-and-wood
walking house, an original landscape door, the same house under an abstract
shadow, and a close-up hand at a door. No original movie frame, poster, logo,
named character design, representative costume, or recognizable film castle was
used. The title appears only in the final WatchMatch card.

## Known limits

- This is a single local golden sample, not yet connected to the app's production
  button.
- The CLI did not expose a separate exact per-video quota price.
- The existing sibling Remotion installation emitted a Zod version warning, but
  composition discovery, six still renders, the 900-frame render, and all media
  validations completed successfully.
- No Sites deployment was performed.
