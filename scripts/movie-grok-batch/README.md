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

Resume an interrupted run without regenerating completed works or saved
image/clip pairs:

```powershell
& .\scripts\movie-grok-batch\Continue-MovieBatch.ps1 `
  -RunDirectory 'C:\absolute\movie-batch\run-directory' `
  -StartSlug 'first-incomplete-work-slug'
```

The continuation runner renders and verifies each completed work before moving
to the next one. Do not wrap it with legacy `powershell.exe`; run it in the
current PowerShell 7 session so child-environment isolation remains compatible.

Render and verify any work after its five Grok clips exist:

```powershell
& .\scripts\movie-grok-batch\Render-MovieWork.ps1 `
  -RunDirectory 'C:\absolute\movie-batch\run-directory' `
  -Slug 'work-slug'

& .\scripts\movie-grok-batch\Verify-MovieBatch.ps1 `
  -RunDirectory 'C:\absolute\movie-batch\run-directory'
```

If Grok returns a non-zero exit only after both media files were saved, the
runner keeps those non-empty outputs and continues. A real quota, safety,
permission, or ZDR failure with missing media still stops the batch.

The 2026-08-17 continuation stopped correctly at `the-maze-runner` after Grok
returned HTTP 402 `usage balance exhausted`. At that checkpoint the verifier
reported 16/20 completed works, 80 source clips, and no OpenRouter use.
