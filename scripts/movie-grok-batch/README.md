# WatchMatch movie Grok batch

This batch generates five original 6-second Grok Build CLI clips for every
unique movie recommendation in the current Netflix movie example set. Generated
media stays under `2_작품/output/movie_grok_batch` and is excluded from Git.

- 20 new works × 5 clips = 100 clips.
- The existing `뒤바뀐 친구들의 신비한 모험` pilot is reused separately.
- The Grok child process uses `grok-4.6`, medium reasoning, disabled web search,
  disabled memory, and removes OpenRouter-named environment variables.
- The runner resumes completed image/clip pairs and stops on the first hard
  safety, quota, permission, or ZDR failure.

```powershell
& .\scripts\movie-grok-batch\Invoke-MovieBatch.ps1 `
  -RunDirectory 'C:\absolute\movie-batch\run-directory'
```

Use `-MaximumScenes 1` for a paid preflight and omit it only after inspecting
the first generated clip.
