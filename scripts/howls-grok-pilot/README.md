# Howl's Moving Castle Grok CLI pilot

This folder contains the reproducible, non-media parts of the verified 30-second
WatchMatch pilot. Generated images, MP4 files, WAV files, session output, and the
full local run report remain outside Git.

## Boundaries

- Grok Build CLI: `grok-4.6`, medium reasoning, web search disabled, memory disabled.
- Five original 9:16 image-to-video shots, six seconds each, requested at 720p.
- No OpenRouter process environment is inherited by the Grok child process.
- No browser fallback is allowed for a ZDR, permission, quota, or safety failure.
- No original movie frame, poster, logo, OST, actor voice, character likeness, or
  recognizable castle design is used.
- Local Heami, synthesized non-musical effects, Remotion, and FFmpeg produce the
  final 1080x1920 H.264/AAC file.

## Files

- `Invoke-GrokShot.ps1`: starts an isolated Grok CLI child process and records its
  stdout/stderr without printing or changing user-scope secrets.
- `remotion/`: fixed 30-second composition templates used for the pilot.
- `Render-HowlsPilot.ps1`: copies the templates and local media into the sibling
  Remotion work folder, then renders the fixed H.264/AAC output.
- `verify-pilot.mjs`: checks the five source clips, final media, captions, spoiler
  boundary, trace boundary, decoding, and SHA-256; writes the local reports.
- `preview-server.mjs`: range-capable local preview for the final MP4 and contact
  sheet.

The verified local run was stored under
`C:\Users\User\Desktop\채민\output\howls_grok_pilot\run-20260815-210220`.
Run artifacts are intentionally not tracked. The preview is served at
`http://127.0.0.1:3200/`; the WatchMatch app remains at
`http://localhost:3100/`.

## Verification command

```powershell
node scripts\howls-grok-pilot\verify-pilot.mjs `
  --run "C:\Users\User\Desktop\채민\output\howls_grok_pilot\run-20260815-210220"
```

Expected result: `overall: PASS`.
