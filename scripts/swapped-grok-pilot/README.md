# Swapped Grok CLI pilot

This folder contains the reproducible, media-free source for the 30-second
WatchMatch pilot for `뒤바뀐 친구들의 신비한 모험` (`Swapped`, 2026).

- Grok Build CLI creates five original 6-second 720p vertical clips.
- The child Grok process uses `grok-4.6`, medium reasoning, disabled web search,
  disabled memory, and an allowlist containing only media generation and file
  copy tools.
- OpenRouter-named environment variables are removed from the Grok child.
- Microsoft Heami supplies Korean narration; Remotion and FFmpeg assemble the
  final 1080x1920 H.264/AAC MP4.
- Original film frames, posters, logos, character designs, dialogue, music, and
  actor voices are not used.

The generated images, clips, audio, reports, and final MP4 stay under the local
`output/swapped_grok_pilot/run-*` folder and are not committed to Git.

Render an already generated run:

```powershell
& .\scripts\swapped-grok-pilot\Render-SwappedPilot.ps1 `
  -RunDirectory 'C:\absolute\path\to\run-directory'
```

Validate the finished run:

```powershell
node .\scripts\swapped-grok-pilot\verify-pilot.mjs `
  --run 'C:\absolute\path\to\run-directory'
```
